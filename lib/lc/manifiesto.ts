// Reglas jurídicas deterministas del manifiesto electrónico de carga.
// El modelo solo extrae datos; la verificación se hace aquí, en código, sobre el texto vigente
// del Decreto 1079 de 2015 (verificado en funcionpublica.gov.co, norma i=77889) y del Decreto 1017 de 2025 (i=264276).
import { z } from 'zod'

const s = z.string().nullable()
const persona = z.object({ nombre: s, identificacion: s, direccion: s })
const tramo = z.object({ cita: s, llegada: s, salida: s, plazo_horas: z.number().nullable() })

export const ManifiestoDatosSchema = z.object({
  numero: s,
  autorizacion: s,
  tipo: s,
  expedicion: s.describe('Fecha de expedición en formato DD/MM/AAAA'),
  empresa: z.object({ nombre: s, nit: s }),
  propietario_mercancia: persona,
  remitente: persona,
  destinatario: persona,
  origen: z.object({ lugar: s, direccion: s }),
  destino: z.object({ lugar: s, direccion: s }),
  vehiculo: z.object({ placa: s, marca: s, configuracion: s.describe('Configuración vehicular, p. ej. 3S2, C2') }),
  poseedor: persona,
  conductor: z.object({ nombre: s, identificacion: s }),
  mercancia: z.object({ descripcion: s, peso_kg: z.number().nullable(), volumen: s }),
  valor_total: z.number().nullable().describe('Valor a pagar en números, en pesos'),
  valor_letras: s,
  fecha_pago: s.describe('DD/MM/AAAA'),
  lugar_pago: s,
  saldo: z.number().nullable(),
  manifestacion_saldo: s.describe('Texto donde la empresa manifiesta adeudar el saldo, si aparece'),
  fecha_cumplido: s.describe('Fecha de expedición del cumplido, DD/MM/AAAA, si aparece'),
  retencion_ica: z.number().nullable(),
  retencion_fuente: z.number().nullable(),
  valor_sicetac: z.number().nullable().describe('Valor SICE-TAC si el documento lo reporta'),
  cargue_pagado_por: s,
  descargue_pagado_por: s,
  cargue: tramo.describe('Tiempos de cargue: cita, llegada y salida como "DD/MM/AAAA HH:MM"'),
  descargue: tramo,
  seguro: z.object({ aseguradora: s, poliza: s }),
})
export type ManifiestoDatos = z.infer<typeof ManifiestoDatosSchema>

export type Campo = { n: number; ok: boolean; parcial?: boolean; t: string; nota?: string }
export type Hallazgo = { risk: 'alto' | 'medio' | 'bajo'; codigo: string; t: string; detalle: string; base: string; url: string; actual: string; sugerido: string }

export const URL_D1079 = 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=77889'
export const URL_D1017 = 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=264276'

// Decreto 1017 de 2025: rige desde el día siguiente a su publicación (dado el 21/09/2025).
const VIGENCIA_1017 = new Date(Date.UTC(2025, 8, 22))

const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '' && !/^\(?sin diligenciar\)?$|^n\/?a$|^-+$/i.test(String(v).trim())

export function parseFecha(v: string | null | undefined): Date | null {
  if (!v) return null
  const m = v.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\D+(\d{1,2}):(\d{2}))?/)
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0))
  const iso = v.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], iso[4] ? +iso[4] : 0, iso[5] ? +iso[5] : 0))
  return null
}

// Días hábiles (lunes a viernes) entre dos fechas, contando desde el día siguiente a `desde`.
// No descuenta festivos: si da justo en el límite, se reporta como alerta y no como incumplimiento.
function diasHabiles(desde: Date, hasta: Date): number {
  let n = 0
  const d = new Date(desde)
  while (true) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d > hasta) break
    const w = d.getUTCDay()
    if (w !== 0 && w !== 6) n++
  }
  return n
}

// Número a letras (español, pesos) para contrastar el valor en letras con el valor en números.
const U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']
function menorMil(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100), r = n % 100
  let out = C[c]
  if (r > 0) {
    const t = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : '')
    out = (out ? out + ' ' : '') + t
  }
  return out
}
export function numeroALetras(n: number): string {
  n = Math.round(n)
  if (n === 0) return 'cero'
  const mill = Math.floor(n / 1_000_000), miles = Math.floor((n % 1_000_000) / 1000), resto = n % 1000
  const parts: string[] = []
  if (mill) parts.push(mill === 1 ? 'un millón' : menorMil(mill).replace(/uno$/, 'un') + ' millones')
  if (miles) parts.push(miles === 1 ? 'mil' : menorMil(miles).replace(/uno$/, 'un') + ' mil')
  if (resto) parts.push(menorMil(resto))
  return parts.join(' ')
}
const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\bde\b|\bpesos?\b|\bm\/?cte\b|\bmoneda corriente\b|[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()

const COP = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
const ART = (a: string) => `Decreto 1079 de 2015, art. ${a}`

export function verificarManifiesto(d: ManifiestoDatos) {
  const exp = parseFecha(d.expedicion)
  const regimen1017 = !!exp && exp >= VIGENCIA_1017
  const campos: Campo[] = []
  const hallazgos: Hallazgo[] = []
  const falta = (n: number, t: string, faltantes: string[], risk: Hallazgo['risk'] = 'alto', sugerido?: string) => {
    hallazgos.push({
      risk, codigo: `N${n}`,
      t: `Campo obligatorio incompleto: ${t.toLowerCase()}`,
      detalle: `El manifiesto no registra ${faltantes.join(', ')}. Es un dato mínimo del formato del manifiesto electrónico de carga.`,
      base: `${ART('2.2.1.7.5.4')}, numeral ${n}`, url: URL_D1079,
      actual: 'Sin diligenciar: ' + faltantes.join(', '),
      sugerido: sugerido || `Diligenciar ${faltantes.join(', ')} antes de expedir el manifiesto.`,
    })
  }
  const campo = (n: number, t: string, req: [string, unknown][], opts?: { opcional?: [string, unknown][]; risk?: Hallazgo['risk']; sugerido?: string }) => {
    const faltan = req.filter(([, v]) => !has(v)).map(([k]) => k)
    const faltanOpc = (opts?.opcional || []).filter(([, v]) => !has(v)).map(([k]) => k)
    const ok = faltan.length === 0 && faltanOpc.length === 0
    campos.push({ n, ok, parcial: faltan.length === 0 && faltanOpc.length > 0, t, nota: [...faltan, ...faltanOpc].join(', ') || undefined })
    if (faltan.length) falta(n, t, faltan, opts?.risk ?? 'alto', opts?.sugerido)
    else if (faltanOpc.length) falta(n, t, faltanOpc, 'bajo', opts?.sugerido)
  }

  // Art. 2.2.1.7.5.4 — contenido mínimo (13 numerales)
  campo(1, 'Identificación de la empresa de transporte', [['el nombre de la empresa de transporte', d.empresa.nombre], ['el NIT de la empresa de transporte', d.empresa.nit]])
  campo(2, 'Tipo de manifiesto', [['el tipo de manifiesto', d.tipo]])
  campo(3, 'Propietario, remitente y destinatario de la mercancía', [
    ['el nombre del remitente', d.remitente.nombre], ['la identificación del remitente', d.remitente.identificacion],
    ['el nombre del destinatario', d.destinatario.nombre], ['la identificación del destinatario', d.destinatario.identificacion],
  ], { opcional: [['el propietario de la mercancía', d.propietario_mercancia.nombre || d.remitente.nombre]] })
  campo(4, 'Descripción del vehículo', [['la placa del vehículo', d.vehiculo.placa]], { opcional: [['la configuración del vehículo', d.vehiculo.configuracion]] })
  campo(5, 'Propietario, poseedor o tenedor del vehículo', [['el nombre del poseedor o tenedor', d.poseedor.nombre]], {
    opcional: [['la identificación del poseedor o tenedor', d.poseedor.identificacion], ['la dirección del poseedor o tenedor', d.poseedor.direccion]], risk: 'medio',
  })
  campo(6, 'Nombre e identificación del conductor', [['el nombre del conductor', d.conductor.nombre], ['la identificación del conductor', d.conductor.identificacion]])
  campo(7, 'Descripción de la mercancía y su peso o volumen', [['la descripción de la mercancía', d.mercancia.descripcion], ['el peso o volumen', d.mercancia.peso_kg ?? d.mercancia.volumen]])
  campo(8, 'Lugar y dirección de origen y destino', [['el lugar de origen', d.origen.lugar], ['el lugar de destino', d.destino.lugar]], {
    opcional: [['la dirección de origen', d.origen.direccion], ['la dirección de destino', d.destino.direccion]],
  })
  campo(9, 'Valor a pagar en letras y números', [['el valor a pagar en números', d.valor_total], ['el valor a pagar en letras', d.valor_letras]])
  campo(10, regimen1017 ? 'Fecha del valor a pagar' : 'Fecha y lugar del pago', [['la fecha de pago', d.fecha_pago]])
  campo(11, 'Manifestación sobre el saldo pendiente de pago', [['la manifestación sobre el saldo no pagado', has(d.manifestacion_saldo) || d.saldo !== null ? 'ok' : null]], { risk: 'medio' })
  const tiemposFalt: [string, unknown][] = [
    ['la fecha y hora de llegada al cargue', d.cargue.llegada], ['la fecha y hora de salida del cargue', d.cargue.salida],
    ['la fecha y hora de llegada al descargue', d.descargue.llegada], ['la fecha y hora de salida del descargue', d.descargue.salida],
  ]
  campo(12, 'Tiempos de cargue y descargue (fechas y horas de llegada y salida)', tiemposFalt, { sugerido: 'Registrar los plazos pactados y la fecha y hora de llegada y salida del vehículo en el cargue y en el descargue.' })
  campo(13, 'Compañía de seguros y número de póliza', [['la compañía de seguros', d.seguro.aseguradora], ['el número de póliza', d.seguro.poliza]])

  // Numeral 9: el valor en letras debe coincidir con el valor en números.
  if (has(d.valor_total) && has(d.valor_letras)) {
    const esperado = norm(numeroALetras(d.valor_total!))
    if (norm(d.valor_letras!) !== esperado) {
      hallazgos.push({
        risk: 'alto', codigo: 'N9-letras', t: 'El valor en letras no coincide con el valor en números',
        detalle: `El valor en números (${COP(d.valor_total!)}) corresponde a "${numeroALetras(d.valor_total!).toUpperCase()} PESOS", pero en letras se registró "${d.valor_letras}". El manifiesto presta mérito ejecutivo, así que la inconsistencia debilita el título.`,
        base: `${ART('2.2.1.7.5.4')}, numeral 9`, url: URL_D1079,
        actual: `${COP(d.valor_total!)} · "${d.valor_letras}"`, sugerido: `Unificar el valor: ${numeroALetras(d.valor_total!).toUpperCase()} PESOS M/CTE.`,
      })
    }
  }

  // Numeral 10: plazo de pago (texto modificado por el art. 10 del Decreto 1017 de 2025).
  const fp = parseFecha(d.fecha_pago)
  if (fp && exp) {
    const base = parseFecha(d.fecha_cumplido)
    if (regimen1017 && base) {
      const dh = diasHabiles(base, fp)
      if (dh > 5) hallazgos.push({
        risk: 'alto', codigo: 'N10-plazo', t: `La fecha de pago supera los 5 días hábiles siguientes al cumplido (${dh} días hábiles)`,
        detalle: `El cumplido se expidió el ${d.fecha_cumplido} y el pago está previsto para el ${d.fecha_pago}. La norma vigente no permite que la fecha del valor a pagar sobrepase 5 días hábiles contados desde el día siguiente al cumplido (el conteo no descuenta festivos).`,
        base: `${ART('2.2.1.7.5.4')}, numeral 10 (modificado por el Decreto 1017 de 2025, art. 10)`, url: URL_D1017,
        actual: `Cumplido ${d.fecha_cumplido} · Pago ${d.fecha_pago}`, sugerido: 'Ajustar la fecha de pago para que no exceda 5 días hábiles desde el cumplido.',
      })
    } else {
      const dias = Math.round((fp.getTime() - exp.getTime()) / 86_400_000)
      const dh = diasHabiles(exp, fp)
      if (dh > 5) hallazgos.push({
        risk: regimen1017 ? 'medio' : 'bajo', codigo: 'N10-plazo', t: `Fecha de pago ${dias} días después de la expedición`,
        detalle: regimen1017
          ? `El manifiesto no trae la fecha del cumplido, así que no es posible contar el plazo exacto. Entre la expedición (${d.expedicion}) y la fecha de pago (${d.fecha_pago}) hay ${dh} días hábiles; la norma vigente limita el pago a 5 días hábiles siguientes al cumplido.`
          : `El manifiesto se expidió el ${d.expedicion}, antes de la entrada en vigencia del Decreto 1017 de 2025, que hoy limita la fecha de pago a 5 días hábiles siguientes al cumplido. Bajo la regla actual este plazo (${dh} días hábiles) no sería admisible; conviene revisar la práctica de pago en los manifiestos nuevos.`,
        base: `${ART('2.2.1.7.5.4')}, numeral 10 (modificado por el Decreto 1017 de 2025, art. 10)`, url: URL_D1017,
        actual: `Expedición ${d.expedicion} · Pago ${d.fecha_pago}`, sugerido: 'Pactar la fecha de pago dentro de los 5 días hábiles siguientes al cumplido del manifiesto.',
      })
    }
  }

  // Cargue y descargue: límite de horas (art. 2.2.1.7.6.8, modificado por el art. 15 del Decreto 1017 de 2025).
  const limite = regimen1017 ? 8 : 12
  const articulado = /s|r/i.test(d.vehiculo.configuracion || '')
  for (const [nombre, t] of [['cargue', d.cargue], ['descargue', d.descargue]] as const) {
    const ini = parseFecha(t.cita) || parseFecha(t.llegada)
    const fin = parseFecha(t.salida)
    if (ini && fin && fin > ini) {
      const horas = (fin.getTime() - ini.getTime()) / 3_600_000
      if (horas > limite) {
        const extra = Math.ceil(horas - limite)
        const smldv = extra * (articulado ? 3 : 2)
        hallazgos.push({
          risk: 'alto', codigo: `T-${nombre}`, t: `El ${nombre} tomó ${horas.toFixed(1)} horas y supera el límite de ${limite} horas`,
          detalle: `Desde ${t.cita ? 'la cita' : 'la llegada'} (${t.cita || t.llegada}) hasta la salida (${t.salida}) transcurrieron ${horas.toFixed(1)} horas. Superado el límite, la empresa de transporte debe pagar al propietario, poseedor o tenedor del vehículo ${articulado ? '3' : '2'} SMLDV por cada hora adicional (vehículo ${articulado ? 'articulado' : 'rígido'}): ${extra} h × ${articulado ? 3 : 2} = ${smldv} SMLDV. El generador que no cargue o descargue en las horas pactadas asume el incremento del flete pactado en el contrato.`,
          base: `${ART('2.2.1.7.6.8')}${regimen1017 ? ' (modificado por el Decreto 1017 de 2025, art. 15)' : ''}`, url: regimen1017 ? URL_D1017 : URL_D1079,
          actual: `${nombre}: ${horas.toFixed(1)} h`, sugerido: `Revisar la causa de la demora, documentarla y verificar la cláusula de tiempos del contrato con la empresa de transporte (${smldv} SMLDV en juego).`,
        })
      }
    }
  }

  // Quién paga el cargue y el descargue: el generador de la carga (art. 2.2.1.7.6.9, num. 2, lit. b).
  for (const [nombre, v] of [['Cargue', d.cargue_pagado_por], ['Descargue', d.descargue_pagado_por]] as const) {
    if (!has(v)) {
      hallazgos.push({
        risk: 'medio', codigo: `P-${nombre}`, t: `"${nombre} pagado por" sin diligenciar`,
        detalle: `La casilla no indica quién asume el costo del ${nombre.toLowerCase()}. Ese valor corresponde al generador de la carga (remitente o destinatario) y no puede quedar incluido en el valor a pagar del SICE-TAC.`,
        base: `${ART('2.2.1.7.6.9')}, numeral 2, literal b`, url: URL_D1079,
        actual: `${nombre.toUpperCase()} PAGADO POR: (vacío)`, sugerido: 'Indicar "Remitente" o "Destinatario" como responsable del costo.',
      })
    } else if (!/remitente|destinatario|generador/i.test(String(v))) {
      hallazgos.push({
        risk: 'alto', codigo: `P-${nombre}`, t: `El ${nombre.toLowerCase()} figura a cargo de "${v}"`,
        detalle: `El costo del ${nombre.toLowerCase()} corresponde al generador de la carga (remitente o destinatario). Trasladarlo a otro actor contraría la norma.`,
        base: `${ART('2.2.1.7.6.9')}, numeral 2, literal b`, url: URL_D1079,
        actual: `${nombre.toUpperCase()} PAGADO POR: ${v}`, sugerido: 'Corregir a "Remitente" o "Destinatario".',
      })
    }
  }

  // Piso SICE-TAC: solo si el documento reporta el valor SICE-TAC (no se calcula ni se estima).
  if (has(d.valor_total) && has(d.valor_sicetac) && d.valor_total! < d.valor_sicetac!) {
    hallazgos.push({
      risk: 'alto', codigo: 'SICETAC', t: 'El valor a pagar es inferior a los costos eficientes del SICE-TAC',
      detalle: `El valor a pagar (${COP(d.valor_total!)}) es inferior al valor SICE-TAC reportado (${COP(d.valor_sicetac!)}). El valor a pagar no puede ser inferior a los costos eficientes de operación del SICE-TAC.`,
      base: `${ART('2.2.1.7.4')} (definición de Valor a Pagar, modificado por el Decreto 1017 de 2025, art. 2)`, url: URL_D1017,
      actual: `${COP(d.valor_total!)} < ${COP(d.valor_sicetac!)}`, sugerido: 'Ajustar el valor a pagar al menos al valor SICE-TAC de la ruta y configuración.',
    })
  }

  // Retención de ICA en cero: criterio de revisión de la firma (la tarifa depende del municipio).
  if (d.retencion_ica !== null && d.retencion_ica === 0) {
    hallazgos.push({
      risk: 'alto', codigo: 'ICA', t: 'Retención de ICA en $0',
      detalle: 'El manifiesto registra la retención de ICA en $0. Según el criterio de revisión de F&AA, el servicio de transporte genera ICA en el municipio donde se presta, por lo que debe existir un valor mayor a cero. La tarifa aplicable depende del estatuto tributario de cada municipio.',
      base: 'Criterio de revisión F&AA · tarifa ICA según el municipio', url: '',
      actual: 'RETENCIÓN ICA: $0', sugerido: 'Liquidar y registrar la retención de ICA según la tarifa del municipio correspondiente.',
    })
  }

  const peso = { alto: 0.7, medio: 0.4, bajo: 0.1 }
  const score = Math.max(1, Math.round((5 - hallazgos.reduce((a, h) => a + peso[h.risk], 0)) * 10) / 10)
  const order = { alto: 0, medio: 1, bajo: 2 }
  hallazgos.sort((a, b) => order[a.risk] - order[b.risk])
  return { campos, hallazgos, score, regimen: regimen1017 ? 'Decreto 1017 de 2025' : 'anterior al Decreto 1017 de 2025' }
}
