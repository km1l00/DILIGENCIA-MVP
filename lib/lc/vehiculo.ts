// Verificación del vehículo del manifiesto contra RUNT (historial por placa) y SIMIT (comparendos por placa).
// Solo se consulta por placa: no se piden ni se guardan nombres o documentos de propietarios ni de conductores.
// Las reglas comparan el dato oficial con lo declarado en el manifiesto, a la fecha de expedición.
import { croma } from './croma'
import { parseFecha, type Hallazgo } from './manifiesto'

const URL_L769 = 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=5557'
const URL_R4100 = 'https://www.invias.gov.co/index.php/normativa/resoluciones-circulares-otros/10387-resolucion-4100-del-28-de-diciembre-de-2004/file'

const fecha = (s?: string | null) => parseFecha(s || '') || (s ? new Date(s) : null)
const valida = (d: Date | null) => !!d && !isNaN(d.getTime())
const dmy = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
const placaNorm = (p: string) => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

export async function verificarVehiculo(datos: any) {
  const placa = placaNorm(datos?.vehiculo?.placa || '')
  if (!/^[A-Z]{3}\d{2}[A-Z0-9]$/.test(placa)) throw new Error('El manifiesto no tiene una placa válida para consultar')
  const exp = fecha(datos?.expedicion)
  const ref = valida(exp) ? exp! : new Date()
  const refTxt = valida(exp) ? `la fecha de expedición (${dmy(ref)})` : 'hoy'

  const [runtR, simitR] = await Promise.allSettled([
    croma('/co/runt/vehicle-history-by-plate/v1', { plate: placa }, { ttlHoras: 24 * 7 }),
    croma('/co/simit/account-status/v1', { document_number: placa }, { ttlHoras: 24 }),
  ])
  const runt = runtR.status === 'fulfilled' ? runtR.value.data : null
  const simit = simitR.status === 'fulfilled' ? simitR.value.data : null
  const errores = [runtR.status === 'rejected' ? `RUNT: ${(runtR.reason as Error).message}` : null, simitR.status === 'rejected' ? `SIMIT: ${(simitR.reason as Error).message}` : null].filter(Boolean) as string[]
  const h: Hallazgo[] = []

  let resumenRunt: any = null
  if (runt) {
    const v = runt.vehicle || {}
    const soat = (runt.soat_policies || []) as any[]
    const rtm = (runt.inspections || []) as any[]
    const cubre = (ini?: string, fin?: string) => { const a = fecha(ini), b = fecha(fin); return valida(a) && valida(b) && a! <= ref && ref <= b! }
    const soatRef = soat.find((p) => cubre(p.start_date, p.expiry_date))
    const rtmRef = rtm.find((i) => cubre(i.issue_date, i.expiry_date))
    const matricula = fecha(runt.traffic_license?.enrollment_date)
    const publico = /P[UÚ]BLICO/i.test(v.service_type || '')
    // Art. 52 Ley 769: el vehículo nuevo de servicio público hace la primera revisión al cumplir 2 años de matrícula.
    const exentoRtm = valida(matricula) && (ref.getTime() - matricula!.getTime()) < 2 * 365.25 * 86_400_000 && publico
    resumenRunt = {
      encontrado: !!runt.found, clase: v.vehicle_class || null, carroceria: v.body_type || null, marca: v.brand || null, modelo: v.model_year || null,
      servicio: v.service_type || null, estado: v.registration_status || null, matricula: runt.traffic_license?.enrollment_date || null,
      soat: soat.slice(0, 4).map((p) => ({ aseguradora: p.insurer, poliza: p.policy_number, desde: p.start_date, hasta: p.expiry_date, vigente_hoy: p.is_current })),
      rtm: rtm.slice(0, 4).map((i) => ({ tipo: i.inspection_type, centro: i.center_name, desde: i.issue_date, hasta: i.expiry_date, vigente_hoy: i.is_current })),
      soat_en_fecha: !!soatRef, rtm_en_fecha: !!rtmRef, rtm_exento: exentoRtm,
    }
    if (!runt.found) {
      h.push({ risk: 'alto', codigo: 'V-RUNT', t: `La placa ${placa} no aparece en el RUNT`, detalle: 'El historial del RUNT no devolvió un vehículo para la placa del manifiesto. Confirme la placa con la empresa de transporte.', base: 'RUNT (Registro Único Nacional de Tránsito)', url: '', actual: `Placa ${placa}`, sugerido: 'Verificar la placa y el documento del vehículo antes del despacho.' })
    } else {
      if (v.registration_status && !/ACTIV/i.test(v.registration_status)) {
        h.push({ risk: 'alto', codigo: 'V-ESTADO', t: `El vehículo figura en estado "${v.registration_status}" en el RUNT`, detalle: `La placa ${placa} no tiene un registro activo en el RUNT.`, base: 'RUNT (Registro Único Nacional de Tránsito)', url: '', actual: `Estado: ${v.registration_status}`, sugerido: 'No despachar carga en un vehículo sin registro activo.' })
      }
      if (!soatRef) {
        h.push({ risk: 'alto', codigo: 'V-SOAT', t: `Sin SOAT vigente en ${refTxt}`, detalle: soat.length ? `Las pólizas registradas en el RUNT no cubren esa fecha (última: ${soat[0].insurer || 's. d.'}, vigente hasta ${soat[0].expiry_date || 's. f.'}).` : 'El RUNT no registra pólizas SOAT para el vehículo.', base: 'Ley 769 de 2002, art. 42', url: URL_L769, actual: soat.length ? `SOAT hasta ${soat[0].expiry_date}` : 'Sin SOAT en el RUNT', sugerido: 'Exigir a la empresa de transporte el SOAT vigente del vehículo para cada despacho.' })
      }
      if (!rtmRef && !exentoRtm) {
        h.push({ risk: 'alto', codigo: 'V-RTM', t: `Sin revisión técnico-mecánica vigente en ${refTxt}`, detalle: rtm.length ? `La última revisión registrada vence el ${rtm[0].expiry_date || 's. f.'}.` : 'El RUNT no registra revisiones técnico-mecánicas para el vehículo.', base: 'Ley 769 de 2002, arts. 51 y 52', url: URL_L769, actual: rtm.length ? `RTM hasta ${rtm[0].expiry_date}` : 'Sin RTM en el RUNT', sugerido: 'Exigir el certificado de revisión técnico-mecánica vigente antes del cargue.' })
      }
      // Configuración declarada vs. clase del RUNT: 3S2, 2S3... (S = semirremolque) exige tractocamión.
      const conf = String(datos?.vehiculo?.configuracion || '').toUpperCase().replace(/\s/g, '')
      const clase = String(v.vehicle_class || '').toUpperCase()
      if (/^\d+S\d+$/.test(conf) && clase && !/TRACTO/.test(clase)) {
        h.push({ risk: 'medio', codigo: 'V-CONF', t: `La configuración ${conf} no corresponde a la clase "${v.vehicle_class}" del RUNT`, detalle: `La designación ${conf} indica un tractocamión con semirremolque, pero el RUNT registra la placa como "${v.vehicle_class}". Puede tratarse de un error en el manifiesto o de otro vehículo.`, base: 'Resolución 4100 de 2004 del Ministerio de Transporte (designación de configuraciones)', url: URL_R4100, actual: `Manifiesto: ${conf} · RUNT: ${v.vehicle_class}`, sugerido: 'Corregir la configuración o la placa en el manifiesto.' })
      }
    }
  }

  let resumenSimit: any = null
  if (simit) {
    const s = simit.summary || {}
    resumenSimit = { encontrado: !!simit.found, al_dia: !!simit.clear, total: s.total ?? 0, comparendos: s.payable_fines_count ?? (simit.fines || []).length, valor_pendiente: s.payable_total ?? 0,
      detalle: (simit.fines || []).slice(0, 5).map((f: any) => ({ fecha: f.infraction_date, estado: f.status, autoridad: f.traffic_authority, valor: f.amount_payable ?? f.amount, infraccion: f.infractions?.[0]?.description })) }
    if (simit.found && !simit.clear && (s.payable_total || 0) > 0) {
      h.push({ risk: 'bajo', codigo: 'V-SIMIT', t: `El vehículo tiene ${resumenSimit.comparendos} comparendo(s) pendiente(s) en el SIMIT`, detalle: `Saldo pendiente: $${Number(s.payable_total).toLocaleString('es-CO')}. Es una obligación del propietario del vehículo, no del generador, pero es una señal de riesgo operativo (inmovilizaciones) en la empresa de transporte.`, base: 'Ley 769 de 2002, art. 10 (SIMIT)', url: URL_L769, actual: `$${Number(s.payable_total).toLocaleString('es-CO')} pendientes`, sugerido: 'Solicitar a la empresa de transporte el paz y salvo del vehículo.' })
    }
  }
  return { placa, fecha_referencia: valida(exp) ? dmy(ref) : null, runt: resumenRunt, simit: resumenSimit, hallazgos: h, errores, consultado_at: new Date().toISOString() }
}
