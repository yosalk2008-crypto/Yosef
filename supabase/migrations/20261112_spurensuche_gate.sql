-- Spurensuche: on/off switch + daily game limit (Google Street View costs money per game).
-- Change in Supabase: update spurensuche_config set enabled = false;  /  set daily_limit = 300;
create table if not exists public.spurensuche_config (id int primary key default 1 check (id = 1), enabled boolean not null default true, daily_limit int not null default 150);
insert into public.spurensuche_config (id) values (1) on conflict do nothing;
create table if not exists public.spurensuche_plays (day date primary key, games int not null default 0);
alter table public.spurensuche_config enable row level security;
alter table public.spurensuche_plays enable row level security;
create or replace function public.spurensuche_gate(p_new boolean default true) returns boolean language plpgsql security definer set search_path = public as $$
declare cfg public.spurensuche_config; n int;
begin
  select * into cfg from public.spurensuche_config where id = 1;
  if cfg is null or not cfg.enabled then return false; end if;
  if not p_new then return true; end if;
  insert into public.spurensuche_plays as p (day, games) values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update set games = p.games + 1 where p.games < cfg.daily_limit
  returning games into n;
  return n is not null;
end; $$;
revoke all on function public.spurensuche_gate(boolean) from public;
grant execute on function public.spurensuche_gate(boolean) to anon, authenticated;
