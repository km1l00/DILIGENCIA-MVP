-- Registro de cada llamada a Claude: tope diario de gasto y contabilidad de tokens.
create table if not exists lc_ia_uso (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null,
  modelo        text,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  ok            boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists lc_ia_uso_created_idx on lc_ia_uso (created_at desc);
alter table lc_ia_uso enable row level security;
