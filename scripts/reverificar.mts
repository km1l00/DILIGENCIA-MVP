// Recalcula campos, hallazgos y score de todos los manifiestos con el motor de reglas actual (actualiza, no borra).
import fs from 'node:fs'
import { Client } from 'pg'
import { verificarManifiesto } from '../lib/lc/manifiesto.ts'
const env: Record<string, string> = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()
const { rows } = await c.query('select id, numero, datos from lc_manifiestos')
for (const r of rows) {
  const v = verificarManifiesto(r.datos)
  await c.query('update lc_manifiestos set campos=$2, hallazgos=$3, score=$4 where id=$1', [r.id, JSON.stringify(v.campos), JSON.stringify(v.hallazgos), v.score])
  console.log(r.numero, v.score, v.hallazgos.length)
}
await c.end()
