// Generates every daily puzzle from launch until a year ahead and checks they are valid.
// Run: npx tsx scripts/check-puzzles.tsx
import { makePuzzle } from "../components/games/Viererbande";
import { makeRoute } from "../components/games/Grenzgang";
import { pickTarget } from "../components/games/Laenderjagd";
import { BY_ID } from "../lib/data/countries";
import { addDays, LAUNCH } from "../lib/daily";

let day = LAUNCH;
const end = addDays(new Date().toISOString().slice(0, 10), 365);
let n = 0;
const routeLens: Record<number, number> = {};
const targets: Record<string, number> = {};
const catUse: Record<string, number> = {};
while (day <= end) {
  const p = makePuzzle(day);
  const ids = p.groups.flatMap((g) => g.ids);
  if (new Set(ids).size !== 16) throw new Error("dup tile " + day);
  for (const g of p.groups) {
    catUse[g.cat.label] = (catUse[g.cat.label] || 0) + 1;
    for (const id of g.ids) {
      const fits = p.groups.filter((o) => o.cat.test(BY_ID[id]));
      if (fits.length !== 1) throw new Error(`ambiguous ${day} ${id}`);
    }
  }
  const r = makeRoute(day);
  routeLens[r.d] = (routeLens[r.d] || 0) + 1;
  const t = pickTarget(day);
  targets[t.id] = (targets[t.id] || 0) + 1;
  day = addDays(day, 1);
  n++;
}
console.log("days", n, "routes", routeLens, "distinct targets", Object.keys(targets).length);
console.log("most used categories", Object.entries(catUse).sort((a, b) => b[1] - a[1]).slice(0, 8));
console.log("today", makePuzzle(new Date().toISOString().slice(0, 10)).groups.map((g) => g.cat.label));
