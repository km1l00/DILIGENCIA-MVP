// Prueba local sin IA: extracción de texto (PDF/DOCX), parseo de cláusulas y exportación Word/PDF del contrato activo.
// Uso: npx tsx --env-file=.env.local scripts/probar-contrato-local.mts <dir-salida>
import fs from 'node:fs'
import path from 'node:path'
import { extraerTexto, normalizarTexto, detalleContrato } from '../lib/lc/contratos-srv.ts'
import { parseClausulas, ordinal } from '../lib/lc/contrato.ts'
import { aDocx, aPdf, PIE_FAA, type Bloque } from '../lib/lc/export.ts'
import { db } from '../lib/lc/db.ts'

const out = process.argv[2] || '.'
for (const f of ['fixtures/contrato-grupo-nf-ingenio-providencia.pdf', 'fixtures/contrato-grupo-nf-ingenio-providencia.docx']) {
  const t = normalizarTexto(await extraerTexto(f, f.endsWith('.pdf') ? 'application/pdf' : '', new Uint8Array(fs.readFileSync(f))))
  const p = parseClausulas(t)
  console.log(f, t.length, 'chars ·', p.clausulas.length, 'cláusulas:', p.clausulas.map((c) => c.nombre).join(' | '))
}
const { data } = await db().from('lc_contratos').select('id').eq('activo', true).limit(1)
const det = await detalleContrato(data![0].id)
console.log('score', det.contrato.score, 'vigente', det.vigente.length, 'propuesta', det.propuesta.map((c) => `${c.nombre}[${c.status}]`).join(' | '))
const bloques: Bloque[] = [{ tipo: 'titulo', texto: det.contrato.nombre.toUpperCase() }, { tipo: 'subtitulo', texto: det.contrato.partes }]
det.propuesta.forEach((c, i) => bloques.push({ tipo: 'parrafo', negrita: `${ordinal(i)}. ${c.nombre}.`, texto: c.body }))
const doc = { encabezado: 'CONTRATO MEJORADO', subtitulo: det.contrato.nombre, bloques, pie: PIE_FAA }
fs.writeFileSync(path.join(out, 'contrato-mejorado.docx'), await aDocx(doc))
fs.writeFileSync(path.join(out, 'contrato-mejorado.pdf'), await aPdf(doc))
console.log('exportado en', out)
