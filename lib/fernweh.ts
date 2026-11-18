/**
 * Fernweh – five clues, one pin each on an unlabelled world map. Every country that fits counts, and the
 * less obvious it is, the more kilometres it earns (40 / 55 / 70 / 85 / 100, at most 500 a day).
 * Countries may be used again for another clue. Clues come from the site's country data (the same facts
 * as Gipfelsturm), so every answer can be checked.
 */
import { BEKANNTHEIT } from "@/lib/data/bekanntheit";
import { BY_ID, CONTINENT_EN, SUBREGION_DE, type Country } from "@/lib/data/countries";
import { rng } from "@/lib/gipfel/core";
import { LAND, LEFT_OUT, clauses, join, type Clause } from "@/lib/gipfel/laender";
import { KREATIV } from "@/lib/fernweh-kreativ";

export const CLUES_PER_DAY = 5;
export const KM = [40, 55, 70, 85, 100] as const;
export const TIERS = [
  { de: "Naheliegend", en: "Common", color: "#7cc067", emoji: "🟩" },
  { de: "Weniger naheliegend", en: "Uncommon", color: "#4f9fe0", emoji: "🟦" },
  { de: "Selten", en: "Rare", color: "#8c64d6", emoji: "🟪" },
  { de: "Sehr selten", en: "Elusive", color: "#ee8a2f", emoji: "🟧" },
  { de: "Fernweh-Perle", en: "Gem", color: "#e2b714", emoji: "💎" },
] as const;
export const MISS = { de: "Daneben", en: "Miss", color: "#d6453d", emoji: "❌" };

/** Overseas parts on the map that count as their country when tapped. */
export const TERRITORY_OWNER: Record<string, string> = { GRL: "DNK", FLK: "GBR", ATF: "FRA", PRI: "USA", NCL: "FRA" };
/** Can be tapped on the map but never locked in (no Middle East conflict in the quizzes; Western Sahara is disputed). */
export const NOT_PINNABLE = new Set([...LEFT_OUT, "ESH"]);

export type Clue = {
  key: string;
  de: string;
  en: string;
  ids: string[];
  src?: string;
  parts: string[];
  /** Creative clues: what the clue is about, shown after the pin, plus a line for single countries. */
  note?: [string, string];
  extra?: Record<string, [string, string]>;
};

/** The creative clues (animals, flags, sport, rivers, languages, names …) – these make up the expeditions. */
export function creativePool(): Clue[] {
  return KREATIV.map((k) => ({ ...k, ids: k.ids.filter((id) => !NOT_PINNABLE.has(id)), parts: [k.key] }));
}

const fame = (id: string) => BEKANNTHEIT[id] ?? 30;

let POOL: Clue[] | null = null;
/** Every clue with 3–30 fitting countries: single facts and "place × fact" combinations. */
export function cluePool(): Clue[] {
  if (POOL) return POOL;
  const cl = clauses();
  const out: Clue[] = [];
  const add = (key: string, de: string, en: string, ids: string[], src?: string) => {
    if (ids.length >= 3 && ids.length <= 30) out.push({ key, de, en, ids, src, parts: key.split("+") });
  };
  for (const c of cl) add(c.key, `Ein Land${/^(das|dessen)\b/.test(c.de) ? "," : ""} ${c.de}.`, `A country ${c.en}.`, c.ids, c.src);
  const locs = cl.filter((c: Clause) => c.loc);
  for (const a of locs)
    for (const b of cl) {
      if (b.loc) continue;
      const s = new Set(b.ids);
      const both = a.ids.filter((id) => s.has(id));
      if (both.length === a.ids.length || both.length === b.ids.length) continue;
      add(`${a.key}+${b.key}`, `Ein Land ${join(a, b, "de")}.`, `A country ${join(a, b, "en")}.`, both, b.src);
    }
  POOL = out.sort((a, b) => (a.key < b.key ? -1 : 1));
  return POOL;
}

/** Tier 0–4 of a fitting country: by how readily people name it, the least known one is always a gem. */
export function tierOf(clue: Clue, id: string): number {
  const ranked = [...clue.ids].sort((a, b) => fame(b) - fame(a) || (a < b ? -1 : 1));
  const r = ranked.indexOf(id);
  if (r < 0) return -1;
  if (r === ranked.length - 1) return 4;
  return Math.min(3, Math.floor((r * 5) / ranked.length));
}
export const kmOf = (clue: Clue, id: string | null) => (id && clue.ids.includes(id) ? KM[tierOf(clue, id)] : 0);

/**
 * Five different creative clues for a day (or an endless round). Daily expeditions walk through a fixed
 * shuffle of the pool, so a clue only comes back after every other one has been played.
 */
export function expedition(seed: string): Clue[] {
  const pool = creativePool();
  const m = /^tag:(\d{4}-\d{2}-\d{2})$/.exec(seed);
  if (m) {
    const day = Math.floor(Date.parse(m[1]) / 86400000);
    const per = CLUES_PER_DAY;
    const cycleLen = Math.floor(pool.length / per);
    const cycle = Math.floor(day / cycleLen);
    const r = rng(`fernweh:zyklus:${cycle}`);
    const order = pool.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const at = (day % cycleLen) * per;
    return order.slice(at, at + per).map((i) => pool[i]);
  }
  const r = rng(`fernweh:${seed}`);
  const left = [...pool];
  const picked: Clue[] = [];
  while (picked.length < CLUES_PER_DAY && left.length) picked.push(left.splice(Math.floor(r() * left.length), 1)[0]);
  return picked;
}

export function rankFor(km: number): [string, string] {
  if (km >= 500) return ["Weltenbummler-Legende", "Legendary wanderer"];
  if (km >= 420) return ["Kartograf", "Cartographer"];
  if (km >= 320) return ["Entdecker", "Explorer"];
  if (km >= 200) return ["Abenteurer", "Adventurer"];
  if (km >= 100) return ["Wanderer", "Wanderer"];
  return ["Stubenhocker", "Homebody"];
}

const nf = (lang: "de" | "en") => new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: 1 });
/** Short fact line for a country: continent, capital, people, area. */
export function factLine(id: string, lang: "de" | "en"): string {
  const c: Country | undefined = BY_ID[id];
  if (!c) return "";
  const f = nf(lang);
  const pop = c.pop ? (c.pop >= 1e6 ? `${f.format(c.pop / 1e6)} ${lang === "en" ? "m people" : "Mio. Einwohner"}` : `${f.format(Math.round(c.pop / 1000))}${lang === "en" ? "k people" : " Tsd. Einwohner"}`) : "";
  const cap = lang === "en" ? c.capEn : c.cap;
  return [lang === "en" ? CONTINENT_EN[c.cont] : c.cont, cap ? `${lang === "en" ? "capital" : "Hauptstadt"} ${cap}` : "", pop, `${f.format(c.area)} km²`].filter(Boolean).join(" · ");
}

export const LAND_IDS = new Set(LAND.map((c) => c.id));

// ----------------------------------------------------------------------------------------------
// Why a country fits (or not): one short fact per building block of the clue
// ----------------------------------------------------------------------------------------------

let CLAUSES: Map<string, Clause> | null = null;
const clauseMap = () => (CLAUSES ??= new Map(clauses().map((c) => [c.key, c])));
const TOP_LABEL: Record<string, [string, string]> = {
  "top-gdp": ["größten Volkswirtschaften", "largest economies"],
  "top-gdppc": ["reichsten Länder pro Kopf", "richest countries per person"],
  "top-life": ["höchsten Lebenserwartungen", "highest life expectancies"],
  "top-tour": ["meistbesuchten Länder", "most visited countries"],
  "top-forest": ["waldreichsten Länder", "most forested countries"],
  "top-elev": ["höchsten Gipfel", "highest peaks"],
  "top-coast": ["längsten Küsten", "longest coastlines"],
  "top-age": ["ältesten Bevölkerungen", "oldest populations"],
  "top-birth": ["höchsten Geburtenraten", "highest birth rates"],
  "top-rail": ["längsten Schienennetze", "longest rail networks"],
  "top-airports": ["meisten Flughäfen", "most airports"],
  "top-area": ["größten Länder", "largest countries"],
  "top-pop": ["bevölkerungsreichsten Länder", "most populous countries"],
};

export function why(clue: Clue, id: string, lang: "de" | "en"): string[] {
  const c = BY_ID[id];
  if (!c) return [];
  const f = nf(lang);
  const en = lang === "en";
  const name = en ? c.nEn : c.n;
  if (clue.note) {
    const hit = clue.ids.includes(id);
    const ex = clue.extra?.[id];
    const head = hit ? (ex ? `${name}: ${ex[en ? 1 : 0]}` : en ? `${name} fits.` : `${name} passt.`) : en ? `${name} doesn’t fit.` : `${name} passt nicht.`;
    return [head, clue.note[en ? 1 : 0]];
  }
  const people = (n: number | null) => (n == null ? "?" : n >= 1e6 ? `${f.format(n / 1e6)} ${en ? "million" : "Mio."}` : f.format(n));
  return clue.parts.map((k) => {
    const cl = clauseMap().get(k);
    const ok = !!cl && cl.ids.includes(id);
    if (k.startsWith("kont-")) return en ? `${name} is in ${CONTINENT_EN[c.cont]}.` : `${name} liegt in ${c.cont}.`;
    if (k.startsWith("sub-")) return en ? `${name} is in ${c.sub}.` : `${name} liegt in ${SUBREGION_DE[c.sub] ?? c.sub}.`;
    if (k === "binnen") return ok ? (en ? `${name} has no coast.` : `${name} hat keinen Zugang zum Meer.`) : en ? `${name} has a coast.` : `${name} hat eine Küste.`;
    if (k === "insel" || k.startsWith("nachbar"))
      return c.borders.length === 0 ? (en ? `${name} has no land border.` : `${name} hat keine Landgrenze.`) : en ? `${name} has ${c.borders.length} neighbouring countr${c.borders.length === 1 ? "y" : "ies"}.` : `${name} hat ${c.borders.length} Nachbarl${c.borders.length === 1 ? "and" : "änder"}.`;
    if (k.startsWith("pop")) return en ? `${name} has ${people(c.pop)} people.` : `${name} hat ${people(c.pop)} Einwohner.`;
    if (k.startsWith("area")) return en ? `${name} covers ${f.format(c.area)} km².` : `${name} ist ${f.format(c.area)} km² groß.`;
    if (k.startsWith("cap")) return en ? `${c.capEn ?? "Its capital"} has ${people(c.capPop)} people.` : `${c.cap ?? "Die Hauptstadt"} hat ${people(c.capPop)} Einwohner.`;
    if (k.startsWith("grenze-")) {
      const y = BY_ID[k.slice(7)];
      const yn = y ? (en ? y.nEn : y.n) : "";
      return ok ? (en ? `${name} borders ${yn}.` : `${name} grenzt an ${yn}.`) : en ? `${name} does not border ${yn}.` : `${name} grenzt nicht an ${yn}.`;
    }
    if (k.startsWith("top-") && cl) {
      const [de, enl] = TOP_LABEL[k] ?? ["Spitzenreiter", "leaders"];
      const n = cl.ids.length;
      return ok ? (en ? `${name} is among the ${enl} (no. ${cl.ids.indexOf(id) + 1} here).` : `${name} gehört zu den ${de} (hier Platz ${cl.ids.indexOf(id) + 1}).`) : en ? `${name} is not in the top ${n}.` : `${name} gehört nicht zu den ${n} ${de}.`;
    }
    return "";
  }).filter(Boolean);
}
