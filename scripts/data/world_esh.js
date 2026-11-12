// Rebuilds public/geo/world.json exactly like build.js. Western Sahara is missing from the country list, which left a
// hole south of Morocco: --mar-esh draws Morocco including Western Sahara (as in the Moroccan regions quiz),
// --esh would add it as separate plain land instead.
const fs = require("fs"), topoClient = require("topojson-client"), topoServer = require("topojson-server"), topoSimplify = require("topojson-simplify"), d3 = require("d3-geo");
const wc = require("world-countries");
const EXTRA = ["VAT", "PSE", "UNK", "TWN"];
const sel = wc.filter((c) => c.unMember || EXTRA.includes(c.cca3));
const ID = (c) => (c.cca3 === "UNK" ? "XKX" : c.cca3);
const rewind = (f) => { const a = d3.geoArea(f); if (a > 2 * Math.PI) { const r = (rings) => rings.map((x) => x.slice().reverse()); const g = f.geometry; if (g.type === "Polygon") g.coordinates = r(g.coordinates); else g.coordinates = g.coordinates.map(r); } return f; };
const w50 = require("world-atlas/countries-50m.json"), w10 = require("world-atlas/countries-10m.json");
const geoms50 = w50.objects.countries.geometries; const byNum = {};
for (const g of geoms50) if (g.id) (byNum[g.id] = byNum[g.id] || []).push(g);
const byName50 = Object.fromEntries(geoms50.map((g) => [g.properties.name, g]));
const feats = [];
for (const c of sel) {
  const id = ID(c); let geom = null;
  if (c.cca3 === "UNK") geom = topoClient.feature(w50, byName50["Kosovo"]).geometry;
  else if (c.cca3 === "SOM") geom = topoClient.merge(w50, [byNum["706"][0], byName50["Somaliland"]]);
  else if (c.cca3 === "MAR" && process.argv.includes("--mar-esh")) geom = topoClient.merge(w50, [...byNum["504"], ...byNum["732"]]); // Morocco including Western Sahara
  else if (c.cca3 === "CYP") geom = topoClient.merge(w50, [byNum["196"][0], byName50["N. Cyprus"]]);
  else if (byNum[c.ccn3]) geom = topoClient.merge(w50, byNum[c.ccn3]);
  else { const g10 = w10.objects.countries.geometries.filter((g) => g.id === c.ccn3); if (g10.length) geom = topoClient.merge(w10, g10); }
  if (!geom) continue;
  feats.push(rewind({ type: "Feature", id, properties: {}, geometry: geom }));
}
if (process.argv.includes("--esh")) feats.push(rewind({ type: "Feature", id: "ESH", properties: {}, geometry: topoClient.merge(w50, byNum["732"]) }));
let topo = topoServer.topology({ countries: { type: "FeatureCollection", features: feats } }, 1e4);
topo = topoSimplify.simplify(topoSimplify.presimplify(topo), 0.004);
const s = JSON.stringify(topo); fs.writeFileSync(process.argv[2], s); console.log(feats.length, s.length);
