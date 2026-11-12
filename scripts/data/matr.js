// Moroccan regions + Turkish provinces (geoBoundaries gbOpen ADM1, CC BY 4.0) and the 7 Turkish
// geographical regions (dissolved from the provinces) -> public/geo/{ma,tr,trr}.json
const fs = require("fs"), path = require("path"), d3 = require("d3-geo");
const ts = require("topojson-server"), tsi = require("topojson-simplify"), tc = require("topojson-client");
const repo = process.argv[2];
const fix = (geom) => {
  const bad = (p) => d3.geoArea({ type: "Feature", geometry: { type: "Polygon", coordinates: p } }) > 2 * Math.PI;
  if (geom.type === "Polygon") { if (bad(geom.coordinates)) geom.coordinates = geom.coordinates.map((r) => r.slice().reverse()); }
  else geom.coordinates = geom.coordinates.map((p) => (bad(p) ? p.map((r) => r.slice().reverse()) : p));
  return geom;
};
const read = (c, pre) => JSON.parse(fs.readFileSync(path.join(__dirname, "raw", c + ".geojson"))).features.map((f) => ({ type: "Feature", id: f.properties.shapeISO.replace(c + "-", pre), properties: { name: f.properties.shapeName }, geometry: fix(f.geometry) }));
const build = (feats, q) => tsi.simplify(tsi.presimplify(ts.topology({ regions: { type: "FeatureCollection", features: feats } }, 1e4)), q);
const write = (k, topo) => { const s = JSON.stringify(topo); fs.writeFileSync(path.join(repo, "public/geo", k + ".json"), s); console.log(k, topo.objects.regions.geometries.length, Math.round(s.length / 1024) + " KB"); };

write("ma", build(read("MAR", "MA-"), +process.argv[3] || 0.002));
const tr = build(read("TUR", "TR-"), +process.argv[4] || 0.0008);
write("tr", tr);
const G = {
  "TR-MAR": [22, 39, 59, 34, 41, 77, 54, 11, 16, 10, 17],
  "TR-EGE": [35, 45, 9, 20, 48, 3, 43, 64],
  "TR-AKD": [7, 32, 15, 33, 1, 31, 80, 46],
  "TR-ICA": [6, 42, 38, 26, 58, 71, 68, 70, 40, 51, 50, 66, 18],
  "TR-KAR": [53, 61, 8, 57, 60, 19, 37, 55, 28, 52, 69, 29, 5, 67, 78, 74, 14, 81],
  "TR-DAN": [25, 24, 36, 4, 75, 76, 44, 23, 62, 12, 49, 13, 65, 30],
  "TR-GDA": [27, 2, 79, 63, 21, 47, 72, 56, 73],
};
const all = Object.values(G).flat(); if (all.length !== 81 || new Set(all).size !== 81) throw new Error("bad groups " + all.length);
const geoms = tr.objects.regions.geometries;
const feats = Object.entries(G).map(([id, nums]) => {
  const ids = new Set(nums.map((n) => "TR-" + String(n).padStart(2, "0")));
  const sel = geoms.filter((g) => ids.has(g.id)); if (sel.length !== nums.length) throw new Error(id + " missing");
  return { type: "Feature", id, properties: {}, geometry: tc.merge(tr, sel) };
});
write("trr", ts.topology({ regions: { type: "FeatureCollection", features: feats } }, 1e4));
