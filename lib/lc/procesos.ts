// Monitoreo de procesos judiciales por radicado (Rama Judicial vía Croma).
// Revisión diaria: un lote con la fecha de la última actuación de cada proceso; solo si cambió se baja el detalle
// (las actuaciones), y cada actuación nueva queda como evento en la actividad reciente.
import { db, must, logEvento, ESPACIO } from './db'
import { croma, soloDigitos, CromaError } from './croma'

const resumenCaso = (c: any) => c ? { juzgado: c.court, departamento: c.department, inicio: c.start_date, ultima_actuacion: c.last_action_date, partes: c.parties_text, privado: c.is_private } : null
const resumenAcciones = (a: any[]) => (a || []).slice(0, 40).map((x) => ({ id: x.id, fecha: x.action_date, tipo: x.action_type, nota: x.note, documentos: x.has_documents }))
const soloFecha = (s?: string | null) => (s ? String(s).slice(0, 10) : null)

async function detalle(radicado: string, ttlHoras: number) {
  const { data } = await croma<any>('/co/rama-judicial/cases-by-radicado/v1', { registration_number: radicado }, { ttlHoras })
  return data
}

export async function listarProcesos() {
  return must(await db().from('lc_procesos').select('*').eq('espacio', ESPACIO).eq('activo', true).order('created_at', { ascending: false })) as any[]
}

export async function agregarProceso(radicadoIn: string, alias?: string | null) {
  const radicado = soloDigitos(radicadoIn)
  if (radicado.length < 20 || radicado.length > 25) throw new CromaError('El radicado debe tener entre 20 y 25 dígitos', 400)
  const ya = (await db().from('lc_procesos').select('*').eq('espacio', ESPACIO).eq('radicado', radicado).maybeSingle()).data as any
  if (ya?.activo) return ya
  const d = await detalle(radicado, 24)
  const fila = {
    radicado, alias: alias?.trim() || ya?.alias || null, activo: true, encontrado: !!d?.found,
    caso: resumenCaso(d?.primary_case), acciones: resumenAcciones(d?.actions), ultima_actuacion: soloFecha(d?.primary_case?.last_action_date),
    nuevas: 0, consultado_at: new Date().toISOString(),
  }
  const row = must(await db().from('lc_procesos').upsert(fila, { onConflict: 'espacio,radicado' }).select('*').single()) as any
  await logEvento('proceso', `Proceso en seguimiento: ${radicado}`, d?.found ? `${d.primary_case?.court || 'Juzgado s. d.'} · última actuación ${soloFecha(d.primary_case?.last_action_date) || 's. f.'}` : 'No se encontró un proceso público con ese radicado', row.id)
  return row
}

export async function desactivarProceso(id: string) {
  return must(await db().from('lc_procesos').update({ activo: false }).eq('espacio', ESPACIO).eq('id', id).select('id,radicado,activo').single())
}

// Revisa todos los procesos activos (lotes de hasta 50). Devuelve cuántos cambiaron y cuántas actuaciones nuevas hay.
export async function revisarProcesos() {
  const procesos = await listarProcesos()
  let revisados = 0, cambiados = 0, nuevasTotal = 0
  const errores: string[] = []
  for (let i = 0; i < procesos.length; i += 50) {
    const lote = procesos.slice(i, i + 50)
    const { data } = await croma<any>('/co/rama-judicial/cases-by-radicado/v1/batch', { items: lote.map((p) => ({ registration_number: p.radicado })) }, { ttlHoras: 12, items: lote.length })
    for (const r of (data?.results || []) as any[]) {
      const p = lote[r.index]
      if (!p) continue
      revisados++
      if (r.status !== 'completed') { errores.push(`${p.radicado}: ${r.error?.message || 'error'}`); continue }
      const ultima = soloFecha(r.data?.primary_case?.last_action_date)
      const cambio = !!ultima && ultima !== (p.ultima_actuacion ? String(p.ultima_actuacion).slice(0, 10) : null)
      if (!cambio) { await db().from('lc_procesos').update({ consultado_at: new Date().toISOString(), encontrado: !!r.data?.found }).eq('espacio', ESPACIO).eq('id', p.id); continue }
      cambiados++
      let acciones = p.acciones as any[]
      let nuevas: any[] = []
      try {
        const d = await detalle(p.radicado, 0)
        const vistas = new Set((p.acciones || []).map((a: any) => a.id))
        acciones = resumenAcciones(d?.actions)
        nuevas = acciones.filter((a) => !vistas.has(a.id))
      } catch (e) { errores.push(`${p.radicado}: ${(e as Error).message}`) }
      nuevasTotal += nuevas.length
      await db().from('lc_procesos').update({ caso: resumenCaso(r.data?.primary_case), acciones, ultima_actuacion: ultima, nuevas: (p.nuevas || 0) + nuevas.length, encontrado: true, consultado_at: new Date().toISOString() }).eq('espacio', ESPACIO).eq('id', p.id)
      for (const a of nuevas.slice(0, 3)) {
        await logEvento('proceso', `Nueva actuación · ${p.alias || p.radicado}`, `${a.fecha ? String(a.fecha).slice(0, 10) : ''} · ${a.tipo || 'Actuación'}${a.nota ? ': ' + String(a.nota).slice(0, 140) : ''}`, p.id)
      }
    }
  }
  return { revisados, cambiados, nuevas: nuevasTotal, errores }
}

export async function marcarVistas(id: string) {
  return must(await db().from('lc_procesos').update({ nuevas: 0 }).eq('espacio', ESPACIO).eq('id', id).select('id,nuevas').single())
}
