import { analizarNormativa } from '../lib/lc/normativa.ts'
const t0=Date.now()
const r = await analizarNormativa()
console.log(((Date.now()-t0)/1000).toFixed(0)+'s', JSON.stringify({creadas:r.creadas.map(n=>[n.codigo,n.entidad,n.cat,n.fecha,n.url]), descartadas:r.descartadas, busquedas:r.busquedas, fuentes:r.fuentes}, null, 1))
