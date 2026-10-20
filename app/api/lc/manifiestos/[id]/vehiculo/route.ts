import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must, logEvento, ESPACIO } from '@/lib/lc/db'
import { verificarVehiculo } from '@/lib/lc/vehiculo'
import { scoreDe } from '@/lib/lc/manifiesto'
import { CromaError, saldoCroma } from '@/lib/lc/croma'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Cruza la placa del manifiesto con RUNT y SIMIT; los hallazgos del vehículo se suman al score del manifiesto.
export async function POST(req: NextRequest, ctx: RouteContext<'/api/lc/manifiestos/[id]/vehiculo'>) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { id } = await ctx.params
    const d = db()
    const m = must(await d.from('lc_manifiestos').select('*').eq('espacio', ESPACIO).eq('id', id).single()) as any
    const v = await verificarVehiculo(m.datos)
    const score = scoreDe([...(m.hallazgos || []), ...v.hallazgos])
    const row = must(await d.from('lc_manifiestos').update({ verificacion: v, score }).eq('espacio', ESPACIO).eq('id', id).select('*').single())
    await logEvento('manifiesto', `Vehículo ${v.placa} verificado en RUNT y SIMIT`, v.hallazgos.length ? v.hallazgos.map((h) => h.t).slice(0, 2).join(' · ') : 'Sin hallazgos frente a RUNT y SIMIT', id)
    return Response.json({ manifiesto: row, saldo: await saldoCroma() })
  } catch (e) { return fail(e, e instanceof CromaError ? e.status : /placa válida/.test((e as Error).message) ? 400 : 500) }
}
