import * as THREE from "three";
import type { SBMap } from "@/lib/southbeach/osm.mjs";

export type Graph = { x: Float32Array; z: Float32Array; adj: number[][]; count: number };
export type Poly = { p: number[]; h: number; minx: number; maxx: number; minz: number; maxz: number };
export type World = {
  bounds: { x0: number; x1: number; z0: number; z1: number };
  polys: Poly[];
  near: (x: number, z: number, r: number) => Poly[];
  heightAt: (x: number, z: number) => number;
  onLand: (x: number, z: number) => boolean;
  pushCircle: (o: { x: number; z: number; vx?: number; vz?: number }, r: number) => number;
  shore: (z: number) => { e: number; w: number };
  roads: Graph;
  walks: Graph;
  nearestNode: (g: Graph, x: number, z: number) => number;
  minimap: HTMLCanvasElement;
  mmScale: number;
  spawn: { x: number; z: number; a: number };
  neonMat: THREE.MeshBasicMaterial;
  windowMat: THREE.MeshStandardMaterial;
  lampMat: THREE.MeshBasicMaterial;
  roadNames: { n: string; x: number; z: number }[];
};

const rnd = (seed: number) => {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
function pointInPoly(p: number[], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], zi = p[i + 1], xj = p[j], zj = p[j + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function noiseFill(g: CanvasRenderingContext2D, w: number, h: number, base: [number, number, number], amp: number, seed: number) {
  const img = g.createImageData(w, h), r = rnd(seed);
  for (let i = 0; i < w * h; i++) { const n = (r() - 0.5) * amp; img.data[i * 4] = base[0] + n; img.data[i * 4 + 1] = base[1] + n; img.data[i * 4 + 2] = base[2] + n; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}

// Art-deco pastel palette of Miami Beach
const PASTEL = ["#f4efe6", "#f7d9d0", "#cfeee5", "#f9e4b7", "#d7e7f6", "#f5c9d8", "#e8f3d8", "#fbe7d6", "#ffffff", "#e9dff5", "#bfe6ee", "#f2d1a8"];
const NEON = ["#ff2fa0", "#21e6ff", "#a95cff", "#4dffb3", "#ffb21f"];

function graphFrom(lines: { p: number[]; off?: number }[]): Graph {
  const key = new Map<string, number>(), xs: number[] = [], zs: number[] = [], adj: number[][] = [];
  const id = (x: number, z: number) => {
    const k = Math.round(x * 2) + "," + Math.round(z * 2);
    let i = key.get(k);
    if (i === undefined) { i = xs.length; key.set(k, i); xs.push(x); zs.push(z); adj.push([]); }
    return i;
  };
  for (const l of lines) {
    let prev = -1;
    for (let i = 0; i < l.p.length; i += 2) {
      const n = id(l.p[i], l.p[i + 1]);
      if (prev >= 0 && prev !== n && !adj[prev].includes(n)) { adj[prev].push(n); adj[n].push(prev); }
      prev = n;
    }
  }
  return { x: Float32Array.from(xs), z: Float32Array.from(zs), adj, count: xs.length };
}

export function buildWorld(map: SBMap, scene: THREE.Scene, aniso: number): World {
  const B = map.bounds;
  const r = rnd(1985);

  // ── shoreline: per 5 m row the ocean (east) and bay (west) coast x ─────────────
  const ROW = 5, zStart = B.z0 - 400, rows = Math.ceil((B.z1 - B.z0 + 800) / ROW);
  const east = new Float32Array(rows).fill(NaN), west = new Float32Array(rows).fill(NaN);
  for (const c of map.coast) {
    for (let i = 0; i + 3 < c.length; i += 2) {
      const ax = c[i], az = c[i + 1], bx = c[i + 2], bz = c[i + 3];
      const r0 = Math.ceil((Math.min(az, bz) - zStart) / ROW), r1 = Math.floor((Math.max(az, bz) - zStart) / ROW);
      for (let k = Math.max(0, r0); k <= Math.min(rows - 1, r1); k++) {
        const z = zStart + k * ROW, t = (z - az) / (bz - az || 1e-9), x = ax + (bx - ax) * t;
        if (x > -250) east[k] = isNaN(east[k]) ? x : Math.min(east[k], x);
        else west[k] = isNaN(west[k]) ? x : Math.max(west[k], x);
      }
    }
  }
  const fillGaps = (a: Float32Array, def: number) => {
    let last = NaN;
    for (let k = 0; k < rows; k++) { if (!isNaN(a[k])) last = a[k]; else if (!isNaN(last)) a[k] = last; }
    last = NaN;
    for (let k = rows - 1; k >= 0; k--) { if (!isNaN(a[k])) last = a[k]; else a[k] = isNaN(last) ? def : last; }
  };
  fillGaps(east, B.x1 + 250); fillGaps(west, B.x0 - 250);
  const rowOf = (z: number) => Math.max(0, Math.min(rows - 1, Math.round((z - zStart) / ROW)));
  const onLand = (x: number, z: number) => { const k = rowOf(z); return x < east[k] - 1 && x > west[k] + 1; };

  // ── ground (land polygon) ─────────────────────────────────────────────
  const grp = new THREE.Group();
  scene.add(grp);
  const zA = B.z0 - 120, zB = B.z1 + 120;
  const shape = new THREE.Shape();
  let first = true;
  for (let z = zA; z <= zB; z += ROW) { const x = east[rowOf(z)]; if (first) { shape.moveTo(x, -z); first = false; } else shape.lineTo(x, -z); }
  for (let z = zB; z >= zA; z -= ROW) shape.lineTo(west[rowOf(z)], -z);
  const landGeo = new THREE.ShapeGeometry(shape);
  landGeo.rotateX(-Math.PI / 2);
  const groundTex = canvasTex(512, 512, (g) => { noiseFill(g, 512, 512, [128, 124, 116], 26, 3); g.globalAlpha = 0.12; g.strokeStyle = "#000"; for (let i = 0; i < 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); } });
  groundTex.repeat.set(1 / 8, 1 / 8);
  setUv(landGeo, 1);
  const land = new THREE.Mesh(landGeo, new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, color: "#cfc7b8" }));
  land.receiveShadow = true;
  grp.add(land);

  // ── areas: beach, parks, parking ────────────────────────────────────────
  const sandTex = canvasTex(512, 512, (g) => {
    noiseFill(g, 512, 512, [236, 219, 184], 26, 5);
    const rr = rnd(77);
    // soft colour patches, wind ripples, footprints and shell specks
    for (let i = 0; i < 60; i++) { g.globalAlpha = 0.06; g.fillStyle = rr() < 0.5 ? "#c9ad7c" : "#fff6e0"; g.beginPath(); g.ellipse(rr() * 512, rr() * 512, 30 + rr() * 80, 20 + rr() * 50, rr() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 0.09; g.strokeStyle = "#8a7048"; g.lineWidth = 1.4;
    for (let y = 0; y < 512; y += 7 + rr() * 5) { g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x * 0.03 + y * 0.7) * 3); g.stroke(); }
    g.globalAlpha = 0.13; g.fillStyle = "#9c8058";
    for (let i = 0; i < 70; i++) { const x = rr() * 512, y = rr() * 512, a = rr() * 6; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + Math.cos(a) * k * 16 + (k % 2 ? 4 : -4) * Math.sin(a), y + Math.sin(a) * k * 16 - (k % 2 ? 4 : -4) * Math.cos(a), 3.2, 1.8, a, 0, 7); g.fill(); } }
    g.globalAlpha = 0.5; for (let i = 0; i < 500; i++) { g.fillStyle = rr() < 0.5 ? "#fffaf0" : "#8d7650"; g.fillRect(rr() * 512, rr() * 512, 1.3, 1.3); }
    g.globalAlpha = 1;
  });
  const grassTex = canvasTex(512, 512, (g) => { noiseFill(g, 512, 512, [86, 122, 62], 40, 7); });
  sandTex.repeat.set(1 / 6, 1 / 6); grassTex.repeat.set(1 / 5, 1 / 5);
  const areaMat: Record<string, THREE.Material> = {
    beach: new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1, color: "#fff3dc" }),
    park: new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, color: "#b9d49a" }),
    pitch: new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, color: "#9fd07f" }),
    parking: new THREE.MeshStandardMaterial({ color: "#3d3d42", roughness: 0.9 }),
    water: new THREE.MeshStandardMaterial({ color: "#1d6f86", roughness: 0.15, metalness: 0.1 }),
  };
  const areaGeos: Record<string, THREE.BufferGeometry[]> = {};
  for (const a of map.areas) {
    if (a.p.length < 6) continue;
    const s = new THREE.Shape();
    s.moveTo(a.p[0], -a.p[1]);
    for (let i = 2; i < a.p.length; i += 2) s.lineTo(a.p[i], -a.p[i + 1]);
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    g.translate(0, a.k === "beach" ? 0.03 : 0.04, 0);
    setUv(g, 1);
    (areaGeos[a.k] ||= []).push(g);
  }
  for (const k in areaGeos) {
    const m = new THREE.Mesh(merge(areaGeos[k]), areaMat[k]);
    m.receiveShadow = true;
    grp.add(m);
  }

  // ── roads ───────────────────────────────────────────────────────────────
  const asphalt = canvasTex(512, 512, (g) => { noiseFill(g, 512, 512, [58, 58, 62], 22, 9); g.globalAlpha = 0.25; for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? "#222" : "#555"; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 60, 8 + Math.random() * 20, Math.random() * 3, 0, 7); g.fill(); } });
  const paving = canvasTex(256, 256, (g) => { noiseFill(g, 256, 256, [206, 196, 178], 18, 11); g.strokeStyle = "rgba(90,80,70,0.35)"; g.lineWidth = 2; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } });
  asphalt.anisotropy = paving.anisotropy = aniso;
  const roadG: THREE.BufferGeometry[] = [], walkG: THREE.BufferGeometry[] = [], markG: THREE.BufferGeometry[] = [];
  for (const rd of map.roads) {
    if (rd.p.length < 4) continue;
    const y = rd.t === "car" ? 0.07 : rd.t === "ped" ? 0.06 : 0.065;
    const g = ribbon(rd.p, rd.w, y, rd.t === "car" ? 10 : 3);
    if (g) (rd.t === "car" ? roadG : walkG).push(g);
    if (rd.t === "car" && rd.w >= 8) {
      // dashed centre line
      let acc = 0;
      for (let i = 0; i + 3 < rd.p.length; i += 2) {
        const ax = rd.p[i], az = rd.p[i + 1], bx = rd.p[i + 2], bz = rd.p[i + 3], L = Math.hypot(bx - ax, bz - az);
        for (let s = (9 - (acc % 9)) % 9; s < L - 3; s += 9) {
          const t0 = s / L, t1 = (s + 3) / L;
          const d = ribbon([ax + (bx - ax) * t0, az + (bz - az) * t0, ax + (bx - ax) * t1, az + (bz - az) * t1], rd.w >= 12 ? 0.3 : 0.18, 0.085, 1);
          if (d) markG.push(d);
        }
        acc += L;
      }
    }
  }
  if (roadG.length) { const m = new THREE.Mesh(merge(roadG), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.82, color: "#ffffff" })); m.receiveShadow = true; grp.add(m); }
  if (walkG.length) { const m = new THREE.Mesh(merge(walkG), new THREE.MeshStandardMaterial({ map: paving, roughness: 0.9 })); m.receiveShadow = true; grp.add(m); }
  if (markG.length) grp.add(new THREE.Mesh(merge(markG), new THREE.MeshStandardMaterial({ color: "#f3d36b", roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })));

  // ── buildings ───────────────────────────────────────────────────────────
  const oceanDr = map.roads.filter((x) => x.n === "Ocean Drive");
  const oceanX = oceanDr.length ? oceanDr[0].p.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (oceanDr[0].p.length / 2) : 1e9;
  const facade = makeFacade(false), lit = makeFacade(true);
  facade.anisotropy = lit.anisotropy = aniso;
  const wallPos: number[] = [], wallNor: number[] = [], wallUv: number[] = [], wallCol: number[] = [];
  const roofPos: number[] = [], neonPos: number[] = [], neonCol: number[] = [];
  const polys: Poly[] = [];
  const col = new THREE.Color();
  for (const b of map.buildings) {
    const p = b.p, n = p.length / 2;
    if (n < 3) continue;
    const h = Math.max(3.5, b.h);
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9, cx = 0;
    for (let i = 0; i < n; i++) { minx = Math.min(minx, p[i * 2]); maxx = Math.max(maxx, p[i * 2]); minz = Math.min(minz, p[i * 2 + 1]); maxz = Math.max(maxz, p[i * 2 + 1]); cx += p[i * 2]; }
    cx /= n;
    polys.push({ p, h, minx, maxx, minz, maxz });
    const deco = h < 26 && (b.k === "hotel" || Math.abs(cx - oceanX) < 70);
    col.set(b.c && /^#?[0-9a-f]{6}$/i.test(b.c) ? (b.c[0] === "#" ? b.c : "#" + b.c) : PASTEL[Math.floor(r() * PASTEL.length)]);
    if (!deco && h > 30) col.lerp(new THREE.Color("#cfd6dc"), 0.6);
    const uOff = Math.floor(r() * 4) * 0.25, vOff = Math.floor(r() * 4) * 0.25;
    let along = 0;
    for (let i = 0; i < n; i++) {
      const ax = p[i * 2], az = p[i * 2 + 1], bx = p[((i + 1) % n) * 2], bz = p[((i + 1) % n) * 2 + 1];
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      const nx = dz / L, nz = -dx / L;
      const u0 = uOff + along / 16, u1 = uOff + (along + L) / 16, v1 = vOff + h / 13.2;
      // a0 a1 b1 / a0 b1 b0
      const quad = [[ax, 0, az, u0, vOff], [ax, h, az, u0, v1], [bx, h, bz, u1, v1], [ax, 0, az, u0, vOff], [bx, h, bz, u1, v1], [bx, 0, bz, u1, vOff]];
      for (const q of quad) { wallPos.push(q[0], q[1], q[2]); wallNor.push(nx, 0, nz); wallUv.push(q[3], q[4]); wallCol.push(col.r, col.g, col.b); }
      along += L;
      if (deco && L > 6) {
        // neon tube along the top edge + a vertical strip at the corner
        const nc = new THREE.Color(NEON[Math.floor(r() * NEON.length)]);
        const off = 0.12;
        box(neonPos, neonCol, nc, ax + nx * off, h - 1.1, az + nz * off, bx + nx * off, h - 1.1, bz + nz * off, 0.12);
        if (r() < 0.5) box(neonPos, neonCol, nc, ax + nx * off, 3.2, az + nz * off, ax + nx * off, h - 1.4, az + nz * off, 0.1);
      }
    }
    // roof
    const contour = [];
    for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(p[i * 2], p[i * 2 + 1]));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const t of tris) {
      const a = contour[t[0]], b2 = contour[t[1]], c = contour[t[2]];
      const cross = (b2.x - a.x) * (c.y - a.y) - (b2.y - a.y) * (c.x - a.x);
      const o = cross > 0 ? [a, c, b2] : [a, b2, c];
      for (const v of o) roofPos.push(v.x, h, v.y);
    }
  }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute("position", new THREE.Float32BufferAttribute(wallPos, 3));
  wallGeo.setAttribute("normal", new THREE.Float32BufferAttribute(wallNor, 3));
  wallGeo.setAttribute("uv", new THREE.Float32BufferAttribute(wallUv, 2));
  wallGeo.setAttribute("color", new THREE.Float32BufferAttribute(wallCol, 3));
  const windowMat = new THREE.MeshStandardMaterial({ map: facade, vertexColors: true, roughness: 0.55, metalness: 0.05, emissiveMap: lit, emissive: new THREE.Color("#ffd29a"), emissiveIntensity: 0 });
  const walls = new THREE.Mesh(wallGeo, windowMat);
  walls.castShadow = true; walls.receiveShadow = true;
  grp.add(walls);
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute("position", new THREE.Float32BufferAttribute(roofPos, 3));
  roofGeo.computeVertexNormals();
  const roofs = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: "#b9b2a6", roughness: 0.95 }));
  roofs.castShadow = true; roofs.receiveShadow = true;
  grp.add(roofs);
  const neonMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  if (neonPos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(neonPos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(neonCol, 3));
    grp.add(new THREE.Mesh(g, neonMat));
  }

  // ── collision grid ──────────────────────────────────────────────────────
  const CELL = 25, grid = new Map<number, number[]>();
  const gk = (i: number, j: number) => i * 100003 + j;
  polys.forEach((q, idx) => {
    for (let i = Math.floor(q.minx / CELL); i <= Math.floor(q.maxx / CELL); i++)
      for (let j = Math.floor(q.minz / CELL); j <= Math.floor(q.maxz / CELL); j++) { const k = gk(i, j); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(idx); }
  });
  const seen = new Uint32Array(polys.length);
  let stamp = 1;
  const near = (x: number, z: number, rad: number) => {
    stamp++;
    const out: Poly[] = [];
    for (let i = Math.floor((x - rad) / CELL); i <= Math.floor((x + rad) / CELL); i++)
      for (let j = Math.floor((z - rad) / CELL); j <= Math.floor((z + rad) / CELL); j++) {
        const a = grid.get(gk(i, j)); if (!a) continue;
        for (const idx of a) { if (seen[idx] === stamp) continue; seen[idx] = stamp; const q = polys[idx]; if (x + rad < q.minx || x - rad > q.maxx || z + rad < q.minz || z - rad > q.maxz) continue; out.push(q); }
      }
    return out;
  };
  const heightAt = (x: number, z: number) => { for (const q of near(x, z, 0)) if (pointInPoly(q.p, x, z)) return q.h; return 0; };
  const pushCircle = (o: { x: number; z: number; vx?: number; vz?: number }, rad: number) => {
    let imp = 0;
    for (let it = 0; it < 2; it++)
      for (const q of near(o.x, o.z, rad)) {
        const p = q.p, n = p.length / 2;
        let best = 1e9, bx = 0, bz = 0;
        for (let i = 0; i < n; i++) {
          const ax = p[i * 2], az = p[i * 2 + 1], cx = p[((i + 1) % n) * 2], cz = p[((i + 1) % n) * 2 + 1];
          const dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz || 1e-9;
          const t = Math.max(0, Math.min(1, ((o.x - ax) * dx + (o.z - az) * dz) / L2));
          const px = ax + dx * t, pz = az + dz * t, d = (o.x - px) ** 2 + (o.z - pz) ** 2;
          if (d < best) { best = d; bx = px; bz = pz; }
        }
        const inside = pointInPoly(p, o.x, o.z), d = Math.sqrt(best);
        if (!inside && d >= rad) continue;
        let nx = o.x - bx, nz = o.z - bz;
        const l = Math.hypot(nx, nz) || 1;
        nx /= l; nz /= l;
        if (inside) { nx = -nx; nz = -nz; }
        const pen = inside ? d + rad : rad - d;
        o.x += nx * pen; o.z += nz * pen;
        if (o.vx !== undefined && o.vz !== undefined) {
          const vn = o.vx * nx + o.vz * nz;
          if (vn < 0) { o.vx -= 1.3 * vn * nx; o.vz -= 1.3 * vn * nz; o.vx *= 0.85; o.vz *= 0.85; imp = Math.max(imp, -vn); }
        }
      }
    // the sea is a wall too
    const k = rowOf(o.z);
    if (o.x > east[k] - rad - 1) { o.x = east[k] - rad - 1; if (o.vx !== undefined && o.vx > 0) { imp = Math.max(imp, o.vx); o.vx *= -0.3; } }
    if (o.x < west[k] + rad + 1) { o.x = west[k] + rad + 1; if (o.vx !== undefined && o.vx < 0) { imp = Math.max(imp, -o.vx); o.vx *= -0.3; } }
    o.z = Math.max(B.z0 - 100, Math.min(B.z1 + 100, o.z));
    return imp;
  };

  // ── road graphs ─────────────────────────────────────────────────────────
  const carLines = map.roads.filter((x) => x.t === "car" && x.w >= 5.5);
  const roads = graphFrom(carLines);
  let walkLines = map.roads.filter((x) => x.t !== "car");
  if (walkLines.length < 20) walkLines = carLines;
  const walks = graphFrom(walkLines);
  const nearestNode = (g: Graph, x: number, z: number) => { let bi = 0, bd = 1e18; for (let i = 0; i < g.count; i++) { if (!g.adj[i].length) continue; const d = (g.x[i] - x) ** 2 + (g.z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };

  // ── palms & lamps (instanced) ─────────────────────────────────────────
  const palmSpots: number[] = [], lampSpots: number[] = [];
  const free = (x: number, z: number) => onLand(x, z) && heightAt(x, z) === 0 && !near(x, z, 2.2).length;
  for (const rd of map.roads) {
    if (rd.t !== "car" || rd.w < 8) continue;
    let acc = 0;
    for (let i = 0; i + 3 < rd.p.length; i += 2) {
      const ax = rd.p[i], az = rd.p[i + 1], bx = rd.p[i + 2], bz = rd.p[i + 3], L = Math.hypot(bx - ax, bz - az);
      if (L < 1) continue;
      const nx = (bz - az) / L, nz = -(bx - ax) / L;
      for (let s = 6; s < L; s += 7) {
        acc += 7;
        const x = ax + ((bx - ax) * s) / L, z = az + ((bz - az) * s) / L;
        const side = Math.floor(acc / 7) % 2 ? 1 : -1;
        const o = rd.w / 2 + 1.4;
        if (Math.floor(acc / 7) % 3 === 0 && free(x + nx * o, z + nz * o)) palmSpots.push(x + nx * o, z + nz * o, r());
        if (Math.floor(acc / 7) % 3 === 1 && free(x - nx * o, z - nz * o) && r() < 0.6) palmSpots.push(x - nx * o, z - nz * o, r());
        if (Math.floor(acc / 7) % 5 === 0) { const lx = x + nx * (rd.w / 2 + 0.6) * side, lz = z + nz * (rd.w / 2 + 0.6) * side; if (free(lx, lz)) lampSpots.push(lx, lz, Math.atan2(-nx * side, -nz * side)); }
      }
    }
  }
  for (const a of map.areas) {
    if (a.k !== "park" && a.k !== "beach") continue;
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (let i = 0; i < a.p.length; i += 2) { minx = Math.min(minx, a.p[i]); maxx = Math.max(maxx, a.p[i]); minz = Math.min(minz, a.p[i + 1]); maxz = Math.max(maxz, a.p[i + 1]); }
    const count = Math.min(220, ((maxx - minx) * (maxz - minz)) / (a.k === "park" ? 260 : 900));
    for (let k = 0; k < count; k++) { const x = minx + r() * (maxx - minx), z = minz + r() * (maxz - minz); if (pointInPoly(a.p, x, z) && free(x, z)) palmSpots.push(x, z, r()); }
  }
  const palmCount = Math.min(2400, palmSpots.length / 3);
  const { trunk, fronds } = palmGeometry();
  const trunkMesh = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.9 }), palmCount);
  const frondMesh = new THREE.InstancedMesh(fronds, new THREE.MeshStandardMaterial({ color: "#5f9a3e", roughness: 0.8, side: THREE.DoubleSide }), palmCount);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3();
  for (let i = 0; i < palmCount; i++) {
    const x = palmSpots[i * 3], z = palmSpots[i * 3 + 1], v = palmSpots[i * 3 + 2];
    q4.setFromEuler(new THREE.Euler(0, v * Math.PI * 2, 0));
    const sc = 0.8 + v * 0.55;
    s4.set(sc, sc, sc);
    m4.compose(new THREE.Vector3(x, 0, z), q4, s4);
    trunkMesh.setMatrixAt(i, m4); frondMesh.setMatrixAt(i, m4);
  }
  trunkMesh.castShadow = frondMesh.castShadow = true;
  grp.add(trunkMesh, frondMesh);
  const lampCount = lampSpots.length / 3;
  const pole = new THREE.CylinderGeometry(0.08, 0.12, 6.5, 6); pole.translate(0, 3.25, 0);
  const arm = new THREE.BoxGeometry(0.08, 0.08, 1.6); arm.translate(0, 6.4, 0.75);
  const poleMesh = new THREE.InstancedMesh(merge([pole, arm]), new THREE.MeshStandardMaterial({ color: "#2b2f36", roughness: 0.5, metalness: 0.6 }), lampCount);
  const bulbGeo = new THREE.BoxGeometry(0.5, 0.14, 0.7); bulbGeo.translate(0, 6.3, 1.45);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd9a0"), toneMapped: false });
  const bulbMesh = new THREE.InstancedMesh(bulbGeo, lampMat, lampCount);
  for (let i = 0; i < lampCount; i++) { m4.compose(new THREE.Vector3(lampSpots[i * 3], 0, lampSpots[i * 3 + 1]), q4.setFromEuler(new THREE.Euler(0, lampSpots[i * 3 + 2], 0)), s4.set(1, 1, 1)); poleMesh.setMatrixAt(i, m4); bulbMesh.setMatrixAt(i, m4); }
  poleMesh.castShadow = true;
  grp.add(poleMesh, bulbMesh);

  // ── minimap (1 px = 2 m) ─────────────────────────────────────────────────
  const mmScale = 0.5;
  const mm = document.createElement("canvas");
  const mx0 = B.x0 - 300, mz0 = B.z0 - 300;
  mm.width = Math.ceil((B.x1 - B.x0 + 600) * mmScale); mm.height = Math.ceil((B.z1 - B.z0 + 600) * mmScale);
  const g = mm.getContext("2d")!;
  g.fillStyle = "#2a7f9c"; g.fillRect(0, 0, mm.width, mm.height);
  g.fillStyle = "#c9c2b5"; g.beginPath();
  for (let z = zA; z <= zB; z += ROW) g.lineTo((east[rowOf(z)] - mx0) * mmScale, (z - mz0) * mmScale);
  for (let z = zB; z >= zA; z -= ROW) g.lineTo((west[rowOf(z)] - mx0) * mmScale, (z - mz0) * mmScale);
  g.fill();
  const poly = (p: number[]) => { g.beginPath(); for (let i = 0; i < p.length; i += 2) g.lineTo((p[i] - mx0) * mmScale, (p[i + 1] - mz0) * mmScale); g.closePath(); };
  for (const a of map.areas) { g.fillStyle = a.k === "beach" ? "#ecd9a8" : a.k === "water" ? "#2a7f9c" : a.k === "parking" ? "#8c8a88" : "#7fae5e"; poly(a.p); g.fill(); }
  g.lineCap = "round"; g.lineJoin = "round";
  for (const rd of map.roads) { g.strokeStyle = rd.t === "car" ? "#fdfdfd" : "#e6dccb"; g.lineWidth = Math.max(1, rd.w * mmScale * (rd.t === "car" ? 1.2 : 0.8)); g.beginPath(); for (let i = 0; i < rd.p.length; i += 2) g.lineTo((rd.p[i] - mx0) * mmScale, (rd.p[i + 1] - mz0) * mmScale); g.stroke(); }
  g.fillStyle = "#8d8a95";
  for (const q of polys) { poly(q.p); g.fill(); }
  (mm as HTMLCanvasElement & { ox: number; oz: number }).ox = mx0;
  (mm as HTMLCanvasElement & { ox: number; oz: number }).oz = mz0;

  // ── spawn: Ocean Drive (or the centre) ──────────────────────────────────
  let spawn = { x: 0, z: 0, a: 0 };
  {
    // middle of Ocean Drive (around 10th Street), else the most central car road point
    const cand = oceanDr.length ? oceanDr : carLines;
    let bd = 1e18;
    for (const rd of cand)
      for (let i = 0; i + 3 < rd.p.length; i += 2) {
        const d = rd.p[i] ** 2 * 0.2 + rd.p[i + 1] ** 2;
        if (d < bd) { bd = d; spawn = { x: rd.p[i], z: rd.p[i + 1], a: Math.atan2(rd.p[i + 2] - rd.p[i], rd.p[i + 3] - rd.p[i + 1]) }; }
      }
    // step onto the sidewalk on the beach side
    for (let k = 0; k < 12 && near(spawn.x + 7, spawn.z, 1.5).length === 0 && onLand(spawn.x + 7, spawn.z); k++) { spawn.x += 7; break; }
  }
  const roadNames: { n: string; x: number; z: number }[] = [];
  for (const rd of map.roads) if (rd.n && rd.t !== "foot") for (let i = 0; i < rd.p.length; i += 2) roadNames.push({ n: rd.n, x: rd.p[i], z: rd.p[i + 1] });

  return { bounds: B, polys, near, heightAt, onLand, pushCircle, shore: (z: number) => { const k = rowOf(z); return { e: east[k], w: west[k] }; }, roads, walks, nearestNode, minimap: mm, mmScale, spawn, neonMat, windowMat, lampMat, roadNames };
}

function setUv(g: THREE.BufferGeometry, scale: number) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * scale; uv[i * 2 + 1] = p.getZ(i) * scale; }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
function merge(list: THREE.BufferGeometry[]) {
  // tiny merge for non-indexed / indexed geometries with the same attributes
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = Object.keys(geos[0].attributes);
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = geos[0].attributes[n].itemSize;
    let total = 0;
    for (const g of geos) total += g.attributes[n] ? g.attributes[n].count : g.attributes.position.count;
    const arr = new Float32Array(total * size);
    let o = 0;
    for (const g of geos) { const a = g.attributes[n]; if (a) arr.set(a.array as Float32Array, o); o += (a ? a.count : g.attributes.position.count) * size; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  if (!out.attributes.normal) out.computeVertexNormals();
  return out;
}
function ribbon(p: number[], w: number, y: number, uvScale: number) {
  const n = p.length / 2;
  if (n < 2) return null;
  const pos: number[] = [], uv: number[] = [], nor: number[] = [];
  let along = 0;
  const L: number[] = [], R: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = p[i * 2], z = p[i * 2 + 1];
    const px = i > 0 ? p[i * 2 - 2] : x, pz = i > 0 ? p[i * 2 - 1] : z, nx2 = i < n - 1 ? p[i * 2 + 2] : x, nz2 = i < n - 1 ? p[i * 2 + 3] : z;
    let dx = nx2 - px, dz = nz2 - pz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    L.push(x - dz * (w / 2), z + dx * (w / 2)); R.push(x + dz * (w / 2), z - dx * (w / 2));
  }
  for (let i = 0; i < n - 1; i++) {
    const seg = Math.hypot(p[i * 2 + 2] - p[i * 2], p[i * 2 + 3] - p[i * 2 + 1]);
    const u0 = along / uvScale, u1 = (along + seg) / uvScale;
    along += seg;
    const a = [L[i * 2], y, L[i * 2 + 1], 0, u0], b = [R[i * 2], y, R[i * 2 + 1], 1, u0], c = [L[i * 2 + 2], y, L[i * 2 + 3], 0, u1], d = [R[i * 2 + 2], y, R[i * 2 + 3], 1, u1];
    // make both triangles face up
    for (const t of [[a, b, c], [b, d, c]]) {
      const cr = (t[1][0] - t[0][0]) * (t[2][2] - t[0][2]) - (t[1][2] - t[0][2]) * (t[2][0] - t[0][0]);
      const o = cr < 0 ? t : [t[0], t[2], t[1]];
      for (const v of o) { pos.push(v[0], v[1], v[2]); uv.push(v[3] * (w / uvScale), v[4]); nor.push(0, 1, 0); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
function box(pos: number[], cols: number[], c: THREE.Color, ax: number, ay: number, az: number, bx: number, by: number, bz: number, t: number) {
  // thin box between two points (used for neon tubes)
  const d = new THREE.Vector3(bx - ax, by - ay, bz - az), L = d.length();
  if (L < 0.01) return;
  const g = new THREE.BoxGeometry(t, t, L);
  g.lookAt(d);
  g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  const nonIdx = g.toNonIndexed();
  const a = nonIdx.attributes.position.array;
  for (let i = 0; i < a.length; i++) pos.push(a[i]);
  for (let i = 0; i < a.length / 3; i++) cols.push(c.r * 2.2, c.g * 2.2, c.b * 2.2);
}
function makeFacade(litOnly: boolean) {
  // 4 bays x 4 floors (16 m x 13.2 m) per tile
  return canvasTex(1024, 1024, (g) => {
    const r = rnd(litOnly ? 77 : 77);
    if (litOnly) { g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024); }
    else { noiseFill(g, 1024, 1024, [236, 232, 224], 14, 13); }
    for (let fy = 0; fy < 4; fy++)
      for (let bx = 0; bx < 4; bx++) {
        const x = bx * 256, y = fy * 256;
        const on = r() < 0.42;
        if (litOnly) {
          if (on) { g.fillStyle = r() < 0.5 ? "#ffcf8a" : "#ffe2b8"; g.fillRect(x + 46, y + 56, 164, 132); }
          continue;
        }
        // ledge / art-deco band
        g.fillStyle = "rgba(0,0,0,0.07)"; g.fillRect(x, y + 236, 256, 20);
        g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x, y + 232, 256, 4);
        // window frame + glass with sky reflection
        g.fillStyle = "#e9e4da"; g.fillRect(x + 38, y + 48, 180, 148);
        const gr = g.createLinearGradient(0, y + 56, 0, y + 188);
        gr.addColorStop(0, "#5e7f97"); gr.addColorStop(0.55, "#2c3f52"); gr.addColorStop(1, "#1b2633");
        g.fillStyle = gr; g.fillRect(x + 46, y + 56, 164, 132);
        g.fillStyle = "rgba(255,255,255,0.14)"; g.beginPath(); g.moveTo(x + 46, y + 56); g.lineTo(x + 120, y + 56); g.lineTo(x + 46, y + 150); g.fill();
        g.fillStyle = "#e9e4da"; g.fillRect(x + 125, y + 56, 6, 132);
        if (r() < 0.3) { g.fillStyle = "rgba(240,230,210,0.9)"; g.fillRect(x + 46, y + 56, 164, 30 + r() * 60); } // blinds
      }
  });
}
function palmGeometry() {
  const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, 3, 0), new THREE.Vector3(0.9, 6, 0), new THREE.Vector3(1.4, 9, 0));
  const trunk = new THREE.TubeGeometry(curve, 10, 0.2, 6, false);
  const pos = trunk.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), k = 1.25 - y / 18; pos.setX(i, (pos.getX(i) - curve.getPoint(Math.min(1, y / 9)).x) * k + curve.getPoint(Math.min(1, y / 9)).x); pos.setZ(i, pos.getZ(i) * k); }
  trunk.computeVertexNormals();
  const top = new THREE.Vector3(1.4, 9, 0);
  const leaves: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.2;
    const pts: number[] = [];
    const seg = 7, len = 3.6 + (i % 3) * 0.5;
    for (let s = 0; s < seg; s++) {
      const t0 = s / seg, t1 = (s + 1) / seg;
      const w0 = Math.sin(t0 * Math.PI) * 0.55, w1 = Math.sin(t1 * Math.PI) * 0.55;
      const y0 = Math.sin(t0 * 1.7) * 0.9 - t0 * t0 * 2.4, y1 = Math.sin(t1 * 1.7) * 0.9 - t1 * t1 * 2.4;
      const p0 = [t0 * len, y0], p1 = [t1 * len, y1];
      pts.push(p0[0], p0[1], -w0, p1[0], p1[1], -w1, p1[0], p1[1], w1, p0[0], p0[1], -w0, p1[0], p1[1], w1, p0[0], p0[1], w0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.rotateY(a);
    g.translate(top.x, top.y, top.z);
    g.computeVertexNormals();
    leaves.push(g);
  }
  return { trunk, fronds: merge(leaves) };
}
