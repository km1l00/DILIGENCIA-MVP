import { NextResponse, type NextRequest } from 'next/server'

// Comparación en tiempo constante (evita timing attacks)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const GATE = process.env.GATE_TOKEN
  const cookie = request.cookies.get('fa_session')?.value || ''
  const authed = !!GATE && safeEqual(cookie, GATE)

  // Rutas públicas: el login del camión ("/") y la API de acceso
  const isLogin = pathname === '/'
  const isAcceso = pathname.startsWith('/api/acceso')

  if (!GATE) return NextResponse.next()

  // Ya autenticado y en el login -> a la app
  if (authed && isLogin) {
    return NextResponse.redirect(new URL('/inicio', request.url))
  }

  // Sin sesión y ruta protegida -> al login (no se sirve nada)
  if (!authed && !isLogin && !isAcceso) {
    const res = NextResponse.redirect(new URL('/', request.url))
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)'],
}
