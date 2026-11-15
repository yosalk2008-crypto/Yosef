import { COUNTRIES, type Country } from "./data/countries";
import { rankIn, val, type MetricKey } from "./metrics";
import { makeRng, type Rng } from "./rng";

/**
 * Spitzenplatz: assign each country to the category where it ranks best – every category only once.
 * Ranks are counted inside the chosen region (world = all 196 countries that can be asked).
 */

export type RegionKey = "welt" | "europa" | "asien" | "afrika" | "nordamerika" | "suedamerika" | "ozeanien" | "nahost" | "arabisch" | "balkan";

const ids = (s: string) => new Set(s.split(" "));
const NAHOST = ids("BHR CYP EGY IRN IRQ JOR KWT LBN OMN PSE QAT SAU SYR TUR ARE YEM");
const ARABISCH = ids("DZA BHR COM DJI EGY IRQ JOR KWT LBN LBY MRT MAR OMN PSE QAT SAU SOM SDN SYR TUN ARE YEM");
const BALKAN = ids("ALB BIH BGR HRV GRC XKX MNE MKD ROU SRB SVN");

export const REGIONS: { key: RegionKey; de: string; en: string; emoji: string; test: (c: Country) => boolean }[] = [
  { key: "welt", de: "Welt", en: "World", emoji: "🌍", test: () => true },
  { key: "europa", de: "Europa", en: "Europe", emoji: "🏰", test: (c) => c.cont === "Europa" },
  { key: "asien", de: "Asien", en: "Asia", emoji: "🏯", test: (c) => c.cont === "Asien" },
  { key: "afrika", de: "Afrika", en: "Africa", emoji: "🦁", test: (c) => c.cont === "Afrika" },
  { key: "nordamerika", de: "Nordamerika", en: "North America", emoji: "🗽", test: (c) => c.cont === "Nordamerika" },
  { key: "suedamerika", de: "Südamerika", en: "South America", emoji: "🦜", test: (c) => c.cont === "Südamerika" },
  { key: "ozeanien", de: "Ozeanien", en: "Oceania", emoji: "🏝️", test: (c) => c.cont === "Ozeanien" },
  { key: "nahost", de: "Naher Osten", en: "Middle East", emoji: "🕌", test: (c) => NAHOST.has(c.id) },
  { key: "arabisch", de: "Arabische Länder", en: "Arab countries", emoji: "🐪", test: (c) => ARABISCH.has(c.id) },
  { key: "balkan", de: "Balkan", en: "Balkans", emoji: "⛰️", test: (c) => BALKAN.has(c.id) },
];
export const REGION_BY_KEY = Object.fromEntries(REGIONS.map((r) => [r.key, r])) as Record<RegionKey, (typeof REGIONS)[number]>;
export const regionName = (k: RegionKey, lang: "de" | "en") => REGION_BY_KEY[k][lang];

const members: Partial<Record<RegionKey, Country[]>> = {};
/** All countries of a region (the field the ranks are counted in). */
export function regionCountries(k: RegionKey): Country[] {
  return (members[k] ??= COUNTRIES.filter(REGION_BY_KEY[k].test));
}

/** Every category the game can use. */
export const ALL_CATS: MetricKey[] = [
  "area", "pop", "gdppc", "gdp", "life", "mil", "tour", "forest", "urban", "capPop",
  "elev", "meanElev", "coast", "birth", "age", "alc", "smoke", "docs", "net", "airports", "rail", "unemp", "temp", "density", "nb", "north",
];
/** The fixed eight categories of the world daily up to 15 Nov 2026. */
const OLD_CATS: MetricKey[] = ["area", "pop", "gdppc", "mil", "life", "tour", "forest", "capPop"];
/** From this day on the daily picks new categories every day and there is a European daily. */
export const NEW_FROM = "2026-11-16";

export const rank = (k: MetricKey, id: string, region: RegionKey) => rankIn(k, id, regionCountries(region), region);

export type Round = { region: RegionKey; ids: string[]; cats: MetricKey[] };

/** How many countries (and categories) one round has in a region. */
export const roundSize = (region: RegionKey) => (regionCountries(region).length >= 16 ? 8 : 6);

/** Categories that work for these countries: every country has a value and the region isn't all ties. */
function usableCats(region: RegionKey, list: string[]) {
  const all = regionCountries(region);
  return ALL_CATS.filter((k) => {
    if (!list.every((id) => val(all.find((c) => c.id === id)!, k) != null)) return false;
    const distinct = new Set(all.map((c) => val(c, k)).filter((v) => v != null));
    return distinct.size >= Math.min(all.length, 8);
  });
}

function makeRound(rng: Rng, region: RegionKey): Round {
  const all = regionCountries(region);
  const n = roundSize(region);
  // countries with enough data so the categories don't run out
  const pool = all.filter((c) => usableCats(region, [c.id]).length >= 16 && (region !== "welt" || (c.pop ?? 0) >= 2e6));
  const src = pool.length >= n ? pool : all;
  let picked: Country[];
  if (region === "welt") {
    // half well-known heavyweights, half from the rest
    const big = rng.sample(src.filter((c) => (c.pop ?? 0) >= 3e7), n / 2);
    picked = [...big, ...rng.sample(src.filter((c) => !big.includes(c)), n / 2)];
  } else picked = rng.sample(src, n);
  const list = rng.shuffle(picked).map((c) => c.id);
  const cats = rng.sample(usableCats(region, list), n);
  return { region, ids: list, cats };
}

/** The daily round. Up to 15 Nov 2026 the world daily used fixed categories and its own country draw. */
export function dailyRound(day: string, region: "welt" | "europa" = "welt"): Round {
  if (region === "welt" && day < NEW_FROM) {
    const rng = makeRng(`${day}:spitzenplatz`);
    const pool = COUNTRIES.filter((c) => (c.pop ?? 0) >= 2000000 && OLD_CATS.every((k) => val(c, k) != null));
    const big = rng.sample(pool.filter((c) => (c.pop ?? 0) >= 30000000), 4);
    const rest = rng.sample(pool.filter((c) => !big.includes(c)), 4);
    return { region, ids: rng.shuffle([...big, ...rest]).map((c) => c.id), cats: OLD_CATS };
  }
  return makeRound(makeRng(`${day}:spitzenplatz:${region}`), region);
}

/** A fresh random round for the endless mode. */
export function randomRound(region: RegionKey, seed = Math.floor(Math.random() * 2 ** 32)): Round {
  return makeRound(makeRng(seed), region);
}

/** Best possible total (minimum sum of ranks) and the assignment that reaches it, via DP over category subsets. */
export function optimum(r: Round): { total: number; plan: MetricKey[] } {
  const n = r.ids.length;
  const dp = new Array(1 << n).fill(Infinity);
  const from = new Array<number>(1 << n).fill(-1);
  dp[0] = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    let i = 0;
    for (let x = mask; x; x >>= 1) i += x & 1;
    if (i >= n || dp[mask] === Infinity) continue;
    for (let c = 0; c < n; c++) {
      if (mask & (1 << c)) continue;
      const v = dp[mask] + rank(r.cats[c], r.ids[i], r.region);
      if (v < dp[mask | (1 << c)]) {
        dp[mask | (1 << c)] = v;
        from[mask | (1 << c)] = c;
      }
    }
  }
  const plan: MetricKey[] = new Array(n);
  let mask = (1 << n) - 1;
  for (let i = n - 1; i >= 0; i--) {
    const c = from[mask];
    plan[i] = r.cats[c];
    mask &= ~(1 << c);
  }
  return { total: dp[(1 << n) - 1], plan };
}

/** Colour band of a rank relative to the size of the field. */
export function band(r: number, region: RegionKey): 0 | 1 | 2 | 3 {
  const n = regionCountries(region).length;
  return r <= Math.max(1, n * 0.06) ? 0 : r <= Math.max(2, n * 0.16) ? 1 : r <= Math.max(3, n * 0.36) ? 2 : 3;
}
export const bandEmoji = ["🟩", "🟨", "🟧", "🟥"] as const;
