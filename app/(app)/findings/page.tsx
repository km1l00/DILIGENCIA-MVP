"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown, FileText, Scale, Compass,
  CheckCircle, Clock, Loader2, Anchor
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import type { Finding } from "@/lib/data/types"

const AREA_LABELS: Record<string, string> = {
  legal: 'Legal', laboral: 'Laboral', corporativo: 'Corporativo',
  tributario: 'Tributario', licencias: 'Licencias',
  contratos: 'Contratos', financiero: 'Financiero',
}

type FilterType = "all" | "alto" | "medio" | "open" | "resolved"

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchFindings = async () => {
    try {
      const res = await fetch('/api/findings')
      const data = await res.json()
      setFindings(data.findings ?? [])
    } catch {
      toast.error('Error al cargar hallazgos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFindings() }, [])

  const handleStatusChange = async (findingId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setFindings(prev => prev.map(f =>
        f.id === findingId ? { ...f, status: newStatus as Finding['status'] } : f
      ))
      toast.success('Estado actualizado')
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  const filtered = findings.filter(f => {
    switch (filter) {
      case 'alto': return f.risk_level === 'alto'
      case 'medio': return f.risk_level === 'medio'
      case 'open': return f.status === 'open' || f.status === 'in_progress'
      case 'resolved': return f.status === 'resolved'
      default: return true
    }
  })

  const getBorderColor = (risk: string, status: string) => {
    if (status === 'resolved') return '#2ecc71'
    return risk === 'alto' ? '#e05252' : risk === 'medio' ? '#d4871a' : '#e2a92b'
  }

  const getRiskBadge = (risk: string, status: string) => {
    if (status === 'resolved') return (
      <Badge style={{ backgroundColor: 'rgba(46,204,113,0.10)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.3)' }}>
        <CheckCircle className="mr-1 h-3 w-3" />Resuelto
      </Badge>
    )
    if (risk === 'alto') return (
      <Badge style={{ backgroundColor: 'rgba(224,82,82,0.12)', color: '#e05252', border: '1px solid rgba(224,82,82,0.3)' }}>
        Riesgo Alto
      </Badge>
    )
    return (
      <Badge style={{ backgroundColor: 'rgba(212,135,26,0.12)', color: '#d4871a', border: '1px solid rgba(212,135,26,0.3)' }}>
        Riesgo Medio
      </Badge>
    )
  }

  const counts = {
    all: findings.length,
    alto: findings.filter(f => f.risk_level === 'alto').length,
    medio: findings.filter(f => f.risk_level === 'medio').length,
    open: findings.filter(f => f.status !== 'resolved').length,
    resolved: findings.filter(f => f.status === 'resolved').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="h-6 w-6 text-brass animate-spin" />
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hallazgos</h1>
        <p className="text-muted-foreground">Gestione los hallazgos identificados en el due diligence</p>
      </div>

      {findings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brass/10 border border-brass/20">
            <Anchor className="h-8 w-8 text-brass/50" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Sin hallazgos todavía</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Sube documentos y ejecuta un análisis para ver los hallazgos de riesgo de tu empresa.
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 bg-brass hover:bg-brass-light text-navy-deep font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            Ir a Documentos
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(counts) as [FilterType, number][]).map(([value, count]) => {
              const labels: Record<FilterType, string> = {
                all: 'Todos', alto: 'Riesgo Alto', medio: 'Riesgo Medio',
                open: 'Abiertos', resolved: 'Resueltos'
              }
              return (
                <Button
                  key={value}
                  variant={filter === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(value)}
                  className={cn(
                    'transition-all',
                    filter === value
                      ? 'bg-brass text-navy-deep hover:bg-brass-light'
                      : 'border-border/50 hover:border-brass/50 hover:text-brass'
                  )}
                >
                  {labels[value]}
                  <span className={cn(
                    'ml-2 rounded-full px-1.5 py-0.5 text-xs',
                    filter === value ? 'bg-navy-deep/30 text-navy-deep' : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                </Button>
              )
            })}
          </div>

          {/* Findings list */}
          <div className="space-y-3">
            {filtered.map((finding, index) => {
              const isExpanded = expandedId === finding.id
              return (
                <motion.div
                  key={finding.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
                    style={{ borderLeft: `4px solid ${getBorderColor(finding.risk_level, finding.status)}` }}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getRiskBadge(finding.risk_level, finding.status)}
                            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs">
                              {AREA_LABELS[finding.area_category] ?? finding.area_category}
                            </Badge>
                          </div>
                          <h3 className="text-sm font-medium text-foreground">{finding.title}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          {finding.score_impact && (
                            <Badge style={{ backgroundColor: 'rgba(46,204,113,0.10)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.3)', borderRadius: '6px', padding: '3px 8px' }}>
                              +{finding.score_impact.toFixed(2)} pts
                            </Badge>
                          )}
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          </motion.div>
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-0 pb-4 px-4 border-t border-border/50">
                            <div className="mt-4 space-y-4">
                              {finding.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {finding.description}
                                </p>
                              )}
                              {finding.recommendation && (
                                <div className="rounded-lg border-2 border-brass/50 bg-brass/5 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Compass className="h-4 w-4 text-brass" />
                                    <span className="text-sm font-semibold text-brass">Acción Recomendada</span>
                                  </div>
                                  <p className="text-sm text-foreground">{finding.recommendation}</p>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-sm text-muted-foreground">Estado del hallazgo:</span>
                                <Select
                                  value={finding.status}
                                  onValueChange={(value) => handleStatusChange(finding.id, value)}
                                >
                                  <SelectTrigger className="w-40 h-9 bg-navy-medium border-border/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-port-red" />Abierto
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="in_progress">
                                      <div className="flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 text-amber-warning" />En proceso
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="resolved">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3 text-starboard-green" />Resuelto
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </motion.div>
  )
}
