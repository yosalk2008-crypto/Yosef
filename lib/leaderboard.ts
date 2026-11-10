"use client";

import { allResults, utcDate, type DailyResult, type GameKey } from "./daily";

// Public Supabase project (publishable key is meant to be used in the browser; access is limited by RLS).
export const SUPA_URL = "https://pgebptkwzhngfmjylraz.supabase.co";
const SUPA_KEY = "sb_publishable_Qxp5sXVWcxJCb6h653SeZg_70dVD7lt";

const headers = { apikey: SUPA_KEY, "Content-Type": "application/json" };

export const LB_GAMES: { key: GameKey; title: string }[] = [
  { key: "laenderjagd", title: "Länderjagd" },
  { key: "massstab", title: "Maßstab" },
  { key: "viererbande", title: "Viererbande" },
  { key: "hoeher-tiefer", title: "Höher oder tiefer" },
  { key: "spitzenplatz", title: "Spitzenplatz" },
  { key: "farbecht", title: "Farbecht" },
  { key: "grenzgang", title: "Grenzgang" },
  { key: "zeitreise", title: "Zeitreise" },
  { key: "tiefgang", title: "Tiefgang" },
];

/** Every game's result as 0–100 points, so games can be added up fairly. */
export function pointsFor(game: GameKey, r: DailyResult): number {
  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
  switch (game) {
    case "laenderjagd":
      return r.won ? clamp((r.score / r.max) * 100) : 0; // 1st guess = 100
    case "viererbande": {
      const mistakes = r.won ? parseInt(r.label) || 0 : 4;
      return r.won ? clamp(100 - mistakes * 15) : clamp(r.score * 20);
    }
    case "hoeher-tiefer":
      return clamp(r.score * 5); // 20 right = 100
    case "spitzenplatz":
      return r.score > 0 ? clamp((r.max / r.score) * 100) : 0; // best possible / yours
    case "grenzgang":
      return r.won ? clamp(50 + (r.score / r.max) * 50) : 0;
    default:
      return r.max > 0 ? clamp((r.score / r.max) * 100) : 0; // Maßstab, Farbecht, Zeitreise, Tiefgang
  }
}

function store<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function put(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export function playerId(): string {
  let id = store<string | null>("geografik:pid", null);
  if (!id) {
    id = crypto.randomUUID();
    put("geografik:pid", id);
  }
  return id;
}

export function getName(): string | null {
  return store<string | null>("geografik:name", null);
}

export const NAME_RE = /^[\p{L}\p{N} ._-]{2,20}$/u;
const BLOCK = ["nazi", "hitler", "fick", "hure", "fotze", "nigger", "neger", "schwuchtel", "wichser", "arsch", "porn"];
export function nameProblem(name: string): string | null {
  const n = name.trim();
  if (n.length < 2 || n.length > 20) return "2 bis 20 Zeichen, bitte.";
  if (!NAME_RE.test(n)) return "Nur Buchstaben, Zahlen, Leerzeichen, Punkt, Binde- und Unterstrich.";
  if (BLOCK.some((b) => n.toLowerCase().replace(/[^a-zäöüß]/g, "").includes(b))) return "Bitte wähle einen anderen Namen.";
  return null;
}

export function setName(name: string) {
  put("geografik:name", name.trim());
  window.dispatchEvent(new Event("geografik-name"));
}

/** Sends one finished daily result. Only today's games count; the first result per game is kept. */
const inflight = new Map<string, Promise<boolean>>();
export function submit(day: string, game: GameKey, r: DailyResult): Promise<boolean> {
  const key = `${day}:${game}`;
  const running = inflight.get(key);
  if (running) return running;
  const p = send(day, game, r).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function send(day: string, game: GameKey, r: DailyResult): Promise<boolean> {
  const name = getName();
  if (!name || !r.done || day !== utcDate()) return false;
  const sent = store<string[]>("geografik:sent", []);
  const key = `${day}:${game}`;
  if (sent.includes(key)) return true;
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/scores`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ day, game, player_id: playerId(), name, points: pointsFor(game, r), label: r.label.slice(0, 40) }),
    });
    // 409 = this game was already entered today (first result counts)
    if (res.ok || res.status === 409) {
      put("geografik:sent", [...sent.filter((k) => k.slice(0, 10) >= day), key]);
      return true;
    }
  } catch {}
  return false;
}

/** Sends every finished game of today that has not been sent yet (after choosing a name). */
export async function submitAllToday() {
  const day = utcDate();
  const today = allResults()[day] || {};
  for (const [game, r] of Object.entries(today)) if (r?.done) await submit(day, game as GameKey, r);
}

export type Row = { rank: number; name: string; points: number; label: string | null; games: number; is_me: boolean };

export async function fetchBoard(scope: { day?: string; game?: GameKey | "alle" }): Promise<Row[]> {
  const body = { p_day: scope.day ?? null, p_game: scope.game && scope.game !== "alle" ? scope.game : null, p_me: playerId() };
  const res = await fetch(`${SUPA_URL}/rest/v1/rpc/leaderboard`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Bestenliste nicht erreichbar");
  return (await res.json()) as Row[];
}
