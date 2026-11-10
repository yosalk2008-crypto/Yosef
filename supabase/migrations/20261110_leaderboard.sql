-- Geografik leaderboard: one row per player, day and game. Insert-only for the public; reads via RPC.
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  day date not null,
  game text not null check (game in ('laenderjagd','massstab','viererbande','hoeher-tiefer','spitzenplatz','farbecht','grenzgang','zeitreise','tiefgang')),
  player_id uuid not null,
  name text not null check (char_length(name) between 2 and 20 and name ~ '^[[:alnum:] ._-]+$'),
  points int not null check (points between 0 and 100),
  label text check (label is null or char_length(label) <= 40),
  unique (day, game, player_id)
);

create index if not exists scores_day_idx on public.scores (day, game);
create index if not exists scores_player_idx on public.scores (player_id, created_at desc);

alter table public.scores enable row level security;

drop policy if exists "anyone can add today's score" on public.scores;
create policy "anyone can add today's score" on public.scores
  for insert to anon, authenticated
  with check (day between current_date - 1 and current_date + 1);

revoke all on public.scores from anon, authenticated;
grant insert (day, game, player_id, name, points, label) on public.scores to anon, authenticated;

-- Ranking: p_day null = all time, p_game null = sum over all games. Never exposes player ids.
create or replace function public.leaderboard(p_day date default null, p_game text default null, p_me uuid default null)
returns table (rank int, name text, points int, label text, games int, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with filtered as (
    select s.player_id, s.name, s.points, s.label, s.created_at
    from public.scores s
    where (p_day is null or s.day = p_day)
      and (p_game is null or s.game = p_game)
  ),
  agg as (
    select f.player_id,
           sum(f.points)::int as points,
           count(*)::int as games,
           (array_agg(f.label order by f.created_at desc))[1] as label,
           min(f.created_at) as first_at
    from filtered f
    group by f.player_id
  ),
  named as (
    select a.*,
           (select s.name from public.scores s where s.player_id = a.player_id order by s.created_at desc limit 1) as name
    from agg a
  ),
  ranked as (
    select (rank() over (order by n.points desc))::int as rank, n.name, n.points,
           case when p_game is null then null else n.label end as label,
           n.games, (n.player_id = p_me) as is_me, n.first_at
    from named n
  )
  select r.rank, r.name, r.points, r.label, r.games, coalesce(r.is_me, false)
  from ranked r
  where r.rank <= 100 or r.is_me
  order by r.rank, r.first_at
  limit 101;
$$;

revoke all on function public.leaderboard(date, text, uuid) from public;
grant execute on function public.leaderboard(date, text, uuid) to anon, authenticated;
