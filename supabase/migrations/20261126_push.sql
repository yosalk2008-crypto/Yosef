-- Daily reminder (web push). Browsers that allowed notifications store their push subscription here.
-- Nobody can read the table directly (RLS on, no policies); everything goes through these functions:
--   push_subscribe / push_unsubscribe  – called by the browser with the public (anon) key
--   push_list / push_remove            – called by /api/push/daily with a secret (only its SHA-256 is stored)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and length(endpoint) < 1000),
  p256dh text not null check (length(p256dh) < 200),
  auth text not null check (length(auth) < 100),
  lang text not null default 'de' check (lang in ('de', 'en')),
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

create table if not exists public.push_secret (id int primary key default 1 check (id = 1), hash text not null);
alter table public.push_secret enable row level security;
-- the hash of the sender's secret is inserted separately (not in this file)

create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_lang text default 'de')
returns void language sql security definer set search_path = public as $$
  insert into public.push_subscriptions (endpoint, p256dh, auth, lang)
  values (p_endpoint, p_p256dh, p_auth, case when p_lang = 'en' then 'en' else 'de' end)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
$$;

create or replace function public.push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

create or replace function public.push_list(p_secret text)
returns table (endpoint text, p256dh text, auth text, lang text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.push_secret where hash = encode(digest(p_secret, 'sha256'), 'hex')) then
    raise exception 'not allowed';
  end if;
  return query select s.endpoint, s.p256dh, s.auth, s.lang from public.push_subscriptions s;
end $$;

create or replace function public.push_remove(p_secret text, p_endpoints text[])
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.push_secret where hash = encode(digest(p_secret, 'sha256'), 'hex')) then
    raise exception 'not allowed';
  end if;
  delete from public.push_subscriptions where endpoint = any(p_endpoints);
end $$;

revoke all on function public.push_list(text) from public;
revoke all on function public.push_remove(text, text[]) from public;
grant execute on function public.push_subscribe(text, text, text, text) to anon, authenticated;
grant execute on function public.push_unsubscribe(text) to anon, authenticated;
grant execute on function public.push_list(text) to anon, authenticated;
grant execute on function public.push_remove(text, text[]) to anon, authenticated;
