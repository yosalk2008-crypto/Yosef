/**
 * Day plans for Fernweh and Gipfelsturm: fills lib/data/tagesplan/{fernweh,gipfelsturm}.json up to
 * N days ahead (default 8) with questions no other day has used. Days that are already planned are never
 * changed. If the unused questions run out, it says how many new ones are needed (exit code 3) – the daily
 * plan task then writes new questions (see scripts/data/TAGESPLAN-AUFGABE.md) and runs this again.
 *
 *   npx tsx scripts/data/tagesplan.ts [--tage 8] [--pruefen]
 */
import { readFileSync, writeFileSync } from "fs";
import { addDays, day0750 } from "../../lib/daily";
import { CLUES_PER_DAY, creativePool } from "../../lib/fernweh";
import { buildPuzzle, freshTheme, theme } from "../../lib/gipfel";
import { rng } from "../../lib/gipfel/core";

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const AHEAD = Number(arg("--tage") ?? 8);
const CHECK_ONLY = process.argv.includes("--pruefen");
const today = day0750();
const last = addDays(today, AHEAD);
const FW = "lib/data/tagesplan/fernweh.json";
const GS = "lib/data/tagesplan/gipfelsturm.json";
const fw = JSON.parse(readFileSync(FW, "utf8")) as Record<string, string[]>;
const gs = JSON.parse(readFileSync(GS, "utf8")) as Record<string, { qs: string[]; path: string[] }>;
const sorted = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
let short = 0;

// ---------- Fernweh ----------
{
  const pool = creativePool();
  const used = new Set(Object.values(fw).flat());
  let free = pool.filter((c) => !used.has(c.key));
  for (let d = Object.keys(fw).sort()[0] ?? today; d <= last; d = addDays(d, 1)) {
    if (fw[d]) continue;
    if (CHECK_ONLY) { short += CLUES_PER_DAY; continue; }
    if (free.length < CLUES_PER_DAY) {
      short += CLUES_PER_DAY;
      continue;
    }
    // five clues that do not overlap much (no two with mostly the same countries)
    const r = rng(`plan:fernweh:${d}`);
    const pick: typeof free = [];
    const cands = [...free];
    while (pick.length < CLUES_PER_DAY && cands.length) {
      const c = cands.splice(Math.floor(r() * cands.length), 1)[0];
      const overlap = pick.some((p) => c.ids.filter((id) => p.ids.includes(id)).length > Math.min(c.ids.length, p.ids.length) / 2);
      if (!overlap || cands.length < CLUES_PER_DAY - pick.length) pick.push(c);
    }
    fw[d] = pick.map((c) => c.key);
    free = free.filter((c) => !fw[d].includes(c.key));
  }
  console.log(`Fernweh: geplant bis ${Object.keys(fw).sort().pop()}, ${free.length} unbenutzte Hinweise übrig (reicht für ${Math.floor(free.length / CLUES_PER_DAY)} weitere Tage).`);
}

// ---------- Gipfelsturm ----------
{
  const t = theme("laender").theme;
  const used = new Set(Object.values(gs).flatMap((p) => p.qs));
  for (let d = Object.keys(gs).sort()[0] ?? today; d <= last; d = addDays(d, 1)) {
    if (gs[d]) continue;
    if (CHECK_ONLY) { short += 7; continue; }
    try {
      const p = buildPuzzle(freshTheme(t, used), `tag:${d}`);
      gs[d] = { qs: p.qs.map((q) => q.key), path: p.path };
      p.qs.forEach((q) => used.add(q.key));
    } catch {
      short += 7;
    }
  }
  const free = t.preds.filter((p) => !used.has(p.key));
  const bandFree = t.bands.map(([lo, hi]) => free.filter((p) => p.ids.length >= lo && p.ids.length <= hi).length);
  console.log(`Gipfelsturm: geplant bis ${Object.keys(gs).sort().pop()}, unbenutzte Fragen je Stufe 1–7: ${bandFree.join(" / ")} (Stufe 1 = 25–60 Länder, Stufe 7 = 1–3).`);
}

if (!CHECK_ONLY) {
  writeFileSync(FW, JSON.stringify(sorted(fw), null, 1) + "\n");
  writeFileSync(GS, JSON.stringify(sorted(gs), null, 1) + "\n");
}
if (short) {
  console.log(`NEUE FRAGEN NÖTIG: Der Plan reicht nicht bis ${last}. Neue Hinweise schreiben (siehe scripts/data/TAGESPLAN-AUFGABE.md) und erneut ausführen.`);
  process.exit(3);
}
console.log(`Alles geplant bis ${last}.`);
