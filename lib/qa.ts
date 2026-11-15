import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import type { Lang } from "./i18n";
import { slug } from "./slug";

/** "Ist das koscher?" / "Ist das halal?" questions, read at build time from the same files the quiz loads in the browser. */
export type QGame = "koscher" | "halal";
export type QA = { cat: string; q: string; a: string; e: string; src: string; lv?: number; d?: string; slug: string; i: number };

const cache: Partial<Record<QGame, { list: QA[]; en: Record<string, [string, string, string]> }>> = {};

function load(game: QGame) {
  if (cache[game]) return cache[game]!;
  const read = (f: string) => {
    const ctx = { window: {} as Record<string, unknown> };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(process.cwd(), "public", game, f), "utf8"), ctx);
    return ctx.window;
  };
  const w = read("data.js");
  const we = read("data.en.js");
  const raw = (game === "koscher" ? w.QUESTIONS : w.HALAL) as Omit<QA, "slug" | "i">[];
  const en = ((game === "koscher" ? we.QUESTIONS_EN : we.HALAL_EN) || {}) as Record<string, [string, string, string]>;
  const list = raw.map((x, i) => ({ ...x, slug: slug(x.q), i }));
  cache[game] = { list, en };
  return cache[game]!;
}

export const allQA = (game: QGame) => load(game).list;
export const qaBySlug = (game: QGame, s: string) => load(game).list.find((x) => x.slug === s);

/** Question, explanation and source in the page language (falls back to German). */
export function qaText(game: QGame, x: QA, lang: Lang) {
  const en = lang === "en" ? load(game).en[x.q] : undefined;
  return { q: en?.[0] ?? x.q, e: en?.[1] ?? x.e, src: en?.[2] ?? x.src };
}

export const CATS: Record<QGame, string[]> = {
  koscher: ["Essen", "Schabbat", "Feiertage", "Körper", "Alltag"],
  halal: ["Essen", "Geld", "Gebet & Fasten", "Miteinander", "Körper", "Alltag"],
};
const CAT_EN: Record<string, string> = { Essen: "Food", Schabbat: "Shabbat", Feiertage: "Holidays", Körper: "Body", Alltag: "Everyday life", Geld: "Money", "Gebet & Fasten": "Prayer & fasting", Miteinander: "Relationships" };
export const catName = (c: string, lang: Lang) => (lang === "en" ? CAT_EN[c] ?? c : c);

/** Stamp text for an answer, worded like in the quiz. */
export function answerLabel(game: QGame, a: string, cat: string, lang: Lang) {
  const en = lang === "en";
  if (game === "halal") return a === "kommt" ? (en ? "It depends" : "Kommt drauf an") : a === "halal" ? "Halal" : a === "haram" ? "Haram" : "Makruh";
  const food = cat === "Essen";
  if (a === "kommt") return en ? "It depends" : "Kommt drauf an";
  if (a === "ja") return food ? (en ? "Kosher" : "Koscher") : en ? "Allowed" : "Erlaubt";
  return food ? (en ? "Not kosher" : "Nicht koscher") : en ? "Forbidden" : "Verboten";
}

/** "… – ist das koscher?" in the page language. */
export function askLine(game: QGame, cat: string, lang: Lang) {
  const en = lang === "en";
  if (game === "halal") return en ? "Is it halal?" : "Ist das halal?";
  return cat === "Essen" ? (en ? "Is it kosher?" : "Ist das koscher?") : en ? "Is it allowed?" : "Ist das erlaubt?";
}

export const LEVEL = (lv: number | undefined, lang: Lang) => {
  const k = lv ?? 2;
  return lang === "en" ? ["", "Easy", "Medium", "Hard"][k] : ["", "Leicht", "Mittel", "Schwer"][k];
};
