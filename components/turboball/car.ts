import * as THREE from "three";

/** Lofted body from cross-section rings (z along the car, points are [x, y] half-profiles mirrored). */
function loft(rings: { z: number; p: [number, number][] }[]) {
  const pos: number[] = [], idx: number[] = [];
  const n = rings[0].p.length;
  for (const r of rings) for (const [x, y] of r.p) pos.push(x, y, r.z);
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < n; k++) {
    const a = i * n + k, b = i * n + ((k + 1) % n), c = (i + 1) * n + k, d = (i + 1) * n + ((k + 1) % n);
    idx.push(a, c, b, b, c, d);
  }
  // caps
  const capF = pos.length / 3; pos.push(0, rings[0].p.reduce((s, q) => s + q[1], 0) / n, rings[0].z);
  for (let k = 0; k < n; k++) idx.push(capF, k, (k + 1) % n);
  const last = (rings.length - 1) * n, capB = pos.length / 3; pos.push(0, rings[rings.length - 1].p.reduce((s, q) => s + q[1], 0) / n, rings[rings.length - 1].z);
  for (let k = 0; k < n; k++) idx.push(capB, last + ((k + 1) % n), last + k);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
let bodyGeo: THREE.BufferGeometry | null = null, cabinGeo: THREE.BufferGeometry | null = null;
function geos() {
  if (bodyGeo) return { bodyGeo, cabinGeo: cabinGeo! };
  // low wedge with wide fenders, short nose, high rear deck (own design)
  const rings: { z: number; p: [number, number][] }[] = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const t = i / N, z = -1.75 + t * 3.55;
    const w = 0.98 * (t < 0.08 ? 0.82 + t * 2.2 : t > 0.9 ? 1 - (t - 0.9) * 1.6 : 1);
    const top = t < 0.25 ? 0.62 + t * 0.4 : t < 0.7 ? 0.72 - (t - 0.25) * 0.25 : 0.61 - (t - 0.7) * 0.55;
    const bot = 0.22 + (t > 0.85 ? (t - 0.85) * 0.9 : 0);
    rings.push({ z, p: [[0, bot - 0.02], [-w * 0.9, bot], [-w, bot + 0.16], [-w * 1.02, (bot + top) / 2], [-w * 0.92, top - 0.04], [-w * 0.5, top], [0, top + 0.02], [w * 0.5, top], [w * 0.92, top - 0.04], [w * 1.02, (bot + top) / 2], [w, bot + 0.16], [w * 0.9, bot]] });
  }
  bodyGeo = loft(rings);
  const cr: { z: number; p: [number, number][] }[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, z = -0.95 + t * 1.75, h = Math.sin(t * Math.PI) ** 0.6 * 0.5, w = 0.72 - Math.abs(t - 0.4) * 0.3;
    cr.push({ z, p: [[-w, 0.66], [-w * 0.78, 0.66 + h], [w * 0.78, 0.66 + h], [w, 0.66]] });
  }
  cabinGeo = loft(cr);
  return { bodyGeo, cabinGeo };
}
const tyreGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.38, 20).rotateZ(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.4, 6).rotateZ(Math.PI / 2);
const tyreM = new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.85 });
const rimM = new THREE.MeshStandardMaterial({ color: "#c9ced8", metalness: 1, roughness: 0.25 });
const darkM = new THREE.MeshStandardMaterial({ color: "#191b22", metalness: 0.6, roughness: 0.35 });
const glassM = new THREE.MeshPhysicalMaterial({ color: "#0b1018", metalness: 0.4, roughness: 0.05, clearcoat: 1 });

export type CarMesh = { group: THREE.Group; body: THREE.Group; wheels: THREE.Object3D[]; flame: THREE.Group; paint: THREE.MeshPhysicalMaterial; name?: THREE.Sprite };

export function makeCarMesh(team: 0 | 1, variant = 0): CarMesh {
  const { bodyGeo, cabinGeo } = geos();
  const base = team === 0 ? ["#1f6fff", "#2a56d6", "#1b8bff"] : ["#ff6a10", "#ff8a1a", "#f05a0a"];
  const paint = new THREE.MeshPhysicalMaterial({ color: base[variant % 3], metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const shell = new THREE.Mesh(bodyGeo, paint); shell.castShadow = true; body.add(shell);
  const cab = new THREE.Mesh(cabinGeo, glassM); cab.castShadow = true; body.add(cab);
  // spoiler, splitter, side stripes, lights
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; body.add(o); return o; };
  box(1.9, 0.06, 0.42, darkM, 0, 1.0, -1.55); box(0.08, 0.32, 0.3, darkM, -0.7, 0.82, -1.5); box(0.08, 0.32, 0.3, darkM, 0.7, 0.82, -1.5);
  box(1.8, 0.06, 0.32, darkM, 0, 0.24, 1.72);
  const stripeM = new THREE.MeshStandardMaterial({ color: "#f4f6fa", roughness: 0.4, metalness: 0.2 });
  box(0.22, 0.02, 3.0, stripeM, -0.18, 0.75, 0.05).rotation.x = 0.02; box(0.22, 0.02, 3.0, stripeM, 0.18, 0.75, 0.05).rotation.x = 0.02;
  const headM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.4), toneMapped: false });
  const tailM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.15, 0.15), toneMapped: false });
  box(0.42, 0.08, 0.04, headM, -0.6, 0.55, 1.79); box(0.42, 0.08, 0.04, headM, 0.6, 0.55, 1.79);
  box(1.5, 0.06, 0.04, tailM, 0, 0.62, -1.77);
  const wheels: THREE.Object3D[] = [];
  for (const [x, z] of [[-1.0, 1.1], [1.0, 1.1], [-1.0, -1.15], [1.0, -1.15]]) {
    const w = new THREE.Group(); w.position.set(x, 0.42, z);
    const t = new THREE.Mesh(tyreGeo, tyreM); t.castShadow = true; w.add(t); w.add(new THREE.Mesh(rimGeo, rimM));
    body.add(w); wheels.push(w);
  }
  // boost flame (two nozzles)
  const flame = new THREE.Group(); flame.position.set(0, 0.5, -1.85); body.add(flame);
  const fm = new THREE.MeshBasicMaterial({ color: team === 0 ? new THREE.Color(0.6, 1.6, 3.2) : new THREE.Color(3.2, 1.3, 0.3), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const core = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (const x of [-0.35, 0.35]) {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.2, 12).rotateX(Math.PI / 2), darkM); noz.position.set(x, 0, 0.05); body.add(noz); noz.position.add(flame.position);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.6, 12, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.8), fm); f.position.x = x; flame.add(f);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.8, 8, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.4), core); c.position.x = x; flame.add(c);
  }
  flame.visible = false;
  return { group, body, wheels, flame, paint };
}

/** Ball: silver panels with dark seams and a glowing core ring. */
export function makeBallMesh(R: number) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#f2f4f8"); gr.addColorStop(0.5, "#cfd5df"); gr.addColorStop(1, "#eef1f6");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#20242c"; g.lineWidth = 7;
  // hexagon panels in equirect space
  const r = 46, hh = Math.sqrt(3) * r;
  for (let row = -1; row < 7; row++) for (let col = -1; col < 16; col++) {
    const cx = col * r * 1.5 * 1.45, cy = row * hh + (col % 2 ? hh / 2 : 0);
    g.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k * Math.PI) / 3; g.lineTo(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r); } g.stroke();
  }
  g.fillStyle = "#2a2f38"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 486, 1024, 26);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshPhysicalMaterial({ map: t, metalness: 0.65, roughness: 0.28, clearcoat: 0.8 }));
  ball.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.002, 0.07, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 2.0, 3.0), toneMapped: false }));
  ball.add(ring);
  return ball;
}
