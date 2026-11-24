// Fetches South Beach from OpenStreetMap (Overpass) and writes public/southbeach/map.json.
// Runs before `next build`. Skips when the file already exists (set SB_REFRESH=1 to refetch).
// Never fails the build: without data the game fetches Overpass in the browser instead.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OVERPASS, overpassQuery, processOverpass } from "../../lib/southbeach/osm.mjs";

const out = join(dirname(fileURLToPath(import.meta.url)), "../../public/southbeach/map.json");
if (existsSync(out) && !process.env.SB_REFRESH) {
  console.log("[southbeach] map.json present – skip");
  process.exit(0);
}
const body = new URLSearchParams({ data: overpassQuery() });
for (const url of OVERPASS) {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 100000);
    const res = await fetch(url, { method: "POST", body, signal: ctl.signal, headers: { "User-Agent": "koshertrivia.de southbeach build" } });
    clearTimeout(timer);
    if (!res.ok) { console.warn(`[southbeach] ${url} → HTTP ${res.status}`); continue; }
    const map = processOverpass(await res.json());
    if (map.buildings.length < 200) { console.warn(`[southbeach] ${url} → only ${map.buildings.length} buildings, trying next`); continue; }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(map));
    console.log(`[southbeach] wrote map.json: ${map.buildings.length} buildings, ${map.roads.length} roads, ${map.areas.length} areas, ${map.coast.length} coast lines`);
    process.exit(0);
  } catch (e) {
    console.warn(`[southbeach] ${url} failed: ${e && e.message}`);
  }
}
console.warn("[southbeach] no OSM data – the game will load it in the browser");
