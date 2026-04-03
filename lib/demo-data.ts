// Demo data for Constructora Andina S.A.S.

export const companyInfo = {
  name: "Constructora Andina S.A.S.",
  nit: "900.234.567-1",
  currentScore: 2.8,
  previousScore: 3.2,
  potentialScore: 4.6,
  plan: "Enterprise",
}

export const riskAreas = [
  { name: "Legal", score: 1.5, level: "CRÍTICO", color: "port-red" },
  { name: "Laboral", score: 2.0, level: "ALTO", color: "port-red" },
  { name: "Contratos", score: 2.5, level: "ALTO", color: "port-red" },
  { name: "Licencias", score: 2.8, level: "MEDIO", color: "amber-warning" },
  { name: "Corporativo", score: 3.5, level: "MEDIO", color: "amber-warning" },
  { name: "Tributario", score: 4.2, level: "BAJO", color: "starboard-green" },
]

export const scoreHistory = [
  { month: "Oct 2024", score: 3.4, trend: 3.4 },
  { month: "Nov 2024", score: 3.3, trend: 3.2 },
  { month: "Dic 2024", score: 3.1, trend: 3.0 },
  { month: "Ene 2025", score: 3.0, trend: 2.8 },
  { month: "Feb 2025", score: 2.9, trend: 2.6 },
  { month: "Mar 2025", score: 2.8, trend: 2.4 },
]

export const criticalFindings = [
  {
    id: "F001",
    title: "Contrato de obra sin pólizas de cumplimiento vigentes",
    area: "Legal",
    areaColor: "port-red",
    riskLevel: "Alto",
    moneyAtRisk: 450000000,
    scoreImpact: 0.6,
    status: "Abierto",
    description: "Se identificó que el contrato de obra civil con Consorcio Bogotá Norte (valor: $4.500M COP) carece de póliza de cumplimiento vigente desde el 15 de enero de 2025. Esto expone a la empresa a riesgos de incumplimiento sin respaldo financiero.",
    legalBasis: ["Código de Comercio Art. 1045", "Ley 80 de 1993"],
    sourceDocument: "contrato_obra_CBN_2024.pdf",
    recommendation: "Gestionar inmediatamente la renovación de la póliza de cumplimiento con la aseguradora. Plazo sugerido: 5 días hábiles.",
  },
  {
    id: "F002",
    title: "Demanda laboral activa por despido sin justa causa",
    area: "Laboral",
    areaColor: "port-red",
    riskLevel: "Alto",
    moneyAtRisk: 280000000,
    scoreImpact: 0.5,
    status: "Abierto",
    description: "Demanda interpuesta por ex-empleado Juan Carlos Méndez (Ingeniero Residente) alegando despido sin justa causa. Pretensiones: indemnización, salarios caídos y bonificaciones pendientes por $280M COP.",
    legalBasis: ["CST Art. 64", "CST Art. 65"],
    sourceDocument: "demanda_laboral_JCM_2025.pdf",
    recommendation: "Revisar expediente con asesor laboral especializado. Evaluar acuerdo conciliatorio antes de audiencia programada para abril 2025.",
  },
  {
    id: "F003",
    title: "Licencia de construcción próxima a vencer",
    area: "Licencias",
    areaColor: "amber-warning",
    riskLevel: "Alto",
    moneyAtRisk: 120000000,
    scoreImpact: 0.4,
    status: "Abierto",
    description: "La licencia de construcción No. LC-2023-4521 para el proyecto Torres del Parque vence el 30 de abril de 2025. Sin renovación, las obras deberán suspenderse.",
    legalBasis: ["Decreto 1077 de 2015", "Ley 388 de 1997"],
    sourceDocument: "licencia_LC2023-4521.pdf",
    recommendation: "Iniciar trámite de prórroga ante Curaduría Urbana No. 3 mínimo 30 días antes del vencimiento.",
  },
]

export const allFindings = [
  ...criticalFindings,
  {
    id: "F004",
    title: "Contratos con subcontratistas sin verificación de parafiscales",
    area: "Contratos",
    areaColor: "amber-warning",
    riskLevel: "Medio",
    moneyAtRisk: 85000000,
    scoreImpact: 0.3,
    status: "En proceso",
    description: "3 subcontratistas activos no han presentado certificación de pago de aportes parafiscales (SENA, ICBF, Cajas) correspondiente a los últimos 2 meses.",
    legalBasis: ["Ley 789 de 2002", "Ley 828 de 2003"],
    sourceDocument: "listado_subcontratistas_2025.xlsx",
    recommendation: "Solicitar certificaciones actualizadas. Considerar retención de pagos hasta regularización según cláusula contractual 8.3.",
  },
  {
    id: "F005",
    title: "Actualización de RUT pendiente por cambio de actividad",
    area: "Tributario",
    areaColor: "amber-warning",
    riskLevel: "Medio",
    moneyAtRisk: 25000000,
    scoreImpact: 0.2,
    status: "Resuelto",
    description: "El RUT requería actualización por inclusión de actividad económica 4111 (Construcción de edificios residenciales). Ya fue actualizado el 5 de marzo de 2025.",
    legalBasis: ["Estatuto Tributario Art. 555-2"],
    sourceDocument: "RUT_actualizado_mar2025.pdf",
    recommendation: "N/A - Hallazgo resuelto.",
  },
  {
    id: "F006",
    title: "Actas de asamblea de accionistas sin registro",
    area: "Corporativo",
    areaColor: "amber-warning",
    riskLevel: "Medio",
    moneyAtRisk: 0,
    scoreImpact: 0.25,
    status: "Abierto",
    description: "Las actas de asamblea ordinaria de marzo 2024 y extraordinaria de agosto 2024 no fueron inscritas ante Cámara de Comercio dentro del término legal.",
    legalBasis: ["C.Co. Art. 189", "C.Co. Art. 195"],
    sourceDocument: "actas_asamblea_2024.pdf",
    recommendation: "Realizar inscripción extemporánea ante Cámara de Comercio de Bogotá. Posible sanción administrativa menor.",
  },
  {
    id: "F007",
    title: "Afiliación a ARL con cobertura insuficiente",
    area: "Laboral",
    areaColor: "amber-warning",
    riskLevel: "Medio",
    moneyAtRisk: 45000000,
    scoreImpact: 0.2,
    status: "Abierto",
    description: "15 trabajadores de obra están afiliados bajo clase de riesgo III cuando deberían estar en clase IV según las actividades que desempeñan.",
    legalBasis: ["Decreto 1295 de 1994", "Decreto 1607 de 2002"],
    sourceDocument: "nomina_empleados_feb2025.xlsx",
    recommendation: "Solicitar reclasificación de riesgo ante la ARL Sura. Ajustar cotizaciones a partir del siguiente período.",
  },
]

export const documents = [
  {
    id: "DOC001",
    filename: "contrato_obra_CBN_2024.pdf",
    area: "Legal",
    uploadDate: "2025-01-15",
    status: "Analizado",
    size: "2.4 MB",
  },
  {
    id: "DOC002",
    filename: "demanda_laboral_JCM_2025.pdf",
    area: "Laboral",
    uploadDate: "2025-02-20",
    status: "Analizado",
    size: "1.8 MB",
  },
  {
    id: "DOC003",
    filename: "licencia_LC2023-4521.pdf",
    area: "Licencias",
    uploadDate: "2025-01-10",
    status: "Analizado",
    size: "5.2 MB",
  },
  {
    id: "DOC004",
    filename: "listado_subcontratistas_2025.xlsx",
    area: "Contratos",
    uploadDate: "2025-03-01",
    status: "Analizado",
    size: "856 KB",
  },
  {
    id: "DOC005",
    filename: "RUT_actualizado_mar2025.pdf",
    area: "Tributario",
    uploadDate: "2025-03-05",
    status: "Analizado",
    size: "245 KB",
  },
  {
    id: "DOC006",
    filename: "estados_financieros_2024.pdf",
    area: "Corporativo",
    uploadDate: "2025-03-10",
    status: "Procesando...",
    size: "3.1 MB",
  },
  {
    id: "DOC007",
    filename: "certificados_parafiscales_feb2025.pdf",
    area: "Laboral",
    uploadDate: "2025-03-12",
    status: "Pendiente",
    size: "1.2 MB",
  },
]

export const simulatorItems = [
  {
    id: "SIM001",
    findingId: "F001",
    title: "Renovar pólizas de cumplimiento",
    area: "Legal",
    priority: "URGENTE",
    scoreImpact: 0.6,
    resolved: false,
  },
  {
    id: "SIM002",
    findingId: "F002",
    title: "Resolver demanda laboral",
    area: "Laboral",
    priority: "URGENTE",
    scoreImpact: 0.5,
    resolved: false,
  },
  {
    id: "SIM003",
    findingId: "F003",
    title: "Renovar licencia de construcción",
    area: "Licencias",
    priority: "URGENTE",
    scoreImpact: 0.4,
    resolved: false,
  },
  {
    id: "SIM004",
    findingId: "F004",
    title: "Verificar parafiscales de subcontratistas",
    area: "Contratos",
    priority: "PRIORIDAD",
    scoreImpact: 0.3,
    resolved: false,
  },
  {
    id: "SIM005",
    findingId: "F005",
    title: "Actualizar RUT",
    area: "Tributario",
    priority: "MEDIO",
    scoreImpact: 0.2,
    resolved: true,
  },
  {
    id: "SIM006",
    findingId: "F006",
    title: "Registrar actas de asamblea",
    area: "Corporativo",
    priority: "MEDIO",
    scoreImpact: 0.25,
    resolved: false,
  },
]

export const chatResponses: Record<string, string> = {
  "Mayor riesgo legal": `**Análisis de Riesgo Legal Principal**

El mayor riesgo legal identificado es el **Contrato de obra sin pólizas de cumplimiento vigentes** (Hallazgo F001).

**Detalles:**
- Contrato afectado: Consorcio Bogotá Norte
- Valor en riesgo: **$450.000.000 COP**
- Vencimiento de póliza: 15 de enero de 2025
- Impacto en score: +0.6 puntos si se resuelve

**Marco legal aplicable:**
- Código de Comercio Art. 1045
- Ley 80 de 1993 (Contratación Estatal)

**Recomendación inmediata:**
Contactar a la aseguradora dentro de las próximas 48 horas para gestionar la renovación de la póliza. Sin esta garantía, cualquier incumplimiento del contratista no tendrá respaldo financiero.`,

  "¿Qué resolver primero?": `**Priorización de Hallazgos**

Basado en el análisis de impacto y urgencia, recomiendo resolver en este orden:

1. **Pólizas de cumplimiento** (F001) - URGENTE
   - Impacto: +0.6 pts
   - Riesgo: $450M COP
   - Razón: Exposición inmediata sin cobertura

2. **Licencia de construcción** (F003) - URGENTE
   - Impacto: +0.4 pts
   - Vence: 30 abril 2025
   - Razón: Puede paralizar obra completa

3. **Demanda laboral** (F002) - ALTA
   - Impacto: +0.5 pts
   - Riesgo: $280M COP
   - Razón: Audiencia en abril 2025

Resolviendo estos 3 hallazgos, su score pasaría de **2.8 a 4.3/5** (Riesgo Bajo-Medio).`,

  "Problema contratistas": `**Análisis de Riesgo con Subcontratistas**

Se identificó un problema con la verificación de parafiscales (Hallazgo F004).

**Situación actual:**
- 3 subcontratistas sin certificación de aportes
- Meses pendientes: Enero y Febrero 2025
- Exposición: Responsabilidad solidaria según Ley 789/2002

**Valor en riesgo:** $85.000.000 COP

**Subcontratistas afectados:**
1. Estructuras Metálicas del Norte S.A.S.
2. Instalaciones Eléctricas JR Ltda.
3. Acabados Profesionales S.A.

**Acción recomendada:**
Según cláusula 8.3 de sus contratos, puede retener pagos hasta recibir certificaciones. Envíe comunicación formal con plazo de 5 días hábiles.`,

  "Score potencial": `**Simulación de Score Potencial**

**Score actual:** 2.8/5 (Riesgo Moderado-Alto)

Si resuelve TODOS los hallazgos pendientes:
**Score proyectado:** 4.6/5 (Riesgo Bajo)

**Desglose por resolución:**
| Hallazgo | Impacto |
|----------|---------|
| Pólizas de cumplimiento | +0.60 |
| Demanda laboral | +0.50 |
| Licencia construcción | +0.40 |
| Parafiscales subcontratistas | +0.30 |
| Actas de asamblea | +0.25 |
| Afiliación ARL | +0.20 |
| **Total potencial** | **+2.25** |

El RUT ya fue actualizado (+0.2 pts aplicados).

**Recomendación:** Enfóquese en los 3 hallazgos urgentes para alcanzar rápidamente 4.3/5.`,

  "Documentos faltantes": `**Documentos Pendientes de Análisis**

**En procesamiento:**
1. estados_financieros_2024.pdf
   - Estado: Procesando...
   - ETA: 2 horas
   - Área: Corporativo

**Pendientes de carga:**
2. certificados_parafiscales_feb2025.pdf
   - Estado: Pendiente
   - Acción: Requiere revisión manual

**Documentos sugeridos para completar análisis:**

- [ ] Certificado de existencia y representación legal (actualizado 2025)
- [ ] Pólizas de responsabilidad civil vigentes
- [ ] Matriz de riesgos laborales actualizada
- [ ] Certificación bancaria reciente

¿Desea que genere un checklist de documentos para cada área de riesgo?`,
}

export const formatCOP = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
