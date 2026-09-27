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
| N2 | "Analizar nueva normativa" contra fuentes oficiales reales, URL verificada 200 | verificado-prod | POST /api/lc/normas/analizar: web_search restringido a dominios oficiales; 1.ª corrida prod (Opus) 53 s, 6 búsquedas, 53 resultados → 2 normas Mintransporte creadas (URL oficial 200 + número en el documento). Re-verificación con Haiku + dedupe número/año: 15 s, 0 nuevas, 1 descartada "ya está en la base". verificarUrl rechaza números no presentes en el PDF. 18/18 enlaces de la BD responden 200 (url_status) |
| N3 | Filtros por entidad y categoría | verificado-prod | Entidad=Ministerio de Transporte → "4 de 9"; + Tema=Fletes y SICE-TAC → "2 de 9"; opciones generadas desde la BD |
| N4 | Modal de norma (resumen, puntos, impacto, enlace) | verificado-prod | Modal "Decreto 1017 de 2025": entidad, tipo, fecha, vigencia, tema, resumen, 4 puntos, impacto, Ver texto oficial |
| N5 | Boletín semanal con Claude desde la BD, guardado | verificado-prod | POST /api/lc/boletin: Boletín N.º 29 (SEPTIEMBRE 2026) en 23 s, 10 normas en 5 entidades, intro editorial; enlaces y códigos desde la BD (el modelo no puede agregar normas); persiste tras recargar (GET /api/lc/boletin) |
| N6 | Exportar boletín a PDF y Word (descarga real) | verificado-prod | GET /api/lc/boletin/{id}/export?format=pdf → 200 %PDF (135.765 B, 3 págs., títulos enlazados); format=docx → 200 PK (119.806 B) |
| C1 | Cargar contrato PDF/DOCX (upload + extracción en servidor) | verificado-prod | Upload DOCX real (fixture) → POST /api/lc/contratos: texto extraído con mammoth (PDF con unpdf probado en local: 8 cláusulas en ambos), original guardado en Storage lc-docs y descargable (GET …/original 200, 37.666 bytes) |
| C2 | Análisis con Claude (cláusulas, hallazgos, faltantes, redacción, score 1–5) persistido | verificado-prod | Opus 5.5: 7 hallazgos (alto/medio/bajo), 2 cláusulas nuevas, 5 modificadas, fundamentos reales (C.Co. 981/982/992, C.C. 1592-1601, D.1079 arts. 2.2.1.7.4/6.8/6.9, Ley 1563), score 1.8 persistido en lc_contratos + lc_contrato_hallazgos. 4.720 in / 7.702 out tokens |
| C3 | Ver original y comparación original vs. mejorada | verificado-prod | "Ver contrato analizado" (texto extraído), "Ver contrato con cambios propuestos" (NUEVA/MODIFICADA), diff por hallazgo CLÁUSULA ACTUAL vs REDACCIÓN PROPUESTA; se corrigió el prefijo duplicado de ordinal/título (limpiarCuerpo) |
| C4 | "Implementar" actualiza contrato, recalcula score, persiste, panel se actualiza | verificado-prod | Implementar C4: score 1.8→2.2 (+0.4) recalculado en servidor, persiste tras recargar, panel 2.4→2.6, sideScore sincronizado, evento "Cláusula implementada…" |
| C5 | Exportar contrato mejorado a Word/PDF | verificado-prod | GET …/export?format=docx → 200 DOCX (PK, 119.835 B); format=pdf → 200 %PDF (135.801 B); version=vigente → PDF 129.922 B; content-disposition attachment |
| C6 | Analizar contrato nuevo y cambiar entre contratos | verificado-prod | Selector de contratos (2): cambiarContrato → activo=seed (2.6, 5 hallazgos), panel recalculado a 2.8 |
| M1 | Cargar manifiesto PDF y extraer datos con Claude | verificado-prod | Upload PDF (fixture ficticio) → Haiku extrae datos (10,4 s); 01278713 extraído en local idéntico al seed |
| M2 | Campos obligatorios (Decreto 1079/2015) verificados en código, hallazgos citando norma real | verificado-prod | Reglas en código: N9 letras≠números, N10 >5 días hábiles tras cumplido, 8 h cargue (11,5 h), descargue a cargo de la empresa de transporte, SICE-TAC; 13 campos con faltantes; cada hallazgo con artículo y enlace oficial |
| M3 | Score del manifiesto persistido y reflejado en el panel | verificado-prod | Score 1.5 persistido; panel 2.8→2.1 (promedio con contrato 2.6); KPIs manifiestos=2 |
| M4 | "Cargar otro manifiesto" + historial guardado | verificado-prod | "Cargar otro manifiesto" + historial (99000123 activo, 01278713); "Ver" reactiva 01278713 y el panel vuelve a 2.8 |
| A1 | Chat Claude real (streaming), historial persistido, markdown | verificado-prod | POST /api/lc/chat streaming text/plain: primer fragmento a los 2,5 s; markdown con enlaces renderizado; historial en lc_chat, reaparece tras recargar |
| A2 | Acciones rápidas van a la API | verificado-prod | quickActions[4] (Decreto 1017) → API real (no precargada); respaldo con chatResponses solo si la API falla o no responde en 25 s |
| A3 | System prompt F&AA + contexto BD (normas, contrato y manifiesto activos) | verificado-prod | Respuesta cita solo normas de lc_normas con su URL oficial (Decreto 1017/2025 i=264276, Decreto 1079/2015 i=77889) y usa contrato activo (hallazgo C3) y manifiesto 01278713 (campos vacíos). Se afinó el hecho del art. 2.2.1.7.6.8 (quién paga las horas adicionales) |
| A4 | "Preguntar al asistente" desde modal de norma con contexto | verificado-prod | Modal Resolución 40595 de 2022 → "Preguntar al asistente" abre el chat con chip "Contexto: Resolución 40595 de 2022" y respuesta sobre el PESV enfocada en el generador |
| T1 | Logout real + /api protegidas (401 sin cookie) | verificado-prod | Sin cookie: /api/lc/panel, /api/lc/normas, /api/chat → 401 JSON; /inicio → 307 a /. Logout: DELETE /api/acceso → /, luego /api/lc/panel 401 |
| T2 | Sin errores de consola ni requests fallidos en prod | pendiente | |
| T3 | Fixtures (contrato Grupo NF / Ingenio Providencia, manifiesto 01278713) | verificado-prod | fixtures/ (contrato .docx/.pdf, manifiesto-01278713.pdf, manifiesto-prueba-ficticio.pdf rotulado) servidos tras la cookie en /fixtures (sin cookie → 307) y usados en los uploads de prod |
| R  | Regresión final completa | pendiente | |

## Decisiones / cambios pedidos por el usuario
- 26/09: login de un solo botón (sin usuario/contraseña; usuario fijo franco.admin en el servidor). Se mantiene la cookie de sesión; se añadió tope diario de IA (`IA_TOPE_DIARIO`, 150) y registro de tokens en `lc_ia_uso`. Aviso dado: esto no es autenticación.
- Motor de reglas del manifiesto verificado contra el texto oficial: art. 2.2.1.7.5.4 (13 numerales; num. 9-11 modificados por el art. 10 del Decreto 1017/2025, pago ≤ 5 días hábiles tras el cumplido), art. 2.2.1.7.6.8 (8 h, modificado por el art. 15; 12 h antes), art. 2.2.1.7.6.9 num. 2 lit. b, art. 2.2.1.7.4 (piso SICE-TAC). Aplica el régimen según la fecha de expedición. ICA en $0 = criterio F&AA (sin norma nacional; se rotula así).

- 26/09: normas marco agregadas a lc_normas con enlace oficial verificado (Decreto 410 de 1971 · Código de Comercio i=41102; Ley 57 de 1887 · Código Civil i=39535; Ley 1563 de 2012 i=48366) para que el asistente y el análisis de contratos puedan citarlas.
- 26/09: el análisis de normativa pasó a Haiku 4.5 (4 búsquedas) por costo: con Opus cada corrida costó ~$0,70 (≈150k tokens de resultados de búsqueda). Configurable con `ANTHROPIC_MODEL_NORMATIVA`.
- 26/09: con OK del usuario se borraron 2 normas duplicadas creadas por una prueba (bug de deduplicación ya corregido) y sus 2 eventos.

## Tokens gastados (estimado por iteración)
| Iteración | Llamadas | Tokens aprox. | Costo aprox. |
|---|---|---|---|
| 1 (setup) | 1× Haiku (validación key) | ~15 | < $0.001 |
| 2 (manifiestos + contratos) | 3× Haiku (extracción) + 1× Opus 5.5 (análisis contrato) | Haiku 12,6k in / 2,6k out · Opus 4,7k in / 7,7k out | ~$0,20 |
| 3 (asistente + normativa + boletín) | chat 2× Opus · normativa 2× Opus + 2× Haiku (web_search 20 búsquedas) · boletín 1× Opus | Opus 316k in / 15k out · Haiku ~100k in / 4k out | ~$1,85 (normativa con Opus ≈ $1,40) |
| **Total acumulado** | | | **≈ $2,10** |
