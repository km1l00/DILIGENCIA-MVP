import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { listarProcesos, agregarProceso } from '@/lib/lc/procesos'
import { CromaError, saldoCroma } from '@/lib/lc/croma'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Procesos judiciales en seguimiento
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try { return Response.json({ procesos: await listarProcesos(), saldo: await saldoCroma() }) } catch (e) { return fail(e) }
}

// Agrega un radicado al monitoreo (consulta inicial en la Rama Judicial)
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { radicado, alias } = (await req.json()) as { radicado?: string; alias?: string }
    if (!radicado) return Response.json({ error: 'Indique el radicado' }, { status: 400 })
    return Response.json({ proceso: await agregarProceso(radicado, alias), saldo: await saldoCroma() })
  } catch (e) { return fail(e, e instanceof CromaError ? e.status : 500) }
}
