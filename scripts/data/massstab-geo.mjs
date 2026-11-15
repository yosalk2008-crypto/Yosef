/**
 * Builds public/geo/massstab.json: outlines of oceans, seas, lakes, Greenland and Antarctica for Maßstab.
 * Source: Natural Earth (public domain) – ne_50m_geography_marine_polys, ne_50m_lakes, ne_110m_admin_0_countries
 * from github.com/nvkelso/natural-earth-vector (geojson folder). Pass the folder holding those files:
 *
 *   node scripts/data/massstab-geo.mjs /path/to/downloads
 *
 * Several Natural Earth polygons are joined into one body (e.g. the Mediterranean with the Adriatic, Aegean …).
 * The items themselves (names, official areas) live in lib/massstab.ts; the ids here must match.
 */
import fs from "fs";
import path from "path";
import { geoArea } from "d3-geo";

const SRC = process.argv[2];
const read = (f) => JSON.parse(fs.readFileSync(path.join(SRC, f + ".geojson"), "utf8"));
const marine = read("ne_50m_geography_marine_polys").features;
const lakes = read("ne_50m_lakes").features;
const admin = read("ne_110m_admin_0_countries").features;

const BODIES = {
  pazifik: ["North Pacific Ocean", "South Pacific Ocean", "Philippine Sea", "Coral Sea", "Tasman Sea", "South China Sea", "East China Sea", "Sea of Japan", "Sea of Okhotsk", "Bering Sea", "Yellow Sea", "Solomon Sea", "Bismarck Sea", "Celebes Sea", "Sulu Sea", "Gulf of Alaska", "Gulf of Thailand", "Gulf of Tonkin", "Molucca Sea", "Banda Sea", "Ceram Sea", "Java Sea", "Taiwan Strait", "Luzon Strait", "Korea Strait", "Golfo de California", "Bay of Plenty", "Makassar Strait", "Bristol Bay"],
  atlantik: ["North Atlantic Ocean", "South Atlantic Ocean", "Sargasso Sea", "Caribbean Sea", "Gulf of Mexico", "Gulf of Honduras", "Straits of Florida", "Gulf of Guinea", "Bay of Biscay", "Gulf of Saint Lawrence", "Gulf of Maine", "Bay of Fundy", "Chesapeake Bay", "North Sea", "English Channel", "Irish Sea", "Bristol Channel", "Inner Seas", "Inner Sea", "Labrador Sea", "Scotia Sea", "Mediterranean Sea", "Tyrrhenian Sea", "Ionian Sea", "Adriatic Sea", "Aegean Sea", "Balearic Sea", "Strait of Gibraltar", "Black Sea", "Baltic Sea", "Gulf of Bothnia", "Gulf of Finland"],
  indik: ["INDIAN OCEAN", "Arabian Sea", "Bay of Bengal", "Laccadive Sea", "Andaman Sea", "Mozambique Channel", "Great Australian Bight", "Red Sea", "Gulf of Aden", "Gulf of Oman", "Persian Gulf", "Timor Sea", "Arafura Sea", "Gulf of Mannar", "Gulf of Kutch", "Strait of Malacca", "Gulf of Carpentaria"],
  arktis: ["Arctic Ocean", "Barents Sea", "Kara Sea", "Laptev Sea", "Beaufort Sea", "Chukchi Sea", "Greenland Sea", "Norwegian Sea", "Baffin Bay", "White Sea", "Hudson Bay", "James Bay", "Hudson Strait", "Viscount Melville Sound", "The North Western Passages", "Melville Bay", "Davis Strait"],
  mittelmeer: ["Mediterranean Sea", "Tyrrhenian Sea", "Ionian Sea", "Adriatic Sea", "Aegean Sea", "Balearic Sea", "Strait of Gibraltar"],
  ostsee: ["Baltic Sea", "Gulf of Bothnia", "Gulf of Finland"],
  nordsee: ["North Sea"],
  "schwarzes-meer": ["Black Sea"],
  "rotes-meer": ["Red Sea"],
  karibik: ["Caribbean Sea"],
  "golf-von-mexiko": ["Gulf of Mexico"],
  "suedchinesisches-meer": ["South China Sea"],
  beringmeer: ["Bering Sea"],
  "ochotskisches-meer": ["Sea of Okhotsk"],
  "japanisches-meer": ["Sea of Japan"],
  "persischer-golf": ["Persian Gulf"],
  "arabisches-meer": ["Arabian Sea"],
  "golf-von-bengalen": ["Bay of Bengal"],
  korallenmeer: ["Coral Sea"],
  philippinensee: ["Philippine Sea"],
  barentssee: ["Barents Sea"],
  "kaspisches-meer": ["Caspian Sea"],
};
const LAKES = {
  "oberer-see": "Lake Superior", victoriasee: "Lake Victoria", huronsee: "Lake Huron", michigansee: "Lake Michigan", tanganjikasee: "Lake Tanganyika",
  baikalsee: "Lake Baikal", "grosser-baerensee": "Great Bear Lake", malawisee: "Lake Malawi", "grosser-sklavensee": "Great Slave Lake", eriesee: "Lake Erie",
  winnipegsee: "Lake Winnipeg", ontariosee: "Lake Ontario", ladogasee: "Lake Ladoga", balchaschsee: "Lake Balkhash", onegasee: "Lake Onega",
  titicacasee: "Lago Titicaca", nicaraguasee: "Lago de Nicaragua", yssykkoel: "Issyk-Kul", vaenern: "Vänern", turkanasee: "Lake Turkana",
  voltastausee: "Lake Volta", vansee: "Lake Van", peipussee: "Lake Peipus", tanasee: "Lake Tana", genfersee: "Lake Geneva", bodensee: "Bodensee", plattensee: "Lake Balaton",
};
const LAND = { GRL: "GRL", ATA: "ATA" };

const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);

function clean(poly, dp) {
  const f = 10 ** dp;
  const rings = poly
    .map((ring) => {
      const out = [];
      for (const [x, y] of ring) {
        const p = [Math.round(x * f) / f, Math.round(y * f) / f];
        const l = out[out.length - 1];
        if (!l || l[0] !== p[0] || l[1] !== p[1]) out.push(p);
      }
      if (out.length > 1 && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) out.push(out[0]);
      return out;
    })
    .filter((r) => r.length >= 4);
  if (!rings.length) return null;
  // d3 wants the exterior ring clockwise; Natural Earth sometimes has it the other way (area > hemisphere)
  if (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI) rings.forEach((r) => r.reverse());
  return rings;
}

function body(id, featureList) {
  if (!featureList.length) throw new Error("nothing for " + id);
  const seen = new Set();
  const all = featureList.flatMap((f) => polys(f.geometry)).filter((p) => {
    const k = JSON.stringify(p[0].slice(0, 4));
    return seen.has(k) ? false : (seen.add(k), true);
  });
  const big = all.reduce((s, p) => s + geoArea({ type: "Polygon", coordinates: p }), 0) * 6371 ** 2 > 1e6;
  const coordinates = all.map((p) => clean(p, big ? 1 : 2)).filter(Boolean);
  const geometry = { type: "MultiPolygon", coordinates };
  return { type: "Feature", id, properties: { km2: Math.round(geoArea(geometry) * 6371 ** 2) }, geometry };
}

const out = [];
for (const [id, names] of Object.entries(BODIES)) {
  const fs_ = marine.filter((f) => names.includes(f.properties.name));
  const missing = names.filter((n) => !marine.some((f) => f.properties.name === n));
  if (missing.length) console.error(id, "missing", missing.join(", "));
  out.push(body(id, fs_));
}
for (const [id, name] of Object.entries(LAKES)) out.push(body(id, lakes.filter((f) => (id === "peipussee" ? [name, "Lake Pskov"] : [name]).includes(f.properties.name))));
for (const [id, iso] of Object.entries(LAND)) out.push(body(id, admin.filter((f) => f.properties.ADM0_A3 === iso || f.properties.ISO_A3 === iso)));

for (const f of out) console.error(f.id.padEnd(24), String(f.properties.km2).padStart(12));
const file = path.join(path.dirname(new URL(import.meta.url).pathname), "../../public/geo/massstab.json");
fs.writeFileSync(file, JSON.stringify({ type: "FeatureCollection", features: out }));
console.error("written", file, fs.statSync(file).size, "bytes");
