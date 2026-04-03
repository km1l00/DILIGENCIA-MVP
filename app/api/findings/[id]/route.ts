import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  const body = await request.json()
  const { status } = body

  const { data, error } = await supabase
    .from('findings')
    .update({
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    tenant_id: userData.tenant_id,
    user_id: user.id,
    action: 'finding_status_updated',
    resource_type: 'finding',
    resource_id: params.id,
  })

  return NextResponse.json({ finding: data })
}
