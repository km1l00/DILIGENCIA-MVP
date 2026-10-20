import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { desactivarProceso, marcarVistas } from '@/lib/lc/procesos'

export const dynamic = 'force-dynamic'

// accion=desactivar: deja de monitorear (no se borra); accion=vistas: marca las actuaciones nuevas como leídas
export async function POST(req: NextRequest, ctx: RouteContext<'/api/lc/procesos/[id]'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const { accion } = (await req.json()) as { accion?: string }
    if (accion === 'desactivar') return Response.json({ proceso: await desactivarProceso(id) })
    if (accion === 'vistas') return Response.json({ proceso: await marcarVistas(id) })
    return Response.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (e) { return fail(e) }
}
