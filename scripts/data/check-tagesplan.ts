/**
 * Checks the day plans: every planned day has its questions (Fernweh 5, Gipfelsturm 7), every key exists,
 * no question is used on two days, Gipfelsturm paths answer each question with seven different
 * countries, no two Fernweh clues have the same country list, and the plan reaches N days ahead.
 *   npx tsx scripts/data/check-tagesplan.ts [--tage 7]
 */
import { addDays, day0750 } from "../../lib/daily";
import { CLUES_PER_DAY, PLAN as FW, creativePool, expedition } from "../../lib/fernweh";
import { PLAN as GS, dailyPuzzle, theme } from "../../lib/gipfel";
import { GIPFEL_EXTRA } from "../../lib/gipfel/laender-extra";
import { BY_ID } from "../../lib/data/countries";

let bad = 0;
const fail = (m: string) => (bad++, console.log("FEHLER", m));
const i = process.argv.indexOf("--tage");
const ahead = i > 0 ? Number(process.argv[i + 1]) : 7;
const today = day0750();

const pool = creativePool();
const keys = new Set(pool.map((c) => c.key));
const lists = new Map<string, string>();
for (const c of pool) {
  const l = [...c.ids].sort().join(",");
  if (lists.has(l)) fail(`Fernweh: ${c.key} hat dieselben Länder wie ${lists.get(l)}`);
  lists.set(l, c.key);
}
const xk = new Set<string>();
for (const x of GIPFEL_EXTRA) {
  if (xk.has(x.key)) fail(`Gipfelsturm-Extra ${x.key} doppelt`);
  xk.add(x.key);
  if (x.ids.some((id) => !BY_ID[id])) fail(`Gipfelsturm-Extra ${x.key}: unbekannte ID`);
  if (x.ids.some((id) => ["ISR", "PSE", "ESH"].includes(id))) fail(`Gipfelsturm-Extra ${x.key}: nicht erlaubtes Land`);
  if (x.ids.length < 1 || x.ids.length > 60 || new Set(x.ids).size !== x.ids.length) fail(`Gipfelsturm-Extra ${x.key}: ${x.ids.length} Länder`);
}
const seenF = new Map<string, string>();
for (const [d, ks] of Object.entries(FW)) {
  if (ks.length !== CLUES_PER_DAY) fail(`Fernweh ${d}: ${ks.length} Hinweise`);
  for (const k of ks) {
    if (!keys.has(k)) fail(`Fernweh ${d}: ${k} gibt es nicht`);
    if (seenF.has(k)) fail(`Fernweh ${d}: ${k} schon am ${seenF.get(k)}`);
    seenF.set(k, d);
  }
  if (expedition(`tag:${d}`).map((c) => c.key).join() !== ks.join()) fail(`Fernweh ${d}: Spiel weicht vom Plan ab`);
}
const t = theme("laender").theme;
const preds = new Map(t.preds.map((p) => [p.key, p]));
const seenG = new Map<string, string>();
for (const [d, p] of Object.entries(GS)) {
  if (p.qs.length !== 7 || p.path.length !== 7) fail(`Gipfelsturm ${d}: keine 7 Fragen`);
  if (new Set(p.path).size !== 7) fail(`Gipfelsturm ${d}: Lösungsweg nutzt ein Land doppelt`);
  p.qs.forEach((k, j) => {
    const q = preds.get(k);
    if (!q) return fail(`Gipfelsturm ${d}: ${k} gibt es nicht`);
    if (!q.ids.includes(p.path[j])) fail(`Gipfelsturm ${d}: ${p.path[j]} passt nicht zu ${k}`);
    if (seenG.has(k)) fail(`Gipfelsturm ${d}: ${k} schon am ${seenG.get(k)}`);
    seenG.set(k, d);
  });
  if (dailyPuzzle(d).qs.map((q) => q.key).join() !== p.qs.join()) fail(`Gipfelsturm ${d}: Spiel weicht vom Plan ab`);
}
for (let k = 0; k <= ahead; k++) {
  const d = addDays(today, k);
  if (!FW[d]) fail(`Fernweh: ${d} ist nicht geplant`);
  if (!GS[d]) fail(`Gipfelsturm: ${d} ist nicht geplant`);
}
const free = pool.filter((c) => !seenF.has(c.key)).length;
console.log(`Fernweh: ${Object.keys(FW).length} Tage geplant (bis ${Object.keys(FW).sort().pop()}), ${free} Hinweise übrig.`);
console.log(`Gipfelsturm: ${Object.keys(GS).length} Tage geplant (bis ${Object.keys(GS).sort().pop()}).`);
console.log(bad ? `${bad} Fehler` : "Alles in Ordnung.");
process.exit(bad ? 1 : 0);
