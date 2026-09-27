import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { detalleContrato } from '@/lib/lc/contratos-srv'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: RouteContext<'/api/lc/contratos/[id]'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    return Response.json(await detalleContrato(id))
  } catch (e) { return fail(e, 404) }
}
