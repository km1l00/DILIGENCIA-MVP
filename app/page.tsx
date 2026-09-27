"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true); setError(false)
    try {
      const res = await fetch("/api/acceso", {
        method: "POST",
      })
      if (res.ok) {
        window.location.href = "/inicio"
        return
      }
      setError(true)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video de fondo: Camión en carretera */}
      <video
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover scale-105 saturate-110 contrast-105"
      >
        <source src="/Truck_cruising_down_highway_20260915111218.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,28,34,.35), rgba(15,28,34,.6))' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div
          style={{
            background: 'rgba(18, 33, 40, 0.55)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            borderRadius: '28px',
            border: '1px solid rgba(234, 188, 31, 0.25)',
            boxShadow: '0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12)',
          }}
        >
          <div className="p-8 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden"
              style={{
                borderRadius: '18px',
                background: 'rgba(20,35,42,.55)',
                border: '1px solid rgba(234, 188, 31, 0.4)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-emblem.png" alt="Franco & Abogados Asociados" style={{ width: 54, height: 'auto' }} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-3xl font-bold tracking-tight text-[#EABC1F]"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
            >
              Logicompliance
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="mt-2 text-sm text-white/85"
            >
              Franco &amp; Abogados Asociados · Sector Transporte
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <p className="text-center text-sm text-white/80">Acceso de demostración · <span className="text-white">franco.admin</span></p>

            {error && (
              <div style={{ fontSize: 12.5, color: '#ffdada', background: 'rgba(224,82,82,.28)', border: '1px solid rgba(255,150,150,.5)', borderRadius: 10, padding: '8px 12px' }}>
                No fue posible iniciar la sesión. Intente de nuevo.
              </div>
            )}

            <button
              type="submit" disabled={isLoading}
              className="w-full h-11 font-semibold transition-all duration-200 disabled:opacity-60 flex justify-center items-center"
              style={{ background: 'linear-gradient(135deg, #EABC1F 0%, #F0CB45 100%)', color: '#1D3A45', borderRadius: '12px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? "Ingresando..." : "Ingresar al Portal"}
            </button>
          </form>

          <div className="px-8 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="flex items-center justify-center gap-2 text-xs text-white/60">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2ecc71]" />
              <span>Conexión segura · TLS 1.3 · Acceso restringido</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
