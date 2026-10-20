import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must, ESPACIO } from '@/lib/lc/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: RouteContext<'/api/lc/manifiestos/[id]'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const row = must(await db().from('lc_manifiestos').select('*').eq('espacio', ESPACIO).eq('id', id).single())
    return Response.json({ manifiesto: row })
  } catch (e) { return fail(e, 404) }
}
