import * as THREE from "three";

/** Track geometry: a closed spline, sampled every ~1 m. Road is flat across, follows the spline height. */
export const RW = 9, CURB = 1.1, OW = 16.5, WALL = 17.2, N = 1400;

export type Theme = "beach" | "city" | "volcano";
export type TrackDef = { key: Theme; de: string; en: string; pts: [number, number, number][]; boxes: number[]; pads: [number, number][]; ramps: number[] };

export const TRACKS: TrackDef[] = [
  {
    key: "beach", de: "Sonnenstrand", en: "Sunny Beach",
    pts: [[0, -150, 0], [90, -160, 0], [165, -115, 1], [175, -30, 4], [125, 35, 7], [160, 105, 4], [105, 175, 1], [10, 160, 0], [-55, 95, 4], [-135, 125, 2], [-195, 45, 0], [-160, -60, 0], [-85, -125, 0]],
    boxes: [0.15, 0.48, 0.76], pads: [[0.31, -3], [0.62, 4], [0.9, 0]], ramps: [0.55],
  },
  {
    key: "city", de: "Neon-City", en: "Neon City",
    pts: [[0, -125, 0], [110, -135, 0], [160, -95, 0], [165, -15, 5], [160, 60, 12], [110, 115, 13], [25, 115, 10], [-15, 60, 5], [-65, 20, 0], [-150, 35, 0], [-185, -30, 0], [-150, -105, 0], [-75, -135, 0]],
    boxes: [0.12, 0.45, 0.78], pads: [[0.22, 0], [0.4, -4], [0.66, 3], [0.92, 0]], ramps: [0.56],
  },
  {
    key: "volcano", de: "Vulkan", en: "Volcano",
    pts: [[0, -175, 0], [100, -160, 6], [175, -90, 14], [150, -5, 20], [65, 15, 22], [25, 85, 16], [100, 140, 9], [80, 205, 4], [-10, 220, 1], [-95, 180, 0], [-160, 100, 6], [-125, 22, 12], [-180, -55, 6], [-115, -150, 0]],
    boxes: [0.14, 0.44, 0.74], pads: [[0.28, 3], [0.58, -3], [0.88, 0]], ramps: [0.35, 0.82],
  },
];

export type Track = {
  def: TrackDef; P: THREE.Vector3[]; T: THREE.Vector3[]; R: THREE.Vector3[]; len: number; seg: number;
  boxes: { p: THREE.Vector3; i: number; t: number; mesh: THREE.Object3D }[];
  pads: { i: number; s: number }[]; ramps: number[];
  group: THREE.Group; bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  update(dt: number, time: number): void;
};

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function noise(g: CanvasRenderingContext2D, w: number, h: number, base: string, spots: string[], n: number, r: number, rand: () => number) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.fillStyle = spots[i % spots.length]; g.globalAlpha = 0.25 + rand() * 0.4; g.fillRect(rand() * w, rand() * h, 1 + rand() * r, 1 + rand() * r); }
  g.globalAlpha = 1;
}

export function sampleTrack(def: TrackDef) {
  const curve = new THREE.CatmullRomCurve3(def.pts.map(([x, z, y]) => new THREE.Vector3(x, y, z)), true, "centripetal");
  const P: THREE.Vector3[] = [], T: THREE.Vector3[] = [], R: THREE.Vector3[] = [];
  const pts = curve.getSpacedPoints(N);
  for (let i = 0; i < N; i++) P.push(pts[i]);
  for (let i = 0; i < N; i++) {
    const a = P[(i - 1 + N) % N], b = P[(i + 1) % N];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(); T.push(t); R.push(new THREE.Vector3(-t.z, 0, t.x));
  }
  return { P, T, R, len: curve.getLength() };
}

const THEMES = {
  beach: { sky: ["#3d9bff", "#a9dcff", "#ffe9c4"], fog: "#bfe3ff", fogN: 320, fogF: 1100, ground: "#e9cf94", off: ["#e2c27f", ["#cfa95f", "#f3dca6", "#b8914c"]], wall: ["#ffffff", "#ff3d5a"], sun: "#fff4dc", sunI: 2.3, hemi: ["#cfe9ff", "#c8a870", 0.75], exp: 0.92 },
  city: { sky: ["#05040f", "#1a0f3d", "#4a1a6a"], fog: "#160c30", fogN: 160, fogF: 650, ground: "#121424", off: ["#262838", ["#1b1d2b", "#33364a", "#2a2c3c"]], wall: ["#1a1d33", "#00e5ff"], sun: "#a9b8ff", sunI: 1.1, hemi: ["#6a5cff", "#1a1030", 0.9], exp: 1.0 },
  volcano: { sky: ["#1a0605", "#5a1308", "#e2531a"], fog: "#4a160c", fogN: 140, fogF: 620, ground: "#2a1d1a", off: ["#3a2a24", ["#2a1c18", "#4d382e", "#221613"]], wall: ["#2b201d", "#ff6a10"], sun: "#ffb27a", sunI: 2.0, hemi: ["#ff9a6a", "#2a1210", 0.8], exp: 1.0 },
} as const;
export const themeOf = (k: Theme) => THEMES[k];

export function buildTrack(def: TrackDef, scene: THREE.Scene, quality: number): Track {
  const { P, T, R, len } = sampleTrack(def);
  const th = THEMES[def.key];
  const group = new THREE.Group(); scene.add(group);
  const rand = rnd(def.key.length * 977 + 13);
  const seg = len / N;
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const p of P) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }

  // ── sky dome ──
  const skyTex = canvas(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, th.sky[0]); gr.addColorStop(0.55, th.sky[1]); gr.addColorStop(1, th.sky[2]); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }, false);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; group.add(sky);
  scene.fog = new THREE.Fog(th.fog, th.fogN, th.fogF);

  // ── strips along the spline ──
  function strip(a: number, b: number, mat: THREE.Material, vLen: number, dy = 0, uRep = 1) {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let d = 0;
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], r = R[k];
      if (i > 0) d += P[i - 1].distanceTo(P[k]);
      pos.push(p.x + r.x * a, p.y + dy, p.z + r.z * a, p.x + r.x * b, p.y + dy, p.z + r.z * b);
      uv.push(0, d / vLen, uRep, d / vLen);
      if (i < N) { const o = i * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    // make sure normals point up
    const n = geo.getAttribute("normal"); if (n.getY(0) < 0) { idx.reverse(); geo.setIndex(idx); geo.computeVertexNormals(); }
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; group.add(m); return m;
  }
  function wallStrip(s: number, h0: number, h1: number, mat: THREE.Material, vLen: number) {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let d = 0;
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], r = R[k];
      if (i > 0) d += P[i - 1].distanceTo(P[k]);
      const x = p.x + r.x * s, z = p.z + r.z * s;
      pos.push(x, p.y + h0, z, x, p.y + h1, z); uv.push(d / vLen, 0, d / vLen, 1);
      if (i < N) { const o = i * 2; if (s > 0) idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); else idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = s !== 0; m.receiveShadow = true; group.add(m); return m;
  }

  // road texture
  const night = def.key !== "beach";
  const roadTex = canvas(256, 256, (g) => {
    noise(g, 256, 256, night ? "#2b2d36" : "#4a4c55", night ? ["#1e2028", "#3a3d48", "#25272f"] : ["#3c3e46", "#5d6069", "#44464e"], 5000, 2.5, rand);
    g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(4, 0, 5, 256); g.fillRect(247, 0, 5, 256);
    g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(126, 0, 4, 120);
  });
  const road = new THREE.MeshStandardMaterial({ map: roadTex, roughness: night ? 0.55 : 0.85, metalness: night ? 0.25 : 0.05 });
  strip(-RW, RW, road, 18);
  const curbTex = canvas(4, 64, (g) => { g.fillStyle = th.wall[1]; g.fillRect(0, 0, 4, 32); g.fillStyle = "#f4f4f4"; g.fillRect(0, 32, 4, 32); });
  const curb = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.6, emissive: def.key === "city" ? "#00a0c0" : "#000", emissiveIntensity: def.key === "city" ? 0.35 : 0 });
  strip(RW, RW + CURB, curb, 5, 0.03); strip(-RW - CURB, -RW, curb, 5, 0.03);
  const offTex = canvas(128, 128, (g) => noise(g, 128, 128, th.off[0], th.off[1] as unknown as string[], 2500, 3, rand));
  const off = new THREE.MeshStandardMaterial({ map: offTex, roughness: 0.95 });
  strip(RW + CURB, WALL + 0.4, off, 12, -0.02, 2); strip(-WALL - 0.4, -RW - CURB, off, 12, -0.02, 2);
  // walls (barriers) + skirts down to the ground for raised parts
  const wallTex = canvas(64, 16, (g) => { g.fillStyle = th.wall[0]; g.fillRect(0, 0, 64, 16); g.fillStyle = th.wall[1]; g.fillRect(0, 10, 64, 6); if (def.key === "beach") { g.fillRect(0, 0, 32, 4); } });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.5, side: THREE.DoubleSide, emissive: def.key === "beach" ? "#000" : th.wall[1], emissiveMap: def.key === "beach" ? null : wallTex, emissiveIntensity: def.key === "beach" ? 0 : 0.5 });
  wallStrip(WALL + 0.4, 0, 1.3, wallMat, 4); wallStrip(-WALL - 0.4, 0, 1.3, wallMat, 4);
  const skirt = new THREE.MeshStandardMaterial({ color: night ? "#22242f" : "#cdb48a", roughness: 0.9, side: THREE.DoubleSide });
  wallStrip(WALL + 0.45, -40, 0.01, skirt, 10); wallStrip(-WALL - 0.45, -40, 0.01, skirt, 10);
  // neon glow line on top of the walls
  if (def.key !== "beach") {
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(th.wall[1]).multiplyScalar(2.2), toneMapped: false, side: THREE.DoubleSide });
    wallStrip(WALL + 0.38, 1.3, 1.45, glow, 4); wallStrip(-WALL - 0.38, 1.3, 1.45, glow, 4);
  }

  // ── ground ──
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const gTex = canvas(256, 256, (g) => noise(g, 256, 256, th.ground, th.off[1] as unknown as string[], 6000, 3, rand));
  gTex.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(def.key === "beach" ? 330 : 900, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gTex, roughness: 1 }));
  ground.position.set(cx, -0.6, cz); ground.receiveShadow = true; group.add(ground);
  const liquids: THREE.Mesh[] = [];
  if (def.key === "beach") {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#1aa8d8", roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.92 }));
    water.position.set(cx, -1.3, cz); group.add(water); liquids.push(water);
    const foam = new THREE.Mesh(new THREE.RingGeometry(328, 345, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#e8fbff", transparent: true, opacity: 0.55 }));
    foam.position.set(cx, -1.2, cz); group.add(foam);
  }
  if (def.key === "volcano") {
    const lava = canvas(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 180); gr.addColorStop(0, "#ffd04a"); gr.addColorStop(0.5, "#ff6a10"); gr.addColorStop(1, "#9a1a05"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,10,0,${0.2 + rand() * 0.5})`; g.beginPath(); g.arc(rand() * 256, rand() * 256, 2 + rand() * 12, 0, 7); g.fill(); } });
    lava.repeat.set(30, 30);
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: lava, color: new THREE.Color(1.6, 1.1, 0.9), toneMapped: false }));
    lm.position.set(cx, -2.2, cz); group.add(lm); liquids.push(lm);
    ground.scale.setScalar(0.36);
  }

  // distance from the track (for scenery placement)
  const near = (x: number, z: number, d: number) => { for (let i = 0; i < N; i += 4) { const p = P[i]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < d * d) return true; } return false; };
  const scatter = (n: number, rMin: number, rMax: number, ok: (x: number, z: number) => boolean = () => true) => {
    const out: [number, number][] = []; let tries = 0;
    while (out.length < n && tries++ < n * 30) {
      const i = Math.floor(rand() * N), side = rand() < 0.5 ? -1 : 1, d = rMin + rand() * (rMax - rMin), p = P[i], r = R[i];
      const x = p.x + r.x * d * side, z = p.z + r.z * d * side;
      if (!near(x, z, rMin - 1) && ok(x, z)) out.push([x, z]);
    }
    return out;
  };
  const dummy = new THREE.Object3D();
  function inst(geo: THREE.BufferGeometry, mat: THREE.Material, list: [number, number][], f: (o: THREE.Object3D, i: number) => void, shadow = true) {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([x, z], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, rand() * 6.28, 0); dummy.scale.set(1, 1, 1); f(dummy, i); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.castShadow = shadow && quality > 0; m.receiveShadow = false; group.add(m); return m;
  }
  const animated: ((t: number) => void)[] = [];

  if (def.key === "beach") {
    const palms = scatter(quality > 0 ? 150 : 80, WALL + 4, 70, (x, z) => (x - cx) ** 2 + (z - cz) ** 2 < 310 ** 2);
    const trunk = new THREE.CylinderGeometry(0.35, 0.6, 9, 7, 4); trunk.translate(0, 4.5, 0);
    { const p = trunk.getAttribute("position"); for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + (y / 9) ** 2 * 1.8); } trunk.computeVertexNormals(); }
    inst(trunk, new THREE.MeshStandardMaterial({ color: "#8a6a45", roughness: 1 }), palms, (o) => o.scale.setScalar(0.8 + rand() * 0.6));
    const leaf = new THREE.ConeGeometry(1.1, 5.5, 4, 1); leaf.rotateZ(-Math.PI / 2 - 0.35); leaf.scale(1, 0.25, 1); leaf.translate(3.2, 0, 0);
    const leaves = new THREE.BufferGeometry(); {
      const parts: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 7; k++) { const l = leaf.clone(); l.rotateY((k / 7) * Math.PI * 2); parts.push(l); }
      const merged = mergeGeos(parts); leaves.copy(merged); leaves.translate(1.8, 9, 0);
    }
    inst(leaves, new THREE.MeshStandardMaterial({ color: "#2f9a3a", roughness: 0.8, side: THREE.DoubleSide }), palms, (o) => o.scale.setScalar(0.8 + rand() * 0.6));
    // beach umbrellas & huts
    const ums = scatter(40, WALL + 6, 40);
    const pole = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 5); pole.translate(0, 1.6, 0);
    inst(pole, new THREE.MeshStandardMaterial({ color: "#eee" }), ums, () => {}, false);
    const cols = ["#ff3d5a", "#ffd23f", "#1fb5ff", "#ff8a00", "#2ecc71"];
    const top = new THREE.ConeGeometry(1.9, 0.8, 8); top.translate(0, 3.3, 0);
    const um = inst(top, new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.6 }), ums, () => {});
    ums.forEach((_, i) => um.setColorAt(i, new THREE.Color(cols[i % cols.length])));
    // big distant hills
    const hills = scatter(14, 120, 240);
    inst(new THREE.SphereGeometry(30, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#5fae4a", roughness: 1 }), hills, (o) => o.scale.set(1 + rand(), 0.4 + rand() * 0.5, 1 + rand()), false);
  }
  if (def.key === "city") {
    const bld = scatter(quality > 0 ? 170 : 90, WALL + 8, 120);
    const winTex = canvas(64, 128, (g) => {
      g.fillStyle = "#0b0d1a"; g.fillRect(0, 0, 64, 128);
      const cs = ["#ffcf6a", "#7de8ff", "#ff5fd2", "#fff1c9"];
      for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) if (rand() < 0.45) { g.fillStyle = cs[Math.floor(rand() * 4)]; g.fillRect(x, y, 5, 5); }
    });
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const bm = new THREE.MeshStandardMaterial({ color: "#1a1c2c", roughness: 0.6, metalness: 0.4, emissive: "#ffffff", emissiveMap: winTex, emissiveIntensity: 0.8 });
    inst(box, bm, bld, (o) => { const w = 10 + rand() * 16; o.scale.set(w, 18 + rand() * 70, 10 + rand() * 16); });
    // neon signs & roof lights
    const signs = scatter(60, WALL + 4, 30);
    const sg = new THREE.PlaneGeometry(6, 1.6); sg.translate(0, 7, 0);
    const sm = new THREE.MeshBasicMaterial({ color: "#fff", toneMapped: false, side: THREE.DoubleSide });
    const sI = inst(sg, sm, signs, () => {}, false);
    const neon = ["#ff2bd6", "#00e5ff", "#ffe600", "#7dff4a", "#ff5a2b"];
    signs.forEach((_, i) => sI.setColorAt(i, new THREE.Color(neon[i % 5]).multiplyScalar(2.2)));
    const post = new THREE.CylinderGeometry(0.15, 0.15, 6, 5); post.translate(0, 3, 0);
    inst(post, new THREE.MeshStandardMaterial({ color: "#333648", metalness: 0.7, roughness: 0.4 }), signs, () => {}, false);
    // light poles along the track
    const lamps: [number, number][] = [];
    for (let i = 0; i < N; i += 45) for (const sd of [-1, 1]) lamps.push([P[i].x + R[i].x * (WALL + 2) * sd, P[i].z + R[i].z * (WALL + 2) * sd]);
    const lp = new THREE.CylinderGeometry(0.12, 0.18, 9, 5); lp.translate(0, 4.5, 0);
    inst(lp, new THREE.MeshStandardMaterial({ color: "#2a2d3e", metalness: 0.8 }), lamps, (o, i) => { const k = Math.floor(i / 2) * 45; o.position.y = P[k].y; }, false);
    const bulb = new THREE.SphereGeometry(0.45, 8, 6); bulb.translate(0, 9, 0);
    inst(bulb, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 2), toneMapped: false }), lamps, (o, i) => { const k = Math.floor(i / 2) * 45; o.position.y = P[k].y; }, false);
  }
  if (def.key === "volcano") {
    const rocks = scatter(quality > 0 ? 160 : 90, WALL + 4, 90);
    inst(new THREE.DodecahedronGeometry(3, 0), new THREE.MeshStandardMaterial({ color: "#3a2a24", roughness: 1, flatShading: true }), rocks, (o) => { o.scale.set(0.6 + rand() * 2, 0.5 + rand() * 2.2, 0.6 + rand() * 2); o.position.y = -0.5; });
    // pillars holding up raised sections
    const pil: [number, number][] = [], pilY: number[] = [];
    for (let i = 0; i < N; i += 30) if (P[i].y > 3) for (const sd of [-1, 1]) { pil.push([P[i].x + R[i].x * (WALL - 1) * sd, P[i].z + R[i].z * (WALL - 1) * sd]); pilY.push(P[i].y); }
    const pg = new THREE.CylinderGeometry(1.4, 2, 1, 8); pg.translate(0, -0.5, 0);
    inst(pg, new THREE.MeshStandardMaterial({ color: "#2a1d1a", roughness: 1 }), pil, (o, i) => { o.position.y = pilY[i]; o.scale.set(1, pilY[i] + 3, 1); });
    // the volcano
    const vol = new THREE.Mesh(new THREE.ConeGeometry(160, 190, 24, 4, true), new THREE.MeshStandardMaterial({ color: "#2b1a15", roughness: 1, flatShading: true }));
    vol.position.set(cx + 60, 90, maxZ + 260); group.add(vol);
    const crater = new THREE.Mesh(new THREE.CircleGeometry(24, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, 0.4), toneMapped: false }));
    crater.position.set(vol.position.x, 178, vol.position.z); group.add(crater);
    const vlight = new THREE.PointLight("#ff6a10", 2000, 600, 1.6); vlight.position.set(vol.position.x, 200, vol.position.z); group.add(vlight);
    // embers
    const eN = 400, eg = new THREE.BufferGeometry(), ep = new Float32Array(eN * 3);
    for (let i = 0; i < eN; i++) { ep[i * 3] = cx + (rand() - 0.5) * 500; ep[i * 3 + 1] = rand() * 80; ep[i * 3 + 2] = cz + (rand() - 0.5) * 500; }
    eg.setAttribute("position", new THREE.BufferAttribute(ep, 3));
    const em = new THREE.Points(eg, new THREE.PointsMaterial({ color: new THREE.Color(3, 1.2, 0.3), size: 0.6, toneMapped: false, transparent: true, opacity: 0.8 }));
    group.add(em);
    animated.push((t) => { const a = eg.getAttribute("position") as THREE.BufferAttribute; for (let i = 0; i < eN; i++) { let y = a.getY(i) + 0.06; if (y > 80) y = 0; a.setY(i, y); } a.needsUpdate = true; crater.material.color.setRGB(4 + Math.sin(t * 3) * 0.8, 1.6, 0.4); });
  }

  // ── start / finish gate ──
  {
    const p = P[0], t = T[0], r = R[0], yaw = Math.atan2(t.x, t.z);
    const chk = canvas(64, 16, (g) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * 8, y * 8, 8, 8); } }, false);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, 2.5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.7 }));
    line.position.set(p.x, p.y + 0.04, p.z); line.rotation.set(0, yaw, 0); group.add(line);
    const pm = new THREE.MeshStandardMaterial({ color: "#222634", metalness: 0.7, roughness: 0.3 });
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), pm); c.position.set(p.x + r.x * (RW + 2) * s, p.y + 4.5, p.z + r.z * (RW + 2) * s); c.castShadow = true; group.add(c); }
    const ban = canvas(512, 64, (g) => {
      const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "#ff3d7f"); gr.addColorStop(0.5, "#ff8a00"); gr.addColorStop(1, "#ffd23f"); g.fillStyle = gr; g.fillRect(0, 0, 512, 64);
      g.font = "italic 900 44px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.strokeStyle = "#5a0f2a"; g.lineWidth = 6; g.strokeText("TURBOKART", 256, 34); g.fillText("TURBOKART", 256, 34);
    }, false);
    const bm = new THREE.MeshStandardMaterial({ map: ban, emissive: "#ffffff", emissiveMap: ban, emissiveIntensity: def.key === "beach" ? 0.1 : 0.7, side: THREE.DoubleSide });
    const b = new THREE.Mesh(new THREE.BoxGeometry((RW + 2) * 2 + 1.2, 2.6, 0.5), [pm, pm, pm, pm, bm, bm]);
    b.position.set(p.x, p.y + 9, p.z); b.rotation.y = yaw; b.castShadow = true; group.add(b);
  }

  // ── boost pads ──
  const padTex = canvas(64, 128, (g) => {
    g.fillStyle = "#1a0f00"; g.fillRect(0, 0, 64, 128);
    for (let k = 0; k < 3; k++) { g.strokeStyle = "#ffcc33"; g.lineWidth = 10; g.beginPath(); g.moveTo(8, 50 + k * 30); g.lineTo(32, 20 + k * 30); g.lineTo(56, 50 + k * 30); g.stroke(); }
  }, false);
  padTex.wrapT = THREE.RepeatWrapping;
  const padMat = new THREE.MeshBasicMaterial({ map: padTex, color: new THREE.Color(2.4, 1.6, 0.6), toneMapped: false, transparent: true });
  const pads = def.pads.map(([f, s]) => {
    const i = Math.floor(f * N), p = P[i], t = T[i], r = R[i];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 6).rotateX(-Math.PI / 2), padMat);
    m.position.set(p.x + r.x * s, p.y + 0.05, p.z + r.z * s); m.rotation.y = Math.atan2(t.x, t.z) + Math.PI; group.add(m);
    return { i, s };
  });
  animated.push((t) => { padTex.offset.y = -t * 1.5; });

  // ── ramps (jump wedges) ──
  const rampMat = new THREE.MeshStandardMaterial({ color: "#2a2e44", metalness: 0.5, roughness: 0.4 });
  const rampStripe = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.2, 3), toneMapped: false });
  const ramps = def.ramps.map((f) => {
    const i = Math.floor(f * N), p = P[i], t = T[i];
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(7, 0); sh.lineTo(7, 1.4); sh.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: RW * 1.4, bevelEnabled: false }); g.translate(-7, 0, -RW * 0.7); g.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(g, rampMat); m.position.set(p.x, p.y, p.z); m.rotation.y = Math.atan2(t.x, t.z); m.castShadow = true; m.receiveShadow = true; group.add(m);
    const st = new THREE.Mesh(new THREE.BoxGeometry(RW * 1.4, 0.12, 0.4), rampStripe); st.position.set(0, 1.42, -0.2); m.add(st);
    return i;
  });

  // ── item boxes ──
  const boxGeo = new THREE.IcosahedronGeometry(1.05, 0);
  const boxes: Track["boxes"] = [];
  const boxMats: THREE.MeshPhysicalMaterial[] = [];
  for (const f of def.boxes) {
    const i = Math.floor(f * N);
    for (const s of [-6, -2, 2, 6]) {
      const p = P[i], r = R[i];
      const g = new THREE.Group(); g.position.set(p.x + r.x * s, p.y + 1.5, p.z + r.z * s);
      const mat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, metalness: 0.1, transmission: 0, transparent: true, opacity: 0.78, iridescence: 1, iridescenceIOR: 1.8, emissive: "#ff66cc", emissiveIntensity: 0.6, flatShading: true });
      boxMats.push(mat);
      const outer = new THREE.Mesh(boxGeo, mat); outer.castShadow = true;
      const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), toneMapped: false }));
      g.add(outer, inner); group.add(g);
      boxes.push({ p: g.position.clone(), i, t: 0, mesh: g });
    }
  }
  const tmpC = new THREE.Color();
  animated.push((t) => {
    boxMats.forEach((m, k) => { tmpC.setHSL((t * 0.25 + k * 0.07) % 1, 1, 0.55); m.emissive.copy(tmpC); m.color.copy(tmpC).lerp(new THREE.Color(1, 1, 1), 0.6); });
    for (const b of boxes) { b.mesh.rotation.set(t * 0.9, t * 1.3, 0); b.mesh.position.y = b.p.y + Math.sin(t * 2 + b.i) * 0.25; }
  });

  void liquids;
  return {
    def, P, T, R, len, seg, boxes, pads, ramps, group, bounds: { minX, maxX, minZ, maxZ },
    update(dt, t) {
      for (const f of animated) f(t);
      for (const b of boxes) {
        if (b.t > 0) { b.t -= dt; b.mesh.visible = false; if (b.t <= 0) { b.mesh.visible = true; b.mesh.scale.setScalar(0.05); } }
        else if (b.mesh.scale.x < 1) b.mesh.scale.setScalar(Math.min(1, b.mesh.scale.x + dt * 2.5));
      }
    },
  };
}

function mergeGeos(list: THREE.BufferGeometry[]) {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  let off = 0;
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.getAttribute("position"), n = g.getAttribute("normal");
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); idx.push(off + i); }
    off += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
