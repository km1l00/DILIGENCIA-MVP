import type { NextRequest } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db } from '@/lib/lc/db'
import { claude, MODEL, logUsage } from '@/lib/lc/ai'
import { verificarCupo, registrarUso, CupoAgotado } from '@/lib/lc/cupo'
import { SYSTEM_BASE, CONVERSACION, contextoChat, historial } from '@/lib/lc/chat'
import { HERRAMIENTAS, ETIQUETA, ejecutarHerramienta } from '@/lib/lc/herramientas'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_RONDAS = 3 // máximo de rondas de herramientas por pregunta

// Historial persistido
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  try { return Response.json({ mensajes: await historial(40) }) } catch (e) { return fail(e) }
}

// Pregunta al asistente: responde en streaming (text/plain) y guarda ambos mensajes.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized()
  let body: { mensaje?: string; norma?: string | null }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }) }
  const mensaje = String(body.mensaje || '').trim().slice(0, 2000)
  if (!mensaje) return Response.json({ error: 'Mensaje vacío' }, { status: 400 })
  const norma = body.norma ? String(body.norma).slice(0, 200) : null
  try {
    await verificarCupo()
    const [ctx, prev] = await Promise.all([contextoChat(norma), historial(16)])
    await db().from('lc_chat').insert({ conversacion: CONVERSACION, role: 'user', content: mensaje, norma_codigo: norma })

    // Historial alterno user/assistant que empieza en user
    const msgs: Anthropic.MessageParam[] = []
    for (const m of prev) {
      if (!msgs.length && m.role !== 'user') continue
      const last = msgs[msgs.length - 1]
      if (last && last.role === m.role) last.content = `${last.content}\n\n${m.content}`
      else msgs.push({ role: m.role, content: m.content })
    }
    const pregunta = ctx.foco ? `${ctx.foco}\n\nPregunta: ${mensaje}` : mensaje
    if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs[msgs.length - 1].content += `\n\n${pregunta}`
    else msgs.push({ role: 'user', content: pregunta })

    const system: Anthropic.TextBlockParam[] = [
      { type: 'text', text: SYSTEM_BASE },
      { type: 'text', text: `<normas_bd>\n${ctx.normas}\n</normas_bd>\n\n<contrato_activo>\n${ctx.contrato}\n</contrato_activo>\n\n<manifiesto_activo>\n${ctx.manifiesto}\n</manifiesto_activo>`, cache_control: { type: 'ephemeral' } },
    ]
    const enc = new TextEncoder()
    let abortar: (() => void) | null = null
    const out = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        let texto = ''
        try {
          // Bucle de herramientas: el texto del modelo se transmite en vivo; cada consulta a registros oficiales
          // se anuncia con una línea ⟦consulta⟧ que el front muestra como estado y no se guarda en el historial.
          for (let ronda = 0; ; ronda++) {
            const stream = claude().messages.stream({
              model: MODEL, max_tokens: 6000, system, messages: msgs,
              tools: ronda < MAX_RONDAS ? HERRAMIENTAS : undefined,
              output_config: { effort: 'low' },
            } as unknown as Anthropic.MessageStreamParams)
            abortar = () => stream.abort()
            stream.on('text', (delta) => { texto += delta; ctrl.enqueue(enc.encode(delta)) })
            const final = await stream.finalMessage()
            logUsage('chat', final)
            await registrarUso('chat', final.model, final.usage.input_tokens + (final.usage.cache_read_input_tokens ?? 0) + (final.usage.cache_creation_input_tokens ?? 0), final.usage.output_tokens, final.stop_reason !== 'refusal')
            if (final.stop_reason === 'refusal' && !texto) { texto = 'No puedo responder esa consulta.'; ctrl.enqueue(enc.encode(texto)) }
            if (final.stop_reason !== 'tool_use') break
            const usos = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
            msgs.push({ role: 'assistant', content: final.content as unknown as Anthropic.ContentBlockParam[] })
            for (const u of usos) ctrl.enqueue(enc.encode(`\n⟦consulta⟧ ${(ETIQUETA[u.name] || (() => 'Consultando fuentes oficiales'))(u.input)}…\n`))
            const resultados = await Promise.all(usos.map(async (u) => {
              const r = await ejecutarHerramienta(u.name, u.input)
              return { type: 'tool_result' as const, tool_use_id: u.id, content: r.contenido, is_error: r.error }
            }))
            msgs.push({ role: 'user', content: resultados })
            if (texto && !texto.endsWith('\n')) { texto += '\n\n'; ctrl.enqueue(enc.encode('\n\n')) }
          }
          await db().from('lc_chat').insert({ conversacion: CONVERSACION, role: 'assistant', content: texto, norma_codigo: norma, modelo: MODEL })
        } catch (e) {
          console.error('[chat]', (e as Error).message)
          ctrl.enqueue(enc.encode('\n\n⟦error⟧'))
        }
        ctrl.close()
      },
      cancel() { abortar?.() },
    })
    return new Response(out, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } })
  } catch (e) {
    return fail(e, e instanceof CupoAgotado ? 429 : 500)
  }
}
