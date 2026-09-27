import type { NextRequest } from 'next/server'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db, must, logEvento } from '@/lib/lc/db'
import { jsonCall, MODEL_FAST } from '@/lib/lc/ai'
import { ManifiestoDatosSchema, verificarManifiesto } from '@/lib/lc/manifiesto'
import { guardarArchivo } from '@/lib/lc/storage'
import { CupoAgotado } from '@/lib/lc/cupo'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_BYTES = 4 * 1024 * 1024

// Historial de manifiestos revisados
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const rows = must(await db().from('lc_manifiestos').select('id,numero,archivo_nombre,score,activo,created_at,hallazgos').order('created_at', { ascending: false }).limit(50)) as any[]
    return Response.json({ manifiestos: rows.map(({ hallazgos, ...r }) => ({ ...r, n_hallazgos: (hallazgos || []).length })) })
  } catch (e) { return fail(e) }
}

const SYSTEM = `Eres un asistente de extracción de datos para Franco & Abogados Asociados. Recibes un manifiesto electrónico de carga colombiano (RNDC) en PDF.
Extrae los datos tal como aparecen en el documento. Reglas:
- Si un dato no aparece o la casilla está vacía, devuelve null. Nunca completes, supongas ni inventes datos.
- Fechas en formato DD/MM/AAAA; fechas con hora como "DD/MM/AAAA HH:MM" (24 h).
- Montos como números en pesos colombianos, sin puntos de miles ni símbolos (p. ej. 8200000). Un valor escrito como $0 es 0, no null.
- valor_letras: copia literal del valor en letras.
- Remitente, destinatario y poseedor: separa nombre, identificación (NIT o C.C. con su número) y dirección si aparecen.
- Tiempos de cargue y descargue: cita, llegada y salida de cada tramo si aparecen.`

// Carga un manifiesto (PDF), extrae con Claude, verifica en código y persiste.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return Response.json({ error: 'Adjunte el manifiesto en PDF' }, { status: 400 })
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return Response.json({ error: 'El manifiesto debe ser un PDF' }, { status: 400 })
    if (file.size > MAX_BYTES) return Response.json({ error: 'El PDF supera 4 MB' }, { status: 400 })
    const bytes = new Uint8Array(await file.arrayBuffer())

    const { data: datos, model } = await jsonCall({
      tag: 'manifiesto-extraccion',
      schema: ManifiestoDatosSchema,
      system: SYSTEM,
      model: MODEL_FAST,
      maxTokens: 4000,
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(bytes).toString('base64') } },
        { type: 'text', text: 'Extrae los datos de este manifiesto de carga.' },
      ],
    })
    const v = verificarManifiesto(datos)
    const path = await guardarArchivo('manifiestos', file.name, bytes, 'application/pdf')
    const d = db()
    must(await d.from('lc_manifiestos').update({ activo: false }).eq('activo', true))
    const row = must(await d.from('lc_manifiestos').insert({
      numero: datos.numero, archivo_nombre: file.name, archivo_path: path, datos, campos: v.campos, hallazgos: v.hallazgos, score: v.score, modelo: model, activo: true,
    }).select('*').single()) as any
    await logEvento('manifiesto', `Manifiesto ${datos.numero || file.name} — ${v.hallazgos.length} hallazgos`,
      v.hallazgos.slice(0, 2).map((h) => h.t).join(' · ') || 'Sin hallazgos', row.id)
    return Response.json({ manifiesto: row, regimen: v.regimen })
  } catch (e) {
    return fail(e, e instanceof CupoAgotado ? 429 : 500)
  }
}
