-- Integración con Croma (registros oficiales de Colombia): caché, consumo de créditos,
-- fichas de contraparte, procesos judiciales monitoreados y verificación del vehículo del manifiesto.
-- Idempotente, no borra datos.

-- Respuestas de Croma reutilizables (ahorra créditos). La clave es endpoint + cuerpo normalizado.
create table if not exists lc_croma_cache (
  clave       text primary key,
  endpoint    text not null,
  respuesta   jsonb not null,
  created_at  timestamptz not null default now()
);

-- Cada llamada a Croma: créditos estimados y saldo informado por Croma.
create table if not exists lc_croma_uso (
  id                  uuid primary key default gen_random_uuid(),
  endpoint            text not null,
  creditos            int not null default 0,
  cache_hit           boolean not null default false,
  status              int,
  creditos_restantes  int,
  created_at          timestamptz not null default now()
);
create index if not exists lc_croma_uso_created_idx on lc_croma_uso (created_at desc);

-- Ficha de due diligence de la empresa de transporte (contraparte), por NIT.
create table if not exists lc_contrapartes (
  id            uuid primary key default gen_random_uuid(),
  nit           text not null unique,
  nombre        text,
  rues          jsonb,
  procesos      jsonb,
  sanciones     jsonb,
  procuraduria  jsonb,
  hallazgos     jsonb not null default '[]'::jsonb,
  score         numeric(3,1),
  consultado_at timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- Procesos judiciales en seguimiento (por radicado). activo=false deja de consultarse (no se borra).
create table if not exists lc_procesos (
  id                 uuid primary key default gen_random_uuid(),
  radicado           text not null unique,
  alias              text,
  activo             boolean not null default true,
  encontrado         boolean,
  caso               jsonb,
  acciones           jsonb not null default '[]'::jsonb,
  ultima_actuacion   date,
  nuevas             int not null default 0,
  consultado_at      timestamptz,
  created_at         timestamptz not null default now()
);

-- Verificación del vehículo del manifiesto contra RUNT y SIMIT.
alter table lc_manifiestos add column if not exists verificacion jsonb;

alter table lc_croma_cache enable row level security;
alter table lc_croma_uso enable row level security;
alter table lc_contrapartes enable row level security;
alter table lc_procesos enable row level security;
