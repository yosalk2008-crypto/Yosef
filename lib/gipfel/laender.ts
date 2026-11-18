/**
 * Gipfelsturm: countries. Every fact comes from the site's country data (lib/data/countries.json:
 * Weltbank / REST Countries, lib/data/kennzahlen.ts: CIA World Factbook), so every question can be checked.
 */
import { BY_ID, COUNTRIES, CONTINENT_EN, CONTINENTS, SUBREGION_DE, type Country } from "@/lib/data/countries";
import { BEKANNTHEIT } from "@/lib/data/bekanntheit";
import { KENNZAHLEN, type Kennzahl } from "@/lib/data/kennzahlen";
import type { Entity, Pred, Theme } from "./core";

/** Never an answer here (no Middle East conflict in the quizzes); typing them just says "doesn't count". */
const LEFT_OUT = new Set(["ISR", "PSE"]);
const LAND = COUNTRIES.filter((c) => !LEFT_OUT.has(c.id));
const ALL = COUNTRIES;

type Clause = { key: string; de: string; en: string; ids: string[]; loc?: boolean; src?: string };
const ids = (f: (c: Country) => boolean) => LAND.filter(f).map((c) => c.id);

function clauses(): Clause[] {
  const out: Clause[] = [];
  for (const k of CONTINENTS) out.push({ key: `kont-${k}`, de: `in ${k}`, en: `in ${CONTINENT_EN[k]}`, ids: ids((c) => c.cont === k), loc: true });
  for (const [sub, de] of Object.entries(SUBREGION_DE)) {
    const s = ids((c) => c.sub === sub);
    if (s.length >= 4) out.push({ key: `sub-${sub}`, de: de === "Südliches Afrika" ? "im südlichen Afrika" : de === "Karibik" ? "in der Karibik" : `in ${de}`, en: sub === "Caribbean" ? "in the Caribbean" : `in ${sub}`, ids: s, loc: true });
  }
  out.push({ key: "binnen", de: "ohne Zugang zum Meer", en: "that is landlocked", ids: ids((c) => c.landlocked) });
  out.push({ key: "insel", de: "ohne Landgrenze zu einem anderen Land", en: "with no land border at all", ids: ids((c) => !c.landlocked && c.borders.length === 0) });
  out.push({ key: "nachbarn7", de: "mit mindestens sieben Nachbarländern", en: "with at least seven neighbouring countries", ids: ids((c) => c.borders.length >= 7) });
  out.push({ key: "nachbar1", de: "mit genau einem Nachbarland", en: "with exactly one neighbouring country", ids: ids((c) => c.borders.length === 1) });
  for (const [n, de, en] of [
    [200e6, "mit mehr als 200 Millionen Einwohnern", "with more than 200 million people"],
    [100e6, "mit mehr als 100 Millionen Einwohnern", "with more than 100 million people"],
    [50e6, "mit mehr als 50 Millionen Einwohnern", "with more than 50 million people"],
    [30e6, "mit mehr als 30 Millionen Einwohnern", "with more than 30 million people"],
  ] as const)
    out.push({ key: `pop>${n}`, de, en, ids: ids((c) => (c.pop ?? 0) > n), src: "Weltbank" });
  out.push({ key: "pop<1e6", de: "mit weniger als einer Million Einwohnern", en: "with fewer than one million people", ids: ids((c) => c.pop != null && c.pop < 1e6), src: "Weltbank" });
  for (const [a, de, en] of [
    [3e6, "mit mehr als 3 Millionen km² Fläche", "larger than 3 million km²"],
    [1e6, "mit mehr als 1 Million km² Fläche", "larger than 1 million km²"],
    [5e5, "mit mehr als 500.000 km² Fläche", "larger than 500,000 km²"],
  ] as const)
    out.push({ key: `area>${a}`, de, en, ids: ids((c) => c.area > a) });
  out.push({ key: "area<1e3", de: "mit weniger als 1.000 km² Fläche", en: "smaller than 1,000 km²", ids: ids((c) => c.area < 1000) });
  out.push({ key: "area<3e4", de: "mit weniger als 30.000 km² Fläche", en: "smaller than 30,000 km²", ids: ids((c) => c.area < 30000) });
  out.push({ key: "cap>5e6", de: "dessen Hauptstadt mehr als 5 Millionen Einwohner hat", en: "whose capital has more than 5 million people", ids: ids((c) => (c.capPop ?? 0) > 5e6) });
  for (const y of ["DEU", "FRA", "CHN", "RUS", "BRA", "COD", "TZA", "ZMB", "AUT", "SRB", "HUN", "TUR", "IND", "NER", "SDN", "ARG", "PER", "SAU", "IRN", "KAZ", "POL", "ESP", "UKR", "MLI", "CMR", "COL", "BOL", "MOZ", "ZAF", "AFG", "VNM", "MMR"]) {
    const c = BY_ID[y];
    if (!c) continue;
    const s = c.borders.filter((b) => !LEFT_OUT.has(b));
    if (s.length >= 3) out.push({ key: `grenze-${y}`, de: `mit einer Landgrenze zu ${c.n}`, en: `bordering ${c.nEn}`, ids: s });
  }
  // world rankings (all countries ranked, then only the allowed ones kept)
  const top = (key: string, n: number, val: (c: Country) => number | null | undefined, de: string, en: string, src: string) => {
    const ranked = ALL.filter((c) => val(c) != null && !Number.isNaN(val(c))).sort((a, b) => (val(b) as number) - (val(a) as number));
    out.push({ key, de, en, ids: ranked.slice(0, n).map((c) => c.id).filter((id) => !LEFT_OUT.has(id)), src });
  };
  const kz = (k: Kennzahl) => (c: Country) => KENNZAHLEN[c.id]?.[k];
  top("top-gdp", 15, (c) => c.gdp, "das weltweit zu den 15 größten Volkswirtschaften gehört", "that is one of the world’s 15 largest economies", "Weltbank");
  top("top-gdppc", 15, (c) => c.gdppc, "das weltweit zu den 15 reichsten Ländern pro Kopf gehört", "that is one of the 15 richest countries per person", "Weltbank");
  top("top-life", 15, (c) => c.life, "mit einer der 15 höchsten Lebenserwartungen der Welt", "with one of the 15 highest life expectancies in the world", "Weltbank");
  top("top-tour", 15, (c) => c.tour, "das zu den 15 Ländern mit den meisten Touristen gehört", "that is one of the 15 most visited countries", "Weltbank");
  top("top-forest", 15, (c) => c.forest, "das zu den 15 Ländern mit dem größten Waldanteil gehört", "that is one of the 15 countries with the largest share of forest", "Weltbank");
  top("top-elev", 12, kz("elev"), "das zu den 12 Ländern mit dem höchsten Berg gehört", "that is one of the 12 countries with the highest peak", "CIA World Factbook");
  top("top-coast", 15, kz("coast"), "mit einer der 15 längsten Küsten der Welt", "with one of the world’s 15 longest coastlines", "CIA World Factbook");
  top("top-age", 15, kz("age"), "mit einer der 15 ältesten Bevölkerungen (Durchschnittsalter)", "with one of the 15 oldest populations (median age)", "CIA World Factbook");
  top("top-birth", 15, kz("birth"), "mit einer der 15 höchsten Geburtenraten der Welt", "with one of the world’s 15 highest birth rates", "CIA World Factbook");
  top("top-rail", 12, kz("rail"), "mit einem der 12 längsten Schienennetze der Welt", "with one of the world’s 12 longest rail networks", "CIA World Factbook");
  top("top-airports", 12, kz("airports"), "das zu den 12 Ländern mit den meisten Flughäfen gehört", "that is one of the 12 countries with the most airports", "CIA World Factbook");
  top("top-area", 10, (c) => c.area, "das zu den 10 größten Ländern der Welt gehört", "that is one of the 10 largest countries in the world", "Fläche");
  top("top-pop", 10, (c) => c.pop, "das zu den 10 bevölkerungsreichsten Ländern gehört", "that is one of the 10 most populous countries", "Weltbank");
  return out.filter((c) => c.ids.length > 0);
}

const join = (a: Clause, b: Clause, lang: "de" | "en") => {
  const x = lang === "de" ? a.de : a.en;
  const y = lang === "de" ? b.de : b.en;
  return lang === "de" && /^(das|dessen)\b/.test(y) ? `${x}, ${y}` : `${x} ${y}`;
};

export function laenderTheme(): Theme {
  const entities: Entity[] = LAND.map((c) => ({
    id: c.id,
    name: c.n,
    nameEn: c.nEn,
    names: [c.n, ...c.alt],
    fame: BEKANNTHEIT[c.id] ?? 30,
  }));
  const cl = clauses();
  const preds: Pred[] = cl.map((c) => ({ key: c.key, de: `Nenne ein Land${/^(das|dessen)\b/.test(c.de) ? "," : ""} ${c.de}.`, en: `Name a country ${c.en}.`, ids: c.ids, parts: [c.key], src: c.src }));
  const locs = cl.filter((c) => c.loc);
  for (const a of locs)
    for (const b of cl) {
      if (b.loc) continue;
      const s = new Set(b.ids);
      const both = a.ids.filter((id) => s.has(id));
      if (!both.length || both.length === a.ids.length || both.length === b.ids.length) continue;
      preds.push({ key: `${a.key}+${b.key}`, de: `Nenne ein Land ${join(a, b, "de")}.`, en: `Name a country ${join(a, b, "en")}.`, ids: both, parts: [a.key, b.key], src: b.src });
    }
  preds.sort((a, b) => (a.key < b.key ? -1 : 1));
  return {
    key: "laender",
    title: "Länder",
    titleEn: "Countries",
    thing: "ein Land",
    thingEn: "a country",
    entities,
    byId: new Map(entities.map((e) => [e.id, e])),
    preds,
    fameCut: 60,
    bands: [
      [25, 60],
      [14, 48],
      [9, 30],
      [6, 20],
      [4, 12],
      [2, 6],
      [1, 3],
    ],
  };
}
