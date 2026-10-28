-- Tabelle für Anfragen aus dem Website-Formular
create table if not exists public.anfragen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  firma text,
  email text not null,
  telefon text,
  paket text,
  website text,
  nachricht text not null,
  status text not null default 'neu'
);

-- Kein öffentlicher Zugriff: nur der Server (Service-Role-Key) schreibt und liest.
alter table public.anfragen enable row level security;
