import type { NextRequest } from 'next/server'
import { safeEqual, fail } from '@/lib/lc/session'
import { revisarProcesos } from '@/lib/lc/procesos'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Cron diario de Vercel (vercel.json). Vercel envía "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const r = await revisarProcesos()
    console.log('[cron procesos]', JSON.stringify(r))
    return Response.json(r)
  } catch (e) { return fail(e) }
}
