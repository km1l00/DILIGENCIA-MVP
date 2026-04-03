"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Anchor, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CompassLoader } from "@/components/compass-loader"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error("Credenciales incorrectas. Verifica tu correo y contraseña.")
      setIsLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video de fondo optimizado: Barco de Día */}
      <video
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover scale-105 saturate-110 contrast-105"
      >
        <source src="/Barco_Dia.mp4" type="video/mp4" />
      </video>

      {/* Overlay optimizado para dar nitidez diurna */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-white/10" />
      <div className="absolute inset-0 bg-white/5 mix-blend-overlay" />

      {/* Panel Liquid Glass */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
            borderRadius: '28px',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.5),
              inset 0 -1px 0 rgba(255, 255, 255, 0.1)
            `,
          }}
        >
          {/* Header */}
          <div
            className="p-8 text-center"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center"
              style={{
                borderRadius: '20px',
                background: 'rgba(234, 188, 31, 0.25)',
                border: '1px solid rgba(234, 188, 31, 0.4)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Anchor className="h-8 w-8 text-[#EABC1F]" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold tracking-tight text-[#EABC1F]"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
            >
              Diligencia
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-sm text-white/80"
            >
              Plataforma de Monitoreo de Riesgo
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="text-sm font-medium text-white/90">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                required
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  color: 'white',
                  height: '44px',
                }}
                className="placeholder:text-white/40 focus:border-[rgba(234,188,31,0.6)] focus:ring-0"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-sm font-medium text-white/90">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    color: 'white',
                    height: '44px',
                    paddingRight: '44px',
                  }}
                  className="placeholder:text-white/40 focus:border-[rgba(234,188,31,0.6)] focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/90 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-semibold transition-all duration-200 disabled:opacity-60 flex justify-center items-center"
                style={{
                  background: isLoading
                    ? 'rgba(234,188,31,0.6)'
                    : 'linear-gradient(135deg, #EABC1F 0%, #F0CB45 100%)',
                  color: '#1D3A45',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <CompassLoader size={20} />
                    <span>Verificando...</span>
                  </div>
                ) : (
                  "Ingresar al Portal"
                )}
              </button>
            </motion.div>
          </form>

          {/* Footer */}
          <div
            className="px-8 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-2 text-xs text-white/50"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#2ecc71]" />
              <span>Conexión segura · TLS 1.3 · AES-256</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Depth indicator */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-2"
      >
        <div className="h-40 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        <div className="flex flex-col items-center gap-1">
          {[0, 1, 2, 3, 4, 5].map((depth) => (
            <div key={depth} className="flex items-center gap-2">
              <div className="w-2 h-px bg-white/30" />
              <span className="text-[10px] text-white/40 font-mono">{depth}m</span>
            </div>
          ))}
        </div>
        <div className="h-40 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      </motion.div>
    </div>
  )
}
