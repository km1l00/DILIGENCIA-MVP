// Cliente de Claude para Logicompliance. La key solo vive en el servidor.
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { verificarCupo, registrarUso } from './cupo'

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'
export const MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5-20251001'

let _client: Anthropic | null = null
export function claude(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 })
  return _client
}

// Une todos los bloques de texto (nunca content[0].text: puede venir un bloque thinking primero).
export function textOf(msg: Anthropic.Message): string {
  return msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('')
}

// Los modelos con pensamiento siempre activo no aceptan temperature ni thinking desactivado.
export function isHaiku(model: string) { return model.includes('haiku') }

export function logUsage(tag: string, msg: Anthropic.Message) {
  const u = msg.usage
  console.log(`[claude] ${tag} model=${msg.model} in=${u.input_tokens} out=${u.output_tokens} cache_r=${u.cache_read_input_tokens ?? 0}`)
}

// Esquema JSON compatible con structured outputs: objetos cerrados.
function closeObjects(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(closeObjects)
  if (s && typeof s === 'object') {
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(s)) {
      if (k === '$schema' || k === 'minLength' || k === 'maxLength' || k === 'minimum' || k === 'maximum' || k === 'minItems' || k === 'maxItems' || k === 'pattern' || k === 'format') continue
      o[k] = closeObjects(v)
    }
    if (o.type === 'object') {
      o.additionalProperties = false
      if (o.properties && !o.required) o.required = Object.keys(o.properties as object)
    }
    return o
  }
  return s
}

function extractJson(text: string): unknown {
  const t = text.trim()
  try { return JSON.parse(t) } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1]) } catch {} }
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1))
  throw new Error('La respuesta del modelo no es JSON')
}

type Content = string | Anthropic.ContentBlockParam[]

// Llamada con salida estructurada validada con zod. Usa structured outputs; si el modelo no lo soporta, cae a JSON por prompt.
export async function jsonCall<T extends z.ZodTypeAny>(opts: {
  tag: string
  schema: T
  system: string
  content: Content
  model?: string
  maxTokens?: number
  effort?: 'low' | 'medium' | 'high'
  timeoutMs?: number
}): Promise<{ data: z.infer<T>; model: string }> {
  const model = opts.model || MODEL
  const jsonSchema = closeObjects(z.toJSONSchema(opts.schema)) as Record<string, unknown>
  // Structured outputs admite hasta 16 parámetros con uniones (anulables); con más, se pide el JSON por instrucción.
  const uniones = (JSON.stringify(jsonSchema).match(/"anyOf"/g) || []).length
  const estructurado = uniones <= 16
  const params: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 8000,
    system: estructurado ? opts.system : opts.system + '\n\nResponde ÚNICAMENTE con un objeto JSON válido que cumpla este JSON Schema, sin texto adicional:\n' + JSON.stringify(jsonSchema),
    messages: [{ role: 'user', content: opts.content }],
    output_config: {
      ...(estructurado ? { format: { type: 'json_schema', schema: jsonSchema } } : {}),
      ...(isHaiku(model) ? {} : { effort: opts.effort ?? 'medium' }),
    },
  }
  if (Object.keys(params.output_config as object).length === 0) delete params.output_config
  await verificarCupo()
  let msg: Anthropic.Message
  try {
    msg = (await claude().messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming, { timeout: opts.timeoutMs ?? 120_000 })) as Anthropic.Message
  } catch (e) {
    // Si el modelo no admite salidas estructuradas, se pide el JSON por instrucción y se valida igual con zod.
    if (!(e instanceof Anthropic.BadRequestError)) throw e
    console.warn('[claude] structured outputs rechazado, reintento con JSON por prompt:', e.message)
    delete (params as { output_config?: unknown }).output_config
    params.system = opts.system + '\n\nResponde ÚNICAMENTE con un objeto JSON válido que cumpla este JSON Schema, sin texto adicional:\n' + JSON.stringify(jsonSchema)
    msg = (await claude().messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming, { timeout: opts.timeoutMs ?? 120_000 })) as Anthropic.Message
  }
  logUsage(opts.tag, msg)
  await registrarUso(opts.tag, msg.model, msg.usage.input_tokens, msg.usage.output_tokens, msg.stop_reason !== 'refusal')
  if (msg.stop_reason === 'refusal') throw new Error('El modelo declinó la solicitud')
  if (msg.stop_reason === 'max_tokens') throw new Error('La respuesta se truncó (max_tokens)')
  const parsed = opts.schema.safeParse(extractJson(textOf(msg)))
  if (!parsed.success) throw new Error('JSON inválido del modelo: ' + parsed.error.message.slice(0, 300))
  return { data: parsed.data, model: msg.model }
}
