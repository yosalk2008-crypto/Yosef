import { geoArea, geoDistance } from "d3-geo";
import type { Feature, Geometry, Position } from "geojson";

/** Islands further than this from the main landmass (or from an island chain linked to it) are dropped. */
const GAP_KM = 400;
const R = 6371;
/** Countries whose two big parts both count as the country (Malaysia: peninsula and Borneo). */
const KEEP_ALL = new Set(["MYS"]);

const sample = (ring: Position[]) => {
  const step = Math.max(1, Math.floor(ring.length / 150));
  return ring.filter((_, i) => i % step === 0) as [number, number][];
};
function gapKm(a: [number, number][], b: [number, number][]) {
  let best = Infinity;
  for (const p of a) for (const q of b) best = Math.min(best, geoDistance(p, q) * R);
  return best;
}

/**
 * Keeps only the mainland of a country: the largest polygon plus every polygon that is linked to it by gaps of at
 * most GAP_KM (so Corsica or Japan's main islands stay, the Azores, Madeira, the Canaries, French Guiana,
 * Réunion, Hawaii or Svalbard go).
 */
export function mainland(f: Feature<Geometry>): Feature<Geometry> {
  const g = f.geometry;
  if (!g || g.type !== "MultiPolygon" || g.coordinates.length < 2 || KEEP_ALL.has(String(f.id))) return f;
  const polys = g.coordinates.map((c) => ({ c, a: geoArea({ type: "Polygon", coordinates: c }), pts: sample(c[0]) }));
  const main = polys.reduce((m, p) => (p.a > m.a ? p : m), polys[0]);
  const keep = new Set([main]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of polys) {
      if (keep.has(p)) continue;
      if ([...keep].some((k) => gapKm(k.pts, p.pts) <= GAP_KM)) {
        keep.add(p);
        grew = true;
      }
    }
  }
  if (keep.size === polys.length) return f;
  return { ...f, geometry: { type: "MultiPolygon", coordinates: polys.filter((p) => keep.has(p)).map((p) => p.c) } };
}
