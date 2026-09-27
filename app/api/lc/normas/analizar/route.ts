import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { analizarNormativa } from '@/lib/lc/normativa'
import { CupoAgotado } from '@/lib/lc/cupo'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Consulta fuentes oficiales, resume y clasifica lo encontrado y solo guarda normas con URL oficial verificada.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try { return Response.json(await analizarNormativa()) } catch (e) { return fail(e, e instanceof CupoAgotado ? 429 : 500) }
}
