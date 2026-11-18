/**
 * Checks Fernweh: every clue has 3–30 fitting countries and exactly one gem (+100 km) at the least known one,
 * a year of daily expeditions has 5 different clues each, Israel/Palestine/Western Sahara are never an answer,
 * and the overseas territories map to a country.   npx tsx scripts/data/check-fernweh.ts
 */
import { addDays, utcDate } from "../../lib/daily";
import { BY_ID } from "../../lib/data/countries";
import { cluePool, creativePool, expedition, kmOf, NOT_PINNABLE, TERRITORY_OWNER, tierOf } from "../../lib/fernweh";

let bad = 0;
const fail = (m: string) => (bad++, console.log("FEHLER", m));
const pool = creativePool();
const seen = new Set<string>();
for (const c of [...pool, ...cluePool()]) {
  if (seen.has(c.key)) fail(`${c.key}: doppelt`);
  seen.add(c.key);
  if (c.ids.some((id) => !BY_ID[id])) fail(`${c.key}: unbekannte ID ${c.ids.filter((id) => !BY_ID[id])}`);
  if (new Set(c.ids).size !== c.ids.length) fail(`${c.key}: Land doppelt`);
  for (const id of Object.keys(c.extra ?? {})) if (!c.ids.includes(id)) fail(`${c.key}: Zusatz für ${id}, das nicht passt`);
  if (c.ids.length < 3 || c.ids.length > 30) fail(`${c.key}: ${c.ids.length} Länder`);
  if (c.ids.some((id) => NOT_PINNABLE.has(id))) fail(`${c.key}: nicht erlaubtes Land`);
  if (c.ids.filter((id) => tierOf(c, id) === 4).length !== 1) fail(`${c.key}: nicht genau eine Perle`);
  if (/undefined|NaN|\$\{/.test(c.de + c.en)) fail(`${c.key}: Text`);
}
for (const [t, o] of Object.entries(TERRITORY_OWNER)) if (!BY_ID[o]) fail(`Gebiet ${t} → ${o} fehlt`);
let day = utcDate();
const used = new Map<string, number>();
for (let i = 0; i < 365; i++, day = addDays(day, 1)) {
  const e = expedition(`tag:${day}`);
  if (e.length !== 5 || new Set(e.map((c) => c.key)).size !== 5) fail(`${day}: keine 5 verschiedenen Hinweise`);
  e.forEach((c) => used.set(c.key, (used.get(c.key) ?? 0) + 1));
}
const max = Math.max(...e0());
function e0() { return [...used.values()]; }
console.log(`${pool.length} Hinweise im Pool, ${used.size} davon in einem Jahr benutzt, häufigster ${max}×`);
const ex = expedition(`tag:${utcDate()}`);
ex.forEach((c, k) => {
  const ranked = [...c.ids].sort((a, b) => tierOf(c, b) - tierOf(c, a));
  console.log(`${k + 1}. [${c.ids.length}] ${c.de}  Perle: ${BY_ID[ranked[0]].n} (${kmOf(c, ranked[0])} km), naheliegend: ${c.ids.filter((id) => tierOf(c, id) === 0).map((id) => BY_ID[id].n).join(", ")}`);
});
// creative clues that can be compared with the country data
const one = pool.find((c) => c.key === "k-ein-nachbar");
if (one) {
  const ids = one.ids;
  const data = Object.values(BY_ID).filter((c) => c.borders.length === 1).map((c) => c.id);
  console.log("genau ein Nachbar – nur in der Liste:", ids.filter((id) => !data.includes(id)).join(" ") || "–", "| nur in den Daten:", data.filter((id) => !ids.includes(id)).join(" ") || "–");
}
console.log(bad ? `${bad} Fehler` : "Alles in Ordnung.");
process.exit(bad ? 1 : 0);
