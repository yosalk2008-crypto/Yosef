import * as THREE from "three";

export type CarKind = "civ" | "cop" | "parked" | "player" | "wreck";
export type Phys = { accel: number; brake: number; rev: number; vmax: number; turn: number; grip: number; drift: number; drag: number; roll: number };
export type Car = {
  id: number; mesh: THREE.Group; wheels: THREE.Object3D[]; front: THREE.Object3D[]; lightbar: THREE.Mesh[]; brake: THREE.MeshStandardMaterial | null; paint: THREE.MeshPhysicalMaterial;
  x: number; z: number; a: number; vx: number; vz: number; slip: number; spin: number;
  kind: CarKind; model: number; driver: boolean; hp: number; dead: boolean; burnT: number;
  ph: Phys; inp: { th: number; st: number; hb: boolean };
  ai: { from: number; to: number; panic: number }; stuck: number; rev: number; revSt: number; block: number; ignore: number;
  path: number[]; pathT: number; fireT: number; lock: number; len: number; owned?: string;
};

export const PHYS = {
  player: { accel: 12, brake: 26, rev: 9, vmax: 47, turn: 2.3, grip: 7.5, drift: 1.2, drag: 0.06, roll: 2.2 },
  civ: { accel: 6, brake: 18, rev: 5, vmax: 22, turn: 1.9, grip: 10, drift: 10, drag: 0.06, roll: 3 },
  cop: { accel: 13, brake: 26, rev: 8, vmax: 44, turn: 2.3, grip: 8, drift: 2, drag: 0.06, roll: 2.2 },
} satisfies Record<string, Phys>;

export const PAINTS = ["#b3122e", "#f4f4f2", "#101216", "#1f4fd1", "#e8c547", "#23a7a0", "#ff7a3d", "#7a7f88", "#6a2bd1", "#ff4f9a", "#2f6f3b", "#c9c2b0"];

let seq = 1;
const glass = new THREE.MeshPhysicalMaterial({ color: "#0a1016", roughness: 0.03, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02 });
const tyre = new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.92 });
const rimMat = new THREE.MeshStandardMaterial({ color: "#d4d8de", roughness: 0.22, metalness: 0.95 });
const rimDark = new THREE.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.3, metalness: 0.9 });
const chrome = new THREE.MeshStandardMaterial({ color: "#e1e5ea", roughness: 0.1, metalness: 1 });
const black = new THREE.MeshStandardMaterial({ color: "#0e0f12", roughness: 0.55, metalness: 0.2 });
const trim = new THREE.MeshStandardMaterial({ color: "#16181c", roughness: 0.35, metalness: 0.4 });
const caliper = new THREE.MeshStandardMaterial({ color: "#c8102e", roughness: 0.4, metalness: 0.3 });
const plateMat = new THREE.MeshStandardMaterial({ color: "#f1f1ea", roughness: 0.5 });
export const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.15, 1.05), toneMapped: false });
const drlMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 2.0), toneMapped: false });

// Car shapes as smooth lofts. t runs from the rear (0) to the nose (1).
type Model = { L: number; W: number; R: number; axles: [number, number]; y0: number; ends: [number, number][]; y1: [number, number][]; cab: [number, number][]; roof: [number, number]; sport: boolean; wing?: boolean };
const MODELS: Model[] = [
  // low sports coupé
  { L: 4.55, W: 1.96, R: 0.35, axles: [0.2, 0.79], y0: 0.2, ends: [[0, 0.44], [0.05, 0.22], [0.95, 0.21], [1, 0.36]], y1: [[0, 0.8], [0.06, 0.88], [0.24, 0.91], [0.6, 0.84], [0.88, 0.73], [0.97, 0.63], [1, 0.55]], cab: [[0.13, 0], [0.25, 1.16], [0.42, 1.23], [0.5, 1.21], [0.64, 0]], roof: [0.28, 0.5], sport: true },
  // sedan
  { L: 4.85, W: 1.87, R: 0.34, axles: [0.2, 0.8], y0: 0.24, ends: [[0, 0.46], [0.05, 0.26], [0.95, 0.26], [1, 0.42]], y1: [[0, 0.93], [0.07, 1.0], [0.25, 1.02], [0.62, 0.98], [0.88, 0.91], [0.97, 0.81], [1, 0.71]], cab: [[0.14, 0], [0.27, 1.42], [0.37, 1.48], [0.57, 1.47], [0.68, 0]], roof: [0.3, 0.6], sport: false },
  // SUV
  { L: 4.8, W: 1.99, R: 0.41, axles: [0.19, 0.8], y0: 0.4, ends: [[0, 0.58], [0.04, 0.42], [0.96, 0.42], [1, 0.58]], y1: [[0, 1.08], [0.06, 1.15], [0.6, 1.15], [0.86, 1.11], [0.97, 1.01], [1, 0.9]], cab: [[0.035, 0], [0.07, 1.8], [0.6, 1.82], [0.72, 0]], roof: [0.08, 0.62], sport: false },
  // grand tourer
  { L: 4.75, W: 1.95, R: 0.36, axles: [0.19, 0.8], y0: 0.21, ends: [[0, 0.45], [0.05, 0.23], [0.95, 0.22], [1, 0.38]], y1: [[0, 0.86], [0.08, 0.93], [0.3, 0.95], [0.62, 0.9], [0.9, 0.79], [0.98, 0.68], [1, 0.6]], cab: [[0.16, 0], [0.3, 1.3], [0.46, 1.33], [0.55, 1.3], [0.67, 0]], roof: [0.32, 0.55], sport: true },
  // 4 wedge supercar (V12, big wing)
  { L: 4.95, W: 2.1, R: 0.37, axles: [0.2, 0.76], y0: 0.17, ends: [[0, 0.4], [0.05, 0.2], [0.95, 0.17], [1, 0.28]], y1: [[0, 0.86], [0.1, 0.92], [0.3, 0.9], [0.55, 0.8], [0.85, 0.6], [0.96, 0.45], [1, 0.38]], cab: [[0.3, 0], [0.45, 1.1], [0.55, 1.12], [0.62, 1.05], [0.82, 0]], roof: [0.46, 0.6], sport: true, wing: true },
  // 5 super SUV
  { L: 5.1, W: 2.02, R: 0.43, axles: [0.19, 0.8], y0: 0.38, ends: [[0, 0.6], [0.04, 0.4], [0.96, 0.4], [1, 0.55]], y1: [[0, 1.02], [0.07, 1.1], [0.55, 1.08], [0.85, 1.0], [0.97, 0.86], [1, 0.76]], cab: [[0.08, 0], [0.24, 1.6], [0.5, 1.64], [0.6, 1.6], [0.72, 0]], roof: [0.25, 0.58], sport: true },
  // 6 performance wagon
  { L: 4.99, W: 1.95, R: 0.37, axles: [0.18, 0.8], y0: 0.24, ends: [[0, 0.46], [0.05, 0.26], [0.95, 0.26], [1, 0.42]], y1: [[0, 0.95], [0.06, 1.02], [0.3, 1.03], [0.62, 0.99], [0.88, 0.9], [0.97, 0.8], [1, 0.7]], cab: [[0.04, 0], [0.09, 1.42], [0.55, 1.46], [0.68, 0]], roof: [0.09, 0.55], sport: true },
  // 7 mid-engine berlinetta
  { L: 4.6, W: 1.98, R: 0.36, axles: [0.2, 0.78], y0: 0.17, ends: [[0, 0.42], [0.05, 0.2], [0.95, 0.18], [1, 0.3]], y1: [[0, 0.9], [0.08, 0.96], [0.25, 0.95], [0.4, 0.88], [0.6, 0.78], [0.85, 0.66], [0.97, 0.5], [1, 0.4]], cab: [[0.3, 0], [0.42, 1.12], [0.52, 1.14], [0.6, 1.08], [0.78, 0]], roof: [0.43, 0.57], sport: true },
];

/** Dealer catalogue. Brand and model names are made up (parodies), so no real trademarks are used. */
export type Spec = { id: string; name: string; tier: number; price: number; model: number; color: string; v: number; a: number };
export const TIERS = [
  { de: "Einsteiger", en: "Entry" }, { de: "RS-Klasse", en: "RS class" }, { de: "Stellar Performance", en: "Stellar Performance" },
  { de: "Competition", en: "Competition" }, { de: "Toro", en: "Toro" }, { de: "Vettora", en: "Vettora" },
];
export const CATALOG: Spec[] = [
  { id: "qa3", name: "Quattra A3 Sportback", tier: 0, price: 150, model: 1, color: "#9aa3ad", v: 0.85, a: 0.85 },
  { id: "qa5", name: "Quattra A5 Coupé", tier: 0, price: 230, model: 3, color: "#1d3557", v: 0.9, a: 0.9 },
  { id: "qa6", name: "Quattra A6", tier: 0, price: 320, model: 1, color: "#2b2d31", v: 0.93, a: 0.92 },
  { id: "rs3", name: "Quattra RS 3", tier: 1, price: 600, model: 1, color: "#5fb83a", v: 1.0, a: 1.1 },
  { id: "rs6", name: "Quattra RS 6 Avant", tier: 1, price: 950, model: 6, color: "#7a7f88", v: 1.08, a: 1.15 },
  { id: "s63", name: "Stellar SR 63", tier: 2, price: 1000, model: 1, color: "#e8e8e8", v: 1.05, a: 1.15 },
  { id: "sgt", name: "Stellar GT Black", tier: 2, price: 1700, model: 3, color: "#151515", v: 1.15, a: 1.3 },
  { id: "bx4", name: "Bavaro X4 Competition", tier: 3, price: 1150, model: 0, color: "#1f4fd1", v: 1.08, a: 1.2 },
  { id: "bx5", name: "Bavaro X5 Competition", tier: 3, price: 1500, model: 1, color: "#24402c", v: 1.12, a: 1.22 },
  { id: "tou", name: "Toro Uro", tier: 4, price: 3200, model: 5, color: "#ffb800", v: 1.15, a: 1.3 },
  { id: "tsv", name: "Toro Avalanche SVR", tier: 4, price: 5200, model: 4, color: "#7cff3a", v: 1.32, a: 1.55 },
  { id: "vf9", name: "Vettora F9 Tributo", tier: 5, price: 4300, model: 7, color: "#d10f1f", v: 1.28, a: 1.45 },
  { id: "vsf", name: "Vettora SF-X Stradale", tier: 5, price: 6500, model: 7, color: "#f2f2f2", v: 1.38, a: 1.65 },
];
export const specPhys = (sp: Spec): Phys => ({ ...PHYS.player, vmax: PHYS.player.vmax * sp.v, accel: PHYS.player.accel * sp.a, turn: PHYS.player.turn * (sp.model === 4 || sp.model === 7 ? 1.08 : sp.model === 5 ? 0.92 : 1), grip: PHYS.player.grip * (sp.tier >= 4 ? 1.25 : 1) });
const interp = (pts: [number, number][], t: number) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, va] = pts[i], [b, vb] = pts[i + 1];
    if (t <= b) { const k = (t - a) / (b - a || 1), s = (1 - Math.cos(k * Math.PI)) / 2; return va + (vb - va) * s; }
  }
  return pts[pts.length - 1][1];
};
/** Connects rings (same point count) along z into a closed, smooth-shaded mesh. */
function loft(rings: { z: number; p: [number, number][] }[]) {
  const n = rings[0].p.length, pos: number[] = [], idx: number[] = [];
  for (const r of rings) for (const [x, y] of r.p) pos.push(x, y, r.z);
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < n; j++) {
      const a = i * n + j, b = i * n + ((j + 1) % n), c = (i + 1) * n + j, d = (i + 1) * n + ((j + 1) % n);
      idx.push(a, c, b, b, c, d);
    }
  // end caps
  for (const [ri, flip] of [[0, true], [rings.length - 1, false]] as const) {
    const r = rings[ri];
    let cx = 0, cy = 0; for (const [x, y] of r.p) { cx += x; cy += y; }
    const ci = pos.length / 3; pos.push(cx / n, cy / n, r.z);
    for (let j = 0; j < n; j++) { const a = ri * n + j, b = ri * n + ((j + 1) % n); if (flip) idx.push(ci, a, b); else idx.push(ci, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // make sure the normals point outwards (check a side vertex)
  const nx = g.attributes.normal.getX(Math.floor(rings.length / 2) * n + 2), px = g.attributes.position.getX(Math.floor(rings.length / 2) * n + 2);
  if (nx * px < 0) { const ix = g.index!.array as Uint32Array | Uint16Array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  return g;
}
let policeTex: THREE.CanvasTexture | null = null;
function policeDecal() {
  if (policeTex) return policeTex;
  const c = document.createElement("canvas"); c.width = 512; c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f4f5f7"; g.fillRect(0, 0, 512, 96);
  g.fillStyle = "#0d2a6b"; g.fillRect(0, 70, 512, 10);
  g.fillStyle = "#0e0f12"; g.font = "900 54px Arial, sans-serif"; g.textAlign = "center"; g.fillText("POLICE", 256, 58);
  policeTex = new THREE.CanvasTexture(c); policeTex.colorSpace = THREE.SRGBColorSpace;
  return policeTex;
}

export function makeCar(kind: CarKind, x: number, z: number, a: number, color?: string, model?: number): Car {
  const COMMON = [0, 1, 1, 1, 2, 2, 3, 6, 1, 2];
  const m = model ?? (kind === "cop" ? 1 : Math.random() < 0.06 ? [4, 5, 7][Math.floor(Math.random() * 3)] : COMMON[Math.floor(Math.random() * COMMON.length)]);
  const M = MODELS[m % MODELS.length];
  const grp = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: kind === "cop" ? "#0d0e11" : color || PAINTS[Math.floor(Math.random() * PAINTS.length)], metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 });
  const L = M.L, hw = M.W / 2, R = M.R;
  const zt = (t: number) => (t - 0.5) * L;
  const widthAt = (t: number) => hw * (1 - 0.1 * Math.pow(Math.abs(t - 0.5) * 2, 6)) * (t > 0.92 ? 1 - (t - 0.92) * 0.9 : 1);
  const archAt = (zz: number) => {
    let y = 0;
    for (const at of M.axles) { const d = zz - zt(at), r = R + 0.07; if (Math.abs(d) < r) y = Math.max(y, R + Math.sqrt(r * r - d * d)); }
    return y;
  };
  // lower body
  const N = 64, rings: { z: number; p: [number, number][] }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, zz = zt(t), w = widthAt(t), y1 = interp(M.y1, t), yb = Math.max(interp(M.ends, t), M.y0), arch = archAt(zz);
    const y0 = Math.max(yb, arch), ys = Math.max(yb + 0.16, arch + 0.02);
    const ym = Math.min(y1 - 0.06, Math.max(ys + 0.02, y1 - 0.14));
    rings.push({ z: zz, p: [[0, y0], [-w * 0.86, y0], [-w * 0.98, Math.min(ys, ym - 0.01)], [-w, ym], [-w * 0.95, y1 - 0.015], [-w * 0.72, y1 + 0.012], [0, y1 + 0.03], [w * 0.72, y1 + 0.012], [w * 0.95, y1 - 0.015], [w, ym], [w * 0.98, Math.min(ys, ym - 0.01)], [w * 0.86, y0]] });
  }
  const body = new THREE.Mesh(loft(rings), paint);
  body.castShadow = true; body.receiveShadow = true;
  grp.add(body);
  // greenhouse (glass) and painted roof
  const c0 = M.cab[0][0], c1 = M.cab[M.cab.length - 1][0];
  const cab: [number, number][] = M.cab.map(([t, v]) => [t, v || interp(M.y1, t)]);
  const gr: { z: number; p: [number, number][] }[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = c0 + ((c1 - c0) * i) / 40, w = widthAt(t), y1 = interp(M.y1, t) - 0.02, y2 = Math.max(y1 + 0.005, interp(cab, t));
    const k = Math.min(1, (y2 - y1) / 0.4);
    gr.push({ z: zt(t), p: [[-w * 0.94, y1], [-w * (0.94 - 0.24 * k), y2], [w * (0.94 - 0.24 * k), y2], [w * 0.94, y1]] });
  }
  const greenhouse = new THREE.Mesh(loft(gr), glass);
  greenhouse.castShadow = true;
  grp.add(greenhouse);
  const rr: { z: number; p: [number, number][] }[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = M.roof[0] + ((M.roof[1] - M.roof[0]) * i) / 24, w = widthAt(t), y2 = interp(cab, t), y1 = interp(M.y1, t);
    const k = Math.min(1, (y2 - y1) / 0.4), wr = w * (0.94 - 0.24 * k);
    rr.push({ z: zt(t), p: [[-wr - 0.012, y2 - 0.035], [-wr * 0.96, y2 + 0.02], [0, y2 + 0.035], [wr * 0.96, y2 + 0.02], [wr + 0.012, y2 - 0.035]] });
  }
  const roof = new THREE.Mesh(loft(rr), paint);
  roof.castShadow = true;
  grp.add(roof);
  // window trim along the belt line
  for (const sx of [-1, 1]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, (c1 - c0) * L * 0.92), chrome);
    tl.position.set(sx * widthAt(0.45) * 0.95, interp(M.y1, 0.45) + 0.005, zt((c0 + c1) / 2));
    grp.add(tl);
  }
  // mirrors
  for (const sx of [-1, 1]) {
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.12), paint);
    mir.position.set(sx * (widthAt(c1) + 0.07), interp(M.y1, c1 - 0.04) + 0.14, zt(c1 - 0.05));
    grp.add(mir);
  }
  // wheels: tyre, multi-spoke rim, brake disc
  const wheels: THREE.Object3D[] = [], front: THREE.Object3D[] = [];
  const tGeo = new THREE.CylinderGeometry(R, R, 0.27, 28); tGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(R * 0.66, R * 0.66, 0.285, 24); rimGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.03, R * 1.2, 0.07);
  const discGeo = new THREE.CylinderGeometry(R * 0.5, R * 0.5, 0.03, 20); discGeo.rotateZ(Math.PI / 2);
  for (const at of M.axles)
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * (hw - 0.17), R, zt(at));
      const spin = new THREE.Group();
      const ty = new THREE.Mesh(tGeo, tyre); ty.castShadow = true;
      spin.add(ty, new THREE.Mesh(rimGeo, M.sport ? rimDark : rimMat));
      for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(spokeGeo, M.sport ? rimDark : rimMat); sp.position.x = sx * 0.15; sp.rotation.x = (k / 5) * Math.PI; spin.add(sp); }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10).rotateZ(Math.PI / 2), chrome); cap.position.x = sx * 0.155; spin.add(cap);
      pivot.add(spin);
      const disc = new THREE.Mesh(discGeo, chrome); disc.position.x = -sx * 0.02; pivot.add(disc);
      if (M.sport) { const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.12), caliper); cal.position.set(sx * 0.06, R * 0.3, -0.12); pivot.add(cal); }
      grp.add(pivot);
      wheels.push(spin);
      if (at > 0.5) front.push(pivot);
    }
  // lights, grille, plates
  const tf = 0.985, yh = interp(M.y1, 0.965) - 0.07;
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.075, 0.06), headMat);
    hl.position.set(sx * widthAt(tf) * 0.66, yh, zt(tf) - 0.02);
    hl.rotation.y = -sx * 0.25;
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.018, 0.04), drlMat);
    drl.position.set(sx * widthAt(tf) * 0.66, yh - 0.06, zt(tf) - 0.01); drl.rotation.y = -sx * 0.25;
    grp.add(hl, drl);
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(M.W * 0.5, 0.18, 0.06), trim);
  grille.position.set(0, interp(M.ends, 1) + 0.04, zt(1) - 0.02); grp.add(grille);
  const brakeMat = new THREE.MeshStandardMaterial({ color: "#3a0006", emissive: new THREE.Color("#ff1020"), emissiveIntensity: 0.6 });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(M.W * 0.86, 0.06, 0.05), brakeMat);
  tail.position.set(0, interp(M.y1, 0.02) - 0.09, zt(0) + 0.015); grp.add(tail);
  for (const [zz, yy] of [[zt(1) + 0.005, interp(M.ends, 1) + 0.04], [zt(0) - 0.005, interp(M.y1, 0.02) - 0.3]]) {
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.11, 0.02), plateMat); pl.position.set(0, yy, zz); grp.add(pl);
  }
  if (M.sport) for (const sx of [-0.3, 0.3]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12).rotateX(Math.PI / 2), chrome); ex.position.set(sx, interp(M.ends, 0) - 0.12, zt(0) + 0.02); grp.add(ex); }
  if (M.wing) {
    const carbon = new THREE.MeshPhysicalMaterial({ color: "#111214", roughness: 0.35, metalness: 0.5, clearcoat: 1 });
    const yw = interp(M.y1, 0.06) + 0.32;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(M.W * 0.92, 0.04, 0.38), carbon); wing.position.set(0, yw, zt(0.05)); wing.rotation.x = -0.12;
    grp.add(wing);
    for (const sx of [-0.45, 0.45]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.12), carbon); post.position.set(sx, yw - 0.16, zt(0.06)); grp.add(post); }
    for (const sx of [-1, 1]) { const end = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.42), carbon); end.position.set(sx * M.W * 0.46, yw + 0.02, zt(0.05)); grp.add(end); }
  }
  // police livery + lightbar + push bar
  const lightbar: THREE.Mesh[] = [];
  if (kind === "cop") {
    const dec = new THREE.MeshStandardMaterial({ map: policeDecal(), roughness: 0.35, metalness: 0.2 });
    const tm = (c0 + c1) / 2 + 0.02, yb = (Math.max(M.y0 + 0.16, R * 2 + 0.05) + interp(M.y1, tm)) / 2;
    for (const sx of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.42, 0.34), dec);
      d.position.set(sx * (widthAt(tm) + 0.006), yb, zt(tm));
      d.rotation.y = sx * Math.PI / 2;
      grp.add(d);
    }
    const roofY = interp(cab, (M.roof[0] + M.roof[1]) / 2) + 0.04, roofZ = zt((M.roof[0] + M.roof[1]) / 2);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.3), black); base.position.set(0, roofY + 0.03, roofZ); grp.add(base);
    for (const s of [-1, 1]) {
      const lb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.26), new THREE.MeshBasicMaterial({ color: s < 0 ? "#ff1030" : "#1040ff", toneMapped: false }));
      lb.position.set(s * 0.3, roofY + 0.1, roofZ);
      lightbar.push(lb); grp.add(lb);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(M.W * 0.7, 0.32, 0.08), black); bar.position.set(0, interp(M.ends, 1) + 0.18, zt(1) + 0.12); grp.add(bar);
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = a;
  return {
    id: seq++, mesh: grp, wheels, front, lightbar, brake: brakeMat, paint, x, z, a, vx: 0, vz: 0, slip: 0, spin: 0, kind, model: m, driver: kind === "civ" || kind === "cop", hp: kind === "cop" ? 220 : 160, dead: false, burnT: 0,
    ph: kind === "cop" ? PHYS.cop : kind === "player" ? PHYS.player : PHYS.civ, inp: { th: 0, st: 0, hb: false }, ai: { from: -1, to: -1, panic: 0 }, stuck: 0, rev: 0, revSt: 0, block: 0, ignore: 0, path: [], pathT: 0, fireT: 1, lock: 0, len: L,
  };
}

export function stepCar(c: Car, dt: number, turbo = 1) {
  const ph = c.ph, inp = c.inp;
  const fx = Math.sin(c.a), fz = Math.cos(c.a), rx = -fz, rz = fx;
  let vf = c.vx * fx + c.vz * fz, vl = c.vx * rx + c.vz * rz;
  const broken = c.hp <= 0;
  const vmax = broken ? 0 : ph.vmax * turbo * (c.hp < 50 ? 0.6 : 1);
  if (inp.th > 0) { if (vf < vmax) vf += ph.accel * inp.th * turbo * dt * (vf < 0 ? 2 : 1); }
  else if (inp.th < 0) { if (vf > 0.5) vf -= ph.brake * -inp.th * dt; else if (vf > -ph.rev && !broken) vf -= ph.accel * 0.7 * -inp.th * dt; }
  else vf -= Math.sign(vf) * Math.min(Math.abs(vf), ph.roll * dt);
  vf *= 1 - ph.drag * dt;
  if (inp.hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 5 * dt);
  vl *= Math.max(0, 1 - (inp.hb ? ph.drift : ph.grip) * dt);
  c.slip = Math.abs(vl);
  const sf = Math.max(-1, Math.min(1, vf / 7));
  c.vx = fx * vf + rx * vl; c.vz = fz * vf + rz * vl;
  c.a += inp.st * ph.turn * sf * (inp.hb ? 1.45 : 1) * dt * (Math.abs(vf) > 25 ? 0.75 : 1);
  c.x += c.vx * dt; c.z += c.vz * dt;
  c.spin += (vf * dt) / 0.36;
  c.spin %= Math.PI * 2;
}

export function syncCar(c: Car, t: number) {
  c.mesh.position.set(c.x, 0, c.z);
  c.mesh.rotation.y = c.a;
  for (const w of c.wheels) w.rotation.x = c.spin;
  for (const f of c.front) f.rotation.y = c.inp.st * 0.45;
  if (c.brake) c.brake.emissiveIntensity = c.inp.th < 0 ? 3 : 0.6;
  if (c.lightbar.length) {
    const on = c.lock > 0 || c.kind === "cop";
    const ph = Math.floor(t * 7) % 2;
    (c.lightbar[0].material as THREE.MeshBasicMaterial).color.setRGB(on && ph ? 6 : 0.4, 0.05, 0.1);
    (c.lightbar[1].material as THREE.MeshBasicMaterial).color.setRGB(0.05, 0.15, on && !ph ? 6 : 0.4);
  }
}
