import { NextResponse } from 'next/server'

// Acceso de demostración: el usuario queda fijo (franco.admin) y basta el botón para entrar.
// Esto NO es autenticación: cualquiera con la URL puede entrar. La cookie de sesión se mantiene
// para que las rutas /api exijan haber pasado por aquí, y el gasto de IA tiene un tope diario (lib/lc/cupo.ts).
export async function POST() {
  const GATE = process.env.GATE_TOKEN
  if (!GATE) return NextResponse.json({ ok: false }, { status: 500 })
  const res = NextResponse.json({ ok: true, user: process.env.BASIC_AUTH_USER || 'franco.admin' })
  res.cookies.set('fa_session', GATE, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('fa_session', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
