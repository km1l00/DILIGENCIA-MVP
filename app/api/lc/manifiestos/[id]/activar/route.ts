import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must } from '@/lib/lc/db'

export const dynamic = 'force-dynamic'

// Marca un manifiesto del historial como el activo (el que alimenta el panel y el asistente).
export async function POST(req: NextRequest, ctx: RouteContext<'/api/lc/manifiestos/[id]/activar'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const d = db()
    must(await d.from('lc_manifiestos').select('id').eq('id', id).single())
    must(await d.from('lc_manifiestos').update({ activo: false }).eq('activo', true))
    must(await d.from('lc_manifiestos').update({ activo: true }).eq('id', id))
    const full = must(await d.from('lc_manifiestos').select('*').eq('id', id).single())
    return Response.json({ manifiesto: full })
  } catch (e) { return fail(e) }
}
