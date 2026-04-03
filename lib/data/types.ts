export type Tenant = {
  id: string
  company_name: string
  nit: string
  email: string
  subscription_status: string
  subscription_expires_at: string | null
}

export type UserWithTenant = {
  id: string
  tenant_id: string
  email: string
  role: string
  tenants: Tenant
}

export type Assessment = {
  id: string
  tenant_id: string
  status: string
  score_global: number | null
  score_legal: number | null
  score_laboral: number | null
  score_corporativo: number | null
  score_tributario: number | null
  score_licencias: number | null
  score_contratos: number | null
  created_at: string
  completed_at: string | null
}

export type Finding = {
  id: string
  tenant_id: string
  assessment_id: string
  area_category: string
  risk_level: 'alto' | 'medio' | 'bajo'
  title: string
  description: string | null
  recommendation: string | null
  score_impact: number | null
  status: 'open' | 'in_progress' | 'resolved'
  resolved_at: string | null
  created_at: string
}

export type Document = {
  id: string
  tenant_id: string
  filename: string
  file_type: string
  storage_path: string
  size_bytes: number | null
  processing_status: 'pending' | 'processing' | 'done' | 'error'
  area_category: string | null
  uploaded_at: string
}
