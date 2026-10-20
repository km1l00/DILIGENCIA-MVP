import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { revisarProcesos, listarProcesos } from '@/lib/lc/procesos'
import { CromaError, saldoCroma } from '@/lib/lc/croma'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Revisión manual de todos los procesos activos (la misma que corre el cron diario)
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const r = await revisarProcesos()
    return Response.json({ ...r, procesos: await listarProcesos(), saldo: await saldoCroma() })
  } catch (e) { return fail(e, e instanceof CromaError ? e.status : 500) }
}
