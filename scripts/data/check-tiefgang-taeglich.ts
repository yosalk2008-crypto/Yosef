/**
 * Checks lib/data/tiefgang-taeglich.ts: unique keys, at least 50 valid answers, English text, ten per day,
 * and no forbidden topics (provinces & other divisions, trails, valleys, gorges, passes – lib/data/tiefgang-gesperrt.ts).
 *   npx tsx scripts/data/check-tiefgang-taeglich.ts            (all days)
 *   npx tsx scripts/data/check-tiefgang-taeglich.ts 2026-11-17 (one day, must have exactly 10)
 */
import { TAEGLICH } from "../../lib/data/tiefgang-taeglich";
import { ALL_CURATED, BIG_POOL, dailyQuestions, tagesQ } from "../../lib/tiefgang";
import { NEVER_ASKED } from "../../lib/data/countries";
import { GESPERRT, GESPERRT_MUSTER } from "../../lib/data/tiefgang-gesperrt";

/** Days before this one keep gaps where forbidden questions were removed (the game fills them from the pool). */
const FULL_FROM = "2026-11-27";

const only = process.argv[2];
let errors = 0;
const err = (m: string) => {
  errors++;
  console.error("FEHLER: " + m);
};
const oldKeys = new Set([...ALL_CURATED, ...BIG_POOL].map((q) => q.key));
const oldTexts = new Set([...ALL_CURATED, ...BIG_POOL].map((q) => q.text.toLowerCase()));
const seen = new Set<string>();
const perDay: Record<string, number> = {};
for (const p of TAEGLICH) {
  if (GESPERRT.has("k:" + p.key)) continue; // removed on purpose
  perDay[p.d] = (perDay[p.d] ?? 0) + 1;
  if (only && p.d !== only) continue;
  if (GESPERRT_MUSTER.test(p.text) || GESPERRT_MUSTER.test(p.en?.[0] ?? "")) err(`${p.key}: verbotenes Thema (Provinzen, Bezirke, Regionen, Wanderwege, Täler, Schluchten, Pässe) – andere Frage nehmen`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.d)) err(`${p.key}: Datum ${p.d}`);
  if (!p.key.startsWith("t-")) err(`${p.key}: key muss mit t- beginnen`);
  if (seen.has(p.key) || oldKeys.has("k:" + p.key)) err(`${p.key}: key doppelt`);
  seen.add(p.key);
  if (oldTexts.has(p.text.toLowerCase())) err(`${p.key}: diese Frage gibt es schon`);
  if (!p.en?.[0] || !p.en?.[1]) err(`${p.key}: englischer Text fehlt`);
  if (!!p.answers === !!p.countries) err(`${p.key}: genau eins von answers / countries`);
  const raw = p.answers?.length ?? p.countries?.length ?? 0;
  const q = tagesQ(p);
  const n = q.answers.filter((a) => !NEVER_ASKED.has(a.id)).length;
  if (n < 50) err(`${p.key}: nur ${n} gültige Antworten (mindestens 50)`);
  if (raw !== q.answers.length) err(`${p.key}: ${raw - q.answers.length} Antworten fallen weg (doppelte Namen/Aliase oder unbekannte Länder-IDs)`);
  if (p.countries?.includes("ISR")) err(`${p.key}: Israel darf keine Antwort sein`);
  console.log(`${p.d}  ${p.key.padEnd(28)} ${String(n).padStart(4)} Antworten  Perle: ${q.answers.find((a) => a.perle)?.name}`);
}
for (const [d, n] of Object.entries(perDay)) {
  if (only && d !== only) continue;
  if (d < FULL_FROM) continue;
  if (n !== 10) err(`${d}: ${n} Fragen statt 10`);
  const qs = dailyQuestions(d);
  if (qs.filter((q) => q.key.startsWith("k:t-")).length !== 10) err(`${d}: Tagesspiel nutzt nicht alle 10 neuen Fragen`);
}
if (only && !perDay[only]) err(`${only}: keine Fragen`);
console.log(errors ? `\n${errors} Fehler` : "\nAlles in Ordnung.");
process.exit(errors ? 1 : 0);
