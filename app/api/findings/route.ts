import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  const { data: findings } = await supabase
    .from('findings')
    .select('*')
    .eq('tenant_id', userData.tenant_id)
    .order('score_impact', { ascending: false })

  return NextResponse.json({ findings: findings ?? [] })
}
