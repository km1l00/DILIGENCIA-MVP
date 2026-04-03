"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, CheckCircle2, Sparkles,
  TrendingUp, AlertTriangle, Loader2, Anchor
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import type { Finding, Assessment } from "@/lib/data/types"

function getScoreColor(score: number) {
  if (score >= 4.0) return '#2ecc71'
  if (score >= 3.0) return '#e2a92b'
  if (score >= 2.0) return '#d4871a'
  return '#e05252'
}

function getScoreLabel(score: number) {
  if (score >= 4.5) return 'Riesgo Bajo'
  if (score >= 4.0) return 'Riesgo Bajo-Medio'
  if (score >= 3.0) return 'Riesgo Medio'
  if (score >= 2.0) return 'Riesgo Moderado-Alto'
  return 'Riesgo Alto'
}

export default function SimulatorPage() {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, fRes] = await Promise.all([
          fetch('/api/assessments/latest'),
          fetch('/api/findings'),
        ])
        const aData = await aRes.json()
        const fData = await fRes.json()
        setAssessment(aData.assessment)
        setFindings(fData.findings ?? [])
        if (aData.assessment?.score_global) {
          setAnimatedScore(aData.assessment.score_global)
        }
      } catch {
        toast.error('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openFindings = findings.filter(f => f.status !== 'resolved')
  const resolvedFindings = findings.filter(f => f.status === 'resolved')

  const projectedScore = useMemo(() => {
    if (!assessment?.score_global) return 0
    const added = openFindings.reduce((acc, f) => {
      return checked[f.id] ? acc + (f.score_impact ?? 0) : acc
    }, 0)
    return Math.min(assessment.score_global + added, 5)
  }, [checked, openFindings, assessment])

  useEffect(() => {
    const start = animatedScore
    const end = projectedScore
    const duration = 500
    const startTime = Date.now()
    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(start + (end - start) * ease)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [projectedScore])

  const selectedPoints = openFindings.reduce((acc, f) => {
    return checked[f.id] ? acc + (f.score_impact ?? 0) : acc
  }, 0)

  const totalPossible = openFindings.reduce((acc, f) => acc + (f.score_impact ?? 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="h-6 w-6 text-brass animate-spin" />
    </div>
  )

  if (!assessment) return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brass/10 border border-brass/20">
        <Anchor className="h-8 w-8 text-brass/50" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Sin evaluación disponible</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Necesitas completar al menos un análisis para usar el simulador.
      </p>
      <Link href="/documents" className="inline-flex items-center gap-2 bg-brass hover:bg-brass-light text-navy-deep font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">
        Ir a Documentos
      </Link>
    </div>
  )

  const currentScore = assessment.score_global ?? 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plan de Mejora</h1>
        <p className="text-muted-foreground">Simule el impacto de resolver cada hallazgo en su score</p>
      </div>

      {/* Simulator Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brass" />
            Simulador de Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Score Actual</p>
              <div className="text-4xl font-bold font-mono" style={{ color: getScoreColor(currentScore) }}>
                {currentScore.toFixed(1)}
              </div>
              <Badge variant="outline" className="mt-2 text-xs" style={{
                backgroundColor: `${getScoreColor(currentScore)}15`,
                borderColor: `${getScoreColor(currentScore)}4D`,
                color: getScoreColor(currentScore)
              }}>
                {getScoreLabel(currentScore)}
              </Badge>
            </div>
            <div className="flex flex-col items-center">
              <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ArrowRight className="h-8 w-8 text-brass" />
              </motion.div>
              <p className="text-xs text-brass mt-1">+{selectedPoints.toFixed(2)} pts</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Score Proyectado</p>
              <div className="text-4xl font-bold font-mono" style={{ color: getScoreColor(animatedScore) }}>
                {animatedScore.toFixed(1)}
              </div>
              <Badge variant="outline" className="mt-2 text-xs" style={{
                backgroundColor: `${getScoreColor(projectedScore)}15`,
                borderColor: `${getScoreColor(projectedScore)}4D`,
                color: getScoreColor(projectedScore)
              }}>
                {getScoreLabel(projectedScore)}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progreso hacia score máximo</span>
              <span>{Object.values(checked).filter(Boolean).length} de {openFindings.length} seleccionadas</span>
            </div>
            <div className="relative h-3 rounded-full bg-navy-medium overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, oklch(0.72 0.14 75) 0%, oklch(0.55 0.18 160) 100%)' }}
                animate={{ width: `${Math.max(((animatedScore - currentScore) / (5 - currentScore)) * 100, 0)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open findings */}
      {openFindings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brass" />
            Acciones de Mejora
          </h2>
          {openFindings.map((finding, index) => (
            <motion.div
              key={finding.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  'border-border/50 bg-card/50 backdrop-blur-sm transition-all cursor-pointer',
                  checked[finding.id] && 'border-brass/50 bg-brass/5'
                )}
                onClick={() => setChecked(prev => ({ ...prev, [finding.id]: !prev[finding.id] }))}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={!!checked[finding.id]}
                      onCheckedChange={() => setChecked(prev => ({ ...prev, [finding.id]: !prev[finding.id] }))}
                      className="h-5 w-5 border-2 border-muted-foreground/50 data-[state=checked]:bg-brass data-[state=checked]:border-brass"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">{finding.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                          {finding.area_category}
                        </Badge>
                        <Badge style={{
                          backgroundColor: finding.risk_level === 'alto' ? 'rgba(224,82,82,0.12)' : 'rgba(212,135,26,0.12)',
                          color: finding.risk_level === 'alto' ? '#e05252' : '#d4871a',
                          border: `1px solid ${finding.risk_level === 'alto' ? 'rgba(224,82,82,0.3)' : 'rgba(212,135,26,0.3)'}`,
                          fontSize: '10px', padding: '2px 6px', borderRadius: '4px'
                        }}>
                          {finding.risk_level.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <motion.div
                        animate={checked[finding.id] ? { scale: [1, 1.1, 1] } : {}}
                        className="text-lg font-bold font-mono"
                        style={{ color: checked[finding.id] ? '#2ecc71' : undefined }}
                      >
                        +{(finding.score_impact ?? 0).toFixed(2)}
                      </motion.div>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Resolved findings */}
      {resolvedFindings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Ya resueltos</h2>
          {resolvedFindings.map(finding => (
            <Card key={finding.id} className="border-border/50 bg-card/50 opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-starboard-green/20">
                    <CheckCircle2 className="h-4 w-4 text-starboard-green" />
                  </div>
                  <span className="flex-1 text-sm text-muted-foreground line-through">{finding.title}</span>
                  <span className="text-xs text-starboard-green font-mono">+{(finding.score_impact ?? 0).toFixed(2)} pts</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {totalPossible > 0 && (
        <Card className="border-brass/30 bg-brass/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-brass" />
                <div>
                  <p className="text-sm font-medium text-foreground">Impacto total disponible</p>
                  <p className="text-xs text-muted-foreground">Resolviendo todas las acciones pendientes</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-brass font-mono">+{totalPossible.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">puntos al score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
