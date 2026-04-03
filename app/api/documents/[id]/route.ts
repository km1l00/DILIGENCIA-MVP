import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  // Obtener el documento para saber el path en Storage
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, tenant_id')
    .eq('id', id)
    .eq('tenant_id', userData.tenant_id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  // Eliminar de Storage
  await supabase.storage.from('documents').remove([doc.storage_path])

  // Marcar como eliminado en BD (soft delete)
  await supabase
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', userData.tenant_id)

  // Audit log
  await supabase.from('audit_log').insert({
    tenant_id: userData.tenant_id,
    user_id: user.id,
    action: 'document_deleted',
    resource_type: 'document',
    resource_id: id,
  })

  return NextResponse.json({ success: true })
}
