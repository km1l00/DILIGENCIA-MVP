import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must } from '@/lib/lc/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const rows = must(await db().from('lc_normas')
      .select('codigo,entidad,tipo,estado,fecha,vigencia,cat,tema,titulo,resumen,puntos,impacto,url,url_status,origen,fuente,created_at')
      .order('created_at', { ascending: false })) as any[]
    return Response.json({ normas: rows })
  } catch (e) { return fail(e) }
}
