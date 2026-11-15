import { BY_ID, COUNTRIES, type Country } from "./data/countries";
import { BEKANNTHEIT } from "./data/bekanntheit";
import { makeRng, type Rng } from "./rng";

/**
 * Maßstab: scale one thing until it is as big as it really is, next to a reference.
 * Up to 15 Nov 2026 the reference was always Germany and the targets were countries; from 16 Nov the
 * rounds compare countries, continents, the EU, oceans, seas and lakes with each other.
 * Areas are official figures; the outlines (Natural Earth) are scaled to match them exactly.
 */

export type Kind = "land" | "kontinent" | "bund" | "ozean" | "meer" | "see";
export type Item = {
  id: string;
  kind: Kind;
  de: string;
  en: string;
  /** km² */
  area: number;
  /** country outlines from the world map */
  countries?: string[];
  /** outlines from /geo/massstab.json (and LAND_ONLY shapes of the world map) */
  geo?: string[];
};

export const KIND_LABEL: Record<Kind, [string, string]> = {
  land: ["Land", "Country"],
  kontinent: ["Kontinent", "Continent"],
  bund: ["Staatenbund", "Union"],
  ozean: ["Ozean", "Ocean"],
  meer: ["Meer", "Sea"],
  see: ["See", "Lake"],
};
export const isWater = (k: Kind) => k === "ozean" || k === "meer" || k === "see";

const cont = (c: string) => COUNTRIES.filter((x) => x.cont === c).map((x) => x.id);
const EU = "AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE".split(" ");

const OTHER: Item[] = [
  { id: "afrika", kind: "kontinent", de: "Afrika", en: "Africa", area: 30370000, countries: cont("Afrika"), geo: ["ESH"] },
  { id: "suedamerika", kind: "kontinent", de: "Südamerika", en: "South America", area: 17840000, countries: cont("Südamerika") },
  { id: "nordamerika", kind: "kontinent", de: "Nordamerika", en: "North America", area: 24709000, countries: cont("Nordamerika"), geo: ["GRL"] },
  { id: "ozeanien", kind: "kontinent", de: "Australien und Ozeanien", en: "Australia and Oceania", area: 8526000, countries: cont("Ozeanien") },
  { id: "antarktis", kind: "kontinent", de: "Antarktis", en: "Antarctica", area: 14200000, geo: ["ATA"] },
  { id: "eu", kind: "bund", de: "Europäische Union", en: "European Union", area: 4233000, countries: EU },

  { id: "pazifik", kind: "ozean", de: "Pazifik", en: "Pacific Ocean", area: 165250000 },
  { id: "atlantik", kind: "ozean", de: "Atlantik", en: "Atlantic Ocean", area: 106460000 },
  { id: "indik", kind: "ozean", de: "Indischer Ozean", en: "Indian Ocean", area: 70560000 },
  { id: "arktis", kind: "ozean", de: "Arktischer Ozean", en: "Arctic Ocean", area: 14060000 },

  { id: "mittelmeer", kind: "meer", de: "Mittelmeer", en: "Mediterranean Sea", area: 2510000 },
  { id: "ostsee", kind: "meer", de: "Ostsee", en: "Baltic Sea", area: 377000 },
  { id: "nordsee", kind: "meer", de: "Nordsee", en: "North Sea", area: 575000 },
  { id: "schwarzes-meer", kind: "meer", de: "Schwarzes Meer", en: "Black Sea", area: 436400 },
  { id: "rotes-meer", kind: "meer", de: "Rotes Meer", en: "Red Sea", area: 438000 },
  { id: "karibik", kind: "meer", de: "Karibisches Meer", en: "Caribbean Sea", area: 2754000 },
  { id: "golf-von-mexiko", kind: "meer", de: "Golf von Mexiko", en: "Gulf of Mexico", area: 1550000 },
  { id: "suedchinesisches-meer", kind: "meer", de: "Südchinesisches Meer", en: "South China Sea", area: 3500000 },
  { id: "beringmeer", kind: "meer", de: "Beringmeer", en: "Bering Sea", area: 2000000 },
  { id: "ochotskisches-meer", kind: "meer", de: "Ochotskisches Meer", en: "Sea of Okhotsk", area: 1583000 },
  { id: "japanisches-meer", kind: "meer", de: "Japanisches Meer", en: "Sea of Japan", area: 978000 },
  { id: "persischer-golf", kind: "meer", de: "Persischer Golf", en: "Persian Gulf", area: 251000 },
  { id: "arabisches-meer", kind: "meer", de: "Arabisches Meer", en: "Arabian Sea", area: 3862000 },
  { id: "golf-von-bengalen", kind: "meer", de: "Golf von Bengalen", en: "Bay of Bengal", area: 2172000 },
  { id: "korallenmeer", kind: "meer", de: "Korallenmeer", en: "Coral Sea", area: 4791000 },
  { id: "philippinensee", kind: "meer", de: "Philippinensee", en: "Philippine Sea", area: 5695000 },
  { id: "barentssee", kind: "meer", de: "Barentssee", en: "Barents Sea", area: 1424000 },

  { id: "kaspisches-meer", kind: "see", de: "Kaspisches Meer", en: "Caspian Sea", area: 371000 },
  { id: "oberer-see", kind: "see", de: "Oberer See", en: "Lake Superior", area: 82100 },
  { id: "victoriasee", kind: "see", de: "Victoriasee", en: "Lake Victoria", area: 68800 },
  { id: "huronsee", kind: "see", de: "Huronsee", en: "Lake Huron", area: 59600 },
  { id: "michigansee", kind: "see", de: "Michigansee", en: "Lake Michigan", area: 58000 },
  { id: "tanganjikasee", kind: "see", de: "Tanganjikasee", en: "Lake Tanganyika", area: 32600 },
  { id: "baikalsee", kind: "see", de: "Baikalsee", en: "Lake Baikal", area: 31500 },
  { id: "grosser-baerensee", kind: "see", de: "Großer Bärensee", en: "Great Bear Lake", area: 31000 },
  { id: "malawisee", kind: "see", de: "Malawisee", en: "Lake Malawi", area: 29600 },
  { id: "grosser-sklavensee", kind: "see", de: "Großer Sklavensee", en: "Great Slave Lake", area: 27200 },
  { id: "eriesee", kind: "see", de: "Eriesee", en: "Lake Erie", area: 25700 },
  { id: "winnipegsee", kind: "see", de: "Winnipegsee", en: "Lake Winnipeg", area: 24500 },
  { id: "ontariosee", kind: "see", de: "Ontariosee", en: "Lake Ontario", area: 18960 },
  { id: "ladogasee", kind: "see", de: "Ladogasee", en: "Lake Ladoga", area: 17700 },
  { id: "balchaschsee", kind: "see", de: "Balchaschsee", en: "Lake Balkhash", area: 16400 },
  { id: "onegasee", kind: "see", de: "Onegasee", en: "Lake Onega", area: 9700 },
  { id: "titicacasee", kind: "see", de: "Titicacasee", en: "Lake Titicaca", area: 8372 },
  { id: "nicaraguasee", kind: "see", de: "Nicaraguasee", en: "Lake Nicaragua", area: 8264 },
  { id: "voltastausee", kind: "see", de: "Voltastausee", en: "Lake Volta", area: 8502 },
  { id: "turkanasee", kind: "see", de: "Turkanasee", en: "Lake Turkana", area: 6405 },
  { id: "yssykkoel", kind: "see", de: "Yssykköl", en: "Issyk-Kul", area: 6236 },
  { id: "vaenern", kind: "see", de: "Vänern", en: "Lake Vänern", area: 5650 },
  { id: "vansee", kind: "see", de: "Vansee", en: "Lake Van", area: 3755 },
  { id: "peipussee", kind: "see", de: "Peipussee", en: "Lake Peipus", area: 3555 },
  { id: "tanasee", kind: "see", de: "Tanasee", en: "Lake Tana", area: 3200 },
  { id: "genfersee", kind: "see", de: "Genfersee", en: "Lake Geneva", area: 580 },
  { id: "plattensee", kind: "see", de: "Plattensee", en: "Lake Balaton", area: 592 },
  { id: "bodensee", kind: "see", de: "Bodensee", en: "Lake Constance", area: 536 },
];
OTHER.forEach((x) => {
  if (!x.countries && !x.geo) x.geo = [x.id];
});

const landItem = (c: Country): Item => ({ id: c.id, kind: "land", de: c.n, en: c.nEn ?? c.n, area: c.area, countries: [c.id] });
export const ITEMS: Item[] = [...COUNTRIES.filter((c) => c.shape).map(landItem), ...OTHER];
export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((x) => [x.id, x]));
export const itemName = (x: Item, lang: "de" | "en") => (lang === "en" ? x.en : x.de);

export type Pair = { ref: string; target: string };
export const ROUNDS = 5;
export const NEW_FROM = "2026-11-16";

/** The rounds up to 15 Nov 2026: Germany against one country per size band. */
function oldPairs(day: string): Pair[] {
  const REF = "DEU";
  const POOL = COUNTRIES.filter((c) => c.shape && c.id !== REF && c.area >= 10000);
  const rng = makeRng(`${day}:massstab`);
  const bands = [
    [10000, 120000],
    [120000, 400000],
    [400000, 1000000],
    [1000000, 3000000],
    [3000000, 20000000],
  ];
  return rng.shuffle(bands.map(([lo, hi]) => rng.pick(POOL.filter((c) => c.area >= lo && c.area < hi)).id)).map((target) => ({ ref: REF, target }));
}

const famous = (x: Item) => x.kind !== "land" || (BEKANNTHEIT[x.id] ?? 0) >= 60;
const ratioOk = (a: Item, b: Item, max = 6) => a.area / b.area <= max && b.area / a.area <= max;

/** Which kinds may serve as the reference for a target of a kind. */
const REF_KINDS: Record<Kind, Kind[]> = {
  land: ["land", "see", "meer", "kontinent"],
  see: ["land", "meer"],
  meer: ["land", "see", "kontinent", "ozean"],
  kontinent: ["land", "meer", "ozean", "bund"],
  bund: ["land", "meer", "kontinent"],
  ozean: ["kontinent", "ozean", "land"],
};

function pickPair(rng: Rng, kind: Kind, used: Set<string>): Pair {
  const pool = ITEMS.filter((x) => (kind === "kontinent" ? x.kind === "kontinent" || x.kind === "bund" : x.kind === kind) && !used.has(x.id) && (x.kind !== "land" || x.area >= 10000));
  for (let tries = 0; tries < 50; tries++) {
    const target = rng.pick(pool);
    const refs = ITEMS.filter((r) => r.id !== target.id && !used.has(r.id) && REF_KINDS[target.kind].includes(r.kind) && famous(r) && ratioOk(r, target) && !(r.kind === "land" && r.area < 2000));
    if (refs.length) {
      // prefer a reference of another kind – that's the fun part
      const other = refs.filter((r) => r.kind !== target.kind);
      const ref = rng.pick(other.length && rng.next() < 0.75 ? other : refs);
      used.add(target.id);
      used.add(ref.id);
      return { ref: ref.id, target: target.id };
    }
  }
  throw new Error("no pair for " + kind);
}

/** The five comparisons of a day: one country, one lake, one sea, one continent (or the EU), one ocean. */
export function dailyPairs(day: string): Pair[] {
  if (day < NEW_FROM) return oldPairs(day);
  const rng = makeRng(`${day}:massstab:2`);
  const used = new Set<string>();
  const kinds: Kind[] = rng.shuffle(["land", "see", "meer", "kontinent", "ozean"] as Kind[]);
  // keep the ocean last when it comes up early half the time – a big finish
  const pairs = kinds.map((k) => pickPair(rng, k, used));
  return pairs;
}

export { BY_ID };
