<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Contexto del Proyecto: Diligencia MVP
*(Este contexto se carga automáticamente para todas las interacciones futuras en este repositorio)*

## Visión General
**Diligencia MVP** es una plataforma B2B de Monitoreo de Riesgo y *Due Diligence* enfocada en empresas colombianas. Su objetivo es centralizar y evaluar el riesgo en múltiples dimensiones (Legal, Laboral, Corporativo, Tributario, Contratos y Licencias) y ofrecer un asistente inteligente (IA) especializado. El diseño UI tiene una temática marítima elegante (colores navy y brass, metáforas de navegación).

## Stack Tecnológico 
- **Core**: Next.js 16.2.1 (App Router `app/`), React 19.
- **Estilos**: Tailwind CSS 4, Radix UI (primtivos accesibles), Framer Motion, Recharts, Lucide React.
- **Auth & DB**: Supabase (Multi-tenant B2B).
- **IA**: Anthropic SDK (Claude 3.7 Sonnet) inyectando RAG desde Supabase.

## Arquitectura de Rutas y API
- **Rutas Públicas**: `/` (Página de login/landing con validación por Supabase Auth).
- **Rutas Protegidas**: `(app)/dashboard`, `(app)/chat`, `(app)/documents`, `(app)/findings`, `(app)/simulator`.
- **Middleware**: `middleware.ts` valida la sesión con Supabase SSR. Protege rutas y redirige según estado de autenticación.
- **API `app/api/`**: Contiene los endpoints serverless para consultar DB e interactuar con IA (ej: `api/chat/route.ts`).

## Modelo de Datos (Supabase)
Todo está aislado por `tenant_id` (Empresa):
- `tenants`: Entidades representativas de empresas clientes.
- `users`: Usuarios del sistema atados a un tenant específico.
- `assessments`: Evaluaciones globales, subdivididas por áreas con score 1-5.
- `findings`: Hallazgos/riesgos identificados (tienen impacto en los scores, áreas asignadas, y estados abierto/resuelto).
- `documents`: Documentos base para el análisis, tienen áreas asignadas.
- `audit_log`: Registro de acciones sensibles (como chats con la IA).

## Directrices de Desarrollo (Reglas a seguir)
1. **Multi-tenant Obligatorio**: TODA consulta a la base de datos (Supabase) en back o front DEBE filtrar estrictamente por el `tenant_id` del usuario autenticado actual.
2. **Seguridad y Privacidad**: Cumplimiento de leyes colombianas de protección de datos (ej: Ley 1581). No crear features que expongan PII indiscriminada; la IA debe anonimizar y mantener confidencialidad estricta.
3. **Estilo Náutico**: Emplear las variables de color predefinidas (`bg-navy-medium`, `text-brass`, `port-red`, `starboard-green`) al crear o modificar UI.
4. **Respuesta Rápida**: Priorizar el uso de Server Actions de Next.js u optimizaciones con `React.Suspense` para la carga de componentes pesados del Dashboard y Listados.
