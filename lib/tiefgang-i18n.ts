import { ALL_COUNTRIES } from "./data/countries";
import { exo } from "./data/exonyms";
import { Q_EN } from "./data/tiefgang-en";

type Lang = "de" | "en";
const COUNTRY_EN = new Map<string, string>();
for (const c of ALL_COUNTRIES) {
  COUNTRY_EN.set(c.n, c.nEn);
  if (c.cap && c.capEn) COUNTRY_EN.set(c.cap, c.capEn);
}

/** An answer's name in the current language (countries, capitals and known exonyms get their English name). */
export const ansName = (name: string, lang: Lang) => (lang === "en" ? COUNTRY_EN.get(name) ?? exo(name) : name);
/** English alternatives for an answer, so English spellings are accepted everywhere. */
export const ansAltsEn = (name: string) => {
  const e = COUNTRY_EN.get(name) ?? exo(name);
  return e !== name ? [e] : [];
};

export const qText = (q: { key: string; text: string }, lang: Lang) => (lang === "en" ? Q_EN[q.key]?.[0] ?? q.text : q.text);
export const qHint = (q: { key: string; hint: string }, lang: Lang) => (lang === "en" ? Q_EN[q.key]?.[1] ?? q.hint : q.hint);
