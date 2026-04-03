export type TaskType = 
  | 'analysis'        // Análisis completo de documentos DD
  | 'chat'            // Conversación con el cliente
  | 'classification'  // Clasificar documento por área
  | 'summary'         // Resumir un documento
  | 'report'          // Generar reporte ejecutivo
  | 'extraction'      // Extraer fechas, montos, nombres

type ModelConfig = {
  model: string
  max_tokens: number
  description: string
  cost_tier: 'low' | 'medium' | 'high'
}

const MODEL_ROUTER: Record<TaskType, ModelConfig> = {
  analysis: {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    description: 'Análisis completo de due diligence — requiere máxima precisión',
    cost_tier: 'high',
  },
  report: {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    description: 'Generación de reportes ejecutivos — requiere calidad de redacción',
    cost_tier: 'high',
  },
  chat: {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    description: 'Conversación con el cliente — respuestas rápidas y económicas',
    cost_tier: 'low',
  },
  classification: {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    description: 'Clasificar documento por área — tarea simple y repetitiva',
    cost_tier: 'low',
  },
  summary: {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    description: 'Resumir documento — tarea moderada',
    cost_tier: 'low',
  },
  extraction: {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    description: 'Extraer fechas, montos y datos clave — tarea mecánica',
    cost_tier: 'low',
  },
}

export function getModel(task: TaskType): ModelConfig {
  return MODEL_ROUTER[task]
}

// Costo estimado en USD por tarea (aproximado)
export const TASK_COSTS: Record<TaskType, number> = {
  analysis:       0.045,  // ~15k tokens Sonnet
  report:         0.030,  // ~10k tokens Sonnet
  chat:           0.001,  // ~1k tokens Haiku
  classification: 0.0002, // ~256 tokens Haiku
  summary:        0.0005, // ~512 tokens Haiku
  extraction:     0.0005, // ~512 tokens Haiku
}
