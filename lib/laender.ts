import { ALL_COUNTRIES, CONTINENTS, type Continent, type Country } from "./data/countries";
import { slug } from "./slug";
import type { Lang } from "./i18n";

/** Country pages under /laender: slugs, continents, rankings. */
export const LAND = ALL_COUNTRIES.map((c) => ({ ...c, slug: slug(c.n) }));
export type Land = (typeof LAND)[number];
export const LAND_BY_SLUG = Object.fromEntries(LAND.map((c) => [c.slug, c])) as Record<string, Land>;
export const LAND_BY_ID = Object.fromEntries(LAND.map((c) => [c.id, c])) as Record<string, Land>;

export const CONT_KEY: Record<Continent, string> = {
  Europa: "europa",
  Asien: "asien",
  Afrika: "afrika",
  Nordamerika: "nordamerika",
  Südamerika: "suedamerika",
  Ozeanien: "ozeanien",
};
export const CONT_BY_KEY = Object.fromEntries(CONTINENTS.map((c) => [CONT_KEY[c], c])) as Record<string, Continent>;

export type Metric = {
  key: string;
  field: "pop" | "area" | "gdppc" | "life" | "forest" | "urban" | "capPop";
  de: [string, string]; // title, short label
  en: [string, string];
  fmt: (v: number, lang: Lang) => string;
};

const nf = (lang: Lang, d = 0) => new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
export const fmtPeople = (v: number, lang: Lang) => nf(lang).format(Math.round(v));
export const fmtArea = (v: number, lang: Lang) => `${nf(lang).format(Math.round(v))} km²`;
export const fmtUsd = (v: number, lang: Lang) => (lang === "en" ? `US$${nf(lang).format(Math.round(v))}` : `${nf(lang).format(Math.round(v))} US-$`);
export const fmtYears = (v: number, lang: Lang) => `${nf(lang, 1).format(v)} ${lang === "en" ? "years" : "Jahre"}`;
export const fmtPct = (v: number, lang: Lang) => `${nf(lang, 1).format(v)} %`;

export const METRICS: Metric[] = [
  { key: "einwohner", field: "pop", de: ["Länder mit den meisten Einwohnern", "Einwohner"], en: ["Countries by population", "Population"], fmt: fmtPeople },
  { key: "flaeche", field: "area", de: ["Die größten Länder der Welt", "Fläche"], en: ["Largest countries by area", "Area"], fmt: fmtArea },
  { key: "bip-pro-kopf", field: "gdppc", de: ["Länder nach BIP pro Kopf", "BIP pro Kopf"], en: ["Countries by GDP per capita", "GDP per capita"], fmt: fmtUsd },
  { key: "lebenserwartung", field: "life", de: ["Länder nach Lebenserwartung", "Lebenserwartung"], en: ["Countries by life expectancy", "Life expectancy"], fmt: fmtYears },
  { key: "wald", field: "forest", de: ["Länder mit dem meisten Wald", "Waldanteil"], en: ["Countries by forest cover", "Forest cover"], fmt: fmtPct },
  { key: "stadtbevoelkerung", field: "urban", de: ["Länder nach Stadtbevölkerung", "Anteil in Städten"], en: ["Countries by urban population", "Urban population"], fmt: fmtPct },
  { key: "hauptstaedte", field: "capPop", de: ["Die größten Hauptstädte", "Einwohner der Hauptstadt"], en: ["Largest capital cities", "Capital population"], fmt: fmtPeople },
];
export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<string, Metric>;

/** Countries sorted by a field, largest first (missing values dropped). */
export function ranking(field: Metric["field"]) {
  return LAND.filter((c) => typeof c[field] === "number").sort((a, b) => (b[field] as number) - (a[field] as number));
}
/** 1-based world rank of a country for a field, or null. */
export function rankOf(c: Country, field: Metric["field"]) {
  const i = ranking(field).findIndex((x) => x.id === c.id);
  return i < 0 ? null : i + 1;
}

/** Short, neutral notes where a country's status or capital is disputed. */
export const NOTES: Record<string, [string, string]> = {
  ISR: [
    "Israel bezeichnet Jerusalem als Hauptstadt. Dieser Status ist international umstritten; viele Staaten haben ihre Botschaften in Tel Aviv.",
    "Israel designates Jerusalem as its capital. This status is disputed internationally; many countries keep their embassies in Tel Aviv.",
  ],
  PSE: [
    "Ramallah ist Sitz der palästinensischen Verwaltung; als Hauptstadt wird Ost-Jerusalem beansprucht. Die Anerkennung als Staat ist international unterschiedlich.",
    "Ramallah is the seat of the Palestinian administration; East Jerusalem is claimed as the capital. Recognition as a state varies internationally.",
  ],
  XKX: ["Die Unabhängigkeit des Kosovo wird nicht von allen Staaten anerkannt.", "Kosovo’s independence is not recognised by all countries."],
  TWN: ["Der völkerrechtliche Status Taiwans ist umstritten.", "Taiwan’s status under international law is disputed."],
  MAR: [
    "Auf unseren Karten ist die Westsahara mit Marokko als eine Fläche gezeichnet; ihr Status ist international umstritten.",
    "On our maps Western Sahara is drawn together with Morocco as one area; its status is disputed internationally.",
  ],
};

/** Quiz region for a continent (used for "test yourself" links). */
export const quizRegion = (c: Continent) => CONT_KEY[c];
