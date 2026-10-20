// Perfil de la empresa cliente (el generador de carga). Se crea en la bienvenida: el cliente escribe su NIT,
// los datos se proponen desde el RUES (vía Croma) y el cliente confirma o corrige antes de guardar.
import { db, must, ESPACIO, logEvento } from './db'
import { croma, nitBase, CromaError } from './croma'

export type Empresa = {
  nit: string; dv: string | null; razon_social: string; camara: string | null; actividad: string | null; ciiu: string | null
  municipio: string | null; estado: string | null; representantes: { nombre: string; rol: string }[]; fuente: 'rues' | 'manual'
}

export async function obtenerEmpresa(): Promise<(Empresa & { updated_at: string }) | null> {
  const { data } = await db().from('lc_empresa').select('*').eq('espacio', ESPACIO).maybeSingle()
  return (data as any) || null
}

// Propuesta desde el RUES (no guarda nada)
export async function empresaDesdeRues(nitIn: string): Promise<Empresa & { encontrada: boolean }> {
  const nit = nitBase(nitIn)
  if (nit.length < 6 || nit.length > 15) throw new CromaError('NIT inválido', 400)
  const { data } = await croma<any>('/co/rues/entity-by-nit/v1', { document_number: nit }, { ttlHoras: 24 * 7 })
  const e = data?.entity
  if (!data?.found || !e) return { encontrada: false, nit, dv: null, razon_social: '', camara: null, actividad: null, ciiu: null, municipio: null, estado: null, representantes: [], fuente: 'manual' }
  return {
    encontrada: true, nit, dv: e.verification_digit || null, razon_social: e.name || '', camara: e.chamber_name || null,
    actividad: e.primary_activity?.description || null, ciiu: e.primary_activity?.code || null, municipio: e.commercial_municipality || null,
    estado: e.registration_status || null, fuente: 'rues',
    representantes: (data.related_parties || []).filter((p: any) => /REPRESENTANTE|GERENTE/i.test(p.role || '')).slice(0, 4).map((p: any) => ({ nombre: p.name, rol: p.role })),
  }
}

export async function guardarEmpresa(e: Partial<Empresa>) {
  const nit = nitBase(String(e.nit || ''))
  const razon = String(e.razon_social || '').trim()
  if (nit.length < 6 || nit.length > 15) throw new CromaError('NIT inválido', 400)
  if (razon.length < 3) throw new CromaError('Indique la razón social', 400)
  const fila = {
    espacio: ESPACIO, nit, dv: e.dv ? String(e.dv).slice(0, 2) : null, razon_social: razon.slice(0, 200),
    camara: e.camara ?? null, actividad: e.actividad ?? null, ciiu: e.ciiu ?? null, municipio: e.municipio ?? null, estado: e.estado ?? null,
    representantes: Array.isArray(e.representantes) ? e.representantes.slice(0, 4) : [], fuente: e.fuente === 'rues' ? 'rues' : 'manual',
    updated_at: new Date().toISOString(),
  }
  const row = must(await db().from('lc_empresa').upsert(fila, { onConflict: 'espacio' }).select('*').single())
  await logEvento('empresa', `Perfil de la empresa: ${razon}`, `NIT ${nit}${fila.dv ? '-' + fila.dv : ''} · ${fila.fuente === 'rues' ? 'datos del RUES' : 'datos ingresados manualmente'}`)
  return row
}
