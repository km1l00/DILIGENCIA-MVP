<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Contexto del Proyecto: Diligencia MVP
*(Este contexto se carga automáticamente para todas las interacciones futuras en este repositorio)*

---
## ⭐ ESTADO ACTUAL (lee esto primero — reemplaza lo de abajo cuando choquen)

Lo que se está construyendo hoy NO es el MVP marítimo de construcción de abajo, sino una **demo para evento** del sector **transporte de carga**.

- **Producto/marca:** "**Logicompliance**" — plataforma de Legal Intelligence. Cliente y logo: **Franco & Abogados Asociados (F&AA)**, globo dorado a color (embebido en base64 como `LOGO_EMBLEM`). El *due diligence* va dirigido al **generador** de carga (no a la empresa de transporte).
- **Es una DEMO:** ejemplos **hardcodeados** que simulan que funciona; debe verse **llamativa y "vender"** en el evento.
- **Terminología:** usar SIEMPRE **"empresa de transporte"**, nunca "transportador".
- **Normas:** deben ser **REALES con enlace oficial** (funcionpublica.gov.co, normograma DIAN, mintransporte, invias, supertransporte). Nunca inventar números de decreto/resolución.
- **Gauge de score:** escala **rojo/naranja/verde** con aguja navy + número tabular debajo + etiqueta de riesgo (institucional pero con la escala de color). Score del panel = **promedio** de contrato y manifiesto (dinámico).
- **Texto:** que **no parezca IA**; "due diligence" en minúscula como concepto, "Logicompliance" solo como marca.

### Arquitectura de la demo (2 superficies, una sola fuente)
- **`app.html` (raíz) = FUENTE DE VERDAD** del demo: login overlay + 5 módulos (Panel, Actualización Normativa, Revisión de Contratos, Análisis de Manifiesto, Asistente IA). Todo el contenido y el logo viven aquí.
- Con Python se **regeneran** desde `app.html`:
  - **`app/inicio/content.ts`** (`export const DEMO_HTML`) para servir la demo protegida en Vercel — con el login overlay OCULTO (`class="login-screen hidden"`), sin el `<video>` del login, y el logout cambiado a `fetch('/api/acceso',{method:'DELETE'})`.
  - **`diligencia-demo.html`** para el **Artifact privado** (title `Logicompliance`).
- **Pipeline tras CUALQUIER cambio en `app.html`:** regenerar `content.ts` + `diligencia-demo.html` → `npx vercel --prod --yes` → **republicar el Artifact** (mismo file path).

### Seguridad (Vercel) — patrón que funciona
- **Cookie-gate, NO Basic Auth.** Vercel elimina la cabecera `WWW-Authenticate` de las respuestas del middleware, así que el navegador no muestra el prompt nativo. Se usa página de login propia + cookie de sesión.
- `middleware.ts`: `/` (login) y `/api/acceso` son públicos; todo lo demás exige `cookie fa_session === GATE_TOKEN`, si no → redirect a `/`. Comparación en **tiempo constante**.
- `app/api/acceso/route.ts`: `POST` verifica `BASIC_AUTH_USER`/`BASIC_AUTH_PASS` (env) y setea cookie `fa_session` (`httpOnly`+`Secure`+`SameSite=Lax`); `DELETE` cierra sesión.
- `app/(...)/page.tsx` = login con **video del camión** (`public/Truck_cruising_down_highway_...mp4`) → `POST /api/acceso` → redirige a **`/inicio`** (que sirve la demo).
- **Env en Vercel:** `BASIC_AUTH_USER=franco.admin`, `BASIC_AUTH_PASS` (fuerte), `GATE_TOKEN` (secreto aleatorio). Cabeceras de seguridad en `next.config.mjs` (HSTS, X-Frame-Options DENY, CSP `frame-ancestors 'none'`, nosniff, referrer, permissions, `poweredByHeader:false`).
- **URLs:** producción `https://diligencia-mvp.vercel.app` (cuenta `kamilosanabria05-4909`, org `daniels-projects`); Artifact privado `https://claude.ai/artifact/Az67Fti1vfaXYgLu2TvNnn`.

### Cómo NO parece IA / errores a no repetir
- Un login en HTML estático/Artifact **no es seguridad** (clave visible, saltable): decirlo de una si se pide "poner login" a algo estático; la seguridad real exige servidor.
- Si un logo (SVG) renderiza **monocromo/silueta**, NO recolorear a ciegas: pedir el archivo **a color** (PNG transparente / vector / PDF).
- No mantener el demo estático y la app de Vercel **divergentes**: unificar o avisar del desfase apenas aparezca.

*(Las secciones siguientes describen el MVP original marítimo/construcción con Supabase multi-tenant; siguen existiendo como rutas `(app)/*` pero NO son la demo del evento.)*

---

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
