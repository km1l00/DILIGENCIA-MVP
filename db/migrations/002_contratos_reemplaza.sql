-- Cláusula del contrato original que reemplaza cada hallazgo (null = cláusula nueva) y encabezado del contrato.
alter table lc_contrato_hallazgos add column if not exists reemplaza text;
alter table lc_contratos add column if not exists encabezado text;
