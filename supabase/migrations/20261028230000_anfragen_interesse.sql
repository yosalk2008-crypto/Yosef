-- Statt eines Pakets wählen Interessenten jetzt eine oder mehrere Leistungen
alter table public.anfragen add column if not exists interesse text check (char_length(interesse) <= 400);
grant insert (interesse) on public.anfragen to anon;
