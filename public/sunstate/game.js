/*
 * SUNSTATE HUSTLE: BAYSIDE ONLINE
 * Top-down neon crime & heist parody for koshertrivia.de. Everything (map, cars, sound) is procedural:
 * Canvas 2D + Web Audio, no image/font/audio files, no external libraries.
 * Mounted by components/sunstate/Sunstate.tsx via window.mountSunstate(el, { lang }) -> cleanup().
 *
 * Architecture (short):
 *  - CONFIG            all tuning values (physics, police, economy, timers)
 *  - World             128x128 cells à 40 px; road lattice of 8x8 nodes; 4 zones:
 *                      Neon Boulevard (NW), Docks (NE), Keystone Keys (SW, bridges over water), Gator Glades (SE, mud)
 *  - State S           money (cash/dirty/vault), business heat, upgrades, stars, police description, mission, events
 *  - Entities          cars[] (player, civ, police, swat, truck, parked), peds[], pooled particles, skid ring buffer
 *  - Loop              requestAnimationFrame, dt capped at 0.1 s, fixed physics step 1/60 s, render separated
 *  - Systems           drift physics -> collisions -> traffic AI -> witnesses -> police -> missions/events -> economy
 *  - UI                canvas HUD + minimap; DOM phone (StreetPulse, VaultBank, MopedDrop, HustleBoard), hack terminal
 */
(function () {
  "use strict";

  // ─────────────────────────────── CONFIG ───────────────────────────────
  const CONFIG = {
    fixedDt: 1 / 60,
    maxDt: 0.1,
    world: { cell: 40, cols: 128, rows: 128, roadStart: 8, roadEvery: 16, roads: 8, zoneSplit: 57, seed: 20261124, keysRemove: 0.32 },
    cam: { zoom: 1, zoomSmall: 0.7, zoomOutAtSpeed: 0.14, lookAhead: 0.38, follow: 5, shakeDecay: 7 },
    player: { accel: 440, brake: 780, reverseMax: 170, maxSpeed: 520, turnRate: 3.1, grip: 9.5, driftGrip: 1.25, drag: 0.22, rolling: 80, handbrakeDecel: 130, driftTurnBoost: 1.5, turboBoost: 1.38, turboTime: 1.4, turboCooldown: 6, stolenFactor: 0.9 },
    civ: { accel: 260, brake: 600, reverseMax: 110, maxSpeed: 300, turnRate: 2.7, grip: 12, driftGrip: 12, drag: 0.2, rolling: 90, cruise: 185, panicCruise: 290, laneOffset: 30, count: 24, spawnMin: 750, spawnMax: 1400, despawn: 1900 },
    police: { accel: 470, brake: 800, reverseMax: 170, maxSpeed: 560, turnRate: 3.2, grip: 10, driftGrip: 2.2, drag: 0.2, rolling: 80, viewRange: 380, viewCone: 1.75, closeNotice: 95, patrols: 3, patrolsHot: 3, perStars: [0, 2, 3, 4, 5, 6, 8], swatFrom: 5, swatMax: 2, roadblockFrom: 4, roadblockEvery: 14, roadblockLife: 40, searchTime: [0, 9, 12, 15, 18, 22, 26], escalateEvery: 32, bustDist: 74, bustSpeed: 45, bustTime: 2.3, spawnGap: 0.7, lock: 2.5 },
    swat: { accel: 420, brake: 760, reverseMax: 150, maxSpeed: 520, turnRate: 2.7, grip: 11, driftGrip: 3, drag: 0.2, rolling: 80, mass: 2.4 },
    truck: { accel: 200, brake: 600, reverseMax: 90, maxSpeed: 220, turnRate: 2.2, grip: 13, driftGrip: 13, drag: 0.2, rolling: 90, mass: 3.4, hp: 100, cruise: 150, hitMin: 110, hitScale: 0.24, hitBase: 9 },
    foot: { walk: 95, sprint: 175, radius: 7, enterDist: 40, exitMaxSpeed: 90 },
    peds: { count: 36, walk: 34, flee: 150, viewRange: 270, viewCone: 2.4, dodgeDist: 75, radius: 6 },
    witness: { reportTime: 1.5, escapeFactor: 1.35, losGrace: 0.6 },
    law: { speedLimit: 345, policeHit: 90, pedHit: 60 },
    damage: { min: 120, scale: 0.08, smokeAt: 60, armorPerLevel: 0.22 },
    economy: { startCash: 1500, vaultTick: 20, vaultIncome: 180, vaultCap: 6000, heatFreeze: 80, launderChunk: 5000, launderFee: 0.15, launderHeat: 4, heatDecayPerMin: 0.6, respray: 500, moped: 250, bustFineCash: 300, bustDirtyLoss: 0.15, stripMin: 400, stripMax: 900 },
    heists: { safeMin: 2500, safeMax: 6500, safeHeat: 18, safeCooldown: 120, tipBonus: 1.6, truckMin: 9000, truckMax: 15000, truckHeat: 26, vipMin: 4000, vipMax: 7500, vipHeat: 14, vipTime: 75 },
    legal: { deliveryMin: 900, deliveryMax: 2200, deliveryHeat: -22, deliveryMaxDmg: 35, deliverySpeed: 230, deliveryGrace: 25, leaveLimit: 20, clientBonus: 1.5, trialPrize: 1400, trialHeat: -15, raceprize: 1800, checkpoints: 7, raceSpeed: 330, raceGrace: 8, cpRadius: 70 },
    events: { every: 45, first: 10, life: 100, truckLife: 110 },
    hack: { printTime: 45, printPositions: 8, voltTime: 32, voltPenalty: 6 },
    upgrades: { engine: [2000, 4500, 9000], tires: [1500, 3500, 7000], turbo: [3000, 6500, 12000], armor: [2500, 5500, 10000] },
    upgradeEffect: { engine: 0.13, tires: 0.14, turbo: 0.07 },
    pools: { particles: 420, skids: 900 },
    audio: { master: 0.55, highpass: 35 },
    save: { key: "kt-sunstate:v1", every: 10 },
    minimap: { size: 168, range: 1500 },
  };

  // ─────────────────────────────── helpers ───────────────────────────────
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = rng((Date.now() & 0xffffffff) >>> 0); // gameplay randomness (map uses its own seed)
  const rr = (a, b) => a + R() * (b - a);
  const ri = (a, b) => Math.floor(rr(a, b + 1));
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const money = (v) => "$" + Math.round(v).toLocaleString("en-US");

  // tile types
  const T_GRASS = 0, T_ROAD = 1, T_WALK = 2, T_BLD = 3, T_WATER = 4, T_SAND = 5, T_MUD = 6, T_CONC = 7, T_DIRT = 8;
  const GRIP = [0.72, 1, 0.92, 1, 1, 0.62, 0.45, 0.95, 0.7];
  const COL = {
    night: "#0d0f14", coral: "#FF3B6B", cyan: "#00E5FF", gold: "#FFB800", ink: "#e9f1f7", dim: "#7d8794",
    ground: ["#1d3327", "#22242b", "#373a44", "#2a2d36", "#0a2638", "#6b5a41", "#352c20", "#41444b", "#3e3326"],
  };
  const ZONES = [
    { de: "Neon-Boulevard", en: "Neon Boulevard" },
    { de: "Docks", en: "Docks" },
    { de: "Keystone Keys", en: "Keystone Keys" },
    { de: "Gator Glades", en: "Gator Glades" },
  ];
  const PAINT = [
    { c: "#FF3B6B", de: "Koralle", en: "Coral" },
    { c: "#00E5FF", de: "Lagune", en: "Lagoon" },
    { c: "#FFB800", de: "Bernstein", en: "Amber" },
    { c: "#7CFF6B", de: "Limette", en: "Lime" },
    { c: "#B46BFF", de: "Orchidee", en: "Orchid" },
    { c: "#F2F4F7", de: "Perlweiß", en: "Pearl" },
    { c: "#2B2F3A", de: "Graphit", en: "Graphite" },
    { c: "#FF8A3D", de: "Mango", en: "Mango" },
    { c: "#3D7BFF", de: "Kobalt", en: "Cobalt" },
    { c: "#C9A27E", de: "Sand", en: "Sand" },
  ];
  const MODELS = ["Vapor GT", "Palma Cruiser", "Bayline Coupé", "Keystone Van", "Mangrove 4x4", "Reef Runner", "Sunset S"];
  const RIVALS = [
    ["Coral Kings", 2400000, 9000], ["Glades Gators", 1650000, 7000], ["Neon Nomads", 980000, 5200], ["Pier Pressure", 610000, 4100],
    ["Bayside Bandits", 340000, 3000], ["Keystone Krew", 180000, 2200], ["Lagoon Lynx", 92000, 1500], ["Mango Syndicate", 41000, 900],
    ["Flamingo Five", 16000, 500], ["Tidewater Twins", 6000, 250],
  ];

  // ─────────────────────────────── world generation ───────────────────────────────
  function genWorld() {
    const W = CONFIG.world, C = W.cols, Rr = W.rows, cell = W.cell;
    const ty = new Uint8Array(C * Rr);
    const reserved = new Uint8Array(C * Rr);
    const zoneArr = new Uint8Array(C * Rr);
    const r = rng(W.seed);
    const roadC = [];
    for (let k = 0; k < W.roads; k++) roadC.push(W.roadStart + k * W.roadEvery);
    const zoneOf = (cx, cy) => (cy < W.zoneSplit ? (cx < W.zoneSplit ? 0 : 1) : cx < W.zoneSplit ? 2 : 3);
    const idx = (x, y) => y * C + x;
    for (let y = 0; y < Rr; y++)
      for (let x = 0; x < C; x++) {
        const z = zoneOf(x, y);
        zoneArr[idx(x, y)] = z;
        ty[idx(x, y)] = z === 0 ? T_GRASS : z === 1 ? T_CONC : z === 2 ? T_WATER : T_MUD;
      }
    const fill = (x0, y0, x1, y1, t) => {
      for (let y = Math.max(0, y0); y <= Math.min(Rr - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(C - 1, x1); x++) ty[idx(x, y)] = t;
    };

    // road graph: nodes at lattice crossings, edges between neighbours
    const N = W.roads;
    const nodes = [];
    for (let l = 0; l < N; l++)
      for (let k = 0; k < N; k++) nodes.push({ i: nodes.length, k, l, cx: roadC[k], cy: roadC[l], x: (roadC[k] + 0.5) * cell, y: (roadC[l] + 0.5) * cell, adj: [] });
    const edges = [];
    for (let l = 0; l < N; l++)
      for (let k = 0; k < N; k++) {
        if (k < N - 1) edges.push({ a: l * N + k, b: l * N + k + 1, on: true });
        if (l < N - 1) edges.push({ a: l * N + k, b: (l + 1) * N + k, on: true });
      }
    const connected = () => {
      const adj = nodes.map(() => []);
      for (const e of edges) if (e.on) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
      const seen = new Uint8Array(nodes.length);
      const st = [0]; seen[0] = 1; let cnt = 1;
      while (st.length) { const n = st.pop(); for (const m of adj[n]) if (!seen[m]) { seen[m] = 1; cnt++; st.push(m); } }
      return cnt === nodes.length;
    };
    // Keys: knock out some bridges, keep everything reachable
    for (const e of edges) {
      const A = nodes[e.a], B = nodes[e.b];
      const mx = (A.cx + B.cx) / 2, my = (A.cy + B.cy) / 2;
      if (zoneOf(mx, my) === 2 && A.l > 3 && r() < W.keysRemove) {
        e.on = false;
        if (!connected()) e.on = true;
      }
    }
    for (const e of edges) {
      if (!e.on) continue;
      const A = nodes[e.a], B = nodes[e.b];
      A.adj.push(B.i); B.adj.push(A.i);
      const z = zoneOf((A.cx + B.cx) / 2, (A.cy + B.cy) / 2);
      const t = z === 3 ? T_DIRT : T_ROAD;
      fill(Math.min(A.cx, B.cx) - 1, Math.min(A.cy, B.cy) - 1, Math.max(A.cx, B.cx) + 1, Math.max(A.cy, B.cy) + 1, t);
    }
    const isRoad = (x, y) => ty[idx(x, y)] === T_ROAD || ty[idx(x, y)] === T_DIRT;

    const buildings = [], palms = [], lamps = [], places = {};
    const blockRect = (bi, bj) => ({ x0: roadC[bi] + 2, y0: roadC[bj] + 2, x1: roadC[bi + 1] - 2, y1: roadC[bj + 1] - 2 });
    const free = (x0, y0, x1, y1) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (reserved[idx(x, y)] || isRoad(x, y)) return false;
      return true;
    };
    const addB = (x0, y0, x1, y1, kind, z, extra) => {
      if (x1 < x0 || y1 < y0 || !free(x0, y0, x1, y1)) return null;
      const b = Object.assign({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, kind, z, ht: 6 + r() * 14, neon: pick2(r, [COL.coral, COL.cyan, COL.gold, "#B46BFF"]), seed: r() }, extra || {});
      fill(x0, y0, x1, y1, T_BLD);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) reserved[idx(x, y)] = 1;
      buildings.push(b);
      return b;
    };
    // special lots (marker in front, building behind) on the north side of a block, open to the road
    const lot = (bi, bj, key, label, kind) => {
      const B = blockRect(bi, bj);
      const lx0 = B.x0 + 2, lx1 = B.x0 + 8, ly0 = B.y0, ly1 = B.y0 + 3;
      fill(lx0, ly0, lx1, ly1, T_CONC);
      // open the sidewalk row towards the road
      for (let y = ly0; y <= ly1; y++) for (let x = lx0; x <= lx1; x++) reserved[idx(x, y)] = 1;
      const b = addB(lx0, ly1 + 1, lx1, ly1 + 3, kind, zoneOf(lx0, ly0), { label, special: true, ht: 12 });
      const p = { key, x: ((lx0 + lx1 + 1) / 2) * cell, y: ((ly0 + ly1 + 1) / 2) * cell, label, b };
      return p;
    };
    places.wash = lot(1, 1, "wash", "SUDS & CASH", "special");
    places.resprays = [lot(2, 0, "respray", "RESPRAY & STRIP", "special"), lot(5, 1, "respray", "RESPRAY & STRIP", "special"), lot(4, 5, "respray", "RESPRAY & STRIP", "special")];
    places.warehouses = [lot(3, 0, "safe", "KAI 1", "warehouse"), lot(4, 2, "safe", "KAI 2", "warehouse"), lot(6, 1, "safe", "KAI 3", "warehouse")];
    places.warehouses.forEach((w) => (w.cool = 0));
    places.club = lot(0, 0, "club", "CLUB PALMA", "special");

    // fill the blocks per zone
    for (let bj = 0; bj < N - 1; bj++)
      for (let bi = 0; bi < N - 1; bi++) {
        const B = blockRect(bi, bj);
        const z = zoneOf((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2);
        if (z === 0) {
          // sidewalk ring, lots with buildings, a plaza now and then
          for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) {
            const edge = x === B.x0 || x === B.x1 || y === B.y0 || y === B.y1;
            if (!reserved[idx(x, y)]) ty[idx(x, y)] = edge ? T_WALK : T_GRASS;
          }
          for (let x = B.x0; x <= B.x1; x += 4) { lamps.push({ x: (x + 0.5) * cell, y: (B.y0 + 0.2) * cell, c: "#ffd9a0" }); lamps.push({ x: (x + 0.5) * cell, y: (B.y1 + 0.8) * cell, c: "#ffd9a0" }); }
          const split = r();
          const ix0 = B.x0 + 1, iy0 = B.y0 + 1, ix1 = B.x1 - 1, iy1 = B.y1 - 1;
          const mx = Math.floor((ix0 + ix1) / 2), my = Math.floor((iy0 + iy1) / 2);
          const lots = split < 0.25 ? [[ix0, iy0, ix1, iy1]] : split < 0.6 ? [[ix0, iy0, mx - 1, iy1], [mx + 1, iy0, ix1, iy1]] : [[ix0, iy0, mx - 1, my - 1], [mx + 1, iy0, ix1, my - 1], [ix0, my + 1, mx - 1, iy1], [mx + 1, my + 1, ix1, iy1]];
          for (const L of lots) {
            if (r() < 0.16) { palms.push({ x: ((L[0] + L[2] + 1) / 2) * cell, y: ((L[1] + L[3] + 1) / 2) * cell, s: 1.2 }); continue; }
            if (!addB(L[0], L[1], L[2], L[3], "tower", z)) {
              // lot partly reserved: try a smaller building in the back half
              addB(L[0], Math.floor((L[1] + L[3]) / 2) + 1, L[2], L[3], "tower", z);
            }
          }
          for (let x = B.x0; x <= B.x1; x += 3) if (r() < 0.5) palms.push({ x: (x + 0.5) * cell, y: (B.y1 + 0.5) * cell, s: 0.9 });
        } else if (z === 1) {
          for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (!reserved[idx(x, y)]) ty[idx(x, y)] = T_CONC;
          if (r() < 0.55) addB(B.x0 + 1, B.y0 + 5, B.x1 - 1, B.y1 - 1, "warehouse", z) || addB(B.x0 + 1, B.y0 + 7, B.x1 - 1, B.y1 - 1, "warehouse", z);
          else
            for (let y = B.y0 + 5; y <= B.y1 - 1; y += 2)
              for (let x = B.x0 + 1; x <= B.x1 - 2; x += 3) if (r() < 0.7) addB(x, y, x + 1, y, "container", z, { ht: 4, neon: pick2(r, ["#c0392b", "#2e86c1", "#d4ac0d", "#239b56", "#7d3c98"]) });
          lamps.push({ x: (B.x0 + 1) * cell, y: (B.y0 + 1) * cell, c: "#cfe8ff" }, { x: (B.x1) * cell, y: (B.y0 + 1) * cell, c: "#cfe8ff" });
        } else if (z === 2) {
          if (r() < 0.6) {
            const w = 3 + Math.floor(r() * 5), h = 3 + Math.floor(r() * 5);
            const x0 = B.x0 + 1 + Math.floor(r() * (B.x1 - B.x0 - w - 1)), y0 = B.y0 + 1 + Math.floor(r() * (B.y1 - B.y0 - h - 1));
            fill(x0, y0, x0 + w, y0 + h, T_SAND);
            // connect island to the nearest road with a sand spit
            for (let y = B.y0; y < y0; y++) ty[idx(x0 + 1, y)] = T_SAND;
            if (w >= 4 && h >= 4) addB(x0 + 1, y0 + 2, x0 + 2, y0 + 3, "house", z, { ht: 5 });
            palms.push({ x: (x0 + w) * cell, y: (y0 + 0.6) * cell, s: 1 }, { x: (x0 + 0.6) * cell, y: (y0 + h) * cell, s: 1.1 });
          }
        } else {
          for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (!reserved[idx(x, y)]) ty[idx(x, y)] = r() < 0.35 ? T_GRASS : T_MUD;
          if (r() < 0.7) { const px = B.x0 + 3 + Math.floor(r() * 5), py = B.y0 + 5 + Math.floor(r() * 4); fill(px, py, px + 2 + Math.floor(r() * 3), py + 2, T_WATER); }
          if (r() < 0.6) addB(B.x0 + 1, B.y1 - 3, B.x0 + 3, B.y1 - 1, "shack", z, { ht: 4 });
          if (r() < 0.4) addB(B.x1 - 3, B.y0 + 6, B.x1 - 1, B.y0 + 8, "shack", z, { ht: 4 });
        }
      }
    // outer strips: beaches / quays / swamp, then the ocean ring
    for (let y = 0; y < Rr; y++)
      for (let x = 0; x < C; x++) {
        const out = x < roadC[0] - 1 || y < roadC[0] - 1 || x > roadC[N - 1] + 1 || y > roadC[N - 1] + 1;
        if (!out) continue;
        const z = zoneArr[idx(x, y)];
        ty[idx(x, y)] = z === 0 ? T_SAND : z === 1 ? T_CONC : z === 2 ? T_WATER : T_MUD;
        if (x < 4 || y < 3 || x >= C - 3 || y >= Rr - 3) ty[idx(x, y)] = T_WATER;
      }
    // Docks: east quay water strip makes the pier
    for (let y = 2; y < W.zoneSplit; y++) for (let x = C - 5; x < C; x++) ty[idx(x, y)] = T_WATER;

    const nodeAt = (k, l) => nodes[l * N + k];
    places.pier = nodeAt(7, 1);
    places.trialStart = nodeAt(1, 4).adj.length ? nodeAt(1, 4) : nodeAt(0, 4);
    places.meetup = nodeAt(5, 0);
    return { ty, zoneArr, nodes, edges, roadC, buildings, palms, lamps, places, C, R: Rr, cell, zoneOf };
  }
  function pick2(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  // ─────────────────────────────── audio (procedural, one master bus) ───────────────────────────────
  function makeAudio() {
    const A = { ctx: null, ready: false };
    A.unlock = function () {
      if (A.ctx) { if (A.ctx.state === "suspended" && !document.hidden) A.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      A.ctx = ctx;
      // master bus: HighPass 35 Hz -> Compressor -> MasterGain -> soft clipper -> out
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = CONFIG.audio.highpass;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
      const master = ctx.createGain(); master.gain.value = CONFIG.audio.master;
      const clip = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
      clip.curve = curve;
      hp.connect(comp); comp.connect(master); master.connect(clip); clip.connect(ctx.destination);
      A.bus = hp;
      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      A.noise = nb;
      // engine
      const eo = ctx.createOscillator(); eo.type = "sawtooth"; eo.frequency.value = 50;
      const eo2 = ctx.createOscillator(); eo2.type = "square"; eo2.frequency.value = 25.5;
      const elp = ctx.createBiquadFilter(); elp.type = "lowpass"; elp.frequency.value = 700;
      const eg = ctx.createGain(); eg.gain.value = 0;
      const eg2 = ctx.createGain(); eg2.gain.value = 0.5;
      eo.connect(elp); eo2.connect(eg2); eg2.connect(elp); elp.connect(eg); eg.connect(hp);
      eo.start(); eo2.start();
      A.eng = { o: eo, o2: eo2, lp: elp, g: eg };
      // tyre screech
      const sn = ctx.createBufferSource(); sn.buffer = nb; sn.loop = true;
      const sbp = ctx.createBiquadFilter(); sbp.type = "bandpass"; sbp.frequency.value = 2300; sbp.Q.value = 4;
      const sg = ctx.createGain(); sg.gain.value = 0;
      sn.connect(sbp); sbp.connect(sg); sg.connect(hp); sn.start();
      A.scr = sg;
      // siren (wail)
      const so = ctx.createOscillator(); so.type = "triangle"; so.frequency.value = 850;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.55;
      const lg = ctx.createGain(); lg.gain.value = 330;
      lfo.connect(lg); lg.connect(so.frequency);
      const sig = ctx.createGain(); sig.gain.value = 0;
      so.connect(sig); sig.connect(hp); so.start(); lfo.start();
      A.sir = sig;
      A.ready = true;
    };
    const set = (param, v, tc) => { if (A.ctx) param.setTargetAtTime(v, A.ctx.currentTime, tc || 0.05); };
    A.update = function (speed, throttle, slip, siren, onFoot, active) {
      if (!A.ready) return;
      const on = active && !onFoot;
      set(A.eng.o.frequency, 42 + speed * 0.17 + throttle * 14, 0.06);
      set(A.eng.o2.frequency, 21 + speed * 0.085 + throttle * 7, 0.06);
      set(A.eng.lp.frequency, 380 + speed * 1.4 + throttle * 250, 0.08);
      set(A.eng.g.gain, on ? 0.05 + Math.min(speed / 520, 1) * 0.04 : 0, 0.1);
      set(A.scr.gain, on ? clamp((slip - 130) / 320, 0, 1) * 0.11 : 0, 0.05);
      set(A.sir.gain, active ? siren * 0.045 : 0, 0.15);
    };
    A.blip = function (freq, dur, type, vol, slide, delay) {
      if (!A.ready) return;
      const c = A.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(); o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + dur + 0.02);
    };
    A.cash = function () { A.blip(1318, 0.09, "sine", 0.09); A.blip(1760, 0.16, "sine", 0.09, 0, 0.07); };
    A.crash = function (power) {
      if (!A.ready) return;
      const c = A.ctx, t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = A.noise;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500 + power * 2;
      const g = c.createGain(); const v = clamp(power / 600, 0.04, 0.22);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      s.connect(f); f.connect(g); g.connect(A.bus); s.start(t, Math.random()); s.stop(t + 0.4);
    };
    A.suspend = function () { if (A.ctx && A.ctx.state === "running") A.ctx.suspend(); };
    A.resume = function () { if (A.ctx && A.ctx.state === "suspended") A.ctx.resume(); };
    A.close = function () { if (A.ctx) A.ctx.close(); A.ctx = null; A.ready = false; };
    return A;
  }

  // ─────────────────────────────── styles ───────────────────────────────
  const CSS = `
.ss-root{position:relative;width:100%;height:100%;overflow:hidden;background:#0d0f14;color:#e9f1f7;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;user-select:none;-webkit-user-select:none;touch-action:none}
.ss-root>canvas{position:absolute;inset:0;display:block}
.ss-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 30%,rgba(255,59,107,.18),rgba(8,9,13,.92) 70%);z-index:30;padding:16px}
.ss-card{max-width:560px;width:100%;border:2px solid #FF3B6B;background:#101219ee;padding:22px 22px 18px;box-shadow:0 0 0 4px #0d0f14,0 0 32px rgba(255,59,107,.35)}
.ss-logo{font-size:clamp(28px,6vw,46px);font-weight:800;letter-spacing:.06em;line-height:1;color:#FF3B6B;text-shadow:0 0 18px rgba(255,59,107,.7)}
.ss-logo small{display:block;font-size:.42em;color:#00E5FF;letter-spacing:.32em;margin-top:8px;text-shadow:0 0 12px rgba(0,229,255,.7)}
.ss-card p{color:#aab4c0;font-size:13px;line-height:1.55;margin:14px 0}
.ss-keys{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12.5px;margin:12px 0 16px;color:#cfd8e2}
.ss-keys b{color:#FFB800;font-weight:700;white-space:nowrap}
.ss-btn{display:inline-block;border:2px solid #00E5FF;background:transparent;color:#00E5FF;font:inherit;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:10px 16px;margin:4px 8px 4px 0;cursor:pointer}
.ss-btn:hover,.ss-btn:focus-visible{background:#00E5FF;color:#0d0f14;outline:none}
.ss-btn.hot{border-color:#FF3B6B;color:#FF3B6B}.ss-btn.hot:hover{background:#FF3B6B;color:#0d0f14}
.ss-btn.gold{border-color:#FFB800;color:#FFB800}.ss-btn.gold:hover{background:#FFB800;color:#0d0f14}
.ss-btn[disabled]{opacity:.35;cursor:not-allowed;background:transparent!important;color:inherit!important}
.ss-phone-btn{position:absolute;right:14px;bottom:14px;width:54px;height:54px;border:2px solid #00E5FF;background:#101219dd;color:#00E5FF;font:inherit;font-size:22px;cursor:pointer;z-index:12}
.ss-phone{position:absolute;right:14px;bottom:78px;width:min(340px,calc(100% - 28px));max-height:calc(100% - 100px);display:flex;flex-direction:column;background:#0b0c11f2;border:2px solid #00E5FF;box-shadow:0 0 26px rgba(0,229,255,.28);z-index:20}
.ss-phone header{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid #1f2a33;font-size:12px;color:#7d8794}
.ss-phone header b{color:#00E5FF;letter-spacing:.14em}
.ss-pbody{overflow:auto;padding:12px}
.ss-apps{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ss-app{border:2px solid #2a3440;background:#12151d;color:#e9f1f7;font:inherit;text-align:left;padding:12px 10px;cursor:pointer}
.ss-app:hover{border-color:#FFB800}
.ss-app i{display:block;font-style:normal;font-size:20px;margin-bottom:6px}
.ss-app b{display:block;font-size:13px}.ss-app span{font-size:11px;color:#7d8794}
.ss-row{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px dashed #222b35;font-size:12.5px;align-items:center}
.ss-row:last-child{border-bottom:0}
.ss-h{font-size:11px;letter-spacing:.2em;color:#FFB800;margin:12px 0 4px;text-transform:uppercase}
.ss-post{border-left:3px solid #FF3B6B;background:#141821;padding:8px 10px;margin:0 0 8px;font-size:12.5px;line-height:1.4}
.ss-post small{display:block;color:#7d8794;margin-top:4px}
.ss-post.old{border-color:#2a3440;opacity:.6}
.ss-mini{border:1px solid #00E5FF;background:transparent;color:#00E5FF;font:inherit;font-size:11px;font-weight:800;padding:5px 8px;cursor:pointer;white-space:nowrap}
.ss-mini:hover{background:#00E5FF;color:#0d0f14}.ss-mini[disabled]{opacity:.35;cursor:not-allowed}
.ss-back{border:0;background:none;color:#00E5FF;font:inherit;font-size:12px;cursor:pointer;padding:0}
.ss-hack{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:25;background:rgba(4,8,6,.55);padding:10px}
.ss-term{position:relative;width:min(640px,100%);background:#04100b;border:2px solid #39ff9a;color:#39ff9a;box-shadow:0 0 34px rgba(57,255,154,.25);padding:14px;overflow:hidden}
.ss-term:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
.ss-term h3{margin:0 0 4px;font-size:15px;letter-spacing:.2em}
.ss-term .ss-sub{font-size:11.5px;color:#7fdcb0;margin-bottom:10px}
.ss-term .ss-bar{height:6px;background:#0d2a1c;margin:8px 0}.ss-term .ss-bar i{display:block;height:100%;background:#39ff9a}
.ss-term .ss-risk{display:flex;justify-content:space-between;font-size:11px;color:#ffb3c4}
.ss-term button{border:1px solid #39ff9a;background:transparent;color:#39ff9a;font:inherit;font-weight:800;padding:8px 12px;cursor:pointer;margin:6px 6px 0 0}
.ss-term button:hover,.ss-term button.on{background:#39ff9a;color:#04100b}
.ss-volt{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;gap:8px;position:relative}
.ss-volt .col{display:flex;flex-direction:column;gap:14px}
.ss-volt button{font-size:20px;padding:12px 0;margin:0}
.ss-volt svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.ss-target{font-size:28px;text-align:center;letter-spacing:.1em}
.ss-touch{position:absolute;inset:auto 0 0 0;height:0;z-index:11}
.ss-tb{position:absolute;bottom:16px;width:62px;height:62px;border:2px solid rgba(0,229,255,.65);background:rgba(16,18,25,.6);color:#00E5FF;font:inherit;font-weight:800;font-size:14px;border-radius:50%;touch-action:none}
.ss-tb.on{background:rgba(0,229,255,.35)}
`;

  // ─────────────────────────────── mount ───────────────────────────────
  function mountSunstate(el, opts) {
    const lang = opts && opts.lang === "en" ? "en" : "de";
    const tt = (de, en) => (lang === "en" ? en : de);
    const W = genWorld();
    const cell = W.cell;
    const audio = makeAudio();

    if (!document.getElementById("ss-style")) {
      const st = document.createElement("style"); st.id = "ss-style"; st.textContent = CSS; document.head.appendChild(st);
    }
    const root = document.createElement("div"); root.className = "ss-root"; root.tabIndex = -1;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    root.appendChild(canvas);
    el.appendChild(root);

    // ───────── state ─────────
    const S = {
      t: 0, started: false, paused: false, bigMap: false,
      cash: CONFIG.economy.startCash, dirty: 0, vault: 0, bheat: 10,
      up: { engine: 0, tires: 0, turbo: 0, armor: 0 }, color: PAINT[0].c,
      stats: { earned: 0, heists: 0, legal: 0, escapes: 0, maxStars: 0, races: 0, busted: 0 },
      stars: 0, desc: null, lastSeen: null, searchT: 0, pursuitT: 0, seenNow: false, bustT: 0, crimeId: 0, reportedCrime: -1,
      mission: null, events: [], feed: [], nextEvent: CONFIG.events.first, vaultT: 0, saveT: 0, roadblockT: 0, spawnT: 0,
      toasts: [], banner: null, shake: 0, clientBonus: false, turboT: 0, turboCool: 0,
    };
    function load() {
      try {
        const raw = localStorage.getItem(CONFIG.save.key);
        if (!raw) return false;
        const d = JSON.parse(raw);
        if (!d || d.v !== 1) return false;
        S.cash = +d.cash || 0; S.dirty = +d.dirty || 0; S.vault = +d.vault || 0; S.bheat = clamp(+d.bheat || 0, 0, 100);
        Object.assign(S.up, d.up || {}); S.color = d.color || S.color; Object.assign(S.stats, d.stats || {});
        return true;
      } catch (e) { return false; }
    }
    function save() {
      try { localStorage.setItem(CONFIG.save.key, JSON.stringify({ v: 1, cash: S.cash, dirty: S.dirty, vault: S.vault, bheat: S.bheat, up: S.up, color: S.color, stats: S.stats })); } catch (e) { /* storage full or blocked */ }
    }
    const hasSave = load();

    // ───────── world queries ─────────
    const tileAt = (px, py) => {
      const gx = Math.floor(px / cell), gy = Math.floor(py / cell);
      if (gx < 0 || gy < 0 || gx >= W.C || gy >= W.R) return T_WATER;
      return W.ty[gy * W.C + gx];
    };
    const solidCell = (gx, gy) => { if (gx < 0 || gy < 0 || gx >= W.C || gy >= W.R) return true; const t = W.ty[gy * W.C + gx]; return t === T_BLD || t === T_WATER; };
    const walkable = (px, py) => { const t = tileAt(px, py); return t !== T_BLD && t !== T_WATER; };
    const zoneAt = (px, py) => { const gx = clamp(Math.floor(px / cell), 0, W.C - 1), gy = clamp(Math.floor(py / cell), 0, W.R - 1); return W.zoneArr[gy * W.C + gx]; };
    function losClear(ax, ay, bx, by, driving) {
      const d = dist(ax, ay, bx, by), n = Math.ceil(d / 18);
      for (let i = 1; i < n; i++) {
        const t = tileAt(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n);
        if (t === T_BLD || (driving && t === T_WATER)) return false;
      }
      return true;
    }
    const validNodes = W.nodes.filter((n) => n.adj.length);
    function nearestNode(x, y) {
      let best = validNodes[0], bd = 1e12;
      for (const n of validNodes) { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n; } }
      return best;
    }
    function bfs(from, to) {
      if (from === to) return [to];
      const prev = new Int16Array(W.nodes.length).fill(-1);
      prev[from] = from;
      const q = [from];
      for (let h = 0; h < q.length; h++) {
        const n = q[h];
        if (n === to) break;
        for (const m of W.nodes[n].adj) if (prev[m] < 0) { prev[m] = n; q.push(m); }
      }
      if (prev[to] < 0) return [];
      const path = [];
      for (let n = to; n !== from; n = prev[n]) path.push(n);
      return path.reverse();
    }
    function pathLength(a, b) {
      const p = bfs(a.i, b.i); let L = 0, prev = a;
      for (const i of p) { L += dist(prev.x, prev.y, W.nodes[i].x, W.nodes[i].y); prev = W.nodes[i]; }
      return L;
    }

    // ───────── pools ─────────
    const parts = [];
    for (let i = 0; i < CONFIG.pools.particles; i++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, color: "#fff", kind: 0 });
    let partIdx = 0;
    function emit(x, y, vx, vy, life, size, color, kind) {
      const p = parts[partIdx]; partIdx = (partIdx + 1) % parts.length;
      p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size; p.color = color; p.kind = kind || 0;
    }
    const SK = CONFIG.pools.skids;
    const skids = new Float32Array(SK * 5); // x1,y1,x2,y2,time
    let skidIdx = 0, skidCount = 0;
    function addSkid(x1, y1, x2, y2) {
      const o = skidIdx * 5; skids[o] = x1; skids[o + 1] = y1; skids[o + 2] = x2; skids[o + 3] = y2; skids[o + 4] = S.t;
      skidIdx = (skidIdx + 1) % SK; if (skidCount < SK) skidCount++;
    }

    // ───────── entities ─────────
    let carSeq = 1;
    const cars = [];
    const peds = [];
    function physFor(kind) {
      if (kind === "police") return CONFIG.police;
      if (kind === "swat") return CONFIG.swat;
      if (kind === "truck") return CONFIG.truck;
      return CONFIG.civ;
    }
    function playerPhys(personal) {
      const P = CONFIG.player, U = CONFIG.upgradeEffect, f = personal ? 1 : P.stolenFactor;
      const e = personal ? S.up.engine : 0, ti = personal ? S.up.tires : 0, tu = personal ? S.up.turbo : 0;
      return {
        accel: P.accel * (1 + U.engine * e) * f, brake: P.brake, reverseMax: P.reverseMax, maxSpeed: P.maxSpeed * (1 + U.turbo * tu) * f,
        turnRate: P.turnRate, grip: P.grip * (1 + U.tires * ti), driftGrip: P.driftGrip * (1 + 0.5 * U.tires * ti), drag: P.drag, rolling: P.rolling,
      };
    }
    function makeCar(kind, x, y, a, o) {
      const big = kind === "truck" || kind === "swat";
      const c = {
        id: carSeq++, kind, x, y, a, vx: 0, vy: 0, len: kind === "truck" ? 60 : kind === "swat" ? 54 : 44, wid: big ? 26 : 22,
        color: kind === "police" ? "#e8edf2" : kind === "swat" ? "#1b2230" : kind === "truck" ? "#8a919c" : pick(PAINT).c,
        model: kind === "police" ? "Interceptor" : kind === "swat" ? "Tactical" : kind === "truck" ? "Armored" : pick(MODELS),
        mass: kind === "truck" ? CONFIG.truck.mass : kind === "swat" ? CONFIG.swat.mass : 1,
        ph: physFor(kind), driver: kind !== "parked", personal: false, client: false,
        inp: { th: 0, st: 0, hb: false }, dmg: 0, hp: kind === "truck" ? CONFIG.truck.hp : 0,
        ai: { from: -1, to: -1, off: CONFIG.civ.laneOffset, panic: 0 }, mode: "patrol", lock: 0, path: [], pathT: 0, searchPt: null, searchT: 0,
        stuckT: 0, revT: 0, revSt: 0, slip: 0, rear: null, life: 0, dead: false, static: false, hornT: 0,
      };
      if (o) Object.assign(c, o);
      cars.push(c);
      return c;
    }
    const isCop = (c) => (c.kind === "police" || c.kind === "swat") && c.driver;

    const player = { x: 0, y: 0, a: 0, vx: 0, vy: 0, car: null };
    function personalCar() { return cars.find((c) => c.personal && !c.dead) || null; }
    function spawnPersonal(x, y, a) {
      const old = personalCar(); if (old) old.dead = true;
      const c = makeCar("parked", x, y, a, { color: S.color, model: "Vapor GT", personal: true, driver: false });
      c.ph = playerPhys(true);
      return c;
    }
    function enterCar(c) {
      player.car = c; c.driver = false; c.kind = "player"; c.ph = playerPhys(c.personal); c.mode = "player";
      c.inp.th = 0; c.inp.st = 0; c.inp.hb = false;
    }
    function respawnAtWash() {
      const P = W.places.wash;
      const c = spawnPersonal(P.x, P.y - 30, -Math.PI / 2);
      enterCar(c);
      player.x = c.x; player.y = c.y;
      cam.x = c.x; cam.y = c.y;
    }
    const cam = { x: W.places.wash.x, y: W.places.wash.y, zoom: 1 };

    function lookNow() {
      const c = player.car;
      return c ? { foot: false, id: c.id, color: c.color, model: c.model } : { foot: true };
    }
    function lookMatches() {
      const d = S.desc; if (!d) return false;
      const c = player.car;
      if (d.foot) return !c;
      return !!c && c.id === d.id && c.color === d.color;
    }
    function lookText(d) {
      if (!d) return "";
      if (d.foot) return tt("zu Fuß", "on foot");
      const p = PAINT.find((x) => x.c === d.color);
      return (p ? tt(p.de, p.en) : "") + " " + d.model;
    }
    const ppos = () => (player.car ? player.car : player);
    const speedOf = (o) => Math.hypot(o.vx, o.vy);

    // ───────── messages ─────────
    function toast(text, col) {
      S.toasts.push({ text, t: S.t, col: col || COL.ink });
      if (S.toasts.length > 4) S.toasts.shift();
    }
    function banner(big, small, col) { S.banner = { big, small, t: S.t, col: col || COL.gold }; }

    // ─────────────────────────────── physics ───────────────────────────────
    function stepCar(c, dt) {
      const ph = c.ph, inp = c.inp, P = CONFIG.player;
      const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
      let vf = c.vx * fx + c.vy * fy, vl = c.vx * rx + c.vy * ry;
      const surf = GRIP[tileAt(c.x, c.y)];
      const turbo = c === player.car && S.turboT > 0;
      const broken = c.dmg >= 100;
      const vmax = broken ? 0 : ph.maxSpeed * (0.55 + 0.45 * surf) * (turbo ? P.turboBoost : 1) * (c.dmg > 80 ? 0.7 : 1);
      const th = inp.th;
      if (th > 0) {
        if (vf < vmax) vf += ph.accel * th * (0.5 + 0.5 * surf) * (turbo ? 1.6 : 1) * dt;
        else vf -= ph.rolling * dt;
      } else if (th < 0) {
        if (vf > 15) vf -= ph.brake * -th * dt;
        else if (vf > -ph.reverseMax && !broken) vf -= ph.accel * 0.6 * -th * dt;
      } else {
        const r = Math.min(Math.abs(vf), ph.rolling * dt);
        vf -= Math.sign(vf) * r;
      }
      vf *= 1 - ph.drag * dt;
      if (inp.hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), P.handbrakeDecel * dt);
      // split velocity: high lateral grip normally, low grip on handbrake -> controlled drift
      const g = (inp.hb ? ph.driftGrip : ph.grip) * (0.35 + 0.65 * surf);
      vl *= Math.max(0, 1 - g * dt);
      c.slip = Math.abs(vl);
      const sf = clamp(vf / 170, -1, 1);
      const turn = inp.st * ph.turnRate * sf * (inp.hb ? P.driftTurnBoost : 1);
      c.vx = fx * vf + rx * vl;
      c.vy = fy * vf + ry * vl;
      c.a = wrapA(c.a + turn * dt);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // tyre marks into the ring buffer
      const sp = Math.abs(vf);
      if ((c.slip > 140 || (inp.hb && sp > 120)) && sp + c.slip > 120) {
        const bx = c.x - fx * (c.len / 2 - 7), by = c.y - fy * (c.len / 2 - 7), o = c.wid / 2 - 3;
        const nr = [bx + rx * o, by + ry * o, bx - rx * o, by - ry * o];
        if (c.rear) { addSkid(c.rear[0], c.rear[1], nr[0], nr[1]); addSkid(c.rear[2], c.rear[3], nr[2], nr[3]); }
        c.rear = nr;
        if (R() < 0.35) emit(bx + rr(-6, 6), by + rr(-6, 6), rr(-20, 20), rr(-20, 20), rr(0.6, 1.1), rr(6, 10), "rgba(190,196,206,", 1);
      } else c.rear = null;
      if (c.dmg > CONFIG.damage.smokeAt && R() < 0.12) emit(c.x + fx * c.len * 0.35, c.y + fy * c.len * 0.35, rr(-10, 10), rr(-25, -5), rr(0.8, 1.4), rr(5, 9), c.dmg >= 100 ? "rgba(40,40,44," : "rgba(120,124,132,", 1);
    }

    // circle vs. solid cells: always push out (position correction) and reflect the normal velocity
    function pushOut(o, cx, cy, r) {
      let imp = 0;
      const gx0 = Math.floor((cx - r) / cell), gx1 = Math.floor((cx + r) / cell), gy0 = Math.floor((cy - r) / cell), gy1 = Math.floor((cy + r) / cell);
      for (let gy = gy0; gy <= gy1; gy++)
        for (let gx = gx0; gx <= gx1; gx++) {
          if (!solidCell(gx, gy)) continue;
          const x0 = gx * cell, y0 = gy * cell, x1 = x0 + cell, y1 = y0 + cell;
          const nx = clamp(cx, x0, x1), ny = clamp(cy, y0, y1);
          let dx = cx - nx, dy = cy - ny, d = Math.hypot(dx, dy), pen;
          if (d >= r) continue;
          if (d < 1e-6) {
            const l = cx - x0, rg = x1 - cx, t = cy - y0, b = y1 - cy, m = Math.min(l, rg, t, b);
            if (m === l) { dx = -1; dy = 0; } else if (m === rg) { dx = 1; dy = 0; } else if (m === t) { dx = 0; dy = -1; } else { dx = 0; dy = 1; }
            pen = m + r;
          } else { dx /= d; dy /= d; pen = r - d; }
          o.x += dx * pen; o.y += dy * pen; cx += dx * pen; cy += dy * pen;
          const vn = o.vx * dx + o.vy * dy;
          if (vn < 0) { o.vx -= 1.35 * vn * dx; o.vy -= 1.35 * vn * dy; o.vx *= 0.9; o.vy *= 0.9; imp = Math.max(imp, -vn); }
        }
      return imp;
    }
    function carWorld(c) {
      let imp = 0;
      const r = c.wid / 2 + 1, o = c.len / 2 - c.wid / 2, fx = Math.cos(c.a), fy = Math.sin(c.a);
      for (let it = 0; it < 2; it++) {
        imp = Math.max(imp, pushOut(c, c.x + fx * o, c.y + fy * o, r));
        imp = Math.max(imp, pushOut(c, c.x - fx * o, c.y - fy * o, r));
      }
      return imp;
    }
    function collidePair(a, b) {
      if (Math.abs(a.x - b.x) > 80 || Math.abs(a.y - b.y) > 80) return;
      const ra = a.wid / 2 + 1, rb = b.wid / 2 + 1, ma = a.static ? 40 : a.mass, mb = b.static ? 40 : b.mass, tot = ma + mb;
      const oa = a.len / 2 - a.wid / 2, ob = b.len / 2 - b.wid / 2;
      const ca = Math.cos(a.a), sa = Math.sin(a.a), cb = Math.cos(b.a), sb = Math.sin(b.a);
      let imp = 0;
      for (let i = -1; i <= 1; i += 2)
        for (let j = -1; j <= 1; j += 2) {
          const ax = a.x + ca * oa * i, ay = a.y + sa * oa * i, bx = b.x + cb * ob * j, by = b.y + sb * ob * j;
          let dx = ax - bx, dy = ay - by, d = Math.hypot(dx, dy);
          const min = ra + rb;
          if (d >= min) continue;
          if (d < 1e-4) { dx = 1; dy = 0; d = 1; }
          const nx = dx / d, ny = dy / d, pen = min - d;
          a.x += (nx * pen * mb) / tot; a.y += (ny * pen * mb) / tot;
          b.x -= (nx * pen * ma) / tot; b.y -= (ny * pen * ma) / tot;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel < 0) {
            const jj = (-1.3 * rel) / (1 / ma + 1 / mb);
            a.vx += (jj / ma) * nx; a.vy += (jj / ma) * ny; b.vx -= (jj / mb) * nx; b.vy -= (jj / mb) * ny;
            imp = Math.max(imp, -rel);
          }
        }
      if (a.static) { a.vx = 0; a.vy = 0; }
      if (b.static) { b.vx = 0; b.vy = 0; }
      if (imp > 0) onCarHit(a, b, imp);
    }
    function addDamage(c, imp) {
      const D = CONFIG.damage;
      if (imp < D.min) return;
      let d = (imp - D.min) * D.scale;
      if (c.personal) d *= 1 - CONFIG.damage.armorPerLevel * S.up.armor;
      const before = c.dmg;
      c.dmg = Math.min(100, c.dmg + d);
      if (c === player.car && before < 100 && c.dmg >= 100) toast(tt("Motorschaden! Steig aus [E] und hol dir ein anderes Auto.", "Engine wrecked! Get out [E] and find another car."), COL.coral);
    }
    function sparks(x, y, n) { for (let i = 0; i < n; i++) emit(x, y, rr(-220, 220), rr(-220, 220), rr(0.15, 0.4), 2, "rgba(255,200,90,", 2); }
    function onCarHit(a, b, imp) {
      addDamage(a, imp); addDamage(b, imp);
      const pc = player.car;
      if (a !== pc && b !== pc) return;
      const o = a === pc ? b : a;
      if (imp > 60) { audio.crash(imp); S.shake = Math.min(14, S.shake + imp / 40); sparks((a.x + b.x) / 2, (a.y + b.y) / 2, Math.min(14, imp / 25)); }
      // only the player's fault if the player was the one driving into the other car
      const nx = o.x - pc.x, ny = o.y - pc.y, nd = Math.hypot(nx, ny) || 1;
      const ram = (pc.vx * nx + pc.vy * ny) / nd > Math.max(80, (o.vx * -nx + o.vy * -ny) / nd);
      if (ram && isCop(o) && imp > CONFIG.law.policeHit && S.t - (S.lastCopHit || -9) > 3) { S.lastCopHit = S.t; crime(2, o.x, o.y, "cop"); }
      else if (ram && o.kind === "civ" && o.driver && imp > 200) { crime(1, o.x, o.y, "crash"); o.ai.panic = 5; }
      if (S.mission && S.mission.type === "truck" && o === S.mission.car) truckHit(imp);
    }

    // ─────────────────────────────── traffic AI ───────────────────────────────
    function driveTo(c, tx, ty, cruise, dt, aggressive) {
      const want = Math.atan2(ty - c.y, tx - c.x);
      const err = wrapA(want - c.a);
      const fs = c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);
      let st = clamp(err * 2.8, -1, 1);
      const desired = cruise * (1 - Math.min(1, Math.abs(err)) * (aggressive ? 0.4 : 0.6));
      let th = fs < desired - 10 ? 1 : fs > desired + 30 ? -0.6 : 0.2;
      let hb = aggressive && Math.abs(err) > 0.9 && fs > 260;
      if (c.revT > 0) { c.revT -= dt; th = -1; st = c.revSt; hb = false; }
      else if (Math.hypot(c.vx, c.vy) < 22 && th > 0) {
        c.stuckT += dt;
        if (c.stuckT > 1.1) { c.revT = 0.9; c.revSt = -Math.sign(err || 1); c.stuckT = 0; }
      } else c.stuckT = Math.max(0, c.stuckT - dt);
      c.inp.th = th; c.inp.st = st; c.inp.hb = hb;
    }
    function aiCivInput(c, dt) {
      const ai = c.ai;
      if (ai.to < 0 || !W.nodes[ai.to].adj.length) { const n = nearestNode(c.x, c.y); ai.from = n.i; ai.to = pick(n.adj); }
      const A = W.nodes[ai.from], B = W.nodes[ai.to];
      let dx = B.x - A.x, dy = B.y - A.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      ai.panic = Math.max(0, ai.panic - dt);
      const off = ai.off + (ai.panic > 0 ? Math.sin(S.t * 3 + c.id) * 16 : 0);
      const tx = B.x - dy * off, ty = B.y + dx * off;
      if (dist(c.x, c.y, tx, ty) < 48) {
        const opts = B.adj.filter((i) => i !== A.i);
        ai.from = B.i; ai.to = opts.length ? pick(opts) : A.i;
      }
      const cruise = c.kind === "truck" ? CONFIG.truck.cruise * (ai.panic > 0 ? 1.35 : 1) : c.kind === "civ" ? (ai.panic > 0 ? CONFIG.civ.panicCruise : CONFIG.civ.cruise) : CONFIG.civ.cruise * 1.1;
      driveTo(c, tx, ty, cruise, dt, false);
      // brake for whatever is in front (cars, the player on foot)
      const fx = Math.cos(c.a), fy = Math.sin(c.a), fs = c.vx * fx + c.vy * fy;
      if (c.ignoreT > 0) { c.ignoreT -= dt; return; }
      let blocked = false;
      const check = (ox, oy) => { const f = ox * fx + oy * fy; if (f <= 0 || f > 78) return false; return Math.abs(-ox * fy + oy * fx) < 21; };
      for (const o of cars) { if (o === c || o.dead) continue; if (Math.abs(o.x - c.x) > 90 || Math.abs(o.y - c.y) > 90) continue; if (check(o.x - c.x, o.y - c.y)) { blocked = true; break; } }
      if (!blocked && !player.car && check(player.x - c.x, player.y - c.y)) blocked = true;
      if (blocked) {
        c.inp.th = fs > 15 ? -1 : 0;
        c.blockT = (c.blockT || 0) + dt;
        if (c.blockT > 3.5) { c.ignoreT = 1.5; c.blockT = 0; c.hornT = 0.4; }
      } else c.blockT = 0;
    }
    function navigate(c, tx, ty, dt, cruise) {
      const d = dist(c.x, c.y, tx, ty);
      if (d < 650 && losClear(c.x, c.y, tx, ty, true)) { c.path.length = 0; driveTo(c, tx, ty, cruise, dt, true); return; }
      c.pathT -= dt;
      if (c.pathT <= 0 || !c.path.length) { c.pathT = 1; c.path = bfs(nearestNode(c.x, c.y).i, nearestNode(tx, ty).i); }
      while (c.path.length > 1) { const n = W.nodes[c.path[0]]; if (dist(c.x, c.y, n.x, n.y) < 75) c.path.shift(); else break; }
      if (!c.path.length) { driveTo(c, tx, ty, cruise, dt, true); return; }
      const n = W.nodes[c.path[0]];
      if (c.path.length === 1 && dist(c.x, c.y, n.x, n.y) < 75) { driveTo(c, tx, ty, cruise, dt, true); return; }
      let cr = cruise;
      if (c.path.length > 1) {
        const n2 = W.nodes[c.path[1]];
        const turn = Math.abs(wrapA(Math.atan2(n2.y - n.y, n2.x - n.x) - Math.atan2(n.y - c.y, n.x - c.x)));
        if (turn > 0.6 && dist(c.x, c.y, n.x, n.y) < 210) cr = Math.min(cr, 250);
      }
      driveTo(c, n.x, n.y, cr, dt, true);
    }
    function aiCop(c, dt) {
      if (S.stars === 0 || c.mode === "patrol") { aiCivInput(c, dt); return; }
      const pp = ppos();
      let tx, ty;
      if (c.mode === "chase") { tx = pp.x + (pp.vx || 0) * 0.35; ty = pp.y + (pp.vy || 0) * 0.35; }
      else {
        c.searchT -= dt;
        if (!c.searchPt || c.searchT <= 0 || dist(c.x, c.y, c.searchPt.x, c.searchPt.y) < 90) {
          const L = S.lastSeen || pp, rad = 180 + S.searchT * 35;
          const n = nearestNode(L.x + rr(-rad, rad), L.y + rr(-rad, rad));
          c.searchPt = { x: n.x, y: n.y }; c.searchT = 8;
        }
        tx = c.searchPt.x; ty = c.searchPt.y;
      }
      navigate(c, tx, ty, dt, c.mode === "chase" ? c.ph.maxSpeed : 320);
    }

    function spawnCiv(minD, maxD) {
      const pp = ppos();
      for (let tries = 0; tries < 14; tries++) {
        const e = pick(W.edges);
        if (!e.on) continue;
        const A = W.nodes[e.a], B = W.nodes[e.b];
        const flip = R() < 0.5, F = flip ? B : A, T = flip ? A : B;
        const t = rr(0.2, 0.8);
        let dx = T.x - F.x, dy = T.y - F.y; const L = Math.hypot(dx, dy); dx /= L; dy /= L;
        const off = CONFIG.civ.laneOffset;
        const x = F.x + (T.x - F.x) * t - dy * off, y = F.y + (T.y - F.y) * t + dx * off;
        const d = dist(x, y, pp.x, pp.y);
        if (d < minD || d > maxD) continue;
        if (cars.some((o) => !o.dead && Math.abs(o.x - x) < 70 && Math.abs(o.y - y) < 70)) continue;
        const c = makeCar("civ", x, y, Math.atan2(dy, dx));
        c.ai.from = F.i; c.ai.to = T.i;
        c.vx = dx * 120; c.vy = dy * 120;
        return c;
      }
      return null;
    }
    function spawnCop(kind, mode) {
      const pp = ppos();
      const cand = validNodes.filter((n) => { const d = dist(n.x, n.y, pp.x, pp.y); return d > 700 && d < 1200; });
      if (!cand.length) return null;
      const n = pick(cand);
      const to = W.nodes[pick(n.adj)];
      const c = makeCar(kind, n.x, n.y, Math.atan2(to.y - n.y, to.x - n.x));
      if (cars.some((o) => o !== c && !o.dead && dist(o.x, o.y, c.x, c.y) < 50)) { c.dead = true; return null; }
      c.ai.from = n.i; c.ai.to = to.i; c.mode = mode;
      return c;
    }
    function placeRoadblock() {
      const pc = player.car; if (!pc) return;
      const sp = speedOf(pc); if (sp < 120) return;
      const vx = pc.vx / sp, vy = pc.vy / sp;
      let best = null, bd = 1e9;
      for (const n of validNodes) {
        const dx = n.x - pc.x, dy = n.y - pc.y, d = Math.hypot(dx, dy);
        if (d < 450 || d > 950) continue;
        if ((dx * vx + dy * vy) / d < 0.75) continue;
        if (d < bd) { bd = d; best = n; }
      }
      if (!best) return;
      const dx = best.x - pc.x, dy = best.y - pc.y;
      const horiz = Math.abs(dx) > Math.abs(dy);
      const cx = horiz ? best.x - Math.sign(dx) * 75 : best.x, cy = horiz ? best.y : best.y - Math.sign(dy) * 75;
      for (const s of [-1, 1]) {
        const x = horiz ? cx : cx + s * 30, y = horiz ? cy + s * 30 : cy;
        if (!walkable(x, y)) continue;
        makeCar("police", x, y, horiz ? Math.PI / 2 : 0, { static: true, mode: "roadblock", life: 0 });
      }
      toast(tt("Straßensperre voraus!", "Roadblock ahead!"), COL.coral);
    }

    // ─────────────────────────────── pedestrians ───────────────────────────────
    const SKIN = ["#f1c7a5", "#d9a07a", "#b97a52", "#8a5634", "#5e3a22"];
    const SHIRT = ["#FF3B6B", "#00E5FF", "#FFB800", "#7CFF6B", "#f2f4f7", "#B46BFF", "#FF8A3D", "#3D7BFF"];
    function spawnPed(minD, maxD, near) {
      const c = near || ppos();
      for (let tries = 0; tries < 20; tries++) {
        const ang = R() * TAU, d = rr(minD, maxD);
        const x = c.x + Math.cos(ang) * d, y = c.y + Math.sin(ang) * d;
        const t = tileAt(x, y);
        if (t === T_BLD || t === T_WATER || t === T_ROAD || t === T_DIRT || t === T_MUD) continue;
        const p = { x, y, a: R() * TAU, vx: 0, vy: 0, tx: x, ty: y, mode: "walk", t: 0, skin: pick(SKIN), shirt: pick(SHIRT), report: null, dead: false, wait: 0 };
        peds.push(p);
        return p;
      }
      return null;
    }
    function pedSees(p, x, y) {
      const P = CONFIG.peds, d = dist(p.x, p.y, x, y);
      if (d > P.viewRange) return false;
      if (d > 45 && Math.abs(wrapA(Math.atan2(y - p.y, x - p.x) - p.a)) > P.viewCone / 2) return false;
      return losClear(p.x, p.y, x, y, false);
    }
    function copSees(c, x, y) {
      const P = CONFIG.police, d = dist(c.x, c.y, x, y);
      if (d > P.viewRange) return false;
      if (d > P.closeNotice && Math.abs(wrapA(Math.atan2(y - c.y, x - c.x) - c.a)) > P.viewCone / 2) return false;
      return losClear(c.x, c.y, x, y, false);
    }
    function stepPeds(dt) {
      const P = CONFIG.peds, pp = ppos();
      for (const p of peds) {
        if (p.dead) continue;
        if (p.mode === "down") {
          p.t -= dt; p.vx *= 1 - 5 * dt; p.vy *= 1 - 5 * dt;
          if (p.t <= 0) { p.mode = "flee"; p.t = 3; p.from = { x: pp.x, y: pp.y }; }
        } else if (p.report) {
          p.vx = 0; p.vy = 0;
          p.a = Math.atan2(pp.y - p.y, pp.x - p.x);
          const d = dist(p.x, p.y, pp.x, pp.y);
          const sees = d < P.viewRange * CONFIG.witness.escapeFactor && losClear(p.x, p.y, pp.x, pp.y, false);
          if (!sees) {
            p.report.lost += dt;
            if (p.report.lost > CONFIG.witness.losGrace) { p.report = null; p.mode = "walk"; toast(tt("Zeuge hat dich aus den Augen verloren.", "Witness lost sight of you."), COL.cyan); }
          } else {
            p.report.lost = 0;
            p.report.t += dt;
            if (p.report.t >= CONFIG.witness.reportTime) { report(p.report.sev, p.report.look, p.report.id); p.report = null; p.mode = "flee"; p.t = 4; p.from = { x: pp.x, y: pp.y }; }
          }
        } else {
          // dodge fast cars
          if (p.mode !== "dodge")
            for (const c of cars) {
              if (c.dead) continue;
              const sp = speedOf(c); if (sp < 110) continue;
              const ox = p.x - c.x, oy = p.y - c.y; if (Math.abs(ox) > 160 || Math.abs(oy) > 160) continue;
              const vx = c.vx / sp, vy = c.vy / sp, along = ox * vx + oy * vy, lat = -ox * vy + oy * vx;
              if (along > 0 && along < P.dodgeDist + sp * 0.25 && Math.abs(lat) < 28) {
                const side = lat >= 0 ? 1 : -1;
                p.mode = "dodge"; p.t = 0.45; p.vx = -vy * side * 240; p.vy = vx * side * 240; p.a = Math.atan2(p.vy, p.vx);
                break;
              }
            }
          if (p.mode === "dodge") { p.t -= dt; if (p.t <= 0) p.mode = "walk"; }
          else if (p.mode === "flee" || p.mode === "phoneFlee") {
            const f = p.from || pp, dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1;
            p.vx = (dx / d) * P.flee; p.vy = (dy / d) * P.flee; p.a = Math.atan2(p.vy, p.vx);
            p.t -= dt; if (p.t <= 0) p.mode = "walk";
          } else {
            p.wait -= dt;
            if (p.wait <= 0 && dist(p.x, p.y, p.tx, p.ty) < 8) {
              if (R() < 0.3) { p.wait = rr(1, 3); p.vx = 0; p.vy = 0; p.a += rr(-1.5, 1.5); }
              for (let k = 0; k < 6; k++) {
                const ang = R() * TAU, d = rr(40, 170), x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
                if (walkable(x, y) && losClear(p.x, p.y, x, y, true)) { p.tx = x; p.ty = y; break; }
              }
            }
            if (p.wait <= 0) {
              const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
              if (d > 2) { p.vx = (dx / d) * P.walk; p.vy = (dy / d) * P.walk; p.a = Math.atan2(dy, dx); } else { p.vx = 0; p.vy = 0; }
            } else { p.vx = 0; p.vy = 0; }
          }
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        pushOut(p, p.x, p.y, P.radius);
        // hit by a car: knocked over, gets up again
        if (p.mode !== "down")
          for (const c of cars) {
            if (c.dead) continue;
            if (Math.abs(c.x - p.x) > 40 || Math.abs(c.y - p.y) > 40) continue;
            const sp = speedOf(c);
            if (dist(c.x, c.y, p.x, p.y) < c.wid / 2 + 9) {
              const d = dist(c.x, c.y, p.x, p.y) || 1;
              if (sp > 60) {
                p.mode = "down"; p.t = 1.6; p.report = null;
                p.vx = ((p.x - c.x) / d) * 160 + c.vx * 0.5; p.vy = ((p.y - c.y) / d) * 160 + c.vy * 0.5;
                if (c === player.car) crime(1, p.x, p.y, "ped");
              } else { p.x += ((p.x - c.x) / d) * 2; p.y += ((p.y - c.y) / d) * 2; }
            }
          }
      }
    }

    // ─────────────────────────────── crimes, witnesses, heat ───────────────────────────────
    function crime(sev, x, y) {
      S.crimeId++;
      const id = S.crimeId, look = lookNow();
      for (const c of cars) if (isCop(c) && !c.dead && copSees(c, x, y)) { c.lock = CONFIG.police.lock; c.mode = "chase"; report(sev, look, id); return; }
      for (const p of peds) if (!p.dead && !p.report && p.mode !== "down" && pedSees(p, x, y)) { p.report = { t: 0, sev, look, id, lost: 0 }; p.mode = "phone"; }
    }
    function report(sev, look, id) {
      const before = S.stars;
      if (id !== S.reportedCrime) {
        S.reportedCrime = id;
        S.stars = before > 0 ? Math.min(6, Math.max(before + 1, sev)) : Math.min(6, Math.max(1, sev));
      }
      S.desc = look;
      const pp = ppos();
      S.lastSeen = { x: pp.x, y: pp.y }; S.searchT = 0;
      S.stats.maxStars = Math.max(S.stats.maxStars, S.stars);
      if (S.stars > before) {
        toast(before ? tt("Fahndung verschärft!", "Wanted level up!") : tt("Du wirst gesucht! Beschreibung: ", "You're wanted! Description: ") + lookText(look), COL.coral);
        audio.blip(660, 0.12, "square", 0.06); audio.blip(440, 0.18, "square", 0.06, 0, 0.12);
      }
    }
    function alarm(sev) {
      S.crimeId++;
      S.reportedCrime = S.crimeId;
      S.stars = Math.max(S.stars, sev);
      S.desc = lookNow();
      const pp = ppos(); S.lastSeen = { x: pp.x, y: pp.y }; S.searchT = 0;
      S.stats.maxStars = Math.max(S.stats.maxStars, S.stars);
      toast(tt("ALARM! Die Polizei ist unterwegs.", "ALARM! Police are on their way."), COL.coral);
      audio.blip(990, 0.25, "sawtooth", 0.07, 440);
    }
    function clearWanted(escaped) {
      if (escaped && S.stars > 0) {
        S.stats.escapes++;
        banner(tt("ABGEHÄNGT", "ESCAPED"), tt("Die Polizei hat deine Spur verloren.", "The police lost your trail."), COL.cyan);
        audio.blip(523, 0.12, "sine", 0.08); audio.blip(784, 0.2, "sine", 0.08, 0, 0.1);
      }
      S.stars = 0; S.desc = null; S.lastSeen = null; S.searchT = 0; S.pursuitT = 0; S.bustT = 0; S.seenNow = false;
      for (const p of peds) p.report = null;
    }
    function busted() {
      S.stats.busted++;
      const lost = Math.floor(S.dirty * CONFIG.economy.bustDirtyLoss), fine = Math.min(S.cash, CONFIG.economy.bustFineCash);
      S.dirty -= lost; S.cash -= fine;
      banner(tt("FESTGENOMMEN", "BUSTED"), tt(`Kaution ${money(fine)} · beschlagnahmt ${money(lost)} Schwarzgeld`, `Bail ${money(fine)} · seized ${money(lost)} dirty money`), COL.coral);
      if (S.mission) failMission(null);
      closeHack(false, true);
      closePhone();
      clearWanted(false);
      for (const c of cars) if (isCop(c) || c.kind === "police" || c.kind === "swat") c.dead = true;
      if (player.car) { player.car.kind = "parked"; player.car.driver = false; player.car = null; }
      respawnAtWash();
      save();
    }
    function updatePolice(dt) {
      const P = CONFIG.police, pp = ppos();
      let seen = false;
      for (const c of cars) {
        if (c.dead || !isCop(c)) continue;
        const sees = copSees(c, pp.x, pp.y);
        if (S.stars > 0) {
          if (sees && (lookMatches() || c.lock > 0)) { c.lock = P.lock; seen = true; }
          c.lock = Math.max(0, c.lock - dt);
          if (!c.static) c.mode = c.lock > 0 ? "chase" : "search";
        } else {
          if (!c.static) c.mode = "patrol";
          c.lock = 0;
          if (sees && player.car && speedOf(player.car) > CONFIG.law.speedLimit) crime(1, pp.x, pp.y);
        }
      }
      if (S.stars > 0) {
        if (seen) {
          S.lastSeen = { x: pp.x, y: pp.y }; S.searchT = 0; S.pursuitT += dt;
          if (S.pursuitT >= P.escalateEvery && S.stars < 6) { S.pursuitT = 0; S.stars++; S.stats.maxStars = Math.max(S.stats.maxStars, S.stars); toast(tt("Die Verfolgung eskaliert!", "The chase escalates!"), COL.coral); }
        } else {
          S.searchT += dt;
          if (S.searchT >= P.searchTime[S.stars]) clearWanted(true);
        }
        S.seenNow = seen;
        if (S.stars > 0) {
          const pc = player.car, sp = pc ? speedOf(pc) : 0;
          let near = false;
          for (const c of cars) if (!c.dead && isCop(c) && dist(c.x, c.y, pp.x, pp.y) < (pc ? P.bustDist : 52)) { near = true; break; }
          if (near && sp < P.bustSpeed && seen) S.bustT += dt; else S.bustT = Math.max(0, S.bustT - dt * 1.5);
          const need = P.bustTime + (pc && pc.personal ? S.up.armor * 0.6 : 0);
          if (S.bustT >= need) { busted(); return; }
        }
      } else { S.seenNow = false; S.bustT = 0; }

      // police numbers: patrols normally, more units per star
      S.spawnT -= dt;
      const hot = S.bheat >= CONFIG.economy.heatFreeze;
      const target = S.stars > 0 ? P.perStars[S.stars] + 1 : P.patrols + (hot ? P.patrolsHot : 0);
      let mobile = 0, swat = 0;
      for (const c of cars) if (!c.dead && isCop(c) && !c.static) { mobile++; if (c.kind === "swat") swat++; }
      if (mobile < target && S.spawnT <= 0 && S.started) {
        const kind = S.stars >= P.swatFrom && swat < P.swatMax ? "swat" : "police";
        if (spawnCop(kind, S.stars > 0 ? "search" : "patrol")) S.spawnT = P.spawnGap;
      } else if (mobile > target) {
        const far = cars.find((c) => !c.dead && isCop(c) && !c.static && c.lock <= 0 && dist(c.x, c.y, pp.x, pp.y) > 1100);
        if (far) far.dead = true;
      }
      if (S.stars >= P.roadblockFrom) { S.roadblockT -= dt; if (S.roadblockT <= 0) { placeRoadblock(); S.roadblockT = P.roadblockEvery; } }
      else S.roadblockT = 3;
      for (const c of cars) if (c.static && !c.dead) { c.life += dt; if ((S.stars < P.roadblockFrom || c.life > P.roadblockLife) && dist(c.x, c.y, pp.x, pp.y) > 700) c.dead = true; }
    }

    // ─────────────────────────────── money ───────────────────────────────
    function cashFx(n) { const pp = ppos(); for (let i = 0; i < n; i++) emit(pp.x, pp.y, rr(-140, 140), rr(-160, -40), rr(0.7, 1.2), 6, "rgba(124,255,107,", 3); }
    function payDirty(v) { v = Math.round(v); S.dirty += v; S.stats.earned += v; audio.cash(); cashFx(14); return v; }
    function payClean(v) { v = Math.round(v); S.cash += v; S.stats.earned += v; audio.cash(); cashFx(10); return v; }
    function addHeat(v) { S.bheat = clamp(S.bheat + v, 0, 100); }
    function spend(v) {
      if (S.cash >= v) { S.cash -= v; return true; }
      if (S.cash + S.dirty >= v) { S.dirty -= v - S.cash; S.cash = 0; return true; }
      return false;
    }

    // ─────────────────────────────── missions & live events ───────────────────────────────
    const EV = {
      truck: { illegal: true, title: () => tt("Geldtransporter", "Armored truck"), text: () => tt("🔴 Livestream: Geldtransporter am Pier blockiert – Crew wartet auf Freigabe. Wer zuerst da ist …", "🔴 Livestream: armored truck stuck at the pier – crew waiting for clearance. First come …"), at: () => W.places.pier },
      vip: { illegal: true, title: () => tt("VIP-Kurier", "VIP courier"), text: () => tt("Promi-Kurier verlässt gleich den Club Palma – Koffer voller Bargeld, kaum Begleitschutz.", "Celebrity courier about to leave Club Palma – briefcase full of cash, barely any escort."), at: () => W.places.club },
      race: { illegal: false, title: () => tt("Rivalen-Meetup", "Rival meetup"), text: () => tt("Rivalen-Meetup am Dock: Wer schafft die Strecke unter der Bestzeit? Preisgeld wartet.", "Rival meetup at the docks: who beats the record lap? Prize money waiting."), at: () => W.places.meetup },
      tip: { illegal: true, title: () => tt("Insider-Tipp", "Insider tip"), text: (e) => tt(`Insider-Tipp: Tresor in ${e.wh.label} gerade schlecht gesichert (+60 %).`, `Insider tip: the safe at ${e.wh.label.replace("KAI", "PIER")} is poorly secured right now (+60%).`), at: (e) => e.wh },
      client: { illegal: false, title: () => tt("Stammkunde", "Regular client"), text: () => tt("Stammkunde zahlt extra für eine saubere Lieferung von Suds & Cash (+50 %).", "Regular client pays extra for a clean delivery from Suds & Cash (+50%)."), at: () => W.places.wash },
    };
    function spawnEvent() {
      const active = new Set(S.events.map((e) => e.type));
      const options = Object.keys(EV).filter((k) => !active.has(k) && !(S.mission && S.mission.type === k));
      if (!options.length) return;
      const type = pick(options);
      const e = { type, t: type === "truck" ? CONFIG.events.truckLife : CONFIG.events.life, id: S.t };
      if (type === "tip") { e.wh = pick(W.places.warehouses); e.wh.tip = true; e.wh.cool = 0; }
      if (type === "client") S.clientBonus = true;
      const at = EV[type].at(e); e.x = at.x; e.y = at.y;
      S.events.push(e);
      S.feed.unshift({ text: EV[type].text(e), t: S.t, ev: e });
      if (S.feed.length > 12) S.feed.pop();
      toast("📱 StreetPulse: " + EV[type].title(), COL.gold);
      audio.blip(880, 0.07, "sine", 0.06); audio.blip(1175, 0.09, "sine", 0.06, 0, 0.08);
    }
    function endEvent(e) {
      S.events = S.events.filter((x) => x !== e);
      if (e.type === "tip" && e.wh) e.wh.tip = false;
      if (e.type === "client") S.clientBonus = false;
    }
    function updateEvents(dt) {
      S.nextEvent -= dt;
      if (S.nextEvent <= 0) { spawnEvent(); S.nextEvent = CONFIG.events.every; }
      for (const e of S.events.slice()) { e.t -= dt; if (e.t <= 0) endEvent(e); }
      for (const w of W.places.warehouses) w.cool = Math.max(0, w.cool - dt);
    }
    function routeTo(a, b) { return pathLength(nearestNode(a.x, a.y), nearestNode(b.x, b.y)); }
    function farNode(fromX, fromY, minD, maxD, zones) {
      const c = validNodes.filter((n) => { const d = dist(n.x, n.y, fromX, fromY); return d >= minD && d <= maxD && (!zones || zones.includes(zoneAt(n.x, n.y))); });
      return c.length ? pick(c) : pick(validNodes);
    }
    function completeMission(text) {
      banner(tt("ERLEDIGT", "COMPLETE"), text, COL.gold);
      S.mission = null; S.waypoint = null;
      save();
    }
    function failMission(text) {
      const m = S.mission;
      if (!m) return;
      if (m.car && (m.type === "delivery" || m.type === "truck") && m.car !== player.car) m.car.dead = true;
      S.mission = null;
      if (text) banner(tt("GESCHEITERT", "FAILED"), text, COL.coral);
    }
    function startSafe(wh) {
      for (let i = 0; i < 2; i++) { const g = spawnPed(60, 160, wh); if (g) g.shirt = "#2B2F3A"; }
      openHack(R() < 0.5 ? "print" : "volt", tt("TRESOR · ", "SAFE · ") + wh.label, (ok) => {
        if (ok) {
          const v = payDirty(rr(CONFIG.heists.safeMin, CONFIG.heists.safeMax) * (wh.tip ? CONFIG.heists.tipBonus : 1));
          addHeat(CONFIG.heists.safeHeat); S.stats.heists++; wh.cool = CONFIG.heists.safeCooldown;
          banner(money(v), tt("Schwarzgeld erbeutet – jetzt weg hier!", "Dirty cash grabbed – now get out of here!"), COL.gold);
          crime(2, wh.x, wh.y);
          save();
        } else { wh.cool = 30; alarm(3); }
      });
    }
    function startEventMission(e) {
      endEvent(e);
      if (e.type === "truck") {
        const n = W.places.pier, to = W.nodes[pick(n.adj)];
        const truck = makeCar("truck", n.x, n.y, Math.atan2(to.y - n.y, to.x - n.x));
        truck.ai.from = n.i; truck.ai.to = to.i;
        S.mission = { type: "truck", stage: "ram", car: truck, timer: CONFIG.events.truckLife };
        toast(tt("Ramm den Geldtransporter, bis er stehen bleibt!", "Ram the armored truck until it stops!"), COL.gold);
      } else if (e.type === "vip") {
        const d = farNode(e.x, e.y, 1600, 3200, [2, 3]);
        S.mission = { type: "vip", stage: "drop", target: { x: d.x, y: d.y }, timer: CONFIG.heists.vipTime };
        crime(2, e.x, e.y);
        toast(tt("Koffer geschnappt! Bring ihn zum Treffpunkt.", "Briefcase snatched! Take it to the drop-off."), COL.gold);
      } else if (e.type === "race") startRace("race");
    }
    function startRace(type) {
      const zones = type === "race" ? [0, 1] : [2];
      const start = type === "race" ? W.places.meetup : W.places.trialStart;
      const cps = []; let cur = start, total = 0;
      for (let i = 0; i < CONFIG.legal.checkpoints; i++) {
        const n = farNode(cur.x, cur.y, 450, 1300, zones);
        if (n === cur) continue;
        total += routeTo(cur, n); cps.push({ x: n.x, y: n.y }); cur = n;
      }
      const time = total / CONFIG.legal.raceSpeed + CONFIG.legal.raceGrace;
      S.mission = { type, cps, idx: 0, timer: time, total: time };
      toast(type === "race" ? tt("Rennen läuft – fahr durch alle Checkpoints!", "Race on – hit every checkpoint!") : tt("Zeitfahren auf den Keys – los!", "Keys time trial – go!"), COL.cyan);
      audio.blip(440, 0.15, "square", 0.06); audio.blip(440, 0.15, "square", 0.06, 0, 0.5); audio.blip(880, 0.3, "square", 0.07, 0, 1);
    }
    function startDelivery() {
      if (S.mission) return;
      const P = W.places.wash;
      const c = makeCar("parked", P.x + 60, P.y, Math.PI / 2, { driver: false, client: true, color: "#F2F4F7", model: "Bayline Coupé" });
      S.mission = { type: "delivery", stage: "enter", car: c, timer: 40, leave: 0, bonus: S.clientBonus };
      if (S.clientBonus) { const e = S.events.find((x) => x.type === "client"); if (e) endEvent(e); }
      closePhone();
      toast(tt("Steig in den weißen Kundenwagen [E] – ohne Kratzer abliefern!", "Get into the white client car [E] – deliver it without a scratch!"), COL.cyan);
    }
    function truckHit(imp) {
      const m = S.mission;
      if (!m || m.stage !== "ram") return;
      const T = CONFIG.truck;
      if (imp < T.hitMin) return;
      m.car.hp -= T.hitBase + (imp - T.hitMin) * T.hitScale;
      m.car.ai.panic = 6;
      if (!m.alerted) { m.alerted = true; if (S.stars < 1) alarm(1); toast(tt("Der Fahrer funkt die Polizei an!", "The driver radios the police!"), COL.coral); }
      if (m.car.hp <= 0) {
        m.stage = "hack"; m.car.driver = false; m.car.kind = "parked"; m.car.inp.th = 0;
        for (let i = 0; i < 2; i++) {
          const p = spawnPed(30, 60, m.car);
          if (p) { p.shirt = "#8a919c"; p.report = { t: 0, sev: 3, look: lookNow(), id: ++S.crimeId, lost: 0 }; p.mode = "phone"; }
        }
        toast(tt("Transporter gestoppt! Knack die Hecktür [E].", "Truck stopped! Crack the rear door [E]."), COL.gold);
      }
    }
    function updateMission(dt) {
      const m = S.mission;
      if (!m) return;
      const pp = ppos();
      m.timer -= dt;
      if (m.type === "truck") {
        if (m.car.dead) { failMission(tt("Der Transporter ist weg.", "The truck is gone.")); return; }
        if (m.timer <= 0) { failMission(tt("Zu spät – der Transporter ist entkommen.", "Too late – the truck got away.")); return; }
      } else if (m.type === "vip") {
        if (m.timer <= 0) { failMission(tt("Der Käufer ist weg.", "The buyer left.")); return; }
        if (dist(pp.x, pp.y, m.target.x, m.target.y) < 80 && speedOf(pp.car || player) < 160) {
          const v = payDirty(rr(CONFIG.heists.vipMin, CONFIG.heists.vipMax));
          addHeat(CONFIG.heists.vipHeat); S.stats.heists++;
          completeMission(tt(`Koffer abgegeben: +${money(v)} Schwarzgeld`, `Briefcase delivered: +${money(v)} dirty cash`));
        }
      } else if (m.type === "race" || m.type === "trial") {
        if (m.timer <= 0) { failMission(tt("Zeit abgelaufen.", "Time's up.")); return; }
        const cp = m.cps[m.idx];
        if (cp && dist(pp.x, pp.y, cp.x, cp.y) < CONFIG.legal.cpRadius) {
          m.idx++;
          audio.blip(988, 0.08, "square", 0.06);
          if (m.idx >= m.cps.length) {
            if (m.type === "race") {
              const v = payClean(CONFIG.legal.raceprize); S.stats.races++;
              completeMission(tt(`Bestzeit geschlagen: +${money(v)}`, `Record beaten: +${money(v)}`));
            } else {
              const v = payClean(CONFIG.legal.trialPrize); addHeat(CONFIG.legal.trialHeat); S.stats.legal++;
              completeMission(tt(`Zeitfahren geschafft: +${money(v)} · Business-Heat ${CONFIG.legal.trialHeat}`, `Time trial done: +${money(v)} · business heat ${CONFIG.legal.trialHeat}`));
            }
          }
        }
      } else if (m.type === "delivery") {
        if (m.car.dead) { failMission(tt("Der Kundenwagen ist weg.", "The client car is gone.")); return; }
        if (m.stage === "enter") {
          if (player.car === m.car) {
            const d = farNode(m.car.x, m.car.y, 1300, 2600);
            m.target = { x: d.x, y: d.y };
            m.stage = "drive";
            m.timer = routeTo(m.car, d) / CONFIG.legal.deliverySpeed + CONFIG.legal.deliveryGrace;
            toast(tt("Liefere den Wagen ab – Schäden kosten Geld!", "Deliver the car – damage costs money!"), COL.cyan);
          } else if (m.timer <= 0) failMission(tt("Der Kunde hat abgesagt.", "The client cancelled."));
        } else {
          if (player.car !== m.car) { m.leave += dt; if (m.leave > CONFIG.legal.leaveLimit) { failMission(tt("Du hast den Kundenwagen stehen lassen.", "You abandoned the client car.")); return; } } else m.leave = 0;
          if (m.timer <= 0) { failMission(tt("Zu spät geliefert.", "Delivered too late.")); return; }
          if (player.car === m.car && dist(pp.x, pp.y, m.target.x, m.target.y) < 80 && speedOf(m.car) < 140) {
            const L = CONFIG.legal;
            const ok = m.car.dmg <= L.deliveryMaxDmg;
            const base = rr(L.deliveryMin, L.deliveryMax) * (m.bonus ? L.clientBonus : 1);
            const v = payClean(ok ? base * (1 - m.car.dmg / 200) : base * 0.3);
            addHeat(ok ? L.deliveryHeat : L.deliveryHeat / 2); S.stats.legal++;
            exitCar(true);
            m.car.dead = true;
            completeMission(ok ? tt(`Sauber geliefert: +${money(v)} · Business-Heat ${L.deliveryHeat}`, `Clean delivery: +${money(v)} · business heat ${L.deliveryHeat}`) : tt(`Beschädigt geliefert: nur +${money(v)}`, `Delivered damaged: only +${money(v)}`));
            toast(tt("Hol dir dein Auto per MopedDrop (Handy).", "Get your car via MopedDrop (phone)."), COL.cyan);
          }
        }
      }
    }
    function missionTarget() {
      const m = S.mission;
      if (!m) return S.waypoint || null;
      if (m.type === "truck") return { x: m.car.x, y: m.car.y };
      if (m.type === "vip") return m.target;
      if (m.type === "race" || m.type === "trial") return m.cps[m.idx] || null;
      if (m.type === "delivery") return m.stage === "enter" ? { x: m.car.x, y: m.car.y } : m.target;
      return null;
    }
    function missionText() {
      const m = S.mission;
      if (!m) return "";
      const tm = Math.max(0, Math.ceil(m.timer));
      if (m.type === "truck") return m.stage === "ram" ? tt(`Ramm den Geldtransporter · Panzerung ${Math.max(0, Math.round(m.car.hp))} % · ${tm} s`, `Ram the armored truck · armor ${Math.max(0, Math.round(m.car.hp))}% · ${tm}s`) : tt(`Knack die Hecktür [E] · ${tm} s`, `Crack the rear door [E] · ${tm}s`);
      if (m.type === "vip") return tt(`Bring den Koffer zum Treffpunkt · ${tm} s`, `Take the briefcase to the drop-off · ${tm}s`);
      if (m.type === "race" || m.type === "trial") return (m.type === "race" ? tt("Rennen", "Race") : tt("Zeitfahren", "Time trial")) + ` · Checkpoint ${m.idx + 1}/${m.cps.length} · ${tm} s`;
      if (m.type === "delivery") return m.stage === "enter" ? tt(`Steig in den Kundenwagen · ${tm} s`, `Get into the client car · ${tm}s`) : tt(`Kundenwagen abliefern · Schaden ${Math.round(m.car.dmg)} % · ${tm} s`, `Deliver the client car · damage ${Math.round(m.car.dmg)}% · ${tm}s`);
      return "";
    }

    // ─────────────────────────────── interaction ───────────────────────────────
    function interactables() {
      const list = [];
      const inCar = !!player.car;
      list.push({ x: W.places.wash.x, y: W.places.wash.y, r: 70, label: tt("Suds & Cash öffnen", "Open Suds & Cash"), act: () => openPhone("wash"), col: COL.cyan });
      if (inCar) for (const p of W.places.resprays) list.push({ x: p.x, y: p.y, r: 70, label: tt(`Umlackieren (${money(CONFIG.economy.respray)})`, `Respray (${money(CONFIG.economy.respray)})`), act: doRespray, col: COL.gold, strip: !player.car.personal && !player.car.client });
      const m = S.mission;
      if (!m) {
        for (const w of W.places.warehouses) if (w.cool <= 0) list.push({ x: w.x, y: w.y, r: 70, label: tt("Tresor knacken", "Crack the safe") + (w.tip ? " (+60 %)" : ""), act: () => startSafe(w), col: COL.coral, slow: true });
        list.push({ x: W.places.trialStart.x, y: W.places.trialStart.y, r: 70, label: tt("Zeitfahren auf den Keys (legal)", "Keys time trial (legal)"), act: () => startRace("trial"), col: COL.cyan });
        for (const e of S.events) if (e.type === "truck" || e.type === "vip" || e.type === "race") list.push({ x: e.x, y: e.y, r: 80, label: EV[e.type].title(), act: () => startEventMission(e), col: EV[e.type].illegal ? COL.coral : COL.cyan, needCar: e.type !== "truck" ? true : false });
      } else if (m.type === "truck" && m.stage === "hack") {
        list.push({ x: m.car.x, y: m.car.y, r: 85, label: tt("Hecktür knacken", "Crack the rear door"), act: () => openHack("volt", tt("GELDTRANSPORTER", "ARMORED TRUCK"), (ok) => {
          if (ok) {
            const v = payDirty(rr(CONFIG.heists.truckMin, CONFIG.heists.truckMax));
            addHeat(CONFIG.heists.truckHeat); S.stats.heists++;
            m.car.dead = false;
            completeMission(tt(`Beute: +${money(v)} Schwarzgeld`, `Loot: +${money(v)} dirty cash`));
          } else { alarm(3); failMission(tt("Die Tür hat dichtgemacht.", "The door locked down.")); }
        }), col: COL.gold });
      }
      return list;
    }
    function nearInteractable() {
      const pp = ppos();
      let best = null, bd = 1e9;
      for (const it of interactables()) {
        const d = dist(pp.x, pp.y, it.x, it.y);
        if (d < it.r && d < bd) { bd = d; best = it; }
      }
      return best;
    }
    function interact() {
      if (hack) return;
      const it = nearInteractable();
      const pc = player.car;
      if (it && (!pc || speedOf(pc) < 90)) {
        if (it.needCar && !pc) { toast(tt("Dafür brauchst du ein Auto.", "You need a car for that."), COL.coral); return; }
        it.act();
        return;
      }
      if (pc) exitCar(false);
      else tryEnter();
    }
    function exitCar(force) {
      const c = player.car;
      if (!c) return;
      if (!force && speedOf(c) > CONFIG.foot.exitMaxSpeed) { toast(tt("Erst langsamer werden!", "Slow down first!")); return; }
      const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx, o = c.wid / 2 + 12;
      const spots = [[rx * o, ry * o], [-rx * o, -ry * o], [fx * (c.len / 2 + 12), fy * (c.len / 2 + 12)], [-fx * (c.len / 2 + 12), -fy * (c.len / 2 + 12)]];
      let sx = c.x + spots[0][0], sy = c.y + spots[0][1];
      for (const s of spots) if (walkable(c.x + s[0], c.y + s[1])) { sx = c.x + s[0]; sy = c.y + s[1]; break; }
      player.x = sx; player.y = sy; player.vx = 0; player.vy = 0; player.a = c.a;
      c.kind = "parked"; c.driver = false; c.mode = "parked"; c.inp.th = 0; c.inp.st = 0;
      player.car = null;
    }
    function tryEnter() {
      let best = null, bd = CONFIG.foot.enterDist + 22;
      for (const c of cars) {
        if (c.dead || c.static || isCop(c) || c.kind === "police" || c.kind === "swat" || c.kind === "truck") continue;
        const d = dist(c.x, c.y, player.x, player.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (!best) return;
      if (speedOf(best) > 120) { toast(tt("Zu schnell – stell dich vor das Auto.", "Too fast – step in front of the car.")); return; }
      const jacked = best.kind === "civ" && best.driver;
      enterCar(best);
      if (jacked) {
        const fx = Math.cos(best.a), fy = Math.sin(best.a);
        const p = { x: best.x - fy * 24, y: best.y + fx * 24, a: 0, vx: 0, vy: 0, tx: 0, ty: 0, mode: "phone", t: 0, skin: pick(SKIN), shirt: pick(SHIRT), report: null, dead: false, wait: 0 };
        if (!walkable(p.x, p.y)) { p.x = best.x + fy * 24; p.y = best.y - fx * 24; }
        peds.push(p);
        crime(1, best.x, best.y);
        p.report = { t: 0, sev: 1, look: lookNow(), id: S.crimeId, lost: 0 };
        toast(tt("Auto geklaut! Der Fahrer greift zum Handy …", "Car stolen! The driver grabs their phone …"), COL.coral);
      }
    }
    function doRespray() {
      const c = player.car;
      if (!c) return;
      if (S.seenNow) { toast(tt("Nicht jetzt – die Polizei sieht dich!", "Not now – the police can see you!"), COL.coral); return; }
      if (!spend(CONFIG.economy.respray)) { toast(tt("Zu wenig Geld.", "Not enough money."), COL.coral); return; }
      const opts = PAINT.filter((p) => p.c !== c.color);
      c.color = pick(opts).c; c.dmg = 0;
      if (c.personal) S.color = c.color;
      if (S.stars > 0) { clearWanted(true); toast(tt("Neue Farbe – die Fahndungsbeschreibung passt nicht mehr.", "New paint – the wanted description no longer fits."), COL.cyan); }
      else toast(tt("Frisch lackiert und repariert.", "Fresh paint, fully repaired."), COL.cyan);
      for (let i = 0; i < 24; i++) emit(c.x + rr(-30, 30), c.y + rr(-30, 30), rr(-40, 40), rr(-40, 40), rr(0.5, 1), rr(8, 14), "rgba(200,220,255,", 1);
      audio.blip(300, 0.3, "sawtooth", 0.04, 900);
      save();
    }
    function doStrip() {
      const c = player.car, it = nearInteractable();
      if (!c || !it || !it.strip) return;
      if (S.seenNow) { toast(tt("Nicht jetzt – die Polizei sieht dich!", "Not now – the police can see you!"), COL.coral); return; }
      const v = payDirty(rr(CONFIG.economy.stripMin, CONFIG.economy.stripMax));
      exitCar(true);
      c.dead = true;
      toast(tt(`Geklautes Auto ausgeschlachtet: +${money(v)} Schwarzgeld`, `Stolen car stripped: +${money(v)} dirty cash`), COL.gold);
    }
    function mopedDrop() {
      if (player.car && player.car.personal) { toast(tt("Du sitzt schon in deinem Auto.", "You're already in your car.")); return; }
      if (!spend(CONFIG.economy.moped)) { toast(tt("Zu wenig Geld.", "Not enough money."), COL.coral); return; }
      const pp = ppos();
      let best = null, bd = 1e9;
      for (let gy = -6; gy <= 6; gy++)
        for (let gx = -6; gx <= 6; gx++) {
          const x = (Math.floor(pp.x / cell) + gx + 0.5) * cell, y = (Math.floor(pp.y / cell) + gy + 0.5) * cell;
          const t = tileAt(x, y);
          if (t !== T_ROAD && t !== T_DIRT && t !== T_CONC) continue;
          const d = dist(x, y, pp.x, pp.y);
          if (d < 70 || d > bd) continue;
          if (cars.some((o) => !o.dead && dist(o.x, o.y, x, y) < 50)) continue;
          bd = d; best = { x, y };
        }
      if (!best) best = { x: W.places.wash.x, y: W.places.wash.y };
      spawnPersonal(best.x, best.y, Math.atan2(pp.y - best.y, pp.x - best.x));
      S.waypoint = { x: best.x, y: best.y, temp: 12 };
      closePhone();
      toast(tt("MopedDrop: Dein Auto steht am Straßenrand.", "MopedDrop: your car is waiting at the curb."), COL.cyan);
    }

    // ─────────────────────────────── hacking terminal ───────────────────────────────
    let hack = null;
    const hackEl = document.createElement("div");
    hackEl.className = "ss-hack"; hackEl.style.display = "none";
    root.appendChild(hackEl);
    function makePrint(seed) {
      const w = 220, h = 240, c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d"), img = g.createImageData(w, h), r = rng(seed);
      const ox = w * (0.44 + r() * 0.12), oy = h * (0.46 + r() * 0.12), a1 = r() * 6, a2 = r() * 6, f1 = 0.03 + r() * 0.03, f2 = 0.03 + r() * 0.03, k = 0.4 + r() * 0.14, sw = 1.5 + r() * 2;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const dx = x - ox, dy = (y - oy) * 0.85, d = Math.sqrt(dx * dx + dy * dy);
          const warp = 3.2 * Math.sin(x * f1 + a1) + 2.6 * Math.cos(y * f2 + a2) + 1.5 * Math.sin((x + y) * 0.05 + a1 * 2);
          const v = Math.sin(d * k + warp + Math.atan2(dy, dx) * sw);
          const m = (dx * dx) / (w * 0.46) ** 2 + ((y - oy) * (y - oy)) / (h * 0.46) ** 2;
          const o = (y * w + x) * 4;
          if (v > 0.12 && m < 1) { img.data[o] = 57; img.data[o + 1] = 255; img.data[o + 2] = 154; img.data[o + 3] = Math.round(255 * (1 - m * 0.55)); }
        }
      g.putImageData(img, 0, 0); // generated once per hack, never per frame
      return c;
    }
    function openHack(mode, title, cb) {
      closePhone();
      const H = CONFIG.hack;
      hack = { mode, cb, t: mode === "print" ? H.printTime : H.voltTime, max: mode === "print" ? H.printTime : H.voltTime, done: false, flash: 0, uiT: 0 };
      let inner = `<div class="ss-term" role="dialog" aria-label="${title}"><h3>&gt; ${title}</h3>`;
      if (mode === "print") {
        hack.print = makePrint(ri(1, 1e9));
        hack.sel = 0;
        hack.off = [0, 0, 0, 0].map(() => ri(1, H.printPositions - 1));
        inner += `<div class="ss-sub">PRINTSHIFT v2.6 · ${tt("Richte alle 4 Streifen links passend zum Abdruck rechts aus. ↑↓ wählen, ←→ verschieben.", "Align all 4 strips on the left with the print on the right. ↑↓ select, ←→ shift.")}</div>
          <canvas class="ss-pc" width="620" height="260" style="width:100%;height:auto;display:block;touch-action:none"></canvas>
          <div><button data-act="h:up">▲</button><button data-act="h:down">▼</button><button data-act="h:left">◀</button><button data-act="h:right">▶</button><button data-act="h:abort" style="float:right">${tt("Abbrechen", "Abort")}</button></div>`;
      } else {
        const L = [ri(1, 9), ri(1, 9), ri(1, 9)];
        const M = [10, 2, 1].sort(() => R() - 0.5);
        const perm = [0, 1, 2].sort(() => R() - 0.5);
        hack.L = L; hack.M = M; hack.links = [-1, -1, -1]; hack.selL = -1;
        hack.target = L[0] * M[perm[0]] + L[1] * M[perm[1]] + L[2] * M[perm[2]];
        inner += `<div class="ss-sub">VOLTBRIDGE · ${tt("Verbinde jede Zahl links mit einem Multiplikator rechts, bis die Summe genau die Zielspannung ergibt. Tasten 1–3 links, dann 1–3 rechts.", "Link every number on the left to a multiplier on the right so the sum hits the target voltage exactly. Keys 1–3 left, then 1–3 right.")}</div>
          <div class="ss-volt"><svg></svg>
            <div class="col">${L.map((v, i) => `<button data-act="h:l${i}">${v}</button>`).join("")}</div>
            <div><div class="ss-target">${hack.target}V</div><div class="ss-sum" style="text-align:center;font-size:12px;margin-top:6px"></div></div>
            <div class="col">${M.map((v, i) => `<button data-act="h:r${i}">×${v}</button>`).join("")}</div>
          </div><div><button data-act="h:abort" style="float:right">${tt("Abbrechen", "Abort")}</button><div style="clear:both"></div></div>`;
      }
      inner += `<div class="ss-bar"><i></i></div><div class="ss-risk"><span class="ss-r1"></span><span class="ss-r2"></span></div></div>`;
      hackEl.innerHTML = inner;
      hackEl.style.display = "flex";
      hack.bar = hackEl.querySelector(".ss-bar i");
      hack.r1 = hackEl.querySelector(".ss-r1");
      hack.r2 = hackEl.querySelector(".ss-r2");
      if (mode === "print") {
        hack.cv = hackEl.querySelector(".ss-pc");
        hack.cx = hack.cv.getContext("2d");
        hack.cv.addEventListener("pointerdown", (e) => {
          const r = hack.cv.getBoundingClientRect(), y = ((e.clientY - r.top) / r.height) * 260 - 10;
          if (y >= 0 && y < 240) hack.sel = clamp(Math.floor(y / 60), 0, 3);
        });
      } else {
        hack.svg = hackEl.querySelector("svg");
        hack.sum = hackEl.querySelector(".ss-sum");
        drawVolt();
      }
      audio.blip(520, 0.08, "square", 0.05);
    }
    function closeHack(ok, silent) {
      if (!hack) return;
      const h = hack;
      hack = null;
      hackEl.style.display = "none";
      hackEl.innerHTML = "";
      if (!silent) {
        audio.blip(ok ? 880 : 180, ok ? 0.25 : 0.4, ok ? "sine" : "sawtooth", 0.07);
        h.cb(ok);
      }
    }
    function hackInput(act) {
      if (!hack || hack.done) return;
      if (act === "abort") {
        hack.done = true;
        const h = hack; hack = null; hackEl.style.display = "none"; hackEl.innerHTML = "";
        toast(tt("Hack abgebrochen.", "Hack aborted."));
        if (h.mode === "print" || h.mode === "volt") { for (const w of W.places.warehouses) if (w.cool <= 0 && dist(w.x, w.y, ppos().x, ppos().y) < 90) w.cool = 10; }
        return;
      }
      if (hack.mode === "print") {
        const P = CONFIG.hack.printPositions;
        if (act === "up") hack.sel = (hack.sel + 3) % 4;
        if (act === "down") hack.sel = (hack.sel + 1) % 4;
        if (act === "left") hack.off[hack.sel] = (hack.off[hack.sel] + P - 1) % P;
        if (act === "right") hack.off[hack.sel] = (hack.off[hack.sel] + 1) % P;
        audio.blip(1200 + hack.sel * 90, 0.03, "square", 0.03);
        if (hack.off.every((o) => o === 0)) { hack.done = true; hack.flash = 0.6; }
      } else {
        if (act[0] === "l") { hack.selL = +act[1]; audio.blip(900, 0.03, "square", 0.03); }
        else if (act[0] === "r" && hack.selL >= 0) {
          const ri2 = +act[1];
          for (let i = 0; i < 3; i++) if (hack.links[i] === ri2) hack.links[i] = -1;
          hack.links[hack.selL] = ri2; hack.selL = -1;
          audio.blip(1100, 0.03, "square", 0.03);
          if (hack.links.every((x) => x >= 0)) {
            const sum = hack.links.reduce((s, r, i) => s + hack.L[i] * hack.M[r], 0);
            if (sum === hack.target) { hack.done = true; hack.flash = 0.6; }
            else { hack.t -= CONFIG.hack.voltPenalty; hack.links = [-1, -1, -1]; audio.blip(160, 0.25, "sawtooth", 0.06); toast(tt(`Falsche Spannung (${sum}V) – Zeitstrafe!`, `Wrong voltage (${sum}V) – time penalty!`), COL.coral); }
          }
        }
        drawVolt();
      }
    }
    function drawVolt() {
      if (!hack || hack.mode !== "volt") return;
      const box = hackEl.querySelector(".ss-volt");
      if (!box) return;
      const br = box.getBoundingClientRect();
      const lb = box.querySelectorAll('[data-act^="h:l"]'), rb = box.querySelectorAll('[data-act^="h:r"]');
      lb.forEach((b, i) => b.classList.toggle("on", hack.selL === i || hack.links[i] >= 0));
      rb.forEach((b, i) => b.classList.toggle("on", hack.links.includes(i)));
      let svg = "";
      hack.links.forEach((r, i) => {
        if (r < 0) return;
        const a = lb[i].getBoundingClientRect(), b = rb[r].getBoundingClientRect();
        svg += `<line x1="${a.right - br.left}" y1="${a.top + a.height / 2 - br.top}" x2="${b.left - br.left}" y2="${b.top + b.height / 2 - br.top}" stroke="#39ff9a" stroke-width="3" stroke-dasharray="6 4"/>`;
      });
      hack.svg.innerHTML = svg;
      const sum = hack.links.reduce((s, r, i) => s + (r >= 0 ? hack.L[i] * hack.M[r] : 0), 0);
      hack.sum.textContent = tt("aktuell ", "current ") + sum + "V";
    }
    function updateHack(dt) {
      if (!hack) return;
      if (hack.done) {
        hack.flash -= dt;
        if (hack.flash <= 0) closeHack(true);
        return;
      }
      hack.t -= dt;
      if (hack.t <= 0) { closeHack(false); return; }
      hack.uiT -= dt;
      if (hack.uiT <= 0) {
        hack.uiT = 0.15;
        hack.bar.style.width = clamp((hack.t / hack.max) * 100, 0, 100) + "%";
        let nearest = 1e9; const pp = ppos();
        for (const c of cars) if (!c.dead && isCop(c)) nearest = Math.min(nearest, dist(c.x, c.y, pp.x, pp.y));
        hack.r1.textContent = tt("ALARM IN ", "ALARM IN ") + Math.ceil(hack.t) + " s";
        hack.r2.textContent = (S.stars ? "★".repeat(S.stars) + " · " : "") + tt("Streife ", "Patrol ") + (nearest < 1e8 ? Math.round(nearest / 10) + " m" : "—");
      }
    }
    function drawPrint() {
      if (!hack || hack.mode !== "print") return;
      const g = hack.cx, img = hack.print, P = CONFIG.hack.printPositions, step = 220 / P;
      g.fillStyle = "#04100b"; g.fillRect(0, 0, 620, 260);
      for (let i = 0; i < 4; i++) {
        const x = 20, y = 10 + i * 60, s = hack.off[i] * step;
        g.save(); g.beginPath(); g.rect(x, y, 220, 58); g.clip();
        g.globalAlpha = 0.95;
        g.drawImage(img, 0, i * 60, 220, 60, x - s, y, 220, 60);
        g.drawImage(img, 0, i * 60, 220, 60, x - s + 220, y, 220, 60);
        g.restore();
        g.strokeStyle = i === hack.sel ? "#FFB800" : "#1c5a3c"; g.lineWidth = i === hack.sel ? 3 : 1;
        g.strokeRect(x - 2, y - 1, 224, 60);
      }
      g.globalAlpha = hack.done ? 1 : 0.85;
      g.drawImage(img, 380, 10);
      g.globalAlpha = 1;
      g.strokeStyle = "#1c5a3c"; g.lineWidth = 1; g.strokeRect(378, 8, 224, 244);
      g.fillStyle = "#39ff9a"; g.font = "bold 13px ui-monospace,Menlo,monospace";
      g.fillText(hack.done ? tt("MATCH ✓", "MATCH ✓") : tt("ZIEL", "TARGET"), 382, 254);
      g.fillText(">>", 276, 132);
    }

    // ─────────────────────────────── phone ───────────────────────────────
    const phoneBtn = document.createElement("button");
    phoneBtn.className = "ss-phone-btn"; phoneBtn.setAttribute("aria-label", tt("Handy (Tab)", "Phone (Tab)")); phoneBtn.dataset.act = "phone"; phoneBtn.textContent = "📱";
    const phone = document.createElement("div");
    phone.className = "ss-phone"; phone.style.display = "none";
    root.appendChild(phoneBtn); root.appendChild(phone);
    let phoneScreen = null, phoneT = 0;
    function openPhone(screen) { phoneScreen = screen || "home"; phone.style.display = "flex"; renderPhone(); audio.blip(1500, 0.04, "sine", 0.04); }
    function closePhone() { phoneScreen = null; phone.style.display = "none"; }
    function rivalsNow() {
      const days = Math.max(0, (Date.now() - Date.UTC(2026, 10, 1)) / 864e5);
      const list = RIVALS.map(([n, base, perDay]) => ({ n, v: Math.round(base + perDay * days) }));
      list.push({ n: tt("DU", "YOU"), v: S.stats.earned, me: true });
      return list.sort((a, b) => b.v - a.v);
    }
    function upName(k) { return { engine: tt("Motor", "Engine"), tires: tt("Drift-Reifen", "Drift tyres"), turbo: "Turbo", armor: tt("Panzerung", "Armor") }[k]; }
    function upDesc(k) { return { engine: tt("mehr Beschleunigung", "more acceleration"), tires: tt("mehr Grip, kontrolliertere Drifts", "more grip, tighter drifts"), turbo: tt("Höchstgeschw. + Boost auf Shift", "top speed + boost on Shift"), armor: tt("weniger Schaden, schwerer festzunehmen", "less damage, harder to bust") }[k]; }
    function renderPhone() {
      if (!phoneScreen) return;
      const scr = phoneScreen;
      const titles = { home: "HOME", pulse: "STREETPULSE", bank: "VAULTBANK", moped: "MOPEDDROP", board: "HUSTLEBOARD", wash: "SUDS & CASH" };
      let h = `<header>${scr === "home" ? "" : `<button class="ss-back" data-act="p:home">‹ ${tt("Apps", "Apps")}</button>`}<b>${titles[scr]}</b><button class="ss-back" data-act="p:close">✕</button></header><div class="ss-pbody">`;
      if (scr === "home") {
        const apps = [
          ["pulse", "📡", "StreetPulse", tt("Live-Events", "Live events") + (S.events.length ? ` · ${S.events.length}` : "")],
          ["bank", "🏦", "VaultBank", tt("Konto & Upgrades", "Account & upgrades")],
          ["moped", "🛵", "MopedDrop", tt("Auto liefern lassen", "Get your car delivered")],
          ["board", "🏆", "HustleBoard", tt("Crew-Ranking", "Crew ranking")],
        ];
        h += `<div class="ss-apps">${apps.map((a) => `<button class="ss-app" data-act="p:${a[0]}"><i>${a[1]}</i><b>${a[2]}</b><span>${a[3]}</span></button>`).join("")}</div>`;
        h += `<div class="ss-h">${tt("Status", "Status")}</div><div class="ss-row"><span>${tt("Bargeld", "Cash")}</span><b style="color:${COL.gold}">${money(S.cash)}</b></div><div class="ss-row"><span>${tt("Schwarzgeld", "Dirty money")}</span><b style="color:${COL.coral}">${money(S.dirty)}</b></div>`;
      } else if (scr === "pulse") {
        if (!S.feed.length) h += `<div class="ss-post old">${tt("Noch ruhig in Palma Bay. Alle 45 Sekunden gibt es neue Posts.", "Quiet in Palma Bay so far. New posts every 45 seconds.")}</div>`;
        for (const f of S.feed) {
          const live = S.events.includes(f.ev);
          h += `<div class="ss-post ${live ? "" : "old"}">${f.text}<small>${live ? tt("noch ", "") + Math.ceil(f.ev.t) + tt(" s", "s left") + ` · <button class="ss-mini" data-act="p:route:${S.events.indexOf(f.ev)}">${tt("Route", "Route")}</button>` : tt("abgelaufen", "expired")}</small></div>`;
        }
      } else if (scr === "bank" || scr === "wash") {
        const frozen = S.bheat >= CONFIG.economy.heatFreeze;
        h += `<div class="ss-row"><span>${tt("Bargeld (sauber)", "Cash (clean)")}</span><b style="color:${COL.gold}">${money(S.cash)}</b></div>`;
        h += `<div class="ss-row"><span>${tt("Schwarzgeld", "Dirty money")}</span><b style="color:${COL.coral}">${money(S.dirty)}</b></div>`;
        h += `<div class="ss-row"><span>${tt("Tresor Suds & Cash", "Suds & Cash vault")}</span><b>${money(S.vault)}</b></div>`;
        h += `<div class="ss-row"><span>Business-Heat</span><b style="color:${frozen ? COL.coral : COL.cyan}">${Math.round(S.bheat)} %${frozen ? tt(" · Tresor eingefroren", " · vault frozen") : ""}</b></div>`;
        if (scr === "wash") {
          const chunk = Math.min(S.dirty, CONFIG.economy.launderChunk);
          h += `<div class="ss-h">${tt("Dein Betrieb", "Your business")}</div>`;
          h += `<div class="ss-row"><span>${tt("Tresor leeren", "Empty the vault")}</span><button class="ss-mini" data-act="p:payout" ${S.vault > 0 ? "" : "disabled"}>${money(S.vault)}</button></div>`;
          h += `<div class="ss-row"><span>${tt(`Geld waschen (${CONFIG.economy.launderFee * 100} % Gebühr, +${CONFIG.economy.launderHeat} % Heat)`, `Launder (${CONFIG.economy.launderFee * 100}% fee, +${CONFIG.economy.launderHeat}% heat)`)}</span><button class="ss-mini" data-act="p:launder" ${chunk > 0 ? "" : "disabled"}>${money(chunk)}</button></div>`;
          h += `<div class="ss-row"><span>${tt("Kundenauftrag (legal, senkt Heat)", "Client job (legal, lowers heat)")}${S.clientBonus ? " +50 %" : ""}</span><button class="ss-mini" data-act="p:deliver" ${S.mission ? "disabled" : ""}>${tt("Start", "Start")}</button></div>`;
        } else h += `<p style="font-size:11.5px;color:#7d8794;line-height:1.45">${tt("Tresor leeren und Geld waschen geht nur direkt bei Suds & Cash.", "Emptying the vault and laundering only work at Suds & Cash.")}</p>`;
        h += `<div class="ss-h">${tt("Upgrade-Shop (für dein eigenes Auto)", "Upgrade shop (your own car)")}</div>`;
        for (const k of ["engine", "tires", "turbo", "armor"]) {
          const lvl = S.up[k], cost = CONFIG.upgrades[k][lvl];
          h += `<div class="ss-row"><span>${upName(k)} ${"●".repeat(lvl)}${"○".repeat(3 - lvl)}<br><small style="color:#7d8794">${upDesc(k)}</small></span>${cost ? `<button class="ss-mini" data-act="p:buy:${k}" ${S.cash >= cost ? "" : "disabled"}>${money(cost)}</button>` : `<b style="color:${COL.cyan}">MAX</b>`}</div>`;
        }
      } else if (scr === "moped") {
        h += `<p style="font-size:12.5px;line-height:1.5">${tt("Dein getunter Vapor GT wird direkt an den nächsten Straßenrand geliefert.", "Your tuned Vapor GT is delivered straight to the nearest curb.")}</p>`;
        h += `<div class="ss-row"><span>${tt("Farbe", "Paint")}: ${lookText({ color: S.color, model: "Vapor GT" })}</span><button class="ss-mini" data-act="p:moped">${tt("Liefern", "Deliver")} ${money(CONFIG.economy.moped)}</button></div>`;
      } else if (scr === "board") {
        const list = rivalsNow();
        h += `<div class="ss-h">${tt("Karriere-Verdienst", "Career earnings")}</div>`;
        list.forEach((r, i) => { h += `<div class="ss-row" style="${r.me ? `color:${COL.gold};font-weight:800` : ""}"><span>${i + 1}. ${r.n}</span><span>${money(r.v)}</span></div>`; });
        const st = S.stats;
        h += `<div class="ss-h">${tt("Deine Karriere", "Your career")}</div>`;
        h += [[tt("Coups", "Heists"), st.heists], [tt("Legale Aufträge", "Legal jobs"), st.legal], [tt("Rennen gewonnen", "Races won"), st.races], [tt("Fahndungen abgehängt", "Escapes"), st.escapes], [tt("Höchste Fahndung", "Highest wanted level"), "★".repeat(st.maxStars) || "–"], [tt("Festnahmen", "Busted"), st.busted]].map((r) => `<div class="ss-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");
        h += `<p style="font-size:11px;color:#7d8794;margin-top:10px">${tt("Die Crews sind simuliert; dein Stand wird nur in diesem Browser gespeichert.", "Crews are simulated; your progress is stored in this browser only.")}</p>`;
      }
      phone.innerHTML = h + "</div>";
    }
    function phoneAct(a) {
      const [, cmd, arg] = a.split(":");
      if (cmd === "close") return closePhone();
      if (["home", "pulse", "bank", "moped", "board"].includes(cmd)) { phoneScreen = cmd; renderPhone(); return; }
      if (cmd === "route") { const e = S.events[+arg]; if (e) { S.waypoint = { x: e.x, y: e.y }; toast(tt("Route gesetzt.", "Route set."), COL.cyan); closePhone(); } return; }
      if (cmd === "buy") {
        const lvl = S.up[arg], cost = CONFIG.upgrades[arg][lvl];
        if (cost && S.cash >= cost) { S.cash -= cost; S.up[arg]++; const pc = personalCar(); if (pc) pc.ph = playerPhys(true); audio.cash(); save(); }
      }
      if (cmd === "payout" && phoneScreen === "wash") { if (S.vault > 0) { S.cash += S.vault; toast(tt(`Tresor geleert: +${money(S.vault)}`, `Vault emptied: +${money(S.vault)}`), COL.gold); S.vault = 0; audio.cash(); save(); } }
      if (cmd === "launder" && phoneScreen === "wash") {
        const chunk = Math.min(S.dirty, CONFIG.economy.launderChunk);
        if (chunk > 0) { const net = Math.round(chunk * (1 - CONFIG.economy.launderFee)); S.dirty -= chunk; S.cash += net; addHeat(CONFIG.economy.launderHeat); toast(tt(`${money(chunk)} gewaschen → ${money(net)} sauber`, `${money(chunk)} laundered → ${money(net)} clean`), COL.gold); audio.cash(); save(); }
      }
      if (cmd === "deliver") { startDelivery(); return; }
      if (cmd === "moped") { mopedDrop(); return; }
      renderPhone();
    }

    // ─────────────────────────────── overlays ───────────────────────────────
    const ov = document.createElement("div");
    ov.className = "ss-ov";
    root.appendChild(ov);
    const keysHelp = () => `<div class="ss-keys">
      <b>W A S D / ↑←↓→</b><span>${tt("fahren / laufen", "drive / walk")}</span>
      <b>${tt("Leertaste", "Space")}</b><span>${tt("Handbremse – driften", "handbrake – drift")}</span>
      <b>Shift</b><span>${tt("Turbo (Upgrade) · zu Fuß rennen", "turbo (upgrade) · sprint on foot")}</span>
      <b>E</b><span>${tt("ein-/aussteigen, Aktion an Markern", "enter/exit, use markers")}</span>
      <b>F</b><span>${tt("geklautes Auto in der Garage ausschlachten", "strip a stolen car at the garage")}</span>
      <b>Tab</b><span>${tt("Handy", "phone")}</span>
      <b>M</b><span>${tt("große Karte", "big map")}</span>
      <b>Esc</b><span>${tt("Pause", "pause")}</span></div>`;
    function showStart() {
      ov.style.display = "flex";
      ov.innerHTML = `<div class="ss-card"><div class="ss-logo">SUNSTATE HUSTLE<small>BAYSIDE ONLINE</small></div>
        <p>${tt("Palma Bay bei Nacht: Knack Tresore, ramm Geldtransporter, häng die Polizei ab – und wasch dein Schwarzgeld in deiner Autowaschanlage. Die Polizei kennt nur, was Zeugen gesehen haben: neues Auto oder neue Farbe, und sie suchen jemand anderen.", "Palma Bay by night: crack safes, ram armored trucks, lose the cops – and launder your dirty money through your car wash. The police only know what witnesses saw: new car or new paint, and they're looking for someone else.")}</p>
        ${keysHelp()}
        ${hasSave ? `<button class="ss-btn hot" data-act="o:play">${tt("Weiterspielen", "Continue")}</button><button class="ss-btn" data-act="o:new">${tt("Neu anfangen", "New game")}</button>` : `<button class="ss-btn hot" data-act="o:play">${tt("Spielen", "Play")}</button>`}
        <p style="font-size:11px;margin-bottom:0">${tt("Eine Parodie mit erfundenen Orten und Marken. Kein Schießen – nur Fahren, Hacken und Flucht.", "A parody with made-up places and brands. No shooting – just driving, hacking and getaways.")}</p></div>`;
      const b = ov.querySelector("[data-act='o:play']"); if (b) b.focus({ preventScroll: true });
    }
    function showPause() {
      ov.style.display = "flex";
      ov.innerHTML = `<div class="ss-card"><div class="ss-logo" style="font-size:30px">PAUSE</div>${keysHelp()}<button class="ss-btn hot" data-act="o:resume">${tt("Weiter", "Resume")}</button><button class="ss-btn" data-act="o:new">${tt("Neu anfangen", "New game")}</button></div>`;
    }
    function hideOverlay() { ov.style.display = "none"; ov.innerHTML = ""; root.focus({ preventScroll: true }); }
    function startGame(fresh) {
      audio.unlock();
      if (fresh) {
        try { localStorage.removeItem(CONFIG.save.key); } catch (e) { /* ignore */ }
        Object.assign(S, { cash: CONFIG.economy.startCash, dirty: 0, vault: 0, bheat: 10, up: { engine: 0, tires: 0, turbo: 0, armor: 0 }, color: PAINT[0].c, stats: { earned: 0, heists: 0, legal: 0, escapes: 0, maxStars: 0, races: 0, busted: 0 } });
        if (S.mission) failMission(null);
        clearWanted(false);
        if (player.car) exitCar(true);
        respawnAtWash();
      }
      S.started = true; S.paused = false;
      hideOverlay();
      if (!S.welcomed) { S.welcomed = true; toast(tt("Willkommen in Palma Bay! Öffne das Handy mit Tab.", "Welcome to Palma Bay! Open the phone with Tab."), COL.cyan); }
    }
    function togglePause() {
      if (!S.started) return;
      S.paused = !S.paused;
      if (S.paused) { showPause(); audio.update(0, 0, 0, 0, true, false); } else hideOverlay();
    }

    // ─────────────────────────────── touch controls ───────────────────────────────
    const touch = { left: false, right: false, gas: false, brake: false, drift: false };
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (coarse) {
      const tc = document.createElement("div"); tc.className = "ss-touch";
      const btns = [["left", "◀", "left:14px"], ["right", "▶", "left:86px"], ["drift", tt("DRIFT", "DRIFT"), "right:158px"], ["brake", tt("BREMS", "BRAKE"), "right:86px;bottom:16px"], ["gas", "GAS", "right:86px;bottom:90px"], ["e", "E", "right:14px;bottom:90px"]];
      for (const [k, label, pos] of btns) {
        const b = document.createElement("button"); b.className = "ss-tb"; b.textContent = label; b.style.cssText = pos;
        const on = (e) => { e.preventDefault(); audio.unlock(); if (k === "e") { if (S.started && !S.paused) interact(); return; } touch[k] = true; b.classList.add("on"); };
        const off = () => { if (k !== "e") { touch[k] = false; b.classList.remove("on"); } };
        b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("pointerleave", off);
        tc.appendChild(b);
      }
      root.appendChild(tc);
      phoneBtn.style.bottom = "164px";
      phone.style.bottom = "228px";
    }

    // ─────────────────────────────── input ───────────────────────────────
    const keys = new Set();
    const GAME_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab", "KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "KeyF", "KeyM", "ShiftLeft", "ShiftRight"]);
    function onKeyDown(e) {
      if (!root.isConnected) return;
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      audio.unlock();
      const k = e.code;
      if (S.started && !S.paused && GAME_KEYS.has(k)) e.preventDefault();
      if (e.repeat) return;
      keys.add(k);
      if (!S.started) { if (k === "Enter") startGame(false); return; }
      if (hack) {
        if (k === "Escape") { hackInput("abort"); return; }
        if (hack.mode === "print") {
          const map = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
          if (map[k]) hackInput(map[k]);
        } else if (/^Digit[1-3]$/.test(k) || /^Numpad[1-3]$/.test(k)) {
          const n = +k.slice(-1) - 1;
          hackInput(hack.selL < 0 ? "l" + n : "r" + n);
        }
        return;
      }
      if (k === "Escape") { if (phoneScreen) closePhone(); else if (S.bigMap) S.bigMap = false; else togglePause(); return; }
      if (S.paused) return;
      if (k === "Tab") { if (phoneScreen) closePhone(); else openPhone("home"); return; }
      if (k === "KeyE") interact();
      if (k === "KeyF") doStrip();
      if (k === "KeyM") S.bigMap = !S.bigMap;
      if ((k === "ShiftLeft" || k === "ShiftRight") && player.car) {
        if (!player.car.personal || S.up.turbo === 0) { if (!S.turboHint) { S.turboHint = true; toast(tt("Turbo gibt's im VaultBank-Shop (nur für dein eigenes Auto).", "Turbo is in the VaultBank shop (your own car only)."), COL.cyan); } }
        else if (S.turboCool <= 0) { S.turboT = CONFIG.player.turboTime; S.turboCool = CONFIG.player.turboCooldown; audio.blip(200, 0.5, "sawtooth", 0.05, 600); }
      }
    }
    function onKeyUp(e) { keys.delete(e.code); }
    function releaseAll() { keys.clear(); for (const k in touch) touch[k] = false; root.querySelectorAll(".ss-tb.on").forEach((b) => b.classList.remove("on")); }
    function onBlur() { releaseAll(); }
    function onVis() {
      if (document.hidden) { releaseAll(); audio.suspend(); }
      else if (S.started && !S.paused) audio.resume();
    }
    function onPointerDown(e) { if (e.pointerType === "mouse") audio.unlock(); }
    function onPointerUp() { audio.unlock(); }
    function onClick(e) {
      const t = e.target.closest && e.target.closest("[data-act]");
      if (!t || !root.contains(t)) return;
      const a = t.dataset.act;
      if (a === "phone") { if (!S.started) return; if (phoneScreen) closePhone(); else openPhone("home"); return; }
      if (a.startsWith("p:")) { phoneAct(a); return; }
      if (a.startsWith("h:")) { hackInput(a.slice(2)); return; }
      if (a === "o:play") startGame(false);
      if (a === "o:new") startGame(true);
      if (a === "o:resume") togglePause();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", save);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("click", onClick);
    const held = (...codes) => codes.some((c) => keys.has(c));

    // ─────────────────────────────── simulation step (fixed dt) ───────────────────────────────
    function update(dt) {
      S.t += dt;
      const active = S.started && !S.paused;
      const can = active && !hack;
      const up = can && (held("KeyW", "ArrowUp") || touch.gas);
      const down = can && (held("KeyS", "ArrowDown") || touch.brake);
      const left = can && (held("KeyA", "ArrowLeft") || touch.left);
      const right = can && (held("KeyD", "ArrowRight") || touch.right);
      const pc = player.car;
      if (pc) {
        pc.inp.th = (up ? 1 : 0) - (down ? 1 : 0);
        pc.inp.st = (right ? 1 : 0) - (left ? 1 : 0);
        pc.inp.hb = can && (keys.has("Space") || touch.drift);
      } else {
        const mx = (right ? 1 : 0) - (left ? 1 : 0), my = (down ? 1 : 0) - (up ? 1 : 0), l = Math.hypot(mx, my);
        const sp = held("ShiftLeft", "ShiftRight") || touch.drift ? CONFIG.foot.sprint : CONFIG.foot.walk;
        if (l > 0) { player.vx = (mx / l) * sp; player.vy = (my / l) * sp; player.a = Math.atan2(my, mx); } else { player.vx = 0; player.vy = 0; }
        player.x += player.vx * dt; player.y += player.vy * dt;
      }
      S.turboT = Math.max(0, S.turboT - dt); S.turboCool = Math.max(0, S.turboCool - dt);

      // cars: AI decides, the same drift physics moves everybody
      for (const c of cars) {
        if (c.dead || c.static) continue;
        if (c !== pc) {
          if (c.driver && (c.kind === "civ" || c.kind === "truck")) aiCivInput(c, dt);
          else if (isCop(c)) aiCop(c, dt);
          else { c.inp.th = 0; c.inp.st = 0; c.inp.hb = true; }
        }
        stepCar(c, dt);
      }
      for (const c of cars) {
        if (c.dead || c.static) continue;
        const imp = carWorld(c);
        if (imp > 0) {
          addDamage(c, imp);
          if (c === pc && imp > 80) { audio.crash(imp); S.shake = Math.min(14, S.shake + imp / 45); sparks(c.x + Math.cos(c.a) * 22, c.y + Math.sin(c.a) * 22, Math.min(12, imp / 30)); }
        }
      }
      for (let i = 0; i < cars.length; i++) { const a = cars[i]; if (a.dead) continue; for (let j = i + 1; j < cars.length; j++) { const b = cars[j]; if (!b.dead) collidePair(a, b); } }
      if (!player.car) {
        pushOut(player, player.x, player.y, CONFIG.foot.radius);
        for (const c of cars) {
          if (c.dead || Math.abs(c.x - player.x) > 50 || Math.abs(c.y - player.y) > 50) continue;
          const o = c.len / 2 - c.wid / 2, fx = Math.cos(c.a), fy = Math.sin(c.a);
          for (const s of [-1, 1]) {
            const cx = c.x + fx * o * s, cy = c.y + fy * o * s, d = dist(cx, cy, player.x, player.y), min = c.wid / 2 + CONFIG.foot.radius;
            if (d < min && d > 1e-4) { player.x += ((player.x - cx) / d) * (min - d); player.y += ((player.y - cy) / d) * (min - d); }
          }
        }
        pushOut(player, player.x, player.y, CONFIG.foot.radius);
      }
      stepPeds(dt);
      updatePolice(dt);
      if (active) {
        updateEvents(dt);
        updateMission(dt);
        const E = CONFIG.economy;
        S.vaultT += dt;
        if (S.vaultT >= E.vaultTick) { S.vaultT = 0; if (S.bheat < E.heatFreeze) S.vault = Math.min(E.vaultCap, S.vault + E.vaultIncome); }
        S.bheat = Math.max(0, S.bheat - (E.heatDecayPerMin / 60) * dt);
        S.saveT += dt; if (S.saveT >= CONFIG.save.every) { S.saveT = 0; save(); }
        if (S.waypoint) {
          const pp = ppos();
          if (S.waypoint.temp) { S.waypoint.temp -= dt; if (S.waypoint.temp <= 0) S.waypoint = null; }
          if (S.waypoint && dist(pp.x, pp.y, S.waypoint.x, S.waypoint.y) < 90) S.waypoint = null;
        }
      }
      updateHack(dt);

      // keep the city populated around the player
      const pp = ppos();
      let civN = 0;
      for (const c of cars) {
        if (c.dead) continue;
        const d = dist(c.x, c.y, pp.x, pp.y);
        const missionCar = S.mission && S.mission.car === c;
        if (c.kind === "civ") { civN++; if (d > CONFIG.civ.despawn) c.dead = true; }
        else if ((c.kind === "parked" && !c.personal && !c.client && !missionCar) || (c.kind === "truck" && !missionCar)) { if (d > CONFIG.civ.despawn) c.dead = true; }
      }
      if (civN < CONFIG.civ.count) spawnCiv(S.started ? CONFIG.civ.spawnMin : 250, CONFIG.civ.spawnMax);
      let pedN = 0;
      for (const p of peds) { if (p.dead) continue; pedN++; if (!p.report && dist(p.x, p.y, pp.x, pp.y) > 1500) p.dead = true; }
      if (pedN < CONFIG.peds.count) spawnPed(S.started ? 520 : 120, 1100);
      for (let i = cars.length - 1; i >= 0; i--) if (cars[i].dead) cars.splice(i, 1);
      for (let i = peds.length - 1; i >= 0; i--) if (peds[i].dead) peds.splice(i, 1);

      for (const p of parts) {
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 1) { p.size += 14 * dt; p.vx *= 1 - 1.5 * dt; p.vy *= 1 - 1.5 * dt; }
        else if (p.kind === 3) { p.vy += 260 * dt; }
      }
    }

    // per-frame (variable dt): camera, audio, UI refresh
    function frameUpdate(dt) {
      const pp = ppos();
      const vx = pp.vx || 0, vy = pp.vy || 0, sp = Math.hypot(vx, vy);
      const base = view.w < 720 ? CONFIG.cam.zoomSmall : CONFIG.cam.zoom;
      const z = base * (1 - Math.min(sp / 520, 1) * CONFIG.cam.zoomOutAtSpeed);
      cam.zoom += (z - cam.zoom) * Math.min(1, 2 * dt);
      const tx = pp.x + vx * CONFIG.cam.lookAhead, ty = pp.y + vy * CONFIG.cam.lookAhead;
      const f = Math.min(1, CONFIG.cam.follow * dt);
      cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f;
      S.shake = Math.max(0, S.shake - CONFIG.cam.shakeDecay * dt);
      let siren = 0;
      if (S.stars > 0) for (const c of cars) if (!c.dead && isCop(c) && !c.static) siren = Math.max(siren, clamp(1 - dist(c.x, c.y, pp.x, pp.y) / 900, 0, 1));
      const pc = player.car;
      audio.update(pc ? Math.abs(sp) : 0, pc ? Math.max(0, pc.inp.th) : 0, pc ? pc.slip : 0, siren, !pc, S.started && !S.paused);
      phoneT += dt;
      if (phoneScreen === "pulse" && phoneT > 1) { phoneT = 0; renderPhone(); }
    }

    // ─────────────────────────────── rendering ───────────────────────────────
    const view = { w: 1, h: 1, dpr: 1 };
    let vign = null;
    function resize() {
      const r = root.getBoundingClientRect();
      view.w = Math.max(1, r.width); view.h = Math.max(1, r.height);
      view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(view.w * view.dpr); canvas.height = Math.round(view.h * view.dpr);
      canvas.style.width = view.w + "px"; canvas.style.height = view.h + "px";
      vign = document.createElement("canvas");
      vign.width = Math.max(1, Math.round(view.w)); vign.height = Math.max(1, Math.round(view.h));
      const g = vign.getContext("2d");
      const gr = g.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.3, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
      gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(3,2,10,0.62)");
      g.fillStyle = gr; g.fillRect(0, 0, view.w, view.h);
      if (hack && hack.mode === "volt") drawVolt();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();

    const glowCache = {};
    function glow(color) {
      if (glowCache[color]) return glowCache[color];
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, color); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      glowCache[color] = c;
      return c;
    }
    // minimap image: 1 px per cell, built once
    const mapCv = document.createElement("canvas");
    mapCv.width = W.C; mapCv.height = W.R;
    (function () {
      const g = mapCv.getContext("2d"), img = g.createImageData(W.C, W.R);
      const MC = [[30, 62, 44], [92, 96, 110], [64, 68, 80], [24, 26, 34], [8, 38, 60], [118, 100, 70], [62, 50, 34], [66, 70, 80], [104, 86, 60]];
      for (let i = 0; i < W.C * W.R; i++) { const c = MC[W.ty[i]], o = i * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
      g.putImageData(img, 0, 0);
    })();

    const GROUND = [
      ["#1c3326", "#1f3829", "#1a2f23"], ["#22242b", "#24262e", "#202228"], ["#363943", "#3a3d47", "#33363f"], ["#2a2d36", "#2a2d36", "#2a2d36"],
      ["#0a2638", "#0b2a3e", "#092234"], ["#5c4c37", "#61513b", "#584833"], ["#352c20", "#392f22", "#31281d"], ["#41444b", "#44474e", "#3e4148"], ["#3e3326", "#42372a", "#3a3023"],
    ];
    const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997;

    function drawCar(c) {
      const L = c.len, Wd = c.wid;
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(c.a);
      ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fillRect(-L / 2 + 3, -Wd / 2 + 4, L, Wd);
      if (c.kind === "police" || (c.kind === "parked" && c.color === "#e8edf2" && c.model === "Interceptor")) {
        ctx.fillStyle = "#0e1118"; ctx.fillRect(-L / 2, -Wd / 2, L, Wd);
        ctx.fillStyle = "#e8edf2"; ctx.fillRect(-L / 2 + 10, -Wd / 2, L - 20, Wd);
      } else {
        ctx.fillStyle = c.color; ctx.fillRect(-L / 2, -Wd / 2, L, Wd);
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(-L / 2 + 2, -Wd / 2 + 2, L - 4, 3);
      }
      if (c.kind === "truck" || (c.model === "Armored")) {
        ctx.fillStyle = "#6c727c"; ctx.fillRect(-L / 2 + 4, -Wd / 2 + 3, L * 0.62, Wd - 6);
        ctx.strokeStyle = "#4a4f57"; ctx.lineWidth = 2; for (let x = -L / 2 + 10; x < L * 0.12; x += 8) { ctx.beginPath(); ctx.moveTo(x, -Wd / 2 + 4); ctx.lineTo(x, Wd / 2 - 4); ctx.stroke(); }
        ctx.fillStyle = COL.gold; ctx.font = "bold 9px ui-monospace,monospace"; ctx.fillText("$", -6, 3);
      }
      // cabin and windows
      ctx.fillStyle = "#10161f"; ctx.fillRect(L * 0.02, -Wd / 2 + 3, L * 0.22, Wd - 6);
      ctx.fillStyle = "#1a2430"; ctx.fillRect(-L * 0.3, -Wd / 2 + 3, L * 0.12, Wd - 6);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-L * 0.18, -Wd / 2 + 3, L * 0.2, Wd - 6);
      // lights
      ctx.fillStyle = "#fff6d0"; ctx.fillRect(L / 2 - 3, -Wd / 2 + 2, 3, 5); ctx.fillRect(L / 2 - 3, Wd / 2 - 7, 3, 5);
      ctx.fillStyle = c.inp.th < 0 ? "#ff2d4a" : "#a3172a"; ctx.fillRect(-L / 2, -Wd / 2 + 2, 2, 5); ctx.fillRect(-L / 2, Wd / 2 - 7, 2, 5);
      if (c.kind === "police" || c.kind === "swat") {
        const on = S.stars > 0 && c.mode !== "patrol";
        const ph = Math.floor(S.t * 8) % 2;
        ctx.fillStyle = on ? (ph ? "#ff2d4a" : "#2d6bff") : "#5a2030"; ctx.fillRect(-3, -Wd / 2 + 2, 6, Wd / 2 - 2);
        ctx.fillStyle = on ? (ph ? "#2d6bff" : "#ff2d4a") : "#20305a"; ctx.fillRect(-3, 0, 6, Wd / 2 - 2);
        if (c.kind === "swat") { ctx.fillStyle = "#c9d2df"; ctx.font = "bold 8px ui-monospace,monospace"; ctx.fillText("SRT", -L / 2 + 4, 3); }
      }
      if (c.dmg > 50) { ctx.fillStyle = "rgba(0,0,0," + (c.dmg / 250) + ")"; ctx.fillRect(-L / 2, -Wd / 2, L, Wd); }
      if (c.client) { ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2; ctx.strokeRect(-L / 2 - 2, -Wd / 2 - 2, L + 4, Wd + 4); }
      ctx.restore();
    }
    function drawPerson(x, y, a, shirt, skin, down) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.arc(2, 3, 6, 0, TAU); ctx.fill();
      if (down) { ctx.fillStyle = shirt; ctx.fillRect(-9, -4, 14, 8); ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(7, 0, 3.5, 0, TAU); ctx.fill(); ctx.restore(); return; }
      ctx.fillStyle = shirt; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 6.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(1, 0, 3.6, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function star(x, y, r, fill, stroke) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const rad = i % 2 ? r * 0.45 : r, ang = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad); }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    function render() {
      const vw = view.w, vh = view.h, z = cam.zoom;
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.fillStyle = COL.night; ctx.fillRect(0, 0, vw, vh);
      const shx = (R() - 0.5) * S.shake, shy = (R() - 0.5) * S.shake;
      ctx.save();
      ctx.translate(vw / 2 + shx, vh / 2 + shy); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
      const hw = vw / 2 / z, hh = vh / 2 / z;
      const vx0 = cam.x - hw - 80, vx1 = cam.x + hw + 80, vy0 = cam.y - hh - 80, vy1 = cam.y + hh + 80;
      const gx0 = Math.max(0, Math.floor(vx0 / cell)), gx1 = Math.min(W.C - 1, Math.floor(vx1 / cell)), gy0 = Math.max(0, Math.floor(vy0 / cell)), gy1 = Math.min(W.R - 1, Math.floor(vy1 / cell));
      const inView = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

      // ground
      for (let gy = gy0; gy <= gy1; gy++)
        for (let gx = gx0; gx <= gx1; gx++) {
          const t = W.ty[gy * W.C + gx], h = hash(gx, gy);
          ctx.fillStyle = GROUND[t][h % 3];
          ctx.fillRect(gx * cell, gy * cell, cell + 0.6, cell + 0.6);
          if (t === T_WALK) { ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(gx * cell, gy * cell, cell, 1.5); ctx.fillRect(gx * cell, gy * cell, 1.5, cell); }
          else if (t === T_WATER && h % 4 === 0) {
            const ox = Math.sin(S.t * 0.9 + h) * 8;
            ctx.fillStyle = "rgba(0,229,255,0.09)"; ctx.fillRect(gx * cell + 10 + ox, gy * cell + 12 + (h % 13), 14, 2);
          } else if ((t === T_MUD || t === T_GRASS) && h % 5 === 0) { ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(gx * cell + (h % 23), gy * cell + (h % 31), 6, 4); }
        }
      // lane markings and crosswalks
      ctx.lineWidth = 2.5;
      for (const e of W.edges) {
        if (!e.on) continue;
        const A = W.nodes[e.a], B = W.nodes[e.b];
        if (Math.max(A.x, B.x) < vx0 || Math.min(A.x, B.x) > vx1 || Math.max(A.y, B.y) < vy0 || Math.min(A.y, B.y) > vy1) continue;
        const dirt = zoneAt((A.x + B.x) / 2, (A.y + B.y) / 2) === 3;
        if (dirt) continue;
        const horiz = A.l === B.l;
        ctx.strokeStyle = "rgba(255,206,110,0.5)"; ctx.setLineDash([18, 16]);
        ctx.beginPath();
        if (horiz) { ctx.moveTo(Math.min(A.x, B.x) + 64, A.y); ctx.lineTo(Math.max(A.x, B.x) - 64, A.y); }
        else { ctx.moveTo(A.x, Math.min(A.y, B.y) + 64); ctx.lineTo(A.x, Math.max(A.y, B.y) - 64); }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(230,236,245,0.13)";
        ctx.beginPath();
        for (const s of [-56, 56]) {
          if (horiz) { ctx.moveTo(Math.min(A.x, B.x) + 60, A.y + s); ctx.lineTo(Math.max(A.x, B.x) - 60, A.y + s); }
          else { ctx.moveTo(A.x + s, Math.min(A.y, B.y) + 60); ctx.lineTo(A.x + s, Math.max(A.y, B.y) - 60); }
        }
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(235,240,248,0.22)";
      for (const n of validNodes) {
        if (!inView(n.x, n.y, 100) || zoneAt(n.x, n.y) !== 0) continue;
        for (const m of n.adj) {
          const o = W.nodes[m], dx = Math.sign(o.x - n.x), dy = Math.sign(o.y - n.y);
          for (let s = -52; s <= 44; s += 13) {
            if (dx) ctx.fillRect(n.x + dx * 66 - (dx < 0 ? 14 : 0), n.y + s, 14, 7);
            else ctx.fillRect(n.x + s, n.y + dy * 66 - (dy < 0 ? 14 : 0), 7, 14);
          }
        }
      }
      // skid marks (ring buffer, faded by age)
      ctx.lineCap = "round"; ctx.lineWidth = 4;
      for (let b = 0; b < 4; b++) {
        ctx.strokeStyle = `rgba(6,6,8,${0.34 * (1 - b / 4)})`;
        ctx.beginPath();
        for (let i = 0; i < skidCount; i++) {
          const o = i * 5, age = S.t - skids[o + 4];
          if (age < b * 2 || age >= (b + 1) * 2) continue;
          if (!inView(skids[o], skids[o + 1], 20)) continue;
          ctx.moveTo(skids[o], skids[o + 1]); ctx.lineTo(skids[o + 2], skids[o + 3]);
        }
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      // markers
      const pulse = 0.5 + 0.5 * Math.sin(S.t * 4);
      for (const it of interactables()) {
        if (!inView(it.x, it.y, 60)) continue;
        ctx.strokeStyle = it.col; ctx.globalAlpha = 0.5 + pulse * 0.4; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(it.x, it.y, 30 + pulse * 4, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.15; ctx.fillStyle = it.col; ctx.fill(); ctx.globalAlpha = 1;
      }
      const tgt = missionTarget();
      if (tgt && inView(tgt.x, tgt.y, 80)) {
        ctx.strokeStyle = COL.gold; ctx.lineWidth = 4; ctx.globalAlpha = 0.6 + pulse * 0.4;
        ctx.beginPath(); ctx.arc(tgt.x, tgt.y, CONFIG.legal.cpRadius - 10 + pulse * 6, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // building shadows
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      for (const b of W.buildings) { const px = b.x * cell, py = b.y * cell, w = b.w * cell, h = b.h * cell; if (px > vx1 || py > vy1 || px + w + 20 < vx0 || py + h + 20 < vy0) continue; ctx.fillRect(px + b.ht * 0.7, py + b.ht * 0.9, w, h); }
      // people
      for (const p of peds) { if (!inView(p.x, p.y, 20)) continue; drawPerson(p.x, p.y, p.a, p.shirt, p.skin, p.mode === "down"); }
      if (!player.car) {
        ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.beginPath(); ctx.arc(player.x, player.y, 12, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        drawPerson(player.x, player.y, player.a, COL.coral, "#d9a07a", false);
      }
      for (const c of cars) if (!c.dead && inView(c.x, c.y, 40)) drawCar(c);
      // buildings
      for (const b of W.buildings) {
        const px = b.x * cell, py = b.y * cell, w = b.w * cell, h = b.h * cell;
        if (px > vx1 || py > vy1 || px + w < vx0 || py + h < vy0) continue;
        if (b.kind === "tower" || b.kind === "special") {
          ctx.fillStyle = "#171921"; ctx.fillRect(px, py, w, h);
          ctx.fillStyle = "#22252f"; ctx.fillRect(px + 5, py + 5, w - 10, h - 10);
          ctx.fillStyle = "#2c303b";
          const n = 1 + (b.seed * 4) | 0;
          for (let i = 0; i < n; i++) { const ax = px + 12 + ((b.seed * 997 * (i + 1)) % Math.max(1, w - 40)), ay = py + 12 + ((b.seed * 613 * (i + 2)) % Math.max(1, h - 36)); ctx.fillRect(ax, ay, 16, 12); }
          const flick = b.kind === "special" ? 1 : 0.65 + 0.35 * Math.sin(S.t * (1 + b.seed * 3) + b.seed * 40) ** 2;
          ctx.strokeStyle = b.neon; ctx.globalAlpha = 0.16 * flick; ctx.lineWidth = 8; ctx.strokeRect(px + 3, py + 3, w - 6, h - 6);
          ctx.globalAlpha = 0.9 * flick; ctx.lineWidth = 2; ctx.strokeRect(px + 3, py + 3, w - 6, h - 6);
          ctx.globalAlpha = 1;
          if (b.label) {
            ctx.font = "800 15px ui-monospace,Menlo,monospace"; ctx.textAlign = "center";
            ctx.fillStyle = b.neon; ctx.globalAlpha = 0.35; ctx.fillText(b.label, px + w / 2 + 1, py + h / 2 + 6);
            ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.fillText(b.label, px + w / 2, py + h / 2 + 5); ctx.textAlign = "left";
          }
        } else if (b.kind === "warehouse") {
          ctx.fillStyle = "#262a31"; ctx.fillRect(px, py, w, h);
          ctx.strokeStyle = "#323741"; ctx.lineWidth = 2; ctx.beginPath();
          for (let x = px + 10; x < px + w; x += 14) { ctx.moveTo(x, py + 3); ctx.lineTo(x, py + h - 3); }
          ctx.stroke();
          if (b.label) { ctx.fillStyle = "#11141a"; ctx.fillRect(px + w / 2 - 34, py + h / 2 - 12, 68, 22); ctx.font = "800 14px ui-monospace,Menlo,monospace"; ctx.textAlign = "center"; ctx.fillStyle = COL.gold; ctx.fillText(b.label, px + w / 2, py + h / 2 + 4); ctx.textAlign = "left"; }
        } else if (b.kind === "container") {
          ctx.fillStyle = b.neon; ctx.globalAlpha = 0.55; ctx.fillRect(px + 2, py + 4, w - 4, h - 8); ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5; ctx.beginPath();
          for (let x = px + 6; x < px + w - 4; x += 6) { ctx.moveTo(x, py + 5); ctx.lineTo(x, py + h - 5); }
          ctx.stroke();
        } else {
          ctx.fillStyle = b.kind === "house" ? "#4a3a33" : "#3b3428"; ctx.fillRect(px, py, w, h);
          ctx.fillStyle = b.kind === "house" ? "#6a4a3c" : "#4a4030"; ctx.fillRect(px + 4, py + 4, w - 8, h / 2 - 4);
          ctx.fillStyle = "rgba(255,190,110,0.5)"; ctx.fillRect(px + w / 2 - 4, py + h - 10, 8, 6);
        }
      }
      // palms (above cars)
      for (const p of W.palms) {
        if (!inView(p.x, p.y, 40)) continue;
        const s = 22 * p.s;
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(p.x + 10, p.y + 12, s * 0.8, 0, TAU); ctx.fill();
        ctx.lineCap = "round";
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + p.x * 0.01 + Math.sin(S.t * 0.8 + p.y) * 0.05;
          ctx.strokeStyle = i % 2 ? "#1f5e3a" : "#2a7a4a"; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + Math.cos(a) * s * 0.7, p.y + Math.sin(a) * s * 0.7 - 4, p.x + Math.cos(a) * s, p.y + Math.sin(a) * s); ctx.stroke();
        }
        ctx.fillStyle = "#6b4a2a"; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill();
        ctx.lineCap = "butt";
      }
      // lights (additive)
      ctx.globalCompositeOperation = "lighter";
      for (const l of W.lamps) { if (!inView(l.x, l.y, 100)) continue; ctx.drawImage(glow(l.c === "#cfe8ff" ? "rgba(170,210,255,0.28)" : "rgba(255,200,140,0.3)"), l.x - 95, l.y - 95, 190, 190); }
      for (const c of cars) {
        if (c.dead || !inView(c.x, c.y, 120)) continue;
        const fx = Math.cos(c.a), fy = Math.sin(c.a);
        if (c.driver || c === player.car) ctx.drawImage(glow("rgba(255,240,200,0.2)"), c.x + fx * (c.len / 2 + 34) - 46, c.y + fy * (c.len / 2 + 34) - 46, 92, 92);
        if ((c.kind === "police" || c.kind === "swat") && S.stars > 0 && c.mode !== "patrol") {
          const ph = Math.floor(S.t * 8) % 2;
          ctx.drawImage(glow(ph ? "rgba(255,40,70,0.5)" : "rgba(40,100,255,0.5)"), c.x - 60, c.y - 60, 120, 120);
        }
      }
      for (const it of interactables()) if (inView(it.x, it.y, 80)) ctx.drawImage(glow(it.col === COL.coral ? "rgba(255,59,107,0.35)" : it.col === COL.gold ? "rgba(255,184,0,0.35)" : "rgba(0,229,255,0.35)"), it.x - 70, it.y - 70, 140, 140);
      ctx.globalCompositeOperation = "source-over";
      // particles
      for (const p of parts) {
        if (!p.on || !inView(p.x, p.y, 20)) continue;
        const a = p.life / p.max;
        if (p.kind === 1) { ctx.fillStyle = p.color + (0.32 * a).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
        else if (p.kind === 3) { ctx.fillStyle = p.color + a.toFixed(3) + ")"; ctx.fillRect(p.x - 5, p.y - 3, 10, 6); }
        else { ctx.fillStyle = p.color + a.toFixed(3) + ")"; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
      }
      // witness phones
      for (const p of peds) {
        if (!p.report || !inView(p.x, p.y, 30)) continue;
        const f = clamp(p.report.t / CONFIG.witness.reportTime, 0, 1);
        ctx.fillStyle = "rgba(8,9,13,0.8)"; ctx.fillRect(p.x - 18, p.y - 26, 36, 8);
        ctx.fillStyle = COL.coral; ctx.fillRect(p.x - 17, p.y - 25, 34 * f, 6);
        ctx.fillStyle = COL.cyan; ctx.fillRect(p.x - 3, p.y - 38, 6, 10);
      }
      ctx.restore();
      if (vign) ctx.drawImage(vign, 0, 0, vw, vh);
      drawHUD(vw, vh);
      if (S.bigMap) drawBigMap(vw, vh);
      if (hack && hack.mode === "print") drawPrint();
    }

    function txt(s, x, y, col, size, align, weight) {
      ctx.font = `${weight || 700} ${size || 13}px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
      ctx.textAlign = align || "left";
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillText(s, x + 1, y + 1);
      ctx.fillStyle = col || COL.ink; ctx.fillText(s, x, y);
      ctx.textAlign = "left";
    }
    function drawHUD(vw, vh) {
      if (!S.started) return;
      const small = vw < 720;
      // money & business
      ctx.fillStyle = "rgba(10,11,16,0.74)"; ctx.fillRect(12, 12, 236, 92);
      ctx.fillStyle = COL.coral; ctx.fillRect(12, 12, 3, 92);
      txt(money(S.cash), 24, 36, COL.gold, 20, "left", 800);
      txt(tt("SCHWARZGELD ", "DIRTY ") + money(S.dirty), 24, 56, COL.coral, 12);
      const frozen = S.bheat >= CONFIG.economy.heatFreeze;
      txt("BUSINESS-HEAT " + Math.round(S.bheat) + "%" + (frozen ? tt(" · EINGEFROREN", " · FROZEN") : ""), 24, 76, frozen ? COL.coral : COL.dim, 10.5);
      ctx.fillStyle = "#1d222b"; ctx.fillRect(24, 84, 210, 6);
      ctx.fillStyle = frozen ? COL.coral : S.bheat > 55 ? COL.gold : COL.cyan; ctx.fillRect(24, 84, 2.1 * S.bheat, 6);
      txt(tt(ZONES[zoneAt(ppos().x, ppos().y)].de, ZONES[zoneAt(ppos().x, ppos().y)].en).toUpperCase(), 14, 122, "rgba(233,241,247,0.55)", 11);
      // stars
      const blinkOff = S.stars > 0 && !S.seenNow && Math.floor(S.t * 3) % 2 === 0;
      for (let i = 0; i < 6; i++) {
        const x = vw - 26 - (5 - i) * 28, y = 30;
        star(x, y, 11, i < S.stars ? (blinkOff ? "#6a6f7a" : COL.gold) : "rgba(20,22,30,0.7)", i < S.stars ? null : "rgba(233,241,247,0.35)");
      }
      if (S.stars > 0) {
        txt(tt("GESUCHT: ", "WANTED: ") + lookText(S.desc), vw - 14, 60, lookMatches() ? COL.coral : COL.cyan, 11, "right");
        if (!S.seenNow) {
          const left = CONFIG.police.searchTime[S.stars] - S.searchT;
          txt(tt("Polizei sucht · ", "Police searching · ") + Math.ceil(left) + " s", vw - 14, 76, COL.dim, 11, "right");
        }
      }
      if (S.bustT > 0) {
        const f = S.bustT / CONFIG.police.bustTime;
        ctx.fillStyle = "rgba(10,11,16,0.8)"; ctx.fillRect(vw / 2 - 120, 70, 240, 34);
        txt(tt("FESTNAHME! WEG HIER!", "GETTING BUSTED! MOVE!"), vw / 2, 86, COL.coral, 12, "center", 800);
        ctx.fillStyle = COL.coral; ctx.fillRect(vw / 2 - 110, 94, 220 * clamp(f, 0, 1), 5);
      }
      // speed / car state
      const pc = player.car;
      const bx = vw - 14, by = coarse ? vh - 176 : vh - 84;
      if (pc) {
        txt(Math.round(speedOf(pc) * 0.36) + " km/h", bx - 70, by, COL.ink, 18, "right", 800);
        if (pc.personal && S.up.turbo > 0) txt(S.turboT > 0 ? "TURBO!" : S.turboCool > 0 ? "TURBO " + Math.ceil(S.turboCool) + "s" : "TURBO ✓ [Shift]", bx - 70, by + 16, S.turboT > 0 ? COL.coral : COL.cyan, 10.5, "right");
        if (pc.dmg > 1) { ctx.fillStyle = "#1d222b"; ctx.fillRect(bx - 170, by + 22, 100, 5); ctx.fillStyle = pc.dmg > 70 ? COL.coral : COL.gold; ctx.fillRect(bx - 170, by + 22, pc.dmg, 5); }
      } else txt(tt("zu Fuß", "on foot"), bx - 70, by, COL.dim, 13, "right");
      // objective & prompt
      const mt = missionText() || (coarse ? tt("Fahr zu einem Marker · 📱 = Handy", "Drive to a marker · 📱 = phone") : tt("Fahr zu einem Marker · Tab = Handy · M = Karte", "Drive to a marker · Tab = phone · M = map"));
      ctx.font = "700 13px ui-monospace,Menlo,monospace";
      const w = Math.min(vw - 40, ctx.measureText(mt).width + 28);
      const oy = coarse ? 22 + 112 : vh - 34;
      ctx.fillStyle = "rgba(10,11,16,0.78)"; ctx.fillRect(vw / 2 - w / 2, oy - 18, w, 28);
      txt(mt, vw / 2, oy + 1, S.mission ? COL.gold : COL.dim, 13, "center");
      let prompt = "";
      const it = nearInteractable();
      if (it) prompt = `[E] ${it.label}` + (it.strip ? tt("   [F] Ausschlachten", "   [F] Strip it") : "");
      else if (!pc) { const c = cars.find((o) => !o.dead && !o.static && !isCop(o) && o.kind !== "police" && o.kind !== "swat" && o.kind !== "truck" && dist(o.x, o.y, player.x, player.y) < CONFIG.foot.enterDist + 22); if (c) prompt = c.kind === "civ" && c.driver ? tt("[E] Auto klauen", "[E] Steal car") : tt("[E] Einsteigen", "[E] Get in"); }
      if (prompt) txt(prompt, vw / 2, coarse ? oy + 36 : oy - 30, COL.cyan, 14, "center", 800);
      // toasts
      let ty = coarse ? 62 : 30;
      for (const t of S.toasts) {
        const age = S.t - t.t; if (age > 3.6) continue;
        ctx.globalAlpha = clamp(3.6 - age, 0, 1);
        ctx.font = "700 13px ui-monospace,Menlo,monospace";
        const tw = Math.min(vw - 300 > 260 ? vw - 520 : vw - 40, ctx.measureText(t.text).width + 24);
        ctx.fillStyle = "rgba(10,11,16,0.82)"; ctx.fillRect(vw / 2 - tw / 2, ty - 15, tw, 24);
        txt(t.text, vw / 2, ty + 1, t.col, 13, "center");
        ctx.globalAlpha = 1;
        ty += 28;
      }
      // banner
      if (S.banner) {
        const age = S.t - S.banner.t;
        if (age > 3) S.banner = null;
        else {
          ctx.globalAlpha = clamp(3 - age, 0, 1) * clamp(age * 4, 0, 1);
          ctx.fillStyle = "rgba(8,9,13,0.7)"; ctx.fillRect(0, vh / 2 - 60, vw, 100);
          txt(S.banner.big, vw / 2, vh / 2, S.banner.col, small ? 34 : 52, "center", 900);
          txt(S.banner.small, vw / 2, vh / 2 + 28, COL.ink, 13, "center");
          ctx.globalAlpha = 1;
        }
      }
      // minimap
      const ms = small ? 120 : CONFIG.minimap.size;
      if (coarse) drawMinimap(vw - ms - 12, 88, ms); else drawMinimap(12, vh - ms - 12, ms);
      // off-screen pointer to the current target
      const tg = missionTarget();
      if (tg) {
        const sx = (tg.x - cam.x) * cam.zoom + vw / 2, sy = (tg.y - cam.y) * cam.zoom + vh / 2;
        if (sx < 20 || sy < 20 || sx > vw - 20 || sy > vh - 20) {
          const a = Math.atan2(sy - vh / 2, sx - vw / 2);
          const ex = clamp(vw / 2 + Math.cos(a) * vw, 30, vw - 30), ey = clamp(vh / 2 + Math.sin(a) * vh, 140, vh - 60);
          ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
          ctx.fillStyle = COL.gold; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
          ctx.restore();
          txt(Math.round(dist(ppos().x, ppos().y, tg.x, tg.y) / 10) + " m", ex, ey + 26, COL.gold, 11, "center");
        }
      }
    }
    function mapMarkers(toXY, size, big) {
      const dot = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
      const P = W.places;
      const pts = [[P.wash, COL.cyan, "W"]].concat(P.resprays.map((p) => [p, COL.gold, "R"]), P.warehouses.map((p) => [p, p.cool > 0 ? "#555b66" : COL.coral, "$"]), [[P.trialStart, COL.cyan, "T"]]);
      for (const [p, col, l] of pts) { const q = toXY(p.x, p.y); dot(q[0], q[1], big ? 7 : 4.5, col); if (big) txt(l, q[0], q[1] + 4, "#0d0f14", 10, "center", 900); }
      for (const e of S.events) { const q = toXY(e.x, e.y); dot(q[0], q[1], (big ? 8 : 5) + Math.sin(S.t * 6) * 1.5, EV[e.type].illegal ? COL.coral : COL.cyan); }
      for (const c of cars) if (!c.dead && (c.kind === "police" || c.kind === "swat")) { const q = toXY(c.x, c.y); dot(q[0], q[1], big ? 3.5 : 2.6, S.stars && Math.floor(S.t * 6) % 2 ? "#ff2d4a" : "#2d6bff"); }
      const pc = personalCar();
      if (pc && pc !== player.car) { const q = toXY(pc.x, pc.y); dot(q[0], q[1], big ? 5 : 3.5, S.color); }
      if (S.stars > 0 && !S.seenNow && S.lastSeen) {
        const q = toXY(S.lastSeen.x, S.lastSeen.y), r = (180 + S.searchT * 35) * (size / (2 * CONFIG.minimap.range)) * (big ? 1.8 : 1);
        ctx.strokeStyle = "rgba(255,59,107,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(6, r), 0, TAU); ctx.stroke();
      }
      const tg = missionTarget();
      if (tg) { const q = toXY(tg.x, tg.y); ctx.strokeStyle = COL.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], big ? 9 : 6, 0, TAU); ctx.stroke(); }
      const pp = ppos(), q = toXY(pp.x, pp.y), a = player.car ? player.car.a : player.a;
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(a);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-3, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    function drawMinimap(x, y, size) {
      const range = CONFIG.minimap.range, pp = ppos(), scale = size / (2 * range);
      ctx.save();
      ctx.fillStyle = "#05070b"; ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
      ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
      ctx.imageSmoothingEnabled = false;
      const csx = (pp.x - range) / cell, csy = (pp.y - range) / cell, cs = (2 * range) / cell;
      // draw only the in-bounds part of the source (portable across browsers)
      const s0x = Math.max(0, csx), s0y = Math.max(0, csy), s1x = Math.min(W.C, csx + cs), s1y = Math.min(W.R, csy + cs);
      if (s1x > s0x && s1y > s0y) ctx.drawImage(mapCv, s0x, s0y, s1x - s0x, s1y - s0y, x + ((s0x - csx) / cs) * size, y + ((s0y - csy) / cs) * size, ((s1x - s0x) / cs) * size, ((s1y - s0y) / cs) * size);
      ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = "rgba(5,7,11,0.25)"; ctx.fillRect(x, y, size, size);
      const toXY = (wx, wy) => [clamp(x + size / 2 + (wx - pp.x) * scale, x + 4, x + size - 4), clamp(y + size / 2 + (wy - pp.y) * scale, y + 4, y + size - 4)];
      mapMarkers(toXY, size, false);
      ctx.restore();
      ctx.strokeStyle = S.stars > 0 ? COL.coral : COL.cyan; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
    }
    function drawBigMap(vw, vh) {
      ctx.fillStyle = "rgba(5,6,10,0.88)"; ctx.fillRect(0, 0, vw, vh);
      const size = Math.min(vw - 40, vh - 90), x = (vw - size) / 2, y = 50, scale = size / (W.C * cell);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(mapCv, x, y, size, size);
      ctx.imageSmoothingEnabled = true;
      ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2; ctx.strokeRect(x, y, size, size);
      const toXY = (wx, wy) => [x + wx * scale, y + wy * scale];
      const half = W.places.wash; void half;
      const zs = CONFIG.world.zoneSplit * cell * scale;
      ctx.font = "800 12px ui-monospace,Menlo,monospace";
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => txt(tt(ZONES[k].de, ZONES[k].en).toUpperCase(), x + (i ? zs + 10 : 10), y + (j ? zs + 20 : 20), "rgba(233,241,247,0.7)", 12));
      mapMarkers(toXY, size, true);
      txt(tt("KARTE · W Suds & Cash · R Respray · $ Tresor · T Zeitfahren · blinkend = Live-Event · M schließen", "MAP · W Suds & Cash · R Respray · $ Safe · T Time trial · blinking = live event · M to close"), vw / 2, 32, COL.ink, 12, "center");
    }

    // ─────────────────────────────── loop ───────────────────────────────
    respawnAtWash();
    for (let i = 0; i < CONFIG.civ.count; i++) spawnCiv(150, 1400);
    for (let i = 0; i < CONFIG.peds.count; i++) spawnPed(60, 1000);
    showStart();
    let last = performance.now(), acc = 0, raf = 0, alive = true;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(Math.max((now - last) / 1000, 0), CONFIG.maxDt);
      last = now;
      if (!S.paused) {
        acc += dt;
        let steps = 0;
        while (acc >= CONFIG.fixedDt && steps < 8) { update(CONFIG.fixedDt); acc -= CONFIG.fixedDt; steps++; }
        if (steps >= 8) acc = 0;
      }
      frameUpdate(dt);
      render();
    }
    raf = requestAnimationFrame(frame);

    // debug/test hooks (read-only state plus a few helpers for automated tests)
    root.__ss = { getHack: () => hack, S, player, cars, peds, W, keys, CONFIG, crime, audio, solidCell, report, lookNow, nearestNode, doRespray, openHack, hackInput, update: (n) => { for (let i = 0; i < n; i++) update(CONFIG.fixedDt); }, startGame, teleport: (x, y) => { const o = ppos(); o.x = x; o.y = y; cam.x = x; cam.y = y; } };

    return function cleanup() {
      alive = false;
      cancelAnimationFrame(raf);
      save();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", save);
      ro.disconnect();
      audio.close();
      root.remove();
    };
  }

  window.mountSunstate = mountSunstate;
})();
