// Defensa en profundidad: además del proxy, cada ruta /api/lc exige la cookie de sesión.
import type { NextRequest } from 'next/server'

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export function isAuthed(req: NextRequest): boolean {
  const gate = process.env.GATE_TOKEN
  const cookie = req.cookies.get('fa_session')?.value || ''
  return !!gate && safeEqual(cookie, gate)
}

export function unauthorized() {
  return Response.json({ error: 'No autorizado' }, { status: 401 })
}

export function fail(e: unknown, status = 500) {
  const msg = e instanceof Error ? e.message : String(e)
  console.error('[lc]', msg)
  return Response.json({ error: msg }, { status })
}
