// Herramientas del asistente: consultas a registros oficiales (vía Croma) ejecutadas en nuestro servidor.
// Devuelven resúmenes sin datos personales de personas naturales (no se consultan cédulas ni propietarios).
import type Anthropic from '@anthropic-ai/sdk'
import { fichaContraparte } from './contrapartes'
import { croma, soloDigitos } from './croma'
import { verificarVehiculo } from './vehiculo'

export const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: 'consultar_empresa_transporte',
    description: 'Due diligence de una empresa de transporte (u otra sociedad) por su NIT en registros oficiales de Colombia: matrícula en el RUES (estado, renovación, actividad, representantes), procesos judiciales activos en la Rama Judicial (coincidencia por razón social), sanciones como contratista en SECOP y antecedentes en la Procuraduría. Úsala cuando el usuario pregunte por la situación legal, judicial o mercantil de una contraparte con NIT conocido. Gasta créditos: no la llames dos veces para el mismo NIT.',
    input_schema: { type: 'object', properties: { nit: { type: 'string', description: 'NIT de la sociedad, con o sin dígito de verificación' } }, required: ['nit'], additionalProperties: false },
    strict: true,
  },
  {
    name: 'consultar_vehiculo',
    description: 'Consulta un vehículo por placa en el RUNT (clase, servicio, estado, SOAT y revisión técnico-mecánica con fechas) y sus comparendos pendientes en el SIMIT. No devuelve datos del propietario. Úsala para verificar el vehículo de un manifiesto o un despacho.',
    input_schema: { type: 'object', properties: { placa: { type: 'string', description: 'Placa colombiana, p. ej. JCR435' } }, required: ['placa'], additionalProperties: false },
    strict: true,
  },
  {
    name: 'consultar_proceso_judicial',
    description: 'Consulta un proceso judicial colombiano por su número de radicado (20 a 25 dígitos) en la Rama Judicial: juzgado, fechas y las actuaciones más recientes.',
    input_schema: { type: 'object', properties: { radicado: { type: 'string', description: 'Número de radicado de 20 a 25 dígitos' } }, required: ['radicado'], additionalProperties: false },
    strict: true,
  },
]

export const ETIQUETA: Record<string, (i: any) => string> = {
  consultar_empresa_transporte: (i) => `Consultando RUES, Rama Judicial, SECOP y Procuraduría para el NIT ${i?.nit ?? ''}`,
  consultar_vehiculo: (i) => `Consultando RUNT y SIMIT para la placa ${i?.placa ?? ''}`,
  consultar_proceso_judicial: (i) => `Consultando la Rama Judicial para el radicado ${i?.radicado ?? ''}`,
}

export async function ejecutarHerramienta(nombre: string, input: any): Promise<{ contenido: string; error: boolean }> {
  try {
    if (nombre === 'consultar_empresa_transporte') {
      const f = await fichaContraparte(String(input?.nit || ''))
      return { error: false, contenido: JSON.stringify({
        fuente: 'Registros oficiales vía Croma (RUES, Rama Judicial, SECOP, Procuraduría)', consultado: f.consultado_at,
        rues: f.rues ? { razon_social: f.rues.nombre, nit: f.rues.nit, dv: f.rues.dv, estado: f.rues.estado, camara: f.rues.camara, fecha_matricula: f.rues.fecha_matricula, anio_renovado: f.rues.anio_renovado, actividad: f.rues.actividad, ciiu: f.rues.ciiu, es_transporte: f.rues.es_transporte, representantes: f.rues.representantes } : 'sin registro',
        procesos_activos_coincidentes: f.procesos ? { total: f.procesos.coincidencias.length, ejemplos: f.procesos.coincidencias.slice(0, 5).map((c: any) => ({ radicado: c.registration_number, juzgado: c.court, ultima_actuacion: c.last_action_date })) } : 'no disponible',
        sanciones_secop: f.sanciones ?? 'no disponible',
        procuraduria: f.procuraduria ?? 'no disponible',
        hallazgos: f.hallazgos.map((h: any) => ({ riesgo: h.risk, titulo: h.t, base: h.base })), score_riesgo: f.score,
        errores_de_fuente: f.errores,
      }) }
    }
    if (nombre === 'consultar_vehiculo') {
      const v = await verificarVehiculo({ vehiculo: { placa: String(input?.placa || '') }, expedicion: null })
      return { error: false, contenido: JSON.stringify({ fuente: 'RUNT y SIMIT vía Croma', placa: v.placa, runt: v.runt, simit: v.simit, hallazgos: v.hallazgos.map((h) => ({ riesgo: h.risk, titulo: h.t, base: h.base })), errores_de_fuente: v.errores }) }
    }
    if (nombre === 'consultar_proceso_judicial') {
      const rad = soloDigitos(String(input?.radicado || ''))
      if (rad.length < 20 || rad.length > 25) return { error: true, contenido: 'El radicado debe tener entre 20 y 25 dígitos.' }
      const { data } = await croma<any>('/co/rama-judicial/cases-by-radicado/v1', { registration_number: rad }, { ttlHoras: 24 })
      const c = data?.primary_case
      return { error: false, contenido: JSON.stringify({ fuente: 'Rama Judicial vía Croma', encontrado: !!data?.found, radicado: rad,
        caso: c ? { juzgado: c.court, departamento: c.department, inicio: c.start_date, ultima_actuacion: c.last_action_date, privado: c.is_private } : null,
        actuaciones_recientes: (data?.actions || []).slice(0, 8).map((a: any) => ({ fecha: a.action_date, tipo: a.action_type, nota: a.note })) }) }
    }
    return { error: true, contenido: `Herramienta desconocida: ${nombre}` }
  } catch (e) {
    return { error: true, contenido: `No fue posible completar la consulta: ${(e as Error).message}` }
  }
}
