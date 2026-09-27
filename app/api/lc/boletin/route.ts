import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must } from '@/lib/lc/db'
import { generarBoletin } from '@/lib/lc/boletin'
import { CupoAgotado } from '@/lib/lc/cupo'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Último boletín guardado
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const rows = must(await db().from('lc_boletines').select('*').order('created_at', { ascending: false }).limit(1)) as any[]
    return Response.json({ boletin: rows[0] || null })
  } catch (e) { return fail(e) }
}

// Genera y guarda el boletín semanal con Claude a partir de las normas de la BD
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try { return Response.json({ boletin: await generarBoletin() }) } catch (e) { return fail(e, e instanceof CupoAgotado ? 429 : 500) }
}
