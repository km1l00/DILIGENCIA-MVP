import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must, logEvento } from '@/lib/lc/db'
import { detalleContrato } from '@/lib/lc/contratos-srv'

export const dynamic = 'force-dynamic'

// Implementa la redacción mejorada de un hallazgo: queda incorporada en la versión vigente del contrato
// y el score se recalcula en el servidor (base + impactos implementados).
export async function POST(req: NextRequest, ctx: RouteContext<'/api/lc/contratos/[id]/implementar'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const { codigo } = (await req.json()) as { codigo?: string }
    if (!codigo) return Response.json({ error: 'Falta el código del hallazgo' }, { status: 400 })
    const d = db()
    const h = must(await d.from('lc_contrato_hallazgos').update({ implementado: true, implementado_at: new Date().toISOString() })
      .eq('contrato_id', id).eq('codigo', codigo).select('titulo,clausula_titulo').single()) as any
    const det = await detalleContrato(id)
    must(await d.from('lc_contratos').update({ score: det.contrato.score, updated_at: new Date().toISOString() }).eq('id', id))
    await logEvento('contrato', `Cláusula implementada: ${h.clausula_titulo || h.titulo}`, `${det.contrato.nombre} · riesgo ${det.contrato.score.toFixed(1)}/5`, id)
    return Response.json({ ...det, contrato: { ...det.contrato } })
  } catch (e) { return fail(e) }
}
