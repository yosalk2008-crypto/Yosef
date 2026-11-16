/**
 * Checks the Tiefgang topic questions (lib/data/tiefgang-themen/*.ts):
 * unique keys and texts, right prefix, English text, at least 30 answers, no answers lost to duplicate names/aliases.
 *   npx tsx scripts/data/check-tiefgang-themen.ts
 */
import { THEMA_FRAGEN } from "../../lib/data/tiefgang-themen";
import { ALL_CURATED, BIG_POOL, MIN_THEMA, themaQ } from "../../lib/tiefgang";
import { TAEGLICH } from "../../lib/data/tiefgang-taeglich";

const PREFIX: Record<string, string> = { fussball: "f-", essen: "e-", serien: "s-", wissen: "w-" };
let errors = 0;
import { readFileSync, readdirSync } from "fs";
const err = (m: string) => (errors++, console.error("FEHLER: " + m));
const keys = new Set([...ALL_CURATED, ...BIG_POOL].map((q) => q.key).concat(TAEGLICH.map((p) => "k:" + p.key)));
const texts = new Set([...ALL_CURATED, ...BIG_POOL].map((q) => q.text.toLowerCase()).concat(TAEGLICH.map((p) => p.text.toLowerCase())));
// the data files must contain plain strings only – no expressions, no placeholders
for (const f of readdirSync("lib/data/tiefgang-themen").filter((x) => !["index.ts", "types.ts"].includes(x))) {
  readFileSync("lib/data/tiefgang-themen/" + f, "utf8").split("\n").forEach((line, n) => {
    if (/\bdup\b|\.slice\(|\.replace\(|\.split\(|===|&&|\|\||`/.test(line)) err(`${f}:${n + 1}: kein reiner Text: ${line.trim().slice(0, 90)}`);
  });
}
for (const [thema, list] of Object.entries(THEMA_FRAGEN)) {
  let sum = 0;
  for (const p of list) {
    if (!p.key.startsWith(PREFIX[thema])) err(`${p.key}: muss mit ${PREFIX[thema]} beginnen`);
    if (keys.has("k:" + p.key)) err(`${p.key}: key doppelt`);
    keys.add("k:" + p.key);
    if (texts.has(p.text.toLowerCase())) err(`${p.key}: Frage gibt es schon („${p.text}“)`);
    texts.add(p.text.toLowerCase());
    if (!p.en?.[0] || !p.en?.[1]) err(`${p.key}: englischer Text fehlt`);
    for (const a of p.answers) {
      if (/\bdup\b|TODO|\?\?/.test(a)) err(`${p.key}: Platzhalter „${a}“`);
    }
    // slurs and racist dish names (the username blocklist is too broad here: it would hit "Rummenigge" or "Gochujang")
    const bad = /\bn[i1!]+gg|\bneger|negerk|mohrenk|mohr im|zigeuner|eskimo|indianer/i;
    for (const a of p.answers) if (bad.test(a)) err(`${p.key}: diskriminierender Begriff in „${a}“`);
    const q = themaQ(p);
    if (q.answers.length < MIN_THEMA) err(`${p.key}: nur ${q.answers.length} Antworten (mindestens ${MIN_THEMA})`);
    if (q.answers.length !== p.answers.length) {
      const seen = new Map<string, string>();
      const dup: string[] = [];
      for (const a of p.answers) for (const n of a.split("|")) {
        const k = n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
        if (seen.has(k) && seen.get(k) !== a) dup.push(`${n} (${seen.get(k)!.split("|")[0]} / ${a.split("|")[0]})`);
        seen.set(k, a);
      }
      err(`${p.key}: ${p.answers.length - q.answers.length} Antworten fallen weg – doppelt: ${dup.slice(0, 6).join(", ") || "?"}`);
    }
    sum += q.answers.length;
  }
  console.log(`${thema.padEnd(9)} ${String(list.length).padStart(4)} Fragen, ${sum} Antworten`);
}
console.log(errors ? `\n${errors} Fehler` : "\nAlles in Ordnung.");
process.exit(errors ? 1 : 0);
