-- Logicompliance (demo real) — esquema inicial.
-- Tablas con prefijo lc_ para no interferir con las del MVP original (tenants, findings, documents...).
-- Idempotente: se puede correr varias veces sin borrar datos.

create extension if not exists pgcrypto;

-- Normas del sector transporte (solo normas reales con enlace oficial)
create table if not exists lc_normas (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,          -- p. ej. "Decreto 1079 de 2015"
  entidad       text not null,
  tipo          text not null,
  estado        text not null default 'vigente', -- vigente | nueva | actualizada | proyecto
  fecha         text,                           -- fecha de publicación tal como la reporta la fuente
  vigencia      text,
  cat           text not null,
  tema          text,
  titulo        text not null,
  resumen       text not null,
  puntos        jsonb not null default '[]'::jsonb,
  impacto       text,
  url           text not null,
  url_status    int,
  url_checked_at timestamptz,
  origen        text not null default 'seed',   -- seed | analisis
  fuente        text,                           -- página oficial donde se detectó
  created_at    timestamptz not null default now()
);

-- Boletines semanales generados
create table if not exists lc_boletines (
  id          uuid primary key default gen_random_uuid(),
  numero      int not null,
  periodo     text not null,
  contenido   jsonb not null,                   -- { intro, secciones:[{entidad, items:[{codigo,titulo,tema,resumen,url}]}] }
  modelo      text,
  created_at  timestamptz not null default now()
);

-- Contratos analizados
create table if not exists lc_contratos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  partes          text,
  fecha           text,
  archivo_nombre  text,
  archivo_path    text,                         -- ruta en Storage (bucket lc-docs)
  texto_original  text not null,
  clausulas       jsonb not null default '[]'::jsonb,   -- [{t, body, status: same|mod|new, hallazgo?}]
  num_clausulas   int,
  score_base      numeric(3,1) not null,
  score           numeric(3,1) not null,
  resumen         text,
  modelo          text,
  activo          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists lc_contrato_hallazgos (
  id              uuid primary key default gen_random_uuid(),
  contrato_id     uuid not null references lc_contratos(id) on delete cascade,
  codigo          text not null,                -- C1, C2...
  risk            text not null,                -- alto | medio | bajo
  area            text,
  titulo          text not null,
  descr           text,
  base            jsonb not null default '[]'::jsonb,
  old_text        text,
  new_text        text not null,
  clausula_titulo text,                         -- título de la cláusula mejorada que la reemplaza/agrega
  impacto         numeric(3,1) not null default 0,
  implementado    boolean not null default false,
  implementado_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (contrato_id, codigo)
);

-- Manifiestos de carga revisados
create table if not exists lc_manifiestos (
  id              uuid primary key default gen_random_uuid(),
  numero          text,
  archivo_nombre  text,
  archivo_path    text,
  datos           jsonb not null,               -- datos extraídos
  campos          jsonb not null,               -- verificación de los 13 campos (en código)
  hallazgos       jsonb not null,               -- hallazgos (reglas en código + redacción)
  score           numeric(3,1) not null,
  modelo          text,
  activo          boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Actividad reciente del panel
create table if not exists lc_eventos (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null,                    -- manifiesto | norma | contrato | boletin
  titulo      text not null,
  detalle     text,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

-- Historial del asistente
create table if not exists lc_chat (
  id          uuid primary key default gen_random_uuid(),
  conversacion text not null default 'principal',
  role        text not null,                    -- user | assistant
  content     text not null,
  norma_codigo text,
  modelo      text,
  created_at  timestamptz not null default now()
);

create index if not exists lc_eventos_created_idx on lc_eventos (created_at desc);
create index if not exists lc_chat_conv_idx on lc_chat (conversacion, created_at);
create index if not exists lc_normas_created_idx on lc_normas (created_at desc);

-- RLS activado sin políticas: solo el servidor (service_role) lee y escribe.
alter table lc_normas enable row level security;
alter table lc_boletines enable row level security;
alter table lc_contratos enable row level security;
alter table lc_contrato_hallazgos enable row level security;
alter table lc_manifiestos enable row level security;
alter table lc_eventos enable row level security;
alter table lc_chat enable row level security;
