// Builds the static data for Geografik from downloaded raw sources.
const fs = require("fs");
const path = require("path");
const topoClient = require("topojson-client");
const topoServer = require("topojson-server");
const topoSimplify = require("topojson-simplify");
const d3 = require("d3-geo");
const wc = require("world-countries");

const OUT = path.join(__dirname, "out");
fs.mkdirSync(path.join(OUT, "geo"), { recursive: true });
fs.mkdirSync(path.join(OUT, "flags"), { recursive: true });
const readJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

// ---------- country selection ----------
const EXTRA = ["VAT", "PSE", "UNK", "TWN"];
const sel = wc.filter((c) => c.unMember || EXTRA.includes(c.cca3));
const ID = (c) => (c.cca3 === "UNK" ? "XKX" : c.cca3); // Kosovo uses XKX (World Bank)

function continentOf(c) {
  if (c.region === "Africa") return "Afrika";
  if (c.region === "Asia") return "Asien";
  if (c.region === "Europe") return "Europa";
  if (c.region === "Oceania") return "Ozeanien";
  if (c.region === "Americas") return c.subregion === "South America" ? "Südamerika" : "Nordamerika";
  return "Sonstige";
}

// ---------- World Bank indicators ----------
const IND = {
  pop: "SP.POP.TOTL",
  gdppc: "NY.GDP.PCAP.CD",
  gdp: "NY.GDP.MKTP.CD",
  life: "SP.DYN.LE00.IN",
  mil: "MS.MIL.XPND.CD",
  tour: "ST.INT.ARVL",
  forest: "AG.LND.FRST.ZS",
  urban: "SP.URB.TOTL.IN.ZS",
};
const wb = {};
for (const [k, ind] of Object.entries(IND)) {
  const rows = readJSON(path.join(__dirname, "raw", `wb_${ind}.json`))[1];
  const best = {};
  for (const r of rows) {
    if (r.value == null) continue;
    const iso = r.countryiso3code;
    const y = +r.date;
    if (!best[iso] || best[iso].y < y) best[iso] = { y, v: r.value };
  }
  wb[k] = best;
}
// Taiwan is not covered by the World Bank: rounded official/IMF figures (2024).
const MANUAL = {
  TWN: { pop: 23400000, gdppc: 33900, gdp: 793000000000, life: 80.2, mil: 16700000000, tour: 7860000, forest: 60.7, urban: 79.9 },
};

// ---------- capitals (Wikidata, German labels) ----------
const wd = readJSON(path.join(__dirname, "raw", "wd_capitals.json")).results.bindings;
const caps = {};
for (const b of wd) {
  const iso = b.iso.value;
  const name = b.capitalLabel.value;
  const pop = b.capPop ? +b.capPop.value : null;
  caps[iso] = caps[iso] || {};
  const prev = caps[iso][name];
  if (!prev || (pop && pop > prev)) caps[iso][name] = pop;
}
// Primary capital where several exist (or Wikidata label is odd)
const CAP_PRIMARY = {
  ZAF: "Pretoria", BOL: "Sucre", LKA: "Sri Jayewardenepura Kotte", NLD: "Amsterdam", BEN: "Porto-Novo",
  CIV: "Yamoussoukro", MYS: "Kuala Lumpur", MNE: "Podgorica", SWZ: "Mbabane", CHL: "Santiago de Chile",
  TZA: "Dodoma", PSE: "Ramallah", ISR: "Jerusalem", BDI: "Gitega", KAZ: "Astana",
};
const CAP_OVERRIDE = { VAT: "Vatikanstadt", MCO: "Monaco", SGP: "Singapur", NRU: "Yaren", ATG: "St. John’s", GNQ: "Malabo", TKM: "Aschgabat", MNG: "Ulan Bator" };
const CAP_EXTRA_ALT = { TKM: ["Aşgabat", "Ashgabat"], MNG: ["Ulaanbaatar"], GNQ: ["Ciudad de la Paz"], ATG: ["Saint John's", "St. Johns"] };
// Common German names (display) and extra spellings accepted in text input
const NAME_OVERRIDE = {
  CIV: ["Elfenbeinküste", "Côte d'Ivoire"],
  COG: ["Republik Kongo", "Kongo", "Kongo-Brazzaville"],
  COD: ["DR Kongo", "Demokratische Republik Kongo", "Kongo-Kinshasa"],
  SWZ: ["Eswatini", "Swasiland"],
  MDA: ["Moldau", "Moldawien", "Republik Moldau"],
  USA: ["USA", "Vereinigte Staaten", "Amerika"],
  GBR: ["Großbritannien", "Vereinigtes Königreich", "UK"],
  TLS: ["Osttimor", "Timor-Leste"],
};
const EXTRA_ALT = {
  MMR: ["Birma", "Burma"], CZE: ["Tschechische Republik"], KOR: ["Korea"], ARE: ["VAE", "Emirate"], VAT: ["Vatikan"],
  FSM: ["Föderierte Staaten von Mikronesien"], BLR: ["Weißrussland"], CPV: ["Kapverden", "Cabo Verde"], BIH: ["Bosnien"],
  NLD: ["Holland"], PRK: ["Demokratische Volksrepublik Korea"], MKD: ["Mazedonien"], KNA: ["Saint Kitts und Nevis"],
  LCA: ["Saint Lucia"], VCT: ["Saint Vincent und die Grenadinen"], STP: ["Sao Tome und Principe"], DOM: ["Dom. Republik"],
};

// ---------- shapes ----------
function rewind(feature) {
  // d3-geo expects clockwise exterior rings; fix features that cover "the rest of the world".
  const fix = (geom) => {
    if (!geom) return geom;
    if (geom.type === "Polygon") {
      const f = { type: "Feature", geometry: geom };
      if (d3.geoArea(f) > 2 * Math.PI) geom.coordinates = geom.coordinates.map((r) => r.slice().reverse());
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates = geom.coordinates.map((poly) => {
        const f = { type: "Feature", geometry: { type: "Polygon", coordinates: poly } };
        return d3.geoArea(f) > 2 * Math.PI ? poly.map((r) => r.slice().reverse()) : poly;
      });
    }
    return geom;
  };
  feature.geometry = fix(feature.geometry);
  return feature;
}

function writeTopo(name, features, objName, simplifyQ) {
  const fc = { type: "FeatureCollection", features };
  let topo = topoServer.topology({ [objName]: fc }, 1e4);
  if (simplifyQ) {
    topo = topoSimplify.presimplify(topo);
    topo = topoSimplify.simplify(topo, simplifyQ);
  }
  const s = JSON.stringify(topo);
  fs.writeFileSync(path.join(OUT, "geo", name), s);
  return s.length;
}

const w50 = require("world-atlas/countries-50m.json");
const w10 = require("world-atlas/countries-10m.json");
const geoms50 = w50.objects.countries.geometries;
const byNum = {};
for (const g of geoms50) if (g.id) (byNum[g.id] = byNum[g.id] || []).push(g);
const byName50 = Object.fromEntries(geoms50.map((g) => [g.properties.name, g]));

const worldFeatures = [];
const missingShape = [];
for (const c of sel) {
  const id = ID(c);
  let geom = null;
  if (c.cca3 === "UNK") {
    geom = topoClient.feature(w50, byName50["Kosovo"]).geometry;
  } else if (c.cca3 === "SOM") {
    geom = topoClient.merge(w50, [byNum["706"][0], byName50["Somaliland"]]);
  } else if (c.cca3 === "CYP") {
    geom = topoClient.merge(w50, [byNum["196"][0], byName50["N. Cyprus"]]);
  } else if (byNum[c.ccn3]) {
    geom = topoClient.merge(w50, byNum[c.ccn3]);
  } else {
    const g10 = w10.objects.countries.geometries.filter((g) => g.id === c.ccn3);
    if (g10.length) geom = topoClient.merge(w10, g10);
  }
  if (!geom) { missingShape.push(id); continue; }
  worldFeatures.push(rewind({ type: "Feature", id, properties: {}, geometry: geom }));
}
const worldSize = writeTopo("world.json", worldFeatures, "countries", 0.004);

// ---------- flags ----------
function flagColors(svg) {
  const counts = {};
  const NAMED = { red: "#ff0000", gray: "#808080", gold: "#ffd700", purple: "#800080", white: "#ffffff", black: "#000000" };
  const re = /(?:fill|stroke)="(#[0-9a-fA-F]{3,6}|[a-z]+)"/g;
  let m;
  while ((m = re.exec(svg))) {
    let h = m[1].toLowerCase();
    if (h === "none") continue;
    if (NAMED[h]) h = NAMED[h];
    if (!h.startsWith("#")) continue;
    if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    counts[h] = (counts[h] || 0) + 1;
  }
  return counts;
}

// ---------- assemble countries ----------
const countries = [];
for (const c of sel) {
  const id = ID(c);
  const iso2 = c.cca2.toLowerCase();
  const flagSrc = path.join(__dirname, "node_modules/flag-icons/flags/4x3", `${iso2}.svg`);
  let flag = null;
  if (fs.existsSync(flagSrc)) {
    const svg = fs.readFileSync(flagSrc, "utf8");
    fs.writeFileSync(path.join(OUT, "flags", `${iso2}.svg`), svg);
    const colors = flagColors(svg);
    const hasGradient = /Gradient|<image|style=/.test(svg);
    const n = Object.keys(colors).length;
    flag = { colors: Object.keys(colors), simple: !hasGradient && svg.length < 3000 && n >= 2 && n <= 4 };
  }
  const stat = (k) => {
    if (MANUAL[id] && MANUAL[id][k] != null) return MANUAL[id][k];
    const v = wb[k][id];
    return v ? v.v : null;
  };
  // capital
  const capList = caps[c.cca3 === "UNK" ? "XKX" : c.cca3] || {};
  let capNames = Object.keys(capList);
  let cap = CAP_OVERRIDE[id] || CAP_PRIMARY[id] || capNames[0] || c.capital?.[0] || null;
  if (capNames.length && !capNames.includes(cap) && !CAP_OVERRIDE[id]) {
    // keep primary if it exists in another spelling, else first
    if (!CAP_PRIMARY[id]) cap = capNames[0];
  }
  const capPop = cap && capList[cap] ? capList[cap] : null;
  const capAlt = Array.from(new Set([...(capNames || []), ...(c.capital || []), ...(CAP_EXTRA_ALT[id] || [])])).filter((x) => x && x !== cap && !/^Q\d+$/.test(x));

  const nameDe = NAME_OVERRIDE[id] ? NAME_OVERRIDE[id][0] : c.translations?.deu?.common || c.name.common;
  const alt = Array.from(
    new Set([
      ...(NAME_OVERRIDE[id] || []).slice(1),
      ...(EXTRA_ALT[id] || []),
      c.translations?.deu?.common,
      c.translations?.deu?.official,
      c.name.common,
      c.name.official,
      ...(c.altSpellings || []).filter((s) => s.length > 3),
    ])
  ).filter((x) => x && x !== nameDe);

  countries.push({
    id, iso2, n: nameDe, alt,
    cont: continentOf(c), sub: c.subregion,
    cap, capAlt, capPop,
    ll: c.latlng,
    area: c.area,
    pop: stat("pop"), gdppc: stat("gdppc"), gdp: stat("gdp"), life: stat("life"),
    mil: stat("mil"), tour: stat("tour"), forest: stat("forest"), urban: stat("urban"),
    borders: (c.borders || []).map((b) => (b === "UNK" ? "XKX" : b)),
    landlocked: !!c.landlocked,
    flag,
    shape: !missingShape.includes(id),
  });
}
// keep only borders to countries in the set
const ids = new Set(countries.map((c) => c.id));
for (const c of countries) c.borders = c.borders.filter((b) => ids.has(b));
// Kosovo borders are missing in some sources
const kos = countries.find((c) => c.id === "XKX");
if (kos && !kos.borders.length) kos.borders = ["ALB", "MKD", "MNE", "SRB"];
for (const b of kos ? kos.borders : []) { const o = countries.find((x) => x.id === b); if (o && !o.borders.includes("XKX")) o.borders.push("XKX"); }

countries.sort((a, b) => a.n.localeCompare(b.n, "de"));
fs.writeFileSync(path.join(OUT, "countries.json"), JSON.stringify(countries));

// ---------- subnational shapes ----------
const regionsOut = {};
function addRegion(key, file, getId, getName, q) {
  const fc = readJSON(file);
  const feats = fc.features.map((f) => rewind({ type: "Feature", id: getId(f), properties: { name: getName(f) }, geometry: f.geometry }));
  regionsOut[key] = writeTopo(`${key}.json`, feats, "regions", q);
  return feats.map((f) => [f.id, f.properties.name]);
}
const deList = addRegion("de", path.join(__dirname, "raw/de_states.geojson"), (f) => f.properties.id, (f) => f.properties.name, 0.0003);
const chList = addRegion("ch", path.join(__dirname, "raw/ch.geojson"), (f) => "CH-" + f.properties.cartodb_id, (f) => f.properties.name, 0.0001);
const atList = addRegion("at", path.join(__dirname, "raw/at.geojson"), (f) => "AT-" + f.properties.iso, (f) => f.properties.name, 0.0001);
// US states (us-atlas uses FIPS ids)
const us = require("us-atlas/states-10m.json");
const usFeats = topoClient.feature(us, us.objects.states).features.filter((f) => +f.id <= 56 && f.id !== "11").map((f) => rewind({ type: "Feature", id: "US-" + f.id, properties: { name: f.properties.name }, geometry: f.geometry }));
regionsOut.us = writeTopo("us.json", usFeats, "regions", 0.003);
const usList = usFeats.map((f) => [f.id, f.properties.name]);

fs.writeFileSync(path.join(OUT, "region-ids.json"), JSON.stringify({ de: deList, ch: chList, at: atList, us: usList }, null, 1));

// ---------- report ----------
const missing = (k) => countries.filter((c) => c[k] == null).map((c) => c.id);
console.log("countries", countries.length, "missing shapes", missingShape);
for (const k of ["pop", "gdppc", "gdp", "life", "mil", "tour", "forest", "urban", "cap", "capPop"]) console.log(k, missing(k).length, missing(k).join(","));
console.log("noflag", countries.filter((c) => !c.flag).map((c) => c.id));
console.log("simple flags", countries.filter((c) => c.flag && c.flag.simple).length);
console.log("world.json bytes", worldSize, "regions", regionsOut);
