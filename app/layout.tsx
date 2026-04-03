import type { Metadata, Viewport } from 'next'
import { Syne, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import '../styles/tw-animate.css'
import './globals.css'

const syne = Syne({ 
  subsets: ["latin"],
  variable: '--font-syne',
  display: 'swap',
})

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Diligencia | Due Diligence Risk Monitoring',
  description: 'Plataforma B2B de monitoreo de riesgo para due diligence empresarial en Colombia',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#0a1628',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${syne.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Toaster 
          position="bottom-right" 
          theme="dark"
          toastOptions={{
            style: {
              background: 'oklch(0.15 0.025 250)',
              border: '1px solid oklch(0.25 0.03 250)',
              color: 'oklch(0.98 0 0)',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
