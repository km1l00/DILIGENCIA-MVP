// Servicio de contratos: extracción de texto, análisis con Claude, persistencia y vista de detalle.
import { db, must, logEvento } from './db'
import { jsonCall, MODEL } from './ai'
import { ContratoAnalisisSchema, parseClausulas, aplicarHallazgos, repartirImpacto, scoreContrato, limpiarCuerpo, type HallazgoRow } from './contrato'

export async function extraerTexto(nombre: string, tipo: string, bytes: Uint8Array): Promise<string> {
  const n = nombre.toLowerCase()
  if (tipo === 'application/pdf' || n.endsWith('.pdf')) {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(bytes)
    const { text } = await extractText(pdf, { mergePages: true })
    return String(text)
  }
  if (n.endsWith('.docx') || tipo.includes('wordprocessingml')) {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    return value
  }
  throw new Error('Formato no soportado: cargue un PDF o un DOCX')
}

// Une las líneas cortadas del PDF en párrafos (conserva los saltos antes de cada cláusula).
export function normalizarTexto(t: string): string {
  return t.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/([^\n.:;])\n(?!\s*(?:CL[AÁ]USULA\s+)?(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA|VIG[EÉ]SIMA|PAR[AÁ]GRAFO)\b)/g, '$1 ').replace(/\n{3,}/g, '\n\n').trim()
}

async function contextoNormas(): Promise<string> {
  const rows = must(await db().from('lc_normas').select('codigo,titulo,resumen,url').order('created_at', { ascending: false }).limit(30)) as any[]
  return rows.map((r) => `- ${r.codigo}: ${r.titulo}. ${r.resumen} (${r.url})`).join('\n')
}

const SYSTEM = (normas: string) => `Eres abogado de Franco & Abogados Asociados (F&AA), firma que asesora a generadores de carga en Colombia. Haces el due diligence de contratos de transporte terrestre de carga desde la posición del GENERADOR de la carga.

Tu tarea: identificar riesgos para el generador, cláusulas faltantes y redacciones ambiguas, y proponer una redacción mejorada lista para incorporar.

Reglas de fondo:
- Cita solo normas reales y verificables: Código de Comercio (contrato de transporte, arts. 981 y ss.; responsabilidad, seguro), Código Civil (arts. 1592 a 1601, cláusula penal), Ley 1563 de 2012 (arbitraje), Ley 336 de 1996, y el Decreto 1079 de 2015. Si no estás seguro de un número de artículo, cita la norma sin artículo. Nunca inventes números.
- Hechos verificados del Decreto 1079 de 2015 que puedes usar: art. 2.2.1.7.6.9, num. 2, lit. b (el generador paga cargue, descargue y trasbordo); art. 2.2.1.7.6.8, modificado por el art. 15 del Decreto 1017 de 2025 (8 horas para cargue y 8 para descargue desde la cita; si se superan, la empresa de transporte paga al propietario, poseedor o tenedor del vehículo 3 SMLDV por hora adicional en articulado y 2 en rígido; frente al generador, el flete se incrementa en el monto o porcentaje que pacten las partes en el contrato); art. 2.2.1.7.4, modificado por el Decreto 1017 de 2025 (el valor a pagar no puede ser inferior a los costos eficientes del SICE-TAC); art. 2.2.1.7.5.4 (contenido del manifiesto).
- Normas vigentes registradas en la base de la firma (puedes apoyarte en ellas):
${normas}

Reglas de redacción:
- Usa siempre "empresa de transporte", nunca "transportador". Escribe "due diligence" en minúscula.
- Español jurídico colombiano, formal, sin guiones largos como inciso y sin muletillas.
- La redacción propuesta (new_text) debe ser el cuerpo completo y autosuficiente de la cláusula, SIN ordinal ni título al inicio (el sistema numera las cláusulas). Si un valor lo deben definir las partes, déjalo como [__].
- tipo="modificar" solo si reemplaza una cláusula existente; en "reemplaza" pon el nombre EXACTO de esa cláusula tal como está en la lista. Si es una cláusula que falta, tipo="nueva" y reemplaza=null.
- score: 1.0 a 5.0 con un decimal; 5 es un contrato que protege bien al generador y 1 uno de riesgo alto. peso (1 a 5) mide cuánto mejora el contrato al implementar cada hallazgo.
- Entre 3 y 8 hallazgos, ordenados de mayor a menor riesgo.`

const AnalisisSinClausulas = ContratoAnalisisSchema.omit({ clausulas: true })

export async function analizarContrato(nombreArchivo: string, texto: string, archivoPath: string | null) {
  const limpio = normalizarTexto(texto)
  if (limpio.length < 200) throw new Error('No se pudo leer texto suficiente del documento (¿es un escaneo sin OCR?)')
  if (limpio.length > 120_000) throw new Error('El contrato es demasiado extenso para el análisis en línea (máx. ~120.000 caracteres)')
  const parsed = parseClausulas(limpio)
  const conParse = parsed.clausulas.length >= 3
  const lista = conParse ? parsed.clausulas.map((c, i) => `${i + 1}. ${c.nombre}`).join('\n') : ''
  const normas = await contextoNormas()

  const { data, model } = await jsonCall({
    tag: 'contrato-analisis',
    schema: conParse ? AnalisisSinClausulas : ContratoAnalisisSchema,
    system: SYSTEM(normas),
    maxTokens: 16000,
    effort: 'medium',
    timeoutMs: 240_000,
    content: [
      { type: 'text', text: `Contrato (archivo: ${nombreArchivo}):\n\n<contrato>\n${limpio}\n</contrato>` },
      { type: 'text', text: conParse
        ? `Cláusulas identificadas en el contrato (usa estos nombres en "reemplaza"):\n${lista}\n\nAnaliza el contrato.`
        : 'Analiza el contrato. Devuelve también "clausulas" con el nombre (sin ordinal) y el texto literal de cada cláusula.' },
    ],
  })

  const clausulas = conParse ? parsed.clausulas : ((data as any).clausulas as { nombre: string; body: string }[])
  const titulo = limpio.split('\n')[0].trim().slice(0, 120)
  const encabezado = conParse ? parsed.encabezado.replace(titulo, '').trim() : ''
  const base = Math.min(5, Math.max(1, Math.round(Number(data.score) * 10) / 10))
  const impactos = repartirImpacto(base, data.hallazgos.map((h) => h.peso))
  const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, '').trim()

  const d = db()
  must(await d.from('lc_contratos').update({ activo: false }).eq('activo', true))
  const row = must(await d.from('lc_contratos').insert({
    nombre: data.nombre, partes: data.partes, fecha: data.fecha, archivo_nombre: nombreArchivo, archivo_path: archivoPath,
    texto_original: limpio, encabezado, clausulas, num_clausulas: clausulas.length, score_base: base, score: base,
    resumen: data.resumen, modelo: model, activo: true,
  }).select('id').single()) as any
  const hs = data.hallazgos.map((h, i) => {
    const target = h.tipo === 'modificar' && h.reemplaza ? clausulas.find((c) => key(c.nombre) === key(h.reemplaza!)) : undefined
    return {
      contrato_id: row.id, codigo: `C${i + 1}`, risk: h.risk, area: h.area, titulo: h.titulo, descr: h.descr, base: h.base,
      old_text: target ? target.body : `(El contrato no contiene una cláusula de ${h.nombre_nueva.toLowerCase()}.)`,
      new_text: limpiarCuerpo(h.new_text, h.nombre_nueva), clausula_titulo: h.nombre_nueva.toUpperCase(), reemplaza: target ? target.nombre : null, impacto: impactos[i],
    }
  })
  must(await d.from('lc_contrato_hallazgos').insert(hs))
  await logEvento('contrato', `Contrato analizado: ${data.nombre}`, `${data.partes} · ${hs.length} hallazgos · riesgo ${base.toFixed(1)}/5`, row.id)
  return row.id as string
}

export async function detalleContrato(id: string) {
  const d = db()
  const c = must(await d.from('lc_contratos').select('*').eq('id', id).single()) as any
  const hs = must(await d.from('lc_contrato_hallazgos').select('*').eq('contrato_id', id).order('codigo')) as HallazgoRow[]
  hs.sort((a, b) => Number(a.codigo.slice(1)) - Number(b.codigo.slice(1)))
  const originales = c.clausulas as { nombre: string; body: string }[]
  const { score, add } = scoreContrato(Number(c.score_base), hs)
  return {
    contrato: {
      id: c.id, nombre: c.nombre, partes: c.partes, fecha: c.fecha, archivo_nombre: c.archivo_nombre, tiene_original: !!c.archivo_path,
      texto_original: c.texto_original, encabezado: c.encabezado, num_clausulas: c.num_clausulas, score_base: Number(c.score_base),
      score, add, resumen: c.resumen, modelo: c.modelo, activo: c.activo, created_at: c.created_at, updated_at: c.updated_at,
    },
    hallazgos: hs.map((h) => ({ ...h, new_text: limpiarCuerpo(h.new_text, h.clausula_titulo), impacto: Number(h.impacto) })),
    vigente: aplicarHallazgos(originales, hs, true),
    propuesta: aplicarHallazgos(originales, hs, false),
  }
}
