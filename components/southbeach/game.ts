import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { OVERPASS, overpassQuery, processOverpass, type SBMap } from "@/lib/southbeach/osm.mjs";
import { buildWorld, type World, type Graph } from "./world";
import { makeCar, stepCar, syncCar, PHYS, headMat, type Car } from "./cars";
import { Sound } from "./audio";
import { syntheticMap } from "./synthetic";
import { CSS, paintLoading } from "./ui";

type Lang = "de" | "en";
type Ped = { obj: THREE.Object3D; mixer: THREE.AnimationMixer; act: Record<string, THREE.AnimationAction>; cur: string; x: number; z: number; a: number; mode: "walk" | "flee" | "dead" | "idle"; from: number; to: number; hp: number; t: number; deadT: number; fallT: number; witness: number };
type Pickup = { mesh: THREE.Object3D; x: number; z: number; kind: "cash" | "ammo" | "health"; t: number };
type Fx = { obj: THREE.Object3D; life: number; max: number; kind: "tracer" | "spark" | "smoke" | "fire" | "flash"; vx: number; vy: number; vz: number };

const CFG = {
  dtFixed: 1 / 60, dtMax: 0.1,
  walk: 1.8, run: 5.2, sprint: 7.4, turnFoot: 12, jump: 4.6, gravity: 14, pr: 0.38,
  civCars: 18, peds: 18, pickups: 26, lane: 2.3,
  copsPerStar: [1, 2, 3, 4, 6, 8], searchTime: [0, 10, 14, 18, 23, 28], copRange: 70, copFire: 38,
  weapons: [
    { de: "Pistole", en: "Pistol", mag: 12, reserve: 60, rate: 0.24, dmg: 34, spread: 0.008, auto: false, reload: 1.3 },
    { de: "MP", en: "SMG", mag: 30, reserve: 150, rate: 0.085, dmg: 19, spread: 0.022, auto: true, reload: 1.7 },
  ],
  save: "kt-southbeach:v1",
};

export async function mountSouthBeach(el: HTMLElement, opts: { lang: Lang }): Promise<() => void> {
  const lang = opts.lang;
  const tt = (de: string, en: string) => (lang === "en" ? en : de);
  let alive = true;
  const disposers: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(t: Window | Document | HTMLElement, ev: K | string, fn: (e: never) => void, o?: AddEventListenerOptions) => {
    t.addEventListener(ev, fn as EventListener, o);
    disposers.push(() => t.removeEventListener(ev, fn as EventListener, o));
  };

  if (!document.getElementById("sb-style")) { const st = document.createElement("style"); st.id = "sb-style"; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement("div"); root.className = "sb-root"; root.tabIndex = -1;
  el.appendChild(root);

  // ── loading screen (original art, drawn on a canvas) ──────────────────
  const load = document.createElement("div"); load.className = "sb-load";
  const lc = document.createElement("canvas"); load.appendChild(lc);
  const lbox = document.createElement("div"); lbox.className = "sb-lbox";
  lbox.innerHTML = `<div class="sb-bar"><i></i></div><div class="sb-ltxt">${tt("Lade South Beach …", "Loading South Beach …")}</div>`;
  load.appendChild(lbox);
  root.appendChild(load);
  const lbar = lbox.querySelector("i") as HTMLElement, ltxt = lbox.querySelector(".sb-ltxt") as HTMLElement;
  const drawLoad = () => { const r = root.getBoundingClientRect(); lc.width = Math.max(2, r.width * Math.min(2, devicePixelRatio)); lc.height = Math.max(2, r.height * Math.min(2, devicePixelRatio)); paintLoading(lc); };
  drawLoad();
  const progress = (f: number, txt?: string) => { lbar.style.width = Math.round(f * 100) + "%"; if (txt) ltxt.textContent = txt; };
  const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

  // ── map ─────────────────────────────────────────────────────────────
  progress(0.05, tt("Lade Stadtplan (OpenStreetMap) …", "Loading street map (OpenStreetMap) …"));
  let map: SBMap | null = null;
  try { const r = await fetch("/southbeach/map.json", { cache: "force-cache" }); if (r.ok) map = await r.json(); } catch { /* fall through */ }
  if (!map) {
    for (const url of OVERPASS) {
      try {
        const ctl = new AbortController(); const tm = window.setTimeout(() => ctl.abort(), 45000);
        const r = await fetch(url, { method: "POST", body: new URLSearchParams({ data: overpassQuery() }), signal: ctl.signal });
        window.clearTimeout(tm);
        if (r.ok) { const m = processOverpass(await r.json()); if (m.buildings.length > 200) { map = m; break; } }
      } catch { /* next mirror */ }
    }
  }
  if (!map) map = syntheticMap();
  if (!alive) return () => {};

  // ── renderer & scene ─────────────────────────────────────────────────
  progress(0.25, tt("Baue South Beach …", "Building South Beach …"));
  await frame();
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  const quality = { dpr: Math.min(window.devicePixelRatio || 1, 1.6) };
  renderer.setPixelRatio(quality.dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.55;
  renderer.domElement.className = "sb-gl";
  root.insertBefore(renderer.domElement, load);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.15, 5000);
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const world: World = buildWorld(map, scene, aniso);
  progress(0.5, tt("Himmel, Meer und Licht …", "Sky, ocean and light …"));
  await frame();

  // sky, sun, ocean
  const sky = new Sky(); sky.scale.setScalar(20000); scene.add(sky);
  const sun = new THREE.DirectionalLight("#ffd7a8", 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 600;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight("#bcd6ff", "#c7a27a", 0.9); scene.add(hemi);
  const waterTex = await new THREE.TextureLoader().loadAsync("/southbeach/waternormals.jpg").catch(() => null);
  if (waterTex) waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
  const water = new Water(new THREE.PlaneGeometry(9000, 9000), { textureWidth: 512, textureHeight: 512, waterNormals: waterTex || new THREE.Texture(), sunDirection: new THREE.Vector3(), sunColor: 0xffe2c0, waterColor: 0x0f5a6e, distortionScale: 2.6, fog: true });
  water.rotation.x = -Math.PI / 2; water.position.y = -0.35;
  scene.add(water);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT: THREE.WebGLRenderTarget | null = null;
  const sunDir = new THREE.Vector3();
  const TOD = {
    sunset: { elev: 5.5, azim: 252, turb: 7, ray: 2.6, mie: 0.006, exp: 0.52, sun: "#ffbf86", sunI: 3.0, hemiI: 0.75, fog: "#d99a8a", fogNear: 450, fogFar: 3600, bloom: 0.42, win: 0.25, lamp: 1.0, neon: 0.9 },
    night: { elev: -8, azim: 252, turb: 2, ray: 0.4, mie: 0.002, exp: 0.62, sun: "#7d8cff", sunI: 0.45, hemiI: 0.35, fog: "#141a33", fogNear: 120, fogFar: 1600, bloom: 0.95, win: 0.8, lamp: 3.0, neon: 2.4 },
    day: { elev: 48, azim: 140, turb: 3, ray: 1.0, mie: 0.004, exp: 0.2, sun: "#fff3e2", sunI: 2.8, hemiI: 0.55, fog: "#cfe3f2", fogNear: 900, fogFar: 5000, bloom: 0.06, win: 0, lamp: 0.2, neon: 0.5 },
  };
  type TodKey = keyof typeof TOD;
  let tod: TodKey = "sunset";
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.55, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  function applyTod(k: TodKey) {
    tod = k;
    const T = TOD[k];
    const u = sky.material.uniforms;
    u.turbidity.value = T.turb; u.rayleigh.value = T.ray; u.mieCoefficient.value = T.mie; u.mieDirectionalG.value = 0.86;
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - T.elev), THREE.MathUtils.degToRad(T.azim));
    u.sunPosition.value.copy(sunDir);
    (water.material as THREE.ShaderMaterial).uniforms.sunDirection.value.copy(sunDir).normalize();
    sun.color.set(T.sun); sun.intensity = T.sunI * (T.elev < 0 ? 0.25 : 1);
    hemi.intensity = T.hemiI;
    renderer.toneMappingExposure = T.exp;
    scene.fog = new THREE.Fog(T.fog, T.fogNear, T.fogFar);
    bloom.strength = T.bloom;
    bloom.threshold = k === "day" ? 0.95 : 0.86;
    world.windowMat.emissiveIntensity = T.win;
    world.lampMat.color.setRGB(T.lamp, T.lamp * 0.82, T.lamp * 0.6);
    world.neonMat.color.setScalar(T.neon);
    headMat.color.setScalar(k === "night" ? 3 : k === "sunset" ? 1.4 : 1);
    const envScene = new THREE.Scene(); const s2 = new Sky(); s2.scale.setScalar(10000); Object.assign(s2.material.uniforms.sunPosition.value, sunDir);
    for (const key of ["turbidity", "rayleigh", "mieCoefficient", "mieDirectionalG"] as const) s2.material.uniforms[key].value = u[key].value;
    envScene.add(s2);
    envRT?.dispose();
    envRT = pmrem.fromScene(envScene);
    scene.environment = envRT.texture;
    scene.environmentIntensity = k === "night" ? 0.25 : k === "day" ? 0.45 : 0.8;
  }
  applyTod("sunset");

  // ── character model ─────────────────────────────────────────────────
  progress(0.65, tt("Lade Spielfigur …", "Loading character …"));
  const gltf = await new GLTFLoader().loadAsync("/southbeach/player.glb");
  if (!alive) return () => {};
  const clips = Object.fromEntries(gltf.animations.map((a) => [a.name, a]));
  function makePerson(tint?: THREE.Color) {
    const obj = SkeletonUtils.clone(gltf.scene);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        if (tint) { const mat = (m.material as THREE.MeshStandardMaterial).clone(); mat.color.multiply(tint); m.material = mat; }
        if (m.name.includes("visor") && tint) m.visible = false;
      }
    });
    const mixer = new THREE.AnimationMixer(obj);
    const act: Record<string, THREE.AnimationAction> = {};
    for (const k of ["Idle", "Walk", "Run"]) if (clips[k]) act[k] = mixer.clipAction(clips[k]);
    act.Idle?.play();
    return { obj, mixer, act };
  }

  // ── state ────────────────────────────────────────────────────────────
  const saved = (() => { try { return JSON.parse(localStorage.getItem(CFG.save) || "{}"); } catch { return {}; } })();
  const S = {
    t: 0, started: false, paused: false, money: +saved.money || 500, hp: 100, armor: 0, stars: 0, searchT: 0, seen: false, lastSeen: { x: 0, z: 0 },
    weapon: 0, mag: [12, 30], reserve: [60, 150], fireT: 0, reloadT: 0, aim: false, firing: false, kills: +saved.kills || 0, wasted: 0,
    toast: [] as { t: number; txt: string; col: string }[], banner: null as null | { t: number; big: string; small: string; col: string },
    yaw: 0, pitch: 0.18, camDist: 4.6, mouseIdle: 0, street: "", streetT: 0, spawnT: 0, shake: 0,
  };
  const P = makePerson();
  scene.add(P.obj);
  const player = { x: world.spawn.x, z: world.spawn.z, y: 0, vy: 0, a: world.spawn.a, vx: 0, vz: 0, car: null as Car | null, anim: "Idle", grounded: true };
  S.yaw = player.a;
  // pistol in the right hand
  const bones: Record<string, THREE.Bone> = {};
  P.obj.traverse((o) => { if ((o as THREE.Bone).isBone) bones[o.name.replace("mixamorig:", "")] = o as THREE.Bone; });
  const gun = new THREE.Group();
  const gm = new THREE.MeshStandardMaterial({ color: "#1b1d21", roughness: 0.35, metalness: 0.8 });
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.045, 0.2), gm); slide.position.set(0, 0.03, 0.06);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.045), gm); grip.position.set(0, -0.03, -0.01); grip.rotation.x = -0.25;
  const smgBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.36), gm); smgBody.position.set(0, 0.03, 0.12);
  const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.04), gm); smgMag.position.set(0, -0.06, 0.12);
  gun.add(slide, grip, smgBody, smgMag);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.03, 0.32); gun.add(muzzle);
  const flash = new THREE.PointLight("#ffb050", 0, 8, 2); muzzle.add(flash);
  const flashSprite = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.5, 1.2), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  muzzle.add(flashSprite);
  const hand = bones.RightHand;
  if (hand) {
    hand.add(gun);
    const ws = new THREE.Vector3(); P.obj.updateMatrixWorld(true); hand.getWorldScale(ws);
    gun.scale.setScalar(1 / (ws.x || 1));
    gun.position.set(0.02 / (ws.x || 1), 0.08 / (ws.x || 1), 0.02 / (ws.x || 1));
    gun.rotation.set(Math.PI / 2, 0, 0);
  }
  const showWeapon = () => { const smg = S.weapon === 1; slide.visible = grip.visible = !smg; smgBody.visible = smgMag.visible = smg; };
  showWeapon();

  // ── entities ─────────────────────────────────────────────────────────
  const cars: Car[] = [], peds: Ped[] = [], pickups: Pickup[] = [], fx: Fx[] = [];
  const addCar = (c: Car) => { cars.push(c); scene.add(c.mesh); return c; };
  const removeCar = (c: Car) => { c.dead = true; scene.remove(c.mesh); c.mesh.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); };
  // your car next to the start
  const mine = addCar(makeCar("parked", player.x - Math.cos(player.a) * 3.2, player.z + Math.sin(player.a) * 3.2, player.a, "#ff2f7a", 0));
  mine.driver = false;
  const rnd = Math.random;
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
  const ppos = () => (player.car ? player.car : player);
  const graphNode = (g: Graph, i: number) => ({ x: g.x[i], z: g.z[i] });

  function spawnCiv(minD: number, maxD: number, kind: "civ" | "cop" = "civ") {
    const g = world.roads, pp = ppos();
    for (let k = 0; k < 20; k++) {
      const i = Math.floor(rnd() * g.count);
      if (!g.adj[i].length) continue;
      const d = dist(g.x[i], g.z[i], pp.x, pp.z);
      if (d < minD || d > maxD) continue;
      const j = pick(g.adj[i]);
      const dx = g.x[j] - g.x[i], dz = g.z[j] - g.z[i], L = Math.hypot(dx, dz) || 1;
      const x = g.x[i] + (-dz / L) * -CFG.lane, z = g.z[i] + (dx / L) * -CFG.lane;
      if (cars.some((c) => !c.dead && dist(c.x, c.z, x, z) < 7)) continue;
      const c = addCar(makeCar(kind, x, z, Math.atan2(dx, dz)));
      c.ai.from = i; c.ai.to = j;
      c.vx = (dx / L) * 6; c.vz = (dz / L) * 6;
      return c;
    }
    return null;
  }
  function spawnPed(minD: number, maxD: number) {
    const g = world.walks, pp = ppos();
    for (let k = 0; k < 20; k++) {
      const i = Math.floor(rnd() * g.count);
      if (!g.adj[i].length) continue;
      const d = dist(g.x[i], g.z[i], pp.x, pp.z);
      if (d < minD || d > maxD || !world.onLand(g.x[i], g.z[i])) continue;
      const tint = new THREE.Color().setHSL(rnd(), 0.35 + rnd() * 0.4, 0.45 + rnd() * 0.35);
      const m = makePerson(tint);
      const sc = 0.92 + rnd() * 0.14; m.obj.scale.setScalar(sc);
      scene.add(m.obj);
      m.act.Walk?.play(); m.act.Idle?.stop();
      if (m.act.Walk) m.act.Walk.time = rnd() * 2;
      const p: Ped = { obj: m.obj, mixer: m.mixer, act: m.act, cur: "Walk", x: g.x[i], z: g.z[i], a: 0, mode: "walk", from: i, to: pick(g.adj[i]), hp: 60, t: 0, deadT: 0, fallT: 0, witness: 0 };
      peds.push(p);
      return p;
    }
    return null;
  }
  function removePed(p: Ped) { scene.remove(p.obj); p.mode = "dead"; p.deadT = -1; }
  const pickupGeo = { cash: new THREE.BoxGeometry(0.5, 0.25, 0.32), ammo: new THREE.BoxGeometry(0.42, 0.3, 0.3), health: new THREE.OctahedronGeometry(0.28) };
  const pickupMat = { cash: new THREE.MeshStandardMaterial({ color: "#2fae4f", emissive: new THREE.Color("#2fff6a"), emissiveIntensity: 0.6 }), ammo: new THREE.MeshStandardMaterial({ color: "#6b5a2a", emissive: new THREE.Color("#ffb21f"), emissiveIntensity: 0.6 }), health: new THREE.MeshStandardMaterial({ color: "#d22", emissive: new THREE.Color("#ff3355"), emissiveIntensity: 0.8 }) };
  function placePickup(kind: Pickup["kind"]) {
    const g = world.walks;
    for (let k = 0; k < 30; k++) {
      const i = Math.floor(rnd() * g.count);
      if (!g.adj[i].length || !world.onLand(g.x[i], g.z[i])) continue;
      const mesh = new THREE.Mesh(pickupGeo[kind], pickupMat[kind]);
      mesh.position.set(g.x[i], 0.8, g.z[i]); mesh.castShadow = true;
      scene.add(mesh);
      pickups.push({ mesh, x: g.x[i], z: g.z[i], kind, t: 0 });
      return;
    }
  }
  for (let i = 0; i < CFG.pickups; i++) placePickup(i % 3 === 0 ? "ammo" : i % 5 === 0 ? "health" : "cash");

  progress(0.8, tt("Verkehr und Passanten …", "Traffic and people …"));
  await frame();
  for (let i = 0; i < CFG.civCars; i++) spawnCiv(15, 220);
  for (let i = 0; i < CFG.peds; i++) spawnPed(8, 140);

  // ── HUD ──────────────────────────────────────────────────────────────
  const hud = document.createElement("div"); hud.className = "sb-hud";
  hud.innerHTML = `
    <div class="sb-tr"><div class="sb-money"></div><div class="sb-stars"></div><div class="sb-bars"><i class="hp"></i><i class="ar"></i></div><div class="sb-weap"></div></div>
    <div class="sb-mm"><canvas width="220" height="220"></canvas></div>
    <div class="sb-street"></div>
    <div class="sb-cross"></div>
    <div class="sb-prompt"></div>
    <div class="sb-toasts"></div>
    <div class="sb-banner"><b></b><span></span></div>
    <div class="sb-hint"></div>`;
  root.appendChild(hud);
  const $ = (s: string) => hud.querySelector(s) as HTMLElement;
  const mmCv = hud.querySelector(".sb-mm canvas") as HTMLCanvasElement, mm = mmCv.getContext("2d")!;
  const toast = (txt: string, col = "#fff") => { S.toast.push({ t: S.t, txt, col }); if (S.toast.length > 4) S.toast.shift(); };
  const banner = (big: string, small: string, col = "#ff3b8b") => { S.banner = { t: S.t, big, small, col }; };

  // pause / start overlay
  const ov = document.createElement("div"); ov.className = "sb-ov";
  root.appendChild(ov);
  const keysHtml = `<div class="sb-keys">
    <b>WASD</b><span>${tt("laufen / fahren", "move / drive")}</span><b>${tt("Maus", "Mouse")}</b><span>${tt("Kamera", "camera")}</span>
    <b>Shift</b><span>${tt("sprinten · im Auto: Boost", "sprint · in car: boost")}</span>
    <b>${tt("Linksklick", "Left click")}</b><span>${tt("schießen", "shoot")}</span><b>${tt("Rechtsklick", "Right click")}</b><span>${tt("zielen", "aim")}</span>
    <b>F</b><span>${tt("ein-/aussteigen (auch Autos klauen)", "enter/exit (steal cars too)")}</span>
    <b>Q / R</b><span>${tt("Waffe wechseln / nachladen", "switch weapon / reload")}</span>
    <b>${tt("Leertaste", "Space")}</b><span>${tt("springen · Handbremse", "jump · handbrake")}</span>
    <b>T</b><span>${tt("Tageszeit: Sonnenuntergang / Nacht / Tag", "time of day: sunset / night / day")}</span>
    <b>H</b><span>${tt("Hupe", "horn")}</span><b>Esc</b><span>${tt("Pause", "pause")}</span></div>`;
  const touch = matchMedia("(pointer: coarse)").matches;
  function showStart() {
    ov.style.display = "flex";
    ov.innerHTML = `<div class="sb-card"><div class="sb-title">SOUTH BEACH<small>MIAMI · FLORIDA</small></div>
      <p>${tt("Ocean Drive, Collins Avenue, Lummus Park – South Beach im Maßstab 1:1 nach OpenStreetMap-Daten. Klau dir ein Auto, fahr den Strand entlang, und wenn du Ärger suchst: Die Polizei von Miami Beach findet dich.", "Ocean Drive, Collins Avenue, Lummus Park – South Beach at 1:1 scale from OpenStreetMap data. Steal a car, cruise the beach, and if you go looking for trouble: Miami Beach PD will find you.")}</p>
      ${keysHtml}
      ${touch ? `<p class="sb-warn">${tt("Am besten am Computer mit Maus und Tastatur spielen.", "Best played on a computer with mouse and keyboard.")}</p>` : ""}
      <button class="sb-btn" data-a="play">${tt("Spielen", "Play")}</button>
      <p class="sb-small">${map!.synthetic ? tt("Kartendaten gerade nicht erreichbar – vereinfachter Stadtplan.", "Map data unavailable right now – simplified street plan.") : "Map data © OpenStreetMap contributors (ODbL)"}</p></div>`;
  }
  function showPause() {
    ov.style.display = "flex";
    ov.innerHTML = `<div class="sb-card"><div class="sb-title" style="font-size:44px">PAUSE</div>${keysHtml}<button class="sb-btn" data-a="play">${tt("Weiter", "Resume")}</button></div>`;
  }
  const lockPointer = () => { if (!touch) renderer.domElement.requestPointerLock?.(); };
  on(ov, "click", (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("[data-a]") as HTMLElement | null;
    if (!a) return;
    sound.unlock();
    S.started = true; S.paused = false; ov.style.display = "none";
    lockPointer();
  });
  on(renderer.domElement, "click", () => { sound.unlock(); if (S.started && document.pointerLockElement !== renderer.domElement) lockPointer(); });
  on(document, "pointerlockchange", () => {
    if (!S.started) return;
    if (document.pointerLockElement !== renderer.domElement && !touch) { S.paused = true; showPause(); keys.clear(); mouse.l = mouse.r = false; }
  });

  // ── input ────────────────────────────────────────────────────────────
  const keys = new Set<string>();
  const mouse = { l: false, r: false };
  const sound = new Sound();
  on(window, "keydown", (e: KeyboardEvent) => {
    if (!root.isConnected) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    sound.unlock();
    if (S.started && !S.paused && ["Space", "ArrowUp", "ArrowDown", "Tab"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (!S.started || S.paused) return;
    if (e.code === "KeyF") enterExit();
    if (e.code === "KeyQ") { S.weapon = (S.weapon + 1) % CFG.weapons.length; S.reloadT = 0; showWeapon(); toast(CFG.weapons[S.weapon][lang]); }
    if (e.code === "KeyR") reload();
    if (e.code === "KeyT") { const order: TodKey[] = ["sunset", "night", "day"]; applyTod(order[(order.indexOf(tod) + 1) % 3]); }
    if (e.code === "KeyH" && player.car) sound.tone(392, 0.35, 0.12, "square");
  });
  on(window, "keyup", (e: KeyboardEvent) => keys.delete(e.code));
  const releaseAll = () => { keys.clear(); mouse.l = mouse.r = false; };
  on(window, "blur", releaseAll);
  on(document, "visibilitychange", () => { if (document.hidden) { releaseAll(); sound.suspend(); } else sound.resume(); });
  on(renderer.domElement, "mousedown", (e: MouseEvent) => { if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true; });
  on(window, "mouseup", (e: MouseEvent) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
  on(renderer.domElement, "contextmenu", (e: MouseEvent) => e.preventDefault());
  on(document, "mousemove", (e: MouseEvent) => {
    if (document.pointerLockElement !== renderer.domElement || S.paused) return;
    const sens = S.aim ? 0.0011 : 0.0022;
    S.yaw -= e.movementX * sens;
    S.pitch = Math.max(-0.65, Math.min(1.15, S.pitch + e.movementY * sens));
    S.mouseIdle = 0;
  });
  const held = (...c: string[]) => c.some((k) => keys.has(k));

  // ── gameplay helpers ─────────────────────────────────────────────────
  function saveGame() { try { localStorage.setItem(CFG.save, JSON.stringify({ money: S.money, kills: S.kills })); } catch { /* ignore */ } }
  function los(ax: number, az: number, bx: number, bz: number, y = 1.4) {
    const d = dist(ax, az, bx, bz), n = Math.ceil(d / 2.5);
    for (let i = 1; i < n; i++) { const t = i / n; if (world.heightAt(ax + (bx - ax) * t, az + (bz - az) * t) > y) return false; }
    return true;
  }
  function crime(sev: number, x: number, z: number) {
    // only witnessed crimes count: peds nearby or police with line of sight
    let witnessed = false;
    for (const c of cars) if (!c.dead && c.kind === "cop" && c.driver && dist(c.x, c.z, x, z) < CFG.copRange && los(c.x, c.z, x, z)) { witnessed = true; c.lock = 3; }
    for (const p of peds) if (p.mode !== "dead" && dist(p.x, p.z, x, z) < 45) { witnessed = true; p.mode = "flee"; p.t = 8; }
    if (!witnessed && dist(x, z, ppos().x, ppos().z) > 0 && sev < 2) return;
    const before = S.stars;
    S.stars = Math.min(5, Math.max(S.stars + (S.stars > 0 && sev >= 2 ? 1 : 0), sev));
    S.searchT = 0; S.lastSeen = { x, z };
    if (S.stars > before) { toast(tt("Fahndungsstufe erhöht!", "Wanted level up!"), "#ff5c7a"); sound.tone(660, 0.12, 0.06, "square"); }
  }
  function enterExit() {
    if (player.car) {
      const c = player.car;
      if (Math.hypot(c.vx, c.vz) > 6) { toast(tt("Erst langsamer werden.", "Slow down first.")); return; }
      const rx = -Math.cos(c.a), rz = Math.sin(c.a);
      player.x = c.x + rx * 1.8; player.z = c.z + rz * 1.8;
      world.pushCircle(player, CFG.pr);
      player.a = c.a;
      c.kind = "parked"; c.driver = false; c.inp.th = 0; c.inp.st = 0; c.inp.hb = true; c.ph = PHYS.civ;
      player.car = null;
      P.obj.visible = true;
      return;
    }
    let best: Car | null = null, bd = 4.2;
    for (const c of cars) { if (c.dead || c.kind === "cop" || c.kind === "wreck") continue; const d = dist(c.x, c.z, player.x, player.z); if (d < bd) { bd = d; best = c; } }
    if (!best) return;
    if (Math.hypot(best.vx, best.vz) > 4) { toast(tt("Zu schnell – stell dich davor.", "Too fast – step in front of it.")); return; }
    if (best.kind === "civ" && best.driver) {
      // the driver bails out and runs
      const p = spawnPedAt(best.x + Math.cos(best.a) * 1.8, best.z - Math.sin(best.a) * 1.8);
      if (p) { p.mode = "flee"; p.t = 10; }
      crime(1, best.x, best.z);
      toast(tt("Auto geklaut!", "Car stolen!"), "#ff5c7a");
    }
    player.car = best; best.kind = "player"; best.driver = false; best.ph = PHYS.player;
    P.obj.visible = false;
    S.mouseIdle = 2;
  }
  function spawnPedAt(x: number, z: number) {
    const tint = new THREE.Color().setHSL(rnd(), 0.4, 0.6);
    const m = makePerson(tint); scene.add(m.obj); m.act.Run?.play();
    const n = world.nearestNode(world.walks, x, z);
    const p: Ped = { obj: m.obj, mixer: m.mixer, act: m.act, cur: "Run", x, z, a: 0, mode: "flee", from: n, to: n, hp: 60, t: 8, deadT: 0, fallT: 0, witness: 0 };
    peds.push(p);
    return p;
  }
  function reload() {
    const W = CFG.weapons[S.weapon];
    if (S.reloadT > 0 || S.mag[S.weapon] >= W.mag || S.reserve[S.weapon] <= 0) return;
    S.reloadT = W.reload;
    sound.tone(300, 0.08, 0.05, "square", 0, 0); sound.tone(500, 0.08, 0.05, "square", 0, W.reload * 0.8);
  }
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), aimDir = new THREE.Vector3();
  function addTracer(from: THREE.Vector3, to: THREE.Vector3, color = "#ffd38a") {
    const g = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(4), transparent: true, opacity: 0.9, toneMapped: false }));
    scene.add(l); fx.push({ obj: l, life: 0.07, max: 0.07, kind: "tracer", vx: 0, vy: 0, vz: 0 });
  }
  const sparkGeo = new THREE.SphereGeometry(0.04, 4, 3), sparkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 1), toneMapped: false });
  const smokeGeo = new THREE.SphereGeometry(1, 8, 6);
  function sparks(p: THREE.Vector3, n: number) { for (let i = 0; i < n && fx.length < 400; i++) { const m = new THREE.Mesh(sparkGeo, sparkMat); m.position.copy(p); scene.add(m); fx.push({ obj: m, life: 0.35, max: 0.35, kind: "spark", vx: (rnd() - 0.5) * 8, vy: rnd() * 5, vz: (rnd() - 0.5) * 8 }); } }
  function smoke(x: number, y: number, z: number, fire: boolean) {
    if (fx.length > 400) return;
    const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: fire ? new THREE.Color(4, 1.6, 0.4) : new THREE.Color("#3a3a3e"), transparent: true, opacity: fire ? 0.9 : 0.5, depthWrite: false, toneMapped: !fire }));
    m.position.set(x, y, z); m.scale.setScalar(fire ? 0.6 : 0.8); scene.add(m);
    fx.push({ obj: m, life: fire ? 0.7 : 2.4, max: fire ? 0.7 : 2.4, kind: fire ? "fire" : "smoke", vx: (rnd() - 0.5) * 1.2, vy: fire ? 3 : 1.6, vz: (rnd() - 0.5) * 1.2 });
  }
  function explode(c: Car) {
    c.kind = "wreck"; c.driver = false; c.hp = -1; c.burnT = 18;
    c.paint.color.set("#151515"); c.paint.roughness = 0.9; c.paint.clearcoat = 0;
    const L = new THREE.PointLight("#ff8a2a", 60, 40, 2); L.position.set(c.x, 2, c.z); scene.add(L);
    fx.push({ obj: L, life: 0.8, max: 0.8, kind: "flash", vx: 0, vy: 0, vz: 0 });
    for (let i = 0; i < 26; i++) smoke(c.x + (rnd() - 0.5) * 3, 0.8 + rnd() * 1.5, c.z + (rnd() - 0.5) * 3, i % 2 === 0);
    sound.boom(); S.shake = Math.max(S.shake, Math.max(0, 1.2 - dist(c.x, c.z, ppos().x, ppos().z) / 40));
    const pp = ppos();
    if (dist(c.x, c.z, pp.x, pp.z) < 7) hurt(60);
    for (const p of peds) if (p.mode !== "dead" && dist(p.x, p.z, c.x, c.z) < 7) killPed(p);
    for (const o of cars) if (o !== c && !o.dead && o.kind !== "wreck" && dist(o.x, o.z, c.x, c.z) < 6) { o.hp -= 80; }
    c.vx *= 0.3; c.vz *= 0.3;
  }
  function killPed(p: Ped) {
    if (p.mode === "dead") return;
    p.mode = "dead"; p.deadT = 25; p.fallT = 0;
    p.mixer.stopAllAction();
    S.kills++;
    crime(2, p.x, p.z);
  }
  function hurt(d: number) {
    if (S.hp <= 0) return;
    const a = Math.min(S.armor, d * 0.7); S.armor -= a; S.hp -= d - a;
    S.shake = Math.max(S.shake, 0.25);
    if (S.hp <= 0) wasted();
  }
  function wasted() {
    S.hp = 0; S.wasted = 4;
    const loss = Math.min(S.money, Math.round(S.money * 0.1) + 100);
    S.money -= loss;
    banner(tt("AUSGESCHALTET", "KNOCKED OUT"), tt(`Krankenhausrechnung: $${loss}`, `Hospital bill: $${loss}`), "#ff3b5c");
  }
  function respawn() {
    S.hp = 100; S.armor = 0; S.stars = 0; S.searchT = 0;
    if (player.car) { player.car.kind = "parked"; player.car.driver = false; player.car = null; }
    player.x = world.spawn.x; player.z = world.spawn.z; player.y = 0; P.obj.visible = true;
    for (const c of cars) if (c.kind === "cop") removeCar(c);
    saveGame();
  }

  function shoot() {
    const W = CFG.weapons[S.weapon];
    if (S.reloadT > 0 || S.fireT > 0) return;
    if (S.mag[S.weapon] <= 0) { if (S.reserve[S.weapon] > 0) reload(); else { sound.tone(900, 0.03, 0.03, "square"); S.fireT = 0.3; } return; }
    S.mag[S.weapon]--; S.fireT = W.rate;
    // aim ray from the camera
    camera.getWorldDirection(aimDir);
    aimDir.x += (rnd() - 0.5) * W.spread * (S.aim ? 1 : 2.2); aimDir.y += (rnd() - 0.5) * W.spread; aimDir.z += (rnd() - 0.5) * W.spread * (S.aim ? 1 : 2.2);
    aimDir.normalize();
    const o = camera.position.clone();
    let hitT = 200, hitPed: Ped | null = null, hitCar: Car | null = null;
    // buildings / ground (march)
    for (let t = 0.5; t < 200; t += 0.6) {
      const x = o.x + aimDir.x * t, y = o.y + aimDir.y * t, z = o.z + aimDir.z * t;
      if (y < 0 || (y < 60 && world.heightAt(x, z) > y)) { hitT = t; break; }
    }
    for (const p of peds) {
      if (p.mode === "dead") continue;
      // distance from ray to the vertical segment of the body
      const t = (p.x - o.x) * aimDir.x + (1.0 - o.y) * aimDir.y + (p.z - o.z) * aimDir.z;
      if (t < 0 || t > hitT) continue;
      const px = o.x + aimDir.x * t, py = o.y + aimDir.y * t, pz = o.z + aimDir.z * t;
      if (py < 0 || py > 1.85) continue;
      if (Math.hypot(px - p.x, pz - p.z) < 0.38) { hitT = t; hitPed = p; hitCar = null; }
    }
    for (const c of cars) {
      if (c.dead || c === player.car) continue;
      const t = (c.x - o.x) * aimDir.x + (0.8 - o.y) * aimDir.y + (c.z - o.z) * aimDir.z;
      if (t < 0 || t > hitT) continue;
      const px = o.x + aimDir.x * t, py = o.y + aimDir.y * t, pz = o.z + aimDir.z * t;
      if (py < 0 || py > 1.6) continue;
      // oriented box test in the car's frame
      const dx = px - c.x, dz = pz - c.z, f = dx * Math.sin(c.a) + dz * Math.cos(c.a), s = dx * Math.cos(c.a) - dz * Math.sin(c.a);
      if (Math.abs(f) < c.len / 2 && Math.abs(s) < 1.0) { hitT = t; hitCar = c; hitPed = null; }
    }
    const end = o.clone().addScaledVector(aimDir, hitT);
    muzzle.getWorldPosition(tmpV);
    if (player.car) tmpV.set(player.car.x, 1.3, player.car.z);
    addTracer(tmpV, end);
    flash.intensity = 30; (flashSprite.material as THREE.MeshBasicMaterial).opacity = 1; flashSprite.rotation.z = rnd() * 3;
    sound.shot(S.weapon === 1);
    if (hitT < 200) sparks(end, hitPed ? 0 : 5);
    if (hitPed) { hitPed.hp -= W.dmg; hitPed.mode = "flee"; hitPed.t = 8; if (hitPed.hp <= 0) killPed(hitPed); }
    if (hitCar) {
      hitCar.hp -= W.dmg * 0.7;
      if (hitCar.kind === "cop") crime(2, hitCar.x, hitCar.z);
      if (hitCar.kind === "civ" && hitCar.driver) hitCar.ai.panic = 6;
      if (hitCar.hp <= 0 && hitCar.kind !== "wreck") { explode(hitCar); if (hitCar.lightbar.length) crime(3, hitCar.x, hitCar.z); }
    }
    crime(1, ppos().x, ppos().z);
    // everybody nearby runs
    for (const p of peds) if (p.mode !== "dead" && dist(p.x, p.z, ppos().x, ppos().z) < 60) { p.mode = "flee"; p.t = 10; }
    for (const c of cars) if (c.kind === "civ" && dist(c.x, c.z, ppos().x, ppos().z) < 60) c.ai.panic = 8;
  }

  // ── AI driving ───────────────────────────────────────────────────────
  function driveTo(c: Car, tx: number, tz: number, cruise: number, dt: number, aggressive: boolean) {
    const want = Math.atan2(tx - c.x, tz - c.z);
    let err = want - c.a; while (err > Math.PI) err -= Math.PI * 2; while (err < -Math.PI) err += Math.PI * 2;
    const fs = c.vx * Math.sin(c.a) + c.vz * Math.cos(c.a);
    let st = Math.max(-1, Math.min(1, err * 2.4));
    const desired = cruise * (1 - Math.min(1, Math.abs(err)) * (aggressive ? 0.45 : 0.7));
    let th = fs < desired - 0.5 ? 1 : fs > desired + 2 ? -0.6 : 0.15;
    let hb = aggressive && Math.abs(err) > 0.9 && fs > 18;
    if (c.rev > 0) { c.rev -= dt; th = -1; st = c.revSt; hb = false; }
    else if (Math.hypot(c.vx, c.vz) < 1 && th > 0) { c.stuck += dt; if (c.stuck > 1.2) { c.rev = 1.1; c.revSt = -Math.sign(err || 1); c.stuck = 0; } }
    else c.stuck = Math.max(0, c.stuck - dt);
    c.inp.th = th; c.inp.st = st; c.inp.hb = hb;
  }
  function aiCiv(c: Car, dt: number) {
    const g = world.roads, ai = c.ai;
    if (ai.to < 0 || !g.adj[ai.to]?.length) { const n = world.nearestNode(g, c.x, c.z); ai.from = n; ai.to = pick(g.adj[n]); }
    const A = graphNode(g, ai.from), B = graphNode(g, ai.to);
    let dx = B.x - A.x, dz = B.z - A.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    // keep right: right of (dx,dz) is (-dz, dx)
    const tx = B.x - dz * CFG.lane * -1 * -1 + 0, tz = B.z + dx * CFG.lane * -1 * -1 + 0;
    const rx = -dz, rz = dx;
    const lx = B.x + rx * -CFG.lane, lz = B.z + rz * -CFG.lane;
    void tx; void tz;
    if (dist(c.x, c.z, lx, lz) < 6) {
      const opts = g.adj[ai.to].filter((i) => i !== ai.from);
      ai.from = ai.to; ai.to = opts.length ? pick(opts) : ai.from === ai.to ? pick(g.adj[ai.to]) : ai.from;
      if (ai.to === ai.from) ai.to = pick(g.adj[ai.from]);
    }
    ai.panic = Math.max(0, ai.panic - dt);
    driveTo(c, lx, lz, ai.panic > 0 ? 17 : 10.5, dt, ai.panic > 0);
    if (c.ignore > 0) { c.ignore -= dt; return; }
    const fx = Math.sin(c.a), fz = Math.cos(c.a), fs = c.vx * fx + c.vz * fz;
    let blocked = false;
    const chk = (ox: number, oz: number) => { const f = ox * fx + oz * fz; return f > 0 && f < 9 && Math.abs(-ox * fz + oz * fx) < 1.6; };
    for (const o of cars) { if (o === c || o.dead) continue; if (Math.abs(o.x - c.x) > 12 || Math.abs(o.z - c.z) > 12) continue; if (chk(o.x - c.x, o.z - c.z)) { blocked = true; break; } }
    if (!blocked && !player.car && chk(player.x - c.x, player.z - c.z)) blocked = true;
    if (!blocked) for (const p of peds) if (p.mode !== "dead" && Math.abs(p.x - c.x) < 9 && Math.abs(p.z - c.z) < 9 && chk(p.x - c.x, p.z - c.z)) { blocked = true; break; }
    if (blocked && ai.panic <= 0) { c.inp.th = fs > 0.5 ? -1 : 0; c.block += dt; if (c.block > 4) { c.ignore = 2; c.block = 0; } } else c.block = 0;
  }
  function bfs(g: Graph, a: number, b: number) {
    if (a === b) return [b];
    const prev = new Int32Array(g.count).fill(-1); prev[a] = a;
    const q = [a];
    for (let h = 0; h < q.length && h < 6000; h++) { const n = q[h]; if (n === b) break; for (const m of g.adj[n]) if (prev[m] < 0) { prev[m] = n; q.push(m); } }
    if (prev[b] < 0) return [];
    const path: number[] = []; for (let n = b; n !== a; n = prev[n]) path.push(n);
    return path.reverse();
  }
  function aiCop(c: Car, dt: number) {
    const pp = ppos();
    if (S.stars === 0) { c.lock = 0; aiCiv(c, dt); return; }
    const d = dist(c.x, c.z, pp.x, pp.z);
    const sees = d < CFG.copRange && los(c.x, c.z, pp.x, pp.z);
    if (sees) { c.lock = 3; S.seen = true; S.lastSeen = { x: pp.x, z: pp.z }; }
    c.lock = Math.max(0, c.lock - dt);
    const tx = c.lock > 0 ? pp.x : S.lastSeen.x, tz = c.lock > 0 ? pp.z : S.lastSeen.z;
    if (c.lock > 0 && d < 13 && !player.car) { c.inp.th = -1; c.inp.st = 0; c.inp.hb = false; }
    else if (d < 220 && los(c.x, c.z, tx, tz, 0.5)) driveTo(c, tx, tz, c.lock > 0 ? 40 : 18, dt, true);
    else {
      c.pathT -= dt;
      if (c.pathT <= 0 || !c.path.length) { c.pathT = 1.2; c.path = bfs(world.roads, world.nearestNode(world.roads, c.x, c.z), world.nearestNode(world.roads, tx, tz)); }
      while (c.path.length > 1 && dist(c.x, c.z, world.roads.x[c.path[0]], world.roads.z[c.path[0]]) < 9) c.path.shift();
      const n = c.path.length ? graphNode(world.roads, c.path[0]) : { x: tx, z: tz };
      driveTo(c, n.x, n.z, 30, dt, true);
    }
    // shooting from the car
    c.fireT -= dt;
    if (sees && d < CFG.copFire && c.fireT <= 0 && S.hp > 0) {
      c.fireT = 0.8 + rnd() * 0.9;
      const hit = rnd() < 0.42 - Math.min(0.25, Math.hypot(pp.vx || 0, pp.vz || 0) / 60) - (player.car ? 0.12 : 0);
      tmpV.set(c.x, 1.3, c.z); tmpV2.set(pp.x + (hit ? 0 : (rnd() - 0.5) * 3), 1.1, pp.z + (hit ? 0 : (rnd() - 0.5) * 3));
      addTracer(tmpV, tmpV2, "#ffe7b0");
      sound.shot(false, d);
      if (hit) { if (player.car) { player.car.hp -= 6; } else hurt(7 + S.stars * 1.5); }
    }
  }

  // ── simulation ───────────────────────────────────────────────────────
  function update(dt: number) {
    S.t += dt;
    const active = S.started && !S.paused;
    if (S.wasted > 0) { S.wasted -= dt; if (S.wasted <= 0) respawn(); }
    const alive2 = active && S.hp > 0;
    S.aim = alive2 && mouse.r && !player.car;
    S.fireT = Math.max(0, S.fireT - dt);
    if (S.reloadT > 0) { S.reloadT -= dt; if (S.reloadT <= 0) { const W = CFG.weapons[S.weapon], need = W.mag - S.mag[S.weapon], take = Math.min(need, S.reserve[S.weapon]); S.mag[S.weapon] += take; S.reserve[S.weapon] -= take; } }
    if (alive2 && mouse.l && (CFG.weapons[S.weapon].auto || !S.firing)) shoot();
    S.firing = mouse.l;

    // player on foot
    const pc = player.car;
    if (!pc) {
      const fwd = (alive2 && held("KeyW", "ArrowUp") ? 1 : 0) - (alive2 && held("KeyS", "ArrowDown") ? 1 : 0);
      const side = (alive2 && held("KeyD", "ArrowRight") ? 1 : 0) - (alive2 && held("KeyA", "ArrowLeft") ? 1 : 0);
      const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), rx = -fz, rz = fx;
      let mx = fx * fwd + rx * side, mz = fz * fwd + rz * side;
      const l = Math.hypot(mx, mz);
      const speed = S.aim ? CFG.walk * 1.1 : held("ShiftLeft", "ShiftRight") ? CFG.sprint : held("KeyC", "ControlLeft") ? CFG.walk : CFG.run;
      if (l > 0) { mx /= l; mz /= l; player.vx = mx * speed; player.vz = mz * speed; }
      else { player.vx = 0; player.vz = 0; }
      const faceA = S.aim || (mouse.l && alive2) ? S.yaw : l > 0 ? Math.atan2(mx, mz) : player.a;
      let da = faceA - player.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      player.a += da * Math.min(1, CFG.turnFoot * dt);
      if (alive2 && keys.has("Space") && player.grounded) { player.vy = CFG.jump; player.grounded = false; }
      player.vy -= CFG.gravity * dt; player.y += player.vy * dt;
      if (player.y <= 0) { player.y = 0; player.vy = 0; player.grounded = true; }
      player.x += player.vx * dt; player.z += player.vz * dt;
      world.pushCircle(player, CFG.pr);
      for (const c of cars) {
        if (c.dead || Math.abs(c.x - player.x) > 4 || Math.abs(c.z - player.z) > 4) continue;
        for (const s of [-1, 1]) {
          const cx = c.x + Math.sin(c.a) * (c.len / 2 - 1) * s, cz = c.z + Math.cos(c.a) * (c.len / 2 - 1) * s, d = dist(cx, cz, player.x, player.z), min = 1.05 + CFG.pr;
          if (d < min && d > 1e-4) {
            player.x += ((player.x - cx) / d) * (min - d); player.z += ((player.z - cz) / d) * (min - d);
            const sp = Math.hypot(c.vx, c.vz); if (sp > 8 && c !== pc) { hurt(sp * 1.5); S.shake = 0.5; }
          }
        }
      }
      const anim = !l ? "Idle" : speed <= CFG.walk * 1.2 ? "Walk" : "Run";
      if (anim !== player.anim) { const prev = P.act[player.anim], next = P.act[anim]; next.reset().play(); prev?.crossFadeTo(next, 0.2, false); player.anim = anim; }
      if (P.act.Run) P.act.Run.timeScale = speed > CFG.run ? 1.3 : 1;
    } else {
      const c = pc;
      c.inp.th = alive2 ? (held("KeyW", "ArrowUp") ? 1 : 0) - (held("KeyS", "ArrowDown") ? 1 : 0) : 0;
      c.inp.st = alive2 ? (held("KeyA", "ArrowLeft") ? 1 : 0) - (held("KeyD", "ArrowRight") ? 1 : 0) : 0;
      c.inp.hb = alive2 && keys.has("Space");
      player.x = c.x; player.z = c.z;
      if (c.hp <= 0 && c.kind !== "wreck") { explode(c); player.car = null; P.obj.visible = true; player.x = c.x + 2; hurt(100); }
    }

    // cars
    for (const c of cars) {
      if (c.dead) continue;
      if (c !== pc) {
        if (c.kind === "civ" && c.driver) aiCiv(c, dt);
        else if (c.kind === "cop" && c.driver) aiCop(c, dt);
        else { c.inp.th = 0; c.inp.st = 0; c.inp.hb = true; }
      }
      stepCar(c, dt, c === pc && held("ShiftLeft") ? 1.25 : 1);
      // two circles against buildings and the sea
      const o = c.len / 2 - 1.0;
      let imp = 0;
      for (const s of [1, -1]) {
        const pr = { x: c.x + Math.sin(c.a) * o * s, z: c.z + Math.cos(c.a) * o * s, vx: c.vx, vz: c.vz };
        const ox = pr.x, oz = pr.z;
        imp = Math.max(imp, world.pushCircle(pr, 1.05));
        c.x += pr.x - ox; c.z += pr.z - oz; c.vx = pr.vx; c.vz = pr.vz;
      }
      if (imp > 3) { c.hp -= (imp - 3) * 2.5; if (c === pc) { sound.crash(imp); S.shake = Math.max(S.shake, imp / 40); } }
      if (c.hp <= 0 && c.kind !== "wreck" && c !== pc) explode(c);
      if (c.kind === "wreck") { c.burnT -= dt; if (c.burnT > 0 && rnd() < 0.3) smoke(c.x + (rnd() - 0.5), 1.2, c.z + (rnd() - 0.5), rnd() < 0.4); }
      else if (c.hp < 60 && rnd() < 0.15) smoke(c.x + Math.sin(c.a) * c.len * 0.4, 1.0, c.z + Math.cos(c.a) * c.len * 0.4, false);
    }
    // car vs car
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i]; if (a.dead) continue;
      for (let j = i + 1; j < cars.length; j++) {
        const b = cars[j]; if (b.dead || Math.abs(a.x - b.x) > 7 || Math.abs(a.z - b.z) > 7) continue;
        let imp = 0;
        for (const s of [-1, 1]) for (const u of [-1, 1]) {
          const ax = a.x + Math.sin(a.a) * (a.len / 2 - 1) * s, az = a.z + Math.cos(a.a) * (a.len / 2 - 1) * s;
          const bx = b.x + Math.sin(b.a) * (b.len / 2 - 1) * u, bz = b.z + Math.cos(b.a) * (b.len / 2 - 1) * u;
          let dx = ax - bx, dz = az - bz; const d = Math.hypot(dx, dz) || 1e-3;
          if (d >= 2.1) continue;
          dx /= d; dz /= d; const pen = (2.1 - d) / 2;
          a.x += dx * pen; a.z += dz * pen; b.x -= dx * pen; b.z -= dz * pen;
          const rel = (a.vx - b.vx) * dx + (a.vz - b.vz) * dz;
          if (rel < 0) { const j2 = -1.3 * rel / 2; a.vx += j2 * dx; a.vz += j2 * dz; b.vx -= j2 * dx; b.vz -= j2 * dz; imp = Math.max(imp, -rel); }
        }
        if (imp > 2) {
          a.hp -= imp * 1.5; b.hp -= imp * 1.5;
          if (a === pc || b === pc) {
            sound.crash(imp); S.shake = Math.max(S.shake, imp / 30);
            const o = a === pc ? b : a;
            if (o.kind === "cop" && imp > 6) crime(2, o.x, o.z);
            if (o.kind === "civ") o.ai.panic = 6;
          }
        }
      }
    }
    // peds
    for (const p of peds) {
      if (p.deadT < 0) continue;
      if (p.mode === "dead") {
        p.fallT = Math.min(1, p.fallT + dt * 2.5);
        p.obj.rotation.x = -p.fallT * Math.PI / 2; p.obj.position.y = p.fallT * 0.15;
        p.deadT -= dt; if (p.deadT <= 0) removePed(p);
        continue;
      }
      const g = world.walks;
      let speed = 1.35;
      if (p.mode === "flee") {
        speed = 4.6; p.t -= dt; if (p.t <= 0) p.mode = "walk";
        const pp = ppos(), dx = p.x - pp.x, dz = p.z - pp.z, l = Math.hypot(dx, dz) || 1;
        p.a = Math.atan2(dx / l, dz / l);
        p.x += Math.sin(p.a) * speed * dt; p.z += Math.cos(p.a) * speed * dt;
      } else {
        const B = graphNode(g, p.to);
        if (dist(p.x, p.z, B.x, B.z) < 1.2) { const opts = g.adj[p.to].filter((i) => i !== p.from); p.from = p.to; p.to = opts.length ? pick(opts) : p.from; if (p.to === p.from && g.adj[p.from].length) p.to = g.adj[p.from][0]; }
        const T = graphNode(g, p.to);
        const want = Math.atan2(T.x - p.x, T.z - p.z);
        let da = want - p.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        p.a += da * Math.min(1, 6 * dt);
        p.x += Math.sin(p.a) * speed * dt; p.z += Math.cos(p.a) * speed * dt;
      }
      world.pushCircle(p, 0.35);
      const want = speed > 2 ? "Run" : "Walk";
      if (want !== p.cur && p.act[want]) { p.act[want].reset().play(); p.act[p.cur]?.crossFadeTo(p.act[want], 0.25, false); p.cur = want; }
      // hit by a car
      for (const c of cars) {
        if (c.dead || Math.abs(c.x - p.x) > 4 || Math.abs(c.z - p.z) > 4) continue;
        const sp = Math.hypot(c.vx, c.vz);
        const dx = p.x - c.x, dz = p.z - c.z, f = dx * Math.sin(c.a) + dz * Math.cos(c.a), s = dx * Math.cos(c.a) - dz * Math.sin(c.a);
        if (Math.abs(f) < c.len / 2 + 0.3 && Math.abs(s) < 1.25) {
          if (sp > 7) { p.hp = 0; killPed(p); if (c === pc) crime(2, p.x, p.z); }
          else { const l = Math.hypot(dx, dz) || 1; p.x += (dx / l) * 0.3; p.z += (dz / l) * 0.3; }
        }
      }
    }

    // wanted level
    S.seen = false;
    if (S.stars > 0) {
      for (const c of cars) if (c.kind === "cop" && c.driver && !c.dead && c.lock > 0) S.seen = true;
      if (!S.seen) { S.searchT += dt; if (S.searchT >= CFG.searchTime[S.stars]) { S.stars = 0; S.searchT = 0; banner(tt("ENTKOMMEN", "LOST THEM"), tt("Die Polizei hat deine Spur verloren.", "The police lost your trail."), "#3be3ff"); } }
      else S.searchT = 0;
    }
    // population
    const pp = ppos();
    let civN = 0, copN = 0, pedN = 0;
    for (const c of cars) {
      if (c.dead) continue;
      const d = dist(c.x, c.z, pp.x, pp.z);
      if (c.kind === "civ") { civN++; if (d > 260) removeCar(c); }
      else if (c.kind === "cop") { copN++; if (d > 300 || (S.stars === 0 && d > 160 && copN > 2)) removeCar(c); }
      else if ((c.kind === "parked" || c.kind === "wreck") && c !== mine && d > 320) removeCar(c);
    }
    for (const p of peds) if (p.deadT >= 0) { pedN++; if (dist(p.x, p.z, pp.x, pp.z) > 170 && p.mode !== "dead") removePed(p); }
    if (civN < CFG.civCars) spawnCiv(S.started ? 110 : 30, 230);
    const copWant = S.stars ? CFG.copsPerStar[S.stars] : 2;
    S.spawnT -= dt;
    if (copN < copWant && S.spawnT <= 0) { if (spawnCiv(S.stars ? 120 : 150, 240, "cop")) S.spawnT = S.stars ? 2.5 : 10; }
    if (pedN < CFG.peds) spawnPed(S.started ? 60 : 10, 140);
    for (let i = cars.length - 1; i >= 0; i--) if (cars[i].dead) cars.splice(i, 1);
    for (let i = peds.length - 1; i >= 0; i--) if (peds[i].deadT < 0) peds.splice(i, 1);

    // pickups
    for (const k of pickups) {
      if (k.t > 0) { k.t -= dt; if (k.t <= 0) k.mesh.visible = true; continue; }
      if (dist(k.x, k.z, pp.x, pp.z) < 1.6) {
        k.t = 60; k.mesh.visible = false;
        if (k.kind === "cash") { const v = 100 + Math.floor(rnd() * 9) * 50; S.money += v; sound.cash(); toast(`+$${v}`, "#5dff8a"); saveGame(); }
        else if (k.kind === "ammo") { S.reserve[0] += 24; S.reserve[1] += 60; sound.tone(700, 0.1, 0.06, "square"); toast(tt("Munition", "Ammo"), "#ffcc4d"); }
        else { S.hp = 100; S.armor = Math.min(100, S.armor + 50); sound.tone(880, 0.2, 0.06); toast(tt("Gesundheit + Weste", "Health + armor"), "#ff7b8f"); }
      }
    }
    // fx
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.life -= dt;
      if (f.life <= 0) { scene.remove(f.obj); if ((f.obj as THREE.Mesh).isMesh && f.kind !== "spark") ((f.obj as THREE.Mesh).material as THREE.Material).dispose(); if (f.kind === "tracer") { (f.obj as THREE.Line).geometry.dispose(); ((f.obj as THREE.Line).material as THREE.Material).dispose(); } fx.splice(i, 1); continue; }
      const k = f.life / f.max;
      if (f.kind === "spark") { f.vy -= 12 * dt; f.obj.position.x += f.vx * dt; f.obj.position.y += f.vy * dt; f.obj.position.z += f.vz * dt; }
      else if (f.kind === "smoke" || f.kind === "fire") { f.obj.position.x += f.vx * dt; f.obj.position.y += f.vy * dt; f.obj.position.z += f.vz * dt; f.obj.scale.multiplyScalar(1 + dt * (f.kind === "fire" ? 0.8 : 0.9)); ((f.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (f.kind === "fire" ? 0.9 : 0.45) * k; }
      else if (f.kind === "tracer") ((f.obj as THREE.Line).material as THREE.LineBasicMaterial).opacity = k;
      else if (f.kind === "flash") (f.obj as THREE.PointLight).intensity = 60 * k;
    }
  }

  // ── camera & visuals (per frame) ───────────────────────────────────
  const camPos = new THREE.Vector3(player.x, 3, player.z + 5);
  const aimArm = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  function pointBone(bone: THREE.Bone | undefined, child: THREE.Bone | undefined, dir: THREE.Vector3) {
    if (!bone || !child || !bone.parent) return;
    bone.updateWorldMatrix(true, false); child.updateWorldMatrix(true, false);
    const a = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld), b = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);
    const cur = b.sub(a).normalize();
    aimArm.setFromUnitVectors(cur, dir);
    bone.getWorldQuaternion(qa);
    qa.premultiply(aimArm);
    bone.parent.getWorldQuaternion(qb);
    bone.quaternion.copy(qb.invert().multiply(qa));
    bone.updateWorldMatrix(false, true);
  }
  function visuals(dt: number) {
    const pc = player.car;
    P.obj.position.set(player.x, player.y, player.z);
    P.obj.rotation.y = player.a + Math.PI;
    P.mixer.update(dt);
    gun.visible = !pc;
    // camera
    S.mouseIdle += dt;
    if (pc && S.mouseIdle > 1.5) { let da = pc.a - S.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; S.yaw += da * Math.min(1, 2.2 * dt); S.pitch += (0.22 - S.pitch) * Math.min(1, 2 * dt); }
    const wantDist = pc ? 7.5 + Math.min(4, Math.hypot(pc.vx, pc.vz) / 10) : S.aim ? 2.0 : 4.4;
    S.camDist += (wantDist - S.camDist) * Math.min(1, 8 * dt);
    const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
    const target = new THREE.Vector3(player.x, (pc ? 1.6 : player.y + 1.55), player.z);
    const shoulder = pc ? 0 : S.aim ? 0.55 : 0.45;
    const tx = target.x - fz * shoulder * -1, tz = target.z + fx * shoulder * -1;
    void tx; void tz;
    const rx = -fz, rz = fx;
    let want = new THREE.Vector3(target.x - fx * cp * S.camDist + rx * shoulder, target.y + sp * S.camDist + (pc ? 1.2 : 0.2), target.z - fz * cp * S.camDist + rz * shoulder);
    // keep the camera out of buildings
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, x = target.x + (want.x - target.x) * t, y = target.y + (want.y - target.y) * t, z = target.z + (want.z - target.z) * t;
      if (world.heightAt(x, z) > y - 0.3) { const t2 = Math.max(0.15, (i - 1) / steps); want = new THREE.Vector3(target.x + (want.x - target.x) * t2, target.y + (want.y - target.y) * t2, target.z + (want.z - target.z) * t2); break; }
    }
    want.y = Math.max(0.4, want.y);
    camPos.lerp(want, Math.min(1, (pc ? 10 : 18) * dt));
    camera.position.copy(camPos);
    if (S.shake > 0) { camera.position.x += (rnd() - 0.5) * S.shake * 0.4; camera.position.y += (rnd() - 0.5) * S.shake * 0.4; S.shake = Math.max(0, S.shake - dt * 2); }
    const look = new THREE.Vector3(target.x + rx * shoulder + fx * cp * 30, target.y - sp * 30 + 0.6, target.z + rz * shoulder + fz * cp * 30);
    camera.lookAt(look);
    camera.fov += ((S.aim ? 48 : pc ? 66 + Math.min(10, Math.hypot(pc.vx, pc.vz) / 4) : 62) - camera.fov) * Math.min(1, 6 * dt);
    camera.updateProjectionMatrix();
    // aim pose: right arm points where the camera looks
    if (!pc && (S.aim || S.fireT > 0 || mouse.l) && S.hp > 0) {
      camera.getWorldDirection(aimDir);
      pointBone(bones.RightArm, bones.RightForeArm, aimDir);
      pointBone(bones.RightForeArm, bones.RightHand, aimDir);
    }
    flash.intensity *= 0.6; (flashSprite.material as THREE.MeshBasicMaterial).opacity *= 0.5;
    // sun & shadows follow the player
    sun.position.set(player.x + sunDir.x * 300, Math.max(30, sunDir.y * 300), player.z + sunDir.z * 300);
    sun.target.position.set(player.x, 0, player.z);
    water.position.x = Math.round(player.x / 100) * 100; water.position.z = Math.round(player.z / 100) * 100;
    (water.material as THREE.ShaderMaterial).uniforms.time.value += dt * 0.6;
    for (const c of cars) if (!c.dead) syncCar(c, S.t);
    for (const p of peds) { if (p.deadT < 0) continue; p.obj.position.x = p.x; p.obj.position.z = p.z; p.obj.rotation.y = p.a + Math.PI; if (p.mode !== "dead" && dist(p.x, p.z, player.x, player.z) < 120) p.mixer.update(dt); }
    for (const k of pickups) if (k.mesh.visible) { k.mesh.rotation.y += dt * 1.6; k.mesh.position.y = 0.8 + Math.sin(S.t * 3 + k.x) * 0.12; }
    let siren = 0;
    if (S.stars > 0) for (const c of cars) if (c.kind === "cop" && !c.dead) siren = Math.max(siren, Math.max(0, 1 - dist(c.x, c.z, ppos().x, ppos().z) / 160));
    sound.update(pc ? Math.hypot(pc.vx, pc.vz) : 0, pc ? Math.max(0, pc.inp.th) : 0, pc ? pc.slip : 0, siren, !!pc && S.started && !S.paused);
  }

  // ── HUD update ─────────────────────────────────────────────────────
  let hudT = 0;
  function drawHud(dt: number) {
    hudT -= dt;
    const pp = ppos();
    if (hudT <= 0) {
      hudT = 0.1;
      $(".sb-money").textContent = "$" + S.money.toLocaleString("en-US");
      $(".sb-stars").innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < S.stars ? (S.seen || Math.floor(S.t * 3) % 2 ? "on" : "dim") : ""}">★</i>`).join("");
      ($(".sb-bars .hp") as HTMLElement).style.width = Math.max(0, S.hp) + "%";
      ($(".sb-bars .ar") as HTMLElement).style.width = S.armor + "%";
      const W = CFG.weapons[S.weapon];
      $(".sb-weap").innerHTML = player.car ? "" : `<b>${W[lang]}</b> ${S.reloadT > 0 ? tt("lädt …", "reloading …") : `${S.mag[S.weapon]} <span>/ ${S.reserve[S.weapon]}</span>`}`;
      S.streetT -= 0.1;
      if (S.streetT <= 0) {
        S.streetT = 0.6;
        let best = "", bd = 40;
        for (const r of world.roadNames) { const d = Math.abs(r.x - pp.x) + Math.abs(r.z - pp.z); if (d < bd) { bd = d; best = r.n; } }
        if (best !== S.street) { S.street = best; $(".sb-street").textContent = best ? best + " · South Beach" : "South Beach"; }
      }
      let prompt = "";
      if (!player.car && S.started) {
        for (const c of cars) if (!c.dead && c.kind !== "cop" && c.kind !== "wreck" && dist(c.x, c.z, player.x, player.z) < 4.2) { prompt = c.kind === "civ" && c.driver ? tt("[F] Auto klauen", "[F] Steal car") : tt("[F] Einsteigen", "[F] Get in"); break; }
      } else if (player.car) prompt = "";
      $(".sb-prompt").textContent = prompt;
      $(".sb-cross").style.display = S.aim || (!player.car && mouse.l) ? "block" : "none";
      $(".sb-toasts").innerHTML = S.toast.filter((x) => S.t - x.t < 3.2).map((x) => `<div style="color:${x.col}">${x.txt}</div>`).join("");
      const bn = $(".sb-banner");
      if (S.banner && S.t - S.banner.t < 3.5) { bn.style.display = "flex"; (bn.querySelector("b") as HTMLElement).textContent = S.banner.big; (bn.querySelector("b") as HTMLElement).style.color = S.banner.col; (bn.querySelector("span") as HTMLElement).textContent = S.banner.small; }
      else bn.style.display = "none";
      $(".sb-hint").textContent = S.started && S.t < 25 ? tt("Tipp: T wechselt Sonnenuntergang / Nacht / Tag", "Tip: T switches sunset / night / day") : "";
    }
    // minimap (rotates with the camera)
    const mmS = 220, mmI = world.minimap as HTMLCanvasElement & { ox: number; oz: number };
    mm.save();
    mm.clearRect(0, 0, mmS, mmS);
    mm.beginPath(); mm.arc(mmS / 2, mmS / 2, mmS / 2 - 2, 0, Math.PI * 2); mm.clip();
    mm.fillStyle = "#2a7f9c"; mm.fillRect(0, 0, mmS, mmS);
    mm.translate(mmS / 2, mmS / 2);
    mm.rotate(S.yaw + Math.PI);
    const z = 1.1;
    mm.scale(z, z);
    mm.drawImage(mmI, -(pp.x - mmI.ox) * world.mmScale, -(pp.z - mmI.oz) * world.mmScale);
    const dot = (x: number, zz: number, r: number, col: string) => { mm.fillStyle = col; mm.beginPath(); mm.arc((x - pp.x) * world.mmScale, (zz - pp.z) * world.mmScale, r, 0, Math.PI * 2); mm.fill(); };
    for (const k of pickups) if (k.mesh.visible) dot(k.x, k.z, 2.6, k.kind === "cash" ? "#2fbf55" : k.kind === "ammo" ? "#ffb21f" : "#ff4466");
    for (const c of cars) if (!c.dead && c.kind === "cop") dot(c.x, c.z, 3.4, Math.floor(S.t * 6) % 2 ? "#ff2040" : "#2050ff");
    if (!mine.dead && player.car !== mine) dot(mine.x, mine.z, 3.4, "#ff2f7a");
    if (S.stars > 0 && !S.seen) { mm.strokeStyle = "rgba(255,40,70,0.8)"; mm.lineWidth = 2; mm.beginPath(); mm.arc((S.lastSeen.x - pp.x) * world.mmScale, (S.lastSeen.z - pp.z) * world.mmScale, 20 + S.searchT * 2, 0, Math.PI * 2); mm.stroke(); }
    mm.restore();
    // player arrow (always up = camera direction)
    const pa = (player.car ? player.car.a : player.a) - S.yaw;
    mm.save(); mm.translate(mmS / 2, mmS / 2); mm.rotate(-pa + Math.PI);
    mm.fillStyle = "#fff"; mm.strokeStyle = "#000"; mm.lineWidth = 1.5;
    mm.beginPath(); mm.moveTo(0, -9); mm.lineTo(6, 7); mm.lineTo(0, 3); mm.lineTo(-6, 7); mm.closePath(); mm.fill(); mm.stroke();
    mm.restore();
  }

  // ── loop ───────────────────────────────────────────────────────────
  function resize() {
    const r = root.getBoundingClientRect();
    const w = Math.max(2, r.width), h = Math.max(2, r.height);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
    composer.setPixelRatio(quality.dpr); composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (load.isConnected) drawLoad();
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();
  progress(0.95, tt("Fast fertig …", "Almost there …"));
  // warm up: compile shaders before showing the scene
  visuals(0.016);
  renderer.compile(scene, camera);
  await frame();
  if (!alive) { renderer.dispose(); return () => {}; }
  progress(1, tt("Bereit", "Ready"));
  load.classList.add("done");
  window.setTimeout(() => load.remove(), 900);
  showStart();

  let last = performance.now(), acc = 0, raf = 0, fpsT = 0, frames = 0;
  const loop = (now: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(CFG.dtMax, Math.max(0, (now - last) / 1000));
    last = now;
    if (!S.paused) {
      acc += dt;
      let n = 0;
      while (acc >= CFG.dtFixed && n < 6) { update(CFG.dtFixed); acc -= CFG.dtFixed; n++; }
      if (n >= 6) acc = 0;
    }
    visuals(S.paused ? 0 : dt);
    drawHud(dt);
    composer.render();
    // adaptive resolution: keep it smooth on weaker GPUs
    fpsT += dt; frames++;
    if (fpsT > 2) { const fps = frames / fpsT; fpsT = 0; frames = 0; if (fps < 38 && quality.dpr > 0.75) { quality.dpr = Math.max(0.75, quality.dpr - 0.2); renderer.setPixelRatio(quality.dpr); resize(); } }
  };
  raf = requestAnimationFrame(loop);

  (root as unknown as { __sb: unknown }).__sb = { S, player, cars, peds, world, update, shoot, crime, keys, mouse, applyTod, camera, enterExit, scene, renderer };

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    saveGame();
    for (const d of disposers) d();
    ro.disconnect();
    if (document.pointerLockElement) document.exitPointerLock();
    sound.close();
    scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry?.dispose(); const mat = m.material as THREE.Material | THREE.Material[]; (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose()); } });
    envRT?.dispose(); pmrem.dispose(); composer.dispose(); renderer.dispose();
    root.remove();
  };
}
