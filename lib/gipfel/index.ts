import { dayNumber } from "@/lib/daily";
import { buildIndex, buildPuzzle, type Index, type Puzzle, type Theme, type ThemeKey } from "./core";
import { fussballTheme } from "./fussball";
import { laenderTheme } from "./laender";

export * from "./core";

export const THEME_KEYS: ThemeKey[] = ["laender", "fussball"];
const cache = new Map<ThemeKey, { theme: Theme; index: Index }>();
/** Builds a theme once (football joins ~7,000 list entries into people, takes a moment). */
export function theme(k: ThemeKey) {
  let c = cache.get(k);
  if (!c) {
    const t = k === "laender" ? laenderTheme() : fussballTheme();
    c = { theme: t, index: buildIndex(t.entities) };
    cache.set(k, c);
  }
  return c;
}

/** Daily theme: countries and football take turns. */
export const dailyTheme = (day: string): ThemeKey => (dayNumber(day) % 2 === 0 ? "laender" : "fussball");
export const dailyPuzzle = (day: string): Puzzle => buildPuzzle(theme(dailyTheme(day)).theme, `tag:${day}`);
export const randomPuzzle = (k: ThemeKey, seed = Math.random().toString(36).slice(2)): Puzzle => buildPuzzle(theme(k).theme, `frei:${seed}`);
