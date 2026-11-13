import raw from "./countries.json";
import en from "./countries-en.json";

export type Country = {
  id: string; // ISO 3166-1 alpha-3 (Kosovo: XKX)
  iso2: string;
  n: string; // German name
  /** English name and capital (both are also accepted as answers in German) */
  nEn: string;
  capEn: string | null;
  alt: string[];
  cont: Continent;
  sub: string;
  cap: string | null;
  capAlt: string[];
  capPop: number | null;
  ll: [number, number];
  area: number;
  pop: number | null;
  gdppc: number | null;
  gdp: number | null;
  life: number | null;
  mil: number | null;
  tour: number | null;
  forest: number | null;
  urban: number | null;
  borders: string[];
  landlocked: boolean;
  flag: { colors: string[]; simple: boolean };
  shape: boolean;
};

export type Continent = "Europa" | "Asien" | "Afrika" | "Nordamerika" | "Südamerika" | "Ozeanien";

/**
 * Countries that never come up as a question in the daily games (Länderjagd, Maßstab, Viererbande, Höher oder
 * tiefer, Spitzenplatz, Farbecht, Tiefgang). They are still drawn on every map, can be entered as a
 * step in Grenzgang and are part of the region quizzes (ALL_COUNTRIES).
 */
const EXCLUDED = new Set(["ISR"]);
const EN = en as unknown as Record<string, [string, string | null, string[]]>;
const uniq = (xs: (string | null | undefined)[], not: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x && !not.includes(x)))];
const RAW_ALL = (raw as unknown as Country[]).map((c) => {
  const [nEn, capEn, alts] = EN[c.id] ?? [c.n, c.cap, []];
  return { ...c, nEn, capEn, alt: uniq([...c.alt, nEn, ...alts], [c.n]), capAlt: uniq([...c.capAlt, capEn], [c.cap]) };
});
const RAW_BORDERS = new Map(RAW_ALL.map((c) => [c.id, new Set(c.borders)]));
/** Borders only count if both countries list each other (the source data has Sri Lanka → India one-way). */
export const ALL_COUNTRIES: Country[] = RAW_ALL.map((c) => ({ ...c, borders: c.borders.filter((b) => RAW_BORDERS.get(b)?.has(c.id)) }));
export const BY_ID_ALL: Record<string, Country> = Object.fromEntries(ALL_COUNTRIES.map((c) => [c.id, c]));
/** Countries used for daily-game questions (deterministic puzzles depend on this list – do not change lightly). */
export const COUNTRIES = ALL_COUNTRIES.filter((c) => !EXCLUDED.has(c.id)).map((c) => ({ ...c, borders: c.borders.filter((b) => !EXCLUDED.has(b)) }));
export const BY_ID: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
export const CONTINENTS: Continent[] = ["Europa", "Asien", "Afrika", "Nordamerika", "Südamerika", "Ozeanien"];

export const SUBREGION_DE: Record<string, string> = {
  "Western Europe": "Westeuropa",
  "Northern Europe": "Nordeuropa",
  "Southern Europe": "Südeuropa",
  "Eastern Europe": "Osteuropa",
  "Southeast Europe": "Südosteuropa",
  "Central Europe": "Mitteleuropa",
  "Western Asia": "Westasien",
  "Central Asia": "Zentralasien",
  "Southern Asia": "Südasien",
  "Eastern Asia": "Ostasien",
  "South-Eastern Asia": "Südostasien",
  "Northern Africa": "Nordafrika",
  "Western Africa": "Westafrika",
  "Eastern Africa": "Ostafrika",
  "Middle Africa": "Zentralafrika",
  "Southern Africa": "Südliches Afrika",
  Caribbean: "Karibik",
  "Central America": "Mittelamerika",
  "North America": "Nordamerika",
  "South America": "Südamerika",
  "Australia and New Zealand": "Australien & Neuseeland",
  Melanesia: "Melanesien",
  Micronesia: "Mikronesien",
  Polynesia: "Polynesien",
};

export const CONTINENT_EN: Record<Continent, string> = {
  Europa: "Europe",
  Asien: "Asia",
  Afrika: "Africa",
  Nordamerika: "North America",
  Südamerika: "South America",
  Ozeanien: "Oceania",
};

/** Name / capital / continent / subregion in the current language. */
export const cName = (c: { n: string; nEn: string }, lang: "de" | "en") => (lang === "en" ? c.nEn : c.n);
export const cCap = (c: { cap: string | null; capEn: string | null }, lang: "de" | "en") => (lang === "en" ? c.capEn : c.cap);
export const contName = (k: Continent, lang: "de" | "en") => (lang === "en" ? CONTINENT_EN[k] : k);
export const subName = (sub: string, lang: "de" | "en") => (lang === "en" ? sub : SUBREGION_DE[sub] ?? sub);

export function flagUrl(iso2: string) {
  return `/flags/${iso2}.svg`;
}

/** Lower-case, strip accents and punctuation for forgiving text matching. */
export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
