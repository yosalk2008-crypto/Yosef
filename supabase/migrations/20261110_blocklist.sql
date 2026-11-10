create or replace function public.name_is_blocked(n text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  low text := translate(replace(lower(n), 'ß', 'ss'), 'àáâãäåāăąçćčďèéêëēėęěğìíîïīįıłñńňòóôõöøōőřśşšťùúûüūůűųýÿźżž', 'aaaaaaaaacccdeeeeeeeegiiiiiiilnnnoooooooorssstuuuuuuuuyyzzz');
  norm text;
  compact text;
  t text;
  p text;
begin
  foreach t in array regexp_split_to_array(lower(n), '[^[:alnum:]]+') loop
    if t <> '' and t = any(array['ass','arsch','fag','cum','tit','tits','dick','cock','prick','rape','sex','anal','anus','pedo','paedo','pado','mongo','mongoloid','opfer','homo','kkk','isis','jew','sik','pic','kus','kos','kir','kiri','kirim','suka','hui','huy','khuy','kut','porra','cono','pute','pede','pd','ntm','nazi','negro','ss','sa','hh','88','1488','18','nik','kalb','kere','gund','lul','pust','zbi','ayri','airi','hoer','tering','depp','hmar','mongool','peder','teez','neek','fresse','verga','troia','nique','ebat','ayre','cazzo']::text[]) then return true; end if;
  end loop;
  foreach p in array array['ni+g{2,}(a|ah|er|ers|az|uh)?','n[i1!]+gg']::text[] loop
    if translate(regexp_replace(low, '[^a-z0-9!]', '', 'g'), '1!', 'ii') ~ p then return true; end if;
  end loop;
  norm := translate(low, '4@301!|5$7', 'aaeoiiisst');
  foreach t in array regexp_split_to_array(norm, '[^a-z0-9]+') loop
    if t <> '' and t = any(array['ass','arsch','fag','cum','tit','tits','dick','cock','prick','rape','sex','anal','anus','pedo','paedo','pado','mongo','mongoloid','opfer','homo','kkk','isis','jew','sik','pic','kus','kos','kir','kiri','kirim','suka','hui','huy','khuy','kut','porra','cono','pute','pede','pd','ntm','nazi','negro','ss','sa','hh','88','1488','18','nik','kalb','kere','gund','lul','pust','zbi','ayri','airi','hoer','tering','depp','hmar','mongool','peder','teez','neek','fresse','verga','troia','nique','ebat','ayre','cazzo']::text[]) then return true; end if;
  end loop;
  compact := regexp_replace(regexp_replace(norm, '[^a-z0-9]', '', 'g'), '(.)\1+', '\1', 'g');
  foreach t in array array['arschloch','arschgeige','arschficker','fotze','hurensohn','hurenkind','hure','nute','schlampe','wichser','wixer','wichse','ficken','ficker','fick','misgeburt','spast','spasti','behindert','schwuchtel','kanake','kanacke','neger','zigeuner','pener','piser','scheis','kacke','drecksau','schwanzlutscher','pimel','muschi','votze','bastard','volidiot','idiot','trotel','dumkopf','hackfrese','kinderficker','kinderschander','vergewaltig','judensau','gaskamer','auschwitz','untermensch','kanaken','huso','fuck','fuk','phuck','shit','bitch','cunt','pusy','whore','slut','fagot','retard','ashole','arsehole','motherf','wanker','twat','bolock','dickhead','cocksuck','blowjob','handjob','chink','spastic','porn','rapist','pedophil','paedophil','molest','jerkof','dumbas','jackas','bulshit','terorist','teror','hitler','heilhit','siegheil','kukluxklan','alqaida','alkaida','taliban','daesh','jihadist','isisfighter','suicidebomb','kilal','orospu','aminakoy','amcik','sikerim','sikeyim','siktir','sikis','yarak','ibne','kahpe','gavat','pezevenk','gerizekali','serefsiz','kaltak','dalyarak','yavsak','sharmouta','sharmuta','sharmota','charmouta','sharmot','sharmut','kosomak','kusomak','kusumak','kosokhtak','ibnelkalb','ibnkalb','ibnalkalb','ibnharam','ibnelharam','weldelharam','ouldelharam','zebi','zeby','manyak','maniak','metnak','mitnak','khara','khra','gahba','qahba','kahba','9ahba','zamel','zirto','zerto','nayek','himar','khawal','shamuta','lahas','tizak','gundi','qehpe','qahpe','koskesh','kosnanat','kosekhar','jende','jendeh','madarjende','pedarsag','kesafat','bisharaf','puta','puto','mierda','cabron','pendejo','joder','gilipolas','maricon','culero','chinga','malparido','hijodeputa','caralho','foda','buceta','viado','filhodaputa','merda','arombado','merde','putain','salope','conard','conase','encule','batard','niquetamere','filsdepute','vafanculo','fanculo','stronzo','putana','minchia','coglione','frocio','bastardo','kurwa','chuj','pierdol','jebac','jebany','spierdalaj','blyat','blyad','bljad','pizda','pizdec','yobany','mudak','pidor','pidar','picka','jebem','jebote','kurac','govno','kanker','klotzak','godverdome','nazis']::text[] loop
    if position(t in compact) > 0 then return true; end if;
  end loop;
  return false;
end
$fn$;

drop policy if exists "anyone can add today's score" on public.scores;
create policy "anyone can add today's score" on public.scores
  for insert to anon, authenticated
  with check (day between current_date - 1 and current_date + 1 and not public.name_is_blocked(name));
