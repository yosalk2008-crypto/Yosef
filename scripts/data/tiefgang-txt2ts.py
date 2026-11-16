"""
Turns a simple text file into Tiefgang topic questions and appends them to lib/data/tiefgang-themen/<thema>.ts.

Format (blank lines separate questions):
    ## key | Deutsche Frage | Deutscher Hinweis | English question | English hint
    Antwort|Alias|English name
    …(one answer per line, best-known first, rarest last)

    python3 scripts/data/tiefgang-txt2ts.py serien /tmp/serien.txt
"""
import json, sys

thema, src = sys.argv[1], sys.argv[2]
blocks, cur = [], None
for raw in open(src, encoding="utf8"):
    line = raw.strip()
    if not line:
        continue
    if line.startswith("## "):
        parts = [p.strip() for p in line[3:].split(" | ")]
        if len(parts) != 5:
            sys.exit(f"Kopfzeile braucht 5 Teile: {line}")
        cur = {"key": parts[0], "text": parts[1], "hint": parts[2], "en": [parts[3], parts[4]], "answers": []}
        blocks.append(cur)
    else:
        if cur is None:
            sys.exit("Antwort vor der ersten Frage: " + line)
        cur["answers"].append(line)
out = []
for b in blocks:
    out.append("  {\n" + "\n".join([
        f"    key: {json.dumps(b['key'], ensure_ascii=False)},",
        f"    text: {json.dumps(b['text'], ensure_ascii=False)},",
        f"    hint: {json.dumps(b['hint'], ensure_ascii=False)},",
        f"    en: {json.dumps(b['en'], ensure_ascii=False)},",
        "    answers: [",
    ] + [f"      {json.dumps(a, ensure_ascii=False)}," for a in b["answers"]] + ["    ],"]) + "\n  },")
p = f"lib/data/tiefgang-themen/{thema}.ts"
s = open(p, encoding="utf8").read().rstrip()
assert s.endswith("];"), p
s = s[:-2].rstrip() + "\n" + "\n".join(out) + "\n];\n"
open(p, "w", encoding="utf8").write(s)
print(f"{len(blocks)} Fragen an {p} angehängt")
