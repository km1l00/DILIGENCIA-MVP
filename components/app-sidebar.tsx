"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, FileText, AlertTriangle,
  Calculator, MessageSquare, Anchor, LogOut,
  ChevronLeft, ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { useSidebar } from "@/lib/sidebar-context"

const navItems = [
  { href: "/dashboard", label: "Panel Principal", icon: LayoutDashboard },
  { href: "/documents", label: "Documentos", icon: FileText },
  { href: "/findings", label: "Hallazgos", icon: AlertTriangle },
  { href: "/simulator", label: "Plan de Mejora", icon: Calculator },
  { href: "/chat", label: "Asistente IA", icon: MessageSquare },
]

type TenantInfo = {
  company_name: string
  nit: string
  subscription_status: string
  score_global: number | null
}

function getScoreColor(score: number | null) {
  if (score === null) return '#EABC1F'
  if (score >= 4.0) return '#2ecc71'
  if (score >= 3.0) return '#e2a92b'
  return '#e05252'
}

function getScoreLabel(score: number | null) {
  if (score === null) return 'Sin evaluación'
  if (score >= 4.0) return `Score: ${score.toFixed(1)}/5 · Bajo`
  if (score >= 3.0) return `Score: ${score.toFixed(1)}/5 · Medio`
  if (score >= 2.0) return `Score: ${score.toFixed(1)}/5 · Alto`
  return `Score: ${score.toFixed(1)}/5 · Crítico`
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, setCollapsed } = useSidebar()
  const [tenant, setTenant] = useState<TenantInfo | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.company_name) setTenant(data)
      })
      .catch(() => {})
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const scoreColor = getScoreColor(tenant?.score_global ?? null)

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 z-40 h-screen flex flex-col overflow-hidden"
        style={{
          background: 'rgba(29, 58, 69, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRight: '1px solid rgba(234, 188, 31, 0.15)',
        }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-[rgba(234,188,31,0.15)] flex-shrink-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(234,188,31,0.2)]">
            <Anchor className="h-5 w-5 text-[#EABC1F]" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold tracking-tight text-[#EABC1F] whitespace-nowrap overflow-hidden"
              >
                Diligencia
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Company Info — datos reales */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="border-b border-[rgba(234,188,31,0.15)] p-4 flex-shrink-0"
            >
              <div className="rounded-lg bg-[rgba(255,255,255,0.08)] p-3">
                {tenant ? (
                  <>
                    <p className="text-sm font-semibold text-white truncate">
                      {tenant.company_name}
                    </p>
                    <p className="text-xs text-white/60 mt-0.5">
                      NIT: {tenant.nit}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span
                          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                          style={{ backgroundColor: scoreColor }}
                        />
                        <span
                          className="relative inline-flex h-2 w-2 rounded-full"
                          style={{ backgroundColor: scoreColor }}
                        />
                      </span>
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: scoreColor }}
                      >
                        {getScoreLabel(tenant.score_global)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-[rgba(234,188,31,0.2)] px-2 py-0.5 text-xs font-medium text-[#EABC1F]">
                        {tenant.subscription_status === 'active' ? 'Activo' : 'Plan Piloto'}
                      </span>
                    </div>
                  </>
                ) : (
                  // Skeleton mientras carga
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2.5 bg-white/10 rounded w-1/2" />
                    <div className="h-2.5 bg-white/10 rounded w-2/3 mt-2" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center" : "",
                  isActive
                    ? "bg-[rgba(234,188,31,0.15)] text-[#EABC1F]"
                    : "text-white/70 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#EABC1F]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-[#EABC1F]" : "text-white/50 group-hover:text-white"
                )} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[rgba(234,188,31,0.15)] p-3 flex-shrink-0">
          <button
            onClick={handleSignOut}
            title={collapsed ? "Cerrar Sesión" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
              collapsed ? "justify-center" : ""
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  Cerrar Sesión
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          {!collapsed && (
            <p className="mt-2 px-3 text-xs text-white/30">
              v1.0.0 · Datos seguros
            </p>
          )}
        </div>
      </motion.aside>

      {/* Botón toggle flotante */}
      <motion.button
        animate={{ left: collapsed ? 56 : 240 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-[72px] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(234,188,31,0.3)] bg-[#1D3A45] text-[#EABC1F] shadow-lg hover:bg-[#254B59] transition-colors"
        style={{ transform: 'translateX(-50%)' }}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </motion.button>
    </>
  )
}
