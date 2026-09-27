import type { NextRequest } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { isAuthed, unauthorized, fail } from '@/lib/lc/session'
import { db } from '@/lib/lc/db'
import { claude, MODEL, logUsage } from '@/lib/lc/ai'
import { verificarCupo, registrarUso, CupoAgotado } from '@/lib/lc/cupo'
import { SYSTEM_BASE, CONVERSACION, contextoChat, historial } from '@/lib/lc/chat'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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
    const stream = claude().messages.stream({
      model: MODEL, max_tokens: 6000, system, messages: msgs,
      output_config: { effort: 'low' },
    } as unknown as Anthropic.MessageStreamParams)

    const enc = new TextEncoder()
    const out = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        let texto = ''
        stream.on('text', (delta) => { texto += delta; ctrl.enqueue(enc.encode(delta)) })
        try {
          const final = await stream.finalMessage()
          logUsage('chat', final)
          await registrarUso('chat', final.model, final.usage.input_tokens + (final.usage.cache_read_input_tokens ?? 0) + (final.usage.cache_creation_input_tokens ?? 0), final.usage.output_tokens, final.stop_reason !== 'refusal')
          if (final.stop_reason === 'refusal' && !texto) { texto = 'No puedo responder esa consulta.'; ctrl.enqueue(enc.encode(texto)) }
          await db().from('lc_chat').insert({ conversacion: CONVERSACION, role: 'assistant', content: texto, norma_codigo: norma, modelo: final.model })
        } catch (e) {
          console.error('[chat]', (e as Error).message)
          ctrl.enqueue(enc.encode('\n\n⟦error⟧'))
        }
        ctrl.close()
      },
      cancel() { stream.abort() },
    })
    return new Response(out, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } })
  } catch (e) {
    return fail(e, e instanceof CupoAgotado ? 429 : 500)
  }
}
