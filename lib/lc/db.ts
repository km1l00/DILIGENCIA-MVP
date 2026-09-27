// Cliente de Supabase con service_role: SOLO para el servidor (route handlers).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _db: SupabaseClient | null = null

export function db(): SupabaseClient {
  if (!_db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase no configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    _db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return _db
}

// Lanza si la consulta falló; devuelve los datos tipados.
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function logEvento(tipo: string, titulo: string, detalle?: string, ref_id?: string) {
  await db().from('lc_eventos').insert({ tipo, titulo, detalle: detalle ?? null, ref_id: ref_id ?? null })
}
