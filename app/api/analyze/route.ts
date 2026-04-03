import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getModel } from '@/lib/ai/model-router'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const AREA_WEIGHTS = {
  legal:       { weight: 0.25, label: 'Legal y litigios' },
  laboral:     { weight: 0.20, label: 'Laboral' },
  contratos:   { weight: 0.20, label: 'Contratos' },
  licencias:   { weight: 0.15, label: 'Licencias y permisos' },
  corporativo: { weight: 0.12, label: 'Corporativo' },
  tributario:  { weight: 0.08, label: 'Tributario' },
}

function anonymize(text: string, company: string, nit: string): string {
  return text
    .replace(new RegExp(company, 'gi'), '[EMPRESA-001]')
    .replace(new RegExp(nit.replace('.', '\\.').replace('-', '\\-'), 'g'), '[NIT-001]')
    .replace(/\b\d{8,10}\b/g, '[ID-ANONIMO]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL-ANONIMO]')
    .replace(/\b3\d{9}\b/g, '[TEL-ANONIMO]')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, tenants(company_name, nit)')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  const tenant = userData.tenants as unknown as { company_name: string; nit: string }
  const tenantId = userData.tenant_id

  // Obtener documentos pendientes
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('processing_status', 'pending')
    .is('deleted_at', null)

  if (!documents || documents.length === 0) {
    return NextResponse.json({ error: 'No hay documentos pendientes de análisis' }, { status: 400 })
  }

  // Crear assessment
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .insert({
      tenant_id: tenantId,
      status: 'processing',
      triggered_by: 'manual',
    })
    .select()
    .single()

  if (assessmentError || !assessment) {
    return NextResponse.json({ error: 'Error creando evaluación' }, { status: 500 })
  }

  // Marcar documentos como procesando
  await supabase
    .from('documents')
    .update({ processing_status: 'processing', assessment_id: assessment.id })
    .eq('tenant_id', tenantId)
    .eq('processing_status', 'pending')

  try {
    // Leer contenido de documentos desde Storage
    const docContents: string[] = []

    for (const doc of documents) {
      const { data: fileData } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (fileData) {
        const text = await fileData.text()
        const anonText = anonymize(text, tenant.company_name, tenant.nit)
        docContents.push(`[DOCUMENTO: ${doc.filename} | ÁREA: ${doc.area_category ?? 'sin clasificar'}]\n${anonText.slice(0, 3000)}`)
      }
    }

    const docsText = docContents.join('\n\n---\n\n')

    // Llamar a Claude API
    const modelConfig = getModel('analysis')
    const response = await anthropic.messages.create({
      model: modelConfig.model,
      max_tokens: modelConfig.max_tokens,
      messages: [
        {
          role: 'user',
          content: `Eres un experto en due diligence empresarial colombiano. Analiza los siguientes documentos y genera un reporte de riesgo estructurado.

DOCUMENTOS A ANALIZAR:
${docsText}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "scores": {
    "legal": <número 0-5>,
    "laboral": <número 0-5>,
    "contratos": <número 0-5>,
    "licencias": <número 0-5>,
    "corporativo": <número 0-5>,
    "tributario": <número 0-5>
  },
  "findings": [
    {
      "area_category": "<legal|laboral|contratos|licencias|corporativo|tributario>",
      "risk_level": "<alto|medio|bajo>",
      "title": "<título corto del hallazgo>",
      "description": "<descripción detallada del hallazgo>",
      "recommendation": "<acción concreta recomendada>",
      "score_impact": <número 0.1-1.0>
    }
  ]
}

Criterios de calificación por área (0-5):
- 0-1.9: Riesgo crítico, problemas graves
- 2-2.9: Riesgo alto, requiere acción inmediata
- 3-3.9: Riesgo medio, requiere atención
- 4-4.9: Riesgo bajo, situación controlada
- 5: Sin riesgos identificados

Genera entre 2 y 8 hallazgos basados en los documentos. Si un área no tiene documentos, asigna score 3.0 (neutral).
No incluyas datos personales reales en tu respuesta.`
        }
      ]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude no retornó JSON válido')

    const result = JSON.parse(jsonMatch[0])

    // Calcular score global ponderado
    const scores = result.scores
    const scoreGlobal = Object.entries(AREA_WEIGHTS).reduce((acc, [area, { weight }]) => {
      // @ts-ignore
      return acc + (scores[area] ?? 3.0) * weight
    }, 0)

    // Actualizar assessment con scores
    await supabase
      .from('assessments')
      .update({
        status: 'completed',
        score_global: Math.round(scoreGlobal * 100) / 100,
        score_legal: scores.legal,
        score_laboral: scores.laboral,
        score_contratos: scores.contratos,
        score_licencias: scores.licencias,
        score_corporativo: scores.corporativo,
        score_tributario: scores.tributario,
        completed_at: new Date().toISOString(),
      })
      .eq('id', assessment.id)

    // Insertar hallazgos
    if (result.findings?.length > 0) {
      await supabase.from('findings').insert(
        result.findings.map((f: {
          area_category: string
          risk_level: string
          title: string
          description: string
          recommendation: string
          score_impact: number
        }) => ({
          tenant_id: tenantId,
          assessment_id: assessment.id,
          area_category: f.area_category,
          risk_level: f.risk_level,
          title: f.title,
          description: f.description,
          recommendation: f.recommendation,
          score_impact: f.score_impact,
          status: 'open',
        }))
      )
    }

    // Marcar documentos como analizados
    await supabase
      .from('documents')
      .update({ processing_status: 'done' })
      .eq('assessment_id', assessment.id)

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

    await supabase.rpc('increment_tokens', {
      p_tenant_id: tenantId,
      p_tokens: tokensUsed,
    })

    // Log de auditoría
    await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      user_id: user.id,
      action: 'analysis_completed',
      resource_type: 'assessment',
      resource_id: assessment.id,
      metadata: { tokens_used: tokensUsed },
    })

    return NextResponse.json({
      success: true,
      assessment_id: assessment.id,
      score_global: Math.round(scoreGlobal * 100) / 100,
      findings_count: result.findings?.length ?? 0,
    })

  } catch (error) {
    // Revertir estado en caso de error
    await supabase
      .from('assessments')
      .update({ status: 'error' })
      .eq('id', assessment.id)

    await supabase
      .from('documents')
      .update({ processing_status: 'error' })
      .eq('assessment_id', assessment.id)

    console.error('Error en análisis:', error)
    return NextResponse.json({ error: 'Error durante el análisis de IA' }, { status: 500 })
  }
}
