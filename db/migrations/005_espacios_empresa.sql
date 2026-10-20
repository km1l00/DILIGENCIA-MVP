-- Espacios de trabajo: los datos de prueba existentes se archivan en el espacio 'demo' (no se borran)
-- y el cliente arranca vacío en 'principal'. Las normas son datos de dominio compartidos y no tienen espacio.
-- Idempotente: el archivado solo marca filas que aún no tienen espacio asignado.

do $$
declare t text;
begin
  foreach t in array array['lc_contratos','lc_manifiestos','lc_chat','lc_boletines','lc_eventos','lc_contrapartes','lc_procesos'] loop
    if not exists (select 1 from information_schema.columns where table_name = t and column_name = 'espacio') then
      -- Las filas que ya existían quedan en 'demo'; las nuevas toman 'principal' por defecto
      execute format('alter table %I add column espacio text not null default %L', t, 'demo');
      execute format('alter table %I alter column espacio set default %L', t, 'principal');
      execute format('create index if not exists %I on %I (espacio)', t || '_espacio_idx', t);
    end if;
  end loop;
end $$;

-- Unicidad por espacio (antes era global)
alter table lc_contrapartes drop constraint if exists lc_contrapartes_nit_key;
create unique index if not exists lc_contrapartes_espacio_nit_key on lc_contrapartes (espacio, nit);
alter table lc_procesos drop constraint if exists lc_procesos_radicado_key;
create unique index if not exists lc_procesos_espacio_radicado_key on lc_procesos (espacio, radicado);

-- Perfil de la empresa cliente (el generador de carga), uno por espacio
create table if not exists lc_empresa (
  espacio        text primary key,
  nit            text not null,
  dv             text,
  razon_social   text not null,
  camara         text,
  actividad      text,
  ciiu           text,
  municipio      text,
  estado         text,
  representantes jsonb not null default '[]'::jsonb,
  fuente         text not null default 'manual',   -- rues | manual
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table lc_empresa enable row level security;
