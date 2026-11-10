import { norm } from "./data/countries";

/** Normalised form used for forgiving comparisons: no accents, no spaces, no "-Stadt"/"City" suffix. */
export function canon(s: string) {
  return norm(s)
    .replace(/\b(stadt|city|ciudad|cidade|ville|citta)\b/g, " ")
    .replace(/(.{3,})stadt$/, "$1")
    .replace(/\s+/g, "");
}

/** Optimal string alignment distance (insert, delete, substitute, swap neighbours). */
export function distance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** How many typos a name of this length tolerates: none for very short names (Iran/Irak, Mali/Malta). */
export function tolerance(len: number) {
  return len <= 4 ? 0 : len <= 8 ? 1 : 2;
}

/** True if `typed` is the same name as one of `names`, allowing a small typo or a missing "-Stadt". */
export function fuzzyMatch(typed: string, names: string[]): boolean {
  const t = canon(typed);
  if (!t) return false;
  return names.some((n) => {
    const c = canon(n);
    // only one right answer here, so even short names may have one typo ("Dohaa", "Romm")
    return c === t || distance(t, c) <= Math.max(c.length >= 3 ? 1 : 0, tolerance(c.length));
  });
}

/**
 * Finds the one entry the typed text means. Exact matches win; otherwise the closest name within the
 * typo tolerance, but only if no other entry is just as close (so "Niger" never becomes "Nigeria").
 */
export function bestMatch<T>(typed: string, entries: { item: T; names: string[] }[]): T | null {
  const t = canon(typed);
  if (!t) return null;
  let best: T | null = null;
  let bestD = Infinity;
  let tie = false;
  for (const { item, names } of entries) {
    for (const n of names) {
      const c = canon(n);
      if (c === t) return item;
      const lim = tolerance(c.length);
      if (lim === 0) continue;
      const dd = distance(t, c, lim);
      if (dd > lim) continue;
      if (dd < bestD) {
        best = item;
        bestD = dd;
        tie = false;
      } else if (dd === bestD && item !== best) tie = true;
    }
  }
  return tie ? null : best;
}
