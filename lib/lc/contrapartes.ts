// Ficha de due diligence de la empresa de transporte (contraparte del generador), desde registros oficiales vía Croma.
// Los hallazgos se calculan en código sobre el dato oficial; el modelo no interviene.
import { db, must, logEvento } from './db'
import { croma, nitBase, CromaError } from './croma'

export type HallazgoCP = { risk: 'alto' | 'medio' | 'bajo'; codigo: string; t: string; detalle: string; base: string; url: string }

const URL_CCO = 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=41102'
const URL_D1079 = 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=77889'
const TTL = { rues: 24 * 7, procesos: 24, secop: 24 * 7, procuraduria: 24 * 7 }

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/\b(S\.?\s?A\.?\s?S\.?|S\.?\s?A\.?|LTDA\.?|S\.?\s?EN\s?C\.?|E\.?\s?U\.?|Y\s+CIA\.?)\b/g, ' ')
  .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function hoyBogota() { return new Date(Date.now() - 5 * 3_600_000) }

export function evaluarContraparte(nit: string, rues: any, procesos: any, sanciones: any, procu: any) {
  const h: HallazgoCP[] = []
  const e = rues?.entity
  if (!rues?.found || !e) {
    h.push({ risk: 'alto', codigo: 'RUES-NF', t: 'No se encontró matrícula mercantil en el RUES para el NIT', detalle: `El NIT ${nit} no arrojó un registro en el RUES. Verifique el NIT con la empresa de transporte y solicite el certificado de existencia y representación legal.`, base: 'RUES (Cámaras de Comercio)', url: '' })
  } else {
    const estado = String(e.registration_status || '')
    if (estado && !/ACTIV/i.test(estado)) {
      h.push({ risk: 'alto', codigo: 'RUES-ESTADO', t: `Matrícula mercantil en estado "${estado}"`, detalle: `El RUES reporta la matrícula de ${e.name} como "${estado}"${e.cancellation_date ? ` (cancelación: ${e.cancellation_date})` : ''}. Contratar con una sociedad sin matrícula activa expone al generador a incumplimientos sin contraparte solvente.`, base: 'RUES (Cámaras de Comercio)', url: '' })
    }
    const anio = hoyBogota().getUTCFullYear()
    const limite = new Date(Date.UTC(anio, 2, 31, 23, 59))
    const renovado = Number(e.last_renewed_year || 0)
    const debe = hoyBogota() > limite ? anio : anio - 1
    if (renovado && renovado < debe) {
      h.push({ risk: 'medio', codigo: 'RUES-RENOV', t: `Matrícula sin renovar desde ${renovado}`, detalle: `El último año renovado es ${renovado}. La matrícula mercantil se renueva cada año dentro de los tres primeros meses; a la fecha debería estar renovada para ${debe}.`, base: 'Código de Comercio, art. 33', url: URL_CCO })
    } else if (renovado && e.last_renewal_date) {
      // Renovación del año hecha después del 31 de marzo de ese año: extemporánea
      const fr = new Date(String(e.last_renewal_date).slice(0, 10) + 'T00:00:00Z')
      if (!isNaN(fr.getTime()) && fr.getUTCFullYear() === renovado && fr > new Date(Date.UTC(renovado, 2, 31, 23, 59))) {
        h.push({ risk: 'bajo', codigo: 'RUES-EXTEMP', t: `Matrícula de ${renovado} renovada fuera de término (${String(e.last_renewal_date).slice(0, 10)})`, detalle: `La renovación del año ${renovado} se registró después del 31 de marzo. La matrícula debe renovarse dentro de los tres primeros meses de cada año; la renovación tardía es una señal de debilidad en el cumplimiento corporativo de la empresa de transporte.`, base: 'Código de Comercio, art. 33', url: URL_CCO })
      }
    }
    const ciiu = String(e.primary_activity?.code || '')
    if (!e.is_transport && !/^49/.test(ciiu)) {
      h.push({ risk: 'medio', codigo: 'RUES-ACT', t: 'La actividad registrada no corresponde a transporte de carga', detalle: `Actividad principal: ${e.primary_activity?.description || e.ciiu_4?.description || 'sin dato'} (CIIU ${ciiu || 's. d.'}). El servicio público de transporte de carga solo lo puede prestar una empresa de transporte habilitada; pida la resolución de habilitación del Ministerio de Transporte, que no consta en el RUES.`, base: 'Decreto 1079 de 2015 (habilitación de empresas de transporte de carga)', url: URL_D1079 })
    }
  }
  const sanc = (sanciones?.results || []) as any[]
  if (sanc.length) {
    h.push({ risk: 'alto', codigo: 'SECOP-SANC', t: `${sanciones.total ?? sanc.length} sanción(es) como contratista del Estado (SECOP)`, detalle: sanc.slice(0, 3).map((s) => `${s.entity}: resolución ${s.resolution_number || 's. n.'}${s.value ? ` por $${Number(s.value).toLocaleString('es-CO')}` : ''} (${s.final_date || s.published_date || 's. f.'})`).join('; ') + '.', base: 'SECOP (Colombia Compra Eficiente)', url: sanc[0]?.url || '' })
  }
  if (procu?.has_records) {
    h.push({ risk: 'alto', codigo: 'PROCU', t: 'Registra antecedentes en la Procuraduría', detalle: `La consulta de antecedentes por NIT reporta registros (${(procu.records || []).map((r: any) => r.category).filter(Boolean).join(', ') || 'ver detalle'}).`, base: 'Procuraduría General de la Nación (SIRI)', url: '' })
  }
  const casos = (procesos?.coincidencias || []) as any[]
  if (casos.length) {
    h.push({ risk: casos.length >= 5 ? 'alto' : 'medio', codigo: 'RAMA', t: `${casos.length} proceso(s) judicial(es) activo(s) donde figura la sociedad`, detalle: `Coincidencias por nombre en la Rama Judicial (puede haber homónimos): ${casos.slice(0, 3).map((c) => `${c.registration_number} · ${c.court}`).join('; ')}. Revise si son procesos ejecutivos o de responsabilidad que afecten la operación.`, base: 'Rama Judicial (Consulta de Procesos)', url: '' })
  }
  const peso = { alto: 0.9, medio: 0.5, bajo: 0.2 }
  const score = Math.max(1, Math.round((5 - h.reduce((a, x) => a + peso[x.risk], 0)) * 10) / 10)
  const order = { alto: 0, medio: 1, bajo: 2 }
  h.sort((a, b) => order[a.risk] - order[b.risk])
  return { hallazgos: h, score }
}

// La Rama Judicial solo busca por nombre: primero la razón social exacta del RUES, luego sin puntos y por último el núcleo
// del nombre. Si una variante arroja "demasiadas coincidencias" (no cuesta créditos) se prueba la siguiente.
async function buscarProcesos(nombre: string, ttlHoras: number): Promise<{ data: any; consulta: string }> {
  const variantes = [...new Set([nombre.trim(), nombre.replace(/\./g, '').replace(/\s+/g, ' ').trim(), norm(nombre)])].filter((v) => v.length >= 3)
  let ultimo: unknown = null
  for (const v of variantes) {
    try {
      const r = await croma('/co/rama-judicial/cases-by-entity/v1', { name: v, entity_type: 'juridical', active_only: true }, { ttlHoras })
      return { data: r.data, consulta: v }
    } catch (e) {
      ultimo = e
      if (!(e instanceof CromaError && e.code === 'too_many_results')) throw e
    }
  }
  throw new CromaError('La búsqueda por razón social arroja demasiadas coincidencias en la Rama Judicial; consulte por radicado', 400, 'too_many_results')
}

async function seguro<T>(f: () => Promise<T>): Promise<{ ok: true; v: T } | { ok: false; error: string }> {
  try { return { ok: true, v: await f() } } catch (e) {
    if (e instanceof CromaError && (e.status === 402 || e.code === 'tope_diario' || e.status === 503)) throw e
    return { ok: false, error: (e as Error).message }
  }
}

// Consulta (o reutiliza) la ficha. refrescar=true ignora la caché de Croma.
export async function fichaContraparte(nitIn: string, refrescar = false) {
  const nit = nitBase(nitIn)
  if (nit.length < 6 || nit.length > 15) throw new CromaError('NIT inválido', 400)
  const ttl = (h: number) => (refrescar ? 0 : h)
  const rues = await seguro(() => croma('/co/rues/entity-by-nit/v1', { document_number: nit }, { ttlHoras: ttl(TTL.rues) }))
  const nombre: string | null = rues.ok ? rues.v.data?.entity?.name || null : null
  const [sanc, procu, rama] = await Promise.all([
    seguro(() => croma('/co/secop/sanctions-search/v1', { provider_document: nit, per_page: 20 }, { ttlHoras: ttl(TTL.secop) })),
    seguro(() => croma('/co/procuraduria/disciplinary-records/v1', { document_type: 'NIT', document_number: nit }, { ttlHoras: ttl(TTL.procuraduria) })),
    nombre
      ? seguro(() => buscarProcesos(nombre, ttl(TTL.procesos)))
      : Promise.resolve({ ok: false as const, error: 'Sin razón social del RUES para buscar procesos' }),
  ])
  // La Rama Judicial busca por nombre: solo se cuentan los casos cuyo texto de partes contiene la razón social.
  let procesos: any = null
  if (rama.ok) {
    const compacto = (s: string) => norm(s).replace(/ /g, '')
    const core = compacto(nombre || '')
    const casos = (rama.v.data?.cases || []) as any[]
    procesos = { busqueda: rama.v.consulta, total_busqueda: rama.v.data?.pagination?.total ?? casos.length, coincidencias: casos.filter((c) => core && compacto(c.parties_text || '').includes(core)).slice(0, 25) }
  }
  const ruesData = rues.ok ? rues.v.data : null
  const ev = evaluarContraparte(nit, ruesData, procesos, sanc.ok ? sanc.v.data : null, procu.ok ? procu.v.data : null)
  const errores = [rues, sanc, procu, rama].map((x, i) => (!x.ok ? `${['RUES', 'SECOP', 'Procuraduría', 'Rama Judicial'][i]}: ${x.error}` : null)).filter(Boolean)
  const e = ruesData?.entity
  const fila = {
    nit, nombre,
    rues: ruesData ? {
      found: ruesData.found, nombre: e?.name, nit: e?.nit, dv: e?.verification_digit, estado: e?.registration_status, camara: e?.chamber_name,
      matricula: e?.registration_number, organizacion: e?.legal_organization, fecha_matricula: e?.registration_date, ultima_renovacion: e?.last_renewal_date,
      anio_renovado: e?.last_renewed_year, actividad: e?.primary_activity?.description, ciiu: e?.primary_activity?.code,
      es_transporte: e?.is_transport, municipio: e?.commercial_municipality,
      representantes: (ruesData.related_parties || []).filter((p: any) => /REPRESENTANTE|GERENTE/i.test(p.role || '')).slice(0, 4).map((p: any) => ({ nombre: p.name, rol: p.role })),
      certificado_url: e?.certificates_sale_url || null,
    } : null,
    procesos,
    sanciones: sanc.ok ? { total: sanc.v.data?.total ?? 0, resultados: (sanc.v.data?.results || []).slice(0, 10) } : null,
    procuraduria: procu.ok ? { tiene_registros: !!procu.v.data?.has_records, estado: procu.v.data?.status, mensaje: procu.v.data?.message, consultado: procu.v.data?.checked_at } : null,
    hallazgos: ev.hallazgos, score: ev.score, consultado_at: new Date().toISOString(),
  }
  const row = must(await db().from('lc_contrapartes').upsert(fila, { onConflict: 'espacio,nit' }).select('*').single()) as any
  await logEvento('contraparte', `Empresa de transporte verificada: ${nombre || nit}`, `${ev.hallazgos.length} hallazgos · riesgo ${ev.score.toFixed(1)}/5`, row.id)
  return { ...row, errores }
}
