// Fallback South Beach layout from known street coordinates (used only if OSM data is unavailable).
import { project, type SBMap, type SBBuilding, type SBRoad, type SBArea } from "@/lib/southbeach/osm.mjs";

const AVE: [string, number, number, number][] = [
  // name, lon, from street, to street
  ["Ocean Drive", -80.13, 5, 15],
  ["Collins Avenue", -80.1318, 5, 23],
  ["Washington Avenue", -80.1335, 5, 23],
  ["Drexel Avenue", -80.1346, 12, 17],
  ["Pennsylvania Avenue", -80.1356, 7, 17],
  ["Euclid Avenue", -80.1366, 5, 17],
  ["Meridian Avenue", -80.1377, 5, 23],
  ["Jefferson Avenue", -80.1388, 5, 17],
  ["Michigan Avenue", -80.1398, 5, 17],
  ["Lenox Avenue", -80.1408, 5, 17],
  ["Alton Road", -80.142, 5, 23],
  ["West Avenue", -80.1436, 5, 23],
];
const latOf = (n: number) => (n <= 16 ? 25.774 + (n - 5) * 0.00143 : 25.7907 + (n - 16.5) * 0.0015);
const STREETS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16.5, 17, 18, 20, 21, 22, 23];
const SHORE = -80.1272, BAY = -80.1446;

function rnd(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function syntheticMap(): SBMap {
  const r = rnd(1985);
  const roads: SBRoad[] = [], buildings: SBBuilding[] = [], areas: SBArea[] = [];
  const line = (a: [number, number][]) => a.flatMap(([la, lo]) => project(la, lo));
  for (const [n, lon, s0, s1] of AVE) {
    const pts: [number, number][] = [];
    for (const s of STREETS) if (s >= s0 && s <= s1) pts.push([latOf(s), lon]);
    roads.push({ p: line(pts), w: n === "Collins Avenue" || n === "Alton Road" || n === "Washington Avenue" ? 13 : 9, t: "car", n });
    // sidewalks
    for (const o of [-0.00007, 0.00007]) roads.push({ p: line(pts.map(([la, lo]) => [la, lo + o * (n === "Collins Avenue" ? 1.3 : 1)])), w: 2.6, t: "foot" });
  }
  for (const s of STREETS) {
    const east = s <= 15 ? -80.13 : -80.1318;
    roads.push({ p: line([[latOf(s), BAY + 0.0004], [latOf(s), east]]), w: s === 5 || s === 17 ? 14 : 9, t: s === 16.5 ? "ped" : "car", n: s === 16.5 ? "Lincoln Road" : `${s}th Street` });
    for (const o of [-0.00006, 0.00006]) roads.push({ p: line([[latOf(s) + o, BAY + 0.0004], [latOf(s) + o, east]]), w: 2.6, t: "foot" });
  }
  // beach promenade
  roads.push({ p: line([[latOf(5), -80.1291], [latOf(23), -80.1294]]), w: 4, t: "ped", n: "Beachwalk" });
  areas.push({ k: "park", n: "Lummus Park", p: line([[latOf(5), -80.1297], [latOf(5), -80.1288], [latOf(15), -80.1288], [latOf(15), -80.1297]]) });
  areas.push({ k: "beach", n: "South Beach", p: line([[latOf(4.5), -80.1288], [latOf(4.5), SHORE], [latOf(23.5), SHORE], [latOf(23.5), -80.1288]]) });
  areas.push({ k: "park", n: "Flamingo Park", p: line([[latOf(11.2), -80.1376], [latOf(11.2), -80.1352], [latOf(14.8), -80.1352], [latOf(14.8), -80.1376]]) });
  // blocks
  const lons = AVE.map((a) => a[1]).sort((a, b) => a - b);
  for (let si = 0; si < STREETS.length - 1; si++) {
    const la0 = latOf(STREETS[si]) + 0.00011, la1 = latOf(STREETS[si + 1]) - 0.00011;
    if (STREETS[si] === 11.2) continue;
    for (let ai = 0; ai < lons.length; ai++) {
      const lo0 = lons[ai] + 0.00011;
      const lo1 = ai + 1 < lons.length ? lons[ai + 1] - 0.00011 : STREETS[si] < 15 ? -80.1302 : -80.1299;
      if (lo1 - lo0 < 0.00015) continue;
      const mid = (STREETS[si] + STREETS[si + 1]) / 2;
      if (mid > 11.2 && mid < 14.8 && lo0 > -80.1377 && lo1 < -80.135) continue; // park
      const [x0, z0] = project(la1, lo0), [x1, z1] = project(la0, lo1);
      const oceanFront = lo1 > -80.1305;
      const towerZone = STREETS[si] >= 15 && lo0 > -80.1325;
      const depth = (z1 - z0) / 2 - 2;
      for (const side of [0, 1]) {
        let x = x0 + 1;
        while (x < x1 - 8) {
          const w = Math.min(x1 - 1 - x, (oceanFront ? 28 : 16) + r() * 18);
          const zz0 = side ? z1 - depth * (0.75 + r() * 0.25) : z0 + 1, zz1 = side ? z1 - 1 : z0 + depth * (0.75 + r() * 0.25);
          const h = towerZone && r() < 0.35 ? 40 + r() * 70 : oceanFront ? 10 + r() * 6 : 7 + r() * 9;
          if (r() > 0.08) buildings.push({ p: [x, zz0, x + w - 1.2, zz0, x + w - 1.2, zz1, x, zz1].map((v) => Math.round(v * 10) / 10), h: Math.round(h * 10) / 10, id: buildings.length + 1, k: oceanFront ? "hotel" : undefined });
          x += w;
        }
      }
    }
  }
  const [bx0, bz1] = project(25.7675, -80.1452), [bx1, bz0] = project(25.7935, -80.1255);
  const [shoreX] = project(25.78, SHORE), [bayX] = project(25.78, BAY);
  return { v: 1, src: "approximation", origin: { lat: 25.7805, lon: -80.1335 }, bounds: { x0: bx0, x1: bx1, z0: bz0, z1: bz1 }, buildings, roads, areas, coast: [[shoreX, bz0 - 400, shoreX, bz1 + 400], [bayX, bz1 + 400, bayX, bz0 - 400]], synthetic: true };
}
