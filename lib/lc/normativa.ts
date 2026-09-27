// Detección de normativa nueva en fuentes oficiales. Claude busca SOLO en dominios oficiales (web_search en el servidor de Anthropic),
// y este código decide: la URL debe venir de los resultados, ser de un dominio oficial, responder HTTP 200 y contener el número de la norma.
// Si no se puede verificar, la norma no se crea.
import https from 'node:https'
import http from 'node:http'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { db, must, logEvento } from './db'
import { claude, MODEL_FAST, textOf, logUsage, isHaiku } from './ai'

// Los resultados de búsqueda suman ~100-150k tokens de entrada por corrida: por costo se usa Haiku por defecto.
// La calidad la sostiene la verificación en código (URL de los resultados, dominio oficial, HTTP 200, número en el documento).
const MODEL_NORMATIVA = process.env.ANTHROPIC_MODEL_NORMATIVA || MODEL_FAST
import { verificarCupo, registrarUso } from './cupo'

export const DOMINIOS_OFICIALES = [
  'mintransporte.gov.co', 'supertransporte.gov.co', 'dian.gov.co', 'invias.gov.co', 'funcionpublica.gov.co',
  'suin-juriscol.gov.co', 'secretariasenado.gov.co', 'ansv.gov.co', 'presidencia.gov.co', 'ani.gov.co',
]
export const CATEGORIAS = ['Marco general', 'Fletes y SICE-TAC', 'Manifiesto y RNDC', 'Tributario y facturación', 'Seguridad vial', 'Infraestructura y peajes', 'Habilitación y operación']

// Fecha en DD/MM/AAAA (el modelo a veces responde en ISO).
export const fechaDMY = (f: string) => { const m = f.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : f }
const esOficial = (u: string) => { try { const h = new URL(u).hostname.toLowerCase(); return DOMINIOS_OFICIALES.some((d) => h === d || h.endsWith('.' + d)) } catch { return false } }
const normUrl = (u: string) => u.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase()

const NormaSchema = z.object({
  codigo: z.string().describe('Identificador oficial exacto, p. ej. "Resolución 20253040012345 de 2025" o "Circular Externa 12 de 2025"'),
  entidad: z.string(),
  tipo: z.enum(['Ley', 'Decreto', 'Resolución', 'Circular', 'Proyecto']),
  estado: z.enum(['nueva', 'actualizada', 'proyecto']),
  fecha: z.string().describe('Fecha de expedición o publicación DD/MM/AAAA, o el año si es lo único que aparece'),
  cat: z.string(),
  tema: z.string(),
  titulo: z.string(),
  resumen: z.string(),
  puntos: z.array(z.string()),
  impacto: z.string().describe('Impacto concreto para el GENERADOR de carga'),
  url: z.string().describe('URL oficial exacta tomada de los resultados de búsqueda'),
})
const RespuestaSchema = z.object({ normas: z.array(NormaSchema) })
export type NormaNueva = z.infer<typeof NormaSchema>

// GET con redirecciones. Algunos portales .gov.co no envían la cadena TLS completa: para esta verificación de disponibilidad
// se acepta el certificado aunque la cadena esté incompleta (no se envían datos, solo se lee la página pública).
export function obtener(url: string, saltos = 4): Promise<{ status: number; url: string; texto: string }> {
  return new Promise((resolve) => {
    const u = new URL(url)
    const mod = u.protocol === 'http:' ? http : https
    const req = mod.get(u, { headers: { 'user-agent': 'Mozilla/5.0 (Logicompliance verificador de enlaces)', accept: 'text/html,application/pdf,*/*' }, timeout: 12_000, rejectUnauthorized: false } as https.RequestOptions, (res) => {
      const st = res.statusCode || 0
      if (st >= 300 && st < 400 && res.headers.location && saltos > 0) {
        res.resume()
        resolve(obtener(new URL(res.headers.location, u).toString(), saltos - 1))
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (c: Buffer) => { if (size < 3_000_000) { chunks.push(c); size += c.length } })
      res.on('end', () => resolve({ status: st, url: u.toString(), texto: Buffer.concat(chunks).toString('latin1') }))
      res.on('error', () => resolve({ status: 0, url: u.toString(), texto: '' }))
    })
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, url, texto: '' }) })
    req.on('error', () => resolve({ status: 0, url, texto: '' }))
  })
}

// Número distintivo de la norma (p. ej. "1017" de "Decreto 1017 de 2025", "20263040016075" de una resolución).
export function numeroDe(codigo: string): string | null {
  const anios = new Set((codigo.match(/\bde\s+(?:1[89]|20)\d{2}\b/gi) || []).map((s) => s.replace(/\D/g, '')))
  const nums = (codigo.match(/\d[\d.]*/g) || []).map((x) => x.replace(/\./g, '')).filter((x) => x && !anios.has(x))
  if (!nums.length) return null
  return nums.sort((x, y) => y.length - x.length)[0]
}

export async function verificarUrl(url: string, codigo: string): Promise<{ ok: boolean; status: number; motivo?: string }> {
  if (!esOficial(url)) return { ok: false, status: 0, motivo: 'dominio no oficial' }
  const r = await obtener(url)
  if (r.status !== 200) return { ok: false, status: r.status, motivo: `HTTP ${r.status || 'sin respuesta'}` }
  if (!esOficial(r.url)) return { ok: false, status: r.status, motivo: 'redirige fuera de un dominio oficial' }
  const n = numeroDe(codigo)
  if (!n) return { ok: true, status: 200 } // proyectos o circulares sin número: basta con la fuente oficial
  let texto = r.texto
  if (texto.startsWith('%PDF')) {
    // PDF: se extrae el texto para comprobar que el documento corresponde a la norma
    try {
      const { extractText, getDocumentProxy } = await import('unpdf')
      const pdf = await getDocumentProxy(new Uint8Array(Buffer.from(r.texto, 'latin1')))
      texto = String((await extractText(pdf, { mergePages: true })).text)
    } catch { texto = '' }
  }
  const plano = (decodeURIComponent(r.url) + ' ' + texto).replace(/[.\s]/g, '')
  if (!plano.includes(n)) return { ok: false, status: 200, motivo: `el documento no menciona ${n}` }
  return { ok: true, status: 200 }
}

const SYSTEM = (existentes: string[]) => `Eres analista de regulación de Franco & Abogados Asociados. Vigilas normativa del transporte terrestre automotor de carga en Colombia para GENERADORES de carga.

Busca en fuentes oficiales normas expedidas o publicadas en los últimos 18 meses (decretos, resoluciones, circulares, proyectos de norma) relevantes para generadores de carga: fletes y SICE-TAC, manifiesto electrónico y RNDC, cargue y descargue, tiempos logísticos, facturación electrónica del transporte, peajes, seguridad vial, habilitación y supervisión de la Superintendencia de Transporte.

Reglas estrictas:
- Reporta solo normas que aparezcan en los resultados de búsqueda, con la URL oficial exacta del resultado. No completes con memoria: si no encontraste la fuente, no la incluyas.
- Nunca inventes números de norma. El código debe coincidir con lo que dice la fuente.
- Excluye estas normas, que ya están en la base: ${existentes.join('; ')}.
- cat debe ser una de: ${CATEGORIAS.join(', ')}.
- Redacción en español formal, sin guiones largos como inciso. Usa "empresa de transporte", nunca "transportador".
- Máximo 5 normas. Si no encuentras normas nuevas verificables, devuelve {"normas": []}.

Responde al final ÚNICAMENTE con un objeto JSON {"normas":[...]} con los campos: codigo, entidad, tipo (Ley|Decreto|Resolución|Circular|Proyecto), estado (nueva|actualizada|proyecto), fecha, cat, tema, titulo, resumen, puntos (3 a 4), impacto, url.`

function extraerJson(text: string): unknown {
  const a = text.lastIndexOf('{"normas"')
  const s = a >= 0 ? text.slice(a) : text.slice(text.indexOf('{'))
  const b = s.lastIndexOf('}')
  return JSON.parse(s.slice(0, b + 1))
}

export async function analizarNormativa() {
  await verificarCupo()
  const existentes = (must(await db().from('lc_normas').select('codigo,url')) as { codigo: string; url: string }[])
  const params = {
    model: MODEL_NORMATIVA,
    max_tokens: 12000,
    system: SYSTEM(existentes.map((e) => e.codigo)),
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4, allowed_domains: DOMINIOS_OFICIALES }],
    messages: [{ role: 'user', content: 'Revisa las fuentes oficiales y reporta la normativa nueva relevante para generadores de carga.' }],
    ...(isHaiku(MODEL_NORMATIVA) ? {} : { output_config: { effort: 'low' } }),
  }
  let msg = (await claude().messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming, { timeout: 240_000 })) as Anthropic.Message
  // pause_turn: la búsqueda se extendió; se continúa una vez
  if (msg.stop_reason === 'pause_turn') {
    const cont = { ...params, messages: [...params.messages, { role: 'assistant', content: msg.content }] }
    msg = (await claude().messages.create(cont as unknown as Anthropic.MessageCreateParamsNonStreaming, { timeout: 200_000 })) as Anthropic.Message
  }
  logUsage('normativa', msg)
  const u = msg.usage as Anthropic.Usage & { server_tool_use?: { web_search_requests?: number } }
  await registrarUso('normativa', msg.model, u.input_tokens + (u.cache_read_input_tokens ?? 0), u.output_tokens)

  // URLs que realmente devolvió la búsqueda
  const vistas = new Set<string>()
  for (const b of msg.content as unknown as { type: string; content?: unknown }[]) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content as { url?: string }[]) if (r.url) vistas.add(normUrl(r.url))
  }
  let propuestas: NormaNueva[] = []
  try {
    const parsed = RespuestaSchema.safeParse(extraerJson(textOf(msg)))
    if (parsed.success) propuestas = parsed.data.normas
  } catch { propuestas = [] }

  // Duplicados por número + año (p. ej. "Resolución 8 de 2026 DIAN" = "Resolución 0000008 de 2026")
  const firma = (c: string) => { const n = numeroDe(c); if (!n) return null; const y = c.match(/\b(?:1[89]|20)\d{2}\b/g); return n.replace(/^0+/, '') + '|' + (y ? y[y.length - 1] : '') }
  const yaFirma = new Set(existentes.map((e) => firma(e.codigo)).filter(Boolean) as string[])
  const yaNum = new Set(existentes.map((e) => numeroDe(e.codigo)?.replace(/^0+/, '')).filter((x): x is string => !!x && x.length >= 8))
  const esDuplicada = (c: string) => { const f = firma(c); const n = numeroDe(c)?.replace(/^0+/, ''); return (!!f && yaFirma.has(f)) || (!!n && n.length >= 8 && yaNum.has(n)) }
  const yaCod = new Set(existentes.map((e) => e.codigo.toLowerCase().replace(/\s+/g, ' ')))
  const yaUrl = new Set(existentes.map((e) => normUrl(e.url)))
  const creadas: NormaNueva[] = []
  const descartadas: { codigo: string; motivo: string }[] = []
  for (const n of propuestas) {
    if (yaCod.has(n.codigo.toLowerCase().replace(/\s+/g, ' ')) || yaUrl.has(normUrl(n.url)) || esDuplicada(n.codigo)) { descartadas.push({ codigo: n.codigo, motivo: 'ya está en la base' }); continue }
    if (!vistas.has(normUrl(n.url))) { descartadas.push({ codigo: n.codigo, motivo: 'la URL no proviene de los resultados de búsqueda' }); continue }
    const v = await verificarUrl(n.url, n.codigo)
    if (!v.ok) { descartadas.push({ codigo: n.codigo, motivo: v.motivo || 'no verificable' }); continue }
    const cat = CATEGORIAS.includes(n.cat) ? n.cat : 'Marco general'
    const { error } = await db().from('lc_normas').insert({
      codigo: n.codigo, entidad: n.entidad, tipo: n.tipo, estado: n.estado, fecha: fechaDMY(n.fecha), vigencia: n.estado === 'proyecto' ? 'En consulta' : 'Vigente',
      cat, tema: n.tema, titulo: n.titulo, resumen: n.resumen, puntos: n.puntos, impacto: n.impacto, url: n.url,
      url_status: v.status, url_checked_at: new Date().toISOString(), origen: 'analisis', fuente: new URL(n.url).hostname,
    })
    if (error) { descartadas.push({ codigo: n.codigo, motivo: error.message }); continue }
    yaCod.add(n.codigo.toLowerCase()); const f = firma(n.codigo); if (f) yaFirma.add(f); creadas.push({ ...n, cat })
    await logEvento('norma', `${n.codigo} — ${n.entidad}`, n.titulo)
  }
  return { creadas, descartadas, busquedas: u.server_tool_use?.web_search_requests ?? null, fuentes: vistas.size, modelo: msg.model }
}
