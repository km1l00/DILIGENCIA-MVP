import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { detalleContrato } from '@/lib/lc/contratos-srv'
import { ordinal } from '@/lib/lc/contrato'
import { aDocx, aPdf, descarga, PIE_FAA, type Bloque } from '@/lib/lc/export'

export const dynamic = 'force-dynamic'

// Exporta el contrato mejorado. version=propuesta (todas las redacciones propuestas) | vigente (solo las implementadas).
export async function GET(req: NextRequest, ctx: RouteContext<'/api/lc/contratos/[id]/export'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const url = new URL(req.url)
    const formato = url.searchParams.get('format') === 'pdf' ? 'pdf' : 'docx'
    const version = url.searchParams.get('version') === 'vigente' ? 'vigente' : 'propuesta'
    const det = await detalleContrato(id)
    const cls = version === 'vigente' ? det.vigente : det.propuesta
    const bloques: Bloque[] = [
      { tipo: 'titulo', texto: det.contrato.nombre.toUpperCase() },
      { tipo: 'subtitulo', texto: det.contrato.partes || '' },
    ]
    if (det.contrato.encabezado) bloques.push({ tipo: 'parrafo', texto: det.contrato.encabezado })
    cls.forEach((c, i) => bloques.push({ tipo: 'parrafo', negrita: `${ordinal(i)}. ${c.nombre}.`, texto: c.body }))
    const cambios = cls.filter((c) => c.status !== 'same').length
    bloques.push({ tipo: 'nota', texto: `Versión ${version === 'vigente' ? 'vigente (redacciones implementadas)' : 'con las redacciones propuestas'} · ${cambios} cláusulas nuevas o modificadas · Documento preparado con Logicompliance para revisión de las partes.` })
    const doc = { encabezado: 'CONTRATO MEJORADO', subtitulo: `${det.contrato.nombre} · ${new Date().toLocaleDateString('es-CO')}`, bloques, pie: PIE_FAA }
    const base = (det.contrato.archivo_nombre || det.contrato.nombre).replace(/\.[a-z]+$/i, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-')
    const nombre = `${base}-${version === 'vigente' ? 'vigente' : 'mejorado'}.${formato}`
    return formato === 'pdf' ? descarga(await aPdf(doc), nombre, 'pdf') : descarga(await aDocx(doc), nombre, 'docx')
  } catch (e) { return fail(e) }
}
