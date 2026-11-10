// Syrian governorates (geoBoundaries gbOpen SYR ADM1, CC BY 4.0) -> public/geo/sy.json
const fs = require("fs"), path = require("path"), d3 = require("d3-geo");
const topoServer = require("topojson-server"), topoSimplify = require("topojson-simplify");
const fc = JSON.parse(fs.readFileSync(path.join(__dirname, "raw/sy.geojson")));
const fix = (geom) => {
  if (geom.type === "Polygon") { if (d3.geoArea({ type: "Feature", geometry: geom }) > 2 * Math.PI) geom.coordinates = geom.coordinates.map((r) => r.slice().reverse()); }
  else geom.coordinates = geom.coordinates.map((p) => (d3.geoArea({ type: "Feature", geometry: { type: "Polygon", coordinates: p } }) > 2 * Math.PI ? p.map((r) => r.slice().reverse()) : p));
  return geom;
};
const feats = fc.features.map((f) => ({ type: "Feature", id: f.properties.shapeISO.replace("SYR-", "SY-"), properties: { name: f.properties.shapeName }, geometry: fix(f.geometry) }));
let topo = topoServer.topology({ regions: { type: "FeatureCollection", features: feats } }, 1e4);
topo = topoSimplify.simplify(topoSimplify.presimplify(topo), +process.argv[3] || 0.0005);
const s = JSON.stringify(topo);
fs.writeFileSync(path.join(process.argv[2], "public/geo/sy.json"), s);
console.log(feats.map((f) => f.id).join(" "), Math.round(s.length / 1024) + " KB");
