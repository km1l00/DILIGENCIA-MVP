// Seed de normas reales (con enlace oficial) desde db/seed/normas.json. Idempotente: nunca borra, solo inserta las que faltan.
// No crea contratos, manifiestos ni otros datos de prueba: el cliente arranca vacío.
// Uso: npx tsx scripts/seed.mts   (luego: npx tsx --env-file=.env.local scripts/seed-marco.mts)
import fs from 'node:fs'
import { Client } from 'pg'

const env: Record<string, string> = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const normas = JSON.parse(fs.readFileSync('db/seed/normas.json', 'utf8')) as any[]

const c = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()
let n = 0
for (const x of normas) {
  const r = await c.query(
    `insert into lc_normas (codigo, entidad, tipo, estado, fecha, vigencia, cat, tema, titulo, resumen, puntos, impacto, url, origen)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'seed') on conflict (codigo) do nothing`,
    [x.id, x.entidad, x.tipo, x.estado, x.fecha, x.vigencia, x.cat, x.tema, x.titulo, x.resumen, JSON.stringify(x.puntos || []), x.impacto, x.url])
  n += r.rowCount || 0
}
console.log('normas insertadas:', n, 'de', normas.length)
await c.end()
