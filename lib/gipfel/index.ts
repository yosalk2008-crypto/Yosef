import { buildIndex, buildPuzzle, type Index, type Puzzle, type Theme, type ThemeKey } from "./core";
import { fussballTheme } from "./fussball";
import { laenderTheme } from "./laender";
import plan from "@/lib/data/tagesplan/gipfelsturm.json";

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

/** Daily theme: always countries (football only in the endless mode). */
export const dailyTheme = (_day: string): ThemeKey => "laender";
/** The day plan (lib/data/tagesplan/gipfelsturm.json): seven question keys and a solving path per day, no question twice. */
export const PLAN = plan as Record<string, { qs: string[]; path: string[] }>;
/** Every question key already used on a planned day (optionally except one day). */
export function usedKeys(except?: string) {
  const s = new Set<string>();
  for (const [d, p] of Object.entries(PLAN)) if (d !== except) p.qs.forEach((k) => s.add(k));
  return s;
}
/** A theme without the questions of other days – fresh climbs never repeat a question. */
export function freshTheme(t: Theme, used: Set<string>): Theme {
  return { ...t, preds: t.preds.filter((p) => !used.has(p.key)) };
}
export const dailyPuzzle = (day: string): Puzzle => {
  const t = theme(dailyTheme(day)).theme;
  const p = PLAN[day];
  if (p) {
    const byKey = new Map(t.preds.map((x) => [x.key, x]));
    const qs = p.qs.map((k) => byKey.get(k));
    if (qs.every(Boolean)) return { theme: t.key, seed: `tag:${day}`, qs: qs as Puzzle["qs"], path: p.path };
  }
  // not planned (the plan task did not run): a climb from questions no other day has used
  return buildPuzzle(freshTheme(t, usedKeys(day)), `tag:${day}`);
};
export const randomPuzzle = (k: ThemeKey, seed = Math.random().toString(36).slice(2)): Puzzle => buildPuzzle(theme(k).theme, `frei:${seed}`);
