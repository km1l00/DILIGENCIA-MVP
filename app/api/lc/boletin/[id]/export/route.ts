import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must } from '@/lib/lc/db'
import { boletinADoc } from '@/lib/lc/boletin'
import { aDocx, aPdf, descarga } from '@/lib/lc/export'

export const dynamic = 'force-dynamic'

// Descarga el boletín guardado en PDF o Word
export async function GET(req: NextRequest, ctx: RouteContext<'/api/lc/boletin/[id]/export'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const formato = new URL(req.url).searchParams.get('format') === 'docx' ? 'docx' : 'pdf'
    const b = must(await db().from('lc_boletines').select('*').eq('id', id).single()) as any
    const doc = boletinADoc(b)
    const nombre = `boletin-normativo-transporte-n${b.numero}.${formato}`
    return formato === 'pdf' ? descarga(await aPdf(doc), nombre, 'pdf') : descarga(await aDocx(doc), nombre, 'docx')
  } catch (e) { return fail(e) }
}
