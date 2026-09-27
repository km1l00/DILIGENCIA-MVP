// Prueba local de la extracción + reglas de un manifiesto (no escribe en la BD de dominio; sí registra el uso de IA).
// Uso: npx tsx --env-file=.env.local scripts/probar-manifiesto.mts fixtures/manifiesto-01278713.pdf
import fs from 'node:fs'
import { jsonCall, MODEL_FAST } from '../lib/lc/ai.ts'
import { ManifiestoDatosSchema, verificarManifiesto } from '../lib/lc/manifiesto.ts'

const file = process.argv[2]
const b64 = fs.readFileSync(file).toString('base64')
const t0 = Date.now()
const { data, model } = await jsonCall({
  tag: 'prueba-manifiesto', schema: ManifiestoDatosSchema, model: MODEL_FAST, maxTokens: 4000,
  system: 'Extrae los datos del manifiesto de carga tal como aparecen. Si un dato no aparece, null. Nunca inventes. Fechas DD/MM/AAAA (con hora "DD/MM/AAAA HH:MM"). Montos como números en pesos; $0 es 0.',
  content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }, { type: 'text', text: 'Extrae los datos.' }],
})
console.log(model, ((Date.now() - t0) / 1000).toFixed(1) + 's')
console.log(JSON.stringify(data, null, 1).slice(0, 2500))
const v = verificarManifiesto(data)
console.log('score', v.score, v.regimen)
for (const h of v.hallazgos) console.log(`- [${h.risk}] ${h.t} · ${h.base}`)
