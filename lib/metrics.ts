import { COUNTRIES, type Country } from "./data/countries";

export type MetricKey = "pop" | "area" | "gdppc" | "gdp" | "life" | "mil" | "tour" | "forest" | "urban" | "capPop";

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
};
export const metricsOf = (lang: Lang) => (lang === "en" ? METRICS_EN : METRICS);

export function val(c: Country, k: MetricKey): number | null {
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
