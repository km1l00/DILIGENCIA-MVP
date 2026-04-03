import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getModel } from '@/lib/ai/model-router'

export async function POST(request: NextRequest) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, tenants(company_name, nit)')
      .eq('id', user.id)
      .single()

    if (!userData) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

    const tenantId = userData.tenant_id
    const tenant = userData.tenants as unknown as { company_name: string; nit: string }

    const { messages } = await request.json()

    // Verificar límite de tokens
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('tokens_used, tokens_limit, tokens_reset_at')
      .eq('id', tenantId)
      .single()

    if (tenantData && tenantData.tokens_used >= tenantData.tokens_limit) {
      return NextResponse.json({
        error: 'Has alcanzado el límite mensual de consultas. Contacta al administrador para ampliar tu plan.'
      }, { status: 429 })
    }

    // Cargar contexto real de la empresa
    const [assessmentRes, findingsRes, docsRes] = await Promise.all([
      supabase
        .from('assessments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('findings')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('score_impact', { ascending: false }),
      supabase
        .from('documents')
        .select('filename, area_category, processing_status')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
    ])

    const assessment = assessmentRes.data
    const findings = findingsRes.data ?? []
    const documents = docsRes.data ?? []

    const openFindings = findings.filter(f => f.status !== 'resolved')
    const resolvedFindings = findings.filter(f => f.status === 'resolved')

    // Construir contexto anonimizado para Claude
    const context = `
Eres un asistente experto en due diligence empresarial colombiano. 
Estás analizando el perfil de riesgo de una empresa cliente identificada como [EMPRESA-001].

CALIFICACIÓN ACTUAL:
${assessment ? `
- Score global: ${assessment.score_global}/5
- Legal: ${assessment.score_legal}/5
- Laboral: ${assessment.score_laboral}/5
- Contratos: ${assessment.score_contratos}/5
- Licencias: ${assessment.score_licencias}/5
- Corporativo: ${assessment.score_corporativo}/5
- Tributario: ${assessment.score_tributario}/5
- Fecha de evaluación: ${new Date(assessment.created_at).toLocaleDateString('es-CO')}
` : 'Sin evaluación completada todavía.'}

HALLAZGOS ABIERTOS (${openFindings.length}):
${openFindings.map(f => `- [${f.risk_level.toUpperCase()}] ${f.title} | Área: ${f.area_category} | Impacto: +${f.score_impact} pts si se resuelve`).join('\n') || 'Ninguno'}

HALLAZGOS RESUELTOS (${resolvedFindings.length}):
${resolvedFindings.map(f => `- ${f.title} | Área: ${f.area_category}`).join('\n') || 'Ninguno'}

DOCUMENTOS CARGADOS (${documents.length}):
${documents.map(d => `- ${d.filename} | Área: ${d.area_category ?? 'sin clasificar'} | Estado: ${d.processing_status}`).join('\n') || 'Ninguno'}

INSTRUCCIONES:
- Responde siempre en español
- Usa los datos reales del contexto para dar respuestas específicas
- No menciones datos personales ni el nombre real de la empresa
- Sé concreto con números, áreas y recomendaciones
- Si no hay datos suficientes, indícalo claramente
- Formato markdown permitido para mejor legibilidad
`.trim()

    const modelConfig = getModel('chat')
    const response = await anthropic.messages.create({
      model: modelConfig.model,
      max_tokens: modelConfig.max_tokens,
      system: context,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    // Tokens usados en esta llamada
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

    // Actualizar contador de tokens del tenant
    await supabase.rpc('increment_tokens', {
      p_tenant_id: tenantId,
      p_tokens: tokensUsed,
    })

    // Log de auditoría con tokens
    await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      user_id: user.id,
      action: 'chat_message',
      resource_type: 'chat',
      metadata: { tokens_used: tokensUsed },
    })

    return NextResponse.json({ reply, tokens_used: tokensUsed })
  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 })
  }
}
