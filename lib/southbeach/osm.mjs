// South Beach (Miami Beach) map data from OpenStreetMap (© OpenStreetMap contributors, ODbL).
// Shared by scripts/data/southbeach-osm.mjs (build time) and the game (runtime fallback).
// Output units: metres. x = east, z = south (three.js: -z is north), origin at ORIGIN.

export const ORIGIN = { lat: 25.7805, lon: -80.1335 };
export const BBOX = { s: 25.7675, w: -80.1452, n: 25.7935, e: -80.1255 }; // ~5th St → ~23rd St, West Ave → Atlantic
export const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

export function overpassQuery() {
  const b = `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`;
  const wide = `${BBOX.s - 0.01},${BBOX.w - 0.012},${BBOX.n + 0.01},${BBOX.e + 0.012}`;
  return `[out:json][timeout:120];
(
  way["building"](${b});
  way["highway"](${b});
  way["natural"~"beach|sand|water|coastline"](${wide});
  way["leisure"~"park|pitch|garden|playground"](${b});
  way["landuse"~"grass|recreation_ground"](${b});
  way["amenity"="parking"](${b});
);
out body; >; out skel qt;`;
}

const KX = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111320;
const KZ = 110574;
export const project = (lat, lon) => [Math.round((lon - ORIGIN.lon) * KX * 10) / 10, Math.round(-(lat - ORIGIN.lat) * KZ * 10) / 10];

const ROAD_W = { motorway: 14, trunk: 14, primary: 13, secondary: 12, tertiary: 11, residential: 8.5, unclassified: 8, living_street: 6, service: 5.5, pedestrian: 6, footway: 2.6, path: 2.6, cycleway: 2.5, steps: 2.5 };
const hash = (n) => { let x = n | 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

function heightOf(tags, id, area) {
  const h = parseFloat(String(tags.height || "").replace(",", "."));
  if (h > 0 && h < 400) return h;
  const lv = parseFloat(tags["building:levels"]);
  if (lv > 0 && lv < 120) return lv * 3.3 + 1.5;
  const t = tags.building;
  const r = hash(id);
  if (t === "house" || t === "garage" || t === "shed" || t === "roof" || t === "kiosk") return 4 + r * 3;
  if (t === "hotel" || t === "apartments" || t === "commercial" || t === "retail" || t === "yes") return area > 2500 ? 14 + r * 30 : area > 700 ? 10 + r * 9 : 7 + r * 5;
  return 8 + r * 8;
}
function polyArea(p) { let a = 0; for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; a += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1]; } return a / 2; }

export function processOverpass(json) {
  const nodes = new Map();
  for (const e of json.elements) if (e.type === "node") nodes.set(e.id, e);
  const pts = (w) => { const o = []; for (const id of w.nodes || []) { const n = nodes.get(id); if (n) o.push(...project(n.lat, n.lon)); } return o; };
  const buildings = [], roads = [], areas = [], coast = [];
  for (const w of json.elements) {
    if (w.type !== "way" || !w.tags) continue;
    const t = w.tags, p = pts(w);
    if (p.length < 4) continue;
    if (t.building) {
      if (p.length < 8) continue;
      const q = p[0] === p[p.length - 2] && p[1] === p[p.length - 1] ? p.slice(0, -2) : p;
      let a = polyArea(q);
      if (a < 0) { const r = []; for (let i = q.length - 2; i >= 0; i -= 2) r.push(q[i], q[i + 1]); q.splice(0, q.length, ...r); a = -a; } // make CCW in x/z
      if (a < 12) continue;
      const b = { p: q, h: Math.round(heightOf(t, w.id, a) * 10) / 10, id: w.id };
      if (t.name) b.n = t.name;
      if (t["building:colour"]) b.c = t["building:colour"];
      if (t.tourism === "hotel" || t.building === "hotel") b.k = "hotel";
      buildings.push(b);
    } else if (t.highway && ROAD_W[t.highway] !== undefined && t.area !== "yes" && t.tunnel !== "yes") {
      const lanes = parseFloat(t.lanes);
      const w0 = ROAD_W[t.highway];
      const r = { p, w: lanes > 0 && w0 > 5 ? Math.max(w0, lanes * 3.4) : w0, t: w0 <= 3 ? "foot" : t.highway === "pedestrian" ? "ped" : "car" };
      if (t.name) r.n = t.name;
      if (t.oneway === "yes") r.o = 1;
      roads.push(r);
    } else if (t.natural === "coastline") coast.push(p);
    else {
      const k = t.natural === "beach" || t.natural === "sand" ? "beach" : t.natural === "water" ? "water" : t.leisure === "pitch" ? "pitch" : t.amenity === "parking" ? "parking" : t.leisure || t.landuse ? "park" : null;
      if (!k || p.length < 8) continue;
      const a = { p: p[0] === p[p.length - 2] && p[1] === p[p.length - 1] ? p.slice(0, -2) : p, k };
      if (t.name) a.n = t.name;
      areas.push(a);
    }
  }
  const [x0, z1] = project(BBOX.s, BBOX.w), [x1, z0] = project(BBOX.n, BBOX.e);
  return { v: 1, src: "© OpenStreetMap contributors (ODbL)", origin: ORIGIN, bounds: { x0, x1, z0, z1 }, buildings, roads, areas, coast };
}
