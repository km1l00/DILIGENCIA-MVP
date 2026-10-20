import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must, ESPACIO } from '@/lib/lc/db'
import { detalleContrato } from '@/lib/lc/contratos-srv'

export const dynamic = 'force-dynamic'

// Cambia el contrato activo (el que alimenta el panel y el asistente).
export async function POST(req: NextRequest, ctx: RouteContext<'/api/lc/contratos/[id]/activar'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const d = db()
    must(await d.from('lc_contratos').select('id').eq('espacio', ESPACIO).eq('id', id).single())
    must(await d.from('lc_contratos').update({ activo: false }).eq('espacio', ESPACIO).eq('activo', true))
    must(await d.from('lc_contratos').update({ activo: true, updated_at: new Date().toISOString() }).eq('espacio', ESPACIO).eq('id', id))
    return Response.json(await detalleContrato(id))
  } catch (e) { return fail(e) }
}
