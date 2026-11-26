"use client";

import { useEffect, useState } from "react";

/** First day of the daily games (puzzle #1). Puzzles are generated deterministically, so every day since then is playable from the archive. */
export const LAUNCH = "2024-01-01";

export type GameKey =
  | "laenderjagd"
  | "massstab"
  | "viererbande"
  | "hoeher-tiefer"
  | "spitzenplatz"
  | "farbecht"
  | "grenzgang"
  | "spurensuche"
  | "tiefgang"
  | "gipfelsturm"
  | "fernweh";

export type DailyResult = {
  done: boolean;
  won?: boolean;
  score: number;
  max: number;
  /** Short line for the home screen, e.g. "3/8" */
  label: string;
  share: string;
  state?: unknown;
};

/**
 * Today's puzzle day. Every daily game switches to the next puzzle at 07:00 German time (since 26 Nov 2026;
 * before: midnight UTC, Fernweh/Gipfelsturm 07:50). The name is kept from the midnight-UTC days.
 */
export function utcDate(d = new Date()): string {
  return gameDay(d);
}

export function dayNumber(date: string): number {
  const a = Date.parse(LAUNCH + "T00:00:00Z");
  const b = Date.parse(date + "T00:00:00Z");
  return Math.round((b - a) / 86400000) + 1;
}

export function addDays(date: string, n: number): string {
  const t = Date.parse(date + "T00:00:00Z") + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** First day of games with their own day plan (Fernweh, Gipfelsturm): no puzzle before their launch. */
export const SWITCH_0750: Partial<Record<GameKey, string>> = { fernweh: "2026-11-18", gipfelsturm: "2026-11-18" };
/** All daily games switch at 07:00 German time (summer and winter time). */
const SWITCH_MIN = 7 * 60;

const BERLIN = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }) : null;
function berlinParts(now: Date) {
  const parts = BERLIN!.formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, h: +g("hour"), m: +g("minute"), s: +g("second") };
}

/** The puzzle day that is live at `now`: the German date, but before 07:00 still the day before. */
export function gameDay(now = new Date()): string {
  const b = berlinParts(now);
  return b.h * 60 + b.m < SWITCH_MIN ? addDays(b.date, -1) : b.date;
}
/** Old name (Fernweh/Gipfelsturm scripts). */
export const day0750 = gameDay;

/** Today's puzzle day – the same for every game (07:00 German time). */
export function todayFor(_game?: GameKey, now = new Date()): string {
  return gameDay(now);
}

/** First playable day of a game. */
export const startFor = (game?: GameKey) => (game && SWITCH_0750[game]) || LAUNCH;

export function isValidDay(date: string | null | undefined, game?: GameKey): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= startFor(game) && date <= todayFor(game);
}

export function formatDay(date: string, lang: "de" | "en" = "de") {
  return new Date(date + "T12:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const KEY = "geografik:v1";

type Store = { daily: Record<string, Partial<Record<GameKey, DailyResult>>> };

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {}
  return { daily: {} };
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new Event("geografik-store"));
}

export function getResult(date: string, game: GameKey): DailyResult | undefined {
  return read().daily[date]?.[game];
}

export function saveResult(date: string, game: GameKey, r: DailyResult) {
  const s = read();
  s.daily[date] = { ...(s.daily[date] || {}), [game]: r };
  write(s);
}

/** Drops a saved game (e.g. when it no longer fits the puzzle after a data update). */
export function clearResult(date: string, game: GameKey) {
  const s = read();
  if (!s.daily[date]?.[game]) return;
  delete s.daily[date][game];
  write(s);
}

export function allResults() {
  return read().daily;
}

/** Days in a row (ending today or yesterday) with at least one finished daily game. */
export function streak(): { current: number; best: number } {
  const d = read().daily;
  const has = (day: string) => Object.values(d[day] || {}).some((r) => r?.done);
  let current = 0;
  let day = utcDate();
  if (!has(day)) day = addDays(day, -1);
  while (has(day)) {
    current++;
    day = addDays(day, -1);
  }
  const days = Object.keys(d).filter(has).sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const x of days) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    best = Math.max(best, run);
    prev = x;
  }
  return { current, best: Math.max(best, current) };
}

/** Re-render when results change (in this tab or another). */
export function useStoreVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const on = () => setV((x) => x + 1);
    window.addEventListener("geografik-store", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("geografik-store", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return v;
}

/** Today's date (UTC), or ?tag=YYYY-MM-DD from the archive. Updates at midnight UTC. */
export function useDay(game?: GameKey): { day: string; isToday: boolean; ready: boolean } {
  const [state, setState] = useState<{ day: string; isToday: boolean; ready: boolean }>({ day: LAUNCH, isToday: true, ready: false });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tag");
    const today = todayFor(game);
    const day = isValidDay(p, game) ? p : today;
    setState({ day, isToday: day === today, ready: true });
  }, [game]);
  return state;
}

/** Milliseconds until the next puzzle (07:00 German time, for every game). */
export function msUntilNextDay(_game?: GameKey) {
  const now = new Date();
  const b = berlinParts(now);
  const wallNow = Date.UTC(+b.date.slice(0, 4), +b.date.slice(5, 7) - 1, +b.date.slice(8, 10), b.h, b.m, b.s);
  const offset = wallNow - Math.floor(now.getTime() / 1000) * 1000; // Berlin wall clock minus UTC
  const next = addDays(gameDay(now), 1);
  const target = Date.parse(`${next}T07:00:00Z`) - offset;
  return Math.max(0, target - now.getTime());
}

/** Only the most recent days can be replayed from the archive (each game costs Street View loads). */
export const SPURENSUCHE_ARCHIVE_DAYS = 7;
export function spurensucheInArchive(day: string, today: string = utcDate()) {
  const diff = (Date.parse(today) - Date.parse(day)) / 86400000;
  return diff < SPURENSUCHE_ARCHIVE_DAYS;
}
