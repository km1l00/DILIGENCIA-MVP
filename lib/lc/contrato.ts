// Contratos: esquema del análisis (lo produce Claude) y lógica determinista (cláusulas, implementación, score).
import { z } from 'zod'

export const ContratoAnalisisSchema = z.object({
  nombre: z.string().describe('Tipo de contrato, p. ej. "Contrato de transporte terrestre de carga"'),
  partes: z.string().describe('Partes y su rol, p. ej. "X S.A.S. (empresa de transporte) · Y S.A. (generador)"'),
  fecha: z.string().nullable().describe('Fecha del contrato DD/MM/AAAA si aparece'),
  resumen: z.string(),
  score: z.number().describe('Nivel de cumplimiento/protección del contrato para el generador, de 1.0 (riesgo alto) a 5.0 (riesgo bajo)'),
  clausulas: z.array(z.object({
    nombre: z.string().describe('Nombre de la cláusula sin el ordinal, p. ej. "OBJETO"'),
    body: z.string().describe('Texto literal de la cláusula tal como aparece en el contrato'),
  })),
  hallazgos: z.array(z.object({
    risk: z.enum(['alto', 'medio', 'bajo']),
    area: z.string(),
    titulo: z.string(),
    descr: z.string(),
    base: z.array(z.string()).describe('Fundamentos: solo normas reales (Código de Comercio, Código Civil, Decreto 1079 de 2015, Ley 1563 de 2012, etc.)'),
    tipo: z.enum(['modificar', 'nueva']),
    reemplaza: z.string().nullable().describe('Si tipo=modificar, nombre exacto de la cláusula del contrato que se reemplaza'),
    nombre_nueva: z.string().describe('Nombre de la cláusula resultante, p. ej. "SEGUROS"'),
    new_text: z.string().describe('Redacción propuesta completa de la cláusula'),
    peso: z.number().describe('Importancia relativa del hallazgo, 1 a 5'),
  })),
})
export type ContratoAnalisis = z.infer<typeof ContratoAnalisisSchema>

export type Clausula = { nombre: string; body: string; status: 'same' | 'mod' | 'new'; hallazgo?: string }
export type HallazgoRow = {
  id?: string; codigo: string; risk: string; area: string | null; titulo: string; descr: string | null; base: string[]
  old_text: string | null; new_text: string; clausula_titulo: string | null; reemplaza?: string | null; impacto: number; implementado: boolean
}

const ORD = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA', 'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA', 'DÉCIMA SEXTA', 'DÉCIMA SÉPTIMA', 'DÉCIMA OCTAVA', 'DÉCIMA NOVENA', 'VIGÉSIMA']
export const ordinal = (i: number) => ORD[i] || `CLÁUSULA ${i + 1}`

// Separa un contrato en cláusulas "PRIMERA. OBJETO. texto".
export function parseClausulas(texto: string): { encabezado: string; clausulas: { nombre: string; body: string }[] } {
  const re = new RegExp(`(?:^|\\n)\\s*(?:CL[AÁ]USULA\\s+)?(${ORD.slice().reverse().join('|')})\\s*[.:\\-–]\\s*([^.\\n]{2,80})\\.\\s*`, 'g')
  const marks: { i: number; end: number; nombre: string }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) marks.push({ i: m.index, end: m.index + m[0].length, nombre: m[2].trim().toUpperCase() })
  if (!marks.length) return { encabezado: texto.trim(), clausulas: [] }
  return {
    encabezado: texto.slice(0, marks[0].i).trim(),
    clausulas: marks.map((mk, k) => ({ nombre: mk.nombre, body: texto.slice(mk.end, k + 1 < marks.length ? marks[k + 1].i : undefined).trim() })),
  }
}

// Quita el ordinal y el título que a veces antepone el modelo ("CUARTA. SEGUROS. texto" -> "texto").
export function limpiarCuerpo(body: string, nombre?: string | null): string {
  let s = body.trim().replace(new RegExp(`^(?:CL[AÁ]USULA\\s+)?(?:${ORD.slice().reverse().join('|')})\\s*[.:\\-–]\\s*`, 'i'), '')
  if (nombre) {
    const n = nombre.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    s = s.replace(new RegExp(`^${n}\\s*[.:\\-–]\\s*`, 'i'), '')
  }
  return s.trim()
}

const key = (s: string | null | undefined) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, '').trim()

// Aplica hallazgos sobre las cláusulas originales. `soloImplementados`=true → versión vigente; false → versión con todos los cambios propuestos.
export function aplicarHallazgos(originales: { nombre: string; body: string }[], hallazgos: HallazgoRow[], soloImplementados: boolean): Clausula[] {
  const out: Clausula[] = originales.map((c) => ({ ...c, status: 'same' }))
  const usar = hallazgos.filter((h) => !soloImplementados || h.implementado)
  const nuevas: Clausula[] = []
  for (const h of usar) {
    const target = h.reemplaza ? out.findIndex((c) => key(c.nombre) === key(h.reemplaza)) : -1
    const nombre = h.clausula_titulo || (target >= 0 ? out[target].nombre : h.area || 'CLÁUSULA NUEVA')
    const body = limpiarCuerpo(h.new_text, nombre)
    if (target >= 0) out[target] = { nombre, body, status: 'mod', hallazgo: h.codigo }
    else nuevas.push({ nombre, body, status: 'new', hallazgo: h.codigo })
  }
  // Las cláusulas nuevas van antes de las de cierre (duración, vigencia, domicilio, notificaciones), si existen.
  const cierre = out.findIndex((c) => /DURACION|VIGENCIA|PERFECCIONAMIENTO|DOMICILIO|NOTIFICACION|ACUERDO INTEGRAL/.test(key(c.nombre)))
  const at = cierre >= 0 ? cierre : out.length
  out.splice(at, 0, ...nuevas)
  return out
}

export function textoContrato(titulo: string, encabezado: string, clausulas: Clausula[]): string {
  return [titulo.toUpperCase(), '', encabezado, '', ...clausulas.map((c, i) => `${ordinal(i)}. ${c.nombre}. ${c.body}`)].join('\n\n').replace(/\n{3,}/g, '\n\n')
}

// Reparte la mejora posible (5 - base) entre los hallazgos según su peso. Determinista.
export function repartirImpacto(base: number, pesos: number[]): number[] {
  const margen = Math.max(0, Math.round((5 - base) * 10) / 10)
  const total = pesos.reduce((a, b) => a + Math.max(0.1, b), 0) || 1
  const imp = pesos.map((p) => Math.floor((margen * Math.max(0.1, p) / total) * 10) / 10)
  return imp.map((x) => Math.max(0.1, x))
}

export function scoreContrato(base: number, hallazgos: { impacto: number; implementado: boolean }[]) {
  const add = Math.round(hallazgos.filter((h) => h.implementado).reduce((a, h) => a + Number(h.impacto), 0) * 10) / 10
  return { score: Math.min(5, Math.round((Number(base) + add) * 10) / 10), add }
}
