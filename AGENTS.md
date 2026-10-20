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
- **Producto real y sin datos hardcodeados (20/10/2026):** todos los módulos leen y escriben en Supabase y usan Claude y Croma. `app.html` ya **no tiene datos de demo ni de respaldo**: si la API falla se muestra un error y cada módulo tiene su estado vacío. El cliente arranca desde cero (guía en `PRUEBA_CLIENTE.md`).
- **Espacios:** las tablas por cliente (`lc_contratos`, `lc_manifiestos`, `lc_chat`, `lc_boletines`, `lc_eventos`, `lc_contrapartes`, `lc_procesos`, `lc_empresa`) tienen columna `espacio`; el producto usa `ESPACIO='principal'` (`lib/lc/db.ts`) y las inserciones lo toman por defecto. Los datos de prueba anteriores están archivados en `demo` y los de la prueba E2E del 20/10 en `prueba-qa`. Para vaciar el espacio sin borrar: `npx tsx scripts/archivar-espacio.mts principal <destino>`. Las normas (`lc_normas`) son compartidas.
- **Empresa cliente:** bienvenida en el primer ingreso (NIT → RUES vía Croma → confirmar); `GET/POST /api/lc/empresa`; el panel devuelve `empresa` y el asistente la usa como contexto.
- **Terminología:** usar SIEMPRE **"empresa de transporte"**, nunca "transportador".
- **Normas:** deben ser **REALES con enlace oficial** (funcionpublica.gov.co, normograma DIAN, mintransporte, invias, supertransporte). Nunca inventar números de decreto/resolución.
- **Gauge de score:** escala **rojo/naranja/verde** con aguja navy + número tabular debajo + etiqueta de riesgo. Score del panel = **promedio** real del contrato activo y del manifiesto activo (desde la BD).
- **Texto:** que **no parezca IA**; "due diligence" en minúscula como concepto, "Logicompliance" solo como marca.

### Arquitectura (una sola fuente, dos superficies)
- **`app.html` (raíz) = FUENTE DE VERDAD del front**: 5 módulos que hacen `fetch`/XHR a `/api/lc/*` (sin login falso en el cliente).
- `python scripts/build_demo.py` regenera **`app/inicio/content.ts`** (`export const DEMO_HTML`), servido en `/inicio` detrás del cookie-gate; falla si detecta datos de demo en `app.html`.
- **El Artifact se retiró (20/10/2026):** sin servidor quedaría vacío. Ya no se genera `diligencia-demo.html`.
- **Pipeline tras CUALQUIER cambio en `app.html`:** `python scripts/build_demo.py` → `npm run build` → `npx vercel@latest --prod --yes --token $VERCEL_TOKEN_CUENTA`.
- Rutas del MVP anterior (`/dashboard`, `/chat`, `/documents`, `/findings`, `/simulator`) redirigen a `/inicio` (proxy).
- Seeds: `scripts/seed.mts` (normas desde `db/seed/normas.json`, sin contratos ni manifiestos) y `scripts/seed-marco.mts`. Fixtures: `python scripts/make_fixtures.py` (lee `fixtures/fuente.json`).
- **Backend** (`app/api/lc/*`, lógica en `lib/lc/*`), todas las rutas exigen la cookie `fa_session`:
  - `panel` (KPIs, actividad, scores) · `normas` (lista) · `normas/analizar` (web_search de Claude SOLO en dominios oficiales; el código exige URL de los resultados, dominio oficial, HTTP 200 y el número de la norma en el documento; dedupe por número+año) · `boletin` (+ `/[id]/export?format=pdf|docx`)
  - `contratos` (upload PDF/DOCX → texto con unpdf/mammoth → análisis Claude → persistencia; original en Storage `lc-docs`), `contratos/[id]` (detalle), `/implementar`, `/activar`, `/export?format&version=propuesta|vigente`, `/original`
  - `manifiestos` (upload PDF → extracción Claude/Haiku → **reglas jurídicas en código** `lib/lc/manifiesto.ts`), `manifiestos/[id]`, `/activar`
  - `chat` (GET historial; POST streaming text/plain, contexto = normas de la BD + contrato y manifiesto activos + norma en foco; herramientas `consultar_empresa_transporte` / `consultar_vehiculo` / `consultar_proceso_judicial` que llaman a Croma desde el servidor, máx. 3 rondas, líneas de estado `⟦consulta⟧`)
  - **Croma** (`lib/lc/croma.ts`, key `CROMA_API_KEY`): `contrapartes` (ficha por NIT: RUES, Rama Judicial por razón social exacta → sin puntos → núcleo, SECOP, Procuraduría; reglas en `lib/lc/contrapartes.ts`, p. ej. C. Co. art. 33), `manifiestos/[id]/vehiculo` (RUNT historial + SIMIT por placa; reglas en `lib/lc/vehiculo.ts`: SOAT y RTM a la fecha de expedición, Ley 769 arts. 42/51/52; configuración vs. clase, Res. 4100 de 2004), `procesos` (+ `/[id]`, `/revisar`) y `/api/cron/procesos` (cron diario 11:00 UTC en `vercel.json`, valida `CRON_SECRET`; el proxy lo deja pasar). Caché con TTL por fuente en `lc_croma_cache` (se eliminan propietarios e infractores antes de guardar), consumo en `lc_croma_uso`, tope `CROMA_TOPE_DIARIO` (300). Plan gratis: 1.500 créditos/mes (vivo 10, dataset 1). Solo se consulta por NIT, placa o radicado.
- **BD Supabase** (`hpesrooroyaehpjdxoll`, pooler `aws-1-sa-east-1`; se pausa por inactividad, hay que reactivarlo desde el dashboard): tablas `lc_*` (normas, boletines, contratos, contrato_hallazgos, manifiestos, eventos, chat, ia_uso, croma_cache, croma_uso, contrapartes, procesos) creadas con `npx tsx scripts/migrate.mts` (lee `db/migrations/*.sql`, idempotente). Seed: `scripts/seed.mts` (desde app.html) y `scripts/seed-marco.mts`. RLS sin políticas: solo service_role. Las tablas del MVP viejo no se tocan.
- **Reglas del manifiesto verificadas contra el texto oficial:** art. 2.2.1.7.5.4 (13 numerales; num. 9-11 modificados por el art. 10 del Decreto 1017/2025: pago ≤ 5 días hábiles tras el cumplido), art. 2.2.1.7.6.8 (8 h; modificado por el art. 15; antes 12 h), art. 2.2.1.7.6.9 num. 2 lit. b, art. 2.2.1.7.4 (piso SICE-TAC). Se aplica el régimen según la fecha de expedición. ICA en $0 = criterio F&AA (se rotula así, no hay norma nacional). funcionpublica escribe "Decreto 2017 de 2025" en las notas de vigencia: es una errata, es el 1017.
- **IA:** `ANTHROPIC_MODEL` (Opus 5.5: contratos, chat, boletín), `ANTHROPIC_MODEL_FAST` (Haiku 4.5: extracción de manifiestos), `ANTHROPIC_MODEL_NORMATIVA` (default Haiku: la búsqueda web suma 50-150k tokens por corrida). Tope diario `IA_TOPE_DIARIO` (150) y tokens registrados en `lc_ia_uso`. Leer respuestas uniendo bloques `text`.
- **Fixtures** en `fixtures/` (y copia en `public/fixtures/`, detrás de la cookie, ofrecidos al cliente como documentos de ejemplo): contrato Grupo NF/Ingenio Providencia (.docx/.pdf), manifiesto 01278713, manifiesto ficticio rotulado.

### Seguridad (Vercel)
- **Cookie-gate, NO Basic Auth** (Vercel elimina `WWW-Authenticate`). `proxy.ts` (antes `middleware.ts`; Next 16): `/` y `/api/acceso` públicos; lo demás exige `fa_session === GATE_TOKEN` → páginas redirigen a `/`, `/api/*` responde **401 JSON**. Comparación en tiempo constante.
- **Login de un solo botón (pedido por el usuario, 26/09):** `POST /api/acceso` entra sin usuario/contraseña (usuario fijo `franco.admin`). Esto **no es autenticación**: cualquiera con la URL entra; por eso existe el tope diario de IA. `DELETE /api/acceso` cierra sesión.
- Env en Vercel: `GATE_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MODEL_FAST`, `NEXT_PUBLIC_SUPABASE_*`, `CROMA_API_KEY`, `CRON_SECRET`, `BASIC_AUTH_USER`. Cabeceras de seguridad en `next.config.mjs`.
- **URLs (desde 20/10/2026):** producción `https://diligencia-mvp-sand.vercel.app` (cuenta `vardokgaymeromg-2917`, equipo `fcb19`, funciones en `gru1` junto a Supabase). Desplegar con `npx vercel@latest --prod --yes --token $VERCEL_TOKEN_CUENTA` (token en `.env.local`). La cuenta anterior (`daniels-projects`, `diligencia-mvp.vercel.app`) quedó bloqueada por "fair use"; su vinculación está respaldada en `.vercel.cuenta-bloqueada/`. Artifact privado `https://claude.ai/artifact/Az67Fti1vfaXYgLu2TvNnn`.
- `.vercelignore` excluye `.env*` del despliegue.

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
