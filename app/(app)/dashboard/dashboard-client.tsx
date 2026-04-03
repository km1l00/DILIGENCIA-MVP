"use client"
import { motion } from "framer-motion"
import {
  AlertTriangle, FileText, TrendingDown, TrendingUp,
  Sparkles, AlertCircle, Clock, Anchor
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScoreGauge } from "@/components/score-gauge"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts"
import Link from "next/link"
import type { Tenant, Assessment, Finding } from "@/lib/data/types"

type Props = {
  company: Tenant
  assessment: Assessment | null
  history: { score_global: number | null; created_at: string }[]
  criticalFindings: Finding[]
  counts: { alto: number; medio: number; documentos: number }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const AREA_LABELS: Record<string, string> = {
  legal: 'Legal',
  laboral: 'Laboral',
  corporativo: 'Corporativo',
  tributario: 'Tributario',
  licencias: 'Licencias',
  contratos: 'Contratos',
}

export default function DashboardClient({ company, assessment, history, criticalFindings, counts }: Props) {
  const score = assessment?.score_global ?? null

  const riskAreas = assessment ? [
    { name: 'Legal', score: assessment.score_legal },
    { name: 'Laboral', score: assessment.score_laboral },
    { name: 'Contratos', score: assessment.score_contratos },
    { name: 'Licencias', score: assessment.score_licencias },
    { name: 'Corporativo', score: assessment.score_corporativo },
    { name: 'Tributario', score: assessment.score_tributario },
  ].filter(a => a.score !== null) : []

  const chartHistory = history.map((h, i) => ({
    month: new Date(h.created_at).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
    score: h.score_global,
  }))

  // Estado vacío — sin evaluaciones todavía
  if (!assessment) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-foreground">Panel de Control</h1>
          <p className="text-muted-foreground">{company.company_name} · NIT {company.nit}</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brass/10 border border-brass/20">
            <Anchor className="h-10 w-10 text-brass/60" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Sin evaluaciones todavía</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Sube tus primeros documentos para generar tu calificación de riesgo. 
              El sistema analizará cada área y te dirá exactamente qué mejorar.
            </p>
          </div>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 bg-brass hover:bg-brass-light text-navy-deep font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Cargar documentos
          </Link>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Panel de Control</h1>
        <p className="text-muted-foreground">{company.company_name} · NIT {company.nit}</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-muted-foreground">Score de Riesgo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-4">
              <ScoreGauge score={score ?? 0} />
              <div className="mt-6 w-full space-y-4">
                <div className="flex items-center justify-center">
                  <Badge
                    variant="outline"
                    className="px-4 py-1.5 text-sm font-semibold rounded-md"
                    style={{
                      backgroundColor: (score ?? 0) >= 4 ? 'rgba(46,204,113,0.15)' : (score ?? 0) >= 3 ? 'rgba(226,169,43,0.15)' : 'rgba(212,135,26,0.15)',
                      borderColor: (score ?? 0) >= 4 ? 'rgba(46,204,113,0.3)' : (score ?? 0) >= 3 ? 'rgba(226,169,43,0.3)' : 'rgba(212,135,26,0.3)',
                      color: (score ?? 0) >= 4 ? '#2ecc71' : (score ?? 0) >= 3 ? '#e2a92b' : '#d4871a',
                    }}
                  >
                    {(score ?? 0) >= 4 ? 'Riesgo Bajo' : (score ?? 0) >= 3 ? 'Riesgo Medio' : (score ?? 0) >= 2 ? 'Riesgo Moderado-Alto' : 'Riesgo Alto'}
                  </Badge>
                </div>
                {counts.alto > 0 && (
                  <div className="rounded-lg border border-starboard-green/30 bg-starboard-green/10 p-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-starboard-green">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {counts.alto} hallazgo{counts.alto > 1 ? 's' : ''} crítico{counts.alto > 1 ? 's' : ''} por resolver
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-port-red/30 bg-port-red/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-port-red/20">
                    <AlertCircle className="h-5 w-5 text-port-red" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-port-red">{counts.alto}</p>
                    <p className="text-xs text-muted-foreground">Críticos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-warning/30 bg-amber-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-warning/20">
                    <AlertTriangle className="h-5 w-5 text-amber-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-warning">{counts.medio}</p>
                    <p className="text-xs text-muted-foreground">Medios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-brass/30 bg-brass/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass/20">
                    <FileText className="h-5 w-5 text-brass" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brass">{counts.documentos}</p>
                    <p className="text-xs text-muted-foreground">Documentos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {riskAreas.length > 0 && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-muted-foreground">Score por Área</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskAreas} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,146,42,0.1)" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} stroke="rgba(255,255,255,0.3)" fontSize={10} />
                      <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} width={55} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'oklch(0.15 0.025 250)', border: '1px solid oklch(0.25 0.03 250)', borderRadius: '8px', color: 'white' }}
                        formatter={(value: number) => [value.toFixed(1), 'Score']}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]} animationDuration={1500}>
                        {riskAreas.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              (entry.score ?? 0) >= 4.0 ? '#2ecc71' :
                              (entry.score ?? 0) >= 3.0 ? '#e2a92b' :
                              (entry.score ?? 0) >= 2.0 ? '#d4871a' : '#e05252'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {chartHistory.length > 1 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-muted-foreground">Historial de Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.72 0.14 75)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.72 0.14 75)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,146,42,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                    <YAxis domain={[0, 5]} tickCount={6} stroke="rgba(255,255,255,0.3)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'oklch(0.15 0.025 250)', border: '1px solid oklch(0.25 0.03 250)', borderRadius: '8px', color: 'white' }} />
                    <ReferenceLine y={3} stroke="oklch(0.75 0.18 85)" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="score" stroke="oklch(0.72 0.14 75)" strokeWidth={2} fill="url(#scoreGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {criticalFindings.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Hallazgos Críticos</h2>
            <Link href="/findings" className="text-sm text-brass hover:text-brass-light transition-colors">Ver todos</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {criticalFindings.map((finding, index) => (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Card className="border-l-4 border-l-port-red border-border/50 bg-card/50 backdrop-blur-sm h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="border-port-red/50 text-port-red text-xs">
                        {AREA_LABELS[finding.area_category] ?? finding.area_category}
                      </Badge>
                      {finding.score_impact && (
                        <Badge style={{ backgroundColor: 'rgba(46,204,113,0.10)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.3)', borderRadius: '6px', padding: '3px 8px' }}>
                          +{finding.score_impact.toFixed(1)} pts
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-medium text-foreground line-clamp-2">{finding.title}</h3>
                    {finding.recommendation && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{finding.recommendation}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
