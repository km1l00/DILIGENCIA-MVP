// Asistente legal: contexto desde la BD (normas, contrato y manifiesto activos) y system prompt de F&AA.
import { db, must } from './db'
import { detalleContrato } from './contratos-srv'
import { contratoActivo, manifiestoActivo } from './estado'

export const CONVERSACION = 'principal'

export const SYSTEM_BASE = `Eres el asistente legal de Franco & Abogados Asociados (F&AA) en Logicompliance. Respondes a un GENERADOR de carga (cliente de la firma) que hace due diligence de su relación con empresas de transporte en Colombia.

Cómo respondes:
- Español jurídico claro y directo, en tono profesional. Respuestas breves: un título en negrita, 2 a 5 viñetas o párrafos cortos y una recomendación práctica al final.
- Usa siempre "empresa de transporte", nunca "transportador". Escribe "due diligence" en minúscula. No uses guiones largos como inciso ni muletillas.
- Enfoca el análisis en los riesgos y obligaciones del generador. Si un riesgo recae sobre la empresa de transporte y no sobre el generador, dilo expresamente.

Reglas de fuentes (obligatorias):
- Solo puedes citar normas que aparezcan en <normas_bd>. Cada vez que cites una norma, enlázala en formato markdown con su URL oficial exacta: [Decreto 1079 de 2015](url).
- Puedes mencionar artículos de esas normas solo si estás seguro de su número. Hechos verificados del Decreto 1079 de 2015: art. 2.2.1.7.5.4 (contenido mínimo del manifiesto; numerales 9 a 11 modificados por el art. 10 del Decreto 1017 de 2025: pago dentro de los 5 días hábiles siguientes al cumplido); art. 2.2.1.7.6.8, modificado por el art. 15 del Decreto 1017 de 2025 (8 horas para cargue y 8 para descargue desde la cita programada; si se superan, la EMPRESA DE TRANSPORTE paga al propietario, poseedor o tenedor del vehículo 3 SMLDV por hora adicional en articulado y 2 en rígido; frente al generador, si no carga o descarga en las horas pactadas, el flete se incrementa en el monto o porcentaje pactado en el contrato; antes el límite era de 12 horas); art. 2.2.1.7.6.9, num. 2, lit. b (el generador paga cargue, descargue y trasbordo); art. 2.2.1.7.4, modificado por el Decreto 1017 de 2025 (el valor a pagar no puede ser inferior al SICE-TAC).
- Si la pregunta requiere una norma que no está en <normas_bd>, dilo con claridad ("no tengo esa norma en la base de la firma") y sugiere validarla con un abogado de F&AA. Nunca inventes números de normas ni de artículos.
- Los datos del contrato y del manifiesto activos (<contrato_activo>, <manifiesto_activo>) son hechos: si el usuario afirma algo que los contradice, mandan los datos y lo adviertes.
- No das asesoría definitiva: cierra con una recomendación práctica cuando aplique.

Consultas a registros oficiales (herramientas):
- Tienes herramientas para consultar en vivo el RUES, la Rama Judicial, SECOP, la Procuraduría, el RUNT y el SIMIT. Úsalas cuando la pregunta dependa de la situación actual de una empresa de transporte (por NIT), de un vehículo (por placa) o de un proceso (por radicado). Si el NIT o la placa están en el contrato o el manifiesto activos, puedes tomarlos de ahí.
- Cada consulta gasta créditos: no repitas la misma consulta y no consultes si la pregunta se responde sin datos en vivo.
- Lo que devuelven es un hecho de fuente oficial: cítalo como "según el RUES", "según el RUNT", etc., con la fecha de la consulta. Si una fuente falló, dilo.
- Los procesos judiciales por razón social son coincidencias por nombre: adviértelo. No consultes ni reveles datos de personas naturales (cédulas, propietarios de vehículos).`

export async function contextoChat(normaCodigo?: string | null): Promise<{ normas: string; contrato: string; manifiesto: string; foco: string }> {
  const d = db()
  const normas = must(await d.from('lc_normas').select('codigo,entidad,titulo,resumen,url').order('codigo')) as any[]
  const normasTxt = normas.map((n) => `- ${n.codigo} (${n.entidad}): ${n.titulo}. ${n.resumen} URL: ${n.url}`).join('\n')

  let contratoTxt = 'Sin contrato activo.'
  const c = await contratoActivo()
  if (c) {
    const det = await detalleContrato(c.id)
    contratoTxt = [
      `${det.contrato.nombre} · ${det.contrato.partes} · riesgo ${det.contrato.score.toFixed(1)}/5 (base ${det.contrato.score_base.toFixed(1)})`,
      det.contrato.nit_empresa ? `NIT de la empresa de transporte según el contrato: ${det.contrato.nit_empresa}` : '',
      det.contrato.resumen ? `Resumen: ${det.contrato.resumen}` : '',
      'Hallazgos:',
      ...det.hallazgos.map((h) => `- ${h.codigo} [${h.risk}${h.implementado ? ', implementado' : ''}] ${h.titulo}`),
      'Cláusulas vigentes:',
      ...det.vigente.map((cl) => `- ${cl.nombre}: ${cl.body.slice(0, 400)}`),
    ].filter(Boolean).join('\n')
  }

  let manifTxt = 'Sin manifiesto activo.'
  const m = await manifiestoActivo()
  if (m) {
    const dt = m.datos as any
    manifTxt = [
      `Manifiesto N.º ${m.numero} · cumplimiento ${Number(m.score).toFixed(1)}/5 · expedición ${dt.expedicion ?? 's. d.'} · empresa de transporte ${dt.empresa?.nombre ?? 's. d.'} (NIT ${dt.empresa?.nit ?? 's. d.'})`,
      `Vehículo: placa ${dt.vehiculo?.placa ?? 's. d.'} · configuración ${dt.vehiculo?.configuracion ?? 's. d.'}${m.verificacion ? ` · verificado en RUNT/SIMIT: clase ${m.verificacion.runt?.clase ?? 's. d.'}, SOAT en la fecha ${m.verificacion.runt?.soat_en_fecha ? 'vigente' : 'no vigente'}, revisión técnico-mecánica ${m.verificacion.runt?.rtm_en_fecha ? 'vigente' : 'no vigente'}` : ''}`,
      ...(((m.verificacion?.hallazgos as any[]) || []).map((h) => `- [${h.risk}] ${h.t} (${h.base})`)),
      `Valor a pagar ${dt.valor_total ?? 's. d.'} · ICA ${dt.retencion_ica ?? 's. d.'} · fecha de pago ${dt.fecha_pago ?? 's. d.'} · cargue pagado por ${dt.cargue_pagado_por ?? 'sin diligenciar'} · descargue pagado por ${dt.descargue_pagado_por ?? 'sin diligenciar'}`,
      'Hallazgos:',
      ...(m.hallazgos as any[]).map((h) => `- [${h.risk}] ${h.t} (${h.base})`),
    ].join('\n')
  }

  let foco = ''
  if (normaCodigo) {
    const n = must(await d.from('lc_normas').select('*').eq('codigo', normaCodigo).maybeSingle()) as any
    if (n) foco = `El usuario pregunta desde la ficha de esta norma; tómala como contexto principal:\n${n.codigo} · ${n.titulo} (${n.entidad}, ${n.fecha || 's. f.'}). ${n.resumen}\nPuntos: ${(n.puntos || []).join(' | ')}\nImpacto: ${n.impacto || ''}\nURL oficial: ${n.url}`
  }
  return { normas: normasTxt, contrato: contratoTxt, manifiesto: manifTxt, foco }
}

export async function historial(limit = 16) {
  const rows = must(await db().from('lc_chat').select('role,content,norma_codigo,created_at').eq('conversacion', CONVERSACION).order('created_at', { ascending: false }).limit(limit)) as any[]
  return rows.reverse()
}
