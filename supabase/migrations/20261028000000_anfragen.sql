-- Tabelle für Anfragen aus dem Website-Formular
create table if not exists public.anfragen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  firma text check (char_length(firma) <= 160),
  email text not null check (char_length(email) between 3 and 200),
  telefon text check (char_length(telefon) <= 60),
  paket text check (char_length(paket) <= 60),
  website text check (char_length(website) <= 200),
  nachricht text not null check (char_length(nachricht) between 1 and 4000),
  status text not null default 'neu'
);

alter table public.anfragen enable row level security;

-- Die Website darf nur neue Anfragen anlegen, aber nichts lesen, ändern oder löschen.
create policy "Website darf Anfragen anlegen"
  on public.anfragen for insert
  to anon
  with check (status = 'neu');

revoke all on public.anfragen from anon, authenticated;
grant insert (name, firma, email, telefon, paket, website, nachricht) on public.anfragen to anon;
