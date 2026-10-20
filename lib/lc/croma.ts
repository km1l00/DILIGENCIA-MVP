// Cliente de Croma (api.croma.run): registros oficiales de Colombia (RUES, Rama Judicial, SECOP, RUNT, SIMIT, Procuraduría).
// La key solo vive en el servidor. Cada respuesta se guarda en caché con un TTL por fuente para no gastar créditos de más,
// y el consumo diario tiene tope (CROMA_TOPE_DIARIO).
import { db } from './db'

const BASE = 'https://api.croma.run'
export const CROMA_TOPE_DIARIO = Number(process.env.CROMA_TOPE_DIARIO || 300)

export class CromaError extends Error {
  constructor(message: string, public status = 500, public code?: string) { super(message) }
}

// Costo publicado por Croma: consulta en vivo 10 créditos, dataset 1 (por ítem en lotes). Caché = 0.
const DATASET = /\/co\/secop\/[a-z-]+-search\/v1$/
const costo = (endpoint: string, items = 1) => (DATASET.test(endpoint) ? 1 : 10) * items

function inicioDiaBogota(): string {
  const now = new Date(Date.now() - 5 * 3_600_000)
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5)).toISOString()
}

function claveDe(endpoint: string, body: unknown) {
  const ordenar = (x: unknown): unknown => Array.isArray(x) ? x.map(ordenar)
    : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, ordenar((x as Record<string, unknown>)[k])])) : x
  return endpoint + ' ' + JSON.stringify(ordenar(body))
}

export async function creditosHoy(): Promise<number> {
  const { data } = await db().from('lc_croma_uso').select('creditos').gte('created_at', inicioDiaBogota())
  return (data || []).reduce((a, r) => a + (r.creditos || 0), 0)
}

export async function saldoCroma(): Promise<{ restantes: number | null; hoy: number; tope: number }> {
  const { data } = await db().from('lc_croma_uso').select('creditos_restantes').not('creditos_restantes', 'is', null).order('created_at', { ascending: false }).limit(1)
  return { restantes: data?.[0]?.creditos_restantes ?? null, hoy: await creditosHoy(), tope: CROMA_TOPE_DIARIO }
}

async function registrar(endpoint: string, creditos: number, cache_hit: boolean, status: number, restantes: number | null) {
  await db().from('lc_croma_uso').insert({ endpoint, creditos, cache_hit, status, creditos_restantes: restantes })
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function llamar(endpoint: string, body: unknown, items: number, deadlineMs: number): Promise<unknown> {
  const key = process.env.CROMA_API_KEY
  if (!key) throw new CromaError('Croma no está configurado (falta CROMA_API_KEY)', 503)
  const headers = { Authorization: `Bearer ${key}`, 'content-type': 'application/json', Prefer: 'wait=50' }
  let intento = 0
  while (true) {
    intento++
    const r = await fetch(BASE + endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) })
    const restantes = r.headers.get('x-ratelimit-remaining')
    const hit = r.headers.get('x-cache') === 'HIT'
    const j = (await r.json().catch(() => ({}))) as Record<string, any>
    if (r.status === 200) {
      await registrar(endpoint, hit ? 0 : costo(endpoint, items), hit, 200, restantes ? Number(restantes) : null)
      return j.data
    }
    if (r.status === 202 && j.job?.id) {
      await registrar(endpoint, costo(endpoint, items), false, 202, restantes ? Number(restantes) : null)
      // Trabajo asíncrono (RUNT, SIMIT): se consulta el estado hasta que termine
      while (Date.now() < deadlineMs) {
        await dormir(3000)
        const s = await fetch(`${BASE}/jobs/${j.job.id}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20_000) })
        const sj = (await s.json().catch(() => ({}))) as Record<string, any>
        const st = sj.job?.status
        if (st === 'completed') return sj.data
        if (st === 'failed' || st === 'canceled' || st === 'expired') throw new CromaError(sj.error?.message || `La consulta terminó en estado ${st}`, 502, sj.error?.code)
      }
      throw new CromaError('La fuente oficial no respondió a tiempo; intente de nuevo en unos minutos', 504)
    }
    await registrar(endpoint, 0, false, r.status, restantes ? Number(restantes) : null)
    if (r.status === 402) throw new CromaError('Se agotaron los créditos de Croma del mes', 402, 'plan_limit_reached')
    if ((r.status === 502 || r.status === 503) && intento < 2 && Date.now() + 5000 < deadlineMs) { await dormir(2500); continue }
    throw new CromaError(j.error?.message || `Croma respondió ${r.status}`, r.status, j.error?.code)
  }
}

// Consulta con caché. ttlHoras=0 fuerza consulta nueva.
export async function croma<T = any>(endpoint: string, body: Record<string, unknown>, opts: { ttlHoras: number; items?: number; timeoutMs?: number }): Promise<{ data: T; cache: boolean; consultado: string }> {
  const clave = claveDe(endpoint, body)
  if (opts.ttlHoras > 0) {
    const desde = new Date(Date.now() - opts.ttlHoras * 3_600_000).toISOString()
    const { data } = await db().from('lc_croma_cache').select('respuesta,created_at').eq('clave', clave).gte('created_at', desde).maybeSingle()
    if (data) return { data: data.respuesta as T, cache: true, consultado: data.created_at }
  }
  const items = opts.items ?? 1
  if ((await creditosHoy()) + costo(endpoint, items) > CROMA_TOPE_DIARIO) {
    throw new CromaError(`Se alcanzó el tope diario de ${CROMA_TOPE_DIARIO} créditos de Croma`, 429, 'tope_diario')
  }
  const data = await llamar(endpoint, body, items, Date.now() + (opts.timeoutMs ?? 110_000))
  const ahora = new Date().toISOString()
  await db().from('lc_croma_cache').upsert({ clave, endpoint, respuesta: data, created_at: ahora })
  return { data: data as T, cache: false, consultado: ahora }
}

export const soloDigitos = (s: string) => (s || '').replace(/\D/g, '')

// NIT sin dígito de verificación: "901.780.925-3" -> "901780925"
export function nitBase(nit: string): string {
  const t = (nit || '').trim()
  const m = t.match(/^([\d.\s]+)-\s*\d$/)
  return soloDigitos(m ? m[1] : t)
}
