"""Parse club player lists (Wikipedia wikitext / Wikidata CSV) into JSON:
[{"name": display, "alias": [..], "von": int|None, "bis": int|None, "apps": int|None, "sl": int|None}]"""
import csv, json, re, sys

YEAR_MIN = 1970


def strip_refs(s):
    s = re.sub(r"<ref[^>/]*/>", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    return s


def clean_target(t):
    t = t.split("#")[0].strip()
    return re.sub(r"\s*\([^)]*\)\s*$", "", t).strip()


def rows(text):
    text = strip_refs(text)
    return re.split(r"\n\|-[^\n]*", text)


def years(s):
    ys = [int(y) for y in re.findall(r"(?<!\d)(1[89]\d\d|20[0-2]\d)(?!\d)", s)]
    return ys


def ints_after(cells, idx):
    out = []
    for c in cells[idx + 1:]:
        c = re.sub(r"'''|''|\{\{(?:sort|nts)\|([^|}]*)\|?[^}]*\}\}", r"\1", c).strip()
        c = re.sub(r"^[^|]*\|\s*", "", c) if "=" in c.split("|")[0] else c
        m = re.fullmatch(r"\s*(\d{1,4})\s*", c)
        if m:
            out.append(int(m.group(1)))
        elif out:
            break
    return out


def link_name(cell):
    m = re.search(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", cell)
    if not m:
        return None
    target, disp = m.group(1), m.group(2) or m.group(1)
    return disp.strip(), clean_target(target)


def sortname(cell):
    m = re.search(r"\{\{\s*sortname\s*\|([^}]*)\}\}", cell, re.I)
    if not m:
        return None
    parts = [p.strip() for p in m.group(1).split("|")]
    pos = [p for p in parts if "=" not in p]
    first, last = (pos + ["", ""])[:2]
    name = (first + " " + last).strip()
    target = clean_target(pos[2]) if len(pos) > 2 and pos[2] else name
    return name, target


def player(name, target, von, bis, apps):
    al = []
    for a in [name, target]:
        a = a.replace("&nbsp;", " ").replace("'''", "").strip()
        if a and a not in al:
            al.append(a)
    if not al:
        return None
    return {"name": al[0], "alias": al[1:], "von": von, "bis": bis, "apps": apps}


def parse_psg(text):
    out = []
    for r in rows(text):
        lines = r.strip().split("\n")
        if not lines or not lines[0].startswith("|") or lines[0].startswith("|}"):
            continue
        cells = [c.strip() for c in re.split(r"\|\|", lines[0][1:])]
        ln = link_name(cells[0])
        if not ln or len(cells) < 5:
            continue
        ys = years(cells[3])
        apps = ints_after(cells, 3)
        out.append(player(ln[0], ln[1], min(ys) if ys else None, max(ys) if ys else None, apps[0] if apps else None))
    return out


def parse_bayern(text):
    out = []
    for r in rows(text):
        m = re.search(r"\{\{PersonZelle\|([^}]*)\}\}", r)
        if not m or r.lstrip().startswith("<!--"):
            continue
        parts = [p for p in m.group(1).split("|")]
        pos = [p.strip() for p in parts if "=" not in p]
        kw = dict(p.split("=", 1) for p in parts if "=" in p)
        first, last = (pos + ["", ""])[:2]
        name = (first + " " + last).strip()
        target = name + (f" ({kw['k'].strip()})" if kw.get("k") else "")
        cells = [c.strip() for c in r.split("||")]
        nums = [int(x) for x in re.findall(r"\|\|\s*(\d+)\s*(?=\|\||$)", r)]
        ys = [n for n in nums if 1900 < n < 2100][:2]
        rest = [n for n in nums if not (1900 < n < 2100)]
        apps = sum(rest[0::2]) if rest else None
        bis = ys[1] if len(ys) > 1 else (2026 if "aktiv" in r else None)
        out.append(player(name, clean_target(target), ys[0] if ys else None, bis, apps))
    return out


def parse_bvb(text):
    out = []
    for r in rows(text):
        line = r.strip().split("\n")[0]
        if not line.startswith("|") or "[[" not in line:
            continue
        cells = [c.strip() for c in line[1:].split("||")]
        ln = link_name(cells[0])
        if not ln or len(cells) < 5:
            continue
        disp = ln[0]
        if "," in disp:
            last, first = [x.strip() for x in disp.split(",", 1)]
            disp = (first + " " + last).strip()
        ys = [int(c) for c in cells[2:4] if c.isdigit()]
        apps = int(cells[4]) if cells[4].isdigit() else None
        out.append(player(disp, ln[1], ys[0] if ys else None, ys[-1] if ys else None, apps))
    return out


def parse_en(text):
    out = []
    starts = "Starts" in text
    for r in rows(text):
        body = r.strip()
        if not body or body.startswith("{|") or body.startswith("|}"):
            continue
        sn = sortname(body.split("\n")[0]) or (link_name(body.split("\n")[0]) if body.startswith("|align") or body.startswith("| align") or body.startswith("!") else None)
        if not sn:
            continue
        flat = re.sub(r"\n[|!]", "||", body)
        cells = [c.strip() for c in flat.split("||")]
        ci = next((i for i, c in enumerate(cells) if i > 0 and years(c) and not re.search(r"fba|flag", c)), None)
        if ci is None:
            continue
        ys = years(cells[ci])
        nums = ints_after(cells, ci)
        apps = (nums[2] if starts and len(nums) > 2 else nums[0]) if nums else None
        out.append(player(sn[0], sn[1], min(ys), max(ys), apps))
    return out


def parse_wd(path):
    out = {}
    for row in csv.DictReader(open(path, encoding="utf8")):
        q = row["p"]
        names = [clean_target(row.get(k) or "") for k in ("enT", "loT", "deT", "pLabel", "enLabel")]
        names = [n for n in names if n and not re.fullmatch(r"Q\d+", n)]
        if not names:
            continue
        v = int(row["von"]) if row.get("von") else None
        b = int(row["bis"]) if row.get("bis") else None
        born = int(row["born"]) if row.get("born") else None
        p = out.setdefault(q, {"names": [], "von": v, "bis": b, "born": born, "sl": int(row["sl"] or 0)})
        for n in names:
            if n not in p["names"]:
                p["names"].append(n)
    res = []
    for q, p in out.items():
        res.append({"q": q, "name": p["names"][0], "alias": p["names"][1:], "von": p["von"], "bis": p["bis"], "born": p["born"], "apps": None, "sl": p["sl"]})
    return res


if __name__ == "__main__":
    kind, out, *files = sys.argv[1:]
    fn = {"psg": parse_psg, "bayern": parse_bayern, "bvb": parse_bvb, "en": parse_en}.get(kind)
    data = []
    for f in files:
        data += [p for p in (parse_wd(f) if kind == "wd" else fn(open(f, encoding="utf8").read())) if p]
    json.dump(data, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=0)
    print(out, len(data))
