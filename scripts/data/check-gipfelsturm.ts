/**
 * Checks Gipfelsturm: a year of daily climbs and 300 random climbs per theme are built, each one must have
 * 7 different questions, a 7/7 path with 7 different answers, the size funnel, and Israel/Palestine never
 * as an answer. Prints a few examples.  npx tsx scripts/data/check-gipfelsturm.ts
 */
import { addDays, utcDate } from "../../lib/daily";
import { dailyPuzzle, naiveReach, randomPuzzle, solve, theme, THEME_KEYS, type Puzzle } from "../../lib/gipfel";

let bad = 0;
const fail = (p: Puzzle, msg: string) => {
  bad++;
  console.log("FEHLER", p.theme, p.seed, msg);
};
const reach: Record<string, number[]> = {};
function check(p: Puzzle) {
  const t = theme(p.theme).theme;
  if (p.qs.length !== 7) fail(p, "nicht 7 Fragen");
  if (new Set(p.qs.map((q) => q.key)).size !== 7) fail(p, "doppelte Frage");
  if (new Set(p.qs.map((q) => q.de)).size !== 7) fail(p, "doppelter Text");
  if (!solve(p.qs)) fail(p, "nicht lösbar");
  if (new Set(p.path).size !== 7 || p.path.some((id, i) => !p.qs[i].ids.includes(id))) fail(p, "Pfad falsch");
  if (p.qs.some((q) => q.ids.some((id) => id === "ISR" || id === "PSE"))) fail(p, "Israel/Palästina als Antwort");
  if (p.qs[6].ids.length > 3) fail(p, "letzte Frage zu breit");
  if (p.qs.some((q) => /undefined|NaN|\$\{/.test(q.de + q.en))) fail(p, "Text kaputt");
  (reach[p.theme] ??= []).push(naiveReach(p.qs, (id) => t.byId.get(id)?.fame ?? 0));
}
const t0 = Date.now();
for (const k of THEME_KEYS) theme(k);
console.log("Themen gebaut in", Date.now() - t0, "ms:", THEME_KEYS.map((k) => `${k} ${theme(k).theme.entities.length} Antworten, ${theme(k).theme.preds.length} Fragen`).join(" · "));
const t1 = Date.now();
let day = utcDate();
for (let i = 0; i < 365; i++, day = addDays(day, 1)) check(dailyPuzzle(day));
for (const k of THEME_KEYS) for (let i = 0; i < 300; i++) check(randomPuzzle(k, `test${i}`));
console.log("965 Rätsel in", Date.now() - t1, "ms");
for (const [k, r] of Object.entries(reach)) {
  const h = [0, 0, 0, 0, 0, 0, 0, 0];
  r.forEach((x) => h[x]++);
  console.log(`${k}: „Berühmteste zuerst“ kommt bis Frage …`, h.map((n, i) => `${i}:${n}`).join(" "));
}
for (const p of [dailyPuzzle(utcDate()), dailyPuzzle(addDays(utcDate(), 1))]) {
  const t = theme(p.theme).theme;
  console.log(`\n${p.seed} (${p.theme})`);
  p.qs.forEach((q, i) => console.log(`${i + 1}. [${q.ids.length}] ${q.de}  → ${t.byId.get(p.path[i])!.name}  (top: ${[...q.ids].sort((a, b) => t.byId.get(b)!.fame - t.byId.get(a)!.fame).slice(0, 4).map((id) => t.byId.get(id)!.name).join(", ")})`));
}
console.log(bad ? `\n${bad} Fehler` : "\nAlles in Ordnung.");
process.exit(bad ? 1 : 0);
