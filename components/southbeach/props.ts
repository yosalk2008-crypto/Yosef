import * as THREE from "three";

type Rect = { x0: number; z0: number; x1: number; z1: number };

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
};

/**
 * Convenience-store interior. Local coordinates: x -7..7, z -5..5, door at z = +5.
 * The counter with the cashier is left of the door.
 */
export function makeShopInterior() {
  const W = 14, D = 10, H = 3.6;
  const g = new THREE.Group();
  const floorTex = canvasTex(256, 256, (c) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? "#e9e6df" : "#d3cfc6"; c.fillRect(x * 64, y * 64, 64, 64); }
    c.strokeStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i <= 256; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.moveTo(0, i); c.lineTo(256, i); c.stroke(); }
  }, true);
  floorTex.repeat.set(W / 1.2, D / 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ color: "#dcd6ca", roughness: 0.9 });
  const trimM = new THREE.MeshStandardMaterial({ color: "#d1314b", roughness: 0.6 });
  g.add(box(W, H, 0.2, wallM, 0, H / 2, -D / 2), box(0.2, H, D, wallM, -W / 2, H / 2, 0), box(0.2, H, D, wallM, W / 2, H / 2, 0));
  // front wall with glass door and windows
  const glassM = new THREE.MeshPhysicalMaterial({ color: "#9fc7d6", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 });
  g.add(box(4.6, H, 0.2, wallM, -4.7, H / 2, D / 2), box(4.6, H, 0.2, wallM, 4.7, H / 2, D / 2), box(4.8, H - 2.6, 0.2, wallM, 0, H - (H - 2.6) / 2, D / 2));
  const door = box(1.9, 2.5, 0.06, glassM, 0, 1.25, D / 2); door.castShadow = false; g.add(door);
  g.add(box(W, 0.35, 0.22, trimM, 0, H - 0.6, -D / 2 + 0.12), box(0.22, 0.35, D, trimM, -W / 2 + 0.12, H - 0.6, 0), box(0.22, 0.35, D, trimM, W / 2 - 0.12, H - 0.6, 0));
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: "#bdb9b2", roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; g.add(ceil);
  // ceiling light panels + lights
  const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.15, 1.1), toneMapped: false });
  for (const x of [-4.5, 0, 4.5]) for (const z of [-2.5, 1.5]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.4), panelM); p.rotation.x = Math.PI / 2; p.position.set(x, H - 0.02, z); g.add(p); }
  for (const x of [-4, 3.5]) { const l = new THREE.PointLight("#fff4e6", 9, 14, 1.6); l.position.set(x, H - 0.4, 0); g.add(l); }
  // shelves with products (instanced)
  const shelfM = new THREE.MeshStandardMaterial({ color: "#c7ccd3", roughness: 0.5, metalness: 0.6 });
  const solids: Rect[] = [];
  const prodGeo = new THREE.BoxGeometry(0.18, 0.26, 0.14), canGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8);
  const prodM = new THREE.MeshStandardMaterial({ roughness: 0.5 });
  const prods = new THREE.InstancedMesh(prodGeo, prodM, 900), cans = new THREE.InstancedMesh(canGeo, new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.7 }), 700);
  let pi = 0, ci = 0;
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const PCOL = ["#e63946", "#f1c40f", "#2a9d8f", "#264653", "#f4a261", "#8e44ad", "#3498db", "#ffffff", "#e76f51", "#2ecc71"];
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const sx of [-1.2, 1.8, 4.8]) {
    const x0 = sx - 0.45, z0 = -3.4, len = 5;
    g.add(box(0.9, 0.08, len, shelfM, sx, 0.1, z0 + len / 2), box(0.06, 1.85, len, shelfM, sx, 0.93, z0 + len / 2));
    for (const y of [0.45, 0.9, 1.35, 1.8]) g.add(box(0.9, 0.03, len, shelfM, sx, y, z0 + len / 2));
    solids.push({ x0, z0, x1: x0 + 0.9, z1: z0 + len });
    for (const side of [-0.28, 0.28]) for (const y of [0.12, 0.47, 0.92, 1.37]) for (let z = z0 + 0.12; z < z0 + len - 0.1; z += 0.2) {
      if (r() < 0.12) continue;
      col.set(PCOL[Math.floor(r() * PCOL.length)]);
      if (r() < 0.45 && ci < 700) { m4.makeTranslation(sx + side, y + 0.08, z); cans.setMatrixAt(ci, m4); cans.setColorAt(ci++, col); }
      else if (pi < 900) { m4.makeTranslation(sx + side, y + 0.13, z); prods.setMatrixAt(pi, m4); prods.setColorAt(pi++, col); }
    }
  }
  prods.count = pi; cans.count = ci; prods.castShadow = cans.castShadow = true;
  g.add(prods, cans);
  // fridges along the back wall
  const fridgeM = new THREE.MeshStandardMaterial({ color: "#2b2f36", roughness: 0.4, metalness: 0.6 });
  const fridgeGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.7, 1.9), toneMapped: false });
  for (let k = 0; k < 6; k++) {
    const x = -5.4 + k * 1.75;
    g.add(box(1.7, 2.3, 0.75, fridgeM, x, 1.15, -D / 2 + 0.5));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.9), fridgeGlow); glow.position.set(x, 1.25, -D / 2 + 0.88); g.add(glow);
    for (let s = 0; s < 4; s++) for (let b = 0; b < 7; b++) { if (ci >= 700) break; col.set(PCOL[Math.floor(r() * PCOL.length)]); m4.makeTranslation(x - 0.6 + b * 0.2, 0.45 + s * 0.45, -D / 2 + 0.78); cans.setMatrixAt(ci, m4); cans.setColorAt(ci++, col); }
  }
  cans.count = ci;
  solids.push({ x0: -W / 2, z0: -D / 2, x1: W / 2, z1: -D / 2 + 0.9 });
  // checkout counter with register
  const counterM = new THREE.MeshStandardMaterial({ color: "#8b5a3c", roughness: 0.6 });
  const topM = new THREE.MeshStandardMaterial({ color: "#1f2226", roughness: 0.25, metalness: 0.3 });
  g.add(box(3.6, 1.0, 0.8, counterM, -4.4, 0.5, 2.9), box(3.7, 0.05, 0.9, topM, -4.4, 1.02, 2.9), box(0.8, 1.0, 1.6, counterM, -6.2, 0.5, 3.7));
  solids.push({ x0: -6.6, z0: 2.45, x1: -2.55, z1: 3.35 }, { x0: -6.7, z0: 2.9, x1: -5.8, z1: 4.6 });
  const reg = box(0.45, 0.25, 0.35, topM, -3.6, 1.18, 2.9);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 1.0), toneMapped: false })); scr.position.set(-3.6, 1.42, 2.74); scr.rotation.x = -0.4;
  g.add(reg, scr);
  // door mat, candy rack, ATM, posters
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshStandardMaterial({ color: "#2b2b30", roughness: 1 })); mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.01, D / 2 - 0.9); mat.receiveShadow = true; g.add(mat);
  g.add(box(1.2, 1.3, 0.4, shelfM, -2.0, 0.65, 3.4));
  const atm = box(0.7, 1.7, 0.6, new THREE.MeshStandardMaterial({ color: "#3a6ea5", roughness: 0.4, metalness: 0.5 }), 6.4, 0.85, 3.6); g.add(atm);
  solids.push({ x0: -2.6, z0: 3.2, x1: -1.4, z1: 3.6 }, { x0: 6.0, z0: 3.3, x1: 7, z1: 3.9 });
  const poster = (txt: string, color: string, x: number, z: number, ry: number) => {
    const t = canvasTex(256, 320, (c) => { c.fillStyle = color; c.fillRect(0, 0, 256, 320); c.fillStyle = "#fff"; c.font = "900 64px Arial"; c.textAlign = "center"; c.fillText(txt, 128, 150); c.font = "700 30px Arial"; c.fillText("2 FOR 1", 128, 220); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ map: t })); m.position.set(x, 2.1, z); m.rotation.y = ry; g.add(m);
  };
  poster("SALE", "#e63946", -6.88, -1, Math.PI / 2); poster("NEW", "#2a9d8f", 6.88, -1.5, -Math.PI / 2);
  // shop name sign above the fridges (updated per store)
  const signC = document.createElement("canvas"); signC.width = 1024; signC.height = 160;
  const signT = new THREE.CanvasTexture(signC); signT.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.95), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.6, emissive: new THREE.Color("#ffffff"), emissiveMap: signT, emissiveIntensity: 0.35 }));
  sign.position.set(0, 2.95, -D / 2 + 0.12); g.add(sign);
  const setName = (name: string) => {
    const c = signC.getContext("2d")!;
    c.fillStyle = "#f7f3ea"; c.fillRect(0, 0, 1024, 160);
    c.fillStyle = "#d1314b"; c.fillRect(0, 0, 1024, 18); c.fillRect(0, 142, 1024, 18);
    c.fillStyle = "#c21f3a"; c.font = "900 92px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(name, 512, 84);
    signT.needsUpdate = true;
  };
  return { group: g, W, D, H, solids, setName, cashier: { x: -4.4, z: 3.95 }, door: { x: 0, z: D / 2 - 0.8 }, customers: [{ x: 0.3, z: -1.2 }, { x: 3.3, z: 0.4 }, { x: 6.2, z: -2.6 }, { x: -2.6, z: -3.6 }] };
}

/** Motor yacht. Local deck at y = 2.3, walkable x ±4.1, z -18.6..17, cabin block in the middle. */
export function makeYacht(len = 1) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: "#f3f5f7", roughness: 0.3, metalness: 0.1 });
  const teak = new THREE.MeshStandardMaterial({ color: "#a8784c", roughness: 0.7 });
  const navy = new THREE.MeshStandardMaterial({ color: "#1c2a44", roughness: 0.4 });
  const glassY = new THREE.MeshPhysicalMaterial({ color: "#0b1620", roughness: 0.05, metalness: 0.5 });
  const hull = box(9, 3.4, 38, white, 0, 0.6, 0);
  const stripe = box(9.05, 0.5, 38.05, navy, 0, -0.6, 0);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 4.5, 10, 4, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), white); bow.scale.set(1, 0.75, 1); bow.position.set(0, 0.8, 23.5); bow.castShadow = true;
  const deck = box(8.6, 0.06, 37.4, teak, 0, 2.31, 0);
  const deck1 = box(6, 2.6, 22, white, 0, 3.6, -3);
  const win1 = box(6.1, 1.2, 20, glassY, 0, 3.7, -3);
  const rear = box(4.2, 2.0, 0.08, glassY, 0, 3.35, -14.03);
  const deck2 = box(5, 2.2, 13, white, 0, 6, -5);
  const win2 = box(5.1, 1, 11, glassY, 0, 6.1, -5);
  const roof2 = box(5.6, 0.15, 15, white, 0, 7.15, -5.5);
  const front = box(5.2, 1.0, 0.08, glassY, 0, 4.1, 8.03);
  const mast = box(0.3, 5, 0.3, white, 0, 9, -6);
  const rail = new THREE.MeshStandardMaterial({ color: "#d9dde3", roughness: 0.2, metalness: 1 });
  g.add(hull, stripe, bow, deck, deck1, win1, rear, deck2, win2, roof2, front, mast);
  // portholes along the hull
  const portM = new THREE.MeshStandardMaterial({ color: "#0d1a26", roughness: 0.1, metalness: 0.6 });
  const portG = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12).rotateZ(Math.PI / 2);
  for (const sx of [-4.52, 4.52]) for (let z = -15; z <= 15; z += 2.5) { const p = new THREE.Mesh(portG, portM); p.position.set(sx, 1.25, z); g.add(p); }
  // aft deck table and chairs
  const table = box(1.6, 0.08, 1.0, teak, 0, 3.05, -16.4); const leg = box(0.12, 0.7, 0.12, white, 0, 2.7, -16.4); g.add(table, leg);
  for (const sx of [-4.4, 4.4]) g.add(box(0.05, 0.05, 37, rail, sx, 3.25, 0));
  // sun loungers on the aft deck, swim platform
  for (const sx of [-1.7, 0, 1.7]) { g.add(box(1.4, 0.35, 2.2, white, sx, 2.5, 14.2)); const back = box(1.4, 0.5, 0.25, white, sx, 2.8, 13.1); back.rotation.x = 0.5; g.add(back); }
  g.add(box(8.5, 0.15, 2.2, teak, 0, 0.55, -20));
  g.scale.setScalar(len);
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, deckY: 2.36 * len, walk: { x0: -4.15 * len, z0: -18.6 * len, x1: 4.15 * len, z1: 17 * len }, block: { x0: -3.05 * len, z0: -14.1 * len, x1: 3.05 * len, z1: 8.1 * len }, stern: { x: 0, z: -20.5 * len }, spots: [{ x: -2.3, z: -17.3 }, { x: 2.4, z: -15.6 }, { x: 0.9, z: -17.9 }, { x: -1.6, z: 10.4 }, { x: 2.2, z: 11.4 }].map((p) => ({ x: p.x * len, z: p.z * len })) };
}

/** Pastel lifeguard tower like the ones on Miami Beach. */
export function makeLifeguardTower(i: number) {
  const PAL = [["#ff6fa8", "#ffd166", "#06d6a0", "#118ab2"], ["#ffd23f", "#ee4266", "#3bceac", "#540d6e"], ["#9b5de5", "#f15bb5", "#fee440", "#00bbf9"], ["#ff9f1c", "#2ec4b6", "#e71d36", "#fdfffc"]][i % 4];
  const tex = canvasTex(256, 128, (c) => { PAL.forEach((p, k) => { c.fillStyle = p; c.fillRect(k * 64, 0, 64, 128); }); });
  const g = new THREE.Group();
  const hutM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: "#e9e2d0", roughness: 0.8 });
  const roofM = new THREE.MeshStandardMaterial({ color: PAL[0], roughness: 0.5 });
  for (const [x, z] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) g.add(box(0.15, 1.9, 0.15, wood, x, 0.95, z));
  g.add(box(3, 0.12, 2.6, wood, 0, 1.95, 0), box(2.6, 2.1, 2.2, hutM, 0, 3.05, 0));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 4), roofM); roof.rotation.y = Math.PI / 4; roof.position.y = 4.55; roof.castShadow = true; g.add(roof);
  const win = box(1.8, 0.7, 0.05, new THREE.MeshPhysicalMaterial({ color: "#123", roughness: 0.05, metalness: 0.5 }), 0, 3.3, 1.12); g.add(win);
  const ramp = box(1, 0.08, 3.4, wood, 0, 1, -2.7); ramp.rotation.x = -0.55; g.add(ramp);
  const flag = box(0.6, 0.35, 0.02, new THREE.MeshStandardMaterial({ color: "#e63946" }), 0.35, 5.6, 0); const pole = box(0.04, 1.4, 0.04, wood, 0, 5.3, 0); g.add(flag, pole);
  return g;
}

/** Small beach kiosk (jet ski rental). Front faces +z. */
export function makeKiosk(label: string) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#3aa6b9", roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: "#f5f1e6", roughness: 0.7 });
  g.add(box(4.2, 2.6, 3, wood, 0, 1.3, 0), box(4.8, 0.2, 3.8, white, 0, 2.75, 0.2), box(4.3, 1.0, 0.4, white, 0, 0.5, 1.7));
  const t = canvasTex(512, 128, (c) => { c.fillStyle = "#ff7a1f"; c.fillRect(0, 0, 512, 128); c.fillStyle = "#fff"; c.font = "900 58px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, 256, 68); });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); s.position.set(0, 3.4, 1.55); g.add(s);
  return g;
}
