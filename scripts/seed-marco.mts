// Normas marco que el asistente y el análisis de contratos citan (enlaces oficiales verificados en funcionpublica.gov.co).
// Idempotente: solo inserta si el código no existe. Uso: npx tsx --env-file=.env.local scripts/seed-marco.mts
import { db } from '../lib/lc/db.ts'

const FP = 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i='
const normas = [
  {
    codigo: 'Decreto 410 de 1971', entidad: 'Presidencia de la República', tipo: 'Decreto', estado: 'vigente', fecha: '27/03/1971', vigencia: 'Vigente (marco legal)',
    cat: 'Marco general', tema: 'Código de Comercio', titulo: 'Código de Comercio',
    resumen: 'Expide el Código de Comercio. Regula el contrato de transporte a partir del artículo 981: obligaciones de la empresa de transporte, responsabilidad por pérdida, avería y retardo, remesa y derechos del remitente y del destinatario.',
    puntos: ['Define el contrato de transporte (art. 981).', 'Establece la responsabilidad de la empresa de transporte por la mercancía.', 'Regula la remesa terrestre de carga y el seguro de la mercancía.'],
    impacto: 'Es la base legal del contrato de transporte que suscribe con la empresa de transporte.', url: FP + '41102',
  },
  {
    codigo: 'Ley 57 de 1887', entidad: 'Congreso de la República', tipo: 'Ley', estado: 'vigente', fecha: '15/04/1887', vigencia: 'Vigente (marco legal)',
    cat: 'Marco general', tema: 'Código Civil', titulo: 'Código Civil',
    resumen: 'Adopta el Código Civil. Regula las obligaciones y los contratos en general; los artículos 1592 a 1601 regulan la cláusula penal.',
    puntos: ['Reglas generales de las obligaciones y los contratos.', 'Cláusula penal (arts. 1592 a 1601).', 'Aplicación supletoria a los contratos de transporte.'],
    impacto: 'Soporta cláusulas como la penal y las reglas de incumplimiento en sus contratos.', url: FP + '39535',
  },
  {
    codigo: 'Ley 1563 de 2012', entidad: 'Congreso de la República', tipo: 'Ley', estado: 'vigente', fecha: '12/07/2012', vigencia: 'Vigente',
    cat: 'Marco general', tema: 'Estatuto de Arbitraje Nacional e Internacional', titulo: 'Estatuto de Arbitraje Nacional e Internacional',
    resumen: 'Expide el Estatuto de Arbitraje Nacional e Internacional y regula el pacto arbitral como mecanismo de solución de controversias.',
    puntos: ['Regula el pacto arbitral y el tribunal de arbitramento.', 'Aplica a controversias contractuales de libre disposición.'],
    impacto: 'Permite pactar arbitraje en sus contratos de transporte para resolver controversias.', url: FP + '48366',
  },
]
for (const n of normas) {
  const { data } = await db().from('lc_normas').select('id').eq('codigo', n.codigo).maybeSingle()
  if (data) { console.log('ya existe', n.codigo); continue }
  const { error } = await db().from('lc_normas').insert({ ...n, origen: 'seed', created_at: new Date(Date.now() - 86_400_000 * 30).toISOString() })
  console.log(n.codigo, error ? error.message : 'insertada')
}
