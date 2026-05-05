"use client"
import { motion } from "framer-motion"
import { AlertTriangle, FileText, Sparkles, AlertCircle, Clock, Anchor } from "lucide-react"
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
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
}

const AREA_LABELS: Record<string, string> = {
  legal: 'Legal', laboral: 'Laboral', corporativo: 'Corporativo',
  tributario: 'Tributario', licencias: 'Licencias', contratos: 'Contratos',
}

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.8)',
  borderRadius: '12px',
  color: '#1D3A45',
  boxShadow: '0 4px 20px rgba(37,75,89,0.1)',
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

  const chartHistory = history.map(h => ({
    month: new Date(h.created_at).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
    score: h.score_global,
  }))

  const getScoreBadge = (s: number | null) => {
    if (!s) return { label: 'Sin datos', color: '#7A7A7A', bg: 'rgba(122,122,122,0.1)', border: 'rgba(122,122,122,0.2)' }
    if (s >= 4) return { label: 'Riesgo Bajo', color: '#2ecc71', bg: 'rgba(46,204,113,0.1)', border: 'rgba(46,204,113,0.25)' }
    if (s >= 3) return { label: 'Riesgo Medio', color: '#e2a92b', bg: 'rgba(226,169,43,0.1)', border: 'rgba(226,169,43,0.25)' }
    if (s >= 2) return { label: 'Riesgo Alto', color: '#d4871a', bg: 'rgba(212,135,26,0.1)', border: 'rgba(212,135,26,0.25)' }
    return { label: 'Riesgo Crítico', color: '#e05252', bg: 'rgba(224,82,82,0.1)', border: 'rgba(224,82,82,0.25)' }
  }

  const badge = getScoreBadge(score)

  if (!assessment) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-[#1D3A45]">Panel de Control</h1>
          <p className="text-[#7A7A7A] mt-1">{company.company_name} · NIT {company.nit}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
          <div className="glass-score p-8 flex flex-col items-center space-y-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[rgba(234,188,31,0.1)] border border-[rgba(234,188,31,0.2)]">
              <Anchor className="h-10 w-10 text-[#EABC1F]" />
            </div>
            <h2 className="text-xl font-semibold text-[#1D3A45]">Sin evaluaciones todavía</h2>
            <p className="text-[#7A7A7A] text-sm max-w-md">
              Sube tus primeros documentos para generar tu calificación de riesgo.
            </p>
            <Link href="/documents" className="glass-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm">
              <FileText className="h-4 w-4" />
              Cargar documentos
            </Link>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1D3A45]">Panel de Control</h1>
          <p className="text-[#7A7A7A] mt-1">{company.company_name} · NIT {company.nit}</p>
        </div>
        <div className="glass-sm px-4 py-2 text-xs text-[#7A7A7A]">
          Última evaluación: {new Date(assessment.created_at).toLocaleDateString('es-CO')}
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Score */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="glass-score h-full p-6 flex flex-col items-center">
            <p className="text-sm font-medium text-[#7A7A7A] mb-4 self-start">Score de Riesgo</p>
            <ScoreGauge score={score ?? 0} />
            <div className="mt-6 w-full space-y-3">
              <div className="flex justify-center">
                <span className="px-4 py-1.5 text-sm font-semibold rounded-full"
                  style={{ backgroundColor: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
                  {badge.label}
                </span>
              </div>
              {counts.alto > 0 && (
                <div className="glass-gold p-3 flex items-center gap-2 justify-center">
                  <Sparkles className="h-4 w-4 text-[#EABC1F]" />
                  <span className="text-sm font-medium text-[#1D3A45]">
                    {counts.alto} hallazgo{counts.alto > 1 ? 's' : ''} crítico{counts.alto > 1 ? 's' : ''} por resolver
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats + Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-5">
          <div className="grid gap-4 grid-cols-3">
            {[
              { count: counts.alto, label: 'Críticos', color: '#e05252', bg: 'rgba(224,82,82,0.08)', border: 'rgba(224,82,82,0.15)', Icon: AlertCircle },
              { count: counts.medio, label: 'Medios', color: '#e2a92b', bg: 'rgba(226,169,43,0.08)', border: 'rgba(226,169,43,0.15)', Icon: AlertTriangle },
              { count: counts.documentos, label: 'Documentos', color: '#EABC1F', bg: 'rgba(234,188,31,0.08)', border: 'rgba(234,188,31,0.15)', Icon: FileText },
            ].map(({ count, label, color, bg, border, Icon }) => (
              <div key={label} className="glass-stat"
                style={{ borderColor: border, background: bg }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${bg}` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                    <p className="text-xs text-[#7A7A7A]">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {riskAreas.length > 0 && (
            <div className="glass p-5">
              <p className="text-sm font-medium text-[#7A7A7A] mb-4">Score por Área</p>
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskAreas} layout="vertical" margin={{ top: 0, right: 20, left: 55, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(37,75,89,0.06)" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} tickCount={6} stroke="rgba(37,75,89,0.3)" fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke="rgba(37,75,89,0.3)" fontSize={11} width={50} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toFixed(1), 'Score']} />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} animationDuration={1200}>
                      {riskAreas.map((entry, i) => (
                        <Cell key={i} fill={
                          (entry.score ?? 0) >= 4 ? '#2ecc71' :
                          (entry.score ?? 0) >= 3 ? '#e2a92b' :
                          (entry.score ?? 0) >= 2 ? '#d4871a' : '#e05252'
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* History Chart */}
      {chartHistory.length > 1 && (
        <motion.div variants={itemVariants}>
          <div className="glass p-5">
            <p className="text-sm font-medium text-[#7A7A7A] mb-4">Historial de Score</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EABC1F" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EABC1F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(37,75,89,0.06)" />
                  <XAxis dataKey="month" stroke="rgba(37,75,89,0.3)" fontSize={11} />
                  <YAxis domain={[0, 5]} tickCount={6} stroke="rgba(37,75,89,0.3)" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={3} stroke="rgba(226,169,43,0.4)" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="score" stroke="#EABC1F" strokeWidth={2.5} fill="url(#scoreGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Critical Findings */}
      {criticalFindings.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#1D3A45]">Hallazgos Críticos</h2>
            <Link href="/findings" className="text-sm text-[#EABC1F] hover:text-[#C9A018] transition-colors font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {criticalFindings.map((finding, i) => (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="glass-finding p-4"
                style={{ borderLeft: '3px solid #e05252' }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(224,82,82,0.08)', color: '#e05252', border: '1px solid rgba(224,82,82,0.15)' }}>
                    {AREA_LABELS[finding.area_category] ?? finding.area_category}
                  </span>
                  {finding.score_impact && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(46,204,113,0.08)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.15)' }}>
                      +{finding.score_impact.toFixed(1)} pts
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-[#1D3A45] line-clamp-2">{finding.title}</h3>
                {finding.recommendation && (
                  <div className="mt-3 flex items-start gap-2">
                    <Clock className="h-3 w-3 text-[#7A7A7A] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#7A7A7A] line-clamp-2">{finding.recommendation}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
