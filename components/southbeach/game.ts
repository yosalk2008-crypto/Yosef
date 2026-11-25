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
import { makeCar, makeJetski, makeCopJetski, makeSpeedboat, stepCar, syncCar, PHYS, headMat, CATALOG, TIERS, specPhys, type Car, type Spec } from "./cars";
import { Sound } from "./audio";
import { syntheticMap } from "./synthetic";
import { CSS, paintLoading } from "./ui";
import { makeShopInterior, makeYacht, makeHeli } from "./props";
import { buildBeach } from "./beach";

type Lang = "de" | "en";
type Ped = { obj: THREE.Object3D; mixer: THREE.AnimationMixer; act: Record<string, THREE.AnimationAction>; cur: string; x: number; z: number; a: number; mode: "walk" | "flee" | "dead" | "idle" | "fight"; from: number; to: number; hp: number; t: number; deadT: number; fallT: number; witness: number; ko?: boolean; robbed?: boolean; wealth: number;
  /** 0 = gives up, 1 = fights with fists, 2 = carries a gun */
  tough: number; atkT: number; aggro: number; y?: number; room?: "shop" | "yacht"; yacht?: Yacht; fix?: { x: number; z: number; a: number }; cashier?: boolean; guard?: boolean; beach?: boolean; cop?: boolean; copCar?: Car;
  bones?: { arm?: THREE.Bone; fore?: THREE.Bone; hand?: THREE.Bone; larm?: THREE.Bone; lfore?: THREE.Bone; lhand?: THREE.Bone }; gun?: THREE.Object3D };
type Yacht = { g: THREE.Group; x: number; z: number; a: number; sc: number; deckY: number; walk: { x0: number; z0: number; x1: number; z1: number }; block: { x0: number; z0: number; x1: number; z1: number }; stern: { x: number; z: number }; spots: { x: number; z: number }[]; crew: Ped[]; name: string; cool: number };
type Pickup = { mesh: THREE.Object3D; x: number; z: number; kind: "cash" | "ammo" | "health" | "drop"; t: number; v?: number; y?: number };
type Shop = { x: number; z: number; nx: number; nz: number; name: string; cool: number; dealer?: boolean; rx: number; rz: number };
type HStep = { de: string; en: string; kind: "goto" | "hold" | "car" | "lose" | "van"; at: () => { x: number; z: number }; r: number; hold?: number; stars?: number; timer?: number; models?: number[]; boat?: boolean; van?: boolean; deck?: boolean };
type Mission = { title: string; steps: HStep[]; i: number; hold: number; t: number; done: () => void; van: Car | null; alarmed: boolean };
type BizState = { t: number; stock: number; safe: number };
type Fx = { obj: THREE.Object3D; life: number; max: number; kind: "tracer" | "spark" | "smoke" | "fire" | "flash"; vx: number; vy: number; vz: number };

const CFG = {
  dtFixed: 1 / 60, dtMax: 0.1,
  walk: 1.8, run: 5.2, sprint: 7.4, turnFoot: 12, jump: 4.6, gravity: 14, pr: 0.38,
  civCars: 18, peds: 18, pickups: 26, lane: 2.3,
  copsPerStar: [1, 2, 3, 5, 7, 9], searchTime: [0, 10, 14, 18, 23, 30], copRange: 75, copFire: 55,
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
  const isTouch = matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints > 0 && !matchMedia("(hover: hover)").matches);
  if (isTouch) { CFG.civCars = 12; CFG.peds = 10; }
  const disposers: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(t: Window | Document | HTMLElement, ev: K | string, fn: (e: never) => void, o?: AddEventListenerOptions) => {
    t.addEventListener(ev, fn as EventListener, o);
    disposers.push(() => t.removeEventListener(ev, fn as EventListener, o));
  };

  if (!document.getElementById("sb-style")) { const st = document.createElement("style"); st.id = "sb-style"; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement("div"); root.className = "sb-root" + (isTouch ? " sb-touch" : ""); root.tabIndex = -1;
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
  const quality = { dpr: Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.6) };
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
  // tame the physical sky: cap the glow around the sun so it never blinds the player
  const tameSky = (sk: Sky) => {
    const m = sk.material as THREE.ShaderMaterial;
    m.fragmentShader = m.fragmentShader.replace(
      "vec3 texColor = ( Lin + L0 ) * 0.04 + sundiscColor + vec3( 0.0, 0.0003, 0.00075 );",
      "vec3 texColor = min( ( Lin + L0 ) * 0.04, vec3( 1.25 ) ) + min( sundiscColor, vec3( 2.6 ) ) + vec3( 0.0, 0.0003, 0.00075 );"
    );
    m.needsUpdate = true;
    return sk;
  };
  const sky = tameSky(new Sky()); sky.scale.setScalar(20000); scene.add(sky);
  const sun = new THREE.DirectionalLight("#ffd7a8", 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
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
    sunset: { elev: 9, azim: 252, turb: 6, ray: 2.4, mie: 0.0022, exp: 0.52, sun: "#ffc48f", sunI: 2.3, hemiI: 0.7, fog: "#d99a8a", fogNear: 450, fogFar: 3600, bloom: 0.5, win: 0.25, lamp: 2.6, neon: 1.5 },
    night: { elev: -8, azim: 252, turb: 2, ray: 0.4, mie: 0.002, exp: 0.62, sun: "#7d8cff", sunI: 0.45, hemiI: 0.35, fog: "#141a33", fogNear: 120, fogFar: 1600, bloom: 0.95, win: 0.8, lamp: 3.0, neon: 2.4 },
    day: { elev: 48, azim: 140, turb: 3, ray: 1.0, mie: 0.004, exp: 0.2, sun: "#fff3e2", sunI: 2.8, hemiI: 0.55, fog: "#cfe3f2", fogNear: 900, fogFar: 5000, bloom: 0.25, win: 0, lamp: 0.2, neon: 1.6 },
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
    u.turbidity.value = T.turb; u.rayleigh.value = T.ray; u.mieCoefficient.value = T.mie; u.mieDirectionalG.value = k === "sunset" ? 0.76 : 0.82;
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - T.elev), THREE.MathUtils.degToRad(T.azim));
    u.sunPosition.value.copy(sunDir);
    (water.material as THREE.ShaderMaterial).uniforms.sunDirection.value.copy(sunDir).normalize();
    sun.color.set(T.sun); sun.intensity = T.sunI * (T.elev < 0 ? 0.25 : 1);
    hemi.intensity = T.hemiI;
    renderer.toneMappingExposure = T.exp;
    scene.fog = new THREE.Fog(T.fog, T.fogNear, T.fogFar);
    bloom.strength = T.bloom;
    bloom.threshold = k === "day" ? 3.2 : k === "sunset" ? 2.2 : 0.9;
    world.windowMat.emissiveIntensity = T.win;
    world.lampMat.color.setRGB(T.lamp, T.lamp * 0.82, T.lamp * 0.6);
    world.neonMat.color.setScalar(T.neon);
    headMat.color.setScalar(k === "night" ? 3 : k === "sunset" ? 1.4 : 1);
    const envScene = new THREE.Scene(); const s2 = tameSky(new Sky()); s2.scale.setScalar(10000); Object.assign(s2.material.uniforms.sunPosition.value, sunDir);
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
  const loader = new GLTFLoader();
  const [gltf, manG, womanG] = await Promise.all([
    loader.loadAsync("/southbeach/player.glb"),
    loader.loadAsync("/southbeach/man.glb").catch(() => null),
    loader.loadAsync("/southbeach/woman.glb").catch(() => null),
  ]);
  if (!alive) return () => {};
  // Idle / Walk / Run come from the Mixamo rig of the soldier model. The human models have other rest poses,
  // so the clips are retargeted bone by bone (SkeletonUtils.retargetClip). Root motion is dropped.
  const baseClips = gltf.animations.filter((a) => ["Idle", "Walk", "Run"].includes(a.name));
  const skinOf = (o: THREE.Object3D) => { let f: THREE.SkinnedMesh | null = null; o.traverse((c) => { if (!f && (c as THREE.SkinnedMesh).isSkinnedMesh) f = c as THREE.SkinnedMesh; }); return f as THREE.SkinnedMesh | null; };
  const srcSkin = skinOf(gltf.scene);
  gltf.scene.updateMatrixWorld(true);
  type Body = { scene: THREE.Object3D; clips: Record<string, THREE.AnimationClip>; scale: number };
  const bodyOf = (sc: THREE.Object3D, prefix: string, height: number): Body => {
    sc.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(sc), h = bb.max.y - bb.min.y || height;
    const tgt = skinOf(sc), clips: Record<string, THREE.AnimationClip> = {};
    if (tgt && srcSkin) {
      for (const c of baseClips) {
        try {
          const rc = SkeletonUtils.retargetClip(tgt, srcSkin, c, { hip: "mixamorigHips", getBoneName: (b: THREE.Bone) => prefix + b.name, fps: 30 } as never);
          rc.tracks = rc.tracks.filter((t) => !t.name.endsWith(".position")).map((t) => { t.name = t.name.replace(/^\.bones\[(.+)\]\./, "$1."); return t; });
          clips[c.name] = rc;
        } catch { /* keep going without this clip */ }
      }
      tgt.skeleton.pose(); sc.updateMatrixWorld(true);
    }
    return { scene: sc, clips, scale: height / h };
  };
  const soldier: Body = { scene: gltf.scene, clips: Object.fromEntries(baseClips.map((c) => [c.name, c])), scale: 1 };
  const MAN = manG ? bodyOf(manG.scene, "mixamorig", 1.8) : soldier, WOMAN = womanG ? bodyOf(womanG.scene, "", 1.68) : MAN;
  const SKIN = ["#f3d2b8", "#e8b896", "#c98e66", "#a8714c", "#7a4f33", "#5a3a26"];
  const TOPS = ["#ffffff", "#f25f5c", "#ffe066", "#247ba0", "#70c1b3", "#ff9f1c", "#2b2d42", "#e76f51", "#8338ec", "#06d6a0", "#ef476f", "#bde0fe"];
  const BOTTOMS = ["#2f3e5c", "#4a5568", "#c2b280", "#1b1b1f", "#6b705c", "#e9e4d8", "#3a6ea5"];
  type Look = { woman?: boolean; top?: string; bottom?: string; skin?: string; shoes?: string };
  function randomLook(): Look { return { woman: rnd() < 0.45, top: pick(TOPS), bottom: pick(BOTTOMS), skin: pick(SKIN), shoes: rnd() < 0.5 ? "#f4f4f4" : "#222" }; }
  function makePerson(look: Look = {}) {
    const B = look.woman ? WOMAN : MAN;
    const inner = SkeletonUtils.clone(B.scene);
    inner.scale.setScalar(B.scale);
    const obj = new THREE.Group(); obj.add(inner);
    const tintOf = (name: string) => /Outfit_Top/.test(name) ? look.top : /Outfit_Bottom/.test(name) ? look.bottom : /Footwear/.test(name) ? look.shoes : /Skin|Body$/.test(name) && !/Ch03/.test(name) ? look.skin : undefined;
    inner.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      if (/Teeth/.test(m.name)) { m.visible = false; return; }
      const mat = m.material as THREE.MeshStandardMaterial;
      const t = tintOf(mat.name);
      if (t) { const c = mat.clone(); c.color.set(t); if (/Outfit/.test(mat.name)) c.color.multiplyScalar(1.4); m.material = c; }
      else if (look.woman && look.top && /Ch03/.test(mat.name)) { const c = mat.clone(); c.color.lerp(new THREE.Color(look.top), 0.18); m.material = c; }
    });
    const mixer = new THREE.AnimationMixer(obj);
    const act: Record<string, THREE.AnimationAction> = {};
    for (const k of ["Idle", "Walk", "Run"]) if (B.clips[k]) act[k] = mixer.clipAction(B.clips[k]);
    act.Idle?.play();
    return { obj, mixer, act };
  }

  // ── state ────────────────────────────────────────────────────────────
  const saved = (() => { try { return JSON.parse(localStorage.getItem(CFG.save) || "{}"); } catch { return {}; } })();
  const S = {
    t: 0, started: false, paused: false, menu: false, gold: Number.isFinite(+saved.gold) && saved.gold !== undefined ? +saved.gold : 60, owned: (Array.isArray(saved.owned) ? saved.owned : []) as string[], armed: false, punchT: 0, rob: null as null | { shop: Shop; t: number }, bustT: 0, civSpawnT: 0, pedSpawnT: 0, mission: null as Mission | null, panel: "" as string, biz: (saved.biz && typeof saved.biz === "object" ? saved.biz : {}) as Record<string, BizState>, heist: (saved.heist && typeof saved.heist === "object" ? saved.heist : {}) as Record<string, { prep: number; cool: number }>, hp: 100, armor: 0, stars: 0, searchT: 0, seen: false, lastSeen: { x: 0, z: 0 },
    weapon: 0, mag: [12, 30], reserve: [60, 150], fireT: 0, reloadT: 0, aim: false, firing: false, kills: +saved.kills || 0, wasted: 0,
    toast: [] as { t: number; txt: string; col: string }[], banner: null as null | { t: number; big: string; small: string; col: string },
    yaw: 0, pitch: 0.18, camDist: 4.6, mouseIdle: 0, street: "", streetT: 0, spawnT: 0, shake: 0,
    inside: null as null | { shop: Shop; out: { x: number; z: number } }, deck: null as null | Yacht, deckBoat: null as null | Car,
    heliT: 0, swim: false, mapOpen: false, jetOwned: !!saved.jetOwned, berthUntil: +saved.berthUntil || 0, rentUntil: 0, rentWarned: false, boatSpawnT: 0,
  };
  const P = makePerson({ top: "#f4f1ea", bottom: "#2f3e5c", skin: "#e8b896", shoes: "#f4f4f4" });
  scene.add(P.obj);
  const player = { x: world.spawn.x, z: world.spawn.z, y: 0, vy: 0, a: world.spawn.a, vx: 0, vz: 0, car: null as Car | null, anim: "Idle", grounded: true, strafe: false };
  S.yaw = player.a;
  // pistol in the right hand
  const bones: Record<string, THREE.Bone> = {};
  P.obj.traverse((o) => { if ((o as THREE.Bone).isBone) bones[o.name.replace(/^mixamorig:?/, "")] = o as THREE.Bone; });
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
  function equip(n: number) {
    if (n === 0 || (S.armed && S.weapon === n - 1)) S.armed = false;
    else { S.armed = true; S.weapon = n - 1; }
    S.reloadT = 0; showWeapon();
    sound.tone(S.armed ? 520 : 300, 0.06, 0.05, "square");
  }
  showWeapon();

  // ── entities ─────────────────────────────────────────────────────────
  const cars: Car[] = [], peds: Ped[] = [], pickups: Pickup[] = [], fx: Fx[] = [];
  const addCar = (c: Car) => { cars.push(c); scene.add(c.mesh); return c; };
  const removeCar = (c: Car) => { c.dead = true; scene.remove(c.mesh); c.mesh.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.geometry.userData.shared) m.geometry.dispose(); }); };
  // your car next to the start
  const mine = addCar(makeCar("parked", player.x - Math.cos(player.a) * 3.2, player.z + Math.sin(player.a) * 3.2, player.a, "#ff2f7a", 0));
  mine.driver = false;
  const rnd = Math.random;
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const walletOf = () => { const r = rnd(); return r < 0.55 ? 5 + Math.floor(rnd() * 30) : r < 0.85 ? 35 + Math.floor(rnd() * 70) : r < 0.97 ? 110 + Math.floor(rnd() * 140) : 300 + Math.floor(rnd() * 300); };
  const walletOfCar = (m: number) => (m === 4 || m === 7 ? 350 + Math.floor(rnd() * 550) : m === 5 || m === 6 || m === 3 ? 120 + Math.floor(rnd() * 200) : 10 + Math.floor(rnd() * 80));
  const richLabel = (v: number) => (v >= 300 ? "💰💰💰" : v >= 110 ? "💰💰" : "💰");
  const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
  const ppos = () => (player.car ? player.car : player);
  /** Where the player is in the city (the store's door while inside a store). */
  const wpos = (): { x: number; z: number; vx?: number; vz?: number } => (S.inside ? S.inside.out : ppos());
  const toughRoll = () => { const r = rnd(); return r < 0.68 ? 0 : r < 0.9 ? 1 : 2; };
  const graphNode = (g: Graph, i: number) => ({ x: g.x[i], z: g.z[i] });

  function spawnCiv(minD: number, maxD: number, kind: "civ" | "cop" = "civ") {
    const g = world.roads, pp = wpos();
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
      c.wealth = walletOfCar(c.model);
      c.vx = (dx / L) * 6; c.vz = (dz / L) * 6;
      return c;
    }
    return null;
  }
  function spawnPed(minD: number, maxD: number) {
    const g = world.walks, pp = wpos();
    for (let k = 0; k < 20; k++) {
      const i = Math.floor(rnd() * g.count);
      if (!g.adj[i].length) continue;
      const d = dist(g.x[i], g.z[i], pp.x, pp.z);
      if (d < minD || d > maxD || !world.onLand(g.x[i], g.z[i])) continue;
      const m = makePerson(randomLook());
      const sc = 0.94 + rnd() * 0.1; m.obj.scale.setScalar(sc);
      scene.add(m.obj);
      m.act.Walk?.play(); m.act.Idle?.stop();
      if (m.act.Walk) m.act.Walk.time = rnd() * 2;
      const p: Ped = { obj: m.obj, mixer: m.mixer, act: m.act, cur: "Walk", x: g.x[i], z: g.z[i], a: 0, mode: "walk", from: i, to: pick(g.adj[i]), hp: 60, t: 0, deadT: 0, fallT: 0, witness: 0, wealth: walletOf(), tough: toughRoll(), atkT: 0, aggro: 0 };
      if (p.wealth >= 110) p.tough = 2;
      peds.push(p);
      return p;
    }
    return null;
  }
  function removePed(p: Ped) { scene.remove(p.obj); p.mode = "dead"; p.deadT = -1; }
  const pickupGeo = { cash: new THREE.CylinderGeometry(0.32, 0.32, 0.07, 24).rotateX(Math.PI / 2), ammo: new THREE.BoxGeometry(0.42, 0.3, 0.3), health: new THREE.OctahedronGeometry(0.28) };
  const pickupMat = { cash: new THREE.MeshStandardMaterial({ color: "#ffcc33", metalness: 1, roughness: 0.25, emissive: new THREE.Color("#ffb300"), emissiveIntensity: 0.5 }), ammo: new THREE.MeshStandardMaterial({ color: "#6b5a2a", emissive: new THREE.Color("#ffb21f"), emissiveIntensity: 0.6 }), health: new THREE.MeshStandardMaterial({ color: "#d22", emissive: new THREE.Color("#ff3355"), emissiveIntensity: 0.8 }) };
  function placePickup(kind: "cash" | "ammo" | "health") {
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

  // ── stores to rob and the car dealership ────────────────────────────
  const shops: Shop[] = [];
  const SHOP_NAMES: [string, string][] = [["MINI MARKET", "MINI MARKET"], ["SCHMUCK", "JEWELRY"], ["APOTHEKE", "PHARMACY"], ["SURF SHOP", "SURF SHOP"], ["SOUVENIRS", "SOUVENIRS"], ["SPIRITUOSEN", "LIQUOR"], ["PFANDHAUS", "PAWN SHOP"], ["ZIGARREN", "CIGARS"], ["BOUTIQUE", "BOUTIQUE"], ["ELEKTRONIK", "ELECTRONICS"], ["DELI", "DELI"], ["KIOSK", "NEWSSTAND"], ["BÄCKEREI", "BAKERY"], ["CAFÉ", "CAFÉ"], ["SPORTSHOP", "SPORTS"], ["JUWELIER", "JEWELER"], ["TANKSTELLE", "GAS STATION"], ["BURGER", "BURGERS"], ["UHREN", "WATCHES"], ["BANK", "BANK"], ["SNEAKER", "SNEAKERS"], ["HANDYLADEN", "PHONES"]];
  function frontOf(rx: number, rz: number) {
    let best: { bx: number; bz: number; d: number } | null = null;
    for (const q of world.near(rx, rz, 24)) {
      if (q.h > 40) continue;
      const pp = q.p, n = pp.length / 2;
      for (let i = 0; i < n; i++) {
        const ax = pp[i * 2], az = pp[i * 2 + 1], cx = pp[((i + 1) % n) * 2], cz = pp[((i + 1) % n) * 2 + 1];
        const dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0.2, Math.min(0.8, ((rx - ax) * dx + (rz - az) * dz) / L2));
        const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(rx - px, rz - pz);
        if (d > 3.5 && d < 22 && (!best || d < best.d)) best = { bx: px, bz: pz, d };
      }
    }
    if (!best) return null;
    const nx = (rx - best.bx) / best.d, nz = (rz - best.bz) / best.d;
    const x = best.bx + nx * 0.9, z = best.bz + nz * 0.9;
    if (!world.onLand(x, z) || world.heightAt(x, z) > 0) return null;
    return { x, z, nx, nz };
  }
  {
    const samples = world.roadNames;
    let k = 0;
    for (let i = 0; i < samples.length && shops.length < 70; i++) {
      const r = samples[(i * 7919) % samples.length];
      if (shops.some((sh) => dist(sh.x, sh.z, r.x, r.z) < 60)) continue;
      const f = frontOf(r.x, r.z);
      if (!f) continue;
      const nm = SHOP_NAMES[k++ % SHOP_NAMES.length];
      shops.push({ ...f, name: lang === "en" ? nm[1] : nm[0], cool: 0, rx: r.x, rz: r.z });
    }
    // dealership: on Alton Road level with the start, else the first store spot
    const alton = world.roadNames.filter((r) => r.n === "Alton Road").sort((a, b) => Math.abs(a.z - world.spawn.z) - Math.abs(b.z - world.spawn.z));
    let dealer: Shop | null = null;
    for (const r of alton.length ? alton : world.roadNames) { const f = frontOf(r.x, r.z); if (f) { dealer = { ...f, name: "SOUTH BEACH MOTORS", cool: 0, dealer: true, rx: r.x, rz: r.z }; break; } }
    if (dealer) shops.push(dealer);
  }
  const dealerShop = shops.find((x) => x.dealer) || null;
  // the beach (surf, towers, umbrellas) and the jet ski rental kiosks
  const beach = buildBeach(world, map!, scene, lang);
  const jetSpots = beach.kiosks.map((k) => k.dock);
  // one store interior, reused for every store (far away from the city)
  const INT = { x: 6000, z: 6000 };
  const shopRoom = makeShopInterior();
  shopRoom.group.position.set(INT.x, 0, INT.z); shopRoom.group.visible = false; scene.add(shopRoom.group);
  // yachts off the beach
  const yachts: Yacht[] = [];
  {
    const B = world.bounds, NAMES = ["SEA BREEZE", "LA DOLCE VITA", "OCEAN PEARL", "BLUE MARLIN", "AQUA BELLA", "SOL Y MAR"];
    for (let k = 0; k < 6; k++) {
      const z = B.z0 + 260 + ((B.z1 - B.z0 - 520) * k) / 5 + (k % 2 ? 40 : -30);
      const x = world.shore(z).e + 150 + (k % 3) * 85;
      const a = (k % 2 ? 0 : Math.PI) + (k % 3 - 1) * 0.35;
      const sz = k % 3 === 2 ? 1.12 : 1;
      const Y = makeYacht(sz);
      Y.group.position.set(x, -0.8, z); Y.group.rotation.y = a; scene.add(Y.group);
      // name on the stern
      const c = document.createElement("canvas"); c.width = 512; c.height = 96;
      const g2 = c.getContext("2d")!; g2.fillStyle = "#1c2a44"; g2.font = "italic 900 60px Georgia, serif"; g2.textAlign = "center"; g2.textBaseline = "middle"; g2.fillText(NAMES[k], 256, 50);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      const nm = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.95), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
      nm.position.set(0, 1.4, -19.02); nm.rotation.y = Math.PI; Y.group.add(nm);
      yachts.push({ g: Y.group, x, z, a, sc: sz, deckY: Y.deckY - 0.8, walk: Y.walk, block: Y.block, stern: Y.stern, spots: Y.spots, crew: [], name: NAMES[k], cool: 0 });
    }
  }
  // police helicopters (5 stars)
  type Heli = ReturnType<typeof makeHeli> & { x: number; y: number; z: number; a: number; vx: number; vz: number; vy: number; hp: number; fireT: number; dead: boolean; leaving: boolean; ang: number; gone: boolean };
  const helis: Heli[] = [];
  const yToWorld = (y: Yacht, lx: number, lz: number) => ({ x: y.x + lx * Math.cos(y.a) + lz * Math.sin(y.a), z: y.z - lx * Math.sin(y.a) + lz * Math.cos(y.a) });
  const yToLocal = (y: Yacht, wx: number, wz: number) => { const dx = wx - y.x, dz = wz - y.z; return { x: dx * Math.cos(y.a) - dz * Math.sin(y.a), z: dx * Math.sin(y.a) + dz * Math.cos(y.a) }; };
  function makeSign(text: string, color: string, w: number) {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(12,6,20,0.92)"; g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = color; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
    g.font = `900 ${text.length > 12 ? 92 : 120}px Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = color; g.shadowBlur = 28; g.fillStyle = "#fff"; g.fillText(text, 512, 134);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6), side: THREE.DoubleSide }));
    return m;
  }
  const ringGeo = new THREE.RingGeometry(0.55, 0.75, 32).rotateX(-Math.PI / 2);
  for (const sh of shops) {
    const sign = makeSign(sh.name, sh.dealer ? "#38e6ff" : "#ffcc33", sh.dealer ? 7 : 3.4);
    sign.position.set(sh.x + sh.nx * 0.1, sh.dealer ? 5.2 : 3.7, sh.z + sh.nz * 0.1);
    sign.rotation.y = Math.atan2(sh.nx, sh.nz);
    scene.add(sign);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(sh.dealer ? "#38e6ff" : "#ffcc33").multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0.85 }));
    ring.position.set(sh.x + sh.nx * 0.6, 0.1, sh.z + sh.nz * 0.6);
    scene.add(ring);
  }

  // ── businesses, hideout, heist targets ─────────────────────────────
  const BIZ = [
    { id: "scrap", de: "Schrottplatz", en: "Scrapyard", price: 800, rate: 40, cap: 10, value: 30, good: ["Ersatzteile", "spare parts"], sign: lang === "en" ? "SCRAP & PARTS" : "SCHROTT & TEILE" },
    { id: "club", de: "Nachtclub", en: "Nightclub", price: 2500, rate: 60, cap: 10, value: 70, good: ["Kisten", "crates"], sign: "CLUB FLAMINGO", club: true },
    { id: "office", de: "Büro", en: "Office", price: 3500, rate: 55, cap: 12, value: 90, good: ["Fracht", "cargo"], sign: "BAYFRONT TRADING" },
    { id: "lab", de: "Labor", en: "Lab", price: 5000, rate: 45, cap: 15, value: 95, good: ["Ware", "product"], sign: "OCEAN LABS" },
    { id: "bunker", de: "Bunker", en: "Bunker", price: 8000, rate: 50, cap: 15, value: 150, good: ["Waffenteile", "weapon parts"], sign: "BUNKER 305" },
  ];
  type BizDef = (typeof BIZ)[number] & { club?: boolean };
  const bizSpots: (Shop & { biz: BizDef })[] = [];
  let hideout: Shop | null = null;
  {
    const taken = (x: number, z: number, d: number) => shops.some((sh) => dist(sh.x, sh.z, x, z) < d) || bizSpots.some((b) => dist(b.x, b.z, x, z) < d);
    const pts = world.roadNames;
    for (let i = 0; i < pts.length && !hideout; i += 5) {
      const r = pts[(i * 4099) % pts.length];
      const d = dist(r.x, r.z, world.spawn.x, world.spawn.z);
      if (d < 90 || d > 320 || taken(r.x, r.z, 45)) continue;
      const f = frontOf(r.x, r.z); if (f) hideout = { ...f, name: "", cool: 0, rx: r.x, rz: r.z };
    }
    let bi = 0;
    for (let i = 0; i < pts.length && bi < BIZ.length; i++) {
      const r = pts[(i * 6007 + 13) % pts.length];
      if (taken(r.x, r.z, 90) || bizSpots.some((b) => dist(b.x, b.z, r.x, r.z) < 380) || (hideout && dist(hideout.x, hideout.z, r.x, r.z) < 150)) continue;
      const f = frontOf(r.x, r.z); if (!f) continue;
      bizSpots.push({ ...f, name: BIZ[bi].sign, cool: 0, rx: r.x, rz: r.z, biz: BIZ[bi] }); bi++;
    }
  }
  const neonSpot = (sp: Shop, text: string, color: string, w: number) => {
    const sign = makeSign(text, color, w); sign.position.set(sp.x + sp.nx * 0.1, 4.6, sp.z + sp.nz * 0.1); sign.rotation.y = Math.atan2(sp.nx, sp.nz); scene.add(sign);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0.85 }));
    ring.position.set(sp.x + sp.nx * 0.6, 0.1, sp.z + sp.nz * 0.6); scene.add(ring);
  };
  for (const b of bizSpots) neonSpot(b, b.name, "#b46bff", 5.2);
  if (hideout) neonSpot(hideout, lang === "en" ? "HIDEOUT" : "VERSTECK", "#ff3b5c", 4);
  const pickShop = (re: RegExp) => shops.find((x) => !x.dealer && re.test(x.name)) || shops.find((x) => !x.dealer) || hideout!;
  const jeweler = pickShop(/JUWELIER|JEWELER|SCHMUCK|JEWELRY/), bank = pickShop(/BANK/);
  const walkPt = (from: { x: number; z: number }, minD: number, maxD: number, salt: number) => {
    const g = world.walks;
    for (let k = 0; k < 400; k++) { const i = Math.floor(((k * 2654435761 + salt * 97) >>> 0) % g.count); if (!g.adj[i].length) continue; const d = dist(g.x[i], g.z[i], from.x, from.z); if (d > minD && d < maxD && world.onLand(g.x[i], g.z[i])) return { x: g.x[i], z: g.z[i] }; }
    return { x: from.x + minD, z: from.z };
  };
  const base = hideout || { x: world.spawn.x, z: world.spawn.z };
  const gearSpot = walkPt(base, 450, 900, 1), lap1 = walkPt(base, 300, 700, 2), lap2 = walkPt(lap1, 350, 800, 3), lap3 = walkPt(lap2, 350, 800, 4);
  // the heist yacht is the first one; the safe sits at the front of the cabin
  const yacht = yachts[0];
  const yachtSafe = () => yToWorld(yacht, 0, 9.4);
  const beachDrop = jetSpots[0] || { x: world.shore(0).e + 4, z: 0 };
  // beacon for the current mission target
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 80, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.6, 2.6), transparent: true, opacity: 0.14, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  beacon.visible = false; scene.add(beacon);
  const HEISTS: { id: string; de: string; en: string; reward: number; cool: number; preps: HStep[][]; finale: HStep[]; info: [string, string] }[] = [
    { id: "jewel", de: "Juwelen-Coup am Ocean Drive", en: "Ocean Drive jewel heist", reward: 1600, cool: 600, info: ["Fluchtwagen besorgen, Ausrüstung holen, dann die Vitrinen ausräumen.", "Get a getaway car, pick up gear, then clean out the display cases."],
      preps: [
        [{ de: "Besorg einen schnellen Sportwagen als Fluchtwagen und bring ihn ins Versteck", en: "Get a fast sports car as the getaway car and bring it to the hideout", kind: "car", at: () => base, r: 12, models: [0, 3, 4, 6, 7] }],
        [{ de: "Hol die Ausrüstung ab", en: "Pick up the gear", kind: "goto", at: () => gearSpot, r: 4 }, { de: "Bring die Ausrüstung ins Versteck", en: "Bring the gear to the hideout", kind: "goto", at: () => base, r: 8, timer: 240 }],
      ],
      finale: [
        { de: "Fahr zum Juwelier", en: "Go to the jeweler", kind: "goto", at: () => jeweler, r: 5 },
        { de: "Räum die Vitrinen aus – mit gezogener Waffe", en: "Clean out the display cases – weapon drawn", kind: "hold", at: () => jeweler, r: 6, hold: 8, stars: 3 },
        { de: "Häng die Polizei ab", en: "Lose the cops", kind: "lose", at: () => base, r: 1e9 },
        { de: "Bring die Beute ins Versteck", en: "Bring the loot to the hideout", kind: "goto", at: () => base, r: 8 },
      ] },
    { id: "bank", de: "Bayfront-Bank-Coup", en: "Bayfront bank heist", reward: 4200, cool: 900, info: ["Drei Terminals hacken, einen schweren SUV besorgen, dann den Tresor knacken.", "Hack three terminals, get a heavy SUV, then crack the vault."],
      preps: [
        [{ de: "Hack Terminal 1", en: "Hack terminal 1", kind: "hold", at: () => lap1, r: 3, hold: 3, timer: 300 }, { de: "Hack Terminal 2", en: "Hack terminal 2", kind: "hold", at: () => lap2, r: 3, hold: 3, timer: 240 }, { de: "Hack Terminal 3", en: "Hack terminal 3", kind: "hold", at: () => lap3, r: 3, hold: 3, timer: 240 }],
        [{ de: "Besorg einen schweren SUV und bring ihn ins Versteck", en: "Get a heavy SUV and bring it to the hideout", kind: "car", at: () => base, r: 12, models: [2, 5] }],
      ],
      finale: [
        { de: "Fahr zur Bank", en: "Go to the bank", kind: "goto", at: () => bank, r: 5 },
        { de: "Knack den Tresor – mit gezogener Waffe", en: "Crack the vault – weapon drawn", kind: "hold", at: () => bank, r: 6, hold: 12, stars: 4 },
        { de: "Häng die Polizei ab", en: "Lose the cops", kind: "lose", at: () => base, r: 1e9 },
        { de: "Bring das Geld ins Versteck", en: "Bring the money to the hideout", kind: "goto", at: () => base, r: 8 },
      ] },
    { id: "yacht", de: "Yacht-Coup", en: "Yacht heist", reward: 6500, cool: 1200, info: ["Die Luxusyacht „Sea Breeze“ mit dem Jetski auskundschaften, an Bord gehen und den Safe leeren. Jetski mieten oder kaufen am Jetski-Verleih.", "Scout the luxury yacht “Sea Breeze” by jet ski, board it and empty the safe. Rent or buy a jet ski at the rental kiosk."],
      preps: [
        [{ de: "Hol dir einen Jetski am Jetski-Verleih (mieten oder eigener)", en: "Get a jet ski at the rental kiosk (rent or your own)", kind: "goto", at: () => beachDrop, r: 1e9, boat: true }, { de: "Erkunde die Yacht „Sea Breeze“", en: "Scout the yacht “Sea Breeze”", kind: "goto", at: () => yacht, r: 60, boat: true }, { de: "Zurück zum Strand", en: "Back to the beach", kind: "goto", at: () => beachDrop, r: 18, boat: true }],
      ],
      finale: [
        { de: "Fahr mit dem Jetski zur „Sea Breeze“", en: "Ride a jet ski to the “Sea Breeze”", kind: "goto", at: () => yacht, r: 40, boat: true },
        { de: "Geh am Heck an Bord", en: "Board at the stern", kind: "goto", at: () => yacht, r: 60, deck: true },
        { de: "Leer den Safe vorne an der Kabine – mit gezogener Waffe", en: "Empty the safe at the front of the cabin – weapon drawn", kind: "hold", at: yachtSafe, r: 3.5, hold: 10, stars: 3, deck: true },
        { de: "Zurück zum Jetski und an den Strand", en: "Back to the jet ski and to the beach", kind: "goto", at: () => beachDrop, r: 18, boat: true },
        { de: "Häng die Polizei ab", en: "Lose the cops", kind: "lose", at: () => base, r: 1e9 },
      ] },
  ];

  progress(0.8, tt("Verkehr und Passanten …", "Traffic and people …"));
  await frame();
  for (let i = 0; i < CFG.civCars; i++) spawnCiv(15, 220);
  for (let i = 0; i < CFG.peds; i++) spawnPed(8, 140);

  // ── HUD ──────────────────────────────────────────────────────────────
  const hud = document.createElement("div"); hud.className = "sb-hud";
  hud.innerHTML = `
    <div class="sb-tr"><div class="sb-money"></div><div class="sb-stars"></div><div class="sb-bars"><i class="hp"></i><i class="ar"></i></div><div class="sb-weap"></div></div>
    <div class="sb-mm" data-b="map" title="${tt("Karte öffnen", "Open map")}"><canvas width="220" height="220"></canvas><i class="sb-mmhint">${tt("KARTE", "MAP")}</i></div>
    <div class="sb-big" style="display:none"><canvas></canvas><div class="sb-bighead"><b>${tt("KARTE", "MAP")} · SOUTH BEACH</b><span>${isTouch ? tt("Wischen zum Verschieben · + / − zoomen", "Drag to pan · + / − to zoom") : tt("Ziehen zum Verschieben · Mausrad zoomen · M oder Esc schließt", "Drag to pan · wheel to zoom · M or Esc closes")}</span></div>
      <div class="sb-bigbtns"><button data-b="mapin">+</button><button data-b="mapout">−</button><button data-b="mapme">◎</button><button data-b="mapclose">✕</button></div>
      <div class="sb-legend"><i style="background:#fff"></i>${tt("Du", "You")}<i style="background:#ffcc33"></i>${tt("Läden", "Stores")}<i style="background:#38e6ff"></i>${tt("Autohaus", "Dealer")}<i style="background:#b46bff"></i>${tt("Unternehmen", "Businesses")}<i style="background:#ff3b5c"></i>${tt("Versteck", "Hideout")}<i style="background:#ff7a1f"></i>${tt("Jetski-Verleih", "Jet ski rental")}<i style="background:#f3f5f7;border-radius:2px"></i>${tt("Yachten", "Yachts")}<i style="background:#e07bff"></i>${tt("Auftrag", "Job")}<i style="background:#2050ff"></i>${tt("Polizei", "Police")}</div></div>
    <div class="sb-street"></div>
    <div class="sb-cross"></div>
    <div class="sb-prompt"></div>
    <div class="sb-goal"></div>
    <div class="sb-toasts"></div>
    <div class="sb-banner"><b></b><span></span></div>
    <div class="sb-hint"></div>
    <div class="sb-tl"><button class="sb-ib" data-b="fs" aria-label="Vollbild">⛶</button>${isTouch ? `<button class="sb-ib" data-b="pause" aria-label="Pause">❚❚</button>` : ""}</div>
    <div class="sb-rot">${tt("Dreh dein Handy quer 🔄", "Turn your phone sideways 🔄")}</div>
    ${isTouch ? `<div class="sb-joyzone"><div class="sb-joy"><i></i></div></div>
    <button class="sb-b sb-jump" data-b="jump"><span>${tt("SPRUNG", "JUMP")}</span></button>
    <button class="sb-b sb-shoot" data-b="shoot"><span>✸</span></button>
` : ""}
    <div class="sb-hot">
      <button data-b="eq0"><i>👊</i><b>${tt("Fäuste", "Fists")}</b><small>1</small></button>
      <button data-b="eq1"><i class="sb-gun"></i><b>${tt("Pistole", "Pistol")}</b><small>2</small></button>
      <button data-b="eq2"><i class="sb-gun smg"></i><b>${tt("MP", "SMG")}</b><small>3</small></button>
    </div>
    <div class="sb-acts"></div>
    <div class="sb-shop" style="display:none"></div>`;
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
    <b>${tt("Linksklick", "Left click")}</b><span>${tt("schießen", "shoot")}</span><b>${tt("Rechtsklick", "Right click")}</b><span>${tt("genau zielen (mit Waffe läufst du immer in Blickrichtung)", "aim precisely (with a weapon you always face the camera)")}</span>
    <b>F</b><span>${tt("Aktion am Knopf: einsteigen, Fahrer rauszerren, ausrauben, Laden betreten, an Bord gehen", "action button: get in, drag driver out, rob, enter a store, board a yacht")}</span>
    <b>1 / 2 / 3</b><span>${tt("Fäuste / Pistole / MP (unten in der Leiste)", "fists / pistol / SMG (bar at the bottom)")}</span>
    <b>R</b><span>${tt("nachladen", "reload")}</span>
    <b>${tt("Leertaste", "Space")}</b><span>${tt("springen · Handbremse", "jump · handbrake")}</span>
    <b>T</b><span>${tt("Tageszeit: Sonnenuntergang / Nacht / Tag", "time of day: sunset / night / day")}</span>
    <b>M</b><span>${tt("große Karte (oder auf die Minimap klicken)", "big map (or click the minimap)")}</span>
    <b>H</b><span>${tt("Hupe", "horn")}</span><b>Esc</b><span>${tt("Pause", "pause")}</span></div>`;
  const touch = isTouch;
  const touchHelp = `<div class="sb-keys">
    <b>${tt("Joystick links", "Left joystick")}</b><span>${tt("laufen · im Auto: Gas, Bremse, Lenken", "move · in a car: throttle, brake, steer")}</span>
    <b>${tt("Rechts wischen", "Swipe right side")}</b><span>${tt("Kamera drehen", "turn the camera")}</span>
    <b>${tt("SPRUNG", "JUMP")}</b><span>${tt("springen · im Auto: Handbremse / Drift", "jump · in a car: handbrake / drift")}</span>
    <b>✸</b><span>${tt("schießen (zielt automatisch)", "shoot (auto-aim)")}</span>
    <b>🚪</b><span>${tt("Knopf an der Autotür: einsteigen oder Fahrer rauszerren", "button at the car door: get in or drag the driver out")}</span>
    <b>👊 🔫</b><span>${tt("unten in der Leiste ausrüsten (wie bei Roblox)", "equip in the bar at the bottom (like Roblox)")}</span>
    <b>🪙</b><span>${tt("Gold: Passanten und Läden ausrauben, im Autohaus Autos kaufen", "gold: rob people and stores, buy cars at the dealership")}</span>
    <b>🛒</b><span>${tt("Laden betreten, Waffe auf den Kassierer richten, bis er zahlt", "enter a store, point your weapon at the cashier until he pays")}</span>
    <b>🚤</b><span>${tt("Jetski-Verleih am Strand: mieten, kaufen, Stellplatz", "jet ski rental at the beach: rent, buy, berth")}</span>
    <b>🗺️</b><span>${tt("Minimap antippen: große Karte", "tap the minimap: big map")}</span>
    <b>🌊</b><span>${tt("vom Jetski ins Meer springen, schwimmen, auf Yachten klettern", "jump off the jet ski, swim, climb onto yachts")}</span>
    <b>⛶</b><span>${tt("Vollbild", "fullscreen")}</span></div>`;
  function showStart() {
    ov.style.display = "flex";
    ov.innerHTML = `<div class="sb-card"><div class="sb-title">SOUTH BEACH<small>MIAMI · FLORIDA</small></div>
      <p>${tt("Ocean Drive, Collins Avenue, Lummus Park – South Beach im Maßstab 1:1 nach OpenStreetMap-Daten. Klau dir ein Auto, fahr den Strand entlang, und wenn du Ärger suchst: Die Polizei von Miami Beach findet dich.", "Ocean Drive, Collins Avenue, Lummus Park – South Beach at 1:1 scale from OpenStreetMap data. Steal a car, cruise the beach, and if you go looking for trouble: Miami Beach PD will find you.")}</p>
      ${touch ? touchHelp : keysHtml}
      <button class="sb-btn" data-a="play">${tt("Spielen", "Play")}</button>
      <p class="sb-small">${map!.synthetic ? tt("Kartendaten gerade nicht erreichbar – vereinfachter Stadtplan.", "Map data unavailable right now – simplified street plan.") : "Map data © OpenStreetMap contributors (ODbL)"}</p></div>`;
  }
  function showPause() {
    ov.style.display = "flex";
    ov.innerHTML = `<div class="sb-card"><div class="sb-title" style="font-size:44px">PAUSE</div>${touch ? touchHelp : keysHtml}<button class="sb-btn" data-a="play">${tt("Weiter", "Resume")}</button></div>`;
  }
  const lockPointer = () => { if (!touch) renderer.domElement.requestPointerLock?.(); };
  on(ov, "click", (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("[data-a]") as HTMLElement | null;
    if (!a) return;
    sound.unlock();
    if (touch && !isFs()) toggleFs();
    S.started = true; S.paused = false; ov.style.display = "none";
    lockPointer();
  });
  // ── fullscreen (real API, or a CSS fallback on iPhone) ────────────────
  type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
  const isFs = () => !!(document.fullscreenElement || (document as FsDoc).webkitFullscreenElement || root.classList.contains("sb-fake"));
  function fakeFs(onOff: boolean) {
    root.classList.toggle("sb-fake", onOff);
    document.documentElement.style.overflow = onOff ? "hidden" : "";
    if (onOff) window.scrollTo(0, 0);
  }
  function toggleFs() {
    const d = document as FsDoc, r = root as FsEl;
    if (isFs()) {
      if (root.classList.contains("sb-fake")) fakeFs(false);
      else if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
      return;
    }
    if (r.requestFullscreen) {
      r.requestFullscreen({ navigationUI: "hide" }).then(() => {
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        if (touch) o.lock?.("landscape").catch(() => {});
      }).catch(() => fakeFs(true));
    } else if (r.webkitRequestFullscreen) r.webkitRequestFullscreen();
    else fakeFs(true);
  }
  disposers.push(() => fakeFs(false));
  // ── touch controls ────────────────────────────────────────────────────
  const pad = { jx: 0, jy: 0, jump: false, shoot: false };
  on(hud, "pointerdown", (e: PointerEvent) => {
    const act = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
    if (act) { e.preventDefault(); e.stopPropagation(); sound.unlock(); actRun.get(act.dataset.act || "")?.(); return; }
    const sh = (e.target as HTMLElement).closest("[data-shop]") as HTMLElement | null;
    if (sh) { e.preventDefault(); e.stopPropagation(); shopAction(sh.dataset.shop || ""); return; }
    const b = (e.target as HTMLElement).closest("[data-b]") as HTMLElement | null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    sound.unlock();
    const k = b.dataset.b;
    if (k === "fs") { toggleFs(); return; }
    if (k === "map") { if (S.started && !S.paused && !S.menu) openMap(); return; }
    if (k === "mapclose") { closeMap(); return; }
    if (k === "mapin" || k === "mapout") { bigView.zoom = Math.max(0.15, Math.min(4, bigView.zoom * (k === "mapin" ? 1.5 : 1 / 1.5))); return; }
    if (k === "mapme") { const w = wpos(); bigView.x = w.x; bigView.z = w.z; return; }
    if (k === "pause") { if (S.started) { S.paused = true; showPause(); } return; }
    if (!S.started || S.paused) return;
    b.classList.add("on");
    try { b.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (k === "jump") pad.jump = true;
    if (k === "shoot") pad.shoot = true;
    if (k && k.startsWith("eq")) equip(+k.slice(2));
  });
  const btnUp = (e: PointerEvent) => {
    const b = (e.target as HTMLElement).closest("[data-b]") as HTMLElement | null;
    if (!b) return;
    b.classList.remove("on");
    if (b.dataset.b === "jump") pad.jump = false;
    if (b.dataset.b === "shoot") pad.shoot = false;
  };
  on(hud, "pointerup", btnUp); on(hud, "pointercancel", btnUp);
  const joyZone = hud.querySelector(".sb-joyzone") as HTMLElement | null, joy = hud.querySelector(".sb-joy") as HTMLElement | null;
  if (joyZone && joy) {
    const knob = joy.querySelector("i") as HTMLElement;
    let jid = -1, cx = 0, cy = 0;
    const R = 58;
    const home = () => { joy.style.left = ""; joy.style.top = ""; joy.classList.remove("on"); knob.style.transform = ""; };
    on(joyZone, "pointerdown", (e: PointerEvent) => {
      if (jid >= 0) return;
      e.preventDefault(); sound.unlock();
      jid = e.pointerId; try { joyZone.setPointerCapture(e.pointerId); } catch { /* synthetic or lost pointer */ }
      const zr = joyZone.getBoundingClientRect();
      cx = e.clientX; cy = e.clientY;
      joy.style.left = cx - zr.left - 70 + "px"; joy.style.top = cy - zr.top - 70 + "px";
      joy.classList.add("on");
    });
    on(joyZone, "pointermove", (e: PointerEvent) => {
      if (e.pointerId !== jid) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
      pad.jx = dx / R; pad.jy = dy / R;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e: PointerEvent) => { if (e.pointerId !== jid) return; jid = -1; pad.jx = pad.jy = 0; home(); };
    on(joyZone, "pointerup", end); on(joyZone, "pointercancel", end);
  }
  // swipe on the right side turns the camera
  let camId = -1, lx = 0, ly = 0;
  on(renderer.domElement, "pointerdown", (e: PointerEvent) => { if (e.pointerType === "mouse" || camId >= 0) return; camId = e.pointerId; lx = e.clientX; ly = e.clientY; sound.unlock(); });
  on(renderer.domElement, "pointermove", (e: PointerEvent) => {
    if (e.pointerId !== camId || S.paused) return;
    S.yaw -= (e.clientX - lx) * 0.0058; S.pitch = Math.max(-0.65, Math.min(1.15, S.pitch + (e.clientY - ly) * 0.0045));
    lx = e.clientX; ly = e.clientY; S.mouseIdle = 0;
  });
  const camEnd = (e: PointerEvent) => { if (e.pointerId === camId) camId = -1; };
  on(renderer.domElement, "pointerup", camEnd); on(renderer.domElement, "pointercancel", camEnd);
  on(renderer.domElement, "click", () => { sound.unlock(); if (S.started && document.pointerLockElement !== renderer.domElement) lockPointer(); });
  on(document, "pointerlockchange", () => {
    if (!S.started) return;
    if (document.pointerLockElement !== renderer.domElement && !touch && !S.menu) { S.paused = true; showPause(); keys.clear(); mouse.l = mouse.r = false; }
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
    if (S.mapOpen) { if (e.code === "Escape" || e.code === "KeyM") closeMap(); return; }
    if (S.menu) { if (e.code === "Escape" || e.code === "KeyF") closeShop(); return; }
    if (e.code === "KeyM") { openMap(); return; }
    if (e.code === "KeyF" || e.code === "KeyE") { const a = acts[0]; if (a && a.enabled !== false) a.run(); else if (player.car) exitCar(); }
    if (e.code === "Digit1") equip(0);
    if (e.code === "Digit2") equip(1);
    if (e.code === "Digit3") equip(2);
    if (e.code === "KeyQ") equip(S.armed ? (S.weapon === 0 ? 2 : 0) : 1);
    if (e.code === "KeyR") reload();
    if (e.code === "KeyT") { const order: TodKey[] = ["sunset", "night", "day"]; applyTod(order[(order.indexOf(tod) + 1) % 3]); }
    if (e.code === "KeyH" && player.car) sound.tone(392, 0.35, 0.12, "square");
  });
  on(window, "keyup", (e: KeyboardEvent) => keys.delete(e.code));
  const releaseAll = () => { keys.clear(); mouse.l = mouse.r = false; pad.jx = pad.jy = 0; pad.jump = pad.shoot = false; hud.querySelectorAll(".on").forEach((x) => x.classList.remove("on")); };
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
  function saveGame() { try { localStorage.setItem(CFG.save, JSON.stringify({ gold: S.gold, owned: S.owned, kills: S.kills, biz: S.biz, heist: S.heist, jetOwned: S.jetOwned, berthUntil: S.berthUntil })); } catch { /* ignore */ } }
  function los(ax: number, az: number, bx: number, bz: number, y = 1.4) {
    const d = dist(ax, az, bx, bz), n = Math.ceil(d / 2.5);
    for (let i = 1; i < n; i++) { const t = i / n; if (world.heightAt(ax + (bx - ax) * t, az + (bz - az) * t) > y) return false; }
    return true;
  }
  /** A crime only counts if police or other people see it (line of sight). The victim is not a witness. */
  function crime(sev: number, x: number, z: number, victim?: Ped | null) {
    let witnessed = false;
    if (S.inside) {
      // inside a store only the people in the room can see it; the police then come to the door
      for (const p of peds) {
        if (p === victim || p.room !== "shop" || p.mode === "dead" || p.deadT < 0) continue;
        witnessed = true;
        if (p.tough === 2 && !p.cashier) startFight(p); else if (!p.cashier) { p.mode = "flee"; p.t = 20; }
      }
      x = S.inside.out.x; z = S.inside.out.z;
    }
    if (!S.inside) for (const c of cars) if (!c.dead && c.kind === "cop" && c.driver && dist(c.x, c.z, x, z) < CFG.copRange && los(c.x, c.z, x, z)) { witnessed = true; c.lock = 3; }
    if (!S.inside) for (const p of peds) if (p.cop && p.mode !== "dead" && p.deadT >= 0 && dist(p.x, p.z, x, z) < CFG.copRange && los(p.x, p.z, x, z)) witnessed = true;
    if (!S.inside) for (const c of cars) if (!c.dead && c.kind === "civ" && c.driver && dist(c.x, c.z, x, z) < 28 && los(c.x, c.z, x, z)) { witnessed = true; c.ai.panic = 6; }
    if (!S.inside) for (const p of peds) {
      if (p === victim || p.deadT < 0 || p.mode === "dead" || p.room === "shop") continue;
      if (dist(p.x, p.z, x, z) < 38 && los(p.x, p.z, x, z)) {
        witnessed = true;
        if (p.mode === "fight") continue;
        // some people don't run away – they fight back
        if (p.tough && dist(p.x, p.z, x, z) < 16 && (p.guard || rnd() < 0.45)) startFight(p); else { p.mode = "flee"; p.t = 8; }
      }
    }
    if (!witnessed) return false;
    const before = S.stars;
    S.stars = Math.min(5, Math.max(S.stars + (S.stars > 0 && sev >= 2 ? 1 : 0), sev));
    S.searchT = 0; S.lastSeen = { x, z };
    if (S.stars > before) { toast(tt("Zeugen haben dich gesehen – Fahndung!", "Witnesses saw you – you're wanted!"), "#ff5c7a"); sound.tone(660, 0.12, 0.06, "square"); }
    return true;
  }
  const doorPos = (c: Car) => ({ x: c.x + Math.cos(c.a) * 1.2 + Math.sin(c.a) * 0.25, z: c.z - Math.sin(c.a) * 1.2 + Math.cos(c.a) * 0.25 });
  function exitCar() {
    const c = player.car;
    if (!c) return;
    if (Math.hypot(c.vx, c.vz) > 6) { toast(tt("Erst langsamer werden.", "Slow down first.")); return; }
    const d = doorPos(c);
    player.x = d.x + Math.cos(c.a) * 0.5; player.z = d.z - Math.sin(c.a) * 0.5;
    if (c.boat) { const sh = world.shore(c.z); player.x = c.x > (sh.e + sh.w) / 2 ? sh.e - 2 : sh.w + 2; player.z = c.z; c.inp.th = 0; c.inp.st = 0; }
    world.pushCircle(player, CFG.pr);
    player.a = c.a;
    c.kind = "parked"; c.driver = false; c.inp.th = 0; c.inp.st = 0; c.inp.hb = true; if (!c.boat) c.ph = PHYS.civ;
    player.car = null;
    P.obj.visible = true;
  }
  function enterCar(c: Car) {
    const sp = c.owned ? CATALOG.find((x) => x.id === c.owned) : undefined;
    player.car = c; c.kind = "player"; c.driver = false; if (!c.boat) c.ph = sp ? specPhys(sp) : PHYS.player;
    P.obj.visible = false; S.mouseIdle = 2; S.rob = null;
    if (sp) toast(sp.name, "#ffd24a");
  }
  function enterExit() {
    if (player.car) { exitCar(); return; }
    let best: Car | null = null, bd = 4.2;
    for (const c of cars) { if (c.dead || c.kind === "cop" || c.kind === "wreck") continue; const d = dist(c.x, c.z, player.x, player.z); if (d < bd) { bd = d; best = c; } }
    if (!best) return;
    if (Math.hypot(best.vx, best.vz) > 4) { toast(tt("Zu schnell – stell dich davor.", "Too fast – step in front of it.")); return; }
    if (best.kind === "civ" && best.driver) pullDriver(best); else enterCar(best);
  }
  function dropCoin(x: number, z: number, v: number, y = 0) {
    const mesh = new THREE.Mesh(pickupGeo.cash, pickupMat.cash);
    mesh.position.set(x, y + 0.6, z); mesh.castShadow = true; scene.add(mesh);
    pickups.push({ mesh, x, z, kind: "drop", t: 0, v, y });
  }
  function knockOut(p: Ped, gold = true) {
    p.mode = "dead"; p.ko = true; p.deadT = 6; p.fallT = 0; p.hp = 0;
    p.mixer.stopAllAction();
    if (gold && !p.robbed) { p.robbed = true; dropCoin(p.x + 0.6, p.z, p.wealth, p.y || 0); }
    if (p.yacht && p.yacht.crew.every((q) => q.robbed || q.mode === "dead")) p.yacht.cool = 600;
  }
  function punch() {
    if (S.fireT > 0) return;
    S.fireT = 0.42; S.punchT = 0.22;
    sound.burst(0.06, 800, 0.1, "bandpass");
    let best: Ped | null = null, bd = 2.2;
    for (const p of peds) {
      if (p.deadT < 0 || p.mode === "dead") continue;
      const d = dist(p.x, p.z, player.x, player.z);
      if (d > bd) continue;
      let da = Math.atan2(p.x - player.x, p.z - player.z) - player.a;
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < 1.1) { bd = d; best = p; }
    }
    if (!best) return;
    best.hp -= 25;
    sound.tone(110, 0.1, 0.25, "square");
    const l = dist(best.x, best.z, player.x, player.z) || 1;
    best.x += ((best.x - player.x) / l) * 0.5; best.z += ((best.z - player.z) / l) * 0.5;
    if (best.hp <= 0) knockOut(best);
    else if (best.tough || best.mode === "fight") { startFight(best); toast(tt("Er wehrt sich!", "He fights back!"), "#ff8a5c"); }
    else if (!best.cashier) { best.mode = "flee"; best.t = 6; }
    crime(1, best.x, best.z, best);
  }
  function mug(p: Ped) {
    if (p.robbed || p.mode === "dead") return;
    if (p.mode === "fight" || p.tough === 2 || (p.tough === 1 && !S.armed)) {
      startFight(p); crime(1, p.x, p.z, p);
      toast(p.tough === 2 ? tt("Er zieht eine Waffe!", "He pulls a gun!") : tt("Er lässt sich nicht ausrauben – er wehrt sich!", "He won't be robbed – he fights back!"), "#ff5c7a");
      return;
    }
    const v = S.armed ? p.wealth : Math.round(p.wealth * 0.6);
    S.gold += v; p.robbed = true; p.mode = "flee"; p.t = 10;
    if (p.yacht && p.yacht.crew.every((q) => q.robbed || q.mode === "dead")) p.yacht.cool = 600;
    sound.cash(); toast(tt(`Ausgeraubt: +${v} Gold`, `Robbed: +${v} gold`) + (S.armed ? "" : tt(" (mit Waffe gibt's mehr)", " (more with a weapon)")), "#ffd24a");
    crime(1, p.x, p.z, p);
    saveGame();
  }
  function pullDriver(c: Car) {
    S.punchT = 0.3;
    sound.tone(110, 0.1, 0.25, "square"); sound.burst(0.08, 600, 0.15);
    const d = doorPos(c);
    c.driver = false; c.kind = "parked"; c.vx = 0; c.vz = 0;
    const p = spawnPedAt(d.x + Math.cos(c.a) * 0.9, d.z - Math.sin(c.a) * 0.9);
    const rich = (c.wealth ?? 0) >= 120;
    p.wealth = c.wealth ?? walletOf();
    // rich people in sports cars carry a gun and shoot back
    if (rich) { p.tough = 2; startFight(p); p.x += Math.cos(c.a) * 1.5; p.z -= Math.sin(c.a) * 1.5; }
    else knockOut(p, true);
    crime(1, c.x, c.z, p);
    enterCar(c);
    toast(rich ? tt("Der reiche Fahrer zieht eine Waffe!", "The rich driver pulls a gun!") : tt("Fahrer rausgezerrt – das Auto gehört dir!", "Driver dragged out – the car is yours!"), "#ff5c7a");
  }
  // ── missions (heists, deliveries) ─────────────────────────────
  function startMission(title: string, steps: HStep[], done: () => void, van: Car | null = null) {
    if (S.mission) { toast(tt("Du hast schon einen Auftrag.", "You already have a job running.")); return false; }
    S.mission = { title, steps, i: 0, hold: 0, t: 0, done, van, alarmed: false };
    banner(title, tt(steps[0].de, steps[0].en), "#b46bff");
    sound.tone(523, 0.12, 0.07); sound.tone(784, 0.2, 0.07, "sine", 0, 0.12);
    return true;
  }
  function endMission(ok: boolean, why = "") {
    const m = S.mission; if (!m) return;
    if (m.van && !m.van.dead && m.van !== player.car) removeCar(m.van);
    S.mission = null;
    if (ok) { m.done(); saveGame(); }
    else banner(tt("AUFTRAG GESCHEITERT", "JOB FAILED"), why, "#ff3b5c");
  }
  function tickMission(dt: number) {
    const m = S.mission; if (!m) return;
    const st = m.steps[m.i];
    m.t += dt;
    if (st.timer && m.t > st.timer) { endMission(false, tt("Die Zeit ist abgelaufen.", "Time ran out.")); return; }
    if (m.van && (m.van.dead || m.van.kind === "wreck" || m.van.hp <= 0)) { endMission(false, tt("Das Fahrzeug ist zerstört.", "The vehicle was destroyed.")); return; }
    const tg = st.at(), pp = wpos(), d = dist(tg.x, tg.z, pp.x, pp.z), sp = Math.hypot(pp.vx || 0, pp.vz || 0);
    const onBoat = !!player.car?.boat;
    let next = false;
    if (st.kind === "goto") next = d < st.r && (!st.boat || onBoat) && (!st.deck || !!S.deck) && (!st.van || player.car === m.van);
    else if (st.kind === "van") next = !!m.van && player.car === m.van;
    else if (st.kind === "car") next = !!player.car && !player.car.boat && (st.models || []).includes(player.car.model) && d < st.r;
    else if (st.kind === "lose") next = S.stars === 0;
    else if (st.kind === "hold") {
      const ok = d < st.r && sp < 3 && (st.boat ? onBoat : !player.car && (st.stars ? S.armed : true)) && (!st.deck || !!S.deck);
      if (ok) {
        if (!m.alarmed && st.stars) { m.alarmed = true; S.stars = Math.max(S.stars, st.stars); S.searchT = 0; S.lastSeen = { x: pp.x, z: pp.z }; toast(tt("Alarm ausgelöst!", "Alarm triggered!"), "#ff5c7a"); sound.tone(980, 0.3, 0.07, "sawtooth", 500); }
        m.hold += dt; if (m.hold >= (st.hold || 1)) next = true;
      } else m.hold = Math.max(0, m.hold - dt * 0.5);
    }
    if (next) {
      m.i++; m.hold = 0; m.t = 0; m.alarmed = false;
      sound.tone(880, 0.1, 0.07);
      if (m.i >= m.steps.length) { endMission(true); return; }
      toast(tt(m.steps[m.i].de, m.steps[m.i].en), "#d9b8ff");
    }
  }
  // passive production in real time (also while the game is closed)
  const bizDef = (id: string) => BIZ.find((b) => b.id === id) as BizDef | undefined;
  let prodT = 0;
  function tickBusiness(dt: number) {
    prodT -= dt; if (prodT > 0) return; prodT = 1;
    const now = Date.now();
    for (const id in S.biz) {
      const b = S.biz[id], d = bizDef(id); if (!d) continue;
      const n = Math.floor((now - b.t) / (d.rate * 1000));
      if (n > 0) { b.stock = Math.min(d.cap, b.stock + n); b.t = b.stock >= d.cap ? now : b.t + n * d.rate * 1000; }
      if (d.club) b.safe = Math.min(900, (b.safe || 0) + dt * 0.25 * 60 / 60 * 1);
    }
  }
  function sellGoods(spot: Shop & { biz: BizDef }) {
    const st = S.biz[spot.biz.id]; if (!st || st.stock <= 0) return;
    const units = st.stock, pay = units * spot.biz.value;
    const van = addCar(makeCar("parked", spot.rx - spot.nx * 3.2, spot.rz - spot.nz * 3.2, Math.atan2(spot.nz, -spot.nx), "#2b2f36", 2));
    van.owned = "mission"; van.driver = false; van.inp.hb = true;
    const dest = walkPt(spot, 700, 1400, units + Math.floor(S.t));
    const ok = startMission(tt(`${spot.biz.de}: Lieferung`, `${spot.biz.en}: delivery`), [
      { de: "Steig in den Lieferwagen", en: "Get into the delivery van", kind: "van", at: () => ({ x: van.x, z: van.z }), r: 1 },
      { de: `Liefere ${units} × ${spot.biz.good[0]} zum Käufer (Schäden vermeiden!)`, en: `Deliver ${units} × ${spot.biz.good[1]} to the buyer (avoid damage!)`, kind: "goto", at: () => dest, r: 10, van: true, timer: 300 },
    ], () => {
      const dmg = Math.max(0.4, Math.min(1, van.hp / 160));
      const v = Math.round(pay * dmg);
      S.gold += v; sound.cash();
      banner(`+${v} GOLD`, tt(`${units} × ${spot.biz.good[0]} verkauft`, `${units} × ${spot.biz.good[1]} sold`), "#ffd24a");
    }, van);
    if (ok) { st.stock = 0; closeShop(); } else removeCar(van);
  }
  function heistState(id: string) { return (S.heist[id] ||= { prep: 0, cool: 0 }); }
  function runHeist(id: string) {
    const h = HEISTS.find((x) => x.id === id); if (!h) return;
    const hs = heistState(id);
    if (hs.cool > Date.now()) return;
    if (hs.prep < h.preps.length) {
      const k = hs.prep;
      if (startMission(tt(`${h.de} – Vorbereitung ${k + 1}/${h.preps.length}`, `${h.en} – setup ${k + 1}/${h.preps.length}`), h.preps[k], () => {
        hs.prep = k + 1; banner(tt("VORBEREITUNG ERLEDIGT", "SETUP DONE"), tt(h.de, h.en), "#b46bff");
      })) closeShop();
    } else if (startMission(tt(`${h.de} – Finale`, `${h.en} – finale`), h.finale, () => {
      hs.prep = 0; hs.cool = Date.now() + h.cool * 1000; S.gold += h.reward; sound.cash();
      banner(`+${h.reward} GOLD`, tt(`${h.de} geschafft!`, `${h.en} complete!`), "#ffd24a");
    })) closeShop();
  }
  // ── fighting back ──────────────────────────────────────────────
  const pedGunGeo = [new THREE.BoxGeometry(0.035, 0.045, 0.2).translate(0, 0.03, 0.06), new THREE.BoxGeometry(0.03, 0.11, 0.045).rotateX(-0.25).translate(0, -0.03, -0.01)];
  function pedBones(p: Ped) {
    if (p.bones) return p.bones;
    const b: Record<string, THREE.Bone> = {};
    p.obj.traverse((o) => { if ((o as THREE.Bone).isBone) b[o.name.replace(/^mixamorig:?/, "")] = o as THREE.Bone; });
    return (p.bones = { arm: b.RightArm, fore: b.RightForeArm, hand: b.RightHand, larm: b.LeftArm, lfore: b.LeftForeArm, lhand: b.LeftHand });
  }
  function startFight(p: Ped) {
    if (p.mode === "dead" || p.deadT < 0) return;
    if (!p.tough) p.tough = 1;
    p.mode = "fight"; p.aggro = 25; p.atkT = Math.max(p.atkT, 0.5 + rnd() * 0.4);
    if (p.tough === 2 && !p.gun) {
      const hb = pedBones(p).hand;
      if (hb) {
        const g = new THREE.Group(); for (const geo of pedGunGeo) g.add(new THREE.Mesh(geo, gm));
        const ws = new THREE.Vector3(); p.obj.updateMatrixWorld(true); hb.getWorldScale(ws);
        g.scale.setScalar(1 / (ws.x || 1)); g.position.set(0.02 / (ws.x || 1), 0.08 / (ws.x || 1), 0.02 / (ws.x || 1)); g.rotation.set(Math.PI / 2, 0, 0);
        hb.add(g); p.gun = g;
      }
    }
    if (p.gun) p.gun.visible = true;
  }
  function calmDown(p: Ped) { p.mode = p.fix ? "idle" : "walk"; if (p.gun) p.gun.visible = false; }
  function pedShoot(p: Ped, d: number, bonus = 0) {
    const pp = ppos(), sp = Math.hypot(pp.vx || 0, pp.vz || 0);
    const hit = rnd() < 0.55 + bonus - Math.min(0.25, sp / 40) - d / 110;
    tmpV.set(p.x, (p.y || 0) + 1.4, p.z); tmpV2.set(pp.x + (hit ? 0 : (rnd() - 0.5) * 2.5), player.y + 1.2, pp.z + (hit ? 0 : (rnd() - 0.5) * 2.5));
    addTracer(tmpV, tmpV2, "#ffe7b0"); sound.shot(false, d); p.t = 0.15;
    if (hit) { if (player.car) player.car.hp -= 6; else hurt(7 + rnd() * 4); }
  }
  /** One step of a ped that fights back. Returns its speed (for the animation). */
  function fightStep(p: Ped, dt: number) {
    const pp = ppos(), d = dist(p.x, p.z, pp.x, pp.z);
    if (p.cop) {
      // officers: close in to about 8 m and keep shooting; back to the car when you drive off or the search ends
      if (S.stars === 0 || S.inside || S.deck || S.wasted > 0 || (player.car && d > 22)) { officerReturn(p, dt); return 3.4; }
      p.a = Math.atan2(pp.x - p.x, pp.z - p.z);
      p.atkT -= dt; p.t = Math.max(0, p.t - dt);
      let sp = 0;
      if (d > 9) sp = d > 25 ? 5 : 4; else if (d < 4) sp = -1.5;
      if (p.atkT <= 0 && d < 45 && los(p.x, p.z, pp.x, pp.z)) { p.atkT = 0.75 + rnd() * 0.6; pedShoot(p, d, 0.02); }
      if (sp) { p.x += Math.sin(p.a) * sp * dt; p.z += Math.cos(p.a) * sp * dt; }
      return Math.abs(sp);
    }
    const sameZone = p.room === "shop" ? !!S.inside : p.room === "yacht" ? S.deck === p.yacht || ((!!player.car?.boat || S.swim) && d < 35) : !S.inside && !S.deck;
    p.aggro -= dt * (d > 35 || !sameZone ? 3 : 0.35);
    if (p.aggro <= 0 || S.hp <= 0 || S.wasted > 0 || !sameZone) { calmDown(p); return 0; }
    if (player.car && !player.car.boat && (p.tough !== 2 || d > 30)) { calmDown(p); if (!p.fix) { p.mode = "flee"; p.t = 6; } return 0; }
    p.a = Math.atan2(pp.x - p.x, pp.z - p.z);
    p.atkT -= dt; p.t = Math.max(0, p.t - dt);
    let speed = 0;
    if (p.tough === 2) {
      if (!p.fix && d > 13) speed = 3.6;
      else if (!p.fix && d < 4) speed = -1.6;
      if (p.atkT <= 0 && d < 30 && (S.inside || S.deck || los(p.x, p.z, pp.x, pp.z))) { p.atkT = 0.95 + rnd() * 0.55; pedShoot(p, d); }
    } else {
      if (d > 1.2 && !player.car) speed = p.room ? 3.2 : 4.4;
      else if (p.atkT <= 0 && !player.car) {
        p.atkT = 0.85 + rnd() * 0.3; p.t = 0.25;
        hurt(6 + rnd() * 5); S.shake = Math.max(S.shake, 0.3);
        sound.tone(110, 0.1, 0.22, "square"); sound.burst(0.05, 700, 0.12, "bandpass");
      }
    }
    if (speed) { p.x += Math.sin(p.a) * speed * dt; p.z += Math.cos(p.a) * speed * dt; }
    return Math.abs(speed);
  }
  function spawnFixedPed(x: number, z: number, a: number, y = 0, look?: Look) {
    const m = makePerson(look || randomLook()); m.obj.scale.setScalar(0.94 + rnd() * 0.1); scene.add(m.obj);
    if (m.act.Idle) m.act.Idle.time = rnd() * 3;
    m.obj.position.set(x, y, z); m.obj.rotation.y = a + Math.PI;
    const p: Ped = { obj: m.obj, mixer: m.mixer, act: m.act, cur: "Idle", x, z, a, mode: "idle", from: 0, to: 0, hp: 60, t: 0, deadT: 0, fallT: 0, witness: 0, wealth: walletOf(), tough: toughRoll(), atkT: 0, aggro: 0, y, fix: { x, z, a } };
    peds.push(p);
    return p;
  }
  function pushRect(o: { x: number; z: number }, x0: number, z0: number, x1: number, z1: number, r: number) {
    const cx = Math.max(x0, Math.min(x1, o.x)), cz = Math.max(z0, Math.min(z1, o.z));
    const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz);
    if (d >= r) return;
    if (d > 1e-5) { o.x = cx + (dx / d) * r; o.z = cz + (dz / d) * r; return; }
    const opts: [number, number, number][] = [[o.x - x0, -1, 0], [x1 - o.x, 1, 0], [o.z - z0, 0, -1], [z1 - o.z, 0, 1]];
    opts.sort((a, b) => a[0] - b[0]);
    o.x += opts[0][1] * (opts[0][0] + r); o.z += opts[0][2] * (opts[0][0] + r);
  }
  /** Keeps a body inside the store room and out of shelves and the counter. */
  function clampRoom(o: { x: number; z: number }, r: number) {
    const hw = shopRoom.W / 2 - r - 0.12, hd = shopRoom.D / 2 - r - 0.12;
    o.x = Math.max(INT.x - hw, Math.min(INT.x + hw, o.x)); o.z = Math.max(INT.z - hd, Math.min(INT.z + hd, o.z));
    for (const q of shopRoom.solids) pushRect(o, INT.x + q.x0, INT.z + q.z0, INT.x + q.x1, INT.z + q.z1, r);
  }
  /** Keeps a body on a yacht deck and out of the cabin. */
  function clampDeck(y: Yacht, o: { x: number; z: number }, r: number) {
    const l = yToLocal(y, o.x, o.z), w = y.walk;
    l.x = Math.max(w.x0 + r, Math.min(w.x1 - r, l.x)); l.z = Math.max(w.z0 + r, Math.min(w.z1 - r, l.z));
    pushRect(l, y.block.x0, y.block.z0, y.block.x1, y.block.z1, r);
    const g = yToWorld(y, l.x, l.z); o.x = g.x; o.z = g.z;
  }
  function clampPed(p: Ped) {
    if (p.room === "shop") clampRoom(p, 0.35);
    else if (p.yacht) clampDeck(p.yacht, p, 0.35);
    else world.pushCircle(p, 0.35);
  }

  // ── store interiors: walk in, hold the cashier at gunpoint ────────
  function enterShop(sh: Shop) {
    if (S.inside || player.car) return;
    S.inside = { shop: sh, out: { x: sh.x + sh.nx * 1.4, z: sh.z + sh.nz * 1.4 } };
    shopRoom.setName(sh.name); shopRoom.group.visible = true;
    player.x = INT.x + shopRoom.door.x; player.z = INT.z + shopRoom.door.z; player.y = 0; player.vy = 0; player.vx = player.vz = 0;
    player.a = Math.PI; S.yaw = Math.PI; S.pitch = 0.1; S.rob = null; S.camDist = 2.4;
    camPos.set(player.x, 1.9, player.z + 0.5);
    const cs = shopRoom.cashier;
    const cash = spawnFixedPed(INT.x + cs.x, INT.z + cs.z, Math.PI);
    cash.cashier = true; cash.wealth = 0; cash.tough = rnd() < 0.25 ? 2 : 0;
    const spots = shopRoom.customers.slice().sort(() => rnd() - 0.5), n = Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) { const c = spawnFixedPed(INT.x + spots[i].x, INT.z + spots[i].z, rnd() * 6); c.room = "shop"; }
    cash.room = "shop";
    sound.tone(1320, 0.09, 0.04); sound.tone(990, 0.12, 0.04, "sine", 0, 0.1);
    toast(sh.cool > 0 ? tt("Die Kasse wurde gerade erst geleert.", "The register was emptied recently.") : S.armed ? tt("Ziel mit der Waffe auf den Kassierer, bis er das Geld rausrückt.", "Aim your weapon at the cashier until he hands over the money.") : tt("Zum Ausrauben: Waffe ausrüsten (2 oder 3) und auf den Kassierer zielen.", "To rob it: equip a weapon (2 or 3) and aim at the cashier."), "#ffd24a");
  }
  function leaveShop() {
    const io = S.inside; if (!io) return;
    for (const p of peds) if (p.room === "shop") removePed(p);
    S.inside = null; S.rob = null; shopRoom.group.visible = false;
    const sh = io.shop;
    player.x = io.out.x; player.z = io.out.z; player.y = 0; player.a = Math.atan2(sh.nx, sh.nz); S.yaw = player.a;
    world.pushCircle(player, CFG.pr);
    camPos.set(player.x - Math.sin(S.yaw) * 4, 2.2, player.z - Math.cos(S.yaw) * 4);
  }
  const cashier = () => peds.find((p) => p.cashier && p.deadT >= 0) || null;
  const bigStore = (n: string) => /BANK|JUWELIER|JEWELER|SCHMUCK|JEWELRY|UHREN|WATCHES|PFANDHAUS|PAWN/.test(n);
  function lootRegister(share: number) {
    const io = S.inside; if (!io) return;
    const sh = io.shop;
    const v = Math.round((130 + Math.floor(rnd() * 150)) * (bigStore(sh.name) ? 2.2 : 1) * share);
    S.gold += v; sh.cool = 300; S.rob = null;
    sound.cash();
    banner(`+${v} GOLD`, tt("Kasse geleert – jetzt raus hier!", "Register emptied – now get out!"), "#ffd24a");
    const seen = crime(2, INT.x, INT.z, cashier());
    if (rnd() < 0.4) { S.stars = Math.max(S.stars, 2); S.searchT = 0; S.lastSeen = { ...io.out }; toast(tt("Stiller Alarm – die Polizei ist unterwegs!", "Silent alarm – the police are on their way!"), "#ff5c7a"); }
    else if (!seen) toast(tt("Niemand hat dich gesehen.", "Nobody saw you."), "#7dffa0");
    saveGame();
  }
  function updateRobbery(dt: number) {
    for (const sh of shops) sh.cool = Math.max(0, sh.cool - dt);
    for (const y of yachts) y.cool = Math.max(0, y.cool - dt);
    const io = S.inside;
    if (!io) { S.rob = null; return; }
    const c = cashier();
    if (!c || c.mode === "dead" || c.mode === "fight") { S.rob = null; return; }
    const d = dist(player.x, player.z, c.x, c.z);
    let da = Math.atan2(c.x - player.x, c.z - player.z) - S.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    const aiming = S.armed && S.hp > 0 && d < 8.5 && Math.abs(da) < 0.32 && io.shop.cool <= 0 && S.reloadT <= 0;
    if (aiming) {
      if (!S.rob) {
        S.rob = { shop: io.shop, t: 0 };
        sound.tone(980, 0.25, 0.06, "sawtooth", 500);
        if (c.tough === 2) { S.rob = null; startFight(c); toast(tt("Der Kassierer zieht eine Waffe!", "The cashier pulls a gun!"), "#ff5c7a"); crime(2, c.x, c.z, c); return; }
        toast(tt("„Okay, okay! Nicht schießen!“ – Waffe auf ihn halten …", "“Okay, okay! Don't shoot!” – keep your weapon on him …"), "#ffd24a");
        crime(1, c.x, c.z, c);
      }
      S.rob.t += dt;
      if (S.rob.t >= 4) lootRegister(1);
    } else if (S.rob) { S.rob.t = Math.max(0, S.rob.t - dt * 0.7); if (S.rob.t <= 0) S.rob = null; }
  }

  // ── yachts: board from a jet ski, rob the guests ─────────────────
  function boardYacht(y: Yacht) {
    const c = player.car; if (!c || !c.boat) return;
    c.vx = c.vz = 0; c.kind = "parked"; c.driver = false; c.inp.th = 0; c.inp.st = 0; c.inp.hb = true;
    const st = yToWorld(y, 0, y.stern.z - 2.8); c.x = st.x; c.z = st.z; c.a = y.a + Math.PI;
    S.deckBoat = c; player.car = null; P.obj.visible = true; S.deck = y;
    const on = yToWorld(y, 0, y.walk.z0 + 1.0); player.x = on.x; player.z = on.z; player.y = y.deckY; player.vy = 0; player.a = y.a; S.yaw = y.a;
    camPos.set(player.x - Math.sin(S.yaw) * 4, player.y + 2.2, player.z - Math.cos(S.yaw) * 4);
    toast(tt(`An Bord der „${y.name}“.`, `Aboard the “${y.name}”.`), "#7de8ff");
  }
  function leaveYacht() {
    const y = S.deck; if (!y) return;
    S.deck = null; player.y = 0;
    const c = S.deckBoat; S.deckBoat = null;
    if (c && !c.dead) { enterCar(c); return; }
    const sh = world.shore(player.z); player.x = sh.e - 2; world.pushCircle(player, CFG.pr);
  }
  function spawnCrew(y: Yacht) {
    for (let i = 0; i < y.spots.length - (rnd() < 0.5 ? 1 : 0); i++) {
      const w = yToWorld(y, y.spots[i].x, y.spots[i].z);
      const p = spawnFixedPed(w.x, w.z, rnd() * 6, y.deckY);
      // everybody on a yacht is rich – and armed
      p.room = "yacht"; p.yacht = y; p.wealth = 400 + Math.floor(rnd() * 1100); p.tough = 2; p.guard = true; p.hp = 80;
      if (y.cool > 0) p.robbed = true;
      y.crew.push(p);
    }
  }

  /** Yacht hulls are solid for boats and swimmers. Returns the yacht that was hit. */
  function pushOutOfYachts(o: { x: number; z: number }, br: number) {
    let hit: Yacht | null = null;
    for (const y of yachts) {
      if (Math.abs(y.x - o.x) > 40 || Math.abs(y.z - o.z) > 40) continue;
      const l = yToLocal(y, o.x, o.z), hx = 4.6 * y.sc + br, z0 = -21.3 * y.sc - br, z1 = 24 * y.sc + br;
      if (Math.abs(l.x) < hx && l.z > z0 && l.z < z1) {
        const opts: [number, number, number][] = [[hx - l.x, 1, 0], [l.x + hx, -1, 0], [z1 - l.z, 0, 1], [l.z - z0, 0, -1]];
        opts.sort((a, b) => a[0] - b[0]);
        l.x += opts[0][1] * opts[0][0]; l.z += opts[0][2] * opts[0][0];
        const w = yToWorld(y, l.x, l.z); o.x = w.x; o.z = w.z; hit = y;
      }
    }
    return hit;
  }
  /** Is this point inside a yacht's hull or cabin? (keeps the camera out) */
  function yachtSolid(x: number, y: number, z: number) {
    for (const yt of yachts) {
      if (Math.abs(yt.x - x) > 30 || Math.abs(yt.z - z) > 30) continue;
      const l = yToLocal(yt, x, z), s2 = yt.sc;
      if (Math.abs(l.x) < 4.7 * s2 && l.z > -21.4 * s2 && l.z < 24 * s2 && y < yt.deckY + 0.2) return true;
      if (Math.abs(l.x) < 3.2 * s2 && l.z > -14.3 * s2 && l.z < 8.3 * s2 && y < yt.deckY + 5.1 * s2) return true;
    }
    return false;
  }
  /** Yacht whose hull is right next to the swimmer. */
  function yachtAlongside() {
    for (const y of yachts) {
      if (Math.abs(y.x - player.x) > 40 || Math.abs(y.z - player.z) > 40) continue;
      const l = yToLocal(y, player.x, player.z);
      if (Math.abs(l.x) < 4.6 * y.sc + 2 && l.z > -21.3 * y.sc - 2 && l.z < 24 * y.sc + 2) return y;
    }
    return null;
  }
  function splash(x: number, z: number, n: number) {
    for (let i = 0; i < n; i++) {
      smoke(x + (rnd() - 0.5) * 1.2, -0.3, z + (rnd() - 0.5) * 1.2, false, true);
      const f = fx[fx.length - 1]; if (f) { f.life = f.max = 0.6 + rnd() * 0.3; f.obj.scale.setScalar(0.18 + rnd() * 0.15); f.vy = 0.8 + rnd(); }
    }
  }
  function jumpOffBoat() {
    const c = player.car; if (!c || !c.boat) return;
    c.kind = "parked"; c.driver = false; c.inp.th = 0; c.inp.st = 0; c.inp.hb = true; c.vx *= 0.3; c.vz *= 0.3;
    player.car = null; P.obj.visible = true;
    player.x = c.x + Math.cos(c.a) * 1.9; player.z = c.z - Math.sin(c.a) * 1.9; player.y = 0.7; player.vy = 2.5; player.a = c.a;
    sound.burst(0.25, 400, 0.2); splash(player.x, player.z, 8);
  }
  function climbYacht(y: Yacht) {
    const l = yToLocal(y, player.x, player.z), w = y.walk;
    l.x = Math.max(w.x0 + 0.5, Math.min(w.x1 - 0.5, l.x)); l.z = Math.max(w.z0 + 0.5, Math.min(w.z1 - 0.5, l.z));
    S.deck = y; S.deckBoat = null; S.swim = false;
    const g = yToWorld(y, l.x, l.z); player.x = g.x; player.z = g.z; player.y = y.deckY; player.vy = 0;
    clampDeck(y, player, CFG.pr);
    sound.tone(420, 0.1, 0.05, "square");
    toast(tt(`Du kletterst auf die „${y.name}“ – alle an Bord sind bewaffnet!`, `You climb onto the “${y.name}” – everyone aboard is armed!`), "#ffb84d");
  }
  function jumpOffYacht() {
    const y = S.deck; if (!y) return;
    const l = yToLocal(y, player.x, player.z);
    if (l.z < y.walk.z0 + 3) l.z = -21.3 * y.sc - 1.6; else l.x = (Math.sign(l.x) || 1) * (4.6 * y.sc + 1.5);
    const g = yToWorld(y, l.x, l.z);
    S.deck = null; S.deckBoat = null; player.x = g.x; player.z = g.z; player.y = y.deckY + 0.3; player.vy = 3;
    sound.burst(0.25, 400, 0.2);
  }

  // ── water police ─────────────────────────────────────────────────
  function spawnBoatCop() {
    const pp = wpos();
    const sh0 = world.shore(pp.z), bay = pp.x < (sh0.e + sh0.w) / 2;
    for (let k = 0; k < 24; k++) {
      const ang = rnd() * Math.PI * 2, d = 130 + rnd() * 70, x = pp.x + Math.cos(ang) * d, z = pp.z + Math.sin(ang) * d, sh = world.shore(z);
      if (bay ? x > sh.w - 25 : x < sh.e + 25) continue;
      if (yachts.some((y) => dist(y.x, y.z, x, z) < 40)) continue;
      const c = addCar(rnd() < 0.5 ? makeCopJetski(x, z, Math.atan2(pp.x - x, pp.z - z)) : makeSpeedboat(x, z, Math.atan2(pp.x - x, pp.z - z)));
      c.path = [];
      return c;
    }
    return null;
  }
  function copShoot(c: Car, dt: number, d: number, sees: boolean) {
    const pp = ppos();
    c.fireT -= dt;
    if (!S.inside && sees && d < CFG.copFire && c.fireT <= 0 && S.hp > 0 && S.wasted <= 0) {
      c.fireT = 0.45 + rnd() * 0.6;
      const hit = rnd() < 0.5 - Math.min(0.25, Math.hypot(pp.vx || 0, pp.vz || 0) / 60) - (player.car ? 0.15 : 0) - d / 250;
      tmpV.set(c.x, c.boat ? 1.7 : 1.3, c.z); tmpV2.set(pp.x + (hit ? 0 : (rnd() - 0.5) * 3), player.y + 1.1, pp.z + (hit ? 0 : (rnd() - 0.5) * 3));
      addTracer(tmpV, tmpV2, "#ffe7b0");
      sound.shot(false, d);
      if (hit) { if (player.car) { player.car.hp -= 6; } else hurt(7 + S.stars * 1.5); }
    }
  }
  function aiBoatCop(c: Car, dt: number) {
    const pp = ppos(), d = dist(c.x, c.z, pp.x, pp.z);
    const onWater = !!player.car?.boat || !!S.deck;
    if (S.stars === 0 || S.inside) {
      // patrol between random points on the water
      if (c.path.length < 2 || dist(c.x, c.z, c.path[0], c.path[1]) < 18) {
        const z = wpos().z + (rnd() - 0.5) * 500, sh = world.shore(z), inOcean = c.x > (sh.e + sh.w) / 2;
        c.path = [inOcean ? sh.e + 40 + rnd() * 220 : sh.w - 40 - rnd() * 120, z];
      }
      c.lock = 0; driveTo(c, c.path[0], c.path[1], 9, dt, false); return;
    }
    const sees = d < 150 && (onWater || d < 60);
    if (sees) { c.lock = 3; S.seen = true; S.lastSeen = { x: pp.x, z: pp.z }; }
    c.lock = Math.max(0, c.lock - dt);
    if (d < 13) { const fs = c.vx * Math.sin(c.a) + c.vz * Math.cos(c.a); c.inp.th = fs > 1 ? -1 : 0; c.inp.st = 0; c.inp.hb = false; }
    else driveTo(c, pp.x, pp.z, d < 45 ? 16 : 31, dt, true);
    copShoot(c, dt, d, sees);
  }

  // ── jet ski rental, purchase, berth ──────────────────────────────
  function spawnJet(kind: "rent" | "jet") {
    for (const c of cars) if (c.owned === kind && c !== player.car) removeCar(c);
    let best = jetSpots[0], bd = 1e9;
    for (const j of jetSpots) { const d = dist(j.x, j.z, player.x, player.z); if (d < bd) { bd = d; best = j; } }
    if (!best) return null;
    const c = addCar(makeJetski(best.x, best.z, Math.PI / 2, kind === "jet" ? "#ffd21f" : undefined));
    c.owned = kind; c.vx = c.vz = 0;
    return c;
  }
  const berthLeft = () => Math.max(0, S.berthUntil - Date.now());
  const fmtLeft = (ms: number) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  function tickRental() {
    if (!S.rentUntil || S.t < S.rentUntil) return;
    const c = cars.find((x) => x.owned === "rent" && !x.dead);
    if (!c) { S.rentUntil = 0; return; }
    if (player.car === c) { if (!S.rentWarned) { S.rentWarned = true; toast(tt("Mietzeit vorbei – der Jetski wird beim Absteigen abgeholt.", "Rental time is up – the jet ski is collected when you get off."), "#ffb84d"); } return; }
    if (S.deckBoat === c) return;
    removeCar(c); S.rentUntil = 0; S.rentWarned = false;
  }

  function spawnPedAt(x: number, z: number, look?: Look) {
    const m = makePerson(look || randomLook()); scene.add(m.obj); m.act.Run?.play();
    const n = world.nearestNode(world.walks, x, z);
    const p: Ped = { obj: m.obj, mixer: m.mixer, act: m.act, cur: "Run", x, z, a: 0, mode: "flee", from: n, to: n, hp: 60, t: 8, deadT: 0, fallT: 0, witness: 0, wealth: walletOf(), tough: 0, atkT: 0, aggro: 0 };
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
  function smoke(x: number, y: number, z: number, fire: boolean, foam = false) {
    if (fx.length > 400) return;
    const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: fire ? new THREE.Color(4, 1.6, 0.4) : foam ? new THREE.Color("#f4fbff") : new THREE.Color("#3a3a3e"), transparent: true, opacity: fire ? 0.9 : foam ? 0.7 : 0.5, depthWrite: false, toneMapped: !fire }));
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
  function killPed(p: Ped, byPlayer = true) {
    if (p.mode === "dead" && !p.ko) return;
    p.mode = "dead"; p.deadT = 25; p.fallT = 0; p.ko = false;
    p.mixer.stopAllAction();
    if (p.gun) p.gun.visible = false;
    S.kills++;
    // the wallet falls out
    if (!p.robbed && p.wealth > 0) { p.robbed = true; dropCoin(p.x + 0.5, p.z, p.wealth, p.y || 0); }
    if (p.yacht && p.yacht.crew.every((q) => q.robbed || q.mode === "dead")) p.yacht.cool = 600;
    if (p.cop && byPlayer) { if (p.copCar) p.copCar.crew = Math.max(0, (p.copCar.crew ?? 1) - 1); S.stars = Math.max(S.stars, 3); S.searchT = 0; S.lastSeen = { x: p.x, z: p.z }; }
    if (byPlayer) crime(p.cop ? 3 : 2, p.x, p.z);
  }
  function hurt(d: number) {
    if (S.hp <= 0) return;
    const a = Math.min(S.armor, d * 0.7); S.armor -= a; S.hp -= d - a;
    S.shake = Math.max(S.shake, 0.25);
    if (S.hp <= 0) wasted();
  }
  function wasted() {
    S.hp = 0; S.wasted = 4;
    const loss = Math.min(S.gold, Math.round(S.gold * 0.1) + 10);
    S.gold -= loss; S.rob = null;
    if (S.mission) endMission(false, "");
    banner(tt("AUSGESCHALTET", "KNOCKED OUT"), tt(`Krankenhausrechnung: ${loss} Gold`, `Hospital bill: ${loss} gold`), "#ff3b5c");
  }
  function busted() {
    if (S.wasted > 0) return;
    S.wasted = 3; S.bustT = 0; S.rob = null;
    if (S.mission) endMission(false, "");
    const loss = Math.min(S.gold, Math.round(S.gold * 0.25) + 25);
    S.gold -= loss;
    banner(tt("VERHAFTET", "BUSTED"), tt(`Kaution und Strafe: ${loss} Gold`, `Bail and fine: ${loss} gold`), "#3b8bff");
    sound.tone(392, 0.4, 0.08, "square"); sound.tone(262, 0.6, 0.08, "square", 0, 0.35);
    saveGame();
  }
  function respawn() {
    S.hp = 100; S.armor = 0; S.stars = 0; S.searchT = 0;
    if (S.inside) { for (const p of peds) if (p.room === "shop") removePed(p); S.inside = null; shopRoom.group.visible = false; }
    S.deck = null; S.deckBoat = null; S.rob = null;
    for (const h of helis) if (!h.dead) h.leaving = true;
    for (const p of peds) if (p.cop) removePed(p); else if (p.mode === "fight") calmDown(p);
    if (player.car) { player.car.kind = "parked"; player.car.driver = false; player.car = null; }
    player.x = world.spawn.x; player.z = world.spawn.z; player.y = 0; P.obj.visible = true; player.vx = player.vz = 0;
    for (const c of cars) if (c.kind === "cop") removeCar(c);
    S.bustT = 0;
    // jump the camera instead of letting it fly across the city
    camPos.set(player.x - Math.sin(S.yaw) * 4.5, 2.2, player.z - Math.cos(S.yaw) * 4.5);
    saveGame();
  }

  function shoot() {
    const W = CFG.weapons[S.weapon];
    if (S.reloadT > 0 || S.fireT > 0) return;
    if (S.mag[S.weapon] <= 0) { if (S.reserve[S.weapon] > 0) reload(); else { sound.tone(900, 0.03, 0.03, "square"); S.fireT = 0.3; } return; }
    S.mag[S.weapon]--; S.fireT = W.rate;
    // aim ray from the camera
    camera.getWorldDirection(aimDir);
    if (touch) {
      let best = 0.22, tx = 0, ty = 0, tz = 0;
      const cp = camera.position;
      const cand: [number, number, number][] = [];
      for (const p of peds) if (p.mode !== "dead") cand.push([p.x, (p.y || 0) + 1.1, p.z]);
      for (const c of cars) if (!c.dead && c !== player.car && c.kind !== "wreck") cand.push([c.x, 0.8, c.z]);
      for (const h of helis) if (!h.dead) cand.push([h.x, h.y, h.z]);
      for (const [x, y, z] of cand) {
        const dx = x - cp.x, dy = y - cp.y, dz = z - cp.z, d = Math.hypot(dx, dy, dz);
        if (d > 70 || d < 1) continue;
        const ang = Math.acos(Math.max(-1, Math.min(1, (dx * aimDir.x + dy * aimDir.y + dz * aimDir.z) / d)));
        if (ang < best && los(ppos().x, ppos().z, x, z)) { best = ang; tx = dx / d; ty = dy / d; tz = dz / d; }
      }
      if (best < 0.22) aimDir.set(tx, ty, tz);
    }
    // precision: aiming (right click) is the most accurate, walking with the gun raised is good, firing from the hip while sprinting is poor
    const moving = Math.hypot(player.vx, player.vz);
    const spr = W.spread * (S.aim ? 0.4 : player.strafe ? 0.9 : 2.2) * (1 + Math.min(1, moving / 7) * 0.5);
    aimDir.x += (rnd() - 0.5) * spr; aimDir.y += (rnd() - 0.5) * spr * 0.6; aimDir.z += (rnd() - 0.5) * spr;
    aimDir.normalize();
    const o = camera.position.clone();
    let hitT = 200, hitPed: Ped | null = null, hitCar: Car | null = null;
    // buildings / ground (march)
    const floorY = S.deck ? S.deck.deckY : 0;
    for (let t = 0.5; t < 200; t += 0.6) {
      const x = o.x + aimDir.x * t, y = o.y + aimDir.y * t, z = o.z + aimDir.z * t;
      if (y < (S.deck && dist(x, z, S.deck.x, S.deck.z) < 20 ? floorY : -0.3) || (y < 60 && world.heightAt(x, z) > y)) { hitT = t; break; }
    }
    if (S.inside) {
      // walls of the store
      const hw = shopRoom.W / 2, hd = shopRoom.D / 2;
      const lim = (o0: number, d0: number, lo: number, hi: number) => (d0 > 1e-6 ? (hi - o0) / d0 : d0 < -1e-6 ? (lo - o0) / d0 : 1e9);
      hitT = Math.min(hitT, lim(o.x, aimDir.x, INT.x - hw, INT.x + hw), lim(o.y, aimDir.y, 0, shopRoom.H), lim(o.z, aimDir.z, INT.z - hd, INT.z + hd));
    }
    for (const p of peds) {
      if (p.mode === "dead") continue;
      // distance from ray to the vertical segment of the body
      const by = p.y || 0;
      const t = (p.x - o.x) * aimDir.x + (by + 1.0 - o.y) * aimDir.y + (p.z - o.z) * aimDir.z;
      if (t < 0 || t > hitT) continue;
      const px = o.x + aimDir.x * t, py = o.y + aimDir.y * t, pz = o.z + aimDir.z * t;
      if (py < by || py > by + 1.85) continue;
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
    let hitHeli: Heli | null = null;
    for (const h of helis) {
      if (h.dead || h.gone) continue;
      const ox = h.x - o.x, oy = h.y - o.y, oz = h.z - o.z, t = ox * aimDir.x + oy * aimDir.y + oz * aimDir.z;
      if (t < 0 || t > hitT) continue;
      if (ox * ox + oy * oy + oz * oz - t * t < 2.8 * 2.8) { hitT = t; hitHeli = h; hitPed = null; hitCar = null; }
    }
    if (hitHeli) {
      hitHeli.hp -= W.dmg;
      if (hitHeli.hp <= 0) { hitHeli.dead = true; hitHeli.vy = 0; banner(tt("HELIKOPTER ABGESCHOSSEN", "CHOPPER DOWN"), "", "#ff8a2a"); }
    }
    const end = o.clone().addScaledVector(aimDir, hitT);
    muzzle.getWorldPosition(tmpV);
    if (player.car) tmpV.set(player.car.x, 1.3, player.car.z);
    addTracer(tmpV, end);
    flash.intensity = 30; (flashSprite.material as THREE.MeshBasicMaterial).opacity = 1; flashSprite.rotation.z = rnd() * 3;
    sound.shot(S.weapon === 1);
    if (hitT < 200) sparks(end, hitPed ? 0 : 5);
    if (hitPed) {
      hitPed.hp -= W.dmg;
      if (hitPed.hp <= 0) killPed(hitPed);
      else if (hitPed.tough === 2 || hitPed.mode === "fight") startFight(hitPed);
      else if (!hitPed.cashier) { hitPed.mode = "flee"; hitPed.t = 8; }
    }
    if (hitCar) {
      hitCar.hp -= W.dmg * 0.7;
      if (hitCar.kind === "cop") crime(2, hitCar.x, hitCar.z);
      if (hitCar.kind === "civ" && hitCar.driver) hitCar.ai.panic = 6;
      if (hitCar.hp <= 0 && hitCar.kind !== "wreck") { explode(hitCar); if (hitCar.lightbar.length) crime(3, hitCar.x, hitCar.z); }
    }
    crime(1, ppos().x, ppos().z);
    // everybody nearby runs
    for (const p of peds) if (p.mode !== "dead" && p.mode !== "fight" && !p.cashier && dist(p.x, p.z, ppos().x, ppos().z) < 60) { p.mode = "flee"; p.t = p.room === "shop" ? 20 : 10; }
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
    const pp = wpos();
    if (S.stars === 0) { c.lock = 0; aiCiv(c, dt); return; }
    const d = dist(c.x, c.z, pp.x, pp.z);
    // stuck somewhere far away? take it off the map, a new unit spawns closer
    c.progT = (c.progT ?? 0) + dt;
    if (c.progT > 4) { const d0 = c.prog || 1e9; c.progT = 0; c.prog = d; if (d > 55 && d > d0 - 8) { removeCar(c); return; } }
    const sees = d < CFG.copRange && los(c.x, c.z, pp.x, pp.z);
    if (sees) { c.lock = 3; S.seen = true; S.lastSeen = { x: pp.x, z: pp.z }; }
    c.lock = Math.max(0, c.lock - dt);
    const tx = c.lock > 0 ? pp.x : S.lastSeen.x, tz = c.lock > 0 ? pp.z : S.lastSeen.z;
    const onFoot = !player.car && !S.inside;
    if (c.lock > 0 && d < 11 && onFoot) { c.inp.th = -1; c.inp.st = 0; c.inp.hb = false; }
    else if (d < 220 && los(c.x, c.z, tx, tz, 0.5)) driveTo(c, tx, tz, c.lock > 0 ? (onFoot && d < 40 ? 16 : 46) : 18, dt, true);
    else {
      c.pathT -= dt;
      if (c.pathT <= 0 || !c.path.length) { c.pathT = 1.2; c.path = bfs(world.roads, world.nearestNode(world.roads, c.x, c.z), world.nearestNode(world.roads, tx, tz)); }
      while (c.path.length > 1 && dist(c.x, c.z, world.roads.x[c.path[0]], world.roads.z[c.path[0]]) < 9) c.path.shift();
      const n = c.path.length ? graphNode(world.roads, c.path[0]) : { x: tx, z: tz };
      driveTo(c, n.x, n.z, 30, dt, true);
    }
    copShoot(c, dt, d, sees);
    // on foot: stop next to the player, driver and partner jump out and fight
    if (onFoot && c.lock > 0 && d < 32 && !(c.crew ?? 0) && Math.hypot(c.vx, c.vz) < 5 && S.wasted <= 0 && peds.filter((q) => q.cop && q.deadT >= 0 && q.mode !== "dead").length < 6) deployOfficers(c);
  }
  const COP_LOOK = { top: "#1d2c4d", bottom: "#1d2c4d", shoes: "#111111" };
  function deployOfficers(c: Car) {
    c.driver = false; c.inp.th = 0; c.inp.st = 0; c.inp.hb = true; c.crew = 0;
    for (const side of [1, -1]) {
      const x = c.x + Math.cos(c.a) * 1.3 * side, z = c.z - Math.sin(c.a) * 1.3 * side;
      const p = spawnPedAt(x, z, { ...COP_LOOK, skin: pick(SKIN) });
      p.cop = true; p.copCar = c; p.tough = 2; p.hp = 90; p.wealth = 20 + Math.floor(rnd() * 40);
      startFight(p); p.aggro = 1e9; p.atkT = 0.4 + rnd() * 0.5;
      c.crew++;
    }
    sound.tone(330, 0.12, 0.05, "square");
  }
  /** Officer walks back to the patrol car and gets in again. Returns true when he is gone. */
  function officerReturn(p: Ped, dt: number) {
    const c = p.copCar;
    if (!c || c.dead || c.kind === "wreck") { if (dist(p.x, p.z, wpos().x, wpos().z) > 40) { removePed(p); return true; } return false; }
    const d = dist(p.x, p.z, c.x, c.z);
    p.a = Math.atan2(c.x - p.x, c.z - p.z); p.x += Math.sin(p.a) * 3.4 * dt; p.z += Math.cos(p.a) * 3.4 * dt;
    if (p.gun) p.gun.visible = false;
    if (d < 2.2) { removePed(p); c.crew = Math.max(0, (c.crew ?? 1) - 1); if (!c.crew) c.driver = true; return true; }
    return false;
  }

  // ── police helicopter ─────────────────────────────────────────
  function spawnHeli() {
    const pp = wpos(), ang = rnd() * Math.PI * 2;
    const m = makeHeli();
    const h: Heli = { ...m, x: pp.x + Math.cos(ang) * 280, y: 70, z: pp.z + Math.sin(ang) * 280, a: 0, vx: 0, vz: 0, vy: 0, hp: 260, fireT: 2, dead: false, leaving: false, ang, gone: false };
    scene.add(m.group, m.beam);
    helis.push(h);
    toast(tt("Polizei-Helikopter im Anflug!", "Police helicopter incoming!"), "#ff5c7a");
  }
  function heliSees(h: Heli, px: number, py: number, pz: number) {
    const n = 18;
    for (let i = 1; i < n; i++) { const t = i / n, x = h.x + (px - h.x) * t, y = h.y + (py - h.y) * t, z = h.z + (pz - h.z) * t; if (world.heightAt(x, z) > y) return false; }
    return true;
  }
  function updateHelis(dt: number) {
    const live = helis.filter((h) => !h.dead && !h.leaving).length;
    S.heliT -= dt;
    if (S.stars >= 5 && S.wasted <= 0 && !S.inside && live < (isTouch ? 1 : 2) && S.heliT <= 0) { spawnHeli(); S.heliT = 12; }
    const pp = wpos(), py = S.deck ? S.deck.deckY : Math.max(0, player.y);
    for (const h of helis) {
      if (h.gone) continue;
      if (h.dead) {
        h.vy -= 9.8 * dt; h.y += h.vy * dt; h.x += h.vx * dt; h.z += h.vz * dt; h.a += dt * 4;
        if (rnd() < 0.5) smoke(h.x, h.y, h.z, rnd() < 0.5);
        if (h.y <= Math.max(world.heightAt(h.x, h.z), -0.3) + 0.8) {
          h.gone = true; scene.remove(h.group, h.beam);
          for (let i = 0; i < 26; i++) smoke(h.x + (rnd() - 0.5) * 5, h.y + rnd() * 2, h.z + (rnd() - 0.5) * 5, i % 2 === 0);
          sound.boom(); if (dist(h.x, h.z, ppos().x, ppos().z) < 9) hurt(70);
        }
      } else {
        if (S.stars < 5 || S.wasted > 0 || S.inside) h.leaving = true;
        let tx: number, tz: number, ty: number;
        if (h.leaving) { const d = dist(h.x, h.z, pp.x, pp.z) || 1; tx = h.x + ((h.x - pp.x) / d) * 200; tz = h.z + ((h.z - pp.z) / d) * 200; ty = 110; if (d > 650) { h.gone = true; scene.remove(h.group, h.beam); continue; } }
        else {
          h.ang += dt * 0.22;
          tx = pp.x + Math.cos(h.ang) * 40; tz = pp.z + Math.sin(h.ang) * 40;
          let ground = 0; for (const [ox, oz] of [[0, 0], [15, 0], [-15, 0], [0, 15], [0, -15]]) ground = Math.max(ground, world.heightAt(tx + ox, tz + oz));
          ty = Math.max(30, ground + 16);
        }
        const dx = tx - h.x, dz = tz - h.z, dl = Math.hypot(dx, dz) || 1, vmax = h.leaving ? 35 : Math.min(38, dl * 0.8);
        h.vx += ((dx / dl) * vmax - h.vx) * Math.min(1, 1.2 * dt); h.vz += ((dz / dl) * vmax - h.vz) * Math.min(1, 1.2 * dt);
        h.x += h.vx * dt; h.z += h.vz * dt; h.y += (ty - h.y) * Math.min(1, 0.7 * dt);
        // nose towards the player while hunting
        const want = h.leaving ? Math.atan2(h.vx, h.vz) : Math.atan2(pp.x - h.x, pp.z - h.z);
        let da = want - h.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; h.a += da * Math.min(1, 1.5 * dt);
        // sniper in the open door
        h.fireT -= dt;
        const d3 = Math.hypot(pp.x - h.x, py - h.y, pp.z - h.z);
        if (!h.leaving && h.fireT <= 0 && d3 < 120 && S.hp > 0 && heliSees(h, pp.x, py + 1, pp.z)) {
          h.fireT = 0.85 + rnd() * 0.6;
          const sp = Math.hypot(pp.vx || 0, pp.vz || 0), hit = rnd() < 0.5 - Math.min(0.3, sp / 50) - (player.car ? 0.12 : 0);
          tmpV.set(h.x, h.y - 1, h.z); tmpV2.set(pp.x + (hit ? 0 : (rnd() - 0.5) * 3), py + 1.1, pp.z + (hit ? 0 : (rnd() - 0.5) * 3));
          addTracer(tmpV, tmpV2, "#ffe7b0"); sound.shot(false, d3);
          if (hit) { if (player.car) player.car.hp -= 8; else hurt(9 + rnd() * 4); }
        }
      }
      // pose
      const fwd = h.vx * Math.sin(h.a) + h.vz * Math.cos(h.a), side = h.vx * Math.cos(h.a) - h.vz * Math.sin(h.a);
      h.group.position.set(h.x, h.y, h.z); h.group.rotation.set(Math.min(0.3, fwd / 120), h.a, -side / 140, "YXZ");
      h.rotor.rotation.y += dt * 32; h.tail.rotation.x += dt * 45;
      h.red.visible = Math.floor(S.t * 2.5) % 2 === 0;
      h.beam.visible = tod !== "day" && !h.dead && !h.leaving;
      if (h.beam.visible) {
        tmpV.set(pp.x - h.x, py - (h.y - 1.2), pp.z - h.z); const L = tmpV.length(); tmpV.normalize();
        h.beam.position.set(h.x, h.y - 1.2, h.z); h.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tmpV); h.beam.scale.set(1, L / 40, 1);
      }
    }
    for (let i = helis.length - 1; i >= 0; i--) if (helis[i].gone) helis.splice(i, 1);
  }

  // ── simulation ───────────────────────────────────────────────────────
  function update(dt: number) {
    S.t += dt;
    const active = S.started && !S.paused;
    if (S.wasted > 0) { S.wasted -= dt; if (S.wasted <= 0) respawn(); }
    const alive2 = active && S.hp > 0 && !S.menu && S.wasted <= 0;
    S.aim = alive2 && mouse.r && !player.car && S.armed;
    S.fireT = Math.max(0, S.fireT - dt);
    if (S.reloadT > 0) { S.reloadT -= dt; if (S.reloadT <= 0) { const W = CFG.weapons[S.weapon], need = W.mag - S.mag[S.weapon], take = Math.min(need, S.reserve[S.weapon]); S.mag[S.weapon] += take; S.reserve[S.weapon] -= take; } }
    const trig = mouse.l || pad.shoot;
    if (alive2 && trig && !S.armed && !player.car) punch();
    else if (alive2 && trig && S.armed && (CFG.weapons[S.weapon].auto || !S.firing)) shoot();
    S.punchT = Math.max(0, S.punchT - dt);
    updateRobbery(dt);
    if (active) { tickMission(dt); tickBusiness(dt); }
    S.firing = trig;

    // player on foot
    const pc = player.car;
    if (!pc) {
      let fwd = (alive2 && held("KeyW", "ArrowUp") ? 1 : 0) - (alive2 && held("KeyS", "ArrowDown") ? 1 : 0);
      let side = (alive2 && held("KeyD", "ArrowRight") ? 1 : 0) - (alive2 && held("KeyA", "ArrowLeft") ? 1 : 0);
      const jm = Math.hypot(pad.jx, pad.jy);
      if (alive2 && jm > 0.12) { fwd = -pad.jy; side = pad.jx; }
      const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), rx = -fz, rz = fx;
      let mx = fx * fwd + rx * side, mz = fz * fwd + rz * side;
      const l = Math.hypot(mx, mz);
      // with a weapon out you walk with the gun raised, facing where the camera looks (strafing);
      // sprinting (Shift / joystick fully out without a weapon) lowers it again
      const sprintKey = held("ShiftLeft", "ShiftRight") && !touch;
      const strafe = alive2 && S.armed && !(sprintKey && l > 0);
      player.strafe = strafe;
      const indoor = !!S.inside || !!S.deck;
      const shN = world.shore(player.z);
      S.swim = !indoor && (player.x > shN.e + 1.5 || player.x < shN.w - 1.5);
      const speed = S.swim ? (sprintKey ? 3.3 : 2.3) : (S.aim ? CFG.walk * 1.3 : jm > 0.12 ? (jm < 0.55 ? CFG.walk : jm > 0.97 ? CFG.run * (strafe ? 0.85 : 1.15) : CFG.run * (strafe ? 0.8 : 1)) : sprintKey ? CFG.sprint : held("KeyC", "ControlLeft") ? CFG.walk : strafe ? CFG.run * 0.8 : CFG.run) * (indoor ? 0.75 : 1);
      if (l > 0) { mx /= l; mz /= l; player.vx = mx * speed; player.vz = mz * speed; }
      else { player.vx = 0; player.vz = 0; }
      const faceA = strafe || S.aim || (trig && alive2) ? S.yaw : l > 0 ? Math.atan2(mx, mz) : player.a;
      let da = faceA - player.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      player.a += da * Math.min(1, (strafe ? 20 : CFG.turnFoot) * dt);
      if (alive2 && (keys.has("Space") || pad.jump) && player.grounded && !S.swim) { player.vy = CFG.jump; player.grounded = false; }
      const floorY = S.deck ? S.deck.deckY : S.swim ? -1.15 : 0;
      player.vy -= CFG.gravity * dt; player.y += player.vy * dt;
      if (player.y <= floorY) { if (S.swim && player.vy < -4) splash(player.x, player.z, 10); player.y = floorY; player.vy = 0; player.grounded = true; }
      if (S.swim && l > 0 && rnd() < 0.12) splash(player.x - Math.sin(player.a) * 0.4, player.z - Math.cos(player.a) * 0.4, 1);
      player.x += player.vx * dt; player.z += player.vz * dt;
      if (S.inside) clampRoom(player, CFG.pr);
      else if (S.deck) clampDeck(S.deck, player, CFG.pr);
      else { world.pushCircle(player, CFG.pr, false); pushOutOfYachts(player, 0.6); }
      if (!indoor) for (const c of cars) {
        if (c.dead || Math.abs(c.x - player.x) > 4 || Math.abs(c.z - player.z) > 4) continue;
        for (const s of [-1, 1]) {
          const cx = c.x + Math.sin(c.a) * (c.len / 2 - 1) * s, cz = c.z + Math.cos(c.a) * (c.len / 2 - 1) * s, d = dist(cx, cz, player.x, player.z), min = 1.05 + CFG.pr;
          if (d < min && d > 1e-4) {
            player.x += ((player.x - cx) / d) * (min - d); player.z += ((player.z - cz) / d) * (min - d);
            const sp = Math.hypot(c.vx, c.vz); if (sp > 8 && c !== pc) { hurt(sp * 1.5); S.shake = 0.5; }
          }
        }
      }
      const anim = !l ? "Idle" : speed <= CFG.walk * 1.35 ? "Walk" : "Run";
      if (anim !== player.anim) { const prev = P.act[player.anim], next = P.act[anim]; next.reset().play(); prev?.crossFadeTo(next, 0.2, false); player.anim = anim; }
      // walking backwards with the gun raised plays the cycle in reverse
      const back = strafe && l > 0 && mx * Math.sin(player.a) + mz * Math.cos(player.a) < -0.35;
      if (P.act.Run) P.act.Run.timeScale = (back ? -0.85 : 1) * (speed > CFG.run ? 1.3 : 1);
      if (P.act.Walk) P.act.Walk.timeScale = (back ? -1 : 1) * (S.swim ? 0.7 : 1);
    } else {
      const c = pc;
      c.inp.th = alive2 ? (held("KeyW", "ArrowUp") ? 1 : 0) - (held("KeyS", "ArrowDown") ? 1 : 0) : 0;
      c.inp.st = alive2 ? (held("KeyA", "ArrowLeft") ? 1 : 0) - (held("KeyD", "ArrowRight") ? 1 : 0) : 0;
      if (alive2 && Math.hypot(pad.jx, pad.jy) > 0.12) { c.inp.th = Math.max(-1, Math.min(1, -pad.jy * 1.25)); c.inp.st = Math.max(-1, Math.min(1, -pad.jx * 1.2)); }
      c.inp.hb = alive2 && (keys.has("Space") || pad.jump);
      player.x = c.x; player.z = c.z;
      if (c.hp <= 0 && c.kind !== "wreck") { explode(c); player.car = null; P.obj.visible = true; player.x = c.x + 2; hurt(100); }
    }

    // cars
    for (const c of cars) {
      if (c.dead) continue;
      if (c !== pc) {
        if (c.kind === "civ" && c.driver) aiCiv(c, dt);
        else if (c.kind === "cop" && c.driver) { if (c.boat) aiBoatCop(c, dt); else aiCop(c, dt); }
        else { c.inp.th = 0; c.inp.st = 0; c.inp.hb = true; }
      }
      stepCar(c, dt, c === pc && held("ShiftLeft") ? 1.25 : 1);
      if (c.boat) {
        // stay on the water: east of the ocean shore or west of the bay shore
        const sh = world.shore(c.z), inOcean = c.x > (sh.e + sh.w) / 2;
        if (inOcean && c.x < sh.e + 2) { c.x = sh.e + 2; if (c.vx < 0) c.vx *= -0.3; }
        if (!inOcean && c.x > sh.w - 2) { c.x = sh.w - 2; if (c.vx > 0) c.vx *= -0.3; }
        // yachts are solid
        if (pushOutOfYachts(c, c.len * 0.4)) {
          const sp = Math.hypot(c.vx, c.vz); if (c === pc && sp > 8) { sound.crash(sp); S.shake = Math.max(S.shake, sp / 40); c.hp -= sp; }
          c.vx *= -0.2; c.vz *= -0.2;
        }
        for (const o of cars) {
          if (o === c || !o.boat || o.dead || Math.abs(o.x - c.x) > 8 || Math.abs(o.z - c.z) > 8) continue;
          const dx = c.x - o.x, dz = c.z - o.z, d = Math.hypot(dx, dz) || 1e-3, min = (c.len + o.len) * 0.32;
          if (d < min) { const k = (min - d) / 2; c.x += (dx / d) * k; c.z += (dz / d) * k; o.x -= (dx / d) * k; o.z -= (dz / d) * k; }
        }
        if (c === pc && Math.hypot(c.vx, c.vz) > 6 && rnd() < 0.6) smoke(c.x - Math.sin(c.a) * 1.6 + (rnd() - 0.5) * 0.6, -0.1, c.z - Math.cos(c.a) * 1.6 + (rnd() - 0.5) * 0.6, false, true);
        continue;
      }
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
      const a = cars[i]; if (a.dead || a.boat) continue;
      for (let j = i + 1; j < cars.length; j++) {
        const b = cars[j]; if (b.dead || b.boat || Math.abs(a.x - b.x) > 7 || Math.abs(a.z - b.z) > 7) continue;
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
        p.obj.rotation.x = -p.fallT * Math.PI / 2; p.obj.position.y = (p.y || 0) + p.fallT * 0.15;
        p.deadT -= dt;
        if (p.deadT <= 0) {
          if (p.ko) { p.ko = false; p.mode = "flee"; p.t = 8; p.hp = 40; p.obj.rotation.x = 0; p.obj.position.y = p.y || 0; p.act.Run?.reset().play(); p.cur = "Run"; if (p.cop || p.tough === 2) startFight(p); }
          else if (p.fix) { p.deadT = 60; }
          else removePed(p);
        }
        continue;
      }
      const g = world.walks;
      let speed = 1.35;
      if (p.mode === "fight") speed = fightStep(p, dt);
      else if (p.mode === "flee") {
        speed = p.room ? 3.4 : 4.6; p.t -= dt;
        if (p.cashier) { speed = 0; p.t = Math.min(p.t, 6); if (p.t <= 0) p.mode = "idle"; }
        else if (p.room === "shop") {
          // customers run out of the door
          const tx = INT.x + (p.z > INT.z + 1.8 ? 0 : p.x > INT.x ? 0.4 : -0.4), tz = INT.z + shopRoom.D / 2 + 1;
          p.a = Math.atan2(tx - p.x, tz - p.z);
          p.x += Math.sin(p.a) * speed * dt; p.z += Math.cos(p.a) * speed * dt;
          if (p.t <= 0 || (p.z > INT.z + shopRoom.D / 2 - 0.95 && Math.abs(p.x - INT.x) < 1.3)) { removePed(p); continue; }
        } else {
          if (p.t <= 0) p.mode = p.fix ? "idle" : "walk";
          const pp = ppos(), dx = p.x - pp.x, dz = p.z - pp.z, l = Math.hypot(dx, dz) || 1;
          p.a = Math.atan2(dx / l, dz / l);
          p.x += Math.sin(p.a) * speed * dt; p.z += Math.cos(p.a) * speed * dt;
        }
      } else if (p.mode === "idle" && p.yacht && S.deck === p.yacht && S.armed && dist(p.x, p.z, player.x, player.z) < 16) {
        // an armed stranger on deck: the crew draws
        startFight(p); speed = 0;
      } else if (p.mode === "idle" && p.fix) {
        // stand at the post; walk back when pushed away
        const f = p.fix, dd = dist(p.x, p.z, f.x, f.z);
        if (dd > 0.4) { speed = 1.3; p.a = Math.atan2(f.x - p.x, f.z - p.z); p.x += Math.sin(p.a) * speed * dt; p.z += Math.cos(p.a) * speed * dt; }
        else {
          speed = 0;
          let want = f.a;
          if (p.cashier && dist(p.x, p.z, player.x, player.z) < 9 && S.inside) want = Math.atan2(player.x - p.x, player.z - p.z);
          let da = want - p.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; p.a += da * Math.min(1, 3 * dt);
        }
      } else {
        if (p.fix) p.mode = "idle";
        const B = graphNode(g, p.to);
        if (dist(p.x, p.z, B.x, B.z) < 1.2) { const opts = g.adj[p.to].filter((i) => i !== p.from); p.from = p.to; p.to = opts.length ? pick(opts) : p.from; if (p.to === p.from && g.adj[p.from].length) p.to = g.adj[p.from][0]; }
        const T = graphNode(g, p.to);
        const want = Math.atan2(T.x - p.x, T.z - p.z);
        let da = want - p.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        p.a += da * Math.min(1, 6 * dt);
        p.x += Math.sin(p.a) * speed * dt; p.z += Math.cos(p.a) * speed * dt;
      }
      clampPed(p);
      const want = speed > 2 ? "Run" : speed > 0.05 ? "Walk" : "Idle";
      if (want !== p.cur && p.act[want]) { p.act[want].reset().play(); p.act[p.cur]?.crossFadeTo(p.act[want], 0.25, false); p.cur = want; }
      if (p.room) continue;
      // hit by a car
      for (const c of cars) {
        if (c.dead || Math.abs(c.x - p.x) > 4 || Math.abs(c.z - p.z) > 4) continue;
        const sp = Math.hypot(c.vx, c.vz);
        const dx = p.x - c.x, dz = p.z - c.z, f = dx * Math.sin(c.a) + dz * Math.cos(c.a), s = dx * Math.cos(c.a) - dz * Math.sin(c.a);
        if (Math.abs(f) < c.len / 2 + 0.3 && Math.abs(s) < 1.25) {
          if (sp > 7) { p.hp = 0; killPed(p, c === pc); }
          else { const l = Math.hypot(dx, dz) || 1; p.x += (dx / l) * 0.3; p.z += (dz / l) * 0.3; }
        }
      }
    }

    // arrest: standing still next to a police car while wanted
    if (S.stars > 0 && S.hp > 0 && S.wasted <= 0) {
      const pp2 = ppos(), sp2 = Math.hypot(pp2.vx || 0, pp2.vz || 0);
      let near = false;
      for (const c of cars) if (!c.dead && c.kind === "cop" && c.driver && dist(c.x, c.z, pp2.x, pp2.z) < (player.car ? 7 : 6)) { near = true; break; }
      if (!player.car) for (const p of peds) if (p.cop && p.mode === "fight" && dist(p.x, p.z, pp2.x, pp2.z) < 2.6) { near = true; break; }
      if (near && sp2 < 2.2) { S.bustT += dt; if (S.bustT >= 2.5) busted(); }
      else S.bustT = Math.max(0, S.bustT - dt * 1.5);
    } else S.bustT = 0;
    // wanted level
    S.seen = false;
    if (S.stars > 0) {
      for (const c of cars) if (c.kind === "cop" && c.driver && !c.dead && c.lock > 0) S.seen = true;
      const wp = wpos();
      for (const p of peds) if (p.cop && p.mode === "fight" && dist(p.x, p.z, wp.x, wp.z) < CFG.copRange && !S.inside && los(p.x, p.z, wp.x, wp.z)) { S.seen = true; S.lastSeen = { x: wp.x, z: wp.z }; break; }
      for (const h of helis) if (!h.dead && !h.leaving && dist(h.x, h.z, wp.x, wp.z) < 140 && !S.inside) { S.seen = true; S.lastSeen = { x: wp.x, z: wp.z }; }
      if (!S.seen) { S.searchT += dt; if (S.searchT >= CFG.searchTime[S.stars]) { S.stars = 0; S.searchT = 0; banner(tt("ENTKOMMEN", "LOST THEM"), tt("Die Polizei hat deine Spur verloren.", "The police lost your trail."), "#3be3ff"); } }
      else S.searchT = 0;
    }
    // population (around the store's door while inside)
    const pp = wpos();
    const onWater = !!player.car?.boat || !!S.deck;
    let civN = 0, copN = 0, pedN = 0, boatN = 0, beachN = 0;
    for (const c of cars) {
      if (c.dead) continue;
      const d = dist(c.x, c.z, pp.x, pp.z);
      if (c.kind === "civ") { civN++; if (d > 260) removeCar(c); }
      else if (c.kind === "cop" && c.boat) { boatN++; if (d > 420 || (S.stars === 0 && !onWater && d > 200)) removeCar(c); }
      else if (c.kind === "cop") { copN++; if (d > 300 || (S.stars === 0 && d > 160 && copN > 2)) removeCar(c); }
      else if ((c.kind === "parked" || c.kind === "wreck") && c !== mine && !c.owned && !c.boat && d > 320) removeCar(c);
    }
    for (const p of peds) {
      if (p.deadT < 0 || p.room) continue;
      if (p.beach) beachN++; else pedN++;
      if (dist(p.x, p.z, pp.x, pp.z) > 170 && p.mode !== "dead") removePed(p);
    }
    // crews on the yachts appear when you come close
    for (const y of yachts) {
      const d = dist(y.x, y.z, pp.x, pp.z);
      if (d < 240 && !y.crew.length) spawnCrew(y);
      else if (d > 340 && y.crew.length && S.deck !== y) { for (const p of y.crew) removePed(p); y.crew = []; }
    }
    // water police: one patrol near the beach, more when you are wanted on the water
    const nearSea = !S.inside && (onWater || pp.x > world.shore(pp.z).e - 140);
    const boatWant = !nearSea ? 0 : onWater && S.stars ? Math.min(4, 1 + S.stars) : 1;
    S.boatSpawnT -= dt;
    if (boatN < boatWant && S.boatSpawnT <= 0) { spawnBoatCop(); S.boatSpawnT = S.stars ? 3.5 : 15; }
    // people standing on the sand
    if (!S.inside && !S.deck && pp.x > beach.shoreAt(pp.z) - 130 && beachN < 6 && S.pedSpawnT <= 0) {
      const sp = beach.standSpot(pp.z + (rnd() < 0.5 ? -1 : 1) * (45 + rnd() * 70));
      if (sp && dist(sp.x, sp.z, pp.x, pp.z) > 35) { const b = spawnFixedPed(sp.x, sp.z, Math.PI / 2 + (rnd() - 0.5) * 1.2); b.beach = true; S.pedSpawnT = 0.35; }
    }
    S.civSpawnT -= dt; S.pedSpawnT -= dt;
    if (civN < CFG.civCars && S.civSpawnT <= 0) { spawnCiv(S.started ? 110 : 30, 230); S.civSpawnT = 0.25; }
    const copWant = S.stars ? CFG.copsPerStar[S.stars] : 2;
    S.spawnT -= dt;
    if (copN < copWant && S.spawnT <= 0) { if (spawnCiv(S.stars ? 80 : 150, S.stars ? 170 : 240, "cop")) S.spawnT = S.stars ? 1.5 : 10; }
    if (pedN < CFG.peds && S.pedSpawnT <= 0) { spawnPed(S.started ? 60 : 10, 140); S.pedSpawnT = 0.35; }
    for (let i = cars.length - 1; i >= 0; i--) if (cars[i].dead) cars.splice(i, 1);
    for (let i = peds.length - 1; i >= 0; i--) if (peds[i].deadT < 0) peds.splice(i, 1);
    for (const y of yachts) if (y.crew.some((p) => p.deadT < 0)) y.crew = y.crew.filter((p) => p.deadT >= 0);
    tickRental();
    updateHelis(dt);

    // pickups
    const pk = ppos();
    for (const k of pickups) {
      if (k.t > 0) { k.t -= dt; if (k.t <= 0) k.mesh.visible = true; continue; }
      if (dist(k.x, k.z, pk.x, pk.z) < 1.6 && Math.abs((k.y || 0) - (player.car ? 0 : Math.max(0, player.y))) < 1.6) {
        k.t = 60; k.mesh.visible = false;
        if (k.kind === "cash" || k.kind === "drop") { const v = k.v ?? 15 + Math.floor(rnd() * 30); S.gold += v; sound.cash(); toast(`+${v} Gold`, "#ffd24a"); saveGame(); if (k.kind === "drop") { k.t = 1e9; scene.remove(k.mesh); } }
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
    if (pc && pc.boat) {
      P.obj.visible = true;
      P.obj.position.set(pc.x - Math.sin(pc.a) * 0.35, pc.mesh.position.y + 0.42, pc.z - Math.cos(pc.a) * 0.35);
      P.obj.rotation.y = pc.a + Math.PI;
      if (player.anim !== "Idle") { P.act.Idle.reset().play(); P.act[player.anim]?.crossFadeTo(P.act.Idle, 0.2, false); player.anim = "Idle"; }
    } else {
      P.obj.position.set(player.x, player.y, player.z);
      P.obj.rotation.y = player.a + Math.PI;
    }
    P.mixer.update(dt);
    gun.visible = !pc && S.armed;
    // camera
    S.mouseIdle += dt;
    if (pc && S.mouseIdle > 1.5) { let da = pc.a - S.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; S.yaw += da * Math.min(1, 2.2 * dt); S.pitch += (0.22 - S.pitch) * Math.min(1, 2 * dt); }
    const wantDist = pc ? (pc.boat && pc.len > 5 ? 10 : 7.5) + Math.min(4, Math.hypot(pc.vx, pc.vz) / 10) : S.inside ? (S.aim ? 1.6 : 2.5) : S.aim ? 2.0 : player.strafe ? 3.4 : 4.4;
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
      if (world.heightAt(x, z) > y - 0.3 || yachtSolid(x, y, z)) { const t2 = Math.max(S.swim || S.deck ? 0.03 : 0.15, (i - 1) / steps); want = new THREE.Vector3(target.x + (want.x - target.x) * t2, target.y + (want.y - target.y) * t2, target.z + (want.z - target.z) * t2); break; }
    }
    want.y = Math.max(S.deck ? S.deck.deckY + 0.5 : S.swim ? 0.9 : 0.4, want.y);
    const inRoom = (v: THREE.Vector3) => {
      if (!S.inside) return;
      const m = 0.25, hw = shopRoom.W / 2 - m, hd = shopRoom.D / 2 - m;
      v.x = Math.max(INT.x - hw, Math.min(INT.x + hw, v.x)); v.z = Math.max(INT.z - hd, Math.min(INT.z + hd, v.z)); v.y = Math.max(0.5, Math.min(shopRoom.H - 0.25, v.y));
    };
    inRoom(want);
    camPos.lerp(want, Math.min(1, (pc ? 10 : 18) * dt));
    inRoom(camPos);
    camera.position.copy(camPos);
    if (S.shake > 0) { camera.position.x += (rnd() - 0.5) * S.shake * 0.4; camera.position.y += (rnd() - 0.5) * S.shake * 0.4; S.shake = Math.max(0, S.shake - dt * 2); }
    const look = new THREE.Vector3(target.x + rx * shoulder + fx * cp * 30, target.y - sp * 30 + 0.6, target.z + rz * shoulder + fz * cp * 30);
    camera.lookAt(look);
    camera.fov += ((S.aim ? 48 : pc ? 66 + Math.min(10, Math.hypot(pc.vx, pc.vz) / 4) : 62) - camera.fov) * Math.min(1, 6 * dt);
    camera.updateProjectionMatrix();
    // aim pose: right arm points where the camera looks
    if (!pc && S.punchT > 0) {
      const f = new THREE.Vector3(Math.sin(player.a), 0.15, Math.cos(player.a));
      pointBone(bones.RightArm, bones.RightForeArm, f); pointBone(bones.RightForeArm, bones.RightHand, f);
    } else if (!pc && S.armed && (player.strafe || S.aim || S.fireT > 0 || mouse.l || pad.shoot) && S.hp > 0) {
      camera.getWorldDirection(aimDir);
      pointBone(bones.RightArm, bones.RightForeArm, aimDir);
      pointBone(bones.RightForeArm, bones.RightHand, aimDir);
    }
    if (S.mission && S.mission.steps[S.mission.i].kind !== "lose" && S.mission.steps[S.mission.i].kind !== "van") { const tg = S.mission.steps[S.mission.i].at(); beacon.visible = true; beacon.position.set(tg.x, 30, tg.z); }
    else if (S.mission && S.mission.van && S.mission.steps[S.mission.i].kind === "van") { beacon.visible = true; beacon.position.set(S.mission.van.x, 30, S.mission.van.z); }
    else beacon.visible = false;
    if (beacon.visible && dist(beacon.position.x, beacon.position.z, camera.position.x, camera.position.z) < 9) beacon.visible = false;
    flash.intensity *= 0.6; (flashSprite.material as THREE.MeshBasicMaterial).opacity *= 0.5;
    // sun & shadows follow the player
    sun.position.set(player.x + sunDir.x * 300, Math.max(30, sunDir.y * 300), player.z + sunDir.z * 300);
    sun.target.position.set(player.x, 0, player.z);
    water.position.x = Math.round(player.x / 100) * 100; water.position.z = Math.round(player.z / 100) * 100;
    (water.material as THREE.ShaderMaterial).uniforms.time.value += dt * 0.6;
    for (const c of cars) if (!c.dead) {
      syncCar(c, S.t);
      if (c.boat) { const sp = Math.hypot(c.vx, c.vz); c.mesh.position.y = -0.32 + Math.sin(S.t * 2.6 + c.id) * 0.06; c.mesh.rotation.x = -Math.min(0.18, sp / 150) + Math.sin(S.t * 2.1 + c.id) * 0.03; c.mesh.rotation.z = -c.inp.st * Math.min(1, sp / 15) * 0.25; }
    }
    for (const p of peds) {
      if (p.deadT < 0) continue;
      p.obj.position.x = p.x; p.obj.position.z = p.z; p.obj.rotation.y = p.a + Math.PI;
      if (p.mode === "dead") continue;
      p.obj.position.y = p.y || 0;
      const near = dist(p.x, p.z, player.x, player.z);
      if (near < 120) p.mixer.update(dt);
      if (near > 60) continue;
      // poses: aiming a gun, throwing a punch, hands up during a hold-up
      if (p.mode === "fight") {
        const b = pedBones(p);
        if (p.tough === 2 || p.t > 0) {
          tmpV.set(player.x - p.x, player.y + 1.2 - ((p.y || 0) + 1.4), player.z - p.z).normalize();
          if (p.tough !== 2) tmpV.set(Math.sin(p.a), 0.1, Math.cos(p.a));
          pointBone(b.arm, b.fore, tmpV); pointBone(b.fore, b.hand, tmpV);
        }
      } else if (p.cashier && S.rob) {
        const b = pedBones(p);
        tmpV.set(Math.sin(p.a) * 0.25, 1, Math.cos(p.a) * 0.25).normalize();
        pointBone(b.arm, b.fore, tmpV); pointBone(b.fore, b.hand, tmpV); pointBone(b.larm, b.lfore, tmpV); pointBone(b.lfore, b.lhand, tmpV);
      }
    }
    beach.update(S.t, wpos().x, wpos().z);
    for (const k of pickups) if (k.mesh.visible) { k.mesh.rotation.y += dt * 1.6; k.mesh.position.y = (k.y || 0) + 0.8 + Math.sin(S.t * 3 + k.x) * 0.12; }
    let siren = 0;
    if (S.stars > 0) for (const c of cars) if (c.kind === "cop" && !c.dead) siren = Math.max(siren, Math.max(0, 1 - dist(c.x, c.z, ppos().x, ppos().z) / 160));
    sound.update(pc ? Math.hypot(pc.vx, pc.vz) : 0, pc ? Math.max(0, pc.inp.th) : 0, pc ? pc.slip : 0, siren, !!pc && S.started && !S.paused);
  }

  // ── context buttons in the world (car door, people, stores) ─────────
  type Act = { key: string; label: string; x: number; y: number; z: number; run: () => void; enabled?: boolean; d: number };
  let acts: Act[] = [];
  const actRun = new Map<string, () => void>();
  const actEls = new Map<string, HTMLElement>();
  const actLayer = hud.querySelector(".sb-acts") as HTMLElement;
  const shopEl = hud.querySelector(".sb-shop") as HTMLElement;
  const projV = new THREE.Vector3();
  function computeActs() {
    acts = [];
    if (!S.started || S.paused || S.menu || S.hp <= 0) return;
    const fk = touch ? "" : "F · ";
    if (player.car) {
      const c = player.car;
      if (c.boat && Math.hypot(c.vx, c.vz) < 5) for (const y of yachts) {
        const st = yToWorld(y, 0, y.stern.z), dd = dist(st.x, st.z, c.x, c.z);
        if (dd < 9) acts.push({ key: "board" + y.name, label: fk + "⛵ " + tt(`An Bord der „${y.name}“`, `Board the “${y.name}”`), x: st.x, y: y.deckY + 1.2, z: st.z, run: () => boardYacht(y), d: -1 });
      }
      if (c.boat && Math.hypot(c.vx, c.vz) < 6) acts.push({ key: "dive", label: fk + "🌊 " + tt("Ins Meer springen", "Jump into the sea"), x: c.x, y: 2.0, z: c.z, run: jumpOffBoat, d: 0.2 });
      if (Math.hypot(c.vx, c.vz) < 4 && !acts.some((a) => a.key.startsWith("board"))) { const d = doorPos(c); acts.push({ key: "exit", label: fk + (c.boat ? "🏖️ " + tt("Zum Strand", "Back to the beach") : "🚪 " + tt("Aussteigen", "Get out")), x: d.x, y: 1.4, z: d.z, run: exitCar, d: 0 }); }
      acts.sort((a, b) => a.d - b.d);
      return;
    }
    const pedActs = () => {
      for (const p of peds) {
        if (p.deadT < 0 || p.mode === "dead" || p.robbed || p.cashier || p.mode === "fight") continue;
        const dd = dist(p.x, p.z, player.x, player.z);
        if (dd < 2.6) acts.push({ key: "ped" + p.obj.id, label: fk + richLabel(p.wealth) + " " + tt("Ausrauben", "Rob"), x: p.x, y: (p.y || 0) + 2.15, z: p.z, run: () => mug(p), d: dd + 0.3 });
      }
    };
    if (S.inside) {
      const lx = player.x - INT.x, lz = player.z - INT.z;
      if (lz > shopRoom.D / 2 - 1.9 && Math.abs(lx) < 1.6) acts.push({ key: "leave", label: fk + "🚪 " + tt("Laden verlassen", "Leave the store"), x: INT.x, y: 2.3, z: INT.z + shopRoom.D / 2 - 0.3, run: leaveShop, d: 0.5 });
      const c = cashier();
      if (c && c.mode === "dead" && S.inside.shop.cool <= 0 && dist(player.x, player.z, INT.x - 3.6, INT.z + 2.9) < 2.4) acts.push({ key: "till", label: fk + "💰 " + tt("Kasse plündern", "Loot the register"), x: INT.x - 3.6, y: 1.5, z: INT.z + 2.9, run: () => lootRegister(0.7), d: 0 });
      pedActs();
      acts.sort((a, b) => a.d - b.d); acts = acts.slice(0, 3);
      return;
    }
    if (S.deck) {
      const y = S.deck, l = yToLocal(y, player.x, player.z);
      acts.push({ key: "dive", label: fk + "🌊 " + tt("Ins Wasser springen", "Jump into the water"), x: player.x, y: y.deckY + 2.5, z: player.z, run: jumpOffYacht, d: 1.5 });
      if (l.z < y.walk.z0 + 2.6 && S.deckBoat) { const st = yToWorld(y, 0, y.walk.z0); acts.push({ key: "unboard", label: fk + "🚤 " + tt("Zurück zum Jetski", "Back to the jet ski"), x: st.x, y: y.deckY + 1.6, z: st.z, run: leaveYacht, d: 0.4 }); }
      pedActs();
      if (S.mission && S.mission.steps[S.mission.i].deck && S.mission.steps[S.mission.i].kind === "hold") { const sf = yachtSafe(); if (y === yacht && dist(sf.x, sf.z, player.x, player.z) < 6) acts.push({ key: "safe", label: S.armed ? "🔐 " + tt("Safe: Waffe ziehen und bleib hier", "Safe: weapon drawn, stay here") : "🔫 " + tt("Waffe ausrüsten (2 oder 3)", "Equip a weapon (2 or 3)"), x: sf.x, y: y.deckY + 1.4, z: sf.z, run: () => {}, enabled: false, d: 2 }); }
      acts.sort((a, b) => a.d - b.d); acts = acts.slice(0, 3);
      return;
    }
    for (const c of cars) {
      if (c.dead || c.kind === "cop" || c.kind === "wreck" || Math.abs(c.x - player.x) > 9 || Math.abs(c.z - player.z) > 9) continue;
      if (Math.hypot(c.vx, c.vz) > 4) continue;
      const d = doorPos(c), dd = Math.min(dist(d.x, d.z, player.x, player.z), dist(c.x, c.z, player.x, player.z) - 0.8) - (c.boat ? 4 : 0);
      if (dd > 2.6) continue;
      const jack = c.kind === "civ" && c.driver;
      acts.push({ key: "car" + c.id, label: fk + (c.boat ? "🚤 " + tt("Aufsteigen", "Hop on") : jack ? "👊 " + tt("Fahrer rauszerren", "Drag driver out") + " " + richLabel(c.wealth ?? 0) : "🚪 " + tt("Einsteigen", "Get in")), x: d.x, y: 1.25, z: d.z, run: () => (jack && c.driver ? pullDriver(c) : enterCar(c)), d: dd });
    }
    pedActs();
    if (S.swim) { const y = yachtAlongside(); if (y) acts.push({ key: "climb", label: fk + "🧗 " + tt(`Auf die „${y.name}“ klettern`, `Climb onto the “${y.name}”`), x: player.x, y: 1.4, z: player.z, run: () => climbYacht(y), d: -1 }); }
    for (const k of beach.kiosks) { const dd = dist(k.x, k.z, player.x, player.z); if (dd < 4.5) acts.push({ key: "jet", label: fk + "🚤 " + tt("Jetski-Verleih", "Jet ski rental"), x: k.x, y: 1.8, z: k.z, run: () => openPanel("jet"), d: dd }); }
    for (const sh of shops) {
      const dd = dist(sh.x, sh.z, player.x, player.z);
      if (sh.dealer) { if (dd < 5) acts.push({ key: "dealer", label: fk + "🏎️ " + tt("Autohaus", "Dealership"), x: sh.x, y: 1.6, z: sh.z, run: openShop, d: dd }); continue; }
      if (dd < 3.5) acts.push({ key: "shop" + shops.indexOf(sh), label: fk + "🛒 " + tt(`${sh.name} betreten`, `Enter ${sh.name}`), x: sh.x, y: 1.6, z: sh.z, run: () => enterShop(sh), d: dd });
    }
    for (const b of bizSpots) {
      const dd = dist(b.x, b.z, player.x, player.z);
      if (dd < 5) acts.push({ key: "biz" + b.biz.id, label: fk + "🏢 " + (S.biz[b.biz.id] ? tt(`${b.biz.de} verwalten`, `Manage ${b.biz.en}`) : tt(`${b.biz.de} kaufen`, `Buy ${b.biz.en}`)), x: b.x, y: 1.6, z: b.z, run: () => openPanel("biz:" + b.biz.id), d: dd });
    }
    if (hideout && dist(hideout.x, hideout.z, player.x, player.z) < 5) acts.push({ key: "hideout", label: fk + "🗺️ " + tt("Heist-Planung", "Heist planning"), x: hideout.x, y: 1.6, z: hideout.z, run: () => openPanel("heists"), d: dist(hideout.x, hideout.z, player.x, player.z) });
    if (S.mission && !player.car) acts.push({ key: "abort", label: "✖ " + tt("Auftrag abbrechen", "Abort job"), x: player.x, y: 2.6, z: player.z, run: () => endMission(false, tt("Abgebrochen.", "Aborted.")), d: 99 });
    acts.sort((a, b) => a.d - b.d);
    acts = acts.slice(0, 3);
  }
  function drawActs() {
    computeActs();
    const w = root.clientWidth, h = root.clientHeight;
    const live = new Set<string>();
    actRun.clear();
    for (const a of acts) {
      live.add(a.key); actRun.set(a.key, a.run);
      let el = actEls.get(a.key);
      if (!el) { el = document.createElement("button"); el.className = "sb-act"; el.dataset.act = a.key; actLayer.appendChild(el); actEls.set(a.key, el); }
      if (el.textContent !== a.label) el.textContent = a.label;
      el.classList.toggle("off", a.enabled === false);
      el.classList.toggle("first", a === acts[0]);
      projV.set(a.x, a.y, a.z).project(camera);
      if (projV.z > 1) { el.style.display = "none"; continue; }
      el.style.display = "";
      el.style.left = Math.max(70, Math.min(w - 70, (projV.x * 0.5 + 0.5) * w)) + "px";
      el.style.top = Math.max(60, Math.min(h - 120, (-projV.y * 0.5 + 0.5) * h)) + "px";
    }
    for (const [k, el] of actEls) if (!live.has(k)) { el.remove(); actEls.delete(k); }
  }
  // dealership menu
  function openShop() {
    S.menu = true; releaseAll();
    if (document.pointerLockElement) document.exitPointerLock();
    renderShop(); shopEl.style.display = "flex";
  }
  function closeShop() { S.menu = false; S.panel = ""; shopEl.style.display = "none"; lockPointer(); }
  function openPanel(kind: string) {
    S.menu = true; S.panel = kind; releaseAll();
    if (document.pointerLockElement) document.exitPointerLock();
    renderPanel(); shopEl.style.display = "flex";
  }
  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
  function renderPanel() {
    const head = (t: string, sub: string) => `<div class="sb-shopcard"><div class="sb-shophead"><div><b>${t}</b><small>${sub}</small></div><span class="sb-gold"><i class="sb-coin"></i>${fmt(S.gold)}</span><button data-shop="close" aria-label="close">✕</button></div><div class="sb-shoplist">`;
    let h = "";
    if (S.panel.startsWith("biz:")) {
      const d = bizDef(S.panel.slice(4))!, st = S.biz[d.id];
      h = head(d.sign, tt(d.de, d.en));
      if (!st) {
        h += `<p>${tt(`Produziert alle ${d.rate} s eine Einheit ${d.good[0]} (bis ${d.cap}), auch wenn du nicht spielst. Verkauf bringt ${d.value} Gold pro Einheit.`, `Produces one unit of ${d.good[1]} every ${d.rate}s (up to ${d.cap}), even while you're away. Selling pays ${d.value} gold per unit.`)}${d.club ? tt(" Dazu füllt der Club seinen Tresor mit Eintrittsgeld.", " The club also fills its safe with door money.") : ""}</p>
        <div class="sb-carrow"><div class="sb-cn"><b>${tt("Kaufpreis", "Price")}</b></div><button data-shop="bizbuy:${d.id}" ${S.gold < d.price ? "disabled" : ""}><i class="sb-coin"></i>${fmt(d.price)}</button></div>`;
      } else {
        const pct = Math.round((st.stock / d.cap) * 100);
        h += `<div class="sb-carrow"><div class="sb-cn"><b>${tt("Lager", "Stock")}: ${st.stock} / ${d.cap} ${tt(d.good[0], d.good[1])}</b><small>${tt("Wert", "Value")} ${fmt(st.stock * d.value)} Gold · ${tt(`+1 alle ${d.rate} s`, `+1 every ${d.rate}s`)}</small><div class="sb-meter"><i style="width:${pct}%"></i></div></div><button data-shop="bizsell:${d.id}" ${st.stock > 0 && !S.mission ? "" : "disabled"}>${tt("Verkaufen", "Sell")}</button></div>`;
        if (d.club) h += `<div class="sb-carrow"><div class="sb-cn"><b>${tt("Club-Tresor", "Club safe")}: ${fmt(st.safe || 0)} Gold</b><small>${tt("Eintrittsgeld, max. 900", "Door money, max 900")}</small></div><button data-shop="bizsafe:${d.id}" ${(st.safe || 0) >= 1 ? "" : "disabled"}>${tt("Leeren", "Collect")}</button></div>`;
        h += `<p class="sb-small">${tt("Beim Verkaufen fährst du einen Lieferwagen zum Käufer. Schäden am Wagen senken den Preis.", "Selling means driving a van to the buyer. Damage to the van lowers the price.")}</p>`;
      }
    } else if (S.panel === "jet") {
      h = head(tt("JETSKI-VERLEIH", "JET SKI RENTAL"), tt("Mieten · kaufen · Stellplatz", "Rent · buy · berth"));
      const rent = cars.find((c) => c.owned === "rent" && !c.dead), mineJ = cars.find((c) => c.owned === "jet" && !c.dead), bl = berthLeft();
      const rl = S.rentUntil > S.t ? Math.ceil((S.rentUntil - S.t) / 60) : 0;
      h += `<div class="sb-carrow"><div class="sb-cn"><b>🚤 ${tt("Jetski mieten", "Rent a jet ski")} · 10 min</b><small>${rent && rl ? tt(`Gemietet – noch ${rl} min`, `Rented – ${rl} min left`) : tt("Liegt sofort am Steg bereit.", "Ready at the jetty right away.")}</small></div><button data-shop="jetrent" ${S.gold < 40 ? "disabled" : ""}><i class="sb-coin"></i>40</button></div>`;
      h += `<div class="sb-carrow"><i class="sb-sw" style="background:#ffd21f"></i><div class="sb-cn"><b>${tt("Eigener Jetski", "Your own jet ski")}</b><small>${S.jetOwned ? tt("✅ Gehört dir", "✅ Yours") : tt("Einmal kaufen, für immer fahren – braucht einen Stellplatz.", "Buy once, ride forever – needs a berth.")}</small></div>${S.jetOwned ? "" : `<button data-shop="jetbuy" ${S.gold < 1200 ? "disabled" : ""}><i class="sb-coin"></i>${fmt(1200)}</button>`}</div>`;
      h += `<div class="sb-carrow"><div class="sb-cn"><b>⚓ ${tt("Stellplatz mieten", "Rent a berth")} · 24 h</b><small>${bl > 0 ? tt(`Aktiv – noch ${fmtLeft(bl)}`, `Active – ${fmtLeft(bl)} left`) : tt("Ohne Stellplatz darf dein eigener Jetski nicht ins Wasser.", "Without a berth your own jet ski can't go in the water.")}</small></div><button data-shop="berth" ${S.gold < 100 ? "disabled" : ""}><i class="sb-coin"></i>100</button></div>`;
      if (S.jetOwned) h += `<div class="sb-carrow"><div class="sb-cn"><b>${tt("Eigenen Jetski zu Wasser lassen", "Launch your jet ski")}</b><small>${bl > 0 ? (mineJ ? tt("Liegt schon im Wasser – nochmal holen setzt ihn an den Steg.", "Already in the water – fetching it puts it back at the jetty.") : tt("Kostenlos mit Stellplatz.", "Free with a berth.")) : tt("Erst Stellplatz mieten.", "Rent a berth first.")}</small></div><button data-shop="jetget" class="own" ${bl > 0 ? "" : "disabled"}>${tt("Holen", "Fetch")}</button></div>`;
    } else if (S.panel === "heists") {
      h = head(tt("HEIST-PLANUNG", "HEIST PLANNING"), tt("Wähle einen Coup", "Pick a heist"));
      h += `<div class="sb-howto"><span>① ${tt("Vorbereitungen nacheinander erledigen", "Do the setups in order")}</span><span>② ${tt("Finale starten", "Start the finale")}</span><span>③ ${tt("Beute ins Ziel bringen", "Bring the loot home")}</span></div>`;
      for (const x of HEISTS) {
        const hs = heistState(x.id), cd = hs.cool - Date.now();
        const stages = [...x.preps.map((st, i) => ({ name: tt(`Vorbereitung ${i + 1}`, `Setup ${i + 1}`), st, k: i })), { name: tt("Finale", "Finale"), st: x.finale, k: x.preps.length }];
        h += `<div class="sb-heist"><h3>${tt(x.de, x.en)}<span><i class="sb-coin"></i> ${fmt(x.reward)}</span></h3><p>${tt(x.info[0], x.info[1])}</p>`;
        for (const g of stages) {
          const state = cd > 0 ? "done" : g.k < hs.prep ? "done" : g.k === hs.prep ? "now" : "todo";
          h += `<div class="sb-stage ${state}"><i>${state === "done" ? "✓" : g.k === x.preps.length ? "★" : g.k + 1}</i><div><b>${g.name}${state === "now" ? tt(" · als Nächstes", " · next") : ""}</b><ol>${g.st.filter((q) => q.kind !== "lose" || g.k === x.preps.length).map((q) => `<li>${tt(q.de, q.en)}${q.timer ? ` <small>(${tt("Zeitlimit", "time limit")} ${Math.round(q.timer / 60)} min)</small>` : ""}${q.stars ? ` <small>(${"★".repeat(q.stars)})</small>` : ""}</li>`).join("")}</ol></div></div>`;
        }
        const label = hs.prep < x.preps.length ? tt(`Vorbereitung ${hs.prep + 1} starten`, `Start setup ${hs.prep + 1}`) : tt("Finale starten", "Start the finale");
        h += `<div class="sb-hbtn"><small>${cd > 0 ? tt(`Abklingzeit: noch ${Math.ceil(cd / 60000)} min`, `Cooldown: ${Math.ceil(cd / 60000)} min left`) : S.mission ? tt("Erst den laufenden Auftrag beenden.", "Finish your current job first.") : tt(`Fortschritt: ${hs.prep} / ${x.preps.length} Vorbereitungen`, `Progress: ${hs.prep} / ${x.preps.length} setups`)}</small><button data-shop="heist:${x.id}" ${cd > 0 || S.mission ? "disabled" : ""}>${label}</button></div></div>`;
      }
    }
    shopEl.innerHTML = h + "</div></div>";
  }
  function renderShop() {
    let h = `<div class="sb-shopcard"><div class="sb-shophead"><div><b>SOUTH BEACH MOTORS</b><small>${tt("Neu- und Sportwagen · Bezahlung in Gold", "New & sports cars · paid in gold")}</small></div><span class="sb-gold"><i class="sb-coin"></i>${S.gold.toLocaleString("de-DE")}</span><button data-shop="close" aria-label="close">✕</button></div><div class="sb-shoplist">`;
    TIERS.forEach((T, ti) => {
      h += `<div class="sb-tier">${T[lang]}</div>`;
      for (const sp of CATALOG.filter((c) => c.tier === ti)) {
        const own = S.owned.includes(sp.id);
        const kmh = Math.round(PHYS.player.vmax * sp.v * 3.6), acc = Math.max(1, Math.min(5, Math.round((sp.a - 0.7) * 5)));
        h += `<div class="sb-carrow"><i class="sb-sw" style="background:${sp.color}"></i><div class="sb-cn"><b>${sp.name}</b><small>${kmh} km/h · ${tt("Beschl.", "Accel.")} ${"●".repeat(acc)}${"○".repeat(5 - acc)}</small></div>${own ? `<button data-shop="get:${sp.id}" class="own">${tt("Ausparken", "Take out")}</button>` : `<button data-shop="buy:${sp.id}" ${S.gold < sp.price ? "disabled" : ""}><i class="sb-coin"></i>${sp.price.toLocaleString("de-DE")}</button>`}</div>`;
      }
    });
    shopEl.innerHTML = h + `</div><p class="sb-small">${tt("Gold bekommst du durch Ausrauben von Passanten und Läden und durch Goldmünzen auf der Straße.", "Get gold by robbing people and stores and by picking up coins on the street.")}</p></div>`;
  }
  function spawnOwned(sp: Spec) {
    for (const c of cars) if (c.owned === sp.id && c !== player.car) removeCar(c);
    const D = dealerShop || { x: player.x, z: player.z, nx: 1, nz: 0, rx: player.x + 6, rz: player.z };
    const x = D.rx - D.nx * 3.2, z = D.rz - D.nz * 3.2;
    const c = addCar(makeCar("parked", x, z, Math.atan2(D.nz, -D.nx), sp.color, sp.model));
    c.owned = sp.id; c.driver = false; c.inp.hb = true;
    return c;
  }
  function shopAction(a: string) {
    if (a === "close") { closeShop(); return; }
    const [cmd, id] = a.split(":");
    if (cmd === "bizbuy") { const d = bizDef(id); if (d && S.gold >= d.price && !S.biz[id]) { S.gold -= d.price; S.biz[id] = { t: Date.now(), stock: 0, safe: 0 }; sound.cash(); saveGame(); banner(tt("GEKAUFT", "PURCHASED"), d.sign, "#b46bff"); renderPanel(); } return; }
    if (cmd === "bizsell") { const sp = bizSpots.find((b) => b.biz.id === id); if (sp) sellGoods(sp); return; }
    if (cmd === "bizsafe") { const st = S.biz[id]; if (st && st.safe >= 1) { const v = Math.floor(st.safe); S.gold += v; st.safe -= v; sound.cash(); toast(`+${v} Gold`, "#ffd24a"); saveGame(); renderPanel(); } return; }
    if (cmd === "heist") { runHeist(id); return; }
    if (cmd === "jetrent") { if (S.gold < 40) return; S.gold -= 40; S.rentUntil = S.t + 600; S.rentWarned = false; spawnJet("rent"); sound.cash(); saveGame(); closeShop(); toast(tt("Dein Mietjetski liegt am Steg – 10 Minuten.", "Your rental jet ski is at the jetty – 10 minutes."), "#7de8ff"); return; }
    if (cmd === "jetbuy") { if (S.gold < 1200 || S.jetOwned) return; S.gold -= 1200; S.jetOwned = true; sound.cash(); saveGame(); banner(tt("GEKAUFT", "PURCHASED"), tt("Eigener Jetski – miete noch einen Stellplatz.", "Your own jet ski – now rent a berth."), "#ffd24a"); renderPanel(); return; }
    if (cmd === "berth") { if (S.gold < 100) return; S.gold -= 100; S.berthUntil = Math.max(Date.now(), S.berthUntil) + 24 * 3600 * 1000; sound.cash(); saveGame(); toast(tt("Stellplatz für 24 Stunden gemietet.", "Berth rented for 24 hours."), "#7de8ff"); renderPanel(); return; }
    if (cmd === "jetget") { if (!S.jetOwned || berthLeft() <= 0) return; spawnJet("jet"); closeShop(); toast(tt("Dein Jetski liegt am Steg bereit.", "Your jet ski is ready at the jetty."), "#ffd24a"); return; }
    const sp = CATALOG.find((c) => c.id === id);
    if (!sp) return;
    if (cmd === "buy") {
      if (S.gold < sp.price || S.owned.includes(sp.id)) return;
      S.gold -= sp.price; S.owned.push(sp.id); saveGame(); sound.cash();
      spawnOwned(sp); closeShop();
      banner(tt("GEKAUFT", "PURCHASED"), sp.name + tt(" steht vor dem Autohaus.", " is parked outside the dealership."), "#ffd24a");
    } else if (cmd === "get") { spawnOwned(sp); closeShop(); toast(sp.name + tt(" steht bereit.", " is ready."), "#ffd24a"); }
  }

  // ── big map ───────────────────────────────────────────────────
  const bigEl = hud.querySelector(".sb-big") as HTMLElement, bigCv = bigEl.querySelector("canvas") as HTMLCanvasElement, bg = bigCv.getContext("2d")!;
  const bigView = { x: 0, z: 0, zoom: 0.5 };
  function openMap() {
    S.mapOpen = true; S.menu = true; releaseAll();
    if (document.pointerLockElement) document.exitPointerLock();
    const w = wpos(); bigView.x = w.x; bigView.z = w.z;
    const r = root.getBoundingClientRect(); bigView.zoom = Math.min(r.width, r.height) / 1100;
    bigEl.style.display = "block";
  }
  function closeMap() { S.mapOpen = false; S.menu = false; bigEl.style.display = "none"; lockPointer(); }
  {
    let drag = -1, lx2 = 0, ly2 = 0, moved = 0;
    on(bigCv, "pointerdown", (e: PointerEvent) => { e.preventDefault(); e.stopPropagation(); drag = e.pointerId; lx2 = e.clientX; ly2 = e.clientY; moved = 0; try { bigCv.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
    on(bigCv, "pointermove", (e: PointerEvent) => {
      if (e.pointerId !== drag) return;
      const dx = e.clientX - lx2, dy = e.clientY - ly2; moved += Math.abs(dx) + Math.abs(dy);
      bigView.x -= dx / bigView.zoom; bigView.z -= dy / bigView.zoom; lx2 = e.clientX; ly2 = e.clientY;
    });
    const up = (e: PointerEvent) => { if (e.pointerId === drag) drag = -1; };
    on(bigCv, "pointerup", up); on(bigCv, "pointercancel", up);
    on(bigCv, "wheel", (e: WheelEvent) => { e.preventDefault(); bigView.zoom = Math.max(0.15, Math.min(4, bigView.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); }, { passive: false });
  }
  function drawBigMap() {
    const dpr = Math.min(2, devicePixelRatio || 1), W = bigCv.clientWidth, H = bigCv.clientHeight;
    if (bigCv.width !== Math.round(W * dpr) || bigCv.height !== Math.round(H * dpr)) { bigCv.width = Math.round(W * dpr); bigCv.height = Math.round(H * dpr); }
    const g = bg, Z = bigView.zoom, mmI = world.minimap as HTMLCanvasElement & { ox: number; oz: number };
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#2a7f9c"; g.fillRect(0, 0, W, H);
    const sx = (x: number) => (x - bigView.x) * Z + W / 2, sz = (z: number) => (z - bigView.z) * Z + H / 2;
    g.imageSmoothingEnabled = true;
    g.drawImage(mmI, sx(mmI.ox), sz(mmI.oz), (mmI.width / world.mmScale) * Z, (mmI.height / world.mmScale) * Z);
    const dot = (x: number, z: number, r: number, col: string, label?: string) => {
      const X = sx(x), Y = sz(z); if (X < -40 || Y < -40 || X > W + 40 || Y > H + 40) return;
      g.fillStyle = col; g.strokeStyle = "rgba(0,0,0,.65)"; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, r, 0, Math.PI * 2); g.fill(); g.stroke();
      if (label && Z > 0.35) { g.font = "700 12px Arial, sans-serif"; g.textAlign = "center"; g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,.75)"; g.strokeText(label, X, Y - r - 5); g.fillStyle = "#fff"; g.fillText(label, X, Y - r - 5); }
    };
    for (const sh of shops) if (!sh.dealer) dot(sh.x, sh.z, 4, sh.cool > 0 ? "#7a6a3a" : "#ffcc33", Z > 0.9 ? sh.name : undefined);
    if (dealerShop) dot(dealerShop.x, dealerShop.z, 7, "#38e6ff", "SOUTH BEACH MOTORS");
    for (const b of bizSpots) dot(b.x, b.z, 6.5, S.biz[b.biz.id] ? "#d08bff" : "#7b5a99", tt(b.biz.de, b.biz.en));
    if (hideout) dot(hideout.x, hideout.z, 7, "#ff3b5c", tt("Versteck", "Hideout"));
    for (const k of beach.kiosks) dot(k.x, k.z, 6, "#ff7a1f", tt("Jetski-Verleih", "Jet ski rental"));
    for (const y of yachts) {
      g.save(); g.translate(sx(y.x), sz(y.z)); g.rotate(-y.a); g.fillStyle = "#f3f5f7"; g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 1.5;
      const w = Math.max(5, 9 * y.sc * Z), h = Math.max(14, 42 * y.sc * Z); g.fillRect(-w / 2, -h / 2, w, h); g.strokeRect(-w / 2, -h / 2, w, h); g.restore();
      if (Z > 0.25) { g.font = "italic 700 11px Georgia, serif"; g.textAlign = "center"; g.fillStyle = "#fff"; g.fillText(y.name, sx(y.x), sz(y.z) - Math.max(10, 24 * Z)); }
    }
    for (const c of cars) if (!c.dead && c.owned && c !== player.car) dot(c.x, c.z, 4.5, "#ff9df0");
    for (const c of cars) if (!c.dead && c.kind === "cop") dot(c.x, c.z, 4.5, Math.floor(S.t * 6) % 2 ? "#ff2040" : "#2050ff");
    for (const h of helis) if (!h.dead) dot(h.x, h.z, 6, "#2050ff", "🚁");
    if (beacon.visible) dot(beacon.position.x, beacon.position.z, 8, "#e07bff", S.mission ? tt(S.mission.steps[S.mission.i].de, S.mission.steps[S.mission.i].en).slice(0, 40) : undefined);
    // player arrow
    const w = wpos(), a = player.car ? player.car.a : player.a;
    g.save(); g.translate(sx(w.x), sz(w.z)); g.rotate(Math.PI - a);
    g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
    // street names when zoomed in
    if (Z > 1.2) {
      g.font = "600 11px Arial, sans-serif"; g.fillStyle = "rgba(40,40,50,.85)"; g.textAlign = "center";
      const seen = new Set<string>();
      for (const r of world.roadNames) { const X = sx(r.x), Y = sz(r.z); if (X < 0 || Y < 0 || X > W || Y > H || seen.has(r.n)) continue; seen.add(r.n); g.fillText(r.n, X, Y); }
    }
  }

  // ── HUD update ─────────────────────────────────────────────────────
  let hudT = 0;
  function drawHud(dt: number) {
    hudT -= dt;
    const pp = wpos();
    if (hudT <= 0) {
      hudT = 0.1;
      $(".sb-money").innerHTML = `<i class="sb-coin"></i>${S.gold.toLocaleString("de-DE")}`;
      $(".sb-stars").innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < S.stars ? (S.seen || Math.floor(S.t * 3) % 2 ? "on" : "dim") : ""}">★</i>`).join("");
      ($(".sb-bars .hp") as HTMLElement).style.width = Math.max(0, S.hp) + "%";
      ($(".sb-bars .ar") as HTMLElement).style.width = S.armor + "%";
      const W = CFG.weapons[S.weapon];
      $(".sb-weap").innerHTML = player.car || !S.armed ? "" : `<b>${W[lang]}</b> ${S.reloadT > 0 ? tt("lädt …", "reloading …") : `${S.mag[S.weapon]} <span>/ ${S.reserve[S.weapon]}</span>`}`;
      S.streetT -= 0.1;
      if (S.streetT <= 0) {
        S.streetT = 0.6;
        let best = "", bd = 40;
        for (const r of world.roadNames) { const d = Math.abs(r.x - pp.x) + Math.abs(r.z - pp.z); if (d < bd) { bd = d; best = r.n; } }
        if (best !== S.street) { S.street = best; $(".sb-street").textContent = best ? best + " · South Beach" : "South Beach"; }
      }
      const prompt = S.bustT > 0.2 ? tt(`Festnahme! Weg hier! ${Math.round((S.bustT / 2.5) * 100)} %`, `Getting arrested! Move! ${Math.round((S.bustT / 2.5) * 100)}%`) : S.rob ? tt(`Waffe auf den Kassierer halten … ${Math.round((S.rob.t / 4) * 100)} %`, `Keep your weapon on the cashier … ${Math.round((S.rob.t / 4) * 100)}%`) : S.inside && S.inside.shop.cool <= 0 && cashier()?.mode !== "dead" && cashier()?.mode !== "fight" ? (S.armed ? tt("Ziel auf den Kassierer, um den Laden auszurauben", "Aim at the cashier to rob the store") : tt("Waffe ausrüsten (2 / 3), um den Laden auszurauben", "Equip a weapon (2 / 3) to rob the store")) : "";
      $(".sb-prompt").textContent = prompt;
      const m = S.mission, gl = $(".sb-goal");
      if (m) {
        const st = m.steps[m.i];
        const extra = st.kind === "hold" ? ` · ${Math.round((m.hold / (st.hold || 1)) * 100)} %` : st.timer ? ` · ${Math.max(0, Math.ceil(st.timer - m.t))} s` : "";
        const nx = m.steps[m.i + 1];
        gl.innerHTML = `<b>${m.title}</b><span class="sb-gstep">${tt("Schritt", "Step")} ${m.i + 1}/${m.steps.length}</span>${tt(st.de, st.en)}${extra}${nx ? `<small>${tt("Danach", "Then")}: ${tt(nx.de, nx.en)}</small>` : ""}`; gl.style.display = "block";
      } else gl.style.display = "none";
      hud.querySelectorAll(".sb-hot button").forEach((b, i) => b.classList.toggle("on", i === 0 ? !S.armed : S.armed && S.weapon === i - 1));
      const sb = hud.querySelector(".sb-shoot span"); if (sb) sb.textContent = S.armed || player.car ? "✸" : "👊";
      $(".sb-cross").style.display = !player.car && S.hp > 0 && (S.armed || S.aim || mouse.l || pad.shoot) ? "block" : "none";
      $(".sb-cross").classList.toggle("aim", S.aim);
      const jb = hud.querySelector(".sb-jump span"); if (jb) jb.textContent = player.car ? "DRIFT" : tt("SPRUNG", "JUMP");
      $(".sb-toasts").innerHTML = S.toast.filter((x) => S.t - x.t < 3.2).map((x) => `<div style="color:${x.col}">${x.txt}</div>`).join("");
      const bn = $(".sb-banner");
      if (S.banner && S.t - S.banner.t < 3.5) { bn.style.display = "flex"; (bn.querySelector("b") as HTMLElement).textContent = S.banner.big; (bn.querySelector("b") as HTMLElement).style.color = S.banner.col; (bn.querySelector("span") as HTMLElement).textContent = S.banner.small; }
      else bn.style.display = "none";
      $(".sb-hint").textContent = S.started && S.t < 25 ? tt("Tipp: T wechselt Sonnenuntergang / Nacht / Tag", "Tip: T switches sunset / night / day") : "";
    }
    drawActs();
    if (S.mapOpen) drawBigMap();
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
    for (const k of pickups) if (k.mesh.visible) dot(k.x, k.z, 2.6, k.kind === "cash" ? "#ffcc33" : k.kind === "ammo" ? "#ffb21f" : "#ff4466");
    for (const sh of shops) { const ok = sh.dealer || sh.cool <= 0; dot(sh.x, sh.z, sh.dealer ? 5 : 3.6, sh.dealer ? "#38e6ff" : ok ? "#ffcc33" : "#7a6a3a"); }
    for (const c of cars) if (!c.dead && c.owned && c !== player.car) dot(c.x, c.z, 3.6, "#ff9df0");
    for (const c of cars) if (!c.dead && c.boat && c !== player.car && c.kind !== "cop") dot(c.x, c.z, 3, c.owned ? "#ffd21f" : "#ffffff");
    for (const k of beach.kiosks) dot(k.x, k.z, 4.4, "#ff7a1f");
    for (const y of yachts) { mm.fillStyle = y === S.deck ? "#7de8ff" : "#f3f5f7"; mm.save(); mm.translate((y.x - pp.x) * world.mmScale, (y.z - pp.z) * world.mmScale); mm.rotate(-y.a); mm.fillRect(-4.5 * y.sc * world.mmScale, -20 * y.sc * world.mmScale, 9 * y.sc * world.mmScale, 42 * y.sc * world.mmScale); mm.restore(); }
    for (const b of bizSpots) dot(b.x, b.z, 4.2, S.biz[b.biz.id] ? "#d08bff" : "#7b5a99");
    if (hideout) dot(hideout.x, hideout.z, 4.6, "#ff3b5c");
    if (beacon.visible) {
      // mission target, pinned to the minimap edge when far away
      let dx = (beacon.position.x - pp.x) * world.mmScale, dz = (beacon.position.z - pp.z) * world.mmScale;
      const L = Math.hypot(dx, dz), R = 92 / 1.1;
      if (L > R) { dx *= R / L; dz *= R / L; }
      mm.fillStyle = "#e07bff"; mm.strokeStyle = "#fff"; mm.lineWidth = 2; mm.beginPath(); mm.arc(dx, dz, 6, 0, Math.PI * 2); mm.fill(); mm.stroke();
    }
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
    if (!S.paused && !S.mapOpen) {
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

  (root as unknown as { __sb: unknown }).__sb = { S, player, cars, peds, world, update, shoot, crime, keys, mouse, applyTod, camera, enterExit, scene, renderer, shops, busted, jetSpots, bizSpots, hideout, HEISTS, runHeist, openPanel, tickMission, yacht, yachts, equip, punch, openShop, shopAction, pullDriver, enterShop, leaveShop, boardYacht, leaveYacht, startFight, spawnJet, spawnBoatCop, beach, INT, shopRoom, yToWorld, cashier, mug, acts: () => acts, pad, enterCar, helis, spawnHeli, openMap, closeMap, jumpOffBoat, climbYacht, jumpOffYacht, deployOfficers, killPed };

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
