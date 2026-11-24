import * as THREE from "three";

export type CarKind = "civ" | "cop" | "parked" | "player" | "wreck";
export type Phys = { accel: number; brake: number; rev: number; vmax: number; turn: number; grip: number; drift: number; drag: number; roll: number };
export type Car = {
  id: number; mesh: THREE.Group; wheels: THREE.Object3D[]; front: THREE.Object3D[]; lightbar: THREE.Mesh[]; brake: THREE.MeshStandardMaterial | null; paint: THREE.MeshPhysicalMaterial;
  x: number; z: number; a: number; vx: number; vz: number; slip: number; spin: number;
  kind: CarKind; model: number; driver: boolean; hp: number; dead: boolean; burnT: number;
  ph: Phys; inp: { th: number; st: number; hb: boolean };
  ai: { from: number; to: number; panic: number }; stuck: number; rev: number; revSt: number; block: number; ignore: number;
  path: number[]; pathT: number; fireT: number; lock: number; len: number;
};

export const PHYS = {
  player: { accel: 12, brake: 26, rev: 9, vmax: 47, turn: 2.3, grip: 7.5, drift: 1.2, drag: 0.06, roll: 2.2 },
  civ: { accel: 6, brake: 18, rev: 5, vmax: 22, turn: 1.9, grip: 10, drift: 10, drag: 0.06, roll: 3 },
  cop: { accel: 13, brake: 26, rev: 8, vmax: 44, turn: 2.3, grip: 8, drift: 2, drag: 0.06, roll: 2.2 },
} satisfies Record<string, Phys>;

export const PAINTS = ["#b3122e", "#f4f4f2", "#101216", "#1f4fd1", "#e8c547", "#23a7a0", "#ff7a3d", "#7a7f88", "#6a2bd1", "#ff4f9a", "#2f6f3b", "#c9c2b0"];

let seq = 1;
const glass = new THREE.MeshPhysicalMaterial({ color: "#0d141c", roughness: 0.04, metalness: 0.3, clearcoat: 1 });
const tyre = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.9 });
const rim = new THREE.MeshStandardMaterial({ color: "#c8ccd2", roughness: 0.25, metalness: 0.9 });
const chrome = new THREE.MeshStandardMaterial({ color: "#d9dde3", roughness: 0.15, metalness: 1 });
export const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.15, 1.05), toneMapped: false });
const black = new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.7 });

// side profiles (forward = +u, up = +v), length ≈ 4.4–4.9 m
const PROFILES: { body: number[]; cabin: number[]; w: number; wheelR: number; wb: number; len: number }[] = [
  // sports coupe
  { body: [-2.25, 0.3, -2.3, 0.75, -2.0, 0.95, 1.2, 0.92, 2.2, 0.7, 2.3, 0.45, 2.2, 0.3], cabin: [-1.55, 0.9, -0.9, 1.3, 0.35, 1.3, 1.25, 0.92], w: 1.9, wheelR: 0.36, wb: 1.38, len: 4.6 },
  // sedan
  { body: [-2.35, 0.32, -2.4, 0.85, -1.7, 1.0, 1.4, 0.98, 2.3, 0.82, 2.4, 0.45, 2.3, 0.32], cabin: [-1.6, 0.98, -1.05, 1.5, 0.55, 1.5, 1.3, 0.98], w: 1.85, wheelR: 0.34, wb: 1.42, len: 4.8 },
  // SUV
  { body: [-2.35, 0.42, -2.4, 1.15, -2.1, 1.25, 1.6, 1.22, 2.35, 1.0, 2.4, 0.55, 2.3, 0.42], cabin: [-2.15, 1.22, -2.0, 1.85, 0.7, 1.85, 1.6, 1.22], w: 2.0, wheelR: 0.42, wb: 1.45, len: 4.8 },
];

function extrude(pts: number[], width: number, bevel: number) {
  const s = new THREE.Shape();
  s.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) s.lineTo(pts[i], pts[i + 1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2); // u (forward) -> +z
  g.computeVertexNormals();
  return g;
}

export function makeCar(kind: CarKind, x: number, z: number, a: number, color?: string, model?: number): Car {
  const m = model ?? (kind === "cop" ? 1 : Math.floor(Math.random() * PROFILES.length));
  const P = PROFILES[m];
  const grp = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: kind === "cop" ? "#f2f3f5" : color || PAINTS[Math.floor(Math.random() * PAINTS.length)], metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
  const body = new THREE.Mesh(extrude(P.body, P.w, 0.12), paint);
  body.castShadow = true; body.receiveShadow = true;
  const cab = new THREE.Mesh(extrude(P.cabin, P.w - 0.2, 0.1), glass);
  cab.castShadow = true;
  grp.add(body, cab);
  if (kind === "cop") {
    const hood = new THREE.Mesh(extrude([P.body[8] - 0.1, 0.33, 2.4, 0.45, 2.3, 0.86, 1.2, 0.99, 1.15, 0.33], P.w + 0.02, 0.1), black);
    const trunk = new THREE.Mesh(extrude([-2.4, 0.33, -2.45, 0.88, -1.6, 1.02, -1.5, 0.33], P.w + 0.02, 0.1), black);
    grp.add(hood, trunk);
  }
  const lightbar: THREE.Mesh[] = [];
  if (kind === "cop") {
    const roofY = Math.max(P.cabin[3], P.cabin[5]) + 0.08;
    for (const s of [-1, 1]) {
      const lb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.28), new THREE.MeshBasicMaterial({ color: s < 0 ? "#ff1030" : "#1040ff", toneMapped: false }));
      lb.position.set(s * 0.33, roofY, -0.3);
      lightbar.push(lb); grp.add(lb);
    }
  }
  const wheels: THREE.Object3D[] = [], front: THREE.Object3D[] = [];
  const wGeo = new THREE.CylinderGeometry(P.wheelR, P.wheelR, 0.28, 18); wGeo.rotateZ(Math.PI / 2);
  const rGeo = new THREE.CylinderGeometry(P.wheelR * 0.62, P.wheelR * 0.62, 0.3, 12); rGeo.rotateZ(Math.PI / 2);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * (P.w / 2 - 0.12), P.wheelR, sz * P.wb);
    const spin = new THREE.Group();
    const t = new THREE.Mesh(wGeo, tyre); t.castShadow = true;
    spin.add(t, new THREE.Mesh(rGeo, rim));
    pivot.add(spin);
    grp.add(pivot);
    wheels.push(spin);
    if (sz > 0) front.push(pivot);
  }
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.05), headMat);
    hl.position.set(sx * (P.w / 2 - 0.3), P.body[P.body.length - 3] + 0.02, P.len / 2 - 0.08);
    grp.add(hl);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(P.w - 0.2, 0.06, 0.05), chrome);
    bumper.position.set(0, 0.42, -P.len / 2 + 0.05);
    grp.add(bumper);
  }
  const brakeMat = new THREE.MeshStandardMaterial({ color: "#3a0006", emissive: new THREE.Color("#ff1020"), emissiveIntensity: 0.6 });
  for (const sx of [-1, 1]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), brakeMat); tl.position.set(sx * (P.w / 2 - 0.3), 0.8, -P.len / 2 + 0.02); grp.add(tl); }
  grp.position.set(x, 0, z);
  grp.rotation.y = a;
  return {
    id: seq++, mesh: grp, wheels, front, lightbar, brake: brakeMat, paint, x, z, a, vx: 0, vz: 0, slip: 0, spin: 0, kind, model: m, driver: kind === "civ" || kind === "cop", hp: kind === "cop" ? 220 : 160, dead: false, burnT: 0,
    ph: kind === "cop" ? PHYS.cop : kind === "player" ? PHYS.player : PHYS.civ, inp: { th: 0, st: 0, hb: false }, ai: { from: -1, to: -1, panic: 0 }, stuck: 0, rev: 0, revSt: 0, block: 0, ignore: 0, path: [], pathT: 0, fireT: 1, lock: 0, len: P.len,
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
