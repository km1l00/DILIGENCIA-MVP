# Logicompliance · Guía de prueba para el cliente

**Dirección:** https://diligencia-mvp-sand.vercel.app → botón **Ingresar al Portal**.

La plataforma arranca vacía. Todo lo que aparece se genera con los documentos y datos que usted cargue; las normas son reales y enlazan a la fuente oficial.

## Recorrido sugerido (20 a 30 minutos)

1. **Registre su empresa.** En el primer ingreso escriba el NIT de la empresa generadora de carga y pulse *Buscar en el RUES*. Revise la razón social, la actividad y el municipio, y guarde. Puede editarlos después haciendo clic en el nombre de la empresa, en el menú lateral.
2. **Revisión de Contratos.** Cargue un contrato de transporte en PDF o DOCX (hasta 4 MB). En 1 a 2 minutos verá el puntaje de riesgo, los hallazgos por cláusula con su fundamento y la redacción propuesta. Pruebe *Implementar cláusula* (el puntaje se recalcula) y *Exportar a Word / PDF*.
3. **Análisis de Manifiesto.** Cargue el PDF de un manifiesto electrónico de carga. Se verifican los 13 campos del art. 2.2.1.7.5.4 del Decreto 1079 de 2015, el plazo de pago, los tiempos de cargue y descargue y el piso SICE-TAC. Luego use *Verificar vehículo en RUNT y SIMIT* y *Verificar empresa de transporte*.
4. **Contrapartes y Procesos.** Verifique cualquier empresa de transporte por NIT (RUES, Rama Judicial, SECOP y Procuraduría) y agregue los radicados de los procesos que quiera seguir; se revisan a diario.
5. **Actualización Normativa.** Consulte las normas, use los filtros, *Analizar nueva normativa* (consulta fuentes oficiales; 15 a 60 segundos) y *Generar boletín semanal*, exportable a PDF y Word.
6. **Asistente IA.** Pregunte por su contrato, su manifiesto o una norma. Puede pedirle que verifique en registros oficiales una empresa por NIT, un vehículo por placa o un proceso por radicado.
7. **Panel.** El índice de cumplimiento es el promedio del contrato y el manifiesto activos; la actividad reciente registra cada paso.

## Documentos de ejemplo (si no tiene los propios a mano)

Disponibles dentro de la sesión:

- Contrato: `/fixtures/contrato-grupo-nf-ingenio-providencia.pdf` y `.docx`
- Manifiesto: `/fixtures/manifiesto-01278713.pdf`
- Manifiesto con datos ficticios, para ver las reglas de 8 horas, plazo de pago y SICE-TAC: `/fixtures/manifiesto-prueba-ficticio.pdf`

## Límites de esta versión

- El acceso es de un solo botón: cualquier persona con la dirección entra. No comparta la URL fuera de la prueba.
- Tope diario de 150 consultas a la IA y de 300 créditos en registros oficiales; los registros oficiales consultados en vivo pueden tardar o no responder por momentos.
- Archivos de hasta 4 MB.

## Para el equipo (reiniciar la prueba)

Para dejar el espacio vacío de nuevo sin borrar nada: `npx tsx scripts/archivar-espacio.mts principal <nombre-del-archivo>` (p. ej. `prueba-cliente-1`).
