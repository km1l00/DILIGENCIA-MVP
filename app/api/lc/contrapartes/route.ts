import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must } from '@/lib/lc/db'
import { fichaContraparte } from '@/lib/lc/contrapartes'
import { CromaError, saldoCroma } from '@/lib/lc/croma'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Fichas de empresas de transporte ya verificadas + saldo de créditos de Croma
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const rows = must(await db().from('lc_contrapartes').select('*').order('consultado_at', { ascending: false }).limit(50))
    return Response.json({ contrapartes: rows, saldo: await saldoCroma() })
  } catch (e) { return fail(e) }
}

// Verifica una empresa de transporte por NIT (RUES, Rama Judicial, SECOP, Procuraduría)
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const { nit, refrescar } = (await req.json()) as { nit?: string; refrescar?: boolean }
    if (!nit) return Response.json({ error: 'Indique el NIT' }, { status: 400 })
    const ficha = await fichaContraparte(nit, !!refrescar)
    return Response.json({ contraparte: ficha, saldo: await saldoCroma() })
  } catch (e) { return fail(e, e instanceof CromaError ? e.status : 500) }
}
