/**
 * Appends more answers to existing Tiefgang topic questions (they go to the end = rarer).
 * Input text file:  "## <key>" followed by one answer per line ("Name|Alias|English").
 * Answers whose name or alias is already in the question are skipped.
 *   npx tsx scripts/data/tiefgang-add-answers.ts fussball /tmp/mehr.txt
 * (Club player questions "f-spieler-…" live in fussball-spieler.ts and are generated – not edited here.)
 */
import { readFileSync, writeFileSync } from "fs";
import type { ThemaFrage } from "../../lib/data/tiefgang-themen";
import { FUSSBALL } from "../../lib/data/tiefgang-themen/fussball";
import { ESSEN } from "../../lib/data/tiefgang-themen/essen";
import { SERIEN } from "../../lib/data/tiefgang-themen/serien";
import { WISSEN } from "../../lib/data/tiefgang-themen/wissen";
const THEMA_FRAGEN = { fussball: FUSSBALL, essen: ESSEN, serien: SERIEN, wissen: WISSEN };

const [thema, src] = process.argv.slice(2) as [keyof typeof THEMA_FRAGEN, string];
const list: ThemaFrage[] = THEMA_FRAGEN[thema];
if (!list) throw new Error("unknown topic " + thema);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
let key = "";
const add: Record<string, string[]> = {};
for (const raw of readFileSync(src, "utf8").split("\n")) {
  const line = raw.trim();
  if (!line) continue;
  if (line.startsWith("## ")) key = line.slice(3).trim();
  else (add[key] ??= []).push(line);
}
let added = 0;
for (const [k, lines] of Object.entries(add)) {
  const q = list.find((p) => p.key === k);
  if (!q) throw new Error("no question " + k);
  const seen = new Set(q.answers.flatMap((a) => a.split("|").map(norm)));
  for (const l of lines) {
    const keys = l.split("|").map(norm);
    if (keys.some((x) => seen.has(x))) continue;
    keys.forEach((x) => seen.add(x));
    q.answers.push(l);
    added++;
  }
  console.log(k.padEnd(28), q.answers.length);
}
const CONST = { fussball: "FUSSBALL", essen: "ESSEN", serien: "SERIEN", wissen: "WISSEN" }[thema];
const file = `lib/data/tiefgang-themen/${thema}.ts`;
const head = readFileSync(file, "utf8").split(`export const ${CONST}`)[0];
const body = list
  .map((p) =>
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
  )
  .join("\n");
writeFileSync(file, `${head}export const ${CONST}: ThemaFrage[] = [\n${body}\n];\n`);
console.log(`${added} Antworten ergänzt in ${file}`);
