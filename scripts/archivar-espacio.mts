// Archiva (no borra) los datos de un espacio moviéndolos a otro, para dejar el espacio del cliente vacío.
// Uso: npx tsx scripts/archivar-espacio.mts <origen> <destino>     p. ej.  principal prueba-qa
import fs from 'node:fs'
import { Client } from 'pg'

const [origen, destino] = process.argv.slice(2)
if (!origen || !destino || origen === destino) { console.error('Uso: archivar-espacio.mts <origen> <destino>'); process.exit(1) }
const env: Record<string, string> = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const c = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()
await c.query('begin')
try {
  const ocupado = await c.query('select 1 from lc_empresa where espacio = $1', [destino])
  if (ocupado.rowCount) throw new Error(`El espacio destino "${destino}" ya tiene empresa; use otro nombre`)
  for (const t of ['lc_empresa', 'lc_contratos', 'lc_manifiestos', 'lc_chat', 'lc_boletines', 'lc_eventos', 'lc_contrapartes', 'lc_procesos']) {
    const r = await c.query(`update ${t} set espacio = $2 where espacio = $1`, [origen, destino])
    console.log(t, r.rowCount)
  }
  await c.query('commit')
} catch (e) { await c.query('rollback'); throw e }
await c.end()
