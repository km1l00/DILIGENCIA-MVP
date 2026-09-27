// Tope diario de llamadas a Claude (el acceso es de un solo botón, así que el gasto se acota aquí).
import { db } from './db'

export const TOPE_DIARIO = Number(process.env.IA_TOPE_DIARIO || 150)

export class CupoAgotado extends Error {
  constructor() { super(`Se alcanzó el tope diario de ${TOPE_DIARIO} consultas a la IA. Intente mañana.`) }
}

function inicioDiaBogota(): string {
  const now = new Date(Date.now() - 5 * 3_600_000) // UTC-5
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5)).toISOString()
}

export async function verificarCupo() {
  const { count } = await db().from('lc_ia_uso').select('id', { count: 'exact', head: true }).gte('created_at', inicioDiaBogota())
  if ((count ?? 0) >= TOPE_DIARIO) throw new CupoAgotado()
}

export async function registrarUso(tipo: string, modelo: string, input: number, output: number, ok = true) {
  await db().from('lc_ia_uso').insert({ tipo, modelo, input_tokens: input, output_tokens: output, ok })
}
