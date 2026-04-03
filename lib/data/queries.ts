import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: dbUser, error } = await supabase
    .from('users')
    .select('*, tenants(*)')
    .eq('id', authUser.id)
    .single()

  return { authUser, dbUser, error }
}

export async function getLatestAssessment(tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessments')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

export async function getAssessmentHistory(tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessments')
    .select('score_global, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .order('created_at', { ascending: true })
    .limit(12)

  return data ?? []
}

export async function getCriticalFindings(tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('findings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('risk_level', 'alto')
    .eq('status', 'open')
    .order('score_impact', { ascending: false })
    .limit(3)

  return data ?? []
}

export async function getFindingsCounts(tenantId: string) {
  const supabase = await createClient()

  const [alto, medio, docs] = await Promise.all([
    supabase
      .from('findings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('risk_level', 'alto')
      .eq('status', 'open'),
    supabase
      .from('findings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('risk_level', 'medio')
      .eq('status', 'open'),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
  ])

  return {
    alto: alto.count ?? 0,
    medio: medio.count ?? 0,
    documentos: docs.count ?? 0,
  }
}

export async function getAllFindings(tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('findings')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('score_impact', { ascending: false })

  return data ?? []
}

export async function getDocuments(tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })

  return data ?? []
}
