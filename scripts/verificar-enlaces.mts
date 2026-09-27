// Verifica que el enlace oficial de cada norma responda HTTP 200 y guarda url_status / url_checked_at (actualiza, no borra).
// Uso: npx tsx --env-file=.env.local scripts/verificar-enlaces.mts
import { db } from '../lib/lc/db.ts'
import { obtener } from '../lib/lc/normativa.ts'
const { data } = await db().from('lc_normas').select('id,codigo,url').order('codigo')
for (const n of data!) {
  const r = await obtener(n.url)
  await db().from('lc_normas').update({ url_status: r.status, url_checked_at: new Date().toISOString() }).eq('id', n.id)
  console.log(r.status, n.codigo, '·', new URL(n.url).hostname)
}
