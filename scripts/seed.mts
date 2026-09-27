// Seed inicial desde app.html (fuente de verdad del demo). Idempotente: nunca borra, solo inserta lo que falta.
// Uso: npx tsx scripts/seed.mts
import fs from 'node:fs'
import vm from 'node:vm'
import { Client } from 'pg'
import { parseClausulas, repartirImpacto } from '../lib/lc/contrato.ts'
import { verificarManifiesto, type ManifiestoDatos } from '../lib/lc/manifiesto.ts'

const env: Record<string, string> = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const html = fs.readFileSync('app.html', 'utf8')
const a = html.indexOf('/* ===== DATOS DEMO'), b = html.indexOf('/* ===== Sidebar + router')
const ctx: Record<string, unknown> = {}
vm.runInNewContext(html.slice(a, b).replace(/^const |\nconst /g, '\nvar ').replace(/\nlet /g, '\nvar '), ctx)
const D = ctx as any

const c = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()

// Normas
let n = 0
for (const x of [...D.normas, ...D.normasNuevas]) {
  const r = await c.query(
    `insert into lc_normas (codigo, entidad, tipo, estado, fecha, vigencia, cat, tema, titulo, resumen, puntos, impacto, url, origen)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'seed') on conflict (codigo) do nothing`,
    [x.id, x.entidad, x.tipo, x.estado, x.fecha, x.vigencia, x.cat, x.tema, x.titulo, x.resumen, JSON.stringify(x.puntos || []), x.impacto, x.url])
  n += r.rowCount || 0
}
console.log('normas insertadas:', n)

// Contrato Grupo NF / Ingenio Providencia
const { rows: ct } = await c.query(`select count(*)::int as k from lc_contratos`)
if (ct[0].k === 0) {
  const p = parseClausulas(D.contratoTexto)
  const titulo = D.contratoTexto.split('\n')[0].trim()
  const map: Record<string, [string | null, string]> = {
    C1: ['RESPONSABILIDAD', 'RESPONSABILIDAD POR RETRASO'], C2: [null, 'SEGUROS'], C3: ['CARGUE Y DESCARGUE', 'CARGUE Y DESCARGUE'],
    C4: [null, 'CLÁUSULA PENAL'], C5: [null, 'SOLUCIÓN DE CONTROVERSIAS'],
  }
  const base = D.contratoBaseScore
  const ins = await c.query(
    `insert into lc_contratos (nombre, partes, fecha, archivo_nombre, texto_original, encabezado, clausulas, num_clausulas, score_base, score, resumen, modelo, activo)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,'seed',true) returning id`,
    [D.contrato.nombre, D.contrato.partes, D.contrato.fecha, 'contrato-grupo-nf-ingenio-providencia.docx', D.contratoTexto, p.encabezado.replace(titulo, '').trim(),
     JSON.stringify(p.clausulas), p.clausulas.length, base, 'Contrato de transporte terrestre de carga entre Grupo NF S.A.S. y el Ingenio Providencia S.A. (análisis inicial del demo).'])
  const id = ins.rows[0].id
  for (const f of D.contratoFindings) {
    await c.query(
      `insert into lc_contrato_hallazgos (contrato_id, codigo, risk, area, titulo, descr, base, old_text, new_text, clausula_titulo, reemplaza, impacto)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, f.id, f.risk, f.area, f.titulo, f.desc, JSON.stringify(f.base), f.old, f.new, map[f.id][1], map[f.id][0], D.contratoImpact[f.id]])
  }
  await c.query(`insert into lc_eventos (tipo, titulo, detalle, ref_id) values ('contrato',$1,$2,$3)`,
    ['Contrato Grupo NF / Ingenio Providencia analizado', `${D.contratoFindings.length} hallazgos · riesgo ${base}/5`, id])
  console.log('contrato seed', id, 'cláusulas', p.clausulas.length, 'impactos check', repartirImpacto(base, [5, 5, 3, 2, 1]))
}

// Manifiesto 01278713
const { rows: mt } = await c.query(`select count(*)::int as k from lc_manifiestos`)
if (mt[0].k === 0) {
  const m = D.manifiesto
  const P = (nombre: string | null, identificacion: string | null = null, direccion: string | null = null) => ({ nombre, identificacion, direccion })
  const datos: ManifiestoDatos = {
    numero: m.numero, autorizacion: m.autorizacion, tipo: m.tipo, expedicion: m.expedicion,
    empresa: { nombre: m.empresa, nit: m.empresaNit },
    propietario_mercancia: P(null), remitente: P('Grupo NF S.A.S.', 'NIT 901.780.925'), destinatario: P('Contecar S.A.', 'NIT 800.116.164-0'),
    origen: { lugar: m.origen, direccion: null }, destino: { lugar: m.destino, direccion: null },
    vehiculo: { placa: 'JCR435', marca: 'International', configuracion: '3S2' },
    poseedor: P(m.poseedor), conductor: { nombre: 'N. S. S.', identificacion: 'C.C. ****3579' },
    mercancia: { descripcion: m.mercancia, peso_kg: 28110.5, volumen: null },
    valor_total: m.valorTotal, valor_letras: m.valorLetras, fecha_pago: m.fechaPago, lugar_pago: null,
    saldo: m.saldo, manifestacion_saldo: null, fecha_cumplido: null, retencion_ica: m.ica, retencion_fuente: null, valor_sicetac: null,
    cargue_pagado_por: m.carguePor, descargue_pagado_por: null,
    cargue: { cita: null, llegada: null, salida: null, plazo_horas: null }, descargue: { cita: null, llegada: null, salida: null, plazo_horas: null },
    seguro: { aseguradora: 'MAPFRE Seguros', poliza: 'R42723' },
  }
  const v = verificarManifiesto(datos)
  const ins = await c.query(
    `insert into lc_manifiestos (numero, archivo_nombre, datos, campos, hallazgos, score, modelo, activo) values ($1,$2,$3,$4,$5,$6,'seed',true) returning id`,
    [m.numero, 'manifiesto-01278713.pdf', JSON.stringify(datos), JSON.stringify(v.campos), JSON.stringify(v.hallazgos), v.score])
  await c.query(`insert into lc_eventos (tipo, titulo, detalle, ref_id) values ('manifiesto',$1,$2,$3)`,
    [`Manifiesto ${m.numero} — ${v.hallazgos.length} hallazgos`, v.hallazgos.slice(0, 2).map((h) => h.t).join(' · '), ins.rows[0].id])
  console.log('manifiesto seed score', v.score, 'hallazgos', v.hallazgos.map((h) => `${h.risk}:${h.codigo}`).join(', '))
}
await c.end()
