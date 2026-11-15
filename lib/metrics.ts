import { COUNTRIES, type Country } from "./data/countries";
import { KENNZAHLEN, type Kennzahl } from "./data/kennzahlen";
import { TEMPERATUR } from "./data/temperatur";

export type BaseKey = "pop" | "area" | "gdppc" | "gdp" | "life" | "mil" | "tour" | "forest" | "urban" | "capPop";
/** Extra figures (CIA World Factbook, own calculations) – used by Spitzenplatz. */
export type ExtraKey = "elev" | "meanElev" | "coast" | "birth" | "age" | "alc" | "smoke" | "docs" | "net" | "airports" | "rail" | "unemp" | "temp" | "density" | "nb" | "north";
export type MetricKey = BaseKey | ExtraKey;

type Lang = "de" | "en";
const nf = (d = 0, lang: Lang = "de") => new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });

export function fmtBig(v: number, unit = "", lang: Lang = "de") {
  const u = unit ? " " + unit : "";
  const en = lang === "en";
  if (v >= 1e12) return nf(1, lang).format(v / 1e12) + (en ? " tn" : " Bio.") + u;
  if (v >= 1e9) return nf(1, lang).format(v / 1e9) + (en ? " bn" : " Mrd.") + u;
  if (v >= 1e6) return nf(1, lang).format(v / 1e6) + (en ? " m" : " Mio.") + u;
  if (v >= 1e4) return nf(0, lang).format(Math.round(v / 1000)) + (en ? "k" : " Tsd.") + u;
  return nf(0, lang).format(v) + u;
}

export const METRICS: Record<MetricKey, { label: string; short: string; question: string; fmt: (v: number) => string }> = {
  pop: { label: "Einwohner", short: "Einwohner", question: "mehr Einwohner", fmt: (v) => fmtBig(v) },
  area: { label: "Fläche", short: "Fläche", question: "eine größere Fläche", fmt: (v) => nf(0).format(v) + " km²" },
  gdppc: { label: "BIP pro Kopf", short: "BIP/Kopf", question: "ein höheres BIP pro Kopf", fmt: (v) => nf(0).format(v) + " $" },
  gdp: { label: "Wirtschaftsleistung (BIP)", short: "BIP", question: "ein höheres BIP", fmt: (v) => fmtBig(v, "$") },
  life: { label: "Lebenserwartung", short: "Lebenserw.", question: "eine höhere Lebenserwartung", fmt: (v) => nf(1).format(v) + " Jahre" },
  mil: { label: "Militärausgaben", short: "Militär", question: "höhere Militärausgaben", fmt: (v) => fmtBig(v, "$") },
  tour: { label: "Touristen pro Jahr", short: "Touristen", question: "mehr Touristen pro Jahr", fmt: (v) => fmtBig(v) },
  forest: { label: "Waldanteil", short: "Wald", question: "einen höheren Waldanteil", fmt: (v) => nf(1).format(v) + " %" },
  urban: { label: "Anteil Stadtbevölkerung", short: "Stadt", question: "einen höheren Anteil Stadtbevölkerung", fmt: (v) => nf(1).format(v) + " %" },
  capPop: { label: "Einwohner der Hauptstadt", short: "Hauptstadt", question: "eine größere Hauptstadt", fmt: (v) => fmtBig(v) },
  elev: { label: "Höchster Berg", short: "Berg", question: "einen höheren höchsten Berg", fmt: (v) => nf(0).format(v) + " m" },
  meanElev: { label: "Durchschnittliche Höhe", short: "Höhe", question: "eine höhere Durchschnittshöhe", fmt: (v) => nf(0).format(v) + " m" },
  coast: { label: "Küstenlänge", short: "Küste", question: "eine längere Küste", fmt: (v) => nf(0).format(v) + " km" },
  birth: { label: "Geburtenrate", short: "Geburten", question: "eine höhere Geburtenrate", fmt: (v) => nf(1).format(v) + " pro 1.000" },
  age: { label: "Durchschnittsalter", short: "Alter", question: "ein höheres Durchschnittsalter", fmt: (v) => nf(1).format(v) + " Jahre" },
  alc: { label: "Alkoholkonsum", short: "Alkohol", question: "einen höheren Alkoholkonsum", fmt: (v) => nf(1).format(v) + " l pro Kopf" },
  smoke: { label: "Raucheranteil", short: "Rauchen", question: "mehr Raucher", fmt: (v) => nf(1).format(v) + " %" },
  docs: { label: "Ärzte pro Einwohner", short: "Ärzte", question: "mehr Ärzte pro Einwohner", fmt: (v) => nf(2).format(v) + " pro 1.000" },
  net: { label: "Internetnutzung", short: "Internet", question: "mehr Internetnutzer", fmt: (v) => nf(0).format(v) + " %" },
  airports: { label: "Flughäfen", short: "Flughäfen", question: "mehr Flughäfen", fmt: (v) => nf(0).format(v) },
  rail: { label: "Schienennetz", short: "Schienen", question: "ein längeres Schienennetz", fmt: (v) => nf(0).format(v) + " km" },
  unemp: { label: "Arbeitslosenquote", short: "Arbeitslose", question: "eine höhere Arbeitslosenquote", fmt: (v) => nf(1).format(v) + " %" },
  temp: { label: "Durchschnittstemperatur", short: "Temperatur", question: "eine höhere Durchschnittstemperatur", fmt: (v) => nf(1).format(v) + " °C" },
  density: { label: "Bevölkerungsdichte", short: "Dichte", question: "eine höhere Bevölkerungsdichte", fmt: (v) => nf(0).format(v) + " pro km²" },
  nb: { label: "Nachbarländer", short: "Nachbarn", question: "mehr Nachbarländer", fmt: (v) => nf(0).format(v) },
  north: { label: "Am weitesten im Norden", short: "Norden", question: "eine nördlichere Lage", fmt: (v) => nf(0).format(Math.abs(v)) + "° " + (v >= 0 ? "N" : "S") },
};

export const METRICS_EN: Record<MetricKey, { label: string; short: string; question: string; fmt: (v: number) => string }> = {
  pop: { label: "Population", short: "Population", question: "a larger population", fmt: (v) => fmtBig(v, "", "en") },
  area: { label: "Area", short: "Area", question: "a larger area", fmt: (v) => nf(0, "en").format(v) + " km²" },
  gdppc: { label: "GDP per capita", short: "GDP/capita", question: "a higher GDP per capita", fmt: (v) => "$" + nf(0, "en").format(v) },
  gdp: { label: "Economic output (GDP)", short: "GDP", question: "a higher GDP", fmt: (v) => "$" + fmtBig(v, "", "en") },
  life: { label: "Life expectancy", short: "Life exp.", question: "a higher life expectancy", fmt: (v) => nf(1, "en").format(v) + " years" },
  mil: { label: "Military spending", short: "Military", question: "higher military spending", fmt: (v) => "$" + fmtBig(v, "", "en") },
  tour: { label: "Tourists per year", short: "Tourists", question: "more tourists per year", fmt: (v) => fmtBig(v, "", "en") },
  forest: { label: "Forest cover", short: "Forest", question: "more forest cover", fmt: (v) => nf(1, "en").format(v) + " %" },
  urban: { label: "Urban population share", short: "Urban", question: "a larger urban population share", fmt: (v) => nf(1, "en").format(v) + " %" },
  capPop: { label: "Population of the capital", short: "Capital", question: "a larger capital", fmt: (v) => fmtBig(v, "", "en") },
  elev: { label: "Highest point", short: "Peak", question: "a higher highest point", fmt: (v) => nf(0, "en").format(v) + " m" },
  meanElev: { label: "Mean elevation", short: "Elevation", question: "a higher mean elevation", fmt: (v) => nf(0, "en").format(v) + " m" },
  coast: { label: "Coastline", short: "Coast", question: "a longer coastline", fmt: (v) => nf(0, "en").format(v) + " km" },
  birth: { label: "Birth rate", short: "Births", question: "a higher birth rate", fmt: (v) => nf(1, "en").format(v) + " per 1,000" },
  age: { label: "Median age", short: "Age", question: "a higher median age", fmt: (v) => nf(1, "en").format(v) + " years" },
  alc: { label: "Alcohol consumption", short: "Alcohol", question: "higher alcohol consumption", fmt: (v) => nf(1, "en").format(v) + " l per person" },
  smoke: { label: "Smoking rate", short: "Smoking", question: "more smokers", fmt: (v) => nf(1, "en").format(v) + " %" },
  docs: { label: "Doctors per person", short: "Doctors", question: "more doctors per person", fmt: (v) => nf(2, "en").format(v) + " per 1,000" },
  net: { label: "Internet use", short: "Internet", question: "more internet users", fmt: (v) => nf(0, "en").format(v) + " %" },
  airports: { label: "Airports", short: "Airports", question: "more airports", fmt: (v) => nf(0, "en").format(v) },
  rail: { label: "Rail network", short: "Rail", question: "a longer rail network", fmt: (v) => nf(0, "en").format(v) + " km" },
  unemp: { label: "Unemployment rate", short: "Unemployment", question: "a higher unemployment rate", fmt: (v) => nf(1, "en").format(v) + " %" },
  temp: { label: "Avg annual temperature", short: "Temperature", question: "a higher average temperature", fmt: (v) => nf(1, "en").format(v) + " °C" },
  density: { label: "Population density", short: "Density", question: "a higher population density", fmt: (v) => nf(0, "en").format(v) + " per km²" },
  nb: { label: "Neighbouring countries", short: "Neighbours", question: "more neighbouring countries", fmt: (v) => nf(0, "en").format(v) },
  north: { label: "Furthest north", short: "North", question: "a more northern location", fmt: (v) => nf(0, "en").format(Math.abs(v)) + "° " + (v >= 0 ? "N" : "S") },
};

/** Small picture for each category (Spitzenplatz). */
export const METRIC_ICON: Record<MetricKey, string> = {
  pop: "👥", area: "📐", gdppc: "💰", gdp: "🏦", life: "❤️", mil: "🛡️", tour: "🧳", forest: "🌲", urban: "🏙️", capPop: "🏛️",
  elev: "🏔️", meanElev: "⛰️", coast: "🌊", birth: "👶", age: "🎂", alc: "🍺", smoke: "🚬", docs: "🩺", net: "📶", airports: "✈️",
  rail: "🚆", unemp: "📉", temp: "🌡️", density: "🧍", nb: "🤝", north: "🧭",
};
export const metricsOf = (lang: Lang) => (lang === "en" ? METRICS_EN : METRICS);

export function val(c: Country, k: MetricKey): number | null {
  switch (k) {
    case "temp":
      return TEMPERATUR[c.id] ?? null;
    case "density":
      return c.pop && c.area ? c.pop / c.area : null;
    case "nb":
      return c.borders.length;
    case "north":
      return c.ll?.[0] ?? null;
  }
  if (!(k in c)) {
    const v = KENNZAHLEN[c.id]?.[k as Kennzahl];
    return typeof v === "number" ? v : null;
  }
  const v = c[k as keyof Country];
  return typeof v === "number" ? v : null;
}

const rankCache: Partial<Record<MetricKey, Record<string, number>>> = {};

/** Global rank (1 = highest value) among the 197 countries; missing data ranks last. */
export function globalRank(k: MetricKey, id: string): number {
  if (!rankCache[k]) {
    const withV = COUNTRIES.filter((c) => val(c, k) != null).sort((a, b) => val(b, k)! - val(a, k)!);
    const r: Record<string, number> = {};
    withV.forEach((c, i) => (r[c.id] = i + 1));
    for (const c of COUNTRIES) if (r[c.id] == null) r[c.id] = withV.length + 1;
    rankCache[k] = r;
  }
  return rankCache[k]![id];
}

const regionCache: Record<string, Record<string, number>> = {};

/**
 * Rank (1 = highest value) of a country among `pool` – ties share a rank, missing data ranks last.
 * `poolKey` names the pool for caching (e.g. "europa").
 */
export function rankIn(k: MetricKey, id: string, pool: Country[], poolKey: string): number {
  const ck = `${poolKey}:${k}`;
  if (!regionCache[ck]) {
    const withV = pool.filter((c) => val(c, k) != null).sort((a, b) => val(b, k)! - val(a, k)!);
    const r: Record<string, number> = {};
    withV.forEach((c, i) => (r[c.id] = i > 0 && val(c, k) === val(withV[i - 1], k) ? r[withV[i - 1].id] : i + 1));
    for (const c of pool) if (r[c.id] == null) r[c.id] = withV.length + 1;
    regionCache[ck] = r;
  }
  return regionCache[ck][id] ?? pool.length + 1;
}
