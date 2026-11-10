// Prints the SQL for public.name_is_blocked(), built from lib/data/blocklist.ts so browser and database agree.
// Run: npx tsx scripts/blocklist-sql.ts > supabase/migrations/<date>_blocklist.sql
import { PATTERNS, SUB, TOK } from "../lib/data/blocklist";

const arr = (xs: Iterable<string>) => `array[${[...xs].map((x) => `'${x.replace(/'/g, "''")}'`).join(",")}]::text[]`;
const FROM = "àáâãäåāăąçćčďèéêëēėęěğìíîïīįıłñńňòóôõöøōőřśşšťùúûüūůűųýÿźżž";
const TO = "aaaaaaaaacccdeeeeeeeegiiiiiiilnnnoooooooorssstuuuuuuuuyyzzz";
if (FROM.length !== TO.length) throw new Error("translate lengths differ");

console.log(`create or replace function public.name_is_blocked(n text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  low text := translate(replace(lower(n), 'ß', 'ss'), '${FROM}', '${TO}');
  norm text;
  compact text;
  t text;
  p text;
begin
  foreach t in array regexp_split_to_array(lower(n), '[^[:alnum:]]+') loop
    if t <> '' and t = any(${arr(TOK)}) then return true; end if;
  end loop;
  foreach p in array ${arr(PATTERNS)} loop
    if translate(regexp_replace(low, '[^a-z0-9!]', '', 'g'), '1!', 'ii') ~ p then return true; end if;
  end loop;
  norm := translate(low, '4@301!|5$7', 'aaeoiiisst');
  foreach t in array regexp_split_to_array(norm, '[^a-z0-9]+') loop
    if t <> '' and t = any(${arr(TOK)}) then return true; end if;
  end loop;
  compact := regexp_replace(regexp_replace(norm, '[^a-z0-9]', '', 'g'), '(.)\\1+', '\\1', 'g');
  foreach t in array ${arr(SUB)} loop
    if position(t in compact) > 0 then return true; end if;
  end loop;
  return false;
end
$fn$;

drop policy if exists "anyone can add today's score" on public.scores;
create policy "anyone can add today's score" on public.scores
  for insert to anon, authenticated
  with check (day between current_date - 1 and current_date + 1 and not public.name_is_blocked(name));`);
