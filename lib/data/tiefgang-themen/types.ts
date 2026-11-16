/**
 * Tiefgang endless mode: extra topics besides geography (from 2026-11-16).
 * Written by AI (Claude). Every entry:
 * - `key` unique, prefix per topic: "f-" Fußball, "e-" Essen, "s-" Serien, "w-" Allgemeinwissen
 * - `answers` in order of how well-known they are (first = what everybody says, last = the rarest = Tiefseeperle),
 *   "Name|alias|English name", at least 20 valid answers (aim for 40+; closed lists like a World Cup squad may be shorter)
 * - only facts that are certain and do not change from week to week (no current squads, no "this season")
 * - Fußball: only the top-5 leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1); player questions only
 *   with real icons and players of top clubs
 * - no politics, nothing hurtful; check with: npx tsx scripts/data/check-tiefgang-themen.ts
 */
export type ThemaFrage = { key: string; text: string; hint: string; en: [string, string]; answers: string[] };
export type Thema = "erdkunde" | "fussball" | "essen" | "serien" | "wissen";
