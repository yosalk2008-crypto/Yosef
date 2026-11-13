import { canon, distance } from "./fuzzy";
import { BY_ID, COUNTRIES, CONTINENTS, SUBREGION_DE, norm, type Country } from "./data/countries";
import { BEKANNTHEIT } from "./data/bekanntheit";
import { KATALOG, cleanAnswers, type KatalogPrompt } from "./data/tiefgang-katalog";
import { EXTEND, KATALOG3 } from "./data/tiefgang-katalog3";
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

/** Fixed country sets: rarity comes from the AI fame ratings, names and spellings from the country data. */
const SETS: { key: string; text: string; hint: string; ids: string[] }[] = [
  { key: "ostsee", text: "Nenne ein Land, das an die Ostsee grenzt.", hint: "Alle Anrainerstaaten der Ostsee.", ids: ["DEU", "DNK", "SWE", "FIN", "RUS", "EST", "LVA", "LTU", "POL"] },
  { key: "mittelmeer", text: "Nenne ein Land mit Küste am Mittelmeer.", hint: "Auch Inselstaaten im Mittelmeer zählen.", ids: ["ESP", "FRA", "MCO", "ITA", "MLT", "SVN", "HRV", "BIH", "MNE", "ALB", "GRC", "TUR", "CYP", "SYR", "LBN", "PSE", "EGY", "LBY", "TUN", "DZA", "MAR"] },
  { key: "schwarzes-meer", text: "Nenne ein Land am Schwarzen Meer.", hint: "Alle Länder mit Küste am Schwarzen Meer.", ids: ["TUR", "BGR", "ROU", "UKR", "RUS", "GEO"] },
  { key: "donau", text: "Nenne ein Land, durch das die Donau fließt.", hint: "Auch Länder, an deren Grenze sie entlangfließt.", ids: ["DEU", "AUT", "SVK", "HUN", "HRV", "SRB", "BGR", "ROU", "MDA", "UKR"] },
  { key: "alpen", text: "Nenne ein Land mit Anteil an den Alpen.", hint: "Die acht Alpenstaaten.", ids: ["FRA", "MCO", "ITA", "CHE", "LIE", "AUT", "DEU", "SVN"] },
  { key: "aequator", text: "Nenne ein Land, durch das der Äquator verläuft.", hint: "Land oder Hoheitsgewässer – 13 Staaten.", ids: ["ECU", "COL", "BRA", "STP", "GAB", "COG", "COD", "UGA", "KEN", "SOM", "MDV", "IDN", "KIR"] },
  { key: "spanisch", text: "Nenne ein Land mit Spanisch als Amtssprache.", hint: "Staaten, in denen Spanisch (Mit-)Amtssprache ist.", ids: ["ESP", "MEX", "GTM", "HND", "SLV", "NIC", "CRI", "PAN", "CUB", "DOM", "COL", "VEN", "ECU", "PER", "BOL", "CHL", "ARG", "PRY", "URY", "GNQ"] },
  { key: "portugiesisch", text: "Nenne ein Land mit Portugiesisch als Amtssprache.", hint: "Die portugiesischsprachigen Staaten.", ids: ["PRT", "BRA", "AGO", "MOZ", "CPV", "GNB", "STP", "TLS", "GNQ"] },
  { key: "arabisch", text: "Nenne ein Land mit Arabisch als Amtssprache.", hint: "Staaten, in denen Arabisch (Mit-)Amtssprache ist.", ids: ["DZA", "BHR", "COM", "DJI", "EGY", "IRQ", "JOR", "KWT", "LBN", "LBY", "MRT", "MAR", "OMN", "PSE", "QAT", "SAU", "SOM", "SDN", "SYR", "TUN", "ARE", "YEM", "TCD"] },
  { key: "deutsch", text: "Nenne ein Land mit Deutsch als Amtssprache.", hint: "Landesweite Amtssprache – Regionen wie Südtirol zählen nicht.", ids: ["DEU", "AUT", "CHE", "LIE", "LUX", "BEL"] },
  { key: "euro", text: "Nenne ein Land, in dem man mit dem Euro bezahlt.", hint: "Euro-Länder und Staaten, die den Euro offiziell nutzen.", ids: ["AUT", "BEL", "HRV", "CYP", "EST", "FIN", "FRA", "DEU", "GRC", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "PRT", "SVK", "SVN", "ESP", "BGR", "AND", "MCO", "SMR", "VAT", "MNE"] },
  { key: "eu", text: "Nenne ein Mitgliedsland der Europäischen Union.", hint: "Die 27 EU-Staaten.", ids: ["AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE"] },
  { key: "g7", text: "Nenne ein Land der G7.", hint: "Die sieben großen Industrienationen.", ids: ["USA", "JPN", "DEU", "GBR", "FRA", "ITA", "CAN"] },
  { key: "monarchie", text: "Nenne ein Land mit einem König, Kaiser, Sultan, Emir oder Fürsten an der Spitze.", hint: "Auch Länder mit dem britischen König als Staatsoberhaupt zählen.", ids: ["GBR", "ESP", "NLD", "BEL", "LUX", "DNK", "NOR", "SWE", "MCO", "LIE", "AND", "VAT", "JPN", "THA", "KHM", "MYS", "BRN", "BTN", "SAU", "JOR", "KWT", "BHR", "QAT", "ARE", "OMN", "MAR", "SWZ", "LSO", "TON", "CAN", "AUS", "NZL", "JAM", "BHS", "BLZ", "ATG", "GRD", "KNA", "LCA", "VCT", "PNG", "SLB", "TUV"] },
  { key: "stan", text: "Nenne ein Land, dessen Name auf „-stan“ endet.", hint: "Es zählt der deutsche Name.", ids: ["AFG", "PAK", "KAZ", "UZB", "TKM", "KGZ", "TJK"] },
];
for (const set of SETS)
  TEMPLATES.push({ key: "set:" + set.key, make: () => ({ key: "set:" + set.key, text: set.text, hint: set.hint, answers: countryAnswers(set.ids.map((id) => BY_ID[id]).filter(Boolean)) }) });

TEMPLATES.push(
  { key: "pop100", make: () => ({ key: "pop100", text: "Nenne ein Land mit mehr als 100 Millionen Einwohnern.", hint: "Grundlage sind die aktuellen Zahlen der Weltbank.", answers: countryAnswers(COUNTRIES.filter((c) => (c.pop ?? 0) > 1e8)) }) },
  { key: "ien", make: () => ({ key: "ien", text: "Nenne ein Land, dessen deutscher Name auf „-ien“ endet.", hint: "Wie Spanien oder Indien.", answers: countryAnswers(COUNTRIES.filter((c) => /ien$/.test(c.n))) }) },
  {
    key: "capbig",
    make: () => {
      const list = COUNTRIES.filter((c) => c.cap && (c.capPop ?? 0) > 5e6);
      return { key: "capbig", text: "Nenne eine Hauptstadt mit mehr als 5 Millionen Einwohnern.", hint: "Einwohner der Stadt selbst, nicht des Landes.", answers: scored(list.map((c) => ({ id: "cap-" + c.id, name: c.cap!, alt: c.capAlt, fame: fame(c) }))) };
    },
  },
  {
    key: "capletter",
    make: (rng) => {
      const L = rng.pick("ABKLMPST".split(""));
      const list = COUNTRIES.filter((c) => c.cap && c.cap.toUpperCase().startsWith(L));
      return { key: "capletter:" + L, text: `Nenne eine Hauptstadt, die mit „${L}“ beginnt.`, hint: "Es zählt der deutsche Name der Hauptstadt.", answers: scored(list.map((c) => ({ id: "cap-" + c.id, name: c.cap!, alt: c.capAlt, fame: fame(c) }))) };
    },
  }
);

function curatedQ(p: KatalogPrompt): Question {
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
}
const CURATED: Question[] = KATALOG.map(curatedQ);

/** Pools as they were before the big expansion on 12 Nov 2026 – keeps older daily puzzles (and saved games) unchanged. */
const LEGACY_TEMPLATES = TEMPLATES.slice(0, 12);
const LEGACY_CURATED_KEYS = ["fluss-europa", "fluss-afrika", "fluss-asien", "fluss-amerika", "gebirge", "berg-4000", "insel-mittelmeer", "meer", "wueste", "see-europa", "vulkan", "insel-deutschland", "stadt-rhein", "us-staat", "kanton", "de-grossstadt", "bundesland-hauptstadt"];
const LEGACY_CURATED = LEGACY_CURATED_KEYS.map((k) => CURATED.find((q) => q.key === "k:" + k)!);
const EXPANDED_FROM = "2026-11-12";

function pickQuestions(rng: Rng, n: number, legacy = false): Question[] {
  const CUR = legacy ? LEGACY_CURATED : CURATED;
  const TPL = legacy ? LEGACY_TEMPLATES : TEMPLATES;
  // 4 curated prompts + 3 country prompts, mixed
  const curated = rng.sample(CUR, Math.min(4, CUR.length));
  const out: Question[] = [...curated];
  const usedTypes = new Set<string>();
  let guard = 0;
  while (out.length < n && guard++ < 500) {
    const t = rng.pick(TPL);
    if (usedTypes.has(t.key)) continue;
    const q = t.make(rng);
    if (!q || q.answers.length < 5 || out.some((o) => o.key === q.key)) continue;
    usedTypes.add(t.key);
    out.push(q);
  }
  return rng.shuffle(out);
}

// ---------- pool from 14 Nov 2026: only prompts with at least 50 valid answers ----------
const BIG_FROM = "2026-11-14";
const MIN_ANSWERS = 50;

const CURATED3: Question[] = [
  ...KATALOG.map((p) => curatedQ(EXTEND[p.key] ? { ...p, answers: [...p.answers, ...EXTEND[p.key]] } : p)),
  ...KATALOG3.map(curatedQ),
].filter((q) => q.answers.length >= MIN_ANSWERS);

const capAnswers = (list: Country[]) => scored(list.filter((c) => c.cap).map((c) => ({ id: "cap-" + c.id, name: c.cap!, alt: c.capAlt, fame: fame(c) })));
const ofCont = (...cs: string[]) => COUNTRIES.filter((c) => cs.includes(c.cont));
const WB = "Grundlage sind die aktuellen Zahlen der Weltbank.";
const hue = (h: string) => {
  const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let H = 0;
  if (d) {
    if (mx === r) H = ((g - b) / d) % 6;
    else if (mx === g) H = (b - r) / d + 2;
    else H = (r - g) / d + 4;
    H *= 60;
    if (H < 0) H += 360;
  }
  const S = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  if (l > 0.9) return "weiß";
  if (l < 0.12) return "schwarz";
  if (S < 0.2) return l > 0.6 ? "weiß" : "grau";
  if (H < 15 || H >= 340) return "rot";
  if (H < 45) return "orange";
  if (H < 70) return "gelb";
  if (H < 170) return "grün";
  if (H < 260) return "blau";
  return "lila";
};
const flagHas = (col: string) => COUNTRIES.filter((c) => c.flag.colors.some((h) => hue(h) === col));
const SET_IDS = {
  commonwealth: ["ATG", "AUS", "BHS", "BGD", "BRB", "BLZ", "BWA", "BRN", "CMR", "CAN", "CYP", "DMA", "SWZ", "FJI", "GAB", "GMB", "GHA", "GRD", "GUY", "IND", "JAM", "KEN", "KIR", "LSO", "MWI", "MYS", "MDV", "MLT", "MUS", "MOZ", "NAM", "NRU", "NZL", "NGA", "PAK", "PNG", "RWA", "KNA", "LCA", "VCT", "WSM", "SYC", "SLE", "SGP", "SLB", "ZAF", "LKA", "TZA", "TGO", "TON", "TTO", "TUV", "UGA", "GBR", "VUT", "ZMB"],
  englisch: ["GBR", "IRL", "MLT", "USA", "CAN", "AUS", "NZL", "IND", "PAK", "PHL", "SGP", "ZAF", "NGA", "GHA", "KEN", "UGA", "TZA", "ZMB", "ZWE", "MWI", "BWA", "NAM", "LSO", "SWZ", "SLE", "LBR", "GMB", "CMR", "RWA", "BDI", "SSD", "SDN", "ERI", "SYC", "MUS", "JAM", "BHS", "BRB", "TTO", "GUY", "BLZ", "ATG", "DMA", "GRD", "KNA", "LCA", "VCT", "FJI", "PNG", "SLB", "VUT", "WSM", "TON", "KIR", "TUV", "NRU", "MHL", "FSM", "PLW"],
  atlantik: ["ISL", "IRL", "GBR", "FRA", "ESP", "PRT", "MAR", "MRT", "SEN", "GMB", "GNB", "GIN", "SLE", "LBR", "CIV", "GHA", "TGO", "BEN", "NGA", "CMR", "GNQ", "GAB", "COG", "COD", "AGO", "NAM", "ZAF", "CPV", "STP", "CAN", "USA", "MEX", "BLZ", "GTM", "HND", "NIC", "CRI", "PAN", "COL", "VEN", "GUY", "SUR", "BRA", "URY", "ARG", "CUB", "JAM", "HTI", "DOM", "BHS", "BRB", "TTO", "GRD", "VCT", "LCA", "DMA", "ATG", "KNA", "NOR", "BEL", "NLD", "DEU", "DNK"],
};
const AU_IDS = COUNTRIES.filter((c) => c.cont === "Afrika").map((c) => c.id);
const fixed = (key: string, text: string, hint: string, answers: Answer[]): Question => ({ key: "b:" + key, text, hint, answers });
const byIds = (ids: string[]) => countryAnswers(ids.map((id) => BY_ID[id]).filter(Boolean));
const C = COUNTRIES;
const BIG_TEMPLATES: Question[] = [
  { key: "cont:Afrika", text: `Nenne ein Land ${CONT_TEXT.Afrika}.`, hint: "Je unbekannter das Land, desto tiefer tauchst du.", answers: countryAnswers(ofCont("Afrika")) },
  { key: "cap:Afrika", text: `Nenne eine Hauptstadt ${CONT_TEXT.Afrika}.`, hint: "Nur die Hauptstadt eines Landes zählt, nicht das Land selbst.", answers: capAnswers(ofCont("Afrika")) },
  fixed("welt", "Nenne irgendein Land der Welt.", "Alle anerkannten Staaten zählen – je unbekannter, desto tiefer.", countryAnswers(C)),
  fixed("cap-welt", "Nenne irgendeine Hauptstadt der Welt.", "Nur Hauptstädte von Staaten zählen.", capAnswers(C)),
  fixed("asoz", "Nenne ein Land in Asien oder Ozeanien.", "Je unbekannter das Land, desto tiefer tauchst du.", countryAnswers(ofCont("Asien", "Ozeanien"))),
  fixed("cap-asoz", "Nenne eine Hauptstadt in Asien oder Ozeanien.", "Nur die Hauptstadt eines Landes zählt.", capAnswers(ofCont("Asien", "Ozeanien"))),
  fixed("euas", "Nenne ein Land in Europa oder Asien.", "Je unbekannter das Land, desto tiefer tauchst du.", countryAnswers(ofCont("Europa", "Asien"))),
  fixed("cap-euas", "Nenne eine Hauptstadt in Europa oder Asien.", "Nur die Hauptstadt eines Landes zählt.", capAnswers(ofCont("Europa", "Asien"))),
  fixed("pop5", "Nenne ein Land mit mehr als 5 Millionen Einwohnern.", WB, countryAnswers(C.filter((c) => (c.pop ?? 0) > 5e6))),
  fixed("pop10", "Nenne ein Land mit mehr als 10 Millionen Einwohnern.", WB, countryAnswers(C.filter((c) => (c.pop ?? 0) > 1e7))),
  fixed("pop20", "Nenne ein Land mit mehr als 20 Millionen Einwohnern.", WB, countryAnswers(C.filter((c) => (c.pop ?? 0) > 2e7))),
  fixed("pop-klein", "Nenne ein Land mit weniger als 5 Millionen Einwohnern.", WB, countryAnswers(C.filter((c) => c.pop != null && c.pop < 5e6))),
  fixed("pop10-50", "Nenne ein Land mit 10 bis 50 Millionen Einwohnern.", WB, countryAnswers(C.filter((c) => (c.pop ?? 0) > 1e7 && (c.pop ?? 0) < 5e7))),
  fixed("area100k", "Nenne ein Land, das größer ist als 100.000 km².", "Zum Vergleich: Island hat etwa 103.000 km².", countryAnswers(C.filter((c) => c.area > 1e5))),
  fixed("area500k", "Nenne ein Land, das größer ist als 500.000 km².", "Zum Vergleich: Frankreich hat etwa 550.000 km².", countryAnswers(C.filter((c) => c.area > 5e5))),
  fixed("area-u100k", "Nenne ein Land, das kleiner ist als 100.000 km².", "Zum Vergleich: Österreich hat etwa 84.000 km².", countryAnswers(C.filter((c) => c.area < 1e5))),
  fixed("area-gt-de", "Nenne ein Land, das größer ist als Deutschland.", "Deutschland hat etwa 357.000 km².", countryAnswers(C.filter((c) => c.area > 357600))),
  fixed("area-lt-de", "Nenne ein Land, das kleiner ist als Deutschland.", "Deutschland hat etwa 357.000 km².", countryAnswers(C.filter((c) => c.area < 357000))),
  fixed("kueste", "Nenne ein Land mit Zugang zum Meer.", "Alle Länder, die keine Binnenstaaten sind.", countryAnswers(C.filter((c) => !c.landlocked))),
  fixed("nb3", "Nenne ein Land mit mindestens drei Nachbarländern.", "Gezählt werden Landgrenzen.", countryAnswers(C.filter((c) => c.borders.length >= 3))),
  fixed("nb4", "Nenne ein Land mit mindestens vier Nachbarländern.", "Gezählt werden Landgrenzen.", countryAnswers(C.filter((c) => c.borders.length >= 4))),
  fixed("west", "Nenne ein Land, das (überwiegend) westlich des Nullmeridians liegt.", "Der Nullmeridian verläuft durch Greenwich in London.", countryAnswers(C.filter((c) => c.ll[1] < 0))),
  fixed("ost-de", "Nenne ein Land, das (überwiegend) östlich von Deutschland liegt.", "Gemeint ist die Himmelsrichtung, nicht nur die Nachbarn.", countryAnswers(C.filter((c) => c.ll[1] > 10))),
  fixed("bip-arm", "Nenne ein Land mit einem BIP pro Kopf unter 5.000 US-Dollar.", WB, countryAnswers(C.filter((c) => c.gdppc != null && c.gdppc < 5000))),
  fixed("bip10", "Nenne ein Land mit einem BIP pro Kopf über 10.000 US-Dollar.", WB, countryAnswers(C.filter((c) => (c.gdppc ?? 0) > 1e4))),
  fixed("bip20", "Nenne ein Land mit einem BIP pro Kopf über 20.000 US-Dollar.", WB, countryAnswers(C.filter((c) => (c.gdppc ?? 0) > 2e4))),
  fixed("gdp100", "Nenne ein Land mit einer Wirtschaftsleistung über 100 Milliarden US-Dollar.", "Bruttoinlandsprodukt pro Jahr. " + WB, countryAnswers(C.filter((c) => (c.gdp ?? 0) > 1e11))),
  fixed("gdp50", "Nenne ein Land mit einer Wirtschaftsleistung über 50 Milliarden US-Dollar.", "Bruttoinlandsprodukt pro Jahr. " + WB, countryAnswers(C.filter((c) => (c.gdp ?? 0) > 5e10))),
  fixed("life70", "Nenne ein Land, in dem die Lebenserwartung unter 70 Jahren liegt.", WB, countryAnswers(C.filter((c) => c.life != null && c.life < 70))),
  fixed("life75", "Nenne ein Land, in dem die Lebenserwartung über 75 Jahren liegt.", WB, countryAnswers(C.filter((c) => (c.life ?? 0) > 75))),
  fixed("life78", "Nenne ein Land, in dem die Lebenserwartung über 78 Jahren liegt.", WB, countryAnswers(C.filter((c) => (c.life ?? 0) > 78))),
  fixed("wald30", "Nenne ein Land, das zu mehr als 30 % mit Wald bedeckt ist.", WB, countryAnswers(C.filter((c) => (c.forest ?? 0) > 30))),
  fixed("wald50", "Nenne ein Land, das zu mehr als der Hälfte mit Wald bedeckt ist.", WB, countryAnswers(C.filter((c) => (c.forest ?? 0) > 50))),
  fixed("stadt70", "Nenne ein Land, in dem mehr als 70 % der Menschen in Städten leben.", WB, countryAnswers(C.filter((c) => (c.urban ?? 0) > 70))),
  fixed("land50", "Nenne ein Land, in dem weniger als die Hälfte der Menschen in Städten lebt.", WB, countryAnswers(C.filter((c) => c.urban != null && c.urban < 50))),
  fixed("tourismus", "Nenne ein Land mit mehr als einer Million Touristen pro Jahr.", WB, countryAnswers(C.filter((c) => (c.tour ?? 0) > 1e6))),
  fixed("militaer1", "Nenne ein Land, das mehr als 1 Milliarde US-Dollar im Jahr für sein Militär ausgibt.", WB, countryAnswers(C.filter((c) => (c.mil ?? 0) > 1e9))),
  fixed("militaer5", "Nenne ein Land, das mehr als 5 Milliarden US-Dollar im Jahr für sein Militär ausgibt.", WB, countryAnswers(C.filter((c) => (c.mil ?? 0) > 5e9))),
  fixed("cap1m", "Nenne eine Hauptstadt mit mehr als einer Million Einwohnern.", "Einwohner der Stadt selbst, nicht des Landes.", capAnswers(C.filter((c) => (c.capPop ?? 0) > 1e6))),
  fixed("cap2m", "Nenne eine Hauptstadt mit mehr als zwei Millionen Einwohnern.", "Einwohner der Stadt selbst, nicht des Landes.", capAnswers(C.filter((c) => (c.capPop ?? 0) > 2e6))),
  fixed("cap-klein", "Nenne eine Hauptstadt mit weniger als 500.000 Einwohnern.", "Einwohner der Stadt selbst, nicht des Landes.", capAnswers(C.filter((c) => c.capPop != null && c.capPop < 5e5))),
  fixed("cap-pop10", "Nenne die Hauptstadt eines Landes mit mehr als 10 Millionen Einwohnern.", "Es zählt die Einwohnerzahl des Landes.", capAnswers(C.filter((c) => (c.pop ?? 0) > 1e7))),
  fixed("cap-pop-klein", "Nenne die Hauptstadt eines Landes mit weniger als 5 Millionen Einwohnern.", "Es zählt die Einwohnerzahl des Landes.", capAnswers(C.filter((c) => c.pop != null && c.pop < 5e6))),
  fixed("cap-area100k", "Nenne die Hauptstadt eines Landes, das größer ist als 100.000 km².", "Es zählt die Fläche des Landes.", capAnswers(C.filter((c) => c.area > 1e5))),
  fixed("cap-bip10", "Nenne die Hauptstadt eines Landes mit einem BIP pro Kopf über 10.000 US-Dollar.", WB, capAnswers(C.filter((c) => (c.gdppc ?? 0) > 1e4))),
  fixed("cap-nb3", "Nenne die Hauptstadt eines Landes mit mindestens drei Nachbarländern.", "Gezählt werden Landgrenzen des Landes.", capAnswers(C.filter((c) => c.borders.length >= 3))),
  fixed("name-lang", "Nenne ein Land, dessen deutscher Name mehr als acht Buchstaben hat.", "Leerzeichen und Bindestriche zählen nicht mit.", countryAnswers(C.filter((c) => c.n.replace(/[\s-]/g, "").length > 8))),
  fixed("name-kurz", "Nenne ein Land, dessen deutscher Name höchstens sechs Buchstaben hat.", "Wie Irak oder Chile.", countryAnswers(C.filter((c) => c.n.replace(/[\s-]/g, "").length <= 6))),
  fixed("flagge-rot", "Nenne ein Land mit Rot in der Flagge.", "Auch kleine rote Teile in der Flagge zählen.", countryAnswers(flagHas("rot"))),
  fixed("flagge-gruen", "Nenne ein Land mit Grün in der Flagge.", "Auch kleine grüne Teile in der Flagge zählen.", countryAnswers(flagHas("grün"))),
  fixed("flagge-blau", "Nenne ein Land mit Blau in der Flagge.", "Auch kleine blaue Teile in der Flagge zählen.", countryAnswers(flagHas("blau"))),
  fixed("flagge-gelb", "Nenne ein Land mit Gelb oder Gold in der Flagge.", "Auch kleine gelbe Teile in der Flagge zählen.", countryAnswers(flagHas("gelb"))),
  fixed("flagge-schwarz", "Nenne ein Land mit Schwarz in der Flagge.", "Auch kleine schwarze Teile in der Flagge zählen.", countryAnswers(flagHas("schwarz"))),
  fixed("flagge-weiss", "Nenne ein Land mit Weiß in der Flagge.", "Auch kleine weiße Teile in der Flagge zählen.", countryAnswers(flagHas("weiß"))),
  fixed("commonwealth", "Nenne ein Mitglied des Commonwealth of Nations.", "Die 56 Mitgliedsstaaten.", byIds(SET_IDS.commonwealth)),
  fixed("englisch", "Nenne ein Land mit Englisch als Amtssprache.", "Staaten, in denen Englisch (Mit-)Amtssprache ist.", byIds(SET_IDS.englisch)),
  fixed("afrikanische-union", "Nenne ein Mitglied der Afrikanischen Union.", "Alle afrikanischen Staaten.", byIds(AU_IDS)),
  fixed("atlantik", "Nenne ein Land mit Küste am Atlantik.", "Inklusive Nordsee, Karibik und Golf von Mexiko.", byIds(SET_IDS.atlantik)),
].filter((q) => q.answers.length >= MIN_ANSWERS);

function pickBig(rng: Rng, n: number): Question[] {
  const curated = rng.sample(CURATED3, Math.min(4, CURATED3.length));
  const rest = rng.sample(BIG_TEMPLATES, n - curated.length);
  return rng.shuffle([...curated, ...rest]);
}

export const ALL_CURATED = CURATED;
/** Everything that can come up from 14 Nov 2026 (for checks and stats). */
export const BIG_POOL = [...CURATED3, ...BIG_TEMPLATES];

export function dailyQuestions(day: string): Question[] {
  const rng = makeRng(`${day}:tiefgang`);
  if (day < BIG_FROM) return pickQuestions(rng, ROUNDS, day < EXPANDED_FROM);
  return pickBig(rng, ROUNDS);
}

export function randomQuestions(n = ROUNDS): Question[] {
  return pickBig(makeRng(Math.floor(Math.random() * 2 ** 32)), n);
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
      // compare with and without the "-Stadt" stripping, so "Basel-Statd" still finds "Basel-Stadt"
      const k = canon(name);
      const full = norm(name).replace(/\s+/g, "");
      const d = Math.min(distance(x, k), distance(norm(input).replace(/\s+/g, ""), full));
      const tol = full.length <= 5 ? 1 : 2;
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
