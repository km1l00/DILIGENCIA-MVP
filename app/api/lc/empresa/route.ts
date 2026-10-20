import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { obtenerEmpresa, empresaDesdeRues, guardarEmpresa } from '@/lib/lc/empresa'
import { CromaError } from '@/lib/lc/croma'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Perfil de la empresa cliente (null si aún no se ha configurado)
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try { return Response.json({ empresa: await obtenerEmpresa() }) } catch (e) { return fail(e) }
}

// accion=rues: propone los datos desde el RUES por NIT (no guarda). Sin acción: guarda el perfil confirmado.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const body = (await req.json()) as Record<string, any>
    if (body.accion === 'rues') return Response.json({ propuesta: await empresaDesdeRues(String(body.nit || '')) })
    return Response.json({ empresa: await guardarEmpresa(body) })
  } catch (e) { return fail(e, e instanceof CromaError ? e.status : 500) }
}
