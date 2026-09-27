# LOOP_PROGRESS — Logicompliance real

Estados: `pendiente` · `hecho` (build local OK) · `verificado-prod` (probado en https://diligencia-mvp.vercel.app con evidencia).

## Infraestructura (previa)
- Supabase `hpesrooroyaehpjdxoll` reactivado por el usuario. Pooler `aws-1-sa-east-1`. Migración `db/migrations/001_logicompliance.sql` aplicada (7 tablas `lc_*`, RLS sin políticas: solo service_role). Tablas del MVP viejo intactas.
- Key de Anthropic validada con 5 tokens (Haiku 4.5) → 200.
- Precios: Opus 5.5 $4/$20 por MTok (entrada/salida); Haiku 4.5 $1/$5.

## Checklist

| # | Ítem | Estado | Evidencia |
|---|------|--------|-----------|
| P1 | KPIs desde la BD | verificado-prod | 26/09: /inicio muestra 0 normas nuevas (origen=analisis) · 1 contrato · 1 manifiesto · 11 hallazgos activos (5 contrato + 6 manifiesto), GET /api/lc/panel 200 |
| P2 | Actividad reciente real (tiempo relativo) | verificado-prod | Actividad desde lc_eventos: "Manifiesto 01278713 — 6 hallazgos · Hace 8 min", "Contrato Grupo NF… · Hace 8 min" |
| P3 | Gauge = promedio real contrato+manifiesto; sideScore sincronizado | verificado-prod | Gauge 2.8 = (2.6 contrato + 2.9 manifiesto)/2; sideScore "Cumplimiento: 2.8/5"; texto explicativo con desglose real (se quitó el "4.5/5" inventado) |
| N1 | Normas listadas desde la BD (seed = normas reales de app.html) | verificado-prod | 9 normas de lc_normas (seed desde app.html con enlaces oficiales), normasDesdeBD=true |
| N2 | "Analizar nueva normativa" contra fuentes oficiales reales, URL verificada 200 | pendiente | |
| N3 | Filtros por entidad y categoría | verificado-prod | Entidad=Ministerio de Transporte → "4 de 9"; + Tema=Fletes y SICE-TAC → "2 de 9"; opciones generadas desde la BD |
| N4 | Modal de norma (resumen, puntos, impacto, enlace) | verificado-prod | Modal "Decreto 1017 de 2025": entidad, tipo, fecha, vigencia, tema, resumen, 4 puntos, impacto, Ver texto oficial |
| N5 | Boletín semanal con Claude desde la BD, guardado | pendiente | |
| N6 | Exportar boletín a PDF y Word (descarga real) | pendiente | |
| C1 | Cargar contrato PDF/DOCX (upload + extracción en servidor) | pendiente | |
| C2 | Análisis con Claude (cláusulas, hallazgos, faltantes, redacción, score 1–5) persistido | pendiente | |
| C3 | Ver original y comparación original vs. mejorada | pendiente | |
| C4 | "Implementar" actualiza contrato, recalcula score, persiste, panel se actualiza | pendiente | |
| C5 | Exportar contrato mejorado a Word/PDF | pendiente | |
| C6 | Analizar contrato nuevo y cambiar entre contratos | pendiente | |
| M1 | Cargar manifiesto PDF y extraer datos con Claude | pendiente | |
| M2 | Campos obligatorios (Decreto 1079/2015) verificados en código, hallazgos citando norma real | pendiente | |
| M3 | Score del manifiesto persistido y reflejado en el panel | pendiente | |
| M4 | "Cargar otro manifiesto" + historial guardado | pendiente | |
| A1 | Chat Claude real (streaming), historial persistido, markdown | pendiente | |
| A2 | Acciones rápidas van a la API | pendiente | |
| A3 | System prompt F&AA + contexto BD (normas, contrato y manifiesto activos) | pendiente | |
| A4 | "Preguntar al asistente" desde modal de norma con contexto | pendiente | |
| T1 | Logout real + /api protegidas (401 sin cookie) | verificado-prod | Sin cookie: /api/lc/panel, /api/lc/normas, /api/chat → 401 JSON; /inicio → 307 a /. Logout: DELETE /api/acceso → /, luego /api/lc/panel 401 |
| T2 | Sin errores de consola ni requests fallidos en prod | pendiente | |
| T3 | Fixtures (contrato Grupo NF / Ingenio Providencia, manifiesto 01278713) | pendiente | |
| R  | Regresión final completa | pendiente | |

## Decisiones / cambios pedidos por el usuario
- 26/09: login de un solo botón (sin usuario/contraseña; usuario fijo franco.admin en el servidor). Se mantiene la cookie de sesión; se añadió tope diario de IA (`IA_TOPE_DIARIO`, 150) y registro de tokens en `lc_ia_uso`. Aviso dado: esto no es autenticación.
- Motor de reglas del manifiesto verificado contra el texto oficial: art. 2.2.1.7.5.4 (13 numerales; num. 9-11 modificados por el art. 10 del Decreto 1017/2025, pago ≤ 5 días hábiles tras el cumplido), art. 2.2.1.7.6.8 (8 h, modificado por el art. 15; 12 h antes), art. 2.2.1.7.6.9 num. 2 lit. b, art. 2.2.1.7.4 (piso SICE-TAC). Aplica el régimen según la fecha de expedición. ICA en $0 = criterio F&AA (sin norma nacional; se rotula así).

## Tokens gastados (estimado por iteración)
| Iteración | Llamadas | Tokens aprox. | Costo aprox. |
|---|---|---|---|
| 1 (setup) | 1× Haiku (validación key) | ~15 | < $0.001 |
