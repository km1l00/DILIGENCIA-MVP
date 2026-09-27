import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { panel } from '@/lib/lc/estado'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try { return Response.json(await panel()) } catch (e) { return fail(e) }
}
