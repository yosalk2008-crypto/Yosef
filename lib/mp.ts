"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPA_KEY, SUPA_URL } from "./leaderboard";
import { entitiesFor } from "./data/regions";
import { flagUrl } from "./data/countries";
import { randomRng } from "./rng";
import { BIG_POOL, randomQuestions, type Question } from "./tiefgang";
import { LAUNCH, addDays, utcDate, type DailyResult, type GameKey } from "./daily";
import { GAMES } from "./games";
import { pointsFor } from "./leaderboard";

// ---------- games ----------

/** Daily games that can be played in a room (Spurensuche is left out: every round costs Street View loads). */
export type DailyId = Exclude<GameKey, "tiefgang" | "spurensuche">;
export type GameId = "koscher" | "halal" | "flaggen" | "hauptstaedte" | "tiefgang" | DailyId;
export const isDaily = (g: GameId): g is DailyId => GAMES.some((x) => x.key === g);

type MpGame = { id: GameId; title: string; desc: string; titleEn: string; descEn: string; bg: string; edge: string; light: boolean };
export const MP_GAMES: MpGame[] = [
  { id: "koscher", title: "Ist das koscher?", desc: "Erlaubt, verboten oder kommt drauf an", titleEn: "Is it kosher?", descEn: "Allowed, forbidden or it depends", bg: "linear-gradient(160deg, #1f4fd1, #0a1630)", edge: "#050c1f", light: true },
  { id: "halal", title: "Ist das halal?", desc: "Halal, haram, makruh oder kommt drauf an", titleEn: "Is it halal?", descEn: "Halal, haram, makruh or it depends", bg: "linear-gradient(160deg, #12a06d, #062a20)", edge: "#03170f", light: true },
  { id: "tiefgang", title: "Tiefgang", desc: "Je seltener die richtige Antwort, desto mehr Punkte", titleEn: "Deep Dive", descEn: "The rarer the correct answer, the more points", bg: "linear-gradient(160deg, #3f96d6, #0a2656)", edge: "#061a3d", light: true },
  { id: "flaggen", title: "Flaggen raten", desc: "Welches Land hat diese Flagge?", titleEn: "Guess the flag", descEn: "Which country has this flag?", bg: "#6aa8f0", edge: "#4b88d1", light: false },
  { id: "hauptstaedte", title: "Hauptstädte", desc: "Vier Städte, eine ist die Hauptstadt", titleEn: "Capitals", descEn: "Four cities, one is the capital", bg: "#f3d272", edge: "#c9a43c", light: false },
];
/** The daily games, each round a random puzzle from the archive. */
export const MP_DAILY = GAMES.filter((g) => g.key !== "spurensuche" && g.key !== "tiefgang").map((g) => ({
  id: g.key as DailyId,
  title: g.title,
  desc: g.tagline,
  titleEn: g.titleEn,
  descEn: g.taglineEn,
  bg: g.bg,
  edge: g.edge,
  light: false,
}));
export const gameOf = (id: GameId) => [...MP_GAMES, ...MP_DAILY].find((g) => g.id === id) ?? MP_GAMES[0];
export const gameTitle = (id: GameId, lang: "de" | "en") => (lang === "en" ? gameOf(id).titleEn : gameOf(id).title);
export const gameDesc = (g: { desc: string; descEn: string }, lang: "de" | "en") => (lang === "en" ? g.descEn : g.desc);

// ---------- shared room state (sent by the admin to everyone) ----------

/** Questions carry both languages, so German and English players can share a room. */
export type Opt = { id: string; label: string; labelEn?: string };
export type QView =
  | { kind: "choice"; text: string; cat?: string; img?: string; options: Opt[]; textEn?: string; catEn?: string }
  | { kind: "tiefgang"; key: string; text: string; hint: string }
  | { kind: "daily"; game: DailyId; day: string };
/** A question as only the admin knows it (with the solution). */
export type HostQ = { view: QView; correct?: string; explain?: string; src?: string; explainEn?: string; srcEn?: string };
/** One player's answer as everyone sees it after the question. */
export type PAns = { label: string; choice?: string; ok: boolean; pts: number; share?: string };
export type Reveal = {
  correct?: string;
  explain?: string;
  src?: string;
  explainEn?: string;
  srcEn?: string;
  answers: Record<string, PAns | null>;
  rare?: { name: string; pts: number; id?: string }[];
};
export type Phase = "lobby" | "frage" | "aufloesung" | "ende";

export type RoomState = {
  seq: number;
  round: number; // counts started games, so old answers never leak into a new game
  code: string;
  hostId: string;
  title: string;
  pub: boolean;
  game: GameId;
  n: number;
  secs: number; // 0 = no time limit
  phase: Phase;
  i: number;
  total: number;
  q: QView | null;
  endsAt: number; // admin clock, 0 = no limit
  sentAt: number; // admin clock when this state was sent
  done: string[]; // players who answered the current question
  reveal: Reveal | null;
  scores: Record<string, number>;
  names: Record<string, string>;
};

/** What a player sends when answering. */
export type AnswerMsg = { pid: string; i: number; choice?: string; tg?: { id: string } | null; daily?: Pick<DailyResult, "done" | "won" | "score" | "max" | "label" | "share"> };

export const MAX_PLAYERS = 30;
export const COUNTS = [5, 10, 15, 20];
export const TIMES = [0, 15, 30, 60];
/** Daily games: how many puzzles, and minutes rather than seconds. */
export const DAILY_COUNTS = [1, 3, 5, 10];
export const DAILY_TIMES = [0, 120, 300, 600];
export const countsFor = (g: GameId) => (isDaily(g) ? DAILY_COUNTS : COUNTS);
export const timesFor = (g: GameId) => (isDaily(g) ? DAILY_TIMES : TIMES);
export const TIEFGANG_DEFAULT_SECS = 30;

// ---------- questions ----------

type RawQ = { cat: string; q: string; a: string; e: string; src: string };

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(`script[data-k="${src}"]`);
    if (found?.dataset.ready) return resolve();
    const s = found ?? document.createElement("script");
    s.addEventListener("load", () => {
      s.dataset.ready = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error(src)));
    if (!found) {
      s.src = src;
      s.dataset.k = src;
      document.body.appendChild(s);
    }
  });
}

async function dataset(file: string, global: string): Promise<RawQ[]> {
  const w = window as unknown as Record<string, unknown>;
  if (!Array.isArray(w[global])) await loadScript(`${file}?mp=${utcDate()}`);
  return (w[global] as RawQ[]) || [];
}

const HALAL_LABEL: Record<string, string> = { halal: "Halal", haram: "Haram", makruh: "Makruh", kommt: "Kommt drauf an" };
const HALAL_LABEL_EN: Record<string, string> = { halal: "Halal", haram: "Haram", makruh: "Makruh", kommt: "It depends" };
/** English texts keyed by the German question: [question, explanation, source] */
type EnMap = Record<string, [string, string, string]>;
async function english(file: string, global: string): Promise<EnMap> {
  const w = window as unknown as Record<string, unknown>;
  try {
    if (!w[global]) await loadScript(`${file}?mp=${utcDate()}`);
  } catch {}
  return (w[global] as EnMap) || {};
}
export const CAT_EN: Record<string, string> = {
  Essen: "Food",
  Alltag: "Everyday life",
  Feiertage: "Holidays",
  Körper: "Body",
  Schabbat: "Shabbat",
  "Gebet & Fasten": "Prayer & fasting",
  Geld: "Money",
  Miteinander: "Relationships",
};

export async function buildQuestions(game: GameId, n: number): Promise<HostQ[]> {
  const rng = randomRng();
  if (isDaily(game)) {
    // random puzzles from the archive (up to yesterday), never the same day twice
    const span = Math.round((Date.parse(utcDate()) - Date.parse(LAUNCH)) / 86400000);
    const days = new Set<string>();
    while (days.size < Math.min(n, span)) days.add(addDays(LAUNCH, rng.int(span)));
    return [...days].map((day) => ({ view: { kind: "daily", game, day } }));
  }
  if (game === "koscher") {
    const raw = await dataset("/koscher/data.js", "QUESTIONS");
    const en = await english("/koscher/data.en.js", "QUESTIONS_EN");
    return rng.sample(raw, Math.min(n, raw.length)).map((r) => {
      const food = r.cat === "Essen";
      const e = en[r.q];
      return {
        view: {
          kind: "choice",
          text: r.q,
          cat: r.cat,
          textEn: e?.[0],
          catEn: CAT_EN[r.cat],
          options: [
            { id: "ja", label: food ? "Koscher" : "Erlaubt", labelEn: food ? "Kosher" : "Allowed" },
            { id: "nein", label: food ? "Nicht koscher" : "Verboten", labelEn: food ? "Not kosher" : "Forbidden" },
            { id: "kommt", label: "Kommt drauf an", labelEn: "It depends" },
          ],
        },
        correct: r.a,
        explain: r.e,
        src: r.src,
        explainEn: e?.[1],
        srcEn: e?.[2],
      };
    });
  }
  if (game === "halal") {
    const raw = await dataset("/halal/data.js", "HALAL");
    const en = await english("/halal/data.en.js", "HALAL_EN");
    return rng.sample(raw, Math.min(n, raw.length)).map((r) => {
      const e = en[r.q];
      return {
        view: {
          kind: "choice",
          text: r.q,
          cat: r.cat,
          textEn: e?.[0],
          catEn: CAT_EN[r.cat],
          options: ["halal", "haram", "makruh", "kommt"].map((id) => ({ id, label: HALAL_LABEL[id], labelEn: HALAL_LABEL_EN[id] })),
        },
        correct: r.a,
        explain: r.e,
        src: r.src,
        explainEn: e?.[1],
        srcEn: e?.[2],
      };
    });
  }
  if (game === "flaggen" || game === "hauptstaedte") {
    const flags = game === "flaggen";
    const pool = entitiesFor("welt").filter((e) => (flags ? e.iso2 : e.capital));
    return rng.sample(pool, Math.min(n, pool.length)).map((e) => {
      const others = rng.sample(
        pool.filter((o) => o.id !== e.id && o.capital !== e.capital),
        3
      );
      const options = rng.shuffle([e, ...others]).map((o) => ({ id: o.id, label: flags ? o.name : o.capital!, labelEn: flags ? o.nameEn : o.capitalEn! }));
      return flags
        ? {
            view: { kind: "choice", text: "Welches Land hat diese Flagge?", textEn: "Which country has this flag?", img: flagUrl(e.iso2!), options },
            correct: e.id,
            explain: e.capital ? `Die Hauptstadt von ${e.name} ist ${e.capital}.` : undefined,
            explainEn: e.capitalEn ? `The capital of ${e.nameEn} is ${e.capitalEn}.` : undefined,
          }
        : { view: { kind: "choice", text: `Was ist die Hauptstadt von ${e.name}?`, textEn: `What is the capital of ${e.nameEn}?`, options }, correct: e.id };
    });
  }
  return randomQuestions(n).map((q) => ({ view: { kind: "tiefgang", key: q.key, text: q.text, hint: q.hint } }));
}

export const tiefgangQ = (key: string): Question | undefined => BIG_POOL.find((q) => q.key === key);

/** The admin turns a player's answer into what everyone sees. */
export function judge(hq: HostQ, msg: AnswerMsg): PAns | null {
  if (hq.view.kind === "choice") {
    const o = hq.view.options.find((x) => x.id === msg.choice);
    if (!o) return null;
    const ok = o.id === hq.correct;
    return { label: o.label, choice: o.id, ok, pts: ok ? 1 : 0 };
  }
  if (hq.view.kind === "daily") {
    const r = msg.daily;
    if (!r?.done) return null;
    const pts = pointsFor(hq.view.game, { ...r, state: undefined });
    return { label: r.label, ok: !!r.won || pts > 0, pts, share: r.share };
  }
  if (!msg.tg) return null;
  const q = tiefgangQ(hq.view.key);
  const a = q?.answers.find((x) => x.id === msg.tg!.id);
  if (!a) return null;
  return { label: a.name, choice: a.id, ok: true, pts: a.pts };
}

export function rareAnswers(key: string, k = 3) {
  const q = tiefgangQ(key);
  if (!q) return [];
  return [...q.answers].sort((a, b) => b.pts - a.pts).slice(0, k).map((a) => ({ name: a.name, pts: a.pts, id: a.id }));
}

// ---------- connection ----------

let client: SupabaseClient | null = null;
export function realtime() {
  if (!client) client = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return client;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newCode() {
  let s = "";
  const r = crypto.getRandomValues(new Uint32Array(5));
  for (const x of r) s += ALPHABET[x % ALPHABET.length];
  return s;
}
export const cleanCode = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
export const validCode = (s: string) => /^[A-HJ-NP-Z2-9]{5}$/.test(s);

/** One id per browser tab, so a refresh keeps you in the room (and two tabs are two players). */
export function tabId() {
  try {
    let id = sessionStorage.getItem("kt:mp:pid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("kt:mp:pid", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export type HostSave = { st: RoomState; qs: HostQ[]; answers: Record<string, PAns | null> };
export function loadHost(code: string): HostSave | null {
  try {
    const v = sessionStorage.getItem(`kt:mp:host:${code}`);
    return v ? (JSON.parse(v) as HostSave) : null;
  } catch {
    return null;
  }
}
export function saveHost(code: string, s: HostSave | null) {
  try {
    if (s) sessionStorage.setItem(`kt:mp:host:${code}`, JSON.stringify(s));
    else sessionStorage.removeItem(`kt:mp:host:${code}`);
  } catch {}
}

const COLORS = ["#ee8a2f", "#3f86dd", "#3e9a3a", "#d6453d", "#8a5cd6", "#12a06d", "#e0b21b", "#d65ca6", "#2a9bb0", "#7a6a55"];
export function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
