import { canon } from "./fuzzy";
import { BY_ID, COUNTRIES, CONTINENTS, SUBREGION_DE, norm, type Country } from "./data/countries";
import { BEKANNTHEIT } from "./data/bekanntheit";
import { KATALOG, cleanAnswers } from "./data/tiefgang-katalog";
import { makeRng, type Rng } from "./rng";

/**
 * Tiefgang: reverse trivia. Every valid answer is worth 10–100 points; the less well-known
 * the answer, the more points. 1 point = 10 metres of diving depth.
 * Rarity was rated by AI (Claude) in advance: per country (lib/data/bekanntheit.ts) and per
 * answer for the curated prompts (lib/data/tiefgang-katalog.ts). Exactly one answer per prompt –
 * the rarest – is the "Tiefseeperle".
 */

export type Answer = { id: string; name: string; alt: string[]; pts: number; perle?: boolean };

export type Tier = { key: string; name: string; desc: string; color: string };
export const TIERS: Tier[] = [
  { key: "perle", name: "Tiefseeperle", desc: "Die seltenste Antwort überhaupt – es gibt nur eine pro Frage.", color: "#f3d272" },
  { key: "tiefsee", name: "Tiefsee", desc: "Daran denkt kaum jemand.", color: "#c3aaf6" },
  { key: "selten", name: "Selten", desc: "Ziemlich ausgefallen.", color: "#f0a0bf" },
  { key: "schwarm", name: "Schwarm", desc: "Solide – du schwimmst mit dem Schwarm.", color: "#8ec5f0" },
  { key: "plankton", name: "Plankton", desc: "Richtig, aber darauf kommen sehr viele.", color: "#9fd06f" },
];
export function tierOf(a: { pts: number; perle?: boolean }): Tier {
  if (a.perle) return TIERS[0];
  if (a.pts >= 80) return TIERS[1];
  if (a.pts >= 55) return TIERS[2];
  if (a.pts >= 30) return TIERS[3];
  return TIERS[4];
}

/** Marks the single rarest answer as Tiefseeperle (100 points); everything else is capped at 95. */
function withPerle(list: Answer[]): Answer[] {
  let best = 0;
  list.forEach((a, k) => {
    if (a.pts > list[best].pts) best = k;
  });
  return list
    .map((a, k) => (k === best ? { ...a, pts: 100, perle: true } : { ...a, pts: Math.min(95, a.pts) }))
    .sort((a, b) => a.pts - b.pts);
}
export type Question = { key: string; text: string; hint: string; answers: Answer[] };

export const ROUNDS = 7;
export const SECONDS = 25;
export const MAX_PTS = 100;

/** How well-known a country is, rated by AI (0–100). */
function fame(c: Country) {
  return BEKANNTHEIT[c.id] ?? 30;
}

function scored(items: { id: string; name: string; alt: string[]; fame: number }[]): Answer[] {
  const sorted = [...items].sort((a, b) => b.fame - a.fame || a.name.localeCompare(b.name, "de"));
  const n = sorted.length;
  // mix of rank within the question and absolute fame, so "Andorra" stays rare even in a short list
  const list = sorted.map((x, r) => {
    const rank = n > 1 ? r / (n - 1) : 1;
    const abs = 1 - x.fame / 100;
    return { id: x.id, name: x.name, alt: x.alt, pts: Math.round(10 + 85 * (0.6 * Math.pow(rank, 0.9) + 0.4 * abs)) };
  });
  return withPerle(list);
}

const countryAnswers = (list: Country[]) => scored(list.map((c) => ({ id: c.id, name: c.n, alt: c.alt, fame: fame(c) })));

type Template = { key: string; make: (rng: Rng) => Question | null };

const subregions = Array.from(new Set(COUNTRIES.map((c) => c.sub))).filter((s) => SUBREGION_DE[s] && COUNTRIES.filter((c) => c.sub === s).length >= 6);
const hubs = COUNTRIES.filter((c) => c.borders.length >= 5);
const letters = "ABCGKLMNPST".split("").filter((L) => COUNTRIES.filter((c) => c.n.toUpperCase().startsWith(L)).length >= 6);
const CONT_TEXT: Record<string, string> = {
  Europa: "in Europa",
  Asien: "in Asien",
  Afrika: "in Afrika",
  Nordamerika: "in Nord- oder Mittelamerika (inkl. Karibik)",
  Südamerika: "in Südamerika",
  Ozeanien: "in Ozeanien",
};

const TEMPLATES: Template[] = [
  {
    key: "cont",
    make: (rng) => {
      const cont = rng.pick(CONTINENTS.filter((c) => c !== "Ozeanien"));
      return { key: "cont:" + cont, text: `Nenne ein Land ${CONT_TEXT[cont]}.`, hint: "Je unbekannter das Land, desto tiefer tauchst du.", answers: countryAnswers(COUNTRIES.filter((c) => c.cont === cont)) };
    },
  },
  {
    key: "sub",
    make: (rng) => {
      const sub = rng.pick(subregions);
      return { key: "sub:" + sub, text: `Nenne ein Land in ${SUBREGION_DE[sub]}.`, hint: "Heutige, anerkannte Staaten zählen.", answers: countryAnswers(COUNTRIES.filter((c) => c.sub === sub)) };
    },
  },
  {
    key: "nb",
    make: (rng) => {
      const x = rng.pick(hubs);
      return {
        key: "nb:" + x.id,
        text: `Nenne ein Nachbarland von ${x.n}.`,
        hint: "Gemeint sind Länder mit gemeinsamer Landgrenze.",
        answers: countryAnswers(x.borders.map((b) => BY_ID[b])),
      };
    },
  },
  {
    key: "cap",
    make: (rng) => {
      const cont = rng.pick(CONTINENTS.filter((c) => c !== "Ozeanien"));
      const list = COUNTRIES.filter((c) => c.cont === cont && c.cap);
      return {
        key: "cap:" + cont,
        text: `Nenne eine Hauptstadt ${CONT_TEXT[cont]}.`,
        hint: "Nur die Hauptstadt eines Landes zählt, nicht das Land selbst.",
        answers: scored(list.map((c) => ({ id: "cap-" + c.id, name: c.cap!, alt: c.capAlt, fame: fame(c) }))),
      };
    },
  },
  {
    key: "letter",
    make: (rng) => {
      const L = rng.pick(letters);
      return { key: "letter:" + L, text: `Nenne ein Land, dessen Name mit „${L}“ beginnt.`, hint: "Es zählt der deutsche Name des Landes.", answers: countryAnswers(COUNTRIES.filter((c) => c.n.toUpperCase().startsWith(L))) };
    },
  },
  { key: "landlocked", make: () => ({ key: "landlocked", text: "Nenne ein Land ohne Zugang zum Meer.", hint: "Binnenstaaten auf allen Kontinenten zählen.", answers: countryAnswers(COUNTRIES.filter((c) => c.landlocked)) }) },
  { key: "island", make: () => ({ key: "island", text: "Nenne ein Land ohne Landgrenze zu einem anderen Land.", hint: "Zum Beispiel Inselstaaten.", answers: countryAnswers(COUNTRIES.filter((c) => c.borders.length === 0)) }) },
  { key: "pop50", make: () => ({ key: "pop50", text: "Nenne ein Land mit mehr als 50 Millionen Einwohnern.", hint: "Grundlage sind die aktuellen Zahlen der Weltbank.", answers: countryAnswers(COUNTRIES.filter((c) => (c.pop ?? 0) > 5e7)) }) },
  { key: "small", make: () => ({ key: "small", text: "Nenne ein Land, das kleiner ist als 10.000 km².", hint: "Das Saarland hat etwa 2.600 km².", answers: countryAnswers(COUNTRIES.filter((c) => c.area < 10000)) }) },
  { key: "rich", make: () => ({ key: "rich", text: "Nenne ein Land mit einem BIP pro Kopf über 40.000 US-Dollar.", hint: "Grundlage sind die aktuellen Zahlen der Weltbank.", answers: countryAnswers(COUNTRIES.filter((c) => (c.gdppc ?? 0) > 40000)) }) },
  { key: "life", make: () => ({ key: "life", text: "Nenne ein Land, in dem die Lebenserwartung über 82 Jahren liegt.", hint: "Grundlage sind die aktuellen Zahlen der Weltbank.", answers: countryAnswers(COUNTRIES.filter((c) => (c.life ?? 0) > 82)) }) },
  { key: "big", make: () => ({ key: "big", text: "Nenne ein Land, das größer ist als 1 Million km².", hint: "Deutschland hat etwa 357.000 km².", answers: countryAnswers(COUNTRIES.filter((c) => c.area > 1e6)) }) },
];

const CURATED: Question[] = KATALOG.map((p) => {
  const seen = new Set<string>();
  const answers: Answer[] = [];
  for (const line of cleanAnswers(p.answers)) {
    const [name, r, ...alt] = line.split("|");
    const keys = [name, ...alt].map(norm);
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    answers.push({ id: p.key + ":" + norm(name), name, alt, pts: Math.max(10, Math.min(100, +r)) });
  }
  return { key: "k:" + p.key, text: p.text, hint: p.hint, answers: withPerle(answers) };
});

function pickQuestions(rng: Rng, n: number): Question[] {
  // 4 curated prompts + 3 country prompts, mixed
  const curated = rng.sample(CURATED, Math.min(4, CURATED.length));
  const out: Question[] = [...curated];
  const usedTypes = new Set<string>();
  let guard = 0;
  while (out.length < n && guard++ < 500) {
    const t = rng.pick(TEMPLATES);
    if (usedTypes.has(t.key)) continue;
    const q = t.make(rng);
    if (!q || q.answers.length < 5 || out.some((o) => o.key === q.key)) continue;
    usedTypes.add(t.key);
    out.push(q);
  }
  return rng.shuffle(out);
}

export const ALL_CURATED = CURATED;

export function dailyQuestions(day: string): Question[] {
  return pickQuestions(makeRng(`${day}:tiefgang`), ROUNDS);
}

export function randomQuestions(n = ROUNDS): Question[] {
  return pickQuestions(makeRng(Math.floor(Math.random() * 2 ** 32)), n);
}

// ---------- answer checking ----------

function lev(a: string, b: string) {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type Verdict = { ok: true; answer: Answer } | { ok: false; reason: string; suggest?: string };

/** `suggested`: the player already saw a "Meintest du …?" for this input and kept it, so typos now count as wrong. */
export function check(q: Question, input: string, suggested = false): Verdict {
  const x = canon(input);
  if (!x) return { ok: false, reason: "Keine Antwort eingegeben." };
  const nx = norm(input);
  const exact = q.answers.find((a) => [a.name, ...a.alt].some((n) => norm(n) === nx));
  if (exact) return { ok: true, answer: exact };
  const typo = (a: Answer): Verdict =>
    suggested ? { ok: false, reason: `„${input.trim()}“ ist nicht richtig geschrieben – gemeint war wohl ${a.name}.` } : { ok: false, reason: "", suggest: a.name };
  const near = q.answers.find((a) => [a.name, ...a.alt].some((n) => canon(n) === x));
  if (near) return typo(near);
  // "Niger" must not be read as a typo of "Nigeria"
  const exactOther = COUNTRIES.find((c) => [c.n, ...c.alt].some((n) => canon(n) === x) || (c.cap && canon(c.cap) === x));
  if (exactOther && !q.key.startsWith("k:")) return { ok: false, reason: `„${input.trim()}“ passt nicht zu dieser Frage.` };
  let best: { a: Answer; d: number } | null = null;
  for (const a of q.answers) {
    for (const name of [a.name, ...a.alt]) {
      const k = canon(name);
      const d = lev(x, k);
      const tol = k.length <= 5 ? 1 : 2;
      if (d <= tol && (!best || d < best.d)) best = { a, d };
    }
  }
  if (best) return typo(best.a);
  // a real country/capital that does not fit this question?
  const other = COUNTRIES.find((c) => [c.n, ...c.alt].some((n) => canon(n) === x) || (c.cap && canon(c.cap) === x));
  if (other) return { ok: false, reason: `„${input.trim()}“ passt nicht zu dieser Frage.` };
  return { ok: false, reason: `„${input.trim()}“ kennen wir nicht als gültige Antwort.` };
}

export function emojiFor(pts: number, perle = false) {
  if (perle) return "🦪";
  if (pts >= 80) return "🦑";
  if (pts >= 55) return "🐙";
  if (pts >= 30) return "🐟";
  if (pts > 0) return "🦐";
  return "🫧";
}

export const meters = (pts: number) => pts * 10;
