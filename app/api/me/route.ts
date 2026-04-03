import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('users')
    .select('tenant_id, tenants(company_name, nit, subscription_status)')
    .eq('id', user.id)
    .single()

  if (!data) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  // Score del último assessment
  const { data: assessment } = await supabase
    .from('assessments')
    .select('score_global')
    .eq('tenant_id', data.tenant_id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const tenant = data.tenants as {
    company_name: string
    nit: string
    subscription_status: string
  }

  return NextResponse.json({
    company_name: tenant.company_name,
    nit: tenant.nit,
    subscription_status: tenant.subscription_status,
    score_global: assessment?.score_global ?? null,
  })
}
