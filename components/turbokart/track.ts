import * as THREE from "three";

/** Track geometry: a closed spline, sampled every ~1 m. Road is flat across, follows the spline height. */
export const RW = 9, CURB = 1.1, OW = 16.5, WALL = 17.2, N = 1400;

export type Theme = "beach" | "city" | "volcano";
export type ScKind = "off" | "road";
export type ScDef = { a: number; b: number; w: number; kind: ScKind };
export type CraterDef = { x: number; z: number; rin: number; rpk: number; rout: number; h: number };
export type TrackDef = { key: Theme; de: string; en: string; pts: [number, number, number][]; boxes: number[]; pads: [number, number][]; ramps: number[]; shortcuts: ScDef[]; crater?: CraterDef };

export const TRACKS: TrackDef[] = [
  {
    key: "beach", de: "Sonnenstrand", en: "Sunny Beach",
    pts: [[0, -150, 0], [90, -160, 0], [165, -115, 1], [175, -30, 4], [125, 35, 7], [160, 105, 4], [105, 175, 1], [10, 160, 0], [-55, 95, 4], [-135, 125, 2], [-195, 45, 0], [-160, -60, 0], [-85, -125, 0]],
    boxes: [0.15, 0.48, 0.76], pads: [[0.31, -3], [0.62, 4], [0.9, 0]], ramps: [0.55],
    shortcuts: [{ a: 430, b: 690, w: 5.5, kind: "off" }, { a: 850, b: 1110, w: 4.6, kind: "road" }],
  },
  {
    key: "city", de: "Neon-City", en: "Neon City",
    pts: [[0, -125, 0], [110, -135, 0], [160, -95, 0], [165, -15, 5], [160, 60, 12], [110, 115, 13], [25, 115, 10], [-15, 60, 5], [-65, 20, 0], [-150, 35, 0], [-185, -30, 0], [-150, -105, 0], [-75, -135, 0]],
    boxes: [0.12, 0.45, 0.78], pads: [[0.22, 0], [0.4, -4], [0.66, 3], [0.92, 0]], ramps: [0.56],
    shortcuts: [{ a: 880, b: 1140, w: 4.8, kind: "road" }],
  },
  {
    key: "volcano", de: "Vulkan", en: "Volcano",
    pts: [[0, -175, 0], [100, -160, 6], [175, -90, 14], [150, -5, 20], [65, 15, 22], [25, 85, 16], [100, 140, 9], [80, 205, 4], [-10, 220, 1], [-110, 205, 3], [-200, 180, 8], [-262, 135, 11], [-268, 60, 11], [-268, 0, 11], [-264, -70, 11], [-225, -140, 6], [-130, -175, 1]],
    boxes: [0.14, 0.44, 0.74], pads: [[0.28, 3], [0.58, -3], [0.88, 0]], ramps: [0.35, 0.86],
    shortcuts: [{ a: 440, b: 700, w: 5.5, kind: "off" }],
    crater: { x: -268, z: 30, rin: 44, rpk: 60, rout: 98, h: 50 },
  },
];

export type Sc = { kind: ScKind; w: number; a: number; b: number; P: THREE.Vector3[]; T: THREE.Vector3[]; R: THREE.Vector3[]; M: number; j0: number; j1: number; jw0: number; jw1: number };
export type Fx = { emit(x: number, y: number, z: number, col: string, life: number, spd: number, vy?: number): void; big(x: number, y: number, z: number, col: string, life: number, spd: number, vy?: number): void; boom(v: number, at: THREE.Vector3): void; shake(v: number, at: THREE.Vector3): void };
export type Track = {
  def: TrackDef; P: THREE.Vector3[]; T: THREE.Vector3[]; R: THREE.Vector3[]; len: number; seg: number; sc: Sc[];
  boxes: { p: THREE.Vector3; i: number; t: number; mesh: THREE.Object3D }[];
  pads: { i: number; s: number; sc: number; p: THREE.Vector3 }[]; ramps: number[];
  group: THREE.Group; bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  update(dt: number, time: number, cam: THREE.Vector3): void;
};

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function noise(g: CanvasRenderingContext2D, w: number, h: number, base: string, spots: readonly string[], n: number, r: number, rand: () => number) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.fillStyle = spots[i % spots.length]; g.globalAlpha = 0.25 + rand() * 0.4; g.fillRect(rand() * w, rand() * h, 1 + rand() * r, 1 + rand() * r); }
  g.globalAlpha = 1;
}
const soft = (r: number, g: number, b: number) => canvas(64, 64, (x) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.5, `rgba(${r},${g},${b},.45)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }, false);

export function sampleTrack(def: TrackDef) {
  const curve = new THREE.CatmullRomCurve3(def.pts.map(([x, z, y]) => new THREE.Vector3(x, y, z)), true, "centripetal");
  const P: THREE.Vector3[] = [], T: THREE.Vector3[] = [], R: THREE.Vector3[] = [];
  const pts = curve.getSpacedPoints(N);
  for (let i = 0; i < N; i++) P.push(pts[i]);
  frame(P, T, R, true);
  return { P, T, R, len: curve.getLength() };
}
function frame(P: THREE.Vector3[], T: THREE.Vector3[], R: THREE.Vector3[], closed: boolean) {
  const n = P.length;
  for (let i = 0; i < n; i++) {
    const a = closed ? P[(i - 1 + n) % n] : P[Math.max(0, i - 1)], b = closed ? P[(i + 1) % n] : P[Math.min(n - 1, i + 1)];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(); T.push(t); R.push(new THREE.Vector3(-t.z, 0, t.x));
  }
}
/** Shortcut path from main index a to b: a smooth curve that leaves and rejoins the road. */
export function makeShortcut(P: THREE.Vector3[], d: ScDef): Sc {
  const c = new THREE.CatmullRomCurve3([P[(d.a - 40 + N) % N], P[d.a], P[d.b], P[(d.b + 40) % N]], false, "centripetal");
  const raw: THREE.Vector3[] = []; for (let k = 0; k <= 400; k++) raw.push(c.getPoint(1 / 3 + k / 1200));
  const acc = [0]; for (let k = 1; k < raw.length; k++) acc.push(acc[k - 1] + raw[k].distanceTo(raw[k - 1]));
  const L = acc[acc.length - 1], M = Math.max(20, Math.ceil(L));
  const SP: THREE.Vector3[] = [], ST: THREE.Vector3[] = [], SR: THREE.Vector3[] = [];
  for (let j = 0, k = 0; j < M; j++) { const want = (j / (M - 1)) * L; while (k < raw.length - 2 && acc[k + 1] < want) k++; const f = (want - acc[k]) / Math.max(1e-6, acc[k + 1] - acc[k]); SP.push(raw[k].clone().lerp(raw[k + 1], Math.min(1, f))); }
  frame(SP, ST, SR, false);
  const mainD = (p: THREE.Vector3) => { let bd = Infinity; for (let i = 0; i < N; i += 2) { const q = P[i]; bd = Math.min(bd, (q.x - p.x) ** 2 + (q.z - p.z) ** 2); } return Math.sqrt(bd); };
  const dist = SP.map(mainD);
  let j0 = 0, j1 = M - 1, jw0 = 0, jw1 = M - 1;
  while (j0 < M - 1 && dist[j0] < RW + CURB + 0.3) j0++;
  while (j1 > 0 && dist[j1] < RW + CURB + 0.3) j1--;
  while (jw0 < M - 1 && dist[jw0] < WALL + 0.6) jw0++;
  while (jw1 > 0 && dist[jw1] < WALL + 0.6) jw1--;
  return { kind: d.kind, w: d.w, a: d.a, b: d.b, P: SP, T: ST, R: SR, M, j0, j1, jw0, jw1 };
}

const THEMES = {
  beach: { sky: ["#2f8fff", "#9fd6ff", "#ffe2b8"], fog: "#bfe3ff", fogN: 320, fogF: 1200, ground: "#e9cf94", off: ["#e2c27f", ["#cfa95f", "#f3dca6", "#b8914c"]], wall: ["#ffffff", "#ff3d5a"], sun: "#fff4dc", sunI: 2.3, hemi: ["#cfe9ff", "#c8a870", 0.75], exp: 0.92 },
  city: { sky: ["#05040f", "#1a0f3d", "#4a1a6a"], fog: "#160c30", fogN: 160, fogF: 700, ground: "#121424", off: ["#262838", ["#1b1d2b", "#33364a", "#2a2c3c"]], wall: ["#1a1d33", "#00e5ff"], sun: "#a9b8ff", sunI: 1.1, hemi: ["#6a5cff", "#1a1030", 0.9], exp: 1.0 },
  volcano: { sky: ["#140404", "#4a0f06", "#d24a14"], fog: "#3a120a", fogN: 160, fogF: 700, ground: "#2a1d1a", off: ["#3a2a24", ["#2a1c18", "#4d382e", "#221613"]], wall: ["#2b201d", "#ff6a10"], sun: "#ffb27a", sunI: 1.8, hemi: ["#ff9a6a", "#2a1210", 0.8], exp: 1.0 },
} as const;
export const themeOf = (k: Theme) => THEMES[k];

export function buildTrack(def: TrackDef, scene: THREE.Scene, quality: number, fx: Fx): Track {
  const { P, T, R, len } = sampleTrack(def);
  const sc = def.shortcuts.map((d) => makeShortcut(P, d));
  const th = THEMES[def.key];
  const group = new THREE.Group(); scene.add(group);
  const rand = rnd(def.key.length * 977 + 13);
  const seg = len / N;
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const p of P) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, ext = Math.max(maxX - minX, maxZ - minZ) / 2;
  const animated: ((dt: number, t: number, cam: THREE.Vector3) => void)[] = [];
  const night = def.key !== "beach";
  const crater = def.crater;

  // ── sky dome (+ stars at night) ──
  const skyTex = canvas(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, th.sky[0]); gr.addColorStop(0.55, th.sky[1]); gr.addColorStop(1, th.sky[2]); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }, false);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; group.add(sky);
  animated.push((_, __, cam) => sky.position.copy(cam));
  if (night) {
    const n = 900, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = rand() * Math.PI * 2, v = 0.08 + rand() * 0.9; a[i * 3] = Math.cos(u) * Math.cos(v) * 1300; a[i * 3 + 1] = Math.sin(v) * 1300; a[i * 3 + 2] = Math.sin(u) * Math.cos(v) * 1300; }
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    const st = new THREE.Points(g, new THREE.PointsMaterial({ color: "#fff", size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })); group.add(st);
    animated.push((_, __, cam) => st.position.copy(cam));
  }
  scene.fog = new THREE.Fog(th.fog, th.fogN, th.fogF);

  // ── generic strip builders (along any sampled path) ──
  function strip(Ps: THREE.Vector3[], Rs: THREE.Vector3[], a: number, b: number, mat: THREE.Material, vLen: number, dy = 0, uRep = 1, closed = true, from = 0, to = Ps.length) {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let d = 0; const n = Ps.length, last = closed ? to : to - 1;
    for (let i = from; i <= last; i++) {
      const k = i % n, p = Ps[k], r = Rs[k];
      if (i > from) d += Ps[(i - 1) % n].distanceTo(p);
      pos.push(p.x + r.x * a, p.y + dy, p.z + r.z * a, p.x + r.x * b, p.y + dy, p.z + r.z * b);
      uv.push(0, d / vLen, uRep, d / vLen);
      if (i < last) { const o = (i - from) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const nn = geo.getAttribute("normal"); if (nn.getY(0) < 0) { idx.reverse(); geo.setIndex(idx); geo.computeVertexNormals(); }
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; group.add(m); return m;
  }
  function wallAlong(Ps: THREE.Vector3[], Rs: THREE.Vector3[], s: number, h0: number, h1: number, mat: THREE.Material, vLen: number, closed = true, skip?: (i: number) => boolean, from = 0, to = Ps.length, shadow = true) {
    const pos: number[] = [], uv: number[] = [];
    const n = Ps.length, last = closed ? to : to - 1;
    let d = 0;
    for (let i = from; i < last; i++) {
      const k0 = i % n, k1 = (i + 1) % n, p0 = Ps[k0], p1 = Ps[k1], r0 = Rs[k0], r1 = Rs[k1];
      const dd = p0.distanceTo(p1);
      if (!(skip && (skip(k0) || skip(k1)))) {
        const x0 = p0.x + r0.x * s, z0 = p0.z + r0.z * s, x1 = p1.x + r1.x * s, z1 = p1.z + r1.z * s;
        const A = [x0, p0.y + h0, z0], B = [x0, p0.y + h1, z0], C = [x1, p1.y + h0, z1], D = [x1, p1.y + h1, z1];
        const quad = s > 0 ? [A, B, C, B, D, C] : [A, C, B, B, C, D];
        const u0 = d / vLen, u1 = (d + dd) / vLen;
        const uvq = s > 0 ? [[u0, 0], [u0, 1], [u1, 0], [u0, 1], [u1, 1], [u1, 0]] : [[u0, 0], [u1, 0], [u0, 1], [u0, 1], [u1, 0], [u1, 1]];
        quad.forEach((v) => pos.push(...v)); uvq.forEach((v) => uv.push(...v));
      }
      d += dd;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = shadow && quality > 0; m.receiveShadow = true; group.add(m); return m;
  }

  // wall gaps where a shortcut leaves the road
  const gap = [new Uint8Array(N), new Uint8Array(N)];
  for (const c of sc) for (let i = 0; i < N; i++) for (const [si, sd] of [[0, -1], [1, 1]] as const) {
    const x = P[i].x + R[i].x * WALL * sd, z = P[i].z + R[i].z * WALL * sd;
    for (let j = 1; j < c.M - 1; j++) { const q = c.P[j]; if ((q.x - x) ** 2 + (q.z - z) ** 2 < (c.w + 1.2) ** 2) { gap[si][i] = 1; break; } }
  }
  const skipL = (i: number) => !!gap[0][i], skipR = (i: number) => !!gap[1][i];

  // ── road ──
  const roadTex = canvas(256, 256, (g) => {
    noise(g, 256, 256, night ? "#2b2d36" : "#4a4c55", night ? ["#1e2028", "#3a3d48", "#25272f"] : ["#3c3e46", "#5d6069", "#44464e"], 5000, 2.5, rand);
    g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(4, 0, 5, 256); g.fillRect(247, 0, 5, 256);
    g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(126, 0, 4, 120);
  });
  const road = new THREE.MeshStandardMaterial({ map: roadTex, roughness: night ? 0.5 : 0.85, metalness: night ? 0.3 : 0.05 });
  strip(P, R, -RW, RW, road, 18);
  const curbTex = canvas(4, 64, (g) => { g.fillStyle = th.wall[1]; g.fillRect(0, 0, 4, 32); g.fillStyle = "#f4f4f4"; g.fillRect(0, 32, 4, 32); });
  const curb = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.6, emissive: def.key === "city" ? "#00a0c0" : "#000", emissiveIntensity: def.key === "city" ? 0.35 : 0 });
  strip(P, R, RW, RW + CURB, curb, 5, 0.03); strip(P, R, -RW - CURB, -RW, curb, 5, 0.03);
  const offTex = canvas(128, 128, (g) => noise(g, 128, 128, th.off[0], th.off[1], 2500, 3, rand));
  const off = new THREE.MeshStandardMaterial({ map: offTex, roughness: 0.95 });
  strip(P, R, RW + CURB, WALL + 0.4, off, 12, -0.02, 2); strip(P, R, -WALL - 0.4, -RW - CURB, off, 12, -0.02, 2);
  const wallTex = canvas(64, 16, (g) => { g.fillStyle = th.wall[0]; g.fillRect(0, 0, 64, 16); g.fillStyle = th.wall[1]; g.fillRect(0, 10, 64, 6); if (def.key === "beach") { g.fillRect(0, 0, 32, 4); } });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.5, side: THREE.DoubleSide, emissive: def.key === "beach" ? "#000" : th.wall[1], emissiveMap: def.key === "beach" ? null : wallTex, emissiveIntensity: def.key === "beach" ? 0 : 0.5 });
  wallAlong(P, R, WALL + 0.4, 0, 1.3, wallMat, 4, true, skipR); wallAlong(P, R, -WALL - 0.4, 0, 1.3, wallMat, 4, true, skipL);
  const skirt = new THREE.MeshStandardMaterial({ color: night ? "#22242f" : "#cdb48a", roughness: 0.9, side: THREE.DoubleSide });
  wallAlong(P, R, WALL + 0.45, -40, 0.01, skirt, 10, true, skipR, 0, N, false); wallAlong(P, R, -WALL - 0.45, -40, 0.01, skirt, 10, true, skipL, 0, N, false);
  if (def.key !== "beach") {
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(th.wall[1]).multiplyScalar(2.2), toneMapped: false, side: THREE.DoubleSide });
    wallAlong(P, R, WALL + 0.38, 1.3, 1.45, glow, 4, true, skipR, 0, N, false); wallAlong(P, R, -WALL - 0.38, 1.3, 1.45, glow, 4, true, skipL, 0, N, false);
  }

  // ── shortcuts ──
  const scPads: { i: number; s: number; sc: number; p: THREE.Vector3 }[] = [];
  sc.forEach((c, ci) => {
    let mat: THREE.Material, wm: THREE.Material;
    if (c.kind === "off") {
      const t = canvas(128, 128, (g) => { noise(g, 128, 128, def.key === "beach" ? "#d7b877" : "#4a3328", def.key === "beach" ? ["#c4a060", "#e8cf98", "#a88850"] : ["#3a2418", "#6a4430", "#ff5a10"], 3000, 3, rand); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(30, 0, 10, 128); g.fillRect(88, 0, 10, 128); });
      mat = new THREE.MeshStandardMaterial({ map: t, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
      wm = def.key === "beach" ? new THREE.MeshStandardMaterial({ color: "#8a6a45", roughness: 1 }) : new THREE.MeshStandardMaterial({ color: "#2a1d1a", emissive: "#ff4a00", emissiveIntensity: 0.35, roughness: 1 });
    } else if (def.key === "beach") {
      const t = canvas(128, 128, (g) => { for (let y = 0; y < 128; y += 16) { g.fillStyle = y % 32 ? "#b98a55" : "#a87a48"; g.fillRect(0, y, 128, 14); g.fillStyle = "#6a4a2a"; g.fillRect(0, y + 14, 128, 2); } for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(60,40,20,.25)"; g.fillRect(rand() * 128, rand() * 128, 6, 1); } });
      mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
      wm = new THREE.MeshStandardMaterial({ color: "#f2f2f2", roughness: 0.6 });
    } else {
      mat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.4, metalness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 });
      wm = new THREE.MeshStandardMaterial({ color: "#1a1d33", emissive: "#ff2bd6", emissiveIntensity: 0.9 });
    }
    strip(c.P, c.R, -c.w, c.w, mat, 10, 0.04, 1, false, Math.max(0, c.j0 - 2), Math.min(c.M, c.j1 + 3));
    if (c.jw1 > c.jw0 + 2) {
      const h = c.kind === "off" ? 0.8 : 1.0;
      wallAlong(c.P, c.R, c.w + 0.3, 0, h, wm, 4, false, undefined, c.jw0, c.jw1); wallAlong(c.P, c.R, -c.w - 0.3, 0, h, wm, 4, false, undefined, c.jw0, c.jw1);
      wallAlong(c.P, c.R, c.w + 0.35, -40, 0.01, skirt, 10, false, undefined, c.jw0, c.jw1, false); wallAlong(c.P, c.R, -c.w - 0.35, -40, 0.01, skirt, 10, false, undefined, c.jw0, c.jw1, false);
      if (c.kind === "road" && def.key === "city") { const nm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.5, 2.2), toneMapped: false, side: THREE.DoubleSide }); wallAlong(c.P, c.R, c.w + 0.28, 1.0, 1.15, nm, 4, false, undefined, c.jw0, c.jw1, false); wallAlong(c.P, c.R, -c.w - 0.28, 1.0, 1.15, nm, 4, false, undefined, c.jw0, c.jw1, false); }
    }
    // road shortcuts hide a dash panel, so they really pay off
    if (c.kind === "road") { const j = Math.floor((c.jw0 + c.jw1) / 2); scPads.push({ i: j, s: 0, sc: ci, p: c.P[j].clone() }); }
    // arrow signs at the entrance
    const signM = new THREE.MeshBasicMaterial({ map: canvas(64, 32, (g) => { g.fillStyle = "#ffd23f"; g.fillRect(0, 0, 64, 32); g.fillStyle = "#111"; g.beginPath(); g.moveTo(10, 11); g.lineTo(38, 11); g.lineTo(38, 3); g.lineTo(56, 16); g.lineTo(38, 29); g.lineTo(38, 21); g.lineTo(10, 21); g.fill(); }, false), side: THREE.DoubleSide });
    const j = Math.min(c.M - 1, c.jw0 + 2), p = c.P[j], r = c.R[j];
    for (const sd of [-1, 1]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), signM); s.position.set(p.x + r.x * (c.w + 1.4) * sd, p.y + 1.7, p.z + r.z * (c.w + 1.4) * sd);
      s.lookAt(s.position.x - c.T[j].x, s.position.y, s.position.z - c.T[j].z); group.add(s);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.7), new THREE.MeshStandardMaterial({ color: "#666" })); pole.position.set(s.position.x, p.y + 0.85, s.position.z); group.add(pole);
    }
  });

  // ── ground ──
  const gTex = canvas(256, 256, (g) => noise(g, 256, 256, th.ground, th.off[1], 6000, 3, rand));
  gTex.repeat.set(60, 60);
  const groundR = def.key === "beach" ? 330 : def.key === "volcano" ? ext + 80 : 900;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(groundR, 72).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gTex, roughness: 1 }));
  ground.position.set(cx, -0.6, cz); ground.receiveShadow = true; group.add(ground);

  // distance from the track (for scenery placement)
  const near = (x: number, z: number, d: number) => {
    for (let i = 0; i < N; i += 4) { const p = P[i]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < d * d) return true; }
    for (const c of sc) for (let j = 0; j < c.M; j += 3) { const p = c.P[j]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < Math.max(4, d - WALL + c.w + 3) ** 2) return true; }
    if (crater && Math.hypot(x - crater.x, z - crater.z) < crater.rout + 4) return true;
    return false;
  };
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
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length;
    list.forEach(([x, z], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, rand() * 6.28, 0); dummy.scale.set(1, 1, 1); f(dummy, i); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.castShadow = shadow && quality > 0; group.add(m); return m;
  }
  const cols = ["#ff3d5a", "#ffd23f", "#1fb5ff", "#ff8a00", "#2ecc71"];

  // ── grandstands with a cheering crowd at the start ──
  {
    const stands: { x: number; z: number; y: number; yaw: number }[] = [];
    for (const sd of [-1, 1]) for (let i = N - 70; i < N + 30; i += 25) {
      const k = (i + N) % N, p = P[k], r = R[k], d = WALL + 9;
      const x = p.x + r.x * d * sd, z = p.z + r.z * d * sd;
      let ok = true; for (let j = 0; j < N; j += 5) { const q = P[j]; if ((q.x - x) ** 2 + (q.z - z) ** 2 < 24 ** 2) { let dj = Math.abs(j - k); dj = Math.min(dj, N - dj); if (dj > 40) { ok = false; break; } } }
      if (ok && !(crater && Math.hypot(x - crater.x, z - crater.z) < crater.rout)) stands.push({ x, z, y: p.y, yaw: Math.atan2(r.x * sd, r.z * sd) });
    }
    const standMat = new THREE.MeshStandardMaterial({ color: night ? "#2a2d44" : "#d9dde6", roughness: 0.6, metalness: 0.3 });
    const roofCol = def.key === "beach" ? "#ff3d5a" : def.key === "city" ? "#ff2bd6" : "#ff6a10";
    const roofMat = new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.5, emissive: night ? roofCol : "#000", emissiveIntensity: 0.4 });
    const people: { base: THREE.Matrix4; ph: number }[] = [];
    const pc = ["#ff3d7f", "#ffd23f", "#2ecc71", "#00c2ff", "#9b5de5", "#ff8a00", "#ffffff", "#e63946"];
    for (const st of stands) {
      const g = new THREE.Group(); g.position.set(st.x, st.y - 0.6, st.z); g.rotation.y = st.yaw; group.add(g);
      for (let row = 0; row < 5; row++) { const b = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 2.2), standMat); b.position.set(0, row * 1.1 + 0.5, row * 2.2); b.castShadow = quality > 0; b.receiveShadow = true; g.add(b); }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 13), roofMat); roof.position.set(0, 9.5, 4.5); roof.rotation.x = -0.12; g.add(roof);
      for (const x of [-12, 12]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9.5, 0.4), standMat); pl.position.set(x, 4.75, 10); g.add(pl); }
      g.updateMatrixWorld(true);
      for (let row = 0; row < 5; row++) for (let x = -11; x <= 11; x += 1.4) if (rand() < 0.85) {
        const m = new THREE.Matrix4().makeTranslation(x + (rand() - 0.5) * 0.4, row * 1.1 + 1.55, row * 2.2 + 0.2);
        people.push({ base: g.matrixWorld.clone().multiply(m), ph: rand() * 10 });
      }
    }
    if (people.length) {
      const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.28, 0.5, 2, 6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), people.length);
      people.forEach((pp, i) => { crowd.setMatrixAt(i, pp.base); crowd.setColorAt(i, new THREE.Color(pc[i % pc.length])); });
      group.add(crowd);
      const tmp = new THREE.Matrix4();
      animated.push((_, t, cam) => {
        if (cam.distanceToSquared(P[0]) > 250 ** 2) return;
        people.forEach((pp, i) => { tmp.makeTranslation(0, Math.max(0, Math.sin(t * 9 + pp.ph)) * 0.35, 0).multiply(pp.base); crowd.setMatrixAt(i, tmp); });
        crowd.instanceMatrix.needsUpdate = true;
      });
    }
    // waving flags along the start straight
    const flags: THREE.Mesh[] = [];
    const fc = ["#ff3d7f", "#ffd23f", "#00c2ff", "#2ecc71", "#ff8a00", "#9b5de5"];
    for (let i = N - 120; i < N + 60; i += 30) for (const sd of [-1, 1]) {
      const k = (i + N) % N, p = P[k], r = R[k], x = p.x + r.x * (WALL + 1.5) * sd, z = p.z + r.z * (WALL + 1.5) * sd;
      if (gap[sd < 0 ? 0 : 1][k]) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7), new THREE.MeshStandardMaterial({ color: "#ccc", metalness: 0.8 })); pole.position.set(x, p.y + 3.5, z); group.add(pole);
      const fgeo = new THREE.PlaneGeometry(2.6, 1.5, 8, 1); fgeo.translate(1.3, 0, 0);
      const col = fc[flags.length % fc.length];
      const f = new THREE.Mesh(fgeo, new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.7, emissive: night ? col : "#000", emissiveIntensity: 0.3 }));
      f.position.set(x, p.y + 6.2, z); f.rotation.y = rand() * 6; group.add(f); flags.push(f);
    }
    animated.push((_, t) => flags.forEach((f, i) => { const pa = f.geometry.getAttribute("position") as THREE.BufferAttribute; for (let v = 0; v < pa.count; v++) { const x = pa.getX(v); pa.setZ(v, Math.sin(x * 1.8 - t * 7 + i) * 0.25 * (x / 2.6)); } pa.needsUpdate = true; }));
  }

  // ── theme scenery ──
  if (def.key === "beach") {
    const waveTex = canvas(256, 256, (g) => { g.fillStyle = "#1a9fd6"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(255,255,255,${0.08 + rand() * 0.2})`; g.lineWidth = 1 + rand() * 2; const y = rand() * 256, x = rand() * 256; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 12, y - 4, x + 26, y); g.stroke(); } });
    waveTex.repeat.set(40, 40);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: waveTex, color: "#7fd4ff", roughness: 0.12, metalness: 0.35 }));
    water.position.set(cx, -1.3, cz); group.add(water);
    const foam = new THREE.Mesh(new THREE.RingGeometry(326, 340, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#e8fbff", transparent: true, opacity: 0.6 }));
    foam.position.set(cx, -1.2, cz); group.add(foam);
    animated.push((_, t) => { waveTex.offset.set(t * 0.01, t * 0.006); foam.scale.setScalar(1 + Math.sin(t * 1.2) * 0.008); (foam.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 1.2) * 0.15; });
    const palms = scatter(quality > 0 ? 170 : 90, WALL + 4, 70, (x, z) => (x - cx) ** 2 + (z - cz) ** 2 < 315 ** 2);
    for (const c of sc) if (c.kind === "off") for (let j = c.jw0 + 4; j < c.jw1 - 4; j += 9) for (const sd of [-1, 1]) { const d = c.w + 2.5 + rand() * 2; palms.push([c.P[j].x + c.R[j].x * d * sd, c.P[j].z + c.R[j].z * d * sd]); }
    const trunk = new THREE.CylinderGeometry(0.35, 0.6, 9, 7, 4); trunk.translate(0, 4.5, 0);
    { const p = trunk.getAttribute("position"); for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + (y / 9) ** 2 * 1.8); } trunk.computeVertexNormals(); }
    const scales = palms.map(() => 0.8 + rand() * 0.6), rots = palms.map(() => rand() * 6.28);
    inst(trunk, new THREE.MeshStandardMaterial({ color: "#8a6a45", roughness: 1 }), palms, (o, i) => { o.scale.setScalar(scales[i]); o.rotation.y = rots[i]; });
    const leaf = new THREE.ConeGeometry(1.1, 5.5, 4, 1); leaf.rotateZ(-Math.PI / 2 - 0.35); leaf.scale(1, 0.25, 1); leaf.translate(3.2, 0, 0);
    const parts: THREE.BufferGeometry[] = []; for (let k = 0; k < 7; k++) { const l = leaf.clone(); l.rotateY((k / 7) * Math.PI * 2); parts.push(l); }
    const leaves = mergeGeos(parts); leaves.translate(1.8, 9, 0);
    const lm = inst(leaves, new THREE.MeshStandardMaterial({ color: "#2f9a3a", roughness: 0.8, side: THREE.DoubleSide }), palms, (o, i) => { o.scale.setScalar(scales[i]); o.rotation.y = rots[i]; });
    animated.push((_, t, cam) => {
      if (quality <= 0) return;
      palms.forEach(([x, z], i) => { if ((x - cam.x) ** 2 + (z - cam.z) ** 2 > 140 ** 2) return; dummy.position.set(x, 0, z); dummy.rotation.set(Math.sin(t * 1.4 + i) * 0.04, rots[i], Math.cos(t * 1.1 + i) * 0.04); dummy.scale.setScalar(scales[i]); dummy.updateMatrix(); lm.setMatrixAt(i, dummy.matrix); });
      lm.instanceMatrix.needsUpdate = true;
    });
    const ums = scatter(40, WALL + 6, 40);
    const pole = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 5); pole.translate(0, 1.6, 0);
    inst(pole, new THREE.MeshStandardMaterial({ color: "#eee" }), ums, () => {}, false);
    const top = new THREE.ConeGeometry(1.9, 0.8, 8); top.translate(0, 3.3, 0);
    const um = inst(top, new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.6 }), ums, () => {});
    ums.forEach((_, i) => um.setColorAt(i, new THREE.Color(cols[i % cols.length])));
    const hills = scatter(14, 120, 240);
    inst(new THREE.SphereGeometry(30, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#5fae4a", roughness: 1 }), hills, (o) => o.scale.set(1 + rand(), 0.4 + rand() * 0.5, 1 + rand()), false);
    // sail boats
    const boats: { g: THREE.Group; r: number; a: number; sp: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? "#ffffff" : "#1f3a6a" })); hull.position.y = 0.3; g.add(hull);
      const sail = new THREE.Mesh(new THREE.ConeGeometry(3, 10, 3, 1, true), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide })); sail.scale.set(0.15, 1, 1); sail.position.y = 6; g.add(sail);
      group.add(g); boats.push({ g, r: 370 + rand() * 180, a: rand() * 6.28, sp: (0.008 + rand() * 0.01) * (rand() < 0.5 ? 1 : -1) });
    }
    // seagulls
    const gulls: { g: THREE.Group; w: THREE.Mesh[]; r: number; a: number; y: number; sp: number; ox: number; oz: number }[] = [];
    const gm = new THREE.MeshStandardMaterial({ color: "#f4f4f4", side: THREE.DoubleSide });
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group(), w: THREE.Mesh[] = [];
      for (const sd of [-1, 1]) { const wg = new THREE.PlaneGeometry(1.4, 0.4); wg.translate(0.7 * sd, 0, 0); const m = new THREE.Mesh(wg, gm); g.add(m); w.push(m); }
      group.add(g);
      const p = P[Math.floor(rand() * N)];
      gulls.push({ g, w, r: 15 + rand() * 40, a: rand() * 6.28, y: 18 + rand() * 22, sp: 0.3 + rand() * 0.3, ox: p.x, oz: p.z });
    }
    // hot-air balloons
    const balloons: { g: THREE.Group; y: number; ph: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group(); const [x, z] = scatter(1, 60, 160)[0] || [cx, cz];
      const env = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshStandardMaterial({ color: cols[(i + 2) % cols.length], roughness: 0.6 })); env.scale.y = 1.2; g.add(env);
      const stripe = new THREE.Mesh(new THREE.SphereGeometry(7.05, 16, 4, 0, Math.PI * 2, 1.2, 0.5), new THREE.MeshStandardMaterial({ color: "#ffffff" })); stripe.scale.y = 1.2; g.add(stripe);
      const bask = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 2), new THREE.MeshStandardMaterial({ color: "#8a5a2a" })); bask.position.y = -11; g.add(bask);
      g.position.set(x, 50 + i * 12, z); group.add(g); balloons.push({ g, y: g.position.y, ph: rand() * 6 });
    }
    // lighthouse with a rotating beam
    const lhA = rand() * 6.28, lh = new THREE.Group(); lh.position.set(cx + Math.cos(lhA) * 312, -1, cz + Math.sin(lhA) * 312); group.add(lh);
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(3.2 - k * 0.25, 3.4 - k * 0.25, 5, 16), new THREE.MeshStandardMaterial({ color: k % 2 ? "#ffffff" : "#e63946" })); s.position.y = 2.5 + k * 5; lh.add(s); }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2), toneMapped: false })); lamp.position.y = 32; lh.add(lamp);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 90, 16, 1, true).translate(0, -45, 0).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#fff6c8", transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 32; lh.add(beam);
    animated.push((dt, t) => {
      for (const b of boats) { b.a += b.sp * dt; b.g.position.set(cx + Math.cos(b.a) * b.r, -1.2 + Math.sin(t * 2 + b.r) * 0.25, cz + Math.sin(b.a) * b.r); b.g.rotation.set(Math.sin(t * 1.5 + b.r) * 0.05, -b.a + (b.sp > 0 ? 0 : Math.PI), 0); }
      for (const g of gulls) { g.a += g.sp * dt; g.g.position.set(g.ox + Math.cos(g.a) * g.r, g.y + Math.sin(t + g.r) * 2, g.oz + Math.sin(g.a) * g.r); g.g.rotation.y = -g.a; const f = Math.sin(t * 9 + g.r) * 0.5; g.w[0].rotation.z = f; g.w[1].rotation.z = -f; }
      for (const b of balloons) b.g.position.y = b.y + Math.sin(t * 0.4 + b.ph) * 3;
      beam.rotation.y = t * 0.8;
    });
  }
  if (def.key === "city") {
    const bld = scatter(quality > 0 ? 170 : 90, WALL + 8, 120);
    const nb = bld.length;
    for (const c of sc) for (let j = c.jw0 + 6; j < c.jw1 - 6; j += 13) for (const sd of [-1, 1]) bld.push([c.P[j].x + c.R[j].x * (c.w + 7) * sd, c.P[j].z + c.R[j].z * (c.w + 7) * sd]);
    const winTex = canvas(64, 128, (g) => {
      g.fillStyle = "#0b0d1a"; g.fillRect(0, 0, 64, 128);
      const cs = ["#ffcf6a", "#7de8ff", "#ff5fd2", "#fff1c9"];
      for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) if (rand() < 0.45) { g.fillStyle = cs[Math.floor(rand() * 4)]; g.fillRect(x, y, 5, 5); }
    });
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const bm = new THREE.MeshStandardMaterial({ color: "#1a1c2c", roughness: 0.6, metalness: 0.4, emissive: "#ffffff", emissiveMap: winTex, emissiveIntensity: 0.8 });
    inst(box, bm, bld, (o, i) => { const w = i >= nb ? 8 : 10 + rand() * 16; o.scale.set(w, 18 + rand() * 70, w); });
    const signs = scatter(60, WALL + 4, 30);
    const sg = new THREE.PlaneGeometry(6, 1.6); sg.translate(0, 7, 0);
    const sI = inst(sg, new THREE.MeshBasicMaterial({ color: "#fff", toneMapped: false, side: THREE.DoubleSide }), signs, () => {}, false);
    signs.forEach((_, i) => sI.setColorAt(i, new THREE.Color(neonCols[i % 5]).multiplyScalar(2.2)));
    const post = new THREE.CylinderGeometry(0.15, 0.15, 6, 5); post.translate(0, 3, 0);
    inst(post, new THREE.MeshStandardMaterial({ color: "#333648", metalness: 0.7, roughness: 0.4 }), signs, () => {}, false);
    const lamps: [number, number][] = [], lampY: number[] = [];
    for (let i = 0; i < N; i += 45) for (const sd of [-1, 1]) { if (gap[sd < 0 ? 0 : 1][i]) continue; lamps.push([P[i].x + R[i].x * (WALL + 2) * sd, P[i].z + R[i].z * (WALL + 2) * sd]); lampY.push(P[i].y); }
    const lp = new THREE.CylinderGeometry(0.12, 0.18, 9, 5); lp.translate(0, 4.5, 0);
    inst(lp, new THREE.MeshStandardMaterial({ color: "#2a2d3e", metalness: 0.8 }), lamps, (o, i) => { o.position.y = lampY[i]; }, false);
    const bulb = new THREE.SphereGeometry(0.45, 8, 6); bulb.translate(0, 9, 0);
    inst(bulb, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 2), toneMapped: false }), lamps, (o, i) => { o.position.y = lampY[i]; }, false);
    // giant animated screens
    const screens: { tex: THREE.CanvasTexture; g: CanvasRenderingContext2D; hue: number; t: number }[] = [];
    for (const [x, z] of scatter(5, WALL + 25, 60)) {
      const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d")!;
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(32, 16), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color(1.6, 1.6, 1.6) }));
      let bi = 0, bd = Infinity; for (let i = 0; i < N; i += 5) { const d = (P[i].x - x) ** 2 + (P[i].z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
      m.position.set(x, 26, z); m.lookAt(P[bi].x, 22, P[bi].z); group.add(m);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(33, 17, 0.8), new THREE.MeshStandardMaterial({ color: "#111" })); fr.position.copy(m.position); fr.quaternion.copy(m.quaternion); fr.translateZ(-0.5); group.add(fr);
      screens.push({ tex, g, hue: rand() * 360, t: 0 });
    }
    // sweeping search lights
    const beams: THREE.Mesh[] = [];
    for (const [x, z] of scatter(8, 40, 140)) {
      const b = new THREE.Mesh(new THREE.ConeGeometry(7, 160, 16, 1, true).translate(0, 80, 0), new THREE.MeshBasicMaterial({ color: ["#7de8ff", "#ff5fd2", "#fff1c9"][beams.length % 3], transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      b.position.set(x, 0, z); group.add(b); beams.push(b);
    }
    // blimp
    const blimp = new THREE.Group();
    const bb = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), new THREE.MeshStandardMaterial({ color: "#c8cbd8", metalness: 0.5, roughness: 0.35 })); bb.scale.set(1, 1, 2.6); blimp.add(bb);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(10.1, 10.1, 4, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.4, 2.2), toneMapped: false })); band.rotation.x = Math.PI / 2; band.scale.set(1, 3.5, 1); blimp.add(band);
    group.add(blimp);
    // hover traffic in the distance
    const cars: { m: THREE.Mesh; r: number; a: number; y: number; sp: number }[] = [];
    for (let i = 0; i < 36; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 3.2), new THREE.MeshBasicMaterial({ color: i % 2 ? new THREE.Color(3, 0.6, 0.4) : new THREE.Color(2.6, 2.6, 3), toneMapped: false })); group.add(m); cars.push({ m, r: ext + 60 + (i % 4) * 25, a: rand() * 6.28, y: 30 + (i % 4) * 12, sp: (0.05 + rand() * 0.04) * (i % 2 ? 1 : -1) }); }
    let fwT = 1;
    animated.push((dt, t) => {
      beams.forEach((b, i) => b.rotation.set(Math.sin(t * 0.5 + i) * 0.45, 0, Math.cos(t * 0.37 + i * 2) * 0.45));
      blimp.position.set(cx + Math.cos(t * 0.05) * (ext + 20), 85, cz + Math.sin(t * 0.05) * (ext + 20)); blimp.rotation.y = -t * 0.05 + Math.PI;
      for (const c of cars) { c.a += c.sp * dt; c.m.position.set(cx + Math.cos(c.a) * c.r, c.y, cz + Math.sin(c.a) * c.r); c.m.rotation.y = -c.a; }
      for (const s of screens) {
        s.t -= dt; if (s.t > 0) continue; s.t = 1 / 20;
        s.hue = (s.hue + 2) % 360; const g = s.g;
        const gr = g.createLinearGradient(0, 0, 256, 128); gr.addColorStop(0, `hsl(${s.hue},90%,45%)`); gr.addColorStop(1, `hsl(${(s.hue + 80) % 360},90%,30%)`); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
        g.font = "italic 900 46px Arial Black, Arial"; g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText("CART RACE • NEON CITY •", 256 - ((t * 90) % 620), 64);
        s.tex.needsUpdate = true;
      }
      fwT -= dt;
      if (fwT <= 0) {
        fwT = 0.8 + rand() * 1.8;
        const a = rand() * 6.28, r = 60 + rand() * 160, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = 55 + rand() * 40;
        const col = neonCols[Math.floor(rand() * neonCols.length)];
        for (let k = 0; k < 60; k++) fx.big(x, y, z, col, 1.2 + rand() * 0.8, 8, 2);
        fx.boom(0.1, new THREE.Vector3(x, y, z));
      }
    });
  }

  if (def.key === "volcano") {
    const rocks = scatter(quality > 0 ? 170 : 90, WALL + 4, 90);
    for (const c of sc) for (let j = c.jw0 + 3; j < c.jw1 - 3; j += 6) for (const sd of [-1, 1]) { const d = c.w + 2.4 + rand() * 2; rocks.push([c.P[j].x + c.R[j].x * d * sd, c.P[j].z + c.R[j].z * d * sd]); }
    inst(new THREE.DodecahedronGeometry(3, 0), new THREE.MeshStandardMaterial({ color: "#3a2a24", roughness: 1, flatShading: true }), rocks, (o) => { o.scale.set(0.6 + rand() * 2, 0.5 + rand() * 2.2, 0.6 + rand() * 2); o.position.y = -0.5; });
    const pil: [number, number][] = [], pilY: number[] = [];
    for (let i = 0; i < N; i += 30) if (P[i].y > 3) for (const sd of [-1, 1]) { pil.push([P[i].x + R[i].x * (WALL - 1) * sd, P[i].z + R[i].z * (WALL - 1) * sd]); pilY.push(P[i].y); }
    const pg = new THREE.CylinderGeometry(1.4, 2, 1, 8); pg.translate(0, -0.5, 0);
    inst(pg, new THREE.MeshStandardMaterial({ color: "#2a1d1a", roughness: 1, emissive: "#3a0800" }), pil, (o, i) => { o.position.y = pilY[i]; o.scale.set(1, pilY[i] + 3, 1); });
    const lava = lavaTex(rand); lava.repeat.set(30, 30);
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: lava, color: new THREE.Color(1.6, 1.1, 0.9), toneMapped: false }));
    lm.position.set(cx, -2.2, cz); group.add(lm);
    animated.push((_, t) => lava.offset.set(t * 0.004, t * 0.002));
    const eN = 500, eg = new THREE.BufferGeometry(), ep = new Float32Array(eN * 3);
    for (let i = 0; i < eN; i++) { ep[i * 3] = cx + (rand() - 0.5) * 600; ep[i * 3 + 1] = rand() * 90; ep[i * 3 + 2] = cz + (rand() - 0.5) * 600; }
    eg.setAttribute("position", new THREE.BufferAttribute(ep, 3));
    group.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: new THREE.Color(3, 1.2, 0.3), size: 0.6, toneMapped: false, transparent: true, opacity: 0.8 })));
    animated.push((dt) => { const a = eg.getAttribute("position") as THREE.BufferAttribute; for (let i = 0; i < eN; i++) { let y = a.getY(i) + dt * 7; if (y > 90) y = 0; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(y * 0.1 + i) * dt); } a.needsUpdate = true; });
    if (crater) buildVolcano(crater);
  }

  /** The volcano: a mountain ring with tunnels through its flanks, a crater with a lava lake, lava falls and eruptions. */
  function buildVolcano(cr: CraterDef) {
    const TH = 11.5, TW = WALL + 1.4;
    const prof = (r: number) => {
      if (r < cr.rin - 6) return -6;
      if (r < cr.rin) return -6 + ((r - cr.rin + 6) / 6) * 8;
      if (r < cr.rpk) { const u = (r - cr.rin) / (cr.rpk - cr.rin); return 2 + (cr.h - 2) * Math.pow(Math.sin((u * Math.PI) / 2), 1.6); }
      if (r < cr.rout) { const u = (r - cr.rpk) / (cr.rout - cr.rpk); return -1 + (cr.h + 1) * (0.5 + 0.5 * Math.cos(u * Math.PI)); }
      return -1;
    };
    const nz = (x: number, z: number) => Math.sin(x * 0.11) * Math.cos(z * 0.13) * 2.2 + Math.sin(x * 0.27 + z * 0.19) * 1.2 + Math.sin(x * 0.05 - z * 0.07) * 3;
    const hAt = (x: number, z: number) => { const r = Math.hypot(x - cr.x, z - cr.z), b = prof(r); return r > cr.rin && r < cr.rout ? b + nz(x, z) * Math.min(1, (b + 1) / 12) : b; };
    const idx: number[] = []; for (let i = 0; i < N; i++) if (Math.hypot(P[i].x - cr.x, P[i].z - cr.z) < cr.rout + 30) idx.push(i);
    const nearest = (x: number, z: number) => { let bd = Infinity, bi = idx[0]; for (const i of idx) { const d = (P[i].x - x) ** 2 + (P[i].z - z) ** 2; if (d < bd) { bd = d; bi = i; } } return { d: Math.sqrt(bd), i: bi }; };
    // heightfield mountain
    const S = cr.rout + 12, step = quality > 0 ? 2.5 : 3.5, n = Math.ceil((2 * S) / step) + 1;
    const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
    const c1 = new THREE.Color("#2a1b17"), c2 = new THREE.Color("#5a3a2c"), c3 = new THREE.Color("#120a08"), cc = new THREE.Color();
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      const k = a * n + b, x = cr.x - S + b * step, z = cr.z - S + a * step, y = hAt(x, z), r = Math.hypot(x - cr.x, z - cr.z);
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = b / (n - 1); uv[k * 2 + 1] = a / (n - 1);
      cc.copy(c1).lerp(c2, Math.max(0, Math.min(1, nz(x * 2, z * 2) * 0.2 + 0.5))); if (r < cr.rpk) cc.lerp(c3, 0.5);
      col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b;
    }
    const tri: number[] = [];
    for (let a = 0; a < n - 1; a++) for (let b = 0; b < n - 1; b++) {
      const k = a * n + b, q = [k, k + n, k + 1, k + 1, k + n, k + n + 1];
      for (let t = 0; t < 6; t += 3) {
        const v = [q[t], q[t + 1], q[t + 2]];
        const mx = (pos[v[0] * 3] + pos[v[1] * 3] + pos[v[2] * 3]) / 3, mz = (pos[v[0] * 3 + 2] + pos[v[1] * 3 + 2] + pos[v[2] * 3 + 2]) / 3;
        const my = Math.min(pos[v[0] * 3 + 1], pos[v[1] * 3 + 1], pos[v[2] * 3 + 1]);
        const r = Math.hypot(mx - cr.x, mz - cr.z);
        if (r > cr.rout + 8 || r < cr.rin - 2) continue;
        const nr = nearest(mx, mz);
        if (nr.d < TW + 1.5 && my < P[nr.i].y + TH + 1.2) continue; // carve the road corridor
        tri.push(...v);
      }
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); hg.setAttribute("color", new THREE.BufferAttribute(col, 3)); hg.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); hg.setIndex(tri);
    hg.computeVertexNormals();
    // glowing lava rivers running down the flanks (painted top-down)
    const riv = canvas(1024, 1024, (g) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024);
      const px = (r: number) => (r / (2 * S)) * 1024;
      for (let k = 0; k < 9; k++) {
        let a = (k / 9) * Math.PI * 2 + rand() * 0.3, r = cr.rpk - 2;
        g.lineCap = "round"; g.strokeStyle = k % 2 ? "#ff7a1a" : "#ffb030"; g.lineWidth = 6 + rand() * 6;
        g.beginPath(); g.moveTo(512 + Math.cos(a) * px(r), 512 + Math.sin(a) * px(r));
        while (r < cr.rout - 4) { r += 3; a += (rand() - 0.5) * 0.06; g.lineTo(512 + Math.cos(a) * px(r), 512 + Math.sin(a) * px(r)); }
        g.stroke();
      }
      g.strokeStyle = "#ff5a10"; g.lineWidth = 10; g.beginPath(); g.arc(512, 512, px(cr.rin + 1), 0, 7); g.stroke();
    }, false);
    const mountain = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, emissive: "#ffffff", emissiveMap: riv, emissiveIntensity: 1.6 }));
    mountain.receiveShadow = true; mountain.castShadow = quality > 0; group.add(mountain);

    // tunnels: where the mountain is higher than the road, wrap the road in a rock arch
    const arch: [number, number][] = [[-TW, -0.3], [-TW, 5]];
    for (let k = 1; k < 12; k++) { const a = Math.PI - (k / 12) * Math.PI; arch.push([Math.cos(a) * TW, 5 + Math.sin(a) * (TH - 5)]); }
    arch.push([TW, 5], [TW, -0.3]);
    const segs: [number, number][] = [];
    let s0 = -1;
    for (let q = 0; q < idx.length; q++) {
      const i = idx[q], inT = prof(Math.hypot(P[i].x - cr.x, P[i].z - cr.z)) > P[i].y + TH - 3;
      if (inT && s0 < 0) s0 = q;
      if (!inT && s0 >= 0) { segs.push([idx[Math.max(0, s0 - 3)], idx[Math.min(idx.length - 1, q + 2)]]); s0 = -1; }
    }
    if (s0 >= 0) segs.push([idx[Math.max(0, s0 - 3)], idx[idx.length - 1]]);
    const crackTex = canvas(256, 256, (g) => noise(g, 256, 256, "#1c1210", ["#2a1c18", "#0e0807", "#3a2620"], 4000, 4, rand));
    crackTex.repeat.set(6, 3);
    const crackE = canvas(256, 256, (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#ff6a10"; g.lineCap = "round"; for (let k = 0; k < 14; k++) { g.lineWidth = 1 + rand() * 3; let x = rand() * 256, y = rand() * 256; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 8; s++) { x += (rand() - 0.5) * 50; y += rand() * 30; g.lineTo(x, y); } g.stroke(); } });
    crackE.repeat.set(6, 3);
    const tunMat = new THREE.MeshStandardMaterial({ map: crackTex, emissiveMap: crackE, emissive: "#ffffff", emissiveIntensity: 1.4, roughness: 0.95, side: THREE.DoubleSide });
    const portalMat = new THREE.MeshStandardMaterial({ color: "#1a1210", roughness: 0.7, metalness: 0.3, flatShading: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.9, 0.2), toneMapped: false });
    for (const [i0, i1] of segs) {
      const pts: number[] = [], uvs: number[] = [], ind: number[] = [];
      const cnt = ((i1 - i0 + N) % N) + 1, K = arch.length;
      let d = 0;
      for (let q = 0; q < cnt; q++) {
        const i = (i0 + q) % N, p = P[i], r = R[i];
        if (q > 0) d += P[(i - 1 + N) % N].distanceTo(p);
        arch.forEach(([x, y], k) => { pts.push(p.x + r.x * x, p.y + y, p.z + r.z * x); uvs.push(k / (K - 1), d / 20); });
        if (q < cnt - 1) for (let k = 0; k < K - 1; k++) { const o = q * K + k; ind.push(o, o + K, o + 1, o + 1, o + K, o + K + 1); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(ind); g.computeVertexNormals();
      const tm = new THREE.Mesh(g, tunMat); tm.receiveShadow = true; group.add(tm);
      for (let q = 6; q < cnt - 4; q += 12) { const i = (i0 + q) % N, p = P[i]; const l = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 1.2), glowMat); l.position.set(p.x, p.y + TH - 0.4, p.z); l.rotation.y = Math.atan2(T[i].x, T[i].z); group.add(l); }
      const mid = P[(i0 + Math.floor(cnt / 2)) % N]; const pl = new THREE.PointLight("#ff6a20", 35, 60, 1.2); pl.position.set(mid.x, mid.y + TH - 2, mid.z); group.add(pl);
      // portal arches at both ends
      for (const [i, dir] of [[i0, 1], [i1, -1]] as const) {
        const O = 3.5, sh = new THREE.Shape();
        sh.moveTo(-TW - O, -0.3); sh.lineTo(-TW - O, 5);
        for (let k = 1; k < 16; k++) { const a = Math.PI - (k / 16) * Math.PI; sh.lineTo(Math.cos(a) * (TW + O), 5 + Math.sin(a) * (TH - 5 + O)); }
        sh.lineTo(TW + O, 5); sh.lineTo(TW + O, -0.3); sh.lineTo(TW, -0.3); sh.lineTo(TW, 5);
        for (let k = 15; k >= 1; k--) { const a = Math.PI - (k / 16) * Math.PI; sh.lineTo(Math.cos(a) * TW, 5 + Math.sin(a) * (TH - 5)); }
        sh.lineTo(-TW, 5); sh.lineTo(-TW, -0.3); sh.closePath();
        const pm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: false }), portalMat), p = P[i];
        const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(R[i].x * dir, 0, R[i].z * dir), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-T[i].x * dir, 0, -T[i].z * dir));
        pm.quaternion.setFromRotationMatrix(basis); pm.position.set(p.x, p.y, p.z); pm.castShadow = quality > 0; group.add(pm);
        const curve = new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, k) => { const a = Math.PI - (k / 16) * Math.PI; const x = Math.cos(a) * (TW + 0.6), y = k === 0 || k === 16 ? -0.3 : 5 + Math.sin(a) * (TH - 5 + 0.6); return new THREE.Vector3(p.x + R[i].x * x, p.y + y, p.z + R[i].z * x); }));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.35, 6), glowMat));
      }
    }

    // lava lake inside the crater
    const lakeY = 0;
    const lt = lavaTex(rand); lt.repeat.set(5, 5);
    const lake = new THREE.Mesh(new THREE.CircleGeometry(cr.rin + 2, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: lt, color: new THREE.Color(1.5, 1.0, 0.8), toneMapped: false }));
    lake.position.set(cr.x, lakeY, cr.z); group.add(lake);
    const lakeLight = new THREE.PointLight("#ff5a10", 90, 150, 1.1); lakeLight.position.set(cr.x, lakeY + 18, cr.z); group.add(lakeLight);
    // lava falls down the inner crater wall (on both sides of the bridge)
    const fallTex = canvas(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,80,0,0)"); gr.addColorStop(0.2, "#ff6a10"); gr.addColorStop(0.5, "#ffd04a"); gr.addColorStop(0.8, "#ff6a10"); gr.addColorStop(1, "rgba(255,80,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(120,20,0,${0.3 + rand() * 0.4})`; g.fillRect(rand() * 64, rand() * 256, 3 + rand() * 8, 6 + rand() * 20); } });
    fallTex.wrapT = THREE.RepeatWrapping;
    const fallMat = new THREE.MeshBasicMaterial({ map: fallTex, color: new THREE.Color(1.5, 1.0, 0.8), toneMapped: false, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const mi = idx[Math.floor(idx.length / 2)], roadDir = Math.atan2(T[mi].x, T[mi].z);
    const falls: THREE.Vector3[] = [];
    for (let k = 0; k < 8; k++) {
      const a = roadDir + (k < 4 ? Math.PI / 2 : -Math.PI / 2) + ((k % 4) - 1.5) * 0.38;
      const rt = cr.rpk - 4, tx = cr.x + Math.sin(a) * rt, tz = cr.z + Math.cos(a) * rt;
      const top = new THREE.Vector3(tx, hAt(tx, tz) - 1, tz);
      const bot = new THREE.Vector3(cr.x + Math.sin(a) * (cr.rin - 1), lakeY, cr.z + Math.cos(a) * (cr.rin - 1));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(5 + rand() * 4, top.distanceTo(bot)), fallMat);
      m.position.copy(top).lerp(bot, 0.5); m.position.x -= Math.sin(a) * 0.8; m.position.z -= Math.cos(a) * 0.8;
      m.lookAt(cr.x, m.position.y, cr.z); m.rotateX(-Math.atan2(rt - cr.rin + 1, top.y - bot.y));
      group.add(m); falls.push(bot);
    }
    // smoke column
    const smokeTex = soft(80, 70, 66);
    const smoke: { s: THREE.Sprite; v: number; life: number }[] = [];
    for (let k = 0; k < 26; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.5 })); group.add(s); smoke.push({ s, v: 3 + rand() * 4, life: rand() * 30 }); }
    // lava bombs
    const bombs: { m: THREE.Mesh; v: THREE.Vector3; on: boolean }[] = [];
    const bombMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, 0.4), toneMapped: false });
    for (let k = 0; k < 24; k++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), bombMat); m.visible = false; group.add(m); bombs.push({ m, v: new THREE.Vector3(), on: false }); }
    let eruptT = 3;
    const C3 = new THREE.Vector3(cr.x, lakeY, cr.z);
    animated.push((dt, t, cam) => {
      lt.offset.set(Math.sin(t * 0.1) * 0.2, t * 0.02); fallTex.offset.y = -t * 0.6;
      lakeLight.intensity = 85 + Math.sin(t * 3) * 14 + Math.sin(t * 7.3) * 8;
      for (const s of smoke) {
        s.life += dt; const k = (s.life % 30) / 30;
        s.s.position.set(cr.x + Math.sin(s.v * 13 + k * 4) * (6 + k * 30), lakeY + 10 + k * 150, cr.z + Math.cos(s.v * 7 + k * 3) * (6 + k * 30));
        s.s.scale.setScalar(18 + k * 70); s.s.material.opacity = 0.55 * (1 - k) * Math.min(1, k * 8);
      }
      if (cam.distanceToSquared(C3) > 400 ** 2) return;
      if (rand() < 0.5) { const a = rand() * 6.28, r = rand() * cr.rin; fx.big(cr.x + Math.cos(a) * r, lakeY + 0.3, cr.z + Math.sin(a) * r, "#ff8a20", 0.9, 1.5, 3); }
      for (const f of falls) if (rand() < 0.25) fx.emit(f.x, f.y + 0.5, f.z, "#ffb040", 0.6, 3, 3);
      eruptT -= dt;
      if (eruptT <= 0) {
        eruptT = 3 + rand() * 4;
        for (const b of bombs) if (!b.on && rand() < 0.4) { b.on = true; b.m.visible = true; b.m.position.set(cr.x + (rand() - 0.5) * 20, lakeY + 1, cr.z + (rand() - 0.5) * 20); const a = rand() * 6.28, h = 8 + rand() * 18; b.v.set(Math.cos(a) * h, 28 + rand() * 18, Math.sin(a) * h); }
        for (let k = 0; k < 40; k++) fx.big(cr.x + (rand() - 0.5) * 16, lakeY + 1, cr.z + (rand() - 0.5) * 16, k % 2 ? "#ffd04a" : "#ff5a10", 1.2, 6, 10);
        fx.boom(0.6, C3); fx.shake(0.35, C3);
      }
      for (const b of bombs) if (b.on) {
        b.v.y -= 22 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt * 4;
        if (rand() < 0.7) fx.big(b.m.position.x, b.m.position.y, b.m.position.z, "#ff7a1a", 0.7, 0.6);
        const gy = Math.hypot(b.m.position.x - cr.x, b.m.position.z - cr.z) < cr.rin ? lakeY : hAt(b.m.position.x, b.m.position.z);
        if (b.m.position.y < gy && b.v.y < 0) { b.on = false; b.m.visible = false; for (let k = 0; k < 12; k++) fx.big(b.m.position.x, gy + 0.5, b.m.position.z, "#ffb040", 0.8, 4, 4); }
      }
    });
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
      g.font = "italic 900 44px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.strokeStyle = "#5a0f2a"; g.lineWidth = 6; g.strokeText("CART RACE", 256, 34); g.fillText("CART RACE", 256, 34);
    }, false);
    const bm = new THREE.MeshStandardMaterial({ map: ban, emissive: "#ffffff", emissiveMap: ban, emissiveIntensity: def.key === "beach" ? 0.1 : 0.7, side: THREE.DoubleSide });
    const b = new THREE.Mesh(new THREE.BoxGeometry((RW + 2) * 2 + 1.2, 2.6, 0.5), [pm, pm, pm, pm, bm, bm]);
    b.position.set(p.x, p.y + 9, p.z); b.rotation.y = yaw; b.castShadow = true; group.add(b);
    const bulbs: THREE.Mesh[] = [];
    for (let k = 0; k < 14; k++) { const x = -RW - 1 + (k / 13) * (2 * RW + 2); const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), new THREE.MeshBasicMaterial({ color: "#fff", toneMapped: false })); m.position.set(p.x + r.x * x, p.y + 7.5, p.z + r.z * x); group.add(m); bulbs.push(m); }
    animated.push((_, tt) => bulbs.forEach((m, k) => { const on = (Math.floor(tt * 8) + k) % 3 === 0; (m.material as THREE.MeshBasicMaterial).color.setRGB(on ? 3 : 0.4, on ? 2.6 : 0.3, on ? 0.6 : 0.2); }));
  }

  // ── boost pads ──
  const padTex = canvas(64, 128, (g) => {
    g.fillStyle = "#1a0f00"; g.fillRect(0, 0, 64, 128);
    for (let k = 0; k < 3; k++) { g.strokeStyle = "#ffcc33"; g.lineWidth = 10; g.beginPath(); g.moveTo(8, 50 + k * 30); g.lineTo(32, 20 + k * 30); g.lineTo(56, 50 + k * 30); g.stroke(); }
  }, false);
  padTex.wrapT = THREE.RepeatWrapping;
  const padMat = new THREE.MeshBasicMaterial({ map: padTex, color: new THREE.Color(2.4, 1.6, 0.6), toneMapped: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -4 });
  const addPad = (p: THREE.Vector3, t: THREE.Vector3) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 6).rotateX(-Math.PI / 2), padMat); m.position.set(p.x, p.y + 0.07, p.z); m.rotation.y = Math.atan2(t.x, t.z) + Math.PI; group.add(m); };
  const pads: Track["pads"] = def.pads.map(([f, s]) => {
    const i = Math.floor(f * N), p = P[i], r = R[i];
    const pp = new THREE.Vector3(p.x + r.x * s, p.y, p.z + r.z * s); addPad(pp, T[i]);
    return { i, s, sc: -1, p: pp };
  });
  for (const sp of scPads) { addPad(sp.p, sc[sp.sc].T[sp.i]); pads.push(sp); }
  animated.push((_, t) => { padTex.offset.y = -t * 1.5; });

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
      const mat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.78, iridescence: 1, iridescenceIOR: 1.8, emissive: "#ff66cc", emissiveIntensity: 0.6, flatShading: true });
      boxMats.push(mat);
      const outer = new THREE.Mesh(boxGeo, mat); outer.castShadow = true;
      const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), toneMapped: false }));
      g.add(outer, inner); group.add(g);
      boxes.push({ p: g.position.clone(), i, t: 0, mesh: g });
    }
  }
  const tmpC = new THREE.Color(), white = new THREE.Color(1, 1, 1);
  animated.push((_, t) => {
    boxMats.forEach((m, k) => { tmpC.setHSL((t * 0.25 + k * 0.07) % 1, 1, 0.55); m.emissive.copy(tmpC); m.color.copy(tmpC).lerp(white, 0.6); });
    for (const b of boxes) { b.mesh.rotation.set(t * 0.9, t * 1.3, 0); b.mesh.position.y = b.p.y + Math.sin(t * 2 + b.i) * 0.25; }
  });

  return {
    def, P, T, R, len, seg, sc, boxes, pads, ramps, group, bounds: { minX, maxX, minZ, maxZ },
    update(dt, t, cam) {
      for (const f of animated) f(dt, t, cam);
      for (const b of boxes) {
        if (b.t > 0) { b.t -= dt; b.mesh.visible = false; if (b.t <= 0) { b.mesh.visible = true; b.mesh.scale.setScalar(0.05); } }
        else if (b.mesh.scale.x < 1) b.mesh.scale.setScalar(Math.min(1, b.mesh.scale.x + dt * 2.5));
      }
    },
  };
}
const neonCols = ["#ff2bd6", "#00e5ff", "#ffe600", "#7dff4a", "#ff5a2b", "#ffffff"];

function lavaTex(rand: () => number) {
  return canvas(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 180); gr.addColorStop(0, "#ffd04a"); gr.addColorStop(0.5, "#ff6a10"); gr.addColorStop(1, "#9a1a05"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,10,0,${0.2 + rand() * 0.5})`; g.beginPath(); g.arc(rand() * 256, rand() * 256, 2 + rand() * 12, 0, 7); g.fill(); } });
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
