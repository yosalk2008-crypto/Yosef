#!/usr/bin/env python3
"""
Builds the full place lists for the Tiefgang city questions ("Nenne eine Stadt in Italien." …):
every populated place with at least 500 inhabitants from GeoNames (cities500, CC BY 4.0),
written to public/tiefgang/orte/<question key>.json and loaded by the browser only when such a question comes up.
The hand-rated answers in lib/data/tiefgang-katalog*.ts stay as they are and keep their points;
these files only add the places nobody rated. Points of an added place follow its population (rarer = more).

  mkdir -p /home/claude/data/geonames && cd /home/claude/data/geonames
  curl -sSfO https://download.geonames.org/export/dump/cities500.zip && unzip -o cities500.zip
  python3 scripts/data/tiefgang-orte.py /home/claude/data/geonames/cities500.txt
"""
import json, math, os, re, sys, unicodedata

SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/data/geonames/cities500.txt"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "tiefgang", "orte")

# question key -> (country code, admin1 code or None)
Q = {
    "stadt-italien": ("IT", None), "stadt-usa": ("US", None), "stadt-frankreich": ("FR", None), "stadt-spanien": ("ES", None), "stadt-tuerkei": ("TR", None),
    "stadt-gb": ("GB", None), "stadt-polen": ("PL", None), "stadt-russland": ("RU", None), "stadt-japan": ("JP", None), "stadt-china": ("CN", None),
    "stadt-indien": ("IN", None), "stadt-brasilien": ("BR", None), "stadt-mexiko": ("MX", None), "stadt-kanada": ("CA", None), "stadt-australien": ("AU", None),
    "stadt-niederlande": ("NL", None), "stadt-belgien": ("BE", None), "stadt-schweiz": ("CH", None), "stadt-oesterreich": ("AT", None), "stadt-schweden": ("SE", None),
    "stadt-portugal": ("PT", None), "stadt-griechenland": ("GR", None), "stadt-ukraine": ("UA", None), "stadt-rumaenien": ("RO", None), "stadt-tschechien": ("CZ", None),
    "stadt-ungarn": ("HU", None), "stadt-argentinien": ("AR", None), "stadt-suedkorea": ("KR", None), "stadt-indonesien": ("ID", None), "stadt-iran": ("IR", None),
    "stadt-daenemark": ("DK", None), "stadt-norwegen": ("NO", None), "stadt-finnland": ("FI", None), "stadt-irland": ("IE", None), "stadt-marokko": ("MA", None),
    "stadt-aegypten": ("EG", None), "stadt-pakistan": ("PK", None), "stadt-kroatien": ("HR", None),
    "stadt-bw": ("DE", "01"), "stadt-bayern": ("DE", "02"), "stadt-hessen": ("DE", "05"), "stadt-nds": ("DE", "06"), "stadt-nrw": ("DE", "07"),
    "stadt-rlp": ("DE", "08"), "stadt-sh": ("DE", "10"), "stadt-brandenburg": ("DE", "11"), "stadt-mv": ("DE", "12"), "stadt-sachsen": ("DE", "13"),
    "stadt-sachsen-anhalt": ("DE", "14"), "stadt-thueringen": ("DE", "15"),
    "stadt-kalifornien": ("US", "CA"), "stadt-texas": ("US", "TX"), "stadt-florida": ("US", "FL"),
}
SKIP = {"PPLX", "PPLH", "PPLQ", "PPLW", "PPLCH"}  # parts of towns, historical, abandoned, destroyed
JUNK = re.compile(r"^(lungsod|citta|città|comune|city|municipality|gemeinde|provincia|province|distrikt|district|ciudad de|cidade de|ville de|stadt )", re.I)
LATIN = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ɏḀ-ỿ'’ .\-]+$")

def norm(s):
    s = unicodedata.normalize("NFKD", s.lower().replace("ß", "ss"))
    return re.sub(r"[^a-z0-9]", "", "".join(ch for ch in s if not unicodedata.combining(ch)))

def pts(pop):
    # 500 inhabitants -> 96, 1 million -> 60 (the hand-rated big cities are not in these files anyway)
    x = (math.log10(max(pop, 500)) - math.log10(500)) / (6 - math.log10(500))
    return int(round(max(60, min(96, 96 - 36 * x))))

rows = {k: {} for k in Q}
want = {}
for k, (cc, a1) in Q.items():
    want.setdefault(cc, []).append((k, a1))
with open(SRC, encoding="utf-8") as f:
    for line in f:
        c = line.rstrip("\n").split("\t")
        cc, fc = c[8], c[7]
        if cc not in want or fc in SKIP:
            continue
        name, ascii_, alts, a1, pop = c[1], c[2], c[3], c[10], int(c[14] or 0)
        if pop < 500 or not LATIN.match(name):
            name = ascii_ if LATIN.match(ascii_ or "") else None
        if not name:
            continue
        al = []
        seen = {norm(name)}
        cand = [ascii_] + ([x for x in alts.split(",")] if pop >= 20000 else [])
        for x in cand:
            x = x.strip()
            if not x or len(x) > 40 or not LATIN.match(x) or (x.isupper() and len(x) <= 4) or JUNK.match(x):
                continue
            n = norm(x)
            if len(n) < 3 or n in seen:
                continue
            seen.add(n)
            al.append(x)
            if len(al) >= 14:
                break
        for k, want_a1 in want[cc]:
            if want_a1 and a1 != want_a1:
                continue
            key = norm(name)
            old = rows[k].get(key)
            if old is None or pop > old[0]:
                rows[k][key] = (pop, name, al)

os.makedirs(OUT, exist_ok=True)
total = 0
for k, d in rows.items():
    items = sorted(d.values(), key=lambda r: -r[0])
    data = [[name, pts(pop), *al] for pop, name, al in items]
    with open(os.path.join(OUT, f"{k}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    total += len(data)
    print(f"{k:24} {len(data):6}")
print("total", total)
