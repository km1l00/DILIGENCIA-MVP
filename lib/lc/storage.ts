// Archivos originales (contratos y manifiestos) en Supabase Storage, bucket privado.
import { db } from './db'

const BUCKET = 'lc-docs'
let listo = false

async function asegurarBucket() {
  if (listo) return
  const { data } = await db().storage.getBucket(BUCKET)
  if (!data) await db().storage.createBucket(BUCKET, { public: false })
  listo = true
}

export async function guardarArchivo(carpeta: string, nombre: string, bytes: Uint8Array, tipo: string): Promise<string | null> {
  try {
    await asegurarBucket()
    const path = `${carpeta}/${Date.now()}-${nombre.replace(/[^\w.\-]+/g, '_')}`
    const { error } = await db().storage.from(BUCKET).upload(path, bytes, { contentType: tipo, upsert: false })
    if (error) throw error
    return path
  } catch (e) {
    console.error('[storage]', (e as Error).message)
    return null // el análisis no depende de guardar el original
  }
}

export async function leerArchivo(path: string): Promise<Blob | null> {
  const { data } = await db().storage.from(BUCKET).download(path)
  return data
}
