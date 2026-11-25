import * as THREE from "three";

/** Arena size (metres). x = across, z = along (goals at z = ±L/2), y = up. */
export const A = { W: 82, L: 112, H: 28, RC: 14, GW: 18, GH: 7.2, GD: 9, FIL: 6 };
export const BLUE = new THREE.Color("#1f7bff"), ORANGE = new THREE.Color("#ff7a12");

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Rounded rectangle outline in xz (counter-clockwise), used for walls, lines and stands. */
export function rrect(hw: number, hl: number, r: number, seg = 10) {
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [[hw - r, hl - r, 0], [-(hw - r), hl - r, Math.PI / 2], [-(hw - r), -(hl - r), Math.PI], [hw - r, -(hl - r), Math.PI * 1.5]];
  for (const [cx, cz, a0] of corners) for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return pts;
}

export function buildArena(scene: THREE.Scene) {
  const { W, L, H, RC, GW, GH, GD } = A;
  const g = new THREE.Group(); scene.add(g);
  // ── pitch: mown stripes, lines, team tint near the goals
  const grass = tex(1024, 1024, (c) => {
    for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? "#2f7d2e" : "#368a33"; c.fillRect(0, i * 64, 1024, 64); }
    const d = c.getImageData(0, 0, 1024, 1024);
    for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 22; d.data[i] += n; d.data[i + 1] += n * 1.3; d.data[i + 2] += n; }
    c.putImageData(d, 0, 0);
    // lines (texture spans the whole pitch: 1024 px = W across / L along)
    const sx = 1024 / W, sz = 1024 / L, X = (x: number) => (x + W / 2) * sx, Z = (z: number) => (z + L / 2) * sz;
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 5;
    c.beginPath(); c.moveTo(X(-W / 2), Z(0)); c.lineTo(X(W / 2), Z(0)); c.stroke();
    c.beginPath(); c.ellipse(X(0), Z(0), 12 * sx, 12 * sz, 0, 0, 7); c.stroke();
    c.fillStyle = "#fff"; c.beginPath(); c.ellipse(X(0), Z(0), 0.8 * sx, 0.8 * sz, 0, 0, 7); c.fill();
    for (const s of [-1, 1]) {
      c.strokeRect(X(-GW / 2 - 8), Z(s * L / 2) - (s > 0 ? 16 * sz : 0), (GW + 16) * sx, 16 * sz);
      c.beginPath(); c.ellipse(X(0), Z(s * (L / 2 - 16)), 7 * sx, 7 * sz, 0, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2 : Math.PI); c.stroke();
    }
    // team glow at both ends
    for (const [s, col] of [[-1, "rgba(31,123,255,.28)"], [1, "rgba(255,122,18,.28)"]] as const) {
      const gr = c.createLinearGradient(0, Z(s * L / 2), 0, Z(s * L / 4)); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = gr; c.fillRect(0, Math.min(Z(s * L / 2), Z(s * L / 4)), 1024, Math.abs(Z(s * L / 4) - Z(s * L / 2)));
    }
  }, false);
  const shape = new THREE.Shape(rrect(W / 2, L / 2, RC).map(([x, z]) => new THREE.Vector2(x, z)));
  const fg = new THREE.ShapeGeometry(shape, 12);
  const uv = fg.attributes.uv as THREE.BufferAttribute, pos = fg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + L / 2) / L);
  fg.rotateX(-Math.PI / 2);
  const field = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: grass, roughness: 0.85 }));
  field.receiveShadow = true; g.add(field);

  // ── walls: translucent hex panels, glowing team-coloured trims, curved ramps at the bottom
  const hex = tex(256, 222, (c) => {
    c.clearRect(0, 0, 256, 222); c.strokeStyle = "rgba(190,225,255,0.55)"; c.lineWidth = 2.2;
    const r = 32, hgt = Math.sqrt(3) * r;
    for (let row = -1; row < 4; row++) for (let col = -1; col < 6; col++) {
      const cx = col * r * 1.5, cy = row * hgt + (col % 2 ? hgt / 2 : 0);
      c.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k * Math.PI) / 3; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.stroke();
    }
  });
  // subdivide long straight walls so the goal mouths can be cut out
  const base0 = rrect(W / 2, L / 2, RC, 12);
  const ks = base0.map(([x0, z0], i) => { const [x1, z1] = base0[(i + 1) % base0.length]; return Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 3)); });
  const sub = (pts: [number, number][]) => { const out: [number, number][] = []; pts.forEach(([x0, z0], i) => { const [x1, z1] = pts[(i + 1) % pts.length]; for (let k = 0; k < ks[i]; k++) out.push([x0 + ((x1 - x0) * k) / ks[i], z0 + ((z1 - z0) * k) / ks[i]]); }); return out; };
  const outline = sub(base0);
  const wallPos: number[] = [], wallUv: number[] = [], wallCol: number[] = [];
  let run = 0;
  for (let i = 0; i < outline.length; i++) {
    const [x0, z0] = outline[i], [x1, z1] = outline[(i + 1) % outline.length], len = Math.hypot(x1 - x0, z1 - z0);
    // leave the goal mouths open
    const mid = (z0 + z1) / 2, midx = (x0 + x1) / 2;
    const quad = (ya: number, yb: number) => {
      const c0 = z0 < 0 ? BLUE : ORANGE, c1 = z1 < 0 ? BLUE : ORANGE;
      wallPos.push(x0, ya, z0, x1, ya, z1, x1, yb, z1, x0, ya, z0, x1, yb, z1, x0, yb, z0);
      wallUv.push(run / 9, ya / 9, (run + len) / 9, ya / 9, (run + len) / 9, yb / 9, run / 9, ya / 9, (run + len) / 9, yb / 9, run / 9, yb / 9);
      for (const k of [c0, c1, c1, c0, c1, c0]) wallCol.push(k.r, k.g, k.b);
    };
    if (Math.abs(midx) < GW / 2 && Math.abs(mid) > L / 2 - 0.5) quad(GH, H); else quad(0, H);
    run += len;
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute("position", new THREE.Float32BufferAttribute(wallPos, 3));
  wg.setAttribute("uv", new THREE.Float32BufferAttribute(wallUv, 2));
  wg.setAttribute("color", new THREE.Float32BufferAttribute(wallCol, 3));
  const walls = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ map: hex, vertexColors: true, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(walls);
  const glass = new THREE.Mesh(wg, new THREE.MeshPhysicalMaterial({ color: "#9fc4ff", transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  g.add(glass);
  // glowing trims along the floor, at the top and on the ceiling edge
  const trim = (y: number, w: number, k: number) => {
    const pts = outline.map(([x, z]) => new THREE.Vector3(x, y, z)); pts.push(pts[0].clone());
    const cols: number[] = []; for (const p of pts) { const c = p.z < 0 ? BLUE : ORANGE; cols.push(c.r * k, c.g * k, c.b * k); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts); geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 400, w, 6, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), toneMapped: false }));
    // per-vertex colour for the tube: sample by z
    const tp = tube.geometry.attributes.position as THREE.BufferAttribute, tc: number[] = [];
    for (let i = 0; i < tp.count; i++) { const c = tp.getZ(i) < 0 ? BLUE : ORANGE; tc.push(c.r * k, c.g * k, c.b * k); }
    tube.geometry.setAttribute("color", new THREE.Float32BufferAttribute(tc, 3)); (tube.material as THREE.MeshBasicMaterial).vertexColors = true;
    g.add(tube); void geo;
  };
  trim(0.08, 0.12, 2.2); trim(H, 0.2, 2.6); trim(GH + 4, 0.06, 1.2);
  // curved ramps (visual quarter pipes along the walls)
  const rampR = A.FIL, rampPts: number[] = [], rampIdx: number[] = [], rampUv: number[] = [];
  const RS = 6, inner = sub(rrect(W / 2 - rampR, L / 2 - rampR, Math.max(1, RC - rampR), 12));
  for (let i = 0; i < inner.length; i++) {
    const [ix, iz] = inner[i], [ox, oz] = outline[i];
    for (let k = 0; k <= RS; k++) {
      const a = (k / RS) * (Math.PI / 2), t = 1 - Math.cos(a), y = Math.sin(a) * 0 + (1 - Math.cos(Math.PI / 2 - a)) * 0;
      void y; const yy = rampR - Math.cos(a) * rampR; // y from 0 to rampR
      rampPts.push(ix + (ox - ix) * Math.sin(a), yy * 0.999, iz + (oz - iz) * Math.sin(a)); rampUv.push(i / 8, t);
    }
  }
  for (let i = 0; i < inner.length; i++) for (let k = 0; k < RS; k++) {
    const a = i * (RS + 1) + k, b = ((i + 1) % inner.length) * (RS + 1) + k;
    const [ox, oz] = outline[i];
    if (Math.abs(ox) < GW / 2 && Math.abs(oz) > L / 2 - 1) continue; // goal mouth
    rampIdx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rampPts, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(rampUv, 2)); rg.setIndex(rampIdx); rg.computeVertexNormals();
  const ramp = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: "#2b3242", roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide }));
  ramp.receiveShadow = true; g.add(ramp);

  // ── goals: frame, glowing back panel, net
  const goals: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const col = s < 0 ? BLUE : ORANGE, gg = new THREE.Group(); gg.position.z = s * L / 2; g.add(gg); goals.push(gg);
    const frameM = new THREE.MeshStandardMaterial({ color: "#d9dee8", metalness: 0.9, roughness: 0.25, emissive: col, emissiveIntensity: 0.35 });
    const bar = (w: number, h: number, d: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameM); m.position.set(x, y, z); m.castShadow = true; gg.add(m); };
    bar(0.5, GH, 0.5, -GW / 2, GH / 2, 0); bar(0.5, GH, 0.5, GW / 2, GH / 2, 0); bar(GW + 0.5, 0.5, 0.5, 0, GH, 0);
    const netT = tex(128, 128, (c) => { c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; for (let i = 0; i <= 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); } });
    const netM = new THREE.MeshBasicMaterial({ map: netT, transparent: true, side: THREE.DoubleSide, depthWrite: false, color: col.clone().lerp(new THREE.Color(1, 1, 1), 0.5) });
    netT.repeat.set(4, 2);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.9), transparent: true, opacity: 0.55, side: THREE.DoubleSide, toneMapped: false }));
    back.position.set(0, GH / 2, s * GD); gg.add(back);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), netM); roof.rotation.x = Math.PI / 2; roof.position.set(0, GH, (s * GD) / 2); gg.add(roof);
    for (const x of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), netM); side.rotation.y = Math.PI / 2; side.position.set((x * GW) / 2, GH / 2, (s * GD) / 2); gg.add(side); }
    const gfloor = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.25), roughness: 0.6 })); gfloor.rotation.x = -Math.PI / 2; gfloor.position.set(0, 0.01, (s * GD) / 2); gfloor.receiveShadow = true; gg.add(gfloor);
    const glow = new THREE.PointLight(col, 60, 30, 1.8); glow.position.set(0, GH / 2, s * (GD - 1)); gg.add(glow);
  }

  // ── ceiling and stadium around: stands with crowd, roof ring, flood lights
  const ceil = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: hex, transparent: true, opacity: 0.12, color: "#8fb0ff", depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  ceil.position.y = H; g.add(ceil);
  const standM = new THREE.MeshStandardMaterial({ color: "#1b1f2a", roughness: 0.8, metalness: 0.2 });
  const crowdPts: THREE.Vector3[] = [];
  for (let tier = 0; tier < 7; tier++) {
    const off = 6 + tier * 4, y = 2 + tier * 3.4, ring = rrect(W / 2 + off, L / 2 + off, RC + off, 10);
    const sh = new THREE.Shape(rrect(W / 2 + off + 4, L / 2 + off + 4, RC + off + 4, 10).map(([x, z]) => new THREE.Vector2(x, z)));
    sh.holes.push(new THREE.Path(ring.map(([x, z]) => new THREE.Vector2(x, z)).reverse()));
    const step = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 3.4, bevelEnabled: false, curveSegments: 6 }).rotateX(Math.PI / 2), standM);
    step.position.y = y; g.add(step);
    for (let i = 0; i < ring.length; i++) {
      const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length], n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / 1.1);
      for (let k = 0; k < n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; const nx = x * 1.0, nz = z; const d = Math.hypot(nx, nz) || 1; crowdPts.push(new THREE.Vector3(x + (nx / d) * 1.6, y + 0.1, z + (nz / d) * 1.6)); }
    }
  }
  const crowdGeo = new THREE.CapsuleGeometry(0.32, 0.6, 2, 6).translate(0, 0.62, 0);
  const crowd = new THREE.InstancedMesh(crowdGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), crowdPts.length);
  const m4 = new THREE.Matrix4(), cc = new THREE.Color();
  crowdPts.forEach((p, i) => {
    m4.makeTranslation(p.x, p.y, p.z); crowd.setMatrixAt(i, m4);
    const side = p.z < 0 ? BLUE : ORANGE; cc.copy(Math.random() < 0.55 ? side : cc.setHSL(Math.random(), 0.5, 0.45 + Math.random() * 0.3)); crowd.setColorAt(i, cc);
  });
  g.add(crowd);
  const roofRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 6, 80), new THREE.MeshStandardMaterial({ color: "#2a2f3c", metalness: 0.7, roughness: 0.4 }));
  roofRing.scale.set(W / 2 + 40, L / 2 + 40, 60); roofRing.rotation.x = Math.PI / 2; roofRing.position.y = 34; g.add(roofRing);
  // flood light towers (bright heads, lens sprites)
  const flare = tex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(220,235,255,.6)"); gr.addColorStop(1, "rgba(200,220,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }, false);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) {
    const x = sx * (W / 2 + 40), z = sz * (L / 2 + 26), y = 46;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, y, 8), standM); pole.position.set(x, y / 2, z); g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3.2), toneMapped: false })); head.position.set(x, y + 2, z); head.lookAt(0, 0, 0); g.add(head);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flare, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); sp.scale.setScalar(30); sp.position.set(x, y + 2, z); g.add(sp);
  }
  // night sky with stars
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: tex(1024, 512, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#03050d"); gr.addColorStop(0.45, "#0b1430"); gr.addColorStop(0.55, "#1d2148"); gr.addColorStop(1, "#05060c"); c.fillStyle = gr; c.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; c.fillRect(Math.random() * 1024, Math.random() * 230, 1.3, 1.3); }
  }, false) }));
  g.add(sky);

  // ── boost pads (RL-like layout: 6 big, 28 small)
  const pads: { x: number; z: number; big: boolean; t: number; mesh: THREE.Object3D; orb?: THREE.Object3D }[] = [];
  const bigM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.2, 0.2), toneMapped: false });
  const smallM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.3), toneMapped: false });
  const baseM = new THREE.MeshStandardMaterial({ color: "#3b3f4c", metalness: 0.7, roughness: 0.35 });
  const BIG: [number, number][] = [[-W / 2 + 6, 0], [W / 2 - 6, 0], [-W / 2 + 7, -L / 2 + 9], [W / 2 - 7, -L / 2 + 9], [-W / 2 + 7, L / 2 - 9], [W / 2 - 7, L / 2 - 9]];
  const SMALL: [number, number][] = [];
  for (const z of [-40, -26, -12, 12, 26, 40]) for (const x of [-26, -10, 10, 26]) if (!(Math.abs(z) === 12 && Math.abs(x) === 10)) SMALL.push([x, z]);
  SMALL.push([0, -44], [0, 44], [0, -24], [0, 24], [-22, 0], [22, 0], [0, -4], [0, 4]);
  for (const [x, z, big] of [...BIG.map(([a, b]) => [a, b, true] as const), ...SMALL.map(([a, b]) => [a, b, false] as const)]) {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); g.add(grp);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(big ? 1.7 : 1.0, big ? 1.9 : 1.1, 0.18, 20), baseM); base.position.y = 0.09; base.receiveShadow = true; grp.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(big ? 1.35 : 0.75, 0.08, 6, 24), big ? bigM : smallM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; grp.add(ring);
    let orb: THREE.Mesh | undefined;
    if (big) { orb = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), bigM); orb.position.y = 1.6; grp.add(orb); }
    pads.push({ x, z, big, t: 0, mesh: ring, orb });
  }
  return { goals, pads, crowd };
}
