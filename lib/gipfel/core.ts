/**
 * Gipfelsturm – the engine. Seven questions on one theme, every answer counts only once per climb.
 * Early questions accept many answers, the last ones only one to three – usually the famous names
 * most players have already used up on the way. Every puzzle is built deterministically from a seed
 * and is proven to be solvable (a matching gives seven different answers for the seven questions).
 */
import { norm } from "@/lib/data/countries";
import { distance, tolerance } from "@/lib/fuzzy";

export type Lang = "de" | "en";

export type Entity = {
  id: string;
  name: string;
  nameEn: string;
  /** every spelling that counts (normalised when indexed) */
  names: string[];
  /** extra short forms that only count if they point to exactly one entity (surnames) */
  short?: string[];
  /** 0–100, how readily players name it */
  fame: number;
};

/** One question: a property and every entity that has it. */
export type Pred = {
  key: string;
  de: string; // full question, e.g. "Nenne ein Land in Afrika."
  en: string;
  ids: string[];
  /** keys of the building blocks (a combined question has two) */
  parts: string[];
  /** where the facts come from, shown in the explanation */
  src?: string;
};

export type Theme = {
  key: ThemeKey;
  title: string;
  titleEn: string;
  /** what one answer is: "ein Land", "ein Spieler" */
  thing: string;
  thingEn: string;
  entities: Entity[];
  byId: Map<string, Entity>;
  /** single questions and combinations, sorted by key */
  preds: Pred[];
  /** size bands for the questions 1–7 */
  bands: [number, number][];
  /** an answer of the last question must be at least this famous (that is the trap) */
  fameCut: number;
};

export type ThemeKey = "laender" | "fussball";

export type Puzzle = {
  theme: ThemeKey;
  seed: string;
  qs: Pred[];
  /** one answer per question that solves the whole climb */
  path: string[];
};

// ----------------------------------------------------------------------------------------------
// Random numbers
// ----------------------------------------------------------------------------------------------

function hash(s: string) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
export function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];

// ----------------------------------------------------------------------------------------------
// Solvability: seven questions, seven different answers (bipartite matching, Kuhn's algorithm)
// ----------------------------------------------------------------------------------------------

export function solve(qs: { ids: string[] }[], used: string[] = []): string[] | null {
  const taken = new Map<string, number>();
  const blocked = new Set(used);
  const res: (string | null)[] = qs.map(() => null);
  const tryQ = (q: number, seen: Set<string>): boolean => {
    for (const id of qs[q].ids) {
      if (blocked.has(id) || seen.has(id)) continue;
      seen.add(id);
      const other = taken.get(id);
      if (other === undefined || tryQ(other, seen)) {
        taken.set(id, q);
        res[q] = id;
        return true;
      }
    }
    return false;
  };
  for (let q = 0; q < qs.length; q++) if (!tryQ(q, new Set())) return null;
  return res as string[];
}

/** A player who always names the best-known answer that is still free. Returns how far they get. */
export function naiveReach(qs: { ids: string[] }[], fame: (id: string) => number) {
  const used = new Set<string>();
  for (let i = 0; i < qs.length; i++) {
    const best = qs[i].ids.filter((id) => !used.has(id)).sort((a, b) => fame(b) - fame(a))[0];
    if (!best) return i;
    used.add(best);
  }
  return qs.length;
}

// ----------------------------------------------------------------------------------------------
// Building a puzzle
// ----------------------------------------------------------------------------------------------

/**
 * Funnel: question 7 has 1–3 answers, and its famous answers already fit questions 1 and 2 – the trap.
 * Questions 3–6 each share answers with the later questions, so spending them early hurts.
 * Out of several candidates the one is taken that a "famous names first" player fails earliest.
 */
export function buildPuzzle(theme: Theme, seed: string): Puzzle {
  const r = rng(`${theme.key}:${seed}`);
  const fame = (id: string) => theme.byId.get(id)?.fame ?? 0;
  const sets = new Map(theme.preds.map((p) => [p.key, new Set(p.ids)]));
  const inBand = (p: Pred, i: number) => p.ids.length >= theme.bands[i][0] && p.ids.length <= theme.bands[i][1];
  const byBand = theme.bands.map((_, i) => theme.preds.filter((p) => inBand(p, i)));
  // the final answers have to be famous, otherwise there is no trap
  const finals = byBand[6].filter((p) => p.ids.some((id) => fame(id) >= theme.fameCut));

  let best: { qs: Pred[]; path: string[]; score: number } | null = null;
  for (let attempt = 0; attempt < 400 && (!best || attempt < 40); attempt++) {
    const last = pick(r, finals);
    if (!last) break;
    const qs: Pred[] = [last];
    const parts = new Set(last.parts);
    const hits = (p: Pred, ids: Iterable<string>) => {
      const s = sets.get(p.key)!;
      for (const id of ids) if (s.has(id)) return true;
      return false;
    };
    let ok = true;
    for (let i = 5; i >= 0; i--) {
      const later = qs.flatMap((q) => q.ids);
      const need = i <= 1 ? last.ids : later; // questions 1–2 must contain a final answer
      const cands = byBand[i].filter(
        (p) =>
          !qs.some((q) => q.key === p.key || q.ids.length === p.ids.length && q.ids.every((id) => sets.get(p.key)!.has(id))) &&
          !p.parts.every((k) => parts.has(k)) &&
          p.ids.length >= qs[0].ids.length &&
          hits(p, need)
      );
      if (!cands.length) {
        ok = false;
        break;
      }
      // prefer questions where a final answer is among the best-known answers
      const weight = (p: Pred) => {
        const top = [...p.ids].sort((a, b) => fame(b) - fame(a)).slice(0, 6);
        return 1 + 4 * +top.some((id) => last.ids.includes(id)) + 2 * +top.some((id) => later.includes(id));
      };
      const total = cands.reduce((s, p) => s + weight(p), 0);
      let x = r() * total;
      const chosen = cands.find((p) => (x -= weight(p)) <= 0) ?? cands[cands.length - 1];
      qs.unshift(chosen);
      chosen.parts.forEach((k) => parts.add(k));
    }
    if (!ok) continue;
    const path = solve(qs);
    if (!path) continue;
    const reach = naiveReach(qs, fame);
    const score = (7 - reach) * 10 + r(); // the earlier the naive player fails, the better the trap
    if (!best || score > best.score) best = { qs, path, score };
    if (reach <= 4) break;
  }
  if (!best) throw new Error(`no puzzle for ${theme.key}:${seed}`);
  return { theme: theme.key, seed, qs: best.qs, path: best.path };
}

// ----------------------------------------------------------------------------------------------
// Understanding what the player typed
// ----------------------------------------------------------------------------------------------

export type Index = { exact: Map<string, string[]>; short: Map<string, string[]>; list: { key: string; id: string }[] };

export function buildIndex(entities: Entity[]): Index {
  const exact = new Map<string, string[]>();
  const short = new Map<string, string[]>();
  const add = (m: Map<string, string[]>, k: string, id: string) => {
    if (!k) return;
    const a = m.get(k) ?? [];
    if (!a.includes(id)) a.push(id);
    m.set(k, a);
  };
  for (const e of entities) {
    for (const n of e.names) add(exact, norm(n), e.id);
    for (const n of e.short ?? []) add(short, norm(n), e.id);
  }
  const list = [...exact.entries()].flatMap(([key, ids]) => ids.map((id) => ({ key, id })));
  return { exact, short, list };
}

export type Lookup =
  | { kind: "found"; ids: string[] } // one or more entities with exactly this name
  | { kind: "maybe"; id: string } // a typo: "Meintest du …?"
  | { kind: "none" };

/** Finds the entity behind a typed answer; `prefer` decides between several with the same short name. */
export function lookup(ix: Index, typed: string, prefer: (id: string) => boolean): Lookup {
  const t = norm(typed);
  if (!t) return { kind: "none" };
  const ex = ix.exact.get(t);
  if (ex?.length) return { kind: "found", ids: ex };
  const sh = ix.short.get(t);
  if (sh?.length) {
    const good = sh.filter(prefer);
    return { kind: "found", ids: good.length ? good : sh };
  }
  const tol = tolerance(t.replace(/ /g, "").length);
  if (tol) {
    let bestId = "";
    let bestD = tol + 1;
    for (const { key, id } of ix.list) {
      if (Math.abs(key.length - t.length) > tol) continue;
      const d = distance(t, key, tol);
      if (d < bestD || (d === bestD && prefer(id) && !prefer(bestId))) {
        bestD = d;
        bestId = id;
      }
    }
    if (bestId) return { kind: "maybe", id: bestId };
  }
  return { kind: "none" };
}

/** Autocomplete: names that start with (or contain a word starting with) what was typed, best-known first. */
export function suggest(ix: Index, typed: string, fame: (id: string) => number, n = 6): string[] {
  const t = norm(typed);
  if (t.length < 2) return [];
  const out = new Map<string, number>();
  for (const { key, id } of ix.list) {
    if (out.has(id)) continue;
    if (key.startsWith(t)) out.set(id, fame(id) + 1000);
    else if (key.includes(" " + t)) out.set(id, fame(id));
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
}

export const entName = (e: Entity, lang: Lang) => (lang === "en" ? e.nameEn : e.name);
