import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must } from '@/lib/lc/db'
import { extraerTexto, analizarContrato, detalleContrato } from '@/lib/lc/contratos-srv'
import { guardarArchivo } from '@/lib/lc/storage'
import { CupoAgotado } from '@/lib/lc/cupo'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_BYTES = 4 * 1024 * 1024

// Contratos analizados (para cambiar entre ellos)
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const rows = must(await db().from('lc_contratos').select('id,nombre,partes,archivo_nombre,score,activo,created_at').order('created_at', { ascending: false }).limit(50))
    return Response.json({ contratos: rows })
  } catch (e) { return fail(e) }
}

// Carga un contrato (PDF o DOCX): extrae el texto en el servidor, lo analiza con Claude y lo persiste como activo.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return Response.json({ error: 'Adjunte el contrato (PDF o DOCX)' }, { status: 400 })
    if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera 4 MB' }, { status: 400 })
    const bytes = new Uint8Array(await file.arrayBuffer())
    const texto = await extraerTexto(file.name, file.type, bytes)
    const path = await guardarArchivo('contratos', file.name, bytes, file.type || 'application/octet-stream')
    const id = await analizarContrato(file.name, texto, path)
    return Response.json(await detalleContrato(id))
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    return fail(e, e instanceof CupoAgotado ? 429 : /Formato no soportado|texto suficiente|demasiado extenso/.test(msg) ? 400 : 500)
  }
}
