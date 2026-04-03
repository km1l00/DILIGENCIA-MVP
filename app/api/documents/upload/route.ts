import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getModel } from '@/lib/ai/model-router'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'Usuario sin tenant' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  // Validar tipo
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
  }

  // Validar tamaño (50MB)
  if (file.size > 52428800) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx 50MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const storagePath = `${userData.tenant_id}/${Date.now()}_${file.name}`

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Detectar tipo de archivo
  const fileTypeMap: Record<string, string> = {
    pdf: 'pdf', xlsx: 'xlsx', xls: 'xlsx',
    docx: 'docx', doc: 'docx', csv: 'csv'
  }
  const fileType = fileTypeMap[ext ?? ''] ?? 'pdf'

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Clasificar el documento automáticamente
  let detectedArea: string | null = null
  try {
    const classifyConfig = getModel('classification')
    const classifyResponse = await anthropic.messages.create({
      model: classifyConfig.model,
      max_tokens: classifyConfig.max_tokens,
      messages: [{
        role: 'user',
        content: `Clasifica este nombre de archivo en UNA de estas áreas de due diligence:
legal, laboral, corporativo, tributario, licencias, contratos, financiero

Nombre del archivo: ${file.name}

Responde SOLO con el nombre del área en minúsculas, sin explicación.`
      }]
    })

    const rawArea = classifyResponse.content[0].type === 'text' 
      ? classifyResponse.content[0].text.trim().toLowerCase() 
      : null
      
    const validAreas = ['legal','laboral','corporativo','tributario','licencias','contratos','financiero']
    detectedArea = validAreas.includes(rawArea ?? '') ? rawArea : null

    // Registrar tokens usados
    const tokensUsed = classifyResponse.usage.input_tokens + classifyResponse.usage.output_tokens
    await supabase.rpc('increment_tokens', {
      p_tenant_id: userData.tenant_id,
      p_tokens: tokensUsed,
    })
  } catch {
    // Si falla la clasificación, el área queda null — no es crítico
  }

  // Registrar en base de datos
  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .insert({
      tenant_id: userData.tenant_id,
      filename: file.name,
      file_type: fileType,
      storage_path: storagePath,
      size_bytes: file.size,
      processing_status: 'pending',
      area_category: detectedArea,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Log de auditoría
  await supabase.from('audit_log').insert({
    tenant_id: userData.tenant_id,
    user_id: user.id,
    action: 'document_upload',
    resource_type: 'document',
    resource_id: doc.id,
  })

  return NextResponse.json({ success: true, document: doc })
}
