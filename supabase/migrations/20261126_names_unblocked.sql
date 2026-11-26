-- Name blocklist off (user's wish, 26.11.): leaderboard names are no longer checked against name_is_blocked().
-- The function stays in the database; to switch it back on, add "and not public.name_is_blocked(name)" to the check.
drop policy "anyone can add today's score" on public.scores;
create policy "anyone can add today's score" on public.scores for insert to anon, authenticated
  with check (day between current_date - 1 and current_date + 1);
