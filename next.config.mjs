/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Fuerza HTTPS en el navegador durante 2 años
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Evita que el sitio se cargue dentro de un iframe (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  // Evita MIME-sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // No filtrar la URL de origen a terceros
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Desactiva APIs sensibles del navegador
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  poweredByHeader: false, // Oculta la cabecera X-Powered-By
  // El logo se embebe en los PDF/Word exportados: incluirlo en el bundle de las funciones.
  outputFileTracingIncludes: { '/api/lc/**': ['./public/logo-emblem.png'] },
  serverExternalPackages: ['unpdf', 'mammoth'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
