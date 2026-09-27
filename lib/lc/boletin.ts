// Boletín normativo semanal: Claude redacta a partir de las normas de la BD; los enlaces y códigos salen de la BD, no del modelo.
import { z } from 'zod'
import { db, must, logEvento } from './db'
import { jsonCall, MODEL } from './ai'
import { PIE_FAA, type Doc, type Bloque } from './export'

const BoletinSchema = z.object({
  intro: z.string().describe('Párrafo editorial de 2 a 3 oraciones sobre las novedades de la semana para generadores de carga'),
  items: z.array(z.object({
    codigo: z.string().describe('Código exacto de la norma tal como aparece en la lista'),
    tema: z.string(),
    resumen: z.string().describe('Resumen de 2 a 3 oraciones en estilo de boletín jurídico, con el impacto para el generador'),
  })),
})

export type BoletinContenido = { intro: string; periodo: string; secciones: { entidad: string; items: { codigo: string; titulo: string; tema: string; resumen: string; url: string }[] }[] }

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

export async function generarBoletin() {
  const d = db()
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const todas = must(await d.from('lc_normas').select('codigo,entidad,tipo,estado,fecha,tema,titulo,resumen,impacto,url,origen,created_at').order('created_at', { ascending: false })) as any[]
  // Novedades: detectadas en los últimos 30 días o marcadas como nuevas/actualizadas; si son pocas, se completa con el marco vigente.
  let sel = todas.filter((n) => (n.origen === 'analisis' && n.created_at >= hace30) || ['nueva', 'actualizada', 'proyecto'].includes(n.estado))
  if (sel.length < 4) sel = [...sel, ...todas.filter((n) => !sel.includes(n))].slice(0, 6)
  sel = sel.slice(0, 10)

  const lista = sel.map((n) => `- ${n.codigo} | ${n.entidad} | ${n.tipo} | ${n.fecha || 's. f.'} | ${n.titulo}\n  Resumen en la base: ${n.resumen}\n  Impacto registrado: ${n.impacto || ''}`).join('\n')
  const { data, model } = await jsonCall({
    tag: 'boletin',
    schema: BoletinSchema,
    model: MODEL,
    effort: 'low',
    maxTokens: 8000,
    system: `Eres editor del Boletín Normativo del Sector Transporte de Franco & Abogados Asociados, dirigido a generadores de carga.
Redacta únicamente a partir de la información de las normas que se te entregan; no agregues datos, números ni normas que no estén en la lista.
Estilo: español jurídico formal, claro, sin guiones largos como inciso ni muletillas. Usa "empresa de transporte", nunca "transportador". "due diligence" en minúscula.
Devuelve un item por cada norma de la lista, con su código exacto.`,
    content: `Normas de la semana:\n${lista}`,
  })

  const porCodigo = new Map(sel.map((n) => [n.codigo, n]))
  const secciones = new Map<string, BoletinContenido['secciones'][number]>()
  for (const it of data.items) {
    const n = porCodigo.get(it.codigo)
    if (!n) continue // el modelo no puede agregar normas que no estén en la BD
    const s: BoletinContenido['secciones'][number] = secciones.get(n.entidad) || { entidad: n.entidad, items: [] }
    s.items.push({ codigo: n.codigo, titulo: n.titulo, tema: it.tema || n.tema, resumen: it.resumen, url: n.url })
    secciones.set(n.entidad, s)
  }
  const hoy = new Date(Date.now() - 5 * 3_600_000)
  const periodo = `${MESES[hoy.getUTCMonth()]} ${hoy.getUTCFullYear()}`
  const ult = must(await d.from('lc_boletines').select('numero').order('numero', { ascending: false }).limit(1)) as any[]
  const numero = (ult[0]?.numero ?? 28) + 1
  const contenido: BoletinContenido = { intro: data.intro, periodo, secciones: [...secciones.values()] }
  const row = must(await d.from('lc_boletines').insert({ numero, periodo, contenido, modelo: model }).select('*').single()) as any
  await logEvento('boletin', `Boletín normativo N.º ${numero} generado`, `${data.items.length} normas · ${periodo.toLowerCase()}`, row.id)
  return row
}

export function boletinADoc(b: { numero: number; periodo: string; contenido: BoletinContenido }): Doc {
  const bloques: Bloque[] = [{ tipo: 'parrafo', texto: b.contenido.intro }]
  let k = 0
  for (const s of b.contenido.secciones) {
    bloques.push({ tipo: 'seccion', texto: s.entidad })
    for (const it of s.items) bloques.push({ tipo: 'item', marca: String(++k), titulo: it.titulo.toUpperCase(), url: it.url, tema: it.tema, texto: `${it.codigo}. ${it.resumen}` })
  }
  bloques.push({ tipo: 'nota', texto: 'Señor Usuario: puede consultar el texto completo de cada norma pulsando sobre su título.' })
  return { encabezado: 'BOLETÍN NORMATIVO', subtitulo: `SECTOR TRANSPORTE · ${b.periodo} · N.º ${b.numero}`, bloques, pie: PIE_FAA }
}
