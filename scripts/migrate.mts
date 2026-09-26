// Corre las migraciones de db/migrations en orden contra Supabase (Postgres).
// Uso: npx tsx scripts/migrate.ts
// Usa DATABASE_URL si existe; si no, prueba el session pooler en las regiones comunes
// y guarda la URL que funcione en .env.local.
import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

const envPath = path.resolve('.env.local')
const env: Record<string, string> = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
  })
)

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const pass = encodeURIComponent(env.SUPABASE_DB_PASSWORD || '')
const REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'sa-east-1', 'ca-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2', 'eu-north-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1']

async function tryConnect(url: string): Promise<Client | null> {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
  try { await c.connect(); return c } catch (e) {
    const msg = (e as Error).message
    if (!/Tenant or user not found|ENOTFOUND|timeout/i.test(msg)) console.log('  ', url.replace(pass, '***'), '→', msg)
    return null
  }
}

async function connect(): Promise<Client> {
  if (env.DATABASE_URL) {
    const c = await tryConnect(env.DATABASE_URL)
    if (c) return c
    throw new Error('DATABASE_URL no conecta')
  }
  for (const pfx of ['aws-0', 'aws-1']) {
    for (const r of REGIONS) {
      const url = `postgresql://postgres.${ref}:${pass}@${pfx}-${r}.pooler.supabase.com:5432/postgres`
      const c = await tryConnect(url)
      if (c) {
        fs.appendFileSync(envPath, `\nDATABASE_URL=${url}\n`)
        console.log('Conectado vía', `${pfx}-${r}`, '(DATABASE_URL guardada en .env.local)')
        return c
      }
    }
  }
  throw new Error('No se encontró el pooler de Supabase para este proyecto')
}

const client = await connect()
const dir = path.resolve('db/migrations')
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  console.log('Aplicando', f)
  await client.query(fs.readFileSync(path.join(dir, f), 'utf8'))
}
const { rows } = await client.query(`select table_name from information_schema.tables where table_schema='public' and table_name like 'lc_%' order by 1`)
console.log('Tablas lc_*:', rows.map((r) => r.table_name).join(', '))
await client.end()
