// Renders small region silhouettes (public/thumbs/<region>.svg) for the home page.
// Run from a folder with d3-geo + topojson-client installed: node thumbs.js <repo>
const fs = require("fs");
const path = require("path");
const tc = require("topojson-client");
const d3 = require("d3-geo");

const repo = process.argv[2];
const countries = JSON.parse(fs.readFileSync(path.join(repo, "lib/data/countries.json")));
const out = path.join(repo, "public/thumbs");
fs.mkdirSync(out, { recursive: true });

const ts = require("topojson-simplify");
const Q = { world: 0.25, us: 0.02, de: 0.002, ch: 0.0005, at: 0.001, sy: 0.0005, ma: 0.004, tr: 0.012 };
const load = (k) => {
  let t = JSON.parse(fs.readFileSync(path.join(repo, "public/geo", k + ".json")));
  t = ts.simplify(ts.presimplify(t), Q[k]);
  return tc.feature(t, t.objects[k === "world" ? "countries" : "regions"]).features;
};
const world = load("world");
const cont = (c) => world.filter((f) => countries.find((x) => x.id === f.id)?.cont === c);

const W = 320;
const H = 200;
const sets = {
  welt: { f: world, p: d3.geoEqualEarth() },
  europa: { f: cont("Europa"), p: d3.geoEqualEarth().rotate([-12, 0]), box: [[-24, 35], [42, 70]] },
  asien: { f: cont("Asien"), p: d3.geoEqualEarth().rotate([-90, 0]) },
  afrika: { f: cont("Afrika"), p: d3.geoEqualEarth().rotate([-15, 0]) },
  nordamerika: { f: cont("Nordamerika"), p: d3.geoEqualEarth().rotate([100, 0]), box: [[-168, 7], [-53, 72]] },
  suedamerika: { f: cont("Südamerika"), p: d3.geoEqualEarth().rotate([60, 0]) },
  ozeanien: { f: cont("Ozeanien"), p: d3.geoEqualEarth().rotate([-150, 0]), box: [[112, -47], [180, -5]] },
  nahost: { f: world.filter((f) => ["EGY", "BHR", "IRQ", "IRN", "JOR", "KWT", "LBN", "OMN", "PSE", "QAT", "SAU", "SYR", "TUR", "ARE", "YEM"].includes(f.id)), p: d3.geoEqualEarth().rotate([-45, 0]) },
  usa: { f: load("us"), p: d3.geoAlbersUsa() },
  deutschland: { f: load("de"), p: d3.geoMercator() },
  schweiz: { f: load("ch"), p: d3.geoMercator() },
  oesterreich: { f: load("at"), p: d3.geoMercator() },
  syrien: { f: load("sy"), p: d3.geoMercator() },
  marokko: { f: load("ma"), p: d3.geoMercator() },
  tuerkei: { f: load("tr"), p: d3.geoMercator() },
};

for (const [key, { f, p, box }] of Object.entries(sets)) {
  let target = { type: "FeatureCollection", features: f };
  if (box) {
    const [[w, s], [e, n]] = box;
    const pts = [];
    for (let k = 0; k <= 8; k++) pts.push([w + ((e - w) * k) / 8, s], [w + ((e - w) * k) / 8, n], [w, s + ((n - s) * k) / 8], [e, s + ((n - s) * k) / 8]);
    target = { type: "MultiPoint", coordinates: pts };
  }
  p.fitExtent([[6, 6], [W - 6, H - 6]], target);
  const gp = d3.geoPath(p);
  gp.digits?.(1);
  const paths = f.filter((x) => gp.area(x) > 0.4).map((x) => gp(x)).filter(Boolean);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><g fill="#fbf8f3" stroke="#7fb3ec" stroke-width="0.6" stroke-linejoin="round">${paths
    .map((d) => `<path d="${d}"/>`)
    .join("")}</g></svg>`;
  fs.writeFileSync(path.join(out, key + ".svg"), svg);
  console.log(key, Math.round(svg.length / 1024) + " KB");
}
