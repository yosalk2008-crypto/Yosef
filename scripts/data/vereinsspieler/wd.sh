#!/bin/bash
cat > /tmp/q_$1.rq <<Q
SELECT ?p ?pLabel ?enLabel ?sl ?enT ?deT ?loT (YEAR(MIN(?b)) AS ?born) (MIN(YEAR(?s)) AS ?von) (MAX(YEAR(?e)) AS ?bis) WHERE {
  ?p p:P54 ?st . ?st ps:P54 wd:$1 . OPTIONAL { ?st pq:P580 ?s } OPTIONAL { ?st pq:P582 ?e }
  ?p wdt:P106 wd:Q937857 . ?p wikibase:sitelinks ?sl . OPTIONAL { ?p wdt:P569 ?b }
  OPTIONAL { ?p rdfs:label ?enLabel FILTER(LANG(?enLabel)="en") }
  OPTIONAL { ?a schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enT }
  OPTIONAL { ?d schema:about ?p ; schema:isPartOf <https://de.wikipedia.org/> ; schema:name ?deT }
  OPTIONAL { ?l schema:about ?p ; schema:isPartOf <https://$2.wikipedia.org/> ; schema:name ?loT }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en,es,it,fr" }
} GROUP BY ?p ?pLabel ?enLabel ?sl ?enT ?deT ?loT
Q
for i in 1 2 3 4; do
curl -sS -m 150 -A "koshertrivia-data/1.0 (quiz game; low volume)" -H "Accept: text/csv" --data-urlencode query@/tmp/q_$1.rq https://query.wikidata.org/sparql -o "$3"
head -c 5 "$3" | grep -q "^p,p" && break; sleep 30; done
echo "$3 $(wc -l <"$3")"
