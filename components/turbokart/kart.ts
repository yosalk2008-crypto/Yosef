import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Own characters – speed/accel/handling are small ±% tweaks, weight matters in bumps. */
export const CHARS = [
  { name: "Kira", col: "#ff3d7f", acc: "#ffd1e3", skin: "#f1c7a5", spd: 1.0, accel: 1.06, hand: 1.04, w: 0.9 },
  { name: "Bolt", col: "#ffd23f", acc: "#1a1a1a", skin: "#e0a77f", spd: 1.03, accel: 0.96, hand: 0.98, w: 1.1 },
  { name: "Momo", col: "#2ecc71", acc: "#eaffef", skin: "#f5d6b8", spd: 0.98, accel: 1.08, hand: 1.06, w: 0.85 },
  { name: "Rex", col: "#e63946", acc: "#2b2b2b", skin: "#c98d63", spd: 1.04, accel: 0.94, hand: 0.96, w: 1.25 },
  { name: "Luna", col: "#9b5de5", acc: "#f0e4ff", skin: "#f3d0b4", spd: 1.0, accel: 1.02, hand: 1.06, w: 0.95 },
  { name: "Zed", col: "#00c2ff", acc: "#0b2540", skin: "#8d5a3b", spd: 1.02, accel: 1.0, hand: 1.0, w: 1.05 },
  { name: "Pia", col: "#ff8a00", acc: "#fff2d6", skin: "#e8b48f", spd: 1.01, accel: 1.03, hand: 1.02, w: 1.0 },
  { name: "Tano", col: "#d9dfe9", acc: "#1f6fff", skin: "#b07a52", spd: 1.03, accel: 0.98, hand: 0.97, w: 1.15 },
] as const;

export type KartMesh = { group: THREE.Group; body: THREE.Group; wheels: THREE.Object3D[]; front: THREE.Object3D[]; flames: THREE.Mesh[]; shield: THREE.Mesh; driver: THREE.Group; head: THREE.Object3D };

const tire = new THREE.MeshStandardMaterial({ color: "#16171b", roughness: 0.85 });
const metal = new THREE.MeshStandardMaterial({ color: "#9aa0ab", metalness: 0.8, roughness: 0.4 });
const dark = new THREE.MeshStandardMaterial({ color: "#23252d", metalness: 0.4, roughness: 0.5 });
const visor = new THREE.MeshStandardMaterial({ color: "#0b0f1c", metalness: 0.9, roughness: 0.08, envMapIntensity: 2 });

export function makeKart(ci: number): KartMesh {
  const ch = CHARS[ci % CHARS.length];
  const paint = new THREE.MeshPhysicalMaterial({ color: ch.col, metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const acc = new THREE.MeshStandardMaterial({ color: ch.acc, roughness: 0.4, metalness: 0.2 });
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  // chassis tub + nose + side pods
  add(new RoundedBoxGeometry(1.5, 0.38, 2.4, 3, 0.16), paint, 0, 0.42, 0);
  const nose = add(new RoundedBoxGeometry(1.05, 0.3, 1.0, 3, 0.13), paint, 0, 0.4, 1.45); nose.rotation.x = 0.12;
  add(new RoundedBoxGeometry(1.8, 0.16, 0.36, 2, 0.07), acc, 0, 0.32, 1.95); // front bumper
  for (const s of [-1, 1]) { const pod = add(new RoundedBoxGeometry(0.42, 0.34, 1.5, 3, 0.14), paint, s * 0.88, 0.44, -0.1); pod.rotation.y = s * 0.05; add(new THREE.BoxGeometry(0.06, 0.12, 1.3), acc, s * 1.1, 0.48, -0.1); }
  // seat + engine block + exhausts + wing
  add(new RoundedBoxGeometry(0.8, 0.6, 0.35, 2, 0.12), dark, 0, 0.82, -0.55);
  add(new RoundedBoxGeometry(1.0, 0.42, 0.65, 2, 0.1), metal, 0, 0.7, -1.15);
  const flames: THREE.Mesh[] = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5), transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const s of [-1, 1]) {
    const p = add(new THREE.CylinderGeometry(0.11, 0.13, 0.5, 10, 1, true), metal, s * 0.3, 0.75, -1.55); p.rotation.x = Math.PI / 2 - 0.25;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.0, 10, 1, true).translate(0, -0.5, 0).rotateX(-Math.PI / 2 - 0.25), flameMat.clone());
    f.position.set(s * 0.3, 0.8, -1.8); f.visible = false; body.add(f); flames.push(f);
  }
  const wing = add(new RoundedBoxGeometry(1.7, 0.08, 0.45, 2, 0.03), paint, 0, 1.22, -1.45); wing.rotation.x = -0.15;
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.45, 0.25), dark, s * 0.6, 1.0, -1.4);
  // wheels
  const wheels: THREE.Object3D[] = [], front: THREE.Object3D[] = [];
  const mk = (r: number, w: number, x: number, z: number, isFront: boolean) => {
    const piv = new THREE.Group(); piv.position.set(x, r, z); body.add(piv);
    const wh = new THREE.Group(); piv.add(wh);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 20).rotateZ(Math.PI / 2), tire); t.castShadow = true; wh.add(t);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 6).rotateZ(Math.PI / 2), acc); wh.add(hub);
    wheels.push(wh); if (isFront) front.push(piv);
  };
  mk(0.33, 0.32, -0.86, 1.15, true); mk(0.33, 0.32, 0.86, 1.15, true); mk(0.44, 0.46, -0.92, -0.95, false); mk(0.44, 0.46, 0.92, -0.95, false);
  // steering wheel
  const sw = add(new THREE.TorusGeometry(0.2, 0.035, 6, 16), dark, 0, 0.95, 0.55); sw.rotation.x = -0.9;
  // driver
  const driver = new THREE.Group(); driver.position.set(0, 0.62, -0.3); body.add(driver);
  const suit = new THREE.MeshStandardMaterial({ color: ch.col, roughness: 0.6 });
  add(new THREE.CapsuleGeometry(0.3, 0.38, 4, 10), suit, 0, 0.5, 0, driver);
  add(new THREE.SphereGeometry(0.2, 10, 8), acc, 0, 0.72, 0.08, driver);
  for (const s of [-1, 1]) { const a = add(new THREE.CapsuleGeometry(0.09, 0.45, 3, 6), suit, s * 0.3, 0.55, 0.35, driver); a.rotation.set(1.1, 0, -s * 0.35); add(new THREE.SphereGeometry(0.1, 8, 6), acc, s * 0.2, 0.38, 0.78, driver); }
  const head = new THREE.Group(); head.position.set(0, 1.12, 0.02); driver.add(head);
  const helmet = new THREE.MeshPhysicalMaterial({ color: ch.col, metalness: 0.3, roughness: 0.2, clearcoat: 1 });
  add(new THREE.SphereGeometry(0.36, 20, 14), helmet, 0, 0, 0, head);
  add(new THREE.SphereGeometry(0.3, 16, 10, -1.1, 2.2, 0.9, 1.0), visor, 0, -0.01, 0.07, head);
  add(new THREE.TorusGeometry(0.36, 0.035, 6, 24, Math.PI), acc, 0, 0, 0, head).rotation.y = Math.PI / 2;
  // shield bubble
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.0, 24, 16), new THREE.MeshPhysicalMaterial({ color: "#7de8ff", emissive: "#2fb8ff", emissiveIntensity: 0.8, transparent: true, opacity: 0.25, roughness: 0, iridescence: 1, depthWrite: false }));
  shield.position.y = 0.9; shield.visible = false; group.add(shield);
  return { group, body, wheels, front, flames, shield, driver, head };
}

// ── item models ──
export type ItemKey = "turbo" | "turbo3" | "rocket" | "homing" | "banana" | "shield";
export const ITEM_ICON: Record<ItemKey, string> = { turbo: "⚡", turbo3: "⚡⚡⚡", rocket: "🚀", homing: "🎯", banana: "🍌", shield: "🛡️" };
export const ITEM_NAME: Record<ItemKey, [string, string]> = { turbo: ["Turbo", "Turbo"], turbo3: ["3× Turbo", "3× Turbo"], rocket: ["Rakete", "Rocket"], homing: ["Lenkrakete", "Homing rocket"], banana: ["Banane", "Banana"], shield: ["Schild", "Shield"] };

export function makeRocket(homing: boolean) {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color: homing ? "#9b5de5" : "#ff5a2b", metalness: 0.5, roughness: 0.3, emissive: homing ? "#5a1aa0" : "#601000", emissiveIntensity: 0.6 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.5, 12).rotateX(Math.PI / 2), bodyM); g.add(b);
  const n = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#f4f4f4", metalness: 0.6, roughness: 0.2 })); n.position.z = 1.05; g.add(n);
  for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.45), bodyM); f.position.z = -0.6; f.rotation.z = (k * Math.PI) / 2; f.translateY(0.3); g.add(f); }
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.2, 10, 1, true).translate(0, -0.6, 0).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.8, 0.6), toneMapped: false, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  fl.position.z = -0.75; fl.rotation.y = Math.PI; g.add(fl);
  if (homing) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 0.8, 3), toneMapped: false })); g.add(ring); }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}
export function makeBanana() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.2, 8, 14, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: "#ffd84a", roughness: 0.5, emissive: "#5a4500", emissiveIntensity: 0.3 }));
  m.rotation.set(0, 0, Math.PI * 1.05); m.position.y = 0.75; m.scale.set(1, 1, 0.9); m.castShadow = true; g.add(m);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 6), new THREE.MeshStandardMaterial({ color: "#4a3a1a" })); tip.position.set(0.5, 0.95, 0); g.add(tip);
  return g;
}
