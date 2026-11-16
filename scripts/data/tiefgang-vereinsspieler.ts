/**
 * Builds lib/data/tiefgang-themen/fussball-spieler.ts: the Tiefgang club player questions ("f-spieler-…").
 * Every player of the club since the year in scripts/data/vereinsspieler/<club>.json counts (Wikipedia lists,
 * or Wikidata for clubs without a complete list). The hand-picked answers already in the file stay first (famous
 * players, also legends from before that year); the list players follow, most appearances / best known first.
 * Two players with the same name: the first keeps it, the second keeps only its other spellings (or is left out).
 *   npx tsx scripts/data/tiefgang-vereinsspieler.ts
 */
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { norm } from "../../lib/data/countries";
import { FUSSBALL_SPIELER } from "../../lib/data/tiefgang-themen/fussball-spieler";

type Liste = { key: string; seit: number; quelle: string; spieler: { n: string[]; w: number }[] };
const dir = "scripts/data/vereinsspieler/";
const lists: Liste[] = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(dir + f, "utf8")));

const clean = (s: string) => s.replace(/\{\{.*$/, "").replace(/[|"\\`]/g, "").replace(/\s+/g, " ").trim();
for (const l of lists) {
  const q = FUSSBALL_SPIELER.find((p) => p.key === l.key);
  if (!q) throw new Error("keine Frage " + l.key);
  const used = new Set(q.answers.flatMap((a) => a.split("|").map(norm)));
  let added = 0;
  for (const p of l.spieler) {
    const names = [...new Set(p.n.map(clean))].filter((n) => n.length >= 3 && norm(n).length >= 3 && !used.has(norm(n)));
    const uniq = names.filter((n, i) => names.findIndex((m) => norm(m) === norm(n)) === i);
    if (!uniq.length) continue;
    uniq.forEach((n) => used.add(norm(n)));
    q.answers.push(uniq.join("|"));
    added++;
  }
  q.hint = `Zählt: jeder Spieler mit Pflichtspiel für die erste Mannschaft seit ${l.seit} – dazu Legenden von früher.`;
  q.en = [q.en[0], `Counts: every player with a competitive first-team match since ${l.seit}, plus earlier legends.`];
  console.log(l.key.padEnd(24), `+${added}`.padStart(5), String(q.answers.length).padStart(5), "  " + l.quelle);
}

const file = "lib/data/tiefgang-themen/fussball-spieler.ts";
const head = readFileSync(file, "utf8").split("export const FUSSBALL_SPIELER")[0];
const body = FUSSBALL_SPIELER.map((p) =>
  [
    "  {",
    `    key: ${JSON.stringify(p.key)},`,
    `    text: ${JSON.stringify(p.text)},`,
    `    hint: ${JSON.stringify(p.hint)},`,
    `    en: ${JSON.stringify(p.en)},`,
    "    answers: [",
    ...p.answers.map((a) => `      ${JSON.stringify(a)},`),
    "    ],",
    "  },",
  ].join("\n")
).join("\n");
writeFileSync(file, `${head}export const FUSSBALL_SPIELER: ThemaFrage[] = [\n${body}\n];\n`);
