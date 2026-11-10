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
  | "zeitreise";

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

export function utcDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
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

export function isValidDay(date: string | null | undefined): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= LAUNCH && date <= utcDate();
}

export function formatDay(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
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
export function useDay(): { day: string; isToday: boolean; ready: boolean } {
  const [state, setState] = useState<{ day: string; isToday: boolean; ready: boolean }>({ day: LAUNCH, isToday: true, ready: false });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tag");
    const today = utcDate();
    const day = isValidDay(p) ? p : today;
    setState({ day, isToday: day === today, ready: true });
  }, []);
  return state;
}

export function msUntilNextDay() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}
