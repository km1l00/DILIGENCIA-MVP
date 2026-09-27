import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must } from '@/lib/lc/db'
import { leerArchivo } from '@/lib/lc/storage'

export const dynamic = 'force-dynamic'

// Descarga el archivo original cargado (PDF/DOCX) desde el almacenamiento privado.
export async function GET(req: NextRequest, ctx: RouteContext<'/api/lc/contratos/[id]/original'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const c = must(await db().from('lc_contratos').select('archivo_nombre,archivo_path').eq('id', id).single()) as any
    if (!c.archivo_path) return Response.json({ error: 'Este contrato no tiene archivo original guardado' }, { status: 404 })
    const blob = await leerArchivo(c.archivo_path)
    if (!blob) return Response.json({ error: 'Archivo no encontrado' }, { status: 404 })
    const nombre = c.archivo_nombre || 'contrato'
    return new Response(blob, { headers: {
      'content-type': blob.type || 'application/octet-stream',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'cache-control': 'no-store',
    } })
  } catch (e) { return fail(e, 404) }
}
