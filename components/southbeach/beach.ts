import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SBMap } from "@/lib/southbeach/osm.mjs";
import type { World } from "./world";
import { makeLifeguardTower, makeKiosk } from "./props";

function pip(p: number[], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], zi = p[i + 1], xj = p[j], zj = p[j + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

/**
 * Atlantic beach dressing: wet sand slope into the surf, turquoise shallows, foam lines,
 * pastel lifeguard towers, umbrella and lounger rows, towels, dune shrubs, rental kiosks.
 */
export function buildBeach(world: World, map: SBMap, scene: THREE.Scene, lang: "de" | "en") {
  const B = world.bounds;
  const grp = new THREE.Group(); scene.add(grp);
  let seed = 4242; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const z0 = B.z0 - 60, z1 = B.z1 + 60, STEP = 5;
  const zs: number[] = [], es: number[] = [];
  for (let z = z0; z <= z1; z += STEP) { zs.push(z); es.push(world.shore(z).e); }
  // smooth the shoreline a little so ribbons don't zig-zag
  const se = es.map((_, i) => { let s = 0, n = 0; for (let k = -2; k <= 2; k++) { const v = es[i + k]; if (v !== undefined) { s += v; n++; } } return s / n; });

  /** A ribbon along the shore: cols = [offset from shore, y, u]. */
  function ribbon(cols: [number, number, number][], color?: (ci: number) => THREE.Color) {
    const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
    const n = cols.length;
    for (let i = 0; i < zs.length; i++) for (let c = 0; c < n; c++) {
      pos.push(se[i] + cols[c][0], cols[c][1], zs[i]); uv.push(cols[c][2], zs[i] / 12);
      if (color) { const k = color(c); col.push(k.r, k.g, k.b); }
    }
    for (let i = 0; i < zs.length - 1; i++) for (let c = 0; c < n - 1; c++) { const a = i * n + c, b = a + 1, d = a + n, e = d + 1; idx.push(a, b, d, b, e, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    if (color) g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const sandNoise = tex(256, 256, (g) => {
    const d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = 200 + Math.random() * 55; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    g.globalAlpha = 0.08; g.strokeStyle = "#000";
    for (let y = 0; y < 256; y += 9) { g.beginPath(); for (let x = 0; x <= 256; x += 8) g.lineTo(x, y + Math.sin(x * 0.09 + y) * 2.5); g.stroke(); }
  });
  // dry → damp → wet sand down into the water
  const dry = new THREE.Color("#f1e0bc"), damp = new THREE.Color("#d9c49c"), wet = new THREE.Color("#bba582"), under = new THREE.Color("#8fb3a8");
  const sandG = ribbon([[-16, 0.05, 0], [-6, 0.05, 1.5], [-2.5, 0.045, 2.2], [0, -0.06, 2.6], [3, -0.34, 3], [9, -0.9, 4]], (c) => [dry, dry, damp, wet, wet, under][c]);
  const sand = new THREE.Mesh(sandG, new THREE.MeshStandardMaterial({ vertexColors: true, map: sandNoise, roughness: 0.55, metalness: 0 }));
  sand.receiveShadow = true; grp.add(sand);
  // turquoise shallows over the water
  const shallowT = tex(256, 4, (g) => { const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "rgba(120,235,220,0.75)"); gr.addColorStop(0.35, "rgba(60,200,205,0.45)"); gr.addColorStop(1, "rgba(20,120,150,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 4); });
  shallowT.wrapS = THREE.ClampToEdgeWrapping;
  const shallowG = ribbon([[1.5, -0.33, 0], [70, -0.33, 1]]);
  const shallow = new THREE.Mesh(shallowG, new THREE.MeshBasicMaterial({ map: shallowT, transparent: true, depthWrite: false, fog: true }));
  shallow.renderOrder = 2; grp.add(shallow);
  // foam lines (scrolling)
  const foamT = tex(64, 512, (g) => {
    g.clearRect(0, 0, 64, 512);
    for (let i = 0; i < 900; i++) { const y = Math.random() * 512, x = 20 + Math.random() * 24 + Math.sin(y * 0.05) * 6; g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`; g.beginPath(); g.ellipse(x, y, 2 + Math.random() * 7, 1 + Math.random() * 3, 0, 0, 7); g.fill(); }
    const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.45, "rgba(255,255,255,0.5)"); gr.addColorStop(0.55, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 512);
  });
  const foams: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; ph: number; base: number }[] = [];
  for (const [o, w, ph] of [[1.2, 3.2, 0], [7, 4, 2.1], [15, 5, 4.2]] as const) {
    const mat = new THREE.MeshBasicMaterial({ map: foamT.clone(), transparent: true, depthWrite: false, opacity: 0.8, fog: true });
    mat.map!.needsUpdate = true;
    const m = new THREE.Mesh(ribbon([[o, -0.3, 0], [o + w, -0.3, 1]]), mat);
    m.renderOrder = 3; grp.add(m); foams.push({ m, mat, ph, base: o });
  }

  // ── props ───────────────────────────────────────────────────────────
  const beaches = map.areas.filter((a) => a.k === "beach" && a.p.length > 40);
  const onBeach = (x: number, z: number) => beaches.some((a) => pip(a.p, x, z)) && world.onLand(x, z) && world.heightAt(x, z) === 0;
  const shoreAt = (z: number) => { const i = Math.max(0, Math.min(se.length - 1, Math.round((z - z0) / STEP))); return se[i]; };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), col = new THREE.Color();
  type Inst = { x: number; z: number; a: number; s?: number; c?: string };
  const umb: Inst[] = [], lng: Inst[] = [], tow: Inst[] = [], bush: Inst[] = [];
  const UMB = ["#ff4f7b", "#ffd23f", "#2ec4b6", "#3a86ff", "#ff7a1f", "#ffffff", "#8338ec", "#06d6a0"];
  const TOW = ["#ff006e", "#fb5607", "#ffbe0b", "#3a86ff", "#8338ec", "#06d6a0", "#ef476f", "#ffffff"];
  // rental rows: blocks of umbrellas with two loungers each, parallel to the water
  for (let z = B.z0 + 40; z < B.z1 - 40; z += 55 + r() * 50) {
    const e = shoreAt(z), rows = 2 + Math.floor(r() * 2), len = 6 + Math.floor(r() * 8);
    const c = UMB[Math.floor(r() * UMB.length)];
    for (let row = 0; row < rows; row++) for (let k = 0; k < len; k++) {
      const zz = z + k * 4.2, x = shoreAt(zz) - 22 - row * 6.5;
      if (!onBeach(x, zz)) continue;
      umb.push({ x, z: zz, a: r() * 6, c });
      for (const s of [-0.75, 0.75]) lng.push({ x: x + 1.2, z: zz + s, a: Math.PI / 2 });
    }
    void e;
  }
  // loose towels and private umbrellas
  for (let i = 0; i < 1400; i++) {
    const z = B.z0 + r() * (B.z1 - B.z0), x = shoreAt(z) - 8 - r() * 45;
    if (!onBeach(x, z)) continue;
    tow.push({ x, z, a: Math.PI / 2 + (r() - 0.5) * 0.6, c: TOW[Math.floor(r() * TOW.length)] });
    if (r() < 0.3) umb.push({ x: x - 1.2, z: z + 0.6, a: r() * 6, c: UMB[Math.floor(r() * UMB.length)] });
  }
  // dune shrubs on the land side of the sand
  for (let i = 0; i < 2600; i++) {
    const z = B.z0 + r() * (B.z1 - B.z0), x = shoreAt(z) - 52 - r() * 70;
    if (!onBeach(x, z)) continue;
    bush.push({ x, z, a: r() * 6, s: 0.6 + r() * 1.2 });
  }
  function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, list: Inst[], y: number, colors: boolean, shadow = true) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      q.setFromEuler(new THREE.Euler(0, it.a, 0)); const s = it.s ?? 1; sc.set(s, s * (it.s ? 0.6 : 1), s);
      pv.set(it.x, y, it.z); m4.compose(pv, q, sc); im.setMatrixAt(i, m4);
      if (colors) im.setColorAt(i, col.set(it.c || "#fff"));
    });
    im.castShadow = shadow; im.receiveShadow = true; grp.add(im);
    return im;
  }
  const poleM = new THREE.MeshStandardMaterial({ color: "#e8e2d4", roughness: 0.6 });
  const pole = new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6).translate(0, 1.15, 0);
  const canopy = new THREE.ConeGeometry(1.35, 0.5, 10, 1, true).translate(0, 2.25, 0);
  instanced(pole, poleM, umb, 0, false, false);
  instanced(canopy, new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), umb, 0, true);
  const lounger = mergeGeometries([
    new THREE.BoxGeometry(0.68, 0.08, 1.4).translate(0, 0.34, -0.15),
    new THREE.BoxGeometry(0.68, 0.08, 0.7).rotateX(-0.9).translate(0, 0.6, 0.78),
    new THREE.BoxGeometry(0.06, 0.32, 0.06).translate(-0.3, 0.16, -0.7), new THREE.BoxGeometry(0.06, 0.32, 0.06).translate(0.3, 0.16, -0.7),
    new THREE.BoxGeometry(0.06, 0.32, 0.06).translate(-0.3, 0.16, 0.5), new THREE.BoxGeometry(0.06, 0.32, 0.06).translate(0.3, 0.16, 0.5),
  ])!;
  instanced(lounger, new THREE.MeshStandardMaterial({ color: "#f6f3ec", roughness: 0.5 }), lng, 0, false);
  instanced(new THREE.PlaneGeometry(0.95, 1.9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.9 }), tow, 0.06, true, false);
  instanced(new THREE.IcosahedronGeometry(1, 1).translate(0, 0.45, 0), new THREE.MeshStandardMaterial({ color: "#4d7a35", roughness: 0.95, flatShading: true }), bush, 0, false);

  // lifeguard towers (only drawn when near)
  const towers: THREE.Group[] = [];
  let ti = 0;
  for (let z = B.z0 + 90; z < B.z1 - 60; z += 210) {
    let x = shoreAt(z) - 30;
    for (let k = 0; k < 6 && !onBeach(x, z); k++) x += 4;
    if (!onBeach(x, z)) continue;
    const t = makeLifeguardTower(ti++); t.position.set(x, 0, z); t.rotation.y = Math.PI / 2; grp.add(t); towers.push(t);
  }
  // jet ski rental kiosks: next to the spawn and further north
  const kiosks: { x: number; z: number; dock: { x: number; z: number } }[] = [];
  for (const zWant of [world.spawn.z + 30, world.spawn.z + 760, world.spawn.z - 680]) {
    let best: { x: number; z: number } | null = null;
    for (let dz = 0; dz < 200 && !best; dz += 10) for (const s of [1, -1]) {
      const z = zWant + dz * s, e = shoreAt(z);
      for (const off of [12, 16, 20, 9]) if (!best && onBeach(e - off, z)) best = { x: e - off, z };
    }
    if (!best || kiosks.some((k) => Math.abs(k.z - best!.z) < 200)) continue;
    const k = makeKiosk(lang === "en" ? "JET SKI RENTAL" : "JETSKI-VERLEIH");
    k.position.set(best.x, 0, best.z); k.rotation.y = Math.PI / 2; grp.add(k);
    k.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    // a little jetty with a buoy line
    const buoyM = new THREE.MeshStandardMaterial({ color: "#ff7a1f", roughness: 0.5 });
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), buoyM); b.position.set(shoreAt(best.z) + 6 + i * 2.5, -0.3, best.z + 9); grp.add(b); }
    kiosks.push({ x: best.x + 2.4, z: best.z, dock: { x: shoreAt(best.z) + 5, z: best.z } });
  }
  /** Spots on the sand near the water where people stand around. */
  const standSpot = (z: number) => { const x = shoreAt(z) - 4 - r() * 14; return onBeach(x, z) || world.onLand(x, z) ? { x, z } : null; };

  function update(t: number, px: number, pz: number) {
    for (const f of foams) {
      const k = Math.sin(t * 0.55 + f.ph);
      f.m.position.x = k * 1.6 - 0.8;
      f.mat.opacity = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.55 + f.ph + 1.2));
      f.mat.map!.offset.y = t * 0.01 + f.ph;
    }
    for (const tw of towers) tw.visible = Math.abs(tw.position.z - pz) < 420 && Math.abs(tw.position.x - px) < 600;
  }
  return { update, kiosks, towers, standSpot, shoreAt };
}
