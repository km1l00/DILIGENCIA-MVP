import { NextRequest, NextResponse } from 'next/server'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export async function POST(request: NextRequest) {
  let user = '', pass = ''
  try {
    const body = await request.json()
    user = String(body.user ?? '')
    pass = String(body.pass ?? '')
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const U = process.env.BASIC_AUTH_USER
  const P = process.env.BASIC_AUTH_PASS
  const GATE = process.env.GATE_TOKEN

  const uOk = !!U && safeEqual(user, U)
  const pOk = !!P && safeEqual(pass, P)

  if (!uOk || !pOk || !GATE) {
    // Retardo para frenar fuerza bruta
    await new Promise((r) => setTimeout(r, 700))
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
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
