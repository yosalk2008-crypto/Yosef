import { norm } from "./data/countries";

/**
 * Full place lists for the Tiefgang city questions (every place with 500+ inhabitants, GeoNames),
 * built by scripts/data/tiefgang-orte.py into public/tiefgang/orte/<key>.json and loaded on demand.
 * The hand-rated answers in the catalogue come first; these only add the places nobody rated.
 */
export type OrtAnswer = { id: string; name: string; alt: string[]; pts: number };

const KEYS = new Set([
  "stadt-italien", "stadt-usa", "stadt-frankreich", "stadt-spanien", "stadt-tuerkei", "stadt-gb", "stadt-polen", "stadt-russland", "stadt-japan",
  "stadt-china", "stadt-indien", "stadt-brasilien", "stadt-mexiko", "stadt-kanada", "stadt-australien", "stadt-niederlande", "stadt-belgien",
  "stadt-schweiz", "stadt-oesterreich", "stadt-schweden", "stadt-portugal", "stadt-griechenland", "stadt-ukraine", "stadt-rumaenien",
  "stadt-tschechien", "stadt-ungarn", "stadt-argentinien", "stadt-suedkorea", "stadt-indonesien", "stadt-iran", "stadt-daenemark",
  "stadt-norwegen", "stadt-finnland", "stadt-irland", "stadt-marokko", "stadt-aegypten", "stadt-pakistan", "stadt-kroatien",
  "stadt-bw", "stadt-bayern", "stadt-hessen", "stadt-nds", "stadt-nrw", "stadt-rlp", "stadt-sh", "stadt-brandenburg", "stadt-mv",
  "stadt-sachsen", "stadt-sachsen-anhalt", "stadt-thueringen", "stadt-kalifornien", "stadt-texas", "stadt-florida",
]);
const VERSION = 1;

/** "k:stadt-italien" -> "stadt-italien" when a full list exists. */
export const orteKey = (qkey: string) => {
  const k = qkey.startsWith("k:") ? qkey.slice(2) : qkey;
  return KEYS.has(k) ? k : null;
};

const cache = new Map<string, Map<string, OrtAnswer>>();
const pending = new Map<string, Promise<void>>();

/** Starts loading the full list for a question (no-op if it has none or it is loaded). */
export function prefetchOrte(qkey: string): Promise<void> {
  const k = orteKey(qkey);
  if (!k || cache.has(k) || typeof fetch === "undefined") return Promise.resolve();
  if (pending.has(k)) return pending.get(k)!;
  const p = fetch(`/tiefgang/orte/${k}.json?v=${VERSION}`)
    .then((r) => (r.ok ? r.json() : []))
    .then((rows: (string | number)[][]) => {
      const m = new Map<string, OrtAnswer>();
      for (const [name, pts, ...alt] of rows) {
        const a: OrtAnswer = { id: `${k}:${norm(String(name))}`, name: String(name), alt: alt.map(String), pts: Number(pts) };
        for (const n of [a.name, ...a.alt]) {
          const key = norm(n);
          if (key && !m.has(key)) m.set(key, a);
        }
      }
      cache.set(k, m);
    })
    .catch(() => {})
    .finally(() => pending.delete(k));
  pending.set(k, p);
  return p;
}

/** Exact match (after normalising) in the full list, if it is loaded. */
export function findOrt(qkey: string, input: string): OrtAnswer | null {
  const k = orteKey(qkey);
  if (!k) return null;
  return cache.get(k)?.get(norm(input)) ?? null;
}

/** Looks an added place up by its answer id (for the multiplayer admin). */
export function ortById(qkey: string, id: string): OrtAnswer | null {
  const k = orteKey(qkey);
  if (!k || !id.startsWith(k + ":")) return null;
  for (const a of cache.get(k)?.values() ?? []) if (a.id === id) return a;
  return null;
}
