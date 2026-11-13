"use client";

import { createContext, useContext } from "react";
import type { DailyResult } from "./daily";

/**
 * Set while a daily puzzle is played inside a multiplayer room: the game then uses this day,
 * keeps its progress apart from the player's own archive (no streak, no leaderboard) and reports the result.
 */
export type MpDaily = { day: string; storeKey: string; onResult: (r: DailyResult) => void };
export const MpDailyContext = createContext<MpDaily | null>(null);
export const useMpDaily = () => useContext(MpDailyContext);

export function mpLoad(key: string): DailyResult | undefined {
  try {
    const v = sessionStorage.getItem("kt:mp:d:" + key);
    return v ? (JSON.parse(v) as DailyResult) : undefined;
  } catch {
    return undefined;
  }
}
export function mpSave(key: string, r: DailyResult) {
  try {
    sessionStorage.setItem("kt:mp:d:" + key, JSON.stringify(r));
  } catch {}
}
