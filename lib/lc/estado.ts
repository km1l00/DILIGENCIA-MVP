// Estado agregado para el panel: contrato y manifiesto activos, KPIs y actividad. Todo desde la BD.
import { db, must } from './db'
import { scoreContrato } from './contrato'

export async function contratoActivo() {
  const c = must(await db().from('lc_contratos').select('id,nombre,partes,score_base,score').eq('activo', true).order('updated_at', { ascending: false }).limit(1)) as any[]
  return c[0] || null
}
export async function manifiestoActivo() {
  const m = must(await db().from('lc_manifiestos').select('id,numero,score,hallazgos,datos').eq('activo', true).order('created_at', { ascending: false }).limit(1)) as any[]
  return m[0] || null
}

export async function panel() {
  const d = db()
  const semana = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const [nuevas, contratos, manifiestos, eventos, c, m] = await Promise.all([
    d.from('lc_normas').select('id', { count: 'exact', head: true }).eq('origen', 'analisis').gte('created_at', semana),
    d.from('lc_contratos').select('id', { count: 'exact', head: true }),
    d.from('lc_manifiestos').select('id', { count: 'exact', head: true }),
    d.from('lc_eventos').select('tipo,titulo,detalle,created_at').order('created_at', { ascending: false }).limit(6),
    contratoActivo(),
    manifiestoActivo(),
  ])
  let hallContrato = 0, contratoScore: number | null = null
  if (c) {
    const hs = must(await d.from('lc_contrato_hallazgos').select('impacto,implementado').eq('contrato_id', c.id)) as any[]
    hallContrato = hs.filter((h) => !h.implementado).length
    contratoScore = scoreContrato(Number(c.score_base), hs).score
  }
  const hallManif = m ? (m.hallazgos as unknown[]).length : 0
  const manifScore = m ? Number(m.score) : null
  const scores = [contratoScore, manifScore].filter((x): x is number => x !== null)
  return {
    kpis: {
      normasNuevasSemana: nuevas.count ?? 0,
      contratos: contratos.count ?? 0,
      manifiestos: manifiestos.count ?? 0,
      hallazgosActivos: hallContrato + hallManif,
    },
    actividad: eventos.data || [],
    contrato: c ? { id: c.id, nombre: c.nombre, partes: c.partes, score: contratoScore, hallazgos: hallContrato } : null,
    manifiesto: m ? { id: m.id, numero: m.numero, score: manifScore, hallazgos: hallManif } : null,
    panelScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
  }
}
