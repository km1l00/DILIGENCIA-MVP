"use client"

import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Upload, FileText, Download, Shield, Lock,
  CheckCircle, Loader2, Clock, X, Anchor, Sparkles, Trash2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import type { Document } from "@/lib/data/types"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const AREA_LABELS: Record<string, string> = {
  legal: 'Legal', laboral: 'Laboral', corporativo: 'Corporativo',
  tributario: 'Tributario', licencias: 'Licencias',
  contratos: 'Contratos', financiero: 'Financiero',
}

const AREA_COLORS: Record<string, string> = {
  legal: 'border-port-red/50 text-port-red',
  laboral: 'border-port-red/50 text-port-red',
  licencias: 'border-amber-warning/50 text-amber-warning',
  contratos: 'border-amber-warning/50 text-amber-warning',
  corporativo: 'border-amber-warning/50 text-amber-warning',
  tributario: 'border-starboard-green/50 text-starboard-green',
  financiero: 'border-brass/50 text-brass',
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    const pending = documents.filter(d => d.processing_status === 'pending')
    if (pending.length === 0) {
      toast.error('No hay documentos pendientes de análisis', {
        description: 'Todos los documentos ya fueron analizados o no hay documentos cargados.',
      })
      return
    }

    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error('Error en el análisis', { description: data.error })
      } else {
        toast.success('Análisis completado', {
          description: `Score global: ${data.score_global}/5 · ${data.findings_count} hallazgos identificados`,
        })
        fetchDocuments()
      }
    } catch {
      toast.error('Error de conexión con el servidor')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`¿Eliminar "${filename}"? Esta acción no se puede deshacer.`)) return

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Error al eliminar el documento')
        return
      }
      toast.success(`"${filename}" eliminado correctamente`)
      fetchDocuments()
    } catch {
      toast.error('Error de conexión')
    }
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch {
      toast.error('Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFileUpload(files)
  }, [])

  const handleFileUpload = async (files: File[]) => {
    const names = files.map(f => f.name)
    setUploadingFiles(prev => [...prev, ...names])

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()

        if (!res.ok) {
          toast.error(`Error al subir ${file.name}`, { description: data.error })
        } else {
          toast.success(`${file.name} subido correctamente`, {
            description: 'En cola para análisis de IA.',
          })
        }
      } catch {
        toast.error(`Error de red al subir ${file.name}`)
      } finally {
        setUploadingFiles(prev => prev.filter(n => n !== file.name))
      }
    }

    fetchDocuments()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFileUpload(Array.from(files))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <Badge className="bg-starboard-green/20 text-starboard-green border-0">
            <CheckCircle className="mr-1 h-3 w-3" />Analizado
          </Badge>
        )
      case 'processing':
        return (
          <Badge className="bg-brass/20 text-brass border-0">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />Procesando...
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-port-red/20 text-port-red border-0">
            Error
          </Badge>
        )
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-0">
            <Clock className="mr-1 h-3 w-3" />Pendiente
          </Badge>
        )
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground">Cargue documentos para análisis automático de riesgo</p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={analyzing || documents.filter(d => d.processing_status === 'pending').length === 0}
          className="flex-shrink-0 bg-[#EABC1F] hover:bg-[#F0CB45] text-[#1D3A45] font-semibold"
        >
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analizar documentos
            </>
          )}
        </Button>
      </motion.div>

      {/* Upload Zone */}
      <motion.div variants={itemVariants}>
        <div
          className={`glass-upload p-8 ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center">
              <motion.div
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brass/20 border border-brass/30"
              >
                <Upload className="h-8 w-8 text-brass" />
              </motion.div>
              <h3 className="text-lg font-semibold text-foreground">
                {isDragging ? 'Suelte los archivos aquí' : 'Arrastre documentos aquí'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">o haga clic para seleccionar archivos</p>
              <p className="mt-2 text-xs text-muted-foreground/60">PDF, XLSX, DOCX hasta 50MB</p>
              <Button variant="outline" className="mt-4 relative border-brass/50 text-brass hover:bg-brass/10">
                <Upload className="mr-2 h-4 w-4" />
                Seleccionar Archivos
                <input
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.csv"
                  onChange={handleFileInput}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </Button>
            </div>
        </div>
      </motion.div>

      {/* Uploading */}
      {uploadingFiles.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {uploadingFiles.map((name, i) => (
            <div key={i} className="glass-sm p-3">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 text-brass animate-spin" />
                    <span className="text-sm text-foreground">{name}</span>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setUploadingFiles(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Documents Table */}
      <motion.div variants={itemVariants}>
        <div className="glass-table">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 text-brass animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brass/10 border border-brass/20">
                <Anchor className="h-7 w-7 text-brass/50" />
              </div>
              <p className="text-sm font-medium text-foreground">Sin documentos todavía</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Sube tu primer documento para comenzar el análisis de riesgo.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Tamaño</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc, index) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="border-border/50 hover:bg-muted/10"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-medium">
                          <FileText className="h-4 w-4 text-brass" />
                        </div>
                        <p className="text-sm font-medium text-foreground">{doc.filename}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.area_category ? (
                        <Badge variant="outline" className={AREA_COLORS[doc.area_category] ?? 'border-muted-foreground/50'}>
                          {AREA_LABELS[doc.area_category] ?? doc.area_category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString('es-CO', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.processing_status)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatBytes(doc.size_bytes)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </motion.div>

      {/* Security Banner */}
      <motion.div variants={itemVariants}>
        <div className="glass-security p-4">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-starboard-green" />
                <span>ZDR</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-brass" />
                <span>TLS 1.3</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-brass" />
                <span>AES-256</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <span>Datos anonimizados antes del análisis</span>
            </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
