import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { SUPA_KEY, SUPA_URL, getName } from "@/lib/leaderboard";
import { N, RW, CURB, WALL, TRACKS, buildTrack, themeOf, type Track, type Sc, type Fx } from "./track";
import { CHARS, ITEM_ICON, ITEM_NAME, makeBanana, makeKart, makeRocket, type ItemKey, type KartMesh } from "./kart";
import { CSS } from "./ui";

type Lang = "de" | "en";
type Inp = { gas: boolean; brake: boolean; steer: number; drift: boolean; item: boolean; back: boolean };
type Kart = {
  id: string; name: string; ci: number; bot: boolean; remote: boolean;
  p: THREE.Vector3; yaw: number; speed: number; vy: number; ground: boolean; idx: number; s: number; lap: number; cp: boolean; prog: number; finish: number; place: number;
  driftDir: number; driftT: number; hop: boolean; hopDir: number; mtT: number; mtStage: number; boostT: number; spinT: number; spinA: number; shieldT: number; airT: number; ramp: boolean; trick: number; trickOk: boolean;
  item: ItemKey | null; itemN: number; rollT: number; rollItem: ItemKey | null; holdT: number; wrongT: number; off: boolean; prevH: number; onRamp: boolean;
  mesh: KartMesh; inp: Inp; prevDrift: boolean; prevItem: boolean; prevGas: boolean; gasAt: number; vis: number; pitch: number; steerV: number;
  lane: number; laneT: number; skill: number; rubber: number; botDrift: number; stuck: number; pts: number; sc: number; scj: number; botSc: number;
  tgt?: { p: THREE.Vector3; yaw: number; speed: number; t: number };
};
type Proj = { id: string; homing: boolean; owner: string; target: string; p: THREE.Vector3; v: THREE.Vector3; idx: number; sc: number; scj: number; life: number; bounces: number; mesh: THREE.Object3D; immune: number };
type Nana = { id: string; owner: string; p: THREE.Vector3; idx: number; mesh: THREE.Object3D; immune: number };

const LAPS = 3, BASE = 31, G = 32, CLS = [0.86, 1, 1.13], PTS = [15, 12, 10, 8, 6, 4, 2, 1];
const NAME_KEY = "geografik:mpname", CHAR_KEY = "kt:tk:char";
const STAGE_COL = ["#ffffff", "#3aa8ff", "#ff9a1a", "#c34dff"];

export async function mountTurbokart(root: HTMLElement, opts: { lang: Lang }) {
  const lang = opts.lang, tt = (de: string, en: string) => (lang === "en" ? en : de);
  const touch = matchMedia("(pointer: coarse)").matches, quality = touch ? 0 : 1;
  const cleanups: (() => void)[] = [];
  let alive = true;
  const on = (el: Window | HTMLElement | Document, ev: string, fn: (e: never) => void, o?: AddEventListenerOptions) => { el.addEventListener(ev, fn as EventListener, o); cleanups.push(() => el.removeEventListener(ev, fn as EventListener, o)); };

  // ── renderer ─────────────────────────────────────────────────────
  const style = document.createElement("style"); style.textContent = CSS; root.appendChild(style);
  const wrap = document.createElement("div"); wrap.className = "tb-root tk"; root.appendChild(wrap);
  const renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  wrap.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 3000);
  const hemi = new THREE.HemisphereLight("#fff", "#444", 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff", 2.5); sun.castShadow = true;
  sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 5, far: 220 }); sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.92); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize(); on(window, "resize", resize);

  // ── audio ────────────────────────────────────────────────────────
  let ac: AudioContext | null = null, master: GainNode | null = null, eng: OscillatorNode | null = null, engG: GainNode | null = null, skidG: GainNode | null = null;
  const noiseBuf = () => { const b = ac!.createBuffer(1, ac!.sampleRate * 2, ac!.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  function audioOn() {
    if (ac) { void ac.resume(); return; }
    try {
      ac = new AudioContext(); master = ac.createGain(); master.gain.value = localStorage.getItem("kt-sound") === "0" ? 0 : 0.45; master.connect(ac.destination);
      eng = ac.createOscillator(); eng.type = "sawtooth"; engG = ac.createGain(); engG.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
      eng.connect(lp); lp.connect(engG); engG.connect(master); eng.start();
      const n = ac.createBufferSource(); n.buffer = noiseBuf(); n.loop = true; const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2200; bp.Q.value = 2;
      skidG = ac.createGain(); skidG.gain.value = 0; n.connect(bp); bp.connect(skidG); skidG.connect(master); n.start();
    } catch { ac = null; }
  }
  function tone(f: number, d: number, v = 0.2, type: OscillatorType = "sine", f2?: number) {
    if (!ac || !master) return;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; if (f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + d);
    g.gain.setValueAtTime(v, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d); o.connect(g); g.connect(master); o.start(); o.stop(ac.currentTime + d + 0.02);
  }
  function boom(v = 0.5) {
    if (!ac || !master) return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf(); const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600; const g = ac.createGain();
    g.gain.setValueAtTime(v, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5); s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(ac.currentTime + 0.55);
  }

  // ── state ────────────────────────────────────────────────────────
  const S = {
    phase: "menu" as "menu" | "intro" | "count" | "race" | "results", t: 0, raceT: 0, countT: 0, introT: 0, endT: -1,
    trackI: 0, cup: false, round: 0, cls: 1, online: false, host: true, code: "", myName: "", ci: 0, paused: false, doneT: -1, lastLapShown: 0, myFinished: false, shake: 0,
  };
  const myId = Math.random().toString(36).slice(2, 10);
  try { S.myName = (localStorage.getItem(NAME_KEY) || getName() || "").slice(0, 16); S.ci = Math.max(0, Math.min(7, +(localStorage.getItem(CHAR_KEY) || 0) || 0)); } catch { /* ignore */ }
  const karts: Kart[] = [], projs: Proj[] = [], nanas: Nana[] = [];
  const cupPts = new Map<string, { name: string; ci: number; pts: number }>();
  let track: Track | null = null;
  const me = () => karts.find((k) => k.id === myId) || null;

  function loadTrack(i: number) {
    if (track && track.def === TRACKS[i]) return;
    if (track) { scene.remove(track.group); track.group.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { const mm = x as THREE.MeshStandardMaterial; mm.map?.dispose(); mm.emissiveMap?.dispose(); x.dispose(); }); }); }
    track = buildTrack(TRACKS[i], scene, quality, fxApi);
    const th = themeOf(TRACKS[i].key);
    sun.color.set(th.sun); sun.intensity = th.sunI; hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]); hemi.intensity = th.hemi[2]; renderer.toneMappingExposure = th.exp;
    const key = TRACKS[i].key;
    bloom.strength = key === "beach" ? 0.18 : key === "city" ? 0.6 : 0.5; bloom.threshold = key === "beach" ? 1.0 : 0.9; bloom.radius = 0.35;
    scene.environmentIntensity = key === "beach" ? 0.45 : key === "city" ? 0.3 : 0.22;
    buildMap();
  }

  // ── track queries ────────────────────────────────────────────────
  const L = { i: 0, i0: 0, f: 0, s: 0, y: 0, ramp: false };
  function locate(p: THREE.Vector3, hint: number) {
    const P = track!.P;
    let best = hint, bd = Infinity;
    for (let o = -30; o <= 50; o++) { const i = (hint + o + N) % N, q = P[i]; const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2 + (q.y - p.y) ** 2 * 0.3; if (d < bd) { bd = d; best = i; } }
    if (bd > 1600) for (let i = 0; i < N; i++) { const q = P[i]; const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2 + (q.y - p.y) ** 2 * 0.3; if (d < bd) { bd = d; best = i; } }
    const T = track!.T[best], q = P[best];
    let f = ((p.x - q.x) * T.x + (p.z - q.z) * T.z) / track!.seg, i0 = best;
    if (f < 0) { i0 = (best - 1 + N) % N; f += 1; }
    f = Math.max(0, Math.min(1, f));
    const a = P[i0], b = P[(i0 + 1) % N], r = track!.R[i0];
    L.i = best; L.i0 = i0; L.f = f; L.y = a.y + (b.y - a.y) * f;
    L.s = (p.x - (a.x + (b.x - a.x) * f)) * r.x + (p.z - (a.z + (b.z - a.z) * f)) * r.z;
    L.ramp = false;
    for (const ri of track!.ramps) {
      let di = i0 + f - ri; if (di > N / 2) di -= N; if (di < -N / 2) di += N;
      const d = di * track!.seg;
      if (d > -7 && d < 0 && Math.abs(L.s) < RW * 0.7) { L.y += 1.4 * (d + 7) / 7; L.ramp = true; }
    }
    return L;
  }
  // where on the course is p? main road or one of the shortcuts
  const SF = { idx: 0, s: 0, y: 0, ramp: false, off: false, sc: -1, scj: 0, nx: 0, nz: 0, over: 0 };
  function locSc(c: Sc, p: THREE.Vector3, hint: number) {
    let best = 0, bd = Infinity;
    const a = hint >= 0 ? Math.max(0, hint - 20) : 0, b = hint >= 0 ? Math.min(c.M - 1, hint + 30) : c.M - 1;
    for (let j = a; j <= b; j++) { const q = c.P[j]; const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = j; } }
    const q = c.P[best], r = c.R[best];
    return { j: best, s: (p.x - q.x) * r.x + (p.z - q.z) * r.z, y: q.y };
  }
  function surface(p: THREE.Vector3, hint: number, scHint: number, scjHint: number, margin = 0.95) {
    const l = locate(p, hint), lim = WALL - margin, tr = track!;
    SF.sc = -1; SF.ramp = l.ramp; SF.over = 0;
    if (Math.abs(l.s) > lim) for (let ci = 0; ci < tr.sc.length; ci++) {
      const c = tr.sc[ci], q = locSc(c, p, ci === scHint ? scjHint : -1);
      if (q.j >= 1 && q.j <= c.M - 2 && Math.abs(q.s) < c.w + 1.6) {
        SF.sc = ci; SF.scj = q.j; SF.s = q.s; SF.y = q.y; SF.ramp = false; SF.off = c.kind === "off";
        SF.idx = (c.a + Math.round(((c.b - c.a) * q.j) / (c.M - 1))) % N;
        const wl = c.w - margin + 0.1;
        if (Math.abs(q.s) > wl) { const sg = Math.sign(q.s); SF.over = Math.abs(q.s) - wl; SF.nx = c.R[q.j].x * sg; SF.nz = c.R[q.j].z * sg; }
        return SF;
      }
    }
    SF.idx = l.i; SF.s = l.s; SF.y = l.y; SF.off = Math.abs(l.s) > RW + CURB * 0.6;
    if (Math.abs(l.s) > lim) { const sg = Math.sign(l.s), r = tr.R[l.i0]; SF.over = Math.abs(l.s) - lim; SF.nx = r.x * sg; SF.nz = r.z * sg; }
    return SF;
  }
  const wrapA = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

  // ── karts ────────────────────────────────────────────────────────
  function makeK(id: string, name: string, ci: number, bot: boolean, remote: boolean): Kart {
    const mesh = makeKart(ci); scene.add(mesh.group);
    const k: Kart = {
      id, name, ci, bot, remote, p: new THREE.Vector3(), yaw: 0, speed: 0, vy: 0, ground: true, idx: 0, s: 0, lap: -1, cp: true, prog: 0, finish: 0, place: 0,
      driftDir: 0, driftT: 0, hop: false, hopDir: 0, mtT: 0, mtStage: 0, boostT: 0, spinT: 0, spinA: 0, shieldT: 0, airT: 0, ramp: false, trick: 0, trickOk: false,
      item: null, itemN: 0, rollT: 0, rollItem: null, holdT: 0, wrongT: 0, off: false, prevH: 0, onRamp: false,
      mesh, inp: { gas: false, brake: false, steer: 0, drift: false, item: false, back: false }, prevDrift: false, prevItem: false, prevGas: false, gasAt: -1, vis: 0, pitch: 0, steerV: 0,
      lane: 0, laneT: 0, skill: 1, rubber: 1, botDrift: 0, stuck: 0, pts: 0, sc: -1, scj: 0, botSc: -1,
    };
    if (id !== myId) mesh.group.add(nameTag(name));
    karts.push(k); return k;
  }
  function nameTag(text: string) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d")!;
    g.font = "bold 34px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,.75)"; g.strokeText(text, 128, 32); g.fillStyle = "#fff"; g.fillText(text, 128, 32);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); sp.scale.set(4, 1, 1); sp.position.y = 3.1; sp.renderOrder = 5; return sp;
  }
  function removeK(k: Kart) { scene.remove(k.mesh.group); const i = karts.indexOf(k); if (i >= 0) karts.splice(i, 1); }
  function clearRace() { for (const k of karts.slice()) removeK(k); for (const p of projs) scene.remove(p.mesh); for (const b of nanas) scene.remove(b.mesh); projs.length = 0; nanas.length = 0; }
  function placeGrid(k: Kart, slot: number) {
    const P = track!.P, T = track!.T, R = track!.R;
    const i = (N - 9 - slot * 6 + N) % N, side = slot % 2 ? 1 : -1;
    const p = P[i]; k.p.set(p.x + R[i].x * side * 3.6, p.y, p.z + R[i].z * side * 3.6);
    k.yaw = Math.atan2(T[i].x, T[i].z); k.vis = k.yaw; k.idx = i; k.speed = 0; k.vy = 0; k.ground = true; k.lap = -1; k.cp = true; k.finish = 0; k.prevH = p.y;
    k.driftDir = 0; k.driftT = 0; k.mtT = 0; k.boostT = 0; k.spinT = 0; k.shieldT = 0; k.item = null; k.itemN = 0; k.rollT = 0; k.gasAt = -1; k.trick = 0;
    k.mesh.group.position.copy(k.p); k.mesh.group.rotation.set(0, k.yaw, 0);
  }

  // ── items ────────────────────────────────────────────────────────
  const pick = (w: [ItemKey, number][]) => { let t = w.reduce((a, b) => a + b[1], 0) * Math.random(); for (const [k, v] of w) { t -= v; if (t <= 0) return k; } return w[0][0]; };
  function rollFor(place: number) {
    const f = place / Math.max(1, karts.length - 1);
    if (f < 0.15) return pick([["banana", 45], ["shield", 25], ["rocket", 30]]);
    if (f < 0.5) return pick([["rocket", 30], ["banana", 20], ["turbo", 25], ["homing", 15], ["shield", 10]]);
    if (f < 0.8) return pick([["turbo", 30], ["homing", 30], ["rocket", 15], ["turbo3", 15], ["shield", 10]]);
    return pick([["turbo3", 40], ["homing", 35], ["turbo", 25]]);
  }
  let pid = 0;
  const newPid = () => `${myId}-${pid++}`;
  function spawnProj(id: string, homing: boolean, owner: string, target: string, p: THREE.Vector3, v: THREE.Vector3, idx: number) {
    const mesh = makeRocket(homing); mesh.position.copy(p); scene.add(mesh);
    projs.push({ id, homing, owner, target, p: p.clone(), v: v.clone(), idx, sc: -1, scj: 0, life: homing ? 12 : 7, bounces: 0, mesh, immune: 0.4 });
  }
  function spawnNana(id: string, owner: string, p: THREE.Vector3, idx: number) {
    const mesh = makeBanana(); mesh.position.copy(p); mesh.rotation.y = Math.random() * 6; scene.add(mesh);
    nanas.push({ id, owner, p: p.clone(), idx, mesh, immune: 0.6 });
  }
  function useItem(k: Kart) {
    const it = k.item; if (!it) return;
    const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw), back = k.inp.back;
    k.itemN--; if (k.itemN <= 0) k.item = null;
    if (it === "turbo" || it === "turbo3") { k.boostT = Math.max(k.boostT, 1.3); k.speed = Math.max(k.speed, BASE * CLS[S.cls] * 1.15); if (k.id === myId) tone(300, 0.5, 0.25, "sawtooth", 900); return; }
    if (it === "shield") { k.shieldT = 9; if (k.id === myId) tone(500, 0.4, 0.2, "triangle", 1200); return; }
    if (it === "banana") {
      const p = new THREE.Vector3(k.p.x - fx * 2.6, k.p.y, k.p.z - fz * 2.6);
      const id = newPid(); spawnNana(id, k.id, p, k.idx); if (S.online) send("drop", { id, o: k.id, p: [r2(p.x), r2(p.y), r2(p.z)], i: k.idx });
      if (k.id === myId) tone(220, 0.15, 0.2, "square"); return;
    }
    const homing = it === "homing" && !back;
    const dir = back ? -1 : 1, sp = back ? 42 : Math.max(k.speed + 30, 62);
    const p = new THREE.Vector3(k.p.x + fx * 2.6 * dir, k.p.y + 0.7, k.p.z + fz * 2.6 * dir), v = new THREE.Vector3(fx * sp * dir, 0, fz * sp * dir);
    let target = "";
    if (homing) { const ahead = karts.filter((o) => o !== k && !o.finish && o.place < k.place).sort((a, b) => b.place - a.place)[0]; target = ahead?.id || ""; }
    const id = newPid(); spawnProj(id, homing, k.id, target, p, v, k.idx);
    if (S.online) send("fire", { id, h: homing ? 1 : 0, o: k.id, tg: target, p: [r2(p.x), r2(p.y), r2(p.z)], v: [r2(v.x), r2(v.z)], i: k.idx });
    tone(homing ? 700 : 400, 0.35, k.id === myId ? 0.25 : 0.08, "sawtooth", 150);
  }
  function hitKart(k: Kart, big: boolean) {
    if (k.shieldT > 0) { k.shieldT = 0; burst(k.p.x, k.p.y + 1, k.p.z, "#7de8ff", 30, 9); if (k.id === myId) tone(900, 0.3, 0.2, "triangle", 300); return; }
    if (k.spinT > 0.3) return;
    k.spinT = big ? 1.4 : 1.0; k.speed *= big ? 0.2 : 0.35; if (big) { k.vy = 8; k.ground = false; }
    k.driftDir = 0; k.driftT = 0; k.mtT = 0; k.boostT = 0;
    burst(k.p.x, k.p.y + 1, k.p.z, big ? "#ffb020" : "#ffe14a", big ? 50 : 26, big ? 12 : 7);
    if (k.id === myId) { S.shake = big ? 0.6 : 0.3; boom(big ? 0.7 : 0.35); tone(600, 0.6, 0.15, "square", 120); }
    else if (k.p.distanceTo(camera.position) < 60) boom(0.25);
  }
  function stepItems(dt: number) {
    const P = track!.P, R = track!.R;
    for (let n = projs.length - 1; n >= 0; n--) {
      const q = projs[n]; q.life -= dt; q.immune -= dt;
      if (q.homing) {
        const tg = karts.find((k) => k.id === q.target);
        let tx: number, tz: number;
        if (tg && !tg.finish && q.p.distanceTo(tg.p) < 32) { tx = tg.p.x; tz = tg.p.z; }
        else { const j = (q.idx + 14) % N, s = tg ? Math.max(-RW + 2, Math.min(RW - 2, tg.s)) : 0; tx = P[j].x + R[j].x * s; tz = P[j].z + R[j].z * s; }
        const want = Math.atan2(tx - q.p.x, tz - q.p.z), cur = Math.atan2(q.v.x, q.v.z), da = wrapA(want - cur), sp = 64;
        const na = cur + Math.max(-4 * dt, Math.min(4 * dt, da)); q.v.set(Math.sin(na) * sp, 0, Math.cos(na) * sp);
      }
      q.p.x += q.v.x * dt; q.p.z += q.v.z * dt;
      const l = surface(q.p, q.idx, q.sc, q.scj, 0.6); q.idx = l.idx; q.sc = l.sc; q.scj = l.scj; q.p.y += (l.y + 0.7 - q.p.y) * Math.min(1, dt * 12);
      if (l.over > 0) {
        if (q.homing || q.bounces >= 6) { q.life = 0; } else {
          const vn = q.v.x * l.nx + q.v.z * l.nz;
          if (vn > 0) { q.v.x -= 2 * vn * l.nx; q.v.z -= 2 * vn * l.nz; q.bounces++; }
          q.p.x -= l.nx * l.over; q.p.z -= l.nz * l.over;
        }
      }
      q.mesh.position.copy(q.p); q.mesh.rotation.set(0, Math.atan2(q.v.x, q.v.z), q.homing ? S.t * 8 : 0);
      if (Math.random() < 0.6) emit(q.p.x - q.v.x * 0.012, q.p.y, q.p.z - q.v.z * 0.012, q.homing ? "#c34dff" : "#ff7a1a", 0.4, 0.5);
      let dead = q.life <= 0;
      for (const b of nanas) if (!dead && b.p.distanceTo(q.p) < 1.6) { dead = true; removeNana(b.id, true); }
      if (!dead) for (const k of karts) {
        if (k.remote || (k.bot && !S.host)) continue;
        if ((k.id === q.owner && q.immune > 0) || k.p.distanceTo(q.p) > 1.9) continue;
        hitKart(k, true); dead = true; if (S.online) send("rm", { id: q.id });
        break;
      }
      if (dead) { if (q.life <= 0) burst(q.p.x, q.p.y, q.p.z, "#ff9a3a", 18, 6); else burst(q.p.x, q.p.y, q.p.z, "#ffcf4a", 34, 10); scene.remove(q.mesh); projs.splice(n, 1); }
    }
    for (let n = nanas.length - 1; n >= 0; n--) {
      const b = nanas[n]; b.immune -= dt;
      for (const k of karts) {
        if (k.remote || (k.bot && !S.host)) continue;
        if ((k.id === b.owner && b.immune > 0) || Math.hypot(k.p.x - b.p.x, k.p.z - b.p.z) > 1.6 || Math.abs(k.p.y - b.p.y) > 2) continue;
        hitKart(k, false); removeNana(b.id, false); if (S.online) send("rm", { id: b.id });
        break;
      }
    }
  }
  function removeNana(id: string, fx: boolean) { const i = nanas.findIndex((b) => b.id === id); if (i < 0) return; const b = nanas[i]; if (fx) burst(b.p.x, b.p.y + 0.6, b.p.z, "#ffe14a", 14, 5); scene.remove(b.mesh); nanas.splice(i, 1); }
  function removeAny(id: string) { const i = projs.findIndex((q) => q.id === id); if (i >= 0) { const q = projs[i]; burst(q.p.x, q.p.y, q.p.z, "#ffcf4a", 30, 9); scene.remove(q.mesh); projs.splice(i, 1); } removeNana(id, true); }

  // ── physics ──────────────────────────────────────────────────────
  function stepKart(k: Kart, dt: number) {
    const I = k.inp, ch = CHARS[k.ci], tr = track!, R = tr.R;
    k.mtT -= dt; k.boostT -= dt; k.shieldT -= dt; k.trick -= dt;
    if (k.rollT > 0) { k.rollT -= dt; if (k.rollT <= 0) { k.item = k.rollItem; k.itemN = k.item === "turbo3" ? 3 : 1; k.holdT = 0; if (k.id === myId) tone(1100, 0.15, 0.2, "triangle"); } }
    if (k.item) k.holdT += dt;
    const racing = S.phase === "race";
    const boosting = k.boostT > 0 || k.mtT > 0;
    const sp = Math.abs(k.speed);
    let maxS = BASE * CLS[S.cls] * ch.spd * (k.bot ? k.skill * k.rubber : 1);
    if (k.off && !boosting) maxS *= 0.5;
    if (boosting) maxS *= k.boostT > 0 ? 1.38 : 1.3;
    if (k.spinT > 0) { k.spinT -= dt; k.speed *= Math.exp(-2.5 * dt); k.spinA += dt * 13; k.driftDir = 0; }
    else if (racing) {
      if (I.gas || boosting) k.speed += (maxS - k.speed) * (boosting ? 3.2 : 0.62 * ch.accel) * dt;
      else if (I.brake) k.speed = Math.max(-9, k.speed - (k.speed > 0 ? 40 : 12) * dt);
      else k.speed *= Math.exp(-0.8 * dt);
      if (k.speed > maxS) k.speed += (maxS - k.speed) * 1.8 * dt;
    } else k.speed *= Math.exp(-3 * dt);
    // steering & drift
    if (k.ground && k.spinT <= 0) {
      if (k.driftDir) {
        const d = k.driftDir, amt = 0.62 + 0.45 * Math.max(-1, Math.min(1, I.steer * d));
        k.yaw -= d * amt * 1.95 * ch.hand * Math.min(1, sp / 10) * dt;
        k.driftT += dt * (0.8 + 0.5 * Math.max(0, I.steer * d));
        const st = k.driftT > 3.1 ? 3 : k.driftT > 1.9 ? 2 : k.driftT > 0.9 ? 1 : 0;
        if (st > k.mtStage && k.id === myId) tone(500 + st * 250, 0.12, 0.12, "triangle");
        k.mtStage = st;
        if (st > 0 && Math.random() < 0.9) { const c = Math.cos(k.yaw), s = Math.sin(k.yaw); for (const sd of [-1, 1]) emit(k.p.x - s * 1.1 + c * sd * 0.9, k.p.y + 0.2, k.p.z - c * 1.1 - s * sd * 0.9, STAGE_COL[st], 0.25 + st * 0.06, 0.35); }
        if (!I.drift || sp < 8) {
          if (k.mtStage > 0) { k.mtT = Math.max(k.mtT, [0, 0.75, 1.3, 2.0][k.mtStage]); if (k.id === myId) tone(250, 0.4, 0.22, "sawtooth", 700); }
          k.driftDir = 0; k.driftT = 0; k.mtStage = 0;
        }
      } else {
        const turn = 1.9 * ch.hand * Math.min(1, sp / 6) * (1 - 0.25 * Math.min(1, sp / 40));
        k.yaw -= I.steer * turn * (k.speed < 0 ? -1 : 1) * dt;
      }
    } else if (!k.ground && k.spinT <= 0) k.yaw -= I.steer * 0.9 * dt;
    // hop → drift
    if (racing && I.drift && !k.prevDrift && k.ground && k.spinT <= 0 && sp > 4) { k.vy = 5; k.ground = false; k.hop = true; k.hopDir = 0; tone(180, 0.08, 0.08, "square"); }
    if (racing && I.drift && !k.prevDrift && !k.ground && k.ramp && k.trick <= 0 && k.spinT <= 0) { k.trick = 0.5; k.trickOk = true; if (k.id === myId) tone(900, 0.15, 0.15, "triangle", 1400); }
    if (!k.ground && Math.abs(I.steer) > 0.25) k.hopDir = Math.sign(I.steer);
    // motion
    const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
    const slide = k.driftDir ? -k.driftDir * sp * 0.07 : 0;
    k.p.x += (fx * k.speed - fz * slide) * dt;
    k.p.z += (fz * k.speed + fx * slide) * dt;
    k.vy -= G * dt; k.p.y += k.vy * dt;
    const l = surface(k.p, k.idx, k.sc, k.scj);
    k.sc = l.sc; k.scj = l.scj;
    // laps
    const prev = k.idx; k.idx = l.idx;
    const di = k.idx - prev;
    if (di < -N / 2) { if (k.cp) { k.lap++; k.cp = false; onLap(k); } }
    else if (di > N / 2) { k.lap--; k.cp = true; }
    if (k.idx > N * 0.4 && k.idx < N * 0.6) k.cp = true;
    k.prog = k.lap + k.idx / N; k.s = l.s;
    k.off = l.off;
    // ground
    const h = l.y;
    if (k.p.y <= h + 0.02) {
      if (!k.ground) {
        if (k.airT > 0.3 && k.id === myId) tone(120, 0.12, 0.2, "sine", 60);
        if (k.trickOk && k.spinT <= 0) { k.mtT = Math.max(k.mtT, 0.9); burst(k.p.x, k.p.y + 0.5, k.p.z, "#7dffb0", 14, 4); if (k.id === myId) tone(400, 0.3, 0.2, "sawtooth", 1000); }
        k.trickOk = false; k.ramp = false;
        if (k.hop && I.drift && Math.abs(k.hopDir || I.steer) > 0 && sp > 10 && !k.driftDir && Math.abs(I.steer) > 0.15) { k.driftDir = Math.sign(I.steer); k.driftT = 0; k.mtStage = 0; }
        k.hop = false; k.airT = 0;
      }
      k.p.y = h; k.ground = true;
      k.vy = Math.max(-20, Math.min(14, (h - k.prevH) / Math.max(dt, 1e-3)));
    } else { k.ground = false; k.airT += dt; }
    if (k.onRamp && !l.ramp && sp > 14 && k.vy > 0) { k.vy += 5; k.ramp = true; k.ground = false; }
    k.prevH = h; k.onRamp = l.ramp;
    if (k.vy > 0 && k.p.y > h + 0.05) k.ground = false;
    // walls
    if (l.over > 0) {
      const nx = l.nx, nz = l.nz;
      k.p.x -= nx * l.over; k.p.z -= nz * l.over;
      const vx = fx * k.speed, vz = fz * k.speed, vn = vx * nx + vz * nz;
      if (vn > 0) {
        const nvx = vx - nx * vn * 1.5, nvz = vz - nz * vn * 1.5, ns = Math.hypot(nvx, nvz);
        if (k.speed > 3) { k.yaw = Math.atan2(nvx, nvz); k.speed = ns * 0.9; } else k.speed *= 0.3;
        if (vn > 6) { burst(k.p.x + nx, k.p.y + 0.5, k.p.z + nz, "#ffd27a", 10, 5); if (k.id === myId) { tone(140, 0.15, Math.min(0.35, vn / 40), "square", 60); S.shake = Math.min(0.4, vn / 50); } }
      }
    }
    // pads & boxes
    if (k.ground) for (const pd of tr.pads) { if ((pd.p.x - k.p.x) ** 2 + (pd.p.z - k.p.z) ** 2 < 2.4 * 2.4 + 4 && Math.abs(pd.p.y - k.p.y) < 1.5) { if (k.boostT < 0.5 && k.id === myId) tone(350, 0.4, 0.2, "sawtooth", 900); k.boostT = Math.max(k.boostT, 1.0); } }
    for (let bi = 0; bi < tr.boxes.length; bi++) {
      const b = tr.boxes[bi]; if (b.t > 0) continue;
      if ((b.p.x - k.p.x) ** 2 + (b.p.z - k.p.z) ** 2 < 2.4 * 2.4 && Math.abs(b.p.y - k.p.y - 1) < 2.5) {
        b.t = 2; burst(b.p.x, b.p.y, b.p.z, "#ff7ad1", 22, 6);
        if (!k.item && k.rollT <= 0 && !k.finish) { k.rollT = k.bot ? 1.0 : 1.5; k.rollItem = rollFor(k.place); if (k.id === myId) tone(1300, 0.08, 0.12, "square"); }
        if (S.online) send("box", { b: bi });
      }
    }
    // items
    if (I.item && !k.prevItem && k.item && k.rollT <= 0 && k.spinT <= 0 && racing) useItem(k);
    // start boost bookkeeping
    if (S.phase === "count" && I.gas && k.gasAt < 0) k.gasAt = S.countT;
    // offroad dust / wrong way
    if (k.off && k.ground && sp > 8 && Math.random() < 0.5) emit(k.p.x - fx * 1.2, k.p.y + 0.3, k.p.z - fz * 1.2, TRACKS[S.trackI].key === "city" ? "#555a70" : "#a0805a", 0.5, 0.6);
    const tdot = fx * tr.T[k.idx].x + fz * tr.T[k.idx].z;
    k.wrongT = racing && tdot < -0.3 && k.speed > 2 ? k.wrongT + dt : 0;
    k.prevDrift = I.drift; k.prevItem = I.item; k.prevGas = I.gas;
  }
  function onLap(k: Kart) {
    if (k.lap >= LAPS && !k.finish) {
      k.finish = Math.max(0.01, S.raceT);
      if (k.id === myId) { if (track) confetti(track.P[0]); S.myFinished = true; banner(`${k.place + 1}.`, tt("ZIEL!", "FINISH!"), true); tone(523, 0.2, 0.25, "square"); setTimeout(() => tone(659, 0.2, 0.25, "square"), 180); setTimeout(() => tone(784, 0.5, 0.25, "square"), 360); }
      return;
    }
    if (k.id === myId && k.lap > 0 && k.lap < LAPS) {
      if (k.lap === LAPS - 1) { banner(tt("LETZTE RUNDE!", "FINAL LAP!"), ""); tone(660, 0.12, 0.2, "square"); setTimeout(() => tone(880, 0.3, 0.2, "square"), 140); }
      else banner(`${tt("RUNDE", "LAP")} ${k.lap + 1}/${LAPS}`, "");
    }
  }
  function kartCollide() {
    for (let a = 0; a < karts.length; a++) for (let b = a + 1; b < karts.length; b++) {
      const A = karts[a], B = karts[b];
      if ((A.remote || (A.bot && !S.host)) && (B.remote || (B.bot && !S.host))) continue;
      const dx = B.p.x - A.p.x, dz = B.p.z - A.p.z, d = Math.hypot(dx, dz);
      if (d > 2.3 || d < 1e-3 || Math.abs(A.p.y - B.p.y) > 1.6) continue;
      const nx = dx / d, nz = dz / d, ov = 2.3 - d, wa = CHARS[A.ci].w, wb = CHARS[B.ci].w;
      const la = !(A.remote || (A.bot && !S.host)), lb = !(B.remote || (B.bot && !S.host));
      const fa = lb ? wb / (wa + wb) : 1, fb = la ? wa / (wa + wb) : 1;
      if (la) { A.p.x -= nx * ov * fa * 1.4; A.p.z -= nz * ov * fa * 1.4; A.speed *= 0.985; }
      if (lb) { B.p.x += nx * ov * fb * 1.4; B.p.z += nz * ov * fb * 1.4; B.speed *= 0.985; }
      if ((A.id === myId || B.id === myId) && ov > 0.3) tone(110, 0.08, 0.15, "square", 70);
    }
  }

  // ── bots ─────────────────────────────────────────────────────────
  function botThink(k: Kart, dt: number) {
    const tr = track!, P = tr.P, T = tr.T, R = tr.R, I = k.inp, sp = Math.abs(k.speed);
    I.item = false;
    k.laneT -= dt;
    if (k.laneT <= 0) { k.laneT = 2 + Math.random() * 3; k.lane = (Math.random() - 0.5) * (RW * 1.1); }
    let lane = k.lane;
    // go for item boxes when empty-handed
    if (!k.item && k.rollT <= 0) for (const b of tr.boxes) { let d = b.i - k.idx; if (d < 0) d += N; if (d > 5 && d < 45 && b.t <= 0) { const bs = (b.p.x - P[b.i].x) * R[b.i].x + (b.p.z - P[b.i].z) * R[b.i].z; if (Math.abs(bs - k.s) < 5) { lane = bs; break; } } }
    // dodge bananas
    for (const n of nanas) { let d = n.idx - k.idx; if (d < 0) d += N; if (d > 0 && d < 30) { const ns = (n.p.x - P[n.idx].x) * R[n.idx].x + (n.p.z - P[n.idx].z) * R[n.idx].z; if (Math.abs(ns - lane) < 2.6) lane = ns + (ns > 0 ? -4 : 4); } }
    lane = Math.max(-RW + 1.8, Math.min(RW - 1.8, lane));
    const look = 9 + Math.floor(sp * 0.55), j = (k.idx + look) % N;
    let tx = P[j].x + R[j].x * lane, tz = P[j].z + R[j].z * lane;
    // shortcuts: decide on approach, then follow the path
    if (k.botSc === -1) tr.sc.forEach((c, ci) => {
      let d = c.a - k.idx; if (d < -N / 2) d += N;
      if (k.botSc === -1 && d > 0 && d < 70) {
        const turbo = k.item === "turbo" || k.item === "turbo3" || k.boostT > 0.5;
        const take = c.kind === "road" ? Math.random() < 0.3 + S.cls * 0.2 : turbo && Math.random() < 0.85;
        k.botSc = take ? ci : -2 - ci;
      }
    });
    if (k.botSc >= 0) {
      const c = tr.sc[k.botSc], q = locSc(c, k.p, k.sc === k.botSc ? k.scj : -1), jj = Math.min(c.M - 1, q.j + Math.max(6, Math.floor(look * 0.8)));
      if (q.j < c.M - 8) { tx = c.P[jj].x; tz = c.P[jj].z; }
      // fire the turbo right where the sand / gravel starts
      if (c.kind === "off" && (k.item === "turbo" || k.item === "turbo3") && q.j >= c.j0 - 6 && k.boostT <= 0.15 && k.rollT <= 0) { I.item = !k.prevItem; }
      if (c.kind === "off" && !k.item && k.boostT <= 0 && k.sc !== k.botSc && q.j < c.j0) k.botSc = -2 - k.botSc; // lost the turbo: stay on the road
    }
    if (k.botSc !== -1 && k.sc === -1) { const c = tr.sc[k.botSc >= 0 ? k.botSc : -2 - k.botSc]; let d = k.idx - c.b; if (d < -N / 2) d += N; let e = c.a - k.idx; if (e < -N / 2) e += N; if ((d > 5 && d < N / 2) || e > 90) k.botSc = -1; }
    const da = wrapA(Math.atan2(tx - k.p.x, tz - k.p.z) - k.yaw);
    I.steer = Math.max(-1, Math.min(1, -da * 2.6));
    I.gas = true; I.brake = false;
    // corner ahead?
    const j2 = (k.idx + 45) % N, turnA = wrapA(Math.atan2(T[j2].x, T[j2].z) - Math.atan2(T[k.idx].x, T[k.idx].z));
    if (!k.driftDir && !k.hop && Math.abs(turnA) > 0.55 && sp > 20 && k.ground && Math.random() < 0.08 * (S.cls + 1)) { I.drift = true; I.steer = turnA < 0 ? 1 : -1; k.botDrift = 0; }
    else if (k.driftDir) {
      k.botDrift += dt;
      const wrong = (-da * 2.6) * k.driftDir < -0.9;
      I.drift = !(wrong || (Math.abs(turnA) < 0.18 && k.mtStage >= 1) || k.botDrift > 4);
    } else if (k.hop) { /* keep holding while in the air */ } else I.drift = false;
    // stuck against a wall → back up
    k.stuck = sp < 2 && S.phase === "race" ? k.stuck + dt : 0;
    if (k.stuck > 1.5) { I.gas = false; I.brake = true; I.steer = -I.steer; if (k.stuck > 2.6) k.stuck = 0; }
    // items
    const scTurbo = I.item; I.item = false; I.back = false;
    if (scTurbo) I.item = true;
    else if (k.botSc >= 0 && tr.sc[k.botSc].kind === "off" && (k.item === "turbo" || k.item === "turbo3")) { /* save it for the shortcut */ }
    else if (k.item && k.rollT <= 0 && k.holdT > 0.6 + (k.ci % 3) * 0.4) {
      const it = k.item;
      const ahead = karts.find((o) => o !== k && o.place === k.place - 1), behind = karts.find((o) => o !== k && o.place === k.place + 1);
      if (it === "turbo" || it === "turbo3") I.item = Math.abs(turnA) < 0.3 || k.off;
      else if (it === "shield") I.item = true;
      else if (it === "homing") I.item = !!ahead;
      else if (it === "rocket") {
        if (ahead && ahead.p.distanceTo(k.p) < 45 && Math.abs(wrapA(Math.atan2(ahead.p.x - k.p.x, ahead.p.z - k.p.z) - k.yaw)) < 0.12) I.item = true;
        else if (behind && behind.p.distanceTo(k.p) < 20) { I.item = true; I.back = true; }
        else if (k.holdT > 8) I.item = true;
      } else if (it === "banana") I.item = (!!behind && behind.p.distanceTo(k.p) < 18) || k.holdT > 7;
    }
  }
  function rubberBand(dt: number) {
    const humans = karts.filter((k) => !k.bot);
    if (!humans.length) return;
    const best = Math.max(...humans.map((h) => (h.finish ? 99 : h.prog))), worst = Math.min(...humans.map((h) => h.prog));
    for (const k of karts) if (k.bot) {
      const ahead = (k.prog - best) * track!.len, behind = (worst - k.prog) * track!.len;
      const want = ahead > 70 ? 0.9 : ahead > 25 ? 0.96 : behind > 120 ? 1.12 : behind > 40 ? 1.05 : 1;
      k.rubber += (want - k.rubber) * Math.min(1, dt * 0.8);
    }
  }

  // ── particles ────────────────────────────────────────────────────
  const PN = 1400, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pMax = new Float32Array(PN);
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d")!; const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "#fff"); gr.addColorStop(0.4, "rgba(255,255,255,.6)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.9, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pts.frustumCulled = false; scene.add(pts);
  let pNext = 0;
  const tmpCol = new THREE.Color();
  function emit(x: number, y: number, z: number, col: string, life: number, spd: number, vy = 0) {
    const i = pNext; pNext = (pNext + 1) % PN;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pVel[i * 3] = (Math.random() - 0.5) * spd * 4; pVel[i * 3 + 1] = Math.random() * spd * 3 + vy; pVel[i * 3 + 2] = (Math.random() - 0.5) * spd * 4;
    tmpCol.set(col).multiplyScalar(2.2); pCol[i * 3] = tmpCol.r; pCol[i * 3 + 1] = tmpCol.g; pCol[i * 3 + 2] = tmpCol.b;
    pLife[i] = pMax[i] = life;
  }
  const BN = 1600, bPos = new Float32Array(BN * 3), bCol = new Float32Array(BN * 3), bVel = new Float32Array(BN * 3), bLife = new Float32Array(BN), bMax = new Float32Array(BN);
  const bGeo = new THREE.BufferGeometry(); bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3)); bGeo.setAttribute("color", new THREE.BufferAttribute(bCol, 3));
  const bPts = new THREE.Points(bGeo, new THREE.PointsMaterial({ size: 2.6, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  bPts.frustumCulled = false; scene.add(bPts);
  let bNext = 0;
  function emitBig(x: number, y: number, z: number, col: string, life: number, spd: number, vy = 0) {
    const i = bNext; bNext = (bNext + 1) % BN;
    bPos[i * 3] = x; bPos[i * 3 + 1] = y; bPos[i * 3 + 2] = z;
    const a = Math.random() * 6.283, e = Math.random() * 2 - 1, r = Math.sqrt(1 - e * e);
    bVel[i * 3] = Math.cos(a) * r * spd * 2; bVel[i * 3 + 1] = e * spd * 2 + vy; bVel[i * 3 + 2] = Math.sin(a) * r * spd * 2;
    tmpCol.set(col).multiplyScalar(2.4); bCol[i * 3] = tmpCol.r; bCol[i * 3 + 1] = tmpCol.g; bCol[i * 3 + 2] = tmpCol.b;
    bLife[i] = bMax[i] = life;
  }
  const fxApi: Fx = {
    emit: (x, y, z, c, l, s, vy) => emit(x, y, z, c, l, s, vy),
    big: (x, y, z, c, l, s, vy) => emitBig(x, y, z, c, l, s, vy),
    boom: (v, at) => { const d = at.distanceTo(camera.position); if (d < 420) boom(v * Math.max(0.15, 1 - d / 420)); },
    shake: (v, at) => { const m = me(); if (m && at.distanceTo(m.p) < 130) S.shake = Math.max(S.shake, v * (1 - at.distanceTo(m.p) / 130)); },
  };
  function confetti(p: THREE.Vector3) { const cs = ["#ff3d7f", "#ffd23f", "#00c2ff", "#2ecc71", "#ff8a00", "#9b5de5", "#ffffff"]; for (let k = 0; k < 140; k++) emitBig(p.x + (Math.random() - 0.5) * 18, p.y + 9, p.z + (Math.random() - 0.5) * 4, cs[k % cs.length], 1.6 + Math.random(), 4, 6); }
  function burst(x: number, y: number, z: number, col: string, n: number, spd: number) { for (let i = 0; i < n; i++) emit(x, y, z, col, 0.4 + Math.random() * 0.5, spd * 0.5); }
  function stepFx(dt: number) {
    for (let i = 0; i < PN; i++) {
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -999; continue; }
      pLife[i] -= dt; const k = Math.max(0, pLife[i] / pMax[i]);
      pVel[i * 3 + 1] -= 9 * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      if (k < 0.3) { pCol[i * 3] *= 0.9; pCol[i * 3 + 1] *= 0.9; pCol[i * 3 + 2] *= 0.9; }
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    for (let i = 0; i < BN; i++) {
      if (bLife[i] <= 0) { bPos[i * 3 + 1] = -999; continue; }
      bLife[i] -= dt; const k = Math.max(0, bLife[i] / bMax[i]);
      bVel[i * 3 + 1] -= 7 * dt; bVel[i * 3] *= 0.985; bVel[i * 3 + 2] *= 0.985;
      bPos[i * 3] += bVel[i * 3] * dt; bPos[i * 3 + 1] += bVel[i * 3 + 1] * dt; bPos[i * 3 + 2] += bVel[i * 3 + 2] * dt;
      if (k < 0.4) { bCol[i * 3] *= 0.93; bCol[i * 3 + 1] *= 0.93; bCol[i * 3 + 2] *= 0.93; }
    }
    bGeo.attributes.position.needsUpdate = true; bGeo.attributes.color.needsUpdate = true;
  }

  // ── visuals per kart ─────────────────────────────────────────────
  const eu = new THREE.Euler(0, 0, 0, "YXZ");
  function updateMesh(k: Kart, dt: number) {
    const m = k.mesh, tr = track!;
    m.group.position.copy(k.p);
    const target = k.spinT > 0 ? k.yaw + k.spinA : k.yaw + k.driftDir * 0.42;
    if (k.spinT <= 0) k.spinA = 0;
    k.vis = k.spinT > 0 ? target : k.vis + wrapA(target - k.vis) * Math.min(1, dt * 10);
    const a = tr.P[(k.idx + 3) % N], b = tr.P[(k.idx - 3 + N) % N];
    const slope = Math.atan2(a.y - b.y, tr.seg * 6) * Math.cos(wrapA(k.yaw - Math.atan2(tr.T[k.idx].x, tr.T[k.idx].z)));
    const wantP = k.ground ? -slope : Math.max(-0.4, Math.min(0.4, -k.vy * 0.02));
    k.pitch += (wantP - k.pitch) * Math.min(1, dt * 8);
    k.steerV += (k.inp.steer - k.steerV) * Math.min(1, dt * 10);
    eu.set(k.pitch, k.vis, k.driftDir * 0.07 + k.steerV * 0.04 * Math.min(1, Math.abs(k.speed) / 20)); m.group.quaternion.setFromEuler(eu);
    m.body.rotation.y = k.trick > 0 ? (0.5 - k.trick) * Math.PI * 4 : 0;
    m.body.position.y = k.ground ? Math.sin(S.t * 40 + k.ci) * 0.012 * Math.min(1, Math.abs(k.speed) / 20) + (k.off ? Math.sin(S.t * 55) * 0.04 : 0) : 0;
    for (const w of m.wheels) w.rotation.x += k.speed * dt * 2.6;
    for (const f of m.front) f.rotation.y = -k.steerV * 0.45;
    m.driver.rotation.z = k.steerV * 0.15; m.head.rotation.y = -k.steerV * 0.35;
    const boosting = k.boostT > 0 || k.mtT > 0;
    for (const f of m.flames) {
      f.visible = boosting || (k.mtStage > 0);
      const s = boosting ? 1 + Math.random() * 0.6 : 0.45 + Math.random() * 0.2; f.scale.set(1, 1, s * (boosting ? 1.4 : 1));
      const col = k.boostT > 0 ? "#ff9a3a" : STAGE_COL[Math.max(1, k.mtStage)];
      (f.material as THREE.MeshBasicMaterial).color.set(col).multiplyScalar(2.5);
    }
    m.shield.visible = k.shieldT > 0; if (k.shieldT > 0) { const sc = 1 + Math.sin(S.t * 8) * 0.04; m.shield.scale.setScalar(sc); }
  }

  // ── input ────────────────────────────────────────────────────────
  const keys = new Set<string>();
  on(window, "keydown", (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    keys.add(e.code); audioOn();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code) && S.phase !== "menu") e.preventDefault();
    if (e.code === "Escape" || e.code === "KeyP") togglePause();
    if (e.code === "KeyF") toggleFs();
  });
  on(window, "keyup", (e: KeyboardEvent) => keys.delete(e.code));
  on(window, "blur", () => keys.clear());
  const pad = { x: 0, drift: false, item: false, brake: false };
  function readInput(I: Inp) {
    const k = (...c: string[]) => c.some((x) => keys.has(x));
    I.gas = k("KeyW", "ArrowUp"); I.brake = k("KeyS", "ArrowDown");
    I.steer = (k("KeyD", "ArrowRight") ? 1 : 0) - (k("KeyA", "ArrowLeft") ? 1 : 0);
    I.drift = k("Space", "ShiftLeft", "ShiftRight", "KeyK");
    I.item = k("KeyE", "ControlLeft", "ControlRight", "KeyJ", "Enter");
    I.back = I.brake;
    const gp = navigator.getGamepads?.().find((g) => g && g.connected);
    if (gp) {
      const ax = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0;
      if (ax) I.steer = ax;
      if (gp.buttons[0]?.pressed || (gp.buttons[7]?.value || 0) > 0.2) I.gas = true;
      if (gp.buttons[1]?.pressed || (gp.buttons[6]?.value || 0) > 0.2) I.brake = true;
      if (gp.buttons[5]?.pressed || gp.buttons[4]?.pressed) I.drift = true;
      if (gp.buttons[2]?.pressed || gp.buttons[3]?.pressed) I.item = true;
      if ((gp.axes[1] || 0) > 0.5) I.back = true;
      if (gp.buttons[9]?.pressed && !gpStart) togglePause(); gpStart = !!gp.buttons[9]?.pressed;
    }
    if (touch) {
      if (Math.abs(pad.x) > 0.06) I.steer = Math.sign(pad.x) * Math.min(1, (Math.abs(pad.x) - 0.06) * 1.3);
      I.gas = S.phase === "count" || S.phase === "intro" ? pad.drift || pad.item : !pad.brake; I.brake = pad.brake; I.back = pad.brake;
      if (pad.drift) I.drift = true; if (pad.item) I.item = true;
    }
    if (S.paused) { I.gas = false; I.steer = 0; I.drift = false; I.item = false; }
  }
  let gpStart = false;

  // ── network ──────────────────────────────────────────────────────
  let sb: ReturnType<typeof createClient> | null = null, ch: RealtimeChannel | null = null, sendT = 0, hostId = "";
  const members = new Map<string, { name: string; ci: number }>();
  const send = (event: string, payload: unknown) => { void ch?.send({ type: "broadcast", event, payload }); };
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const pack = (k: Kart) => [k.id, r2(k.p.x), r2(k.p.y), r2(k.p.z), r2(k.yaw), r2(k.speed), (k.spinT > 0 ? 1 : 0) | (k.shieldT > 0 ? 2 : 0) | (k.mtStage << 2) | ((k.boostT > 0 || k.mtT > 0 ? 1 : 0) << 4), r2(k.prog * 1000) / 1000, r2(k.finish), k.driftDir, k.ci, k.name, r2(k.steerV)];
  function unpack(a: (string | number)[], bot: boolean) {
    const id = a[0] as string; if (id === myId) return;
    let k = karts.find((x) => x.id === id);
    if (!k) { if (S.phase === "menu" || S.phase === "results") return; k = makeK(id, a[11] as string, a[10] as number, bot, true); k.idx = locate(new THREE.Vector3(a[1] as number, a[2] as number, a[3] as number), 0).i; }
    k.remote = true;
    k.tgt = { p: new THREE.Vector3(a[1] as number, a[2] as number, a[3] as number), yaw: a[4] as number, speed: a[5] as number, t: performance.now() };
    const fl = a[6] as number;
    k.spinT = fl & 1 ? Math.max(k.spinT, 0.1) : 0; k.shieldT = fl & 2 ? 1 : 0; k.mtStage = (fl >> 2) & 3; k.mtT = (fl >> 4) & 1 ? 0.1 : 0;
    k.prog = a[7] as number; k.finish = a[8] as number; k.driftDir = a[9] as number; k.inp.steer = (a[12] as number) || 0;
  }
  function stepRemote(k: Kart, dt: number) {
    if (!k.tgt) return;
    const age = Math.min(0.3, (performance.now() - k.tgt.t) / 1000);
    const px = k.tgt.p.x + Math.sin(k.tgt.yaw) * k.tgt.speed * age, pz = k.tgt.p.z + Math.cos(k.tgt.yaw) * k.tgt.speed * age;
    if (Math.hypot(px - k.p.x, pz - k.p.z) > 20) k.p.set(px, k.tgt.p.y, pz);
    k.p.x += (px - k.p.x) * Math.min(1, dt * 10); k.p.z += (pz - k.p.z) * Math.min(1, dt * 10); k.p.y += (k.tgt.p.y - k.p.y) * Math.min(1, dt * 10);
    k.yaw += wrapA(k.tgt.yaw - k.yaw) * Math.min(1, dt * 10); k.speed = k.tgt.speed;
    const sf = surface(k.p, k.idx, k.sc, k.scj); k.idx = sf.idx; k.s = sf.s; k.sc = sf.sc; k.scj = sf.scj; k.ground = true;
    if (k.spinT > 0) k.spinA += dt * 13;
    if (k.mtStage > 0 && Math.random() < 0.6) { const c = Math.cos(k.yaw), s = Math.sin(k.yaw); emit(k.p.x - s * 1.1, k.p.y + 0.2, k.p.z - c * 1.1, STAGE_COL[k.mtStage], 0.3, 0.35); }
  }
  function netTick(dt: number) {
    if (!S.online || !ch) return;
    sendT -= dt; if (sendT > 0) return; sendT = 1 / 15;
    const mine = me();
    if (mine && S.phase !== "menu") send("k", pack(mine));
    if (S.host && S.phase !== "menu") send("b", { ks: karts.filter((k) => k.bot).map(pack), ph: S.phase, ct: r2(S.countT), it: r2(S.introT) });
  }
  async function connect(code: string, host: boolean) {
    sb = sb || createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, realtime: { params: { eventsPerSecond: 40 } } });
    if (ch) { await sb.removeChannel(ch); ch = null; }
    S.online = true; S.host = host; S.code = code; hostId = host ? myId : "";
    const c = sb.channel(`kt:tk:${code}`, { config: { broadcast: { self: false }, presence: { key: myId } } });
    c.on("presence", { event: "sync" }, () => {
      const st = c.presenceState<{ name: string; ci: number }>();
      members.clear();
      for (const [id, arr] of Object.entries(st)) if (arr[0]) members.set(id, { name: arr[0].name, ci: arr[0].ci });
      for (const k of karts.slice()) if (!k.bot && k.id !== myId && !members.has(k.id)) removeK(k);
      if (!host && hostId && !members.has(hostId)) { msg(tt("Der Gastgeber hat das Rennen verlassen.", "The host left the race.")); leaveOnline(); return; }
      renderLobby();
    });
    c.on("broadcast", { event: "k" }, ({ payload }) => unpack(payload as (string | number)[], false));
    c.on("broadcast", { event: "b" }, ({ payload }) => {
      if (S.host) return;
      const s = payload as { ks: (string | number)[][]; ph: typeof S.phase; ct: number; it: number };
      for (const b of s.ks) unpack(b, true);
      if (S.phase === "intro" && s.ph !== "intro") { S.phase = "count"; S.countT = s.ct; }
      if (S.phase === "count") { S.countT = s.ct; if (s.ph === "race") goRace(); }
      if (S.phase === "intro") S.introT = s.it;
    });
    c.on("broadcast", { event: "fire" }, ({ payload }) => { const f = payload as { id: string; h: number; o: string; tg: string; p: number[]; v: number[]; i: number }; spawnProj(f.id, !!f.h, f.o, f.tg, new THREE.Vector3(f.p[0], f.p[1], f.p[2]), new THREE.Vector3(f.v[0], 0, f.v[1]), f.i); });
    c.on("broadcast", { event: "drop" }, ({ payload }) => { const f = payload as { id: string; o: string; p: number[]; i: number }; spawnNana(f.id, f.o, new THREE.Vector3(f.p[0], f.p[1], f.p[2]), f.i); });
    c.on("broadcast", { event: "rm" }, ({ payload }) => removeAny((payload as { id: string }).id));
    c.on("broadcast", { event: "box" }, ({ payload }) => { const b = track?.boxes[(payload as { b: number }).b]; if (b && b.t <= 0) { b.t = 2; burst(b.p.x, b.p.y, b.p.z, "#ff7ad1", 16, 5); } });
    c.on("broadcast", { event: "cfg" }, ({ payload }) => {
      const cfg = payload as { track: number; cup: boolean; cls: number; host: string };
      hostId = cfg.host; S.trackI = cfg.track; S.cup = cfg.cup; S.cls = cfg.cls; renderLobby();
    });
    c.on("broadcast", { event: "start" }, ({ payload }) => { if (!S.host) startRace(payload as StartMsg); });
    c.on("broadcast", { event: "end" }, ({ payload }) => { if (!S.host) showResults(payload as EndMsg); });
    c.on("broadcast", { event: "hello" }, () => { if (S.host) sendCfg(); });
    await new Promise<void>((res, rej) => { const to = setTimeout(() => rej(new Error("timeout")), 9000); c.subscribe(async (st) => { if (st === "SUBSCRIBED") { clearTimeout(to); await c.track({ name: S.myName || "Gast", ci: S.ci }); if (!host) c.send({ type: "broadcast", event: "hello", payload: {} }); res(); } }); });
    ch = c;
    if (host) sendCfg();
  }
  function sendCfg() { if (S.host) send("cfg", { track: S.trackI, cup: S.cup, cls: S.cls, host: myId }); }
  function leaveOnline() {
    if (ch && sb) void sb.removeChannel(ch);
    ch = null; S.online = false; S.host = true; members.clear(); clearRace(); showMenu();
  }

  // ── race flow ────────────────────────────────────────────────────
  type StartMsg = { track: number; round: number; cls: number; cup: boolean; grid: [string, string, number, number][] };
  type EndMsg = { order: [string, string, number, number, number][] };
  function buildStart(round: number): StartMsg {
    const humans = S.online ? [...members.entries()].map(([id, m]) => [id, m.name || "Gast", m.ci, 0] as [string, string, number, number]) : [[myId, S.myName || tt("Du", "You"), S.ci, 0] as [string, string, number, number]];
    const used = new Set(humans.map((h) => h[2]));
    const free = [0, 1, 2, 3, 4, 5, 6, 7].filter((c) => !used.has(c)).sort(() => Math.random() - 0.5);
    const bots: [string, string, number, number][] = [];
    while (humans.length + bots.length < 8) { const ci = free.length ? free.shift()! : Math.floor(Math.random() * 8); bots.push([`bot${bots.length}`, CHARS[ci].name, ci, 1]); }
    // cup: grid by reverse standings, otherwise humans start at the back
    let grid = [...bots, ...humans];
    if (S.cup && round > 0) grid = grid.sort((a, b) => (cupPts.get(b[0])?.pts || 0) - (cupPts.get(a[0])?.pts || 0));
    return { track: S.cup ? round % 3 : S.trackI, round, cls: S.cls, cup: S.cup, grid };
  }
  function startRace(m: StartMsg) {
    clearRace(); hideMenu(); ui.big.innerHTML = ""; ui.big.style.display = "block";
    S.trackI = m.track; S.round = m.round; S.cls = m.cls; S.cup = m.cup;
    if (m.round === 0) cupPts.clear();
    loadTrack(m.track);
    m.grid.forEach(([id, name, ci, bot], slot) => {
      const k = makeK(id, name, ci, !!bot, id !== myId && (!bot || !S.host));
      k.skill = [0.9, 0.965, 1.0][S.cls] + (Math.random() - 0.5) * 0.03; k.lane = (Math.random() - 0.5) * RW;
      placeGrid(k, slot);
      if (!cupPts.has(id)) cupPts.set(id, { name, ci, pts: 0 });
    });
    lastCount = 0; S.phase = "intro"; S.introT = 3; S.countT = 3.4; S.raceT = 0; S.doneT = -1; S.myFinished = false; S.paused = false; S.endT = -1;
    for (const b of track!.boxes) { b.t = 0; b.mesh.visible = true; b.mesh.scale.setScalar(1); }
    ui.play.forEach((e) => (e.style.display = ""));
    if (S.online && S.host) send("start", m);
    camInit = false;
  }
  function goRace() {
    S.phase = "race"; S.raceT = 0;
    showCount("GO!"); if (track) confetti(track.P[0]);
    tone(1046, 0.6, 0.3, "square");
    for (const k of karts) {
      if (k.remote) continue;
      if (k.bot) { if (Math.random() < 0.25 + S.cls * 0.2) k.mtT = 1.1; continue; }
      if (k.gasAt > 0 && k.gasAt <= 1.45 && k.gasAt >= 0.5 && k.inp.gas) { k.mtT = 1.4; k.speed = 18; if (k.id === myId) { msg(tt("Super-Start!", "Rocket start!")); tone(300, 0.6, 0.25, "sawtooth", 1200); } }
      else if (k.gasAt > 2.3) { k.spinT = 0.8; if (k.id === myId) msg(tt("Abgewürgt – zu früh Gas gegeben!", "Stalled – too early on the gas!")); }
    }
  }
  function updatePlaces() {
    const order = karts.slice().sort((a, b) => (a.finish && b.finish ? a.finish - b.finish : a.finish ? -1 : b.finish ? 1 : b.prog - a.prog));
    order.forEach((k, i) => (k.place = i));
    return order;
  }
  function estimate(k: Kart) { if (k.finish) return k.finish; const left = Math.max(0, LAPS - k.prog) * track!.len; return S.raceT + left / (BASE * CLS[S.cls] * 0.92); }
  function finishRace() {
    const order = updatePlaces().map((k) => [k.id, k.name, k.ci, k.bot ? 1 : 0, r2(estimate(k))] as [string, string, number, number, number]);
    order.sort((a, b) => a[4] - b[4]);
    const m: EndMsg = { order };
    if (S.online) send("end", m);
    showResults(m);
  }
  function showResults(m: EndMsg) {
    S.phase = "results"; ui.big.style.display = "none";
    m.order.forEach(([id, name, ci], i) => { const c = cupPts.get(id) || { name, ci, pts: 0 }; c.pts += PTS[i] || 0; cupPts.set(id, c); });
    const myPlace = m.order.findIndex((o) => o[0] === myId);
    const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
    const rows = m.order.map(([id, name, ci, bot, t], i) => `<tr class="p${i + 1}${id === myId ? " me" : ""}" style="--c:${CHARS[ci].col}"><td class="p">${i + 1}</td><td style="text-align:left">${esc(name)}${bot ? " 🤖" : ""}</td><td class="tm">${fmt(t)}</td><td class="pts">+${PTS[i] || 0}</td></tr>`).join("");
    const last = !S.cup || S.round >= 2;
    let cupTable = "";
    if (S.cup) {
      const st = [...cupPts.entries()].sort((a, b) => b[1].pts - a[1].pts);
      cupTable = `<div class="tb-lbl">${tt("CUP-WERTUNG", "CUP STANDINGS")} · ${tt("Rennen", "Race")} ${S.round + 1}/3</div><table class="tb-stats tk-res">${st.map(([id, c], i) => `<tr class="p${i + 1}${id === myId ? " me" : ""}" style="--c:${CHARS[c.ci].col}"><td class="p">${i + 1}</td><td style="text-align:left">${esc(c.name)}</td><td class="pts">${c.pts}</td></tr>`).join("")}</table>`;
    }
    const cupPlace = S.cup && last ? [...cupPts.entries()].sort((a, b) => b[1].pts - a[1].pts).findIndex(([id]) => id === myId) : -1;
    const head = cupPlace >= 0 ? `<p class="tk-place">${cupPlace === 0 ? tt("CUP-SIEG! 🏆", "CUP WIN! 🏆") : `${tt("Cup-Platz", "Cup place")} ${cupPlace + 1}`}</p>` : `<p class="tk-place">${myPlace >= 0 ? `${myPlace + 1}. ${tt("Platz", "place")}` : tt("Ergebnis", "Results")}</p>`;
    const nextBtn = S.cup && !last ? `<button class="tb-go" data-a="next"><span>${tt("NÄCHSTES RENNEN", "NEXT RACE")} →</span></button>` : `<button class="tb-go" data-a="again"><span>${S.cup ? tt("NEUER CUP", "NEW CUP") : tt("NOCHMAL", "RACE AGAIN")}</span></button>`;
    const buttons = S.online ? (S.host ? nextBtn + `<button class="tb-ghost" data-a="lobby">${tt("Zur Lobby", "To lobby")}</button>` : `<p class="tb-hint">${tt("Der Gastgeber startet das nächste Rennen.", "The host starts the next race.")}</p>`) + `<button class="tb-ghost" data-a="leave">${tt("Raum verlassen", "Leave room")}</button>`
      : nextBtn + `<div class="tb-row"><button class="tb-ghost" data-a="setup">${tt("Strecke wechseln", "Change track")}</button><button class="tb-ghost" data-a="menu">${tt("Hauptmenü", "Main menu")}</button></div>`;
    openPanel(`<div class="tb-panel wide">${head}<table class="tb-stats tk-res"><tr><th></th><th></th><th>${tt("ZEIT", "TIME")}</th><th>${tt("PUNKTE", "PTS")}</th></tr>${rows}</table>${cupTable}${buttons}</div>`);
    if (myPlace === 0) { tone(784, 0.2, 0.25, "square"); setTimeout(() => tone(1046, 0.5, 0.25, "square"), 200); }
  }
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

  let lastCount = 0;
  function simulate(dt: number) {
    S.t += dt;
    if (!track) return;
    track.update(dt, S.t, camera.position);
    if (S.phase === "intro") { S.introT -= dt; if (S.introT <= 0 && (!S.online || S.host)) { S.phase = "count"; S.countT = 3.4; } }
    if (S.phase === "count") {
      S.countT -= dt; const n = Math.ceil(S.countT - 0.4);
      if (n !== lastCount && n > 0 && n <= 3) { lastCount = n; showCount(n); tone(523, 0.2, 0.25, "square"); }
      if (S.countT <= 0.4 && (!S.online || S.host)) goRace();
    }
    if (S.phase === "race") S.raceT += dt;
    const mine = me();
    if (mine && !S.paused && !mine.bot && !mine.finish) readInput(mine.inp);
    for (const k of karts) {
      if (k.remote) { stepRemote(k, dt); continue; }
      if (k.bot || (k.id === myId && k.finish)) botThink(k, dt);
      if (S.phase === "intro" || S.phase === "count") { k.inp.drift = false; k.inp.item = false; if (k.bot) k.inp.gas = false; }
      stepKart(k, dt);
    }
    if (S.phase === "race") { kartCollide(); rubberBand(dt); }
    stepItems(dt);
    updatePlaces();
    for (const k of karts) updateMesh(k, dt);
    stepFx(dt);
    netTick(dt);
    // race end
    if (S.phase === "race" && (!S.online || S.host)) {
      const humans = karts.filter((k) => !k.bot);
      const allDone = humans.length > 0 && humans.every((k) => k.finish > 0), anyDone = humans.some((k) => k.finish > 0);
      if (anyDone && S.doneT < 0) S.doneT = S.t;
      const everyone = karts.every((k) => k.finish > 0);
      if ((allDone && (everyone || S.t - S.doneT > 5)) || (anyDone && S.t - S.doneT > 35)) finishRace();
    }
  }

  // ── camera ───────────────────────────────────────────────────────
  let camInit = false, camYaw = 0, shakeT = 0;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function updateCamera(dt: number) {
    if (!track) return;
    const k = me() || karts[0];
    if (S.phase === "menu" || !k) {
      const P = k ? k.p : track.P[N - 30], a = S.t * 0.18;
      camera.position.set(P.x + Math.sin(a) * 7.5 - 2.5, P.y + 2.6, P.z + Math.cos(a) * 7.5); camera.lookAt(P.x - 2.5, P.y + 0.9, P.z);
      if (camera.fov !== 60) { camera.fov = 60; camera.updateProjectionMatrix(); }
      sun.position.set(P.x + 30, P.y + 80, P.z + 20); sun.target.position.set(P.x, P.y, P.z); return;
    }
    const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
    if (S.phase === "intro") {
      const t = 1 - S.introT / 3, a = k.yaw + Math.PI * (1 - t) * 0.9, d = 26 - t * 18;
      camera.position.set(k.p.x + Math.sin(a) * d, k.p.y + 3 + (1 - t) * 8, k.p.z + Math.cos(a) * d); camera.lookAt(k.p.x, k.p.y + 1, k.p.z);
      camYaw = k.yaw; camInit = false;
    } else {
      const travel = k.spinT > 0 ? camYaw : k.yaw + k.driftDir * 0.12;
      camYaw += wrapA(travel - camYaw) * Math.min(1, dt * (k.driftDir ? 4 : 7));
      const boosting = k.boostT > 0 || k.mtT > 0, back = 6.6 + Math.min(1.6, Math.abs(k.speed) * 0.04) + (boosting ? 0.6 : 0);
      const want = new THREE.Vector3(k.p.x - Math.sin(camYaw) * back, k.p.y + 2.8, k.p.z - Math.cos(camYaw) * back);
      const tr = locate(want, k.idx); if (want.y < tr.y + 1.2) want.y = tr.y + 1.2;
      if (!camInit) { camPos.copy(want); camLook.set(k.p.x + fx * 4, k.p.y + 1.2, k.p.z + fz * 4); camInit = true; }
      camPos.lerp(want, Math.min(1, dt * 9)); camPos.y += (want.y - camPos.y) * Math.min(1, dt * 6);
      camLook.lerp(new THREE.Vector3(k.p.x + Math.sin(camYaw) * 4, k.p.y + 1.1, k.p.z + Math.cos(camYaw) * 4), Math.min(1, dt * 12));
      camera.position.copy(camPos);
      if (S.shake > 0) { shakeT += dt * 50; camera.position.x += Math.sin(shakeT) * S.shake * 0.5; camera.position.y += Math.cos(shakeT * 1.3) * S.shake * 0.4; S.shake = Math.max(0, S.shake - dt * 1.2); }
      camera.lookAt(camLook);
      const fov = 68 + Math.min(10, Math.abs(k.speed) * 0.18) + (boosting ? 8 : 0);
      if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
      ui.fx.style.opacity = boosting ? "1" : "0";
    }
    sun.position.set(k.p.x + 30, k.p.y + 80, k.p.z + 20); sun.target.position.copy(k.p);
  }

  // ── HUD & menus ──────────────────────────────────────────────────
  const hud = document.createElement("div"); hud.className = "tb-hud"; wrap.appendChild(hud);
  hud.innerHTML = `
    <div class="tk-fx"></div>
    <div class="tk-itemslot"></div>
    <div class="tk-lap"><small>${tt("RUNDE", "LAP")}</small><b>1/3</b><span>0:00.00</span></div>
    <svg class="tk-map" viewBox="0 0 200 200"><path class="out"/><path class="in"/><path class="sc"/><g></g></svg>
    <div class="tk-pos"><b>1</b><small>/8</small></div>
    <div class="tk-spd">0 KM/H</div>
    <div class="tk-wrong">${tt("FALSCHE RICHTUNG!", "WRONG WAY!")}</div>
    <div class="tb-msg"><span></span></div>
    <div class="tb-ic l" style="left:126px"><button data-a="pause" aria-label="Pause"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg></button><button data-a="fs" aria-label="${tt("Vollbild", "Fullscreen")}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>
    ${touch ? `<div class="tk-steer"><i></i></div><div class="tk-btns"><button class="d" data-p="drift">DRIFT</button><button class="i" data-p="item">ITEM</button><button class="b" data-p="brake">${tt("BREMSE", "BRAKE")}</button></div>` : ""}
    <div class="tb-big"></div>
    <div class="tb-menu"></div>`;
  const $ = (s: string) => hud.querySelector(s) as HTMLElement;
  const ui = {
    fx: $(".tk-fx"), item: $(".tk-itemslot"), lap: $(".tk-lap b"), time: $(".tk-lap span"), map: $(".tk-map"), mapG: $(".tk-map g"), pos: $(".tk-pos b"), posN: $(".tk-pos small"), spd: $(".tk-spd"), wrong: $(".tk-wrong"),
    msg: $(".tb-msg"), msgT: $(".tb-msg span"), big: $(".tb-big"), menu: $(".tb-menu"),
    play: [$(".tk-itemslot"), $(".tk-lap"), $(".tk-map"), $(".tk-pos"), $(".tk-spd"), $(".tb-ic.l"), ...(touch ? [$(".tk-steer"), $(".tk-btns")] : [])],
  };
  let msgT = 0;
  function msg(t: string) { ui.msgT.textContent = t; ui.msg.style.opacity = "1"; msgT = 3; }
  function banner(big: string, small: string, fin = false) {
    ui.big.style.display = "block";
    const el = document.createElement("div"); el.className = "tk-banner";
    el.innerHTML = `<b class="${fin ? "fin" : ""}">${big}</b>${small ? `<span>${small}</span>` : ""}`;
    ui.big.appendChild(el); setTimeout(() => el.remove(), fin ? 5000 : 2600);
  }
  function showCount(n: number | string) { ui.big.style.display = "block"; const el = document.createElement("div"); el.innerHTML = `<div class="tb-count${typeof n === "string" ? " go" : ""}">${n}</div>`; ui.big.appendChild(el); setTimeout(() => el.remove(), 900); }
  let mapPts: [number, number][] = [], mapScale = 1, mapOx = 0, mapOz = 0;
  function buildMap() {
    const b = track!.bounds, w = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    mapScale = 180 / w; mapOx = (b.minX + b.maxX) / 2; mapOz = (b.minZ + b.maxZ) / 2;
    mapPts = [];
    for (let i = 0; i < N; i += 10) mapPts.push(mp(track!.P[i].x, track!.P[i].z));
    const d = "M" + mapPts.map((p) => p.join(",")).join("L") + "Z";
    ui.map.querySelectorAll("path.out,path.in").forEach((p) => p.setAttribute("d", d));
    ui.map.querySelector("path.sc")!.setAttribute("d", track!.sc.map((c) => "M" + c.P.filter((_, j) => j % 6 === 0 || j === c.M - 1).map((p) => mp(p.x, p.z).join(",")).join("L")).join(""));
  }
  function mp(x: number, z: number): [number, number] { return [Math.round(100 - (x - mapOx) * mapScale), Math.round(100 - (z - mapOz) * mapScale)]; }
  let lastPlace = -1, lastItemHtml = "";
  const fmtT = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
  const ROLL: ItemKey[] = ["turbo", "rocket", "homing", "banana", "shield"];
  function drawHud(dt: number) {
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) ui.msg.style.opacity = "0"; }
    const k = me(); if (!k || S.phase === "menu") return;
    let ih = "";
    if (k.rollT > 0) ih = `<span>${ITEM_ICON[ROLL[Math.floor(S.t * 14) % ROLL.length]]}</span>`;
    else if (k.item) ih = `<span>${ITEM_ICON[k.item === "turbo3" ? "turbo" : k.item]}</span>${k.itemN > 1 ? `<em>×${k.itemN}</em>` : ""}`;
    if (ih !== lastItemHtml) { ui.item.innerHTML = ih; ui.item.classList.toggle("roll", k.rollT > 0); ui.item.title = k.item ? ITEM_NAME[k.item][lang === "en" ? 1 : 0] : ""; lastItemHtml = ih; }
    ui.lap.textContent = `${Math.max(1, Math.min(LAPS, k.lap + 1))}/${LAPS}`;
    ui.time.textContent = fmtT(k.finish || S.raceT);
    if (k.place !== lastPlace) { ui.pos.textContent = `${k.place + 1}`; ui.pos.className = k.place < 3 ? "pop" : k.place < 5 ? "mid pop" : "low pop"; lastPlace = k.place; ui.posN.textContent = `/${karts.length}`; }
    ui.spd.textContent = `${Math.round(Math.abs(k.speed) * 3.6)} KM/H`;
    ui.wrong.style.display = k.wrongT > 1.2 && !k.finish ? "block" : "none";
    // minimap dots
    let g = "";
    for (const o of karts.slice().sort((a, b) => (a.id === myId ? 1 : b.id === myId ? -1 : 0))) { const [x, y] = mp(o.p.x, o.p.z); g += `<circle cx="${x}" cy="${y}" r="${o.id === myId ? 7 : 5}" fill="${CHARS[o.ci].col}" class="${o.id === myId ? "me" : ""}"/>`; }
    ui.mapG.innerHTML = g;
  }
  // engine audio
  function audioTick() {
    if (!ac || !eng || !engG || !skidG) return;
    const k = me(), racing = k && S.phase !== "menu" && S.phase !== "results" && !S.paused;
    const sp = k ? Math.abs(k.speed) : 0;
    eng.frequency.setTargetAtTime(55 + sp * 4.5 + (k && (k.boostT > 0 || k.mtT > 0) ? 45 : 0), ac.currentTime, 0.05);
    engG.gain.setTargetAtTime(racing ? 0.035 + sp * 0.0012 : 0, ac.currentTime, 0.1);
    skidG.gain.setTargetAtTime(racing && k!.driftDir && k!.ground ? 0.05 : 0, ac.currentTime, 0.05);
  }

  // fullscreen
  type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
  const isFs = () => !!(document.fullscreenElement || (document as FsDoc).webkitFullscreenElement || wrap.classList.contains("tb-fake"));
  function fakeFs(onOff: boolean) { wrap.classList.toggle("tb-fake", onOff); document.documentElement.style.overflow = onOff ? "hidden" : ""; if (onOff) window.scrollTo(0, 0); setTimeout(resize, 50); }
  function toggleFs() {
    const r = wrap as FsEl;
    if (isFs()) { if (wrap.classList.contains("tb-fake")) fakeFs(false); else if (document.exitFullscreen) void document.exitFullscreen().catch(() => {}); else (document as FsDoc).webkitExitFullscreen?.(); return; }
    if (r.requestFullscreen) r.requestFullscreen({ navigationUI: "hide" }).then(() => { const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }; if (touch) o.lock?.("landscape").catch(() => {}); }).catch(() => fakeFs(true));
    else if (r.webkitRequestFullscreen) r.webkitRequestFullscreen();
    else fakeFs(true);
  }
  on(document, "fullscreenchange", () => setTimeout(resize, 50));
  cleanups.push(() => fakeFs(false));

  const controlsHtml = () => `<details class="tb-keys"><summary>${tt("STEUERUNG", "CONTROLS")}</summary><div>
    <b>W / ↑</b><span>${tt("Gas", "accelerate")}</span>
    <b>S / ↓</b><span>${tt("Bremse, rückwärts · beim Item: nach hinten werfen", "brake, reverse · with item: throw backwards")}</span>
    <b>A D / ← →</b><span>${tt("lenken", "steer")}</span>
    <b>${tt("Leertaste", "Space")} / Shift</b><span>${tt("hüpfen & driften (halten) – loslassen für Mini-Turbo: blau → orange → lila · auf Schanzen: Trick", "hop & drift (hold) – release for a mini-turbo: blue → orange → purple · on ramps: trick")}</span>
    <b>E / Strg</b><span>${tt("Item benutzen", "use item")}</span>
    <b>${tt("Start", "Start")}</b><span>${tt("Gas genau bei der „1“ drücken = Super-Start", "press gas right at the “1” = rocket start")}</span>
    <b>F · Esc</b><span>${tt("Vollbild · Pause", "fullscreen · pause")}</span>
    <b>🎮</b><span>${tt("A/RT Gas · B/LT Bremse · LB/RB Drift · X/Y Item", "A/RT gas · B/LT brake · LB/RB drift · X/Y item")}</span>
    <b>📱</b><span>${tt("fährt automatisch · links lenken · Drift & Item rechts · Super-Start: Drift bei der „1“ drücken", "drives by itself · steer on the left · drift & item on the right · rocket start: press drift at the “1”")}</span></div></details>`;
  let menuView: "main" | "setup" | "online" | "lobby" = "main";
  function openPanel(html: string) { ui.menu.className = "tb-menu center"; ui.menu.innerHTML = html; ui.menu.style.display = "flex"; }
  function hideMenu() { ui.menu.style.display = "none"; }
  function showMenu() { S.phase = "menu"; S.paused = false; ui.big.style.display = "none"; ui.play.forEach((e) => (e.style.display = "none")); ui.fx.style.opacity = "0"; menuView = "main"; renderMenu(); }
  const chips = (k: string, opts: [number, string, string?][], cur: number) => `<div class="tb-chips" data-k="${k}">${opts.map(([v, l, sub]) => `<button data-v="${v}" class="${cur === v ? "on" : ""}"><span>${l}${sub ? `<small>${sub}</small>` : ""}</span></button>`).join("")}</div>`;
  const nameIn = () => `<label class="tb-name">NAME<input maxlength="16" value="${esc(S.myName || "")}" placeholder="${tt("Dein Name", "Your name")}"></label>`;
  const stat = (v: number) => (v > 1.02 ? "▲" : v < 0.98 ? "▽" : "•");
  const drivers = () => `<div class="tb-lbl">${tt("FAHRER", "DRIVER")}</div><div class="tk-drivers">${CHARS.map((c, i) => `<button data-ci="${i}" class="${S.ci === i ? "on" : ""}"><i style="background:${c.col}"></i><span>${c.name}</span><small>${tt("Tempo", "Spd")} ${stat(c.spd)} ${tt("Besch.", "Acc")} ${stat(c.accel)}</small></button>`).join("")}</div>`;
  const tracks = () => `<div class="tb-lbl">${tt("STRECKE", "TRACK")}</div><div class="tk-tracks">${TRACKS.map((t, i) => `<button data-tr="${i}" class="${t.key}${!S.cup && S.trackI === i ? " on" : ""}"><b></b><span>${tt(t.de, t.en)}</span></button>`).join("")}</div>`;
  const classes = () => `<div class="tb-lbl">${tt("KLASSE", "CLASS")}</div>${chips("cls", [[0, tt("Leicht", "Easy"), "100 ccm"], [1, "Normal", "150 ccm"], [2, "Turbo", "200 ccm"]], S.cls)}`;
  const modes = () => chips("cup", [[0, tt("Einzelrennen", "Single race")], [1, tt("Cup · 3 Strecken", "Cup · 3 tracks")]], S.cup ? 1 : 0);
  function setPreview() { if (S.phase !== "menu") return; clearRace(); loadTrack(S.trackI); const k = makeK(myId, S.myName || "", S.ci, false, false); placeGrid(k, 0); }
  function renderMenu() {
    if (menuView === "main") {
      ui.menu.className = "tb-menu"; ui.menu.style.display = "block";
      ui.menu.innerHTML = `<div class="tb-main-l"><h1 class="tb-logo"><span class="a">CART</span><span class="b">RACE</span></h1><p class="tb-tag">${tt("Driften · Items · 8 Fahrer · 3 Strecken", "Drifting · items · 8 racers · 3 tracks")}</p>
        ${nameIn()}
        <button class="tb-item hot" data-a="setup"><i>🏁</i><span><b>${tt("RENNEN", "RACE")}</b><small>${tt("Einzelrennen oder Cup gegen Bots", "Single race or cup vs bots")}</small></span></button>
        <button class="tb-item hot2" data-a="online"><i>🌐</i><span><b>ONLINE</b><small>${tt("Mit Freunden per Code · bis 8 Spieler", "With friends via code · up to 8 players")}</small></span></button>
        <button class="tb-item" data-a="fs"><i>⛶</i><span><b>${tt("VOLLBILD", "FULLSCREEN")}</b><small>${tt("Für das beste Erlebnis", "For the best experience")}</small></span></button>
        ${controlsHtml()}</div>`;
      return;
    }
    if (menuView === "setup") openPanel(`<div class="tb-panel wide"><div class="tb-ph"><h2>${tt("RENNEN", "RACE")}</h2><button class="tb-ghost tb-back" data-a="back">✕</button></div>
      ${drivers()}${modes()}${S.cup ? "" : tracks()}${classes()}
      <button class="tb-go" data-a="go"><span>${tt("LOS GEHT'S!", "LET'S GO!")}</span></button></div>`);
    if (menuView === "online") openPanel(`<div class="tb-panel"><div class="tb-ph"><h2>ONLINE</h2><button class="tb-ghost tb-back" data-a="back">✕</button></div>${nameIn()}
      <button class="tb-go" data-a="create"><span>${tt("RAUM ERSTELLEN", "CREATE ROOM")}</span></button>
      <div class="tb-lbl">${tt("BEITRETEN", "JOIN")}</div>
      <div class="tb-join"><input class="tb-code" maxlength="5" placeholder="CODE"><button class="tb-go orange" data-a="join" style="padding:10px 18px;font-size:18px"><span>${tt("LOS", "GO")}</span></button></div>
      <p class="tb-hint">${tt("Freie Plätze füllen Bots auf (8 Fahrer pro Rennen).", "Bots fill the empty seats (8 racers per race).")}</p></div>`);
    if (menuView === "lobby") renderLobby();
  }
  function renderLobby() {
    if (menuView !== "lobby" || S.phase !== "menu") return;
    const ms = [...members.entries()];
    const list = ms.map(([id, m]) => `<li><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${CHARS[m.ci]?.col || "#fff"};margin-right:6px"></span><span>${esc(m.name || "?")}</span>${id === myId ? `<i>${tt("DU", "YOU")}</i>` : id === hostId ? `<i>HOST</i>` : ""}</li>`).join("") + Array.from({ length: Math.max(0, 8 - ms.length) }, () => `<li class="bot"><span>🤖 Bot</span></li>`).join("");
    openPanel(`<div class="tb-panel wide"><div class="tb-ph"><h2>${tt("RAUM", "ROOM")}</h2><button class="tb-ghost tb-back" data-a="leave">✕</button></div>
      <div class="tb-codebox"><span class="tb-codebig">${S.code}</span><button class="tb-ghost" data-a="copy">${tt("Kopieren", "Copy")}</button></div>
      <p class="tb-hint">${tt("Freunde öffnen Cart Race → Online → Code eingeben.", "Friends open Cart Race → Online → enter the code.")}</p>
      ${drivers()}
      ${S.host ? `${modes()}${S.cup ? "" : tracks()}${classes()}` : `<p class="tb-hint">${S.cup ? "Cup" : tt(TRACKS[S.trackI].de, TRACKS[S.trackI].en)} · ${["100", "150", "200"][S.cls]} ccm</p>`}
      <div class="tb-team blue"><ul>${list}</ul></div>
      ${S.host ? `<button class="tb-go" data-a="start"><span>${tt("RENNEN STARTEN", "START RACE")}</span></button>` : `<p class="tb-hint">${tt("Warte auf den Gastgeber …", "Waiting for the host …")}</p>`}</div>`);
  }
  function togglePause() {
    if (S.phase === "menu" || S.phase === "results") return;
    S.paused = !S.paused;
    if (S.paused) openPanel(`<div class="tb-panel"><div class="tb-ph"><h2>${tt("PAUSE", "PAUSED")}</h2></div>${S.online ? `<p class="tb-hint">${tt("Online läuft das Rennen weiter.", "Online, the race keeps running.")}</p>` : ""}<button data-a="resume" class="tb-go"><span>${tt("WEITER", "RESUME")}</span></button><div class="tb-row"><button data-a="restart" class="tb-ghost">${tt("Neu starten", "Restart")}</button><button data-a="fs" class="tb-ghost">${tt("Vollbild", "Fullscreen")}</button><button data-a="quit" class="tb-ghost">${tt("Verlassen", "Quit")}</button></div>${controlsHtml()}</div>`);
    else hideMenu();
  }
  const newCode = () => { const A2 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; const r = crypto.getRandomValues(new Uint32Array(5)); for (const x of r) s += A2[x % A2.length]; return s; };
  on(hud, "input", (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.closest(".tb-name")) { S.myName = t.value.trim().slice(0, 16); try { localStorage.setItem(NAME_KEY, S.myName); } catch { /* ignore */ } if (ch) void ch.track({ name: S.myName, ci: S.ci }); }
  });
  on(hud, "click", async (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null; if (!el || el.closest(".tk-btns")) return;
    audioOn(); tone(1200, 0.05, 0.04, "square");
    if (el.dataset.ci !== undefined) { S.ci = +el.dataset.ci; try { localStorage.setItem(CHAR_KEY, String(S.ci)); } catch { /* ignore */ } if (ch) void ch.track({ name: S.myName, ci: S.ci }); setPreview(); if (menuView === "lobby") renderLobby(); else renderMenu(); return; }
    if (el.dataset.tr !== undefined) { S.trackI = +el.dataset.tr; setPreview(); if (menuView === "lobby") { sendCfg(); renderLobby(); } else renderMenu(); return; }
    const seg = el.closest(".tb-chips") as HTMLElement | null;
    if (seg) { const k = seg.dataset.k, v = +el.dataset.v!; if (k === "cls") S.cls = v; if (k === "cup") { S.cup = v === 1; if (S.cup) { S.trackI = 0; setPreview(); } } if (menuView === "lobby") { sendCfg(); renderLobby(); } else renderMenu(); return; }
    const a = el.dataset.a;
    if (a === "setup") { if (S.phase === "results") { clearRace(); S.phase = "menu"; ui.play.forEach((x) => (x.style.display = "none")); setPreview(); } menuView = "setup"; renderMenu(); }
    else if (a === "online") { menuView = "online"; renderMenu(); }
    else if (a === "back" || a === "menu") { if (a === "menu") { clearRace(); showMenu(); setPreview(); return; } menuView = "main"; renderMenu(); }
    else if (a === "go") { if (touch && !isFs()) toggleFs(); startRace(buildStart(0)); }
    else if (a === "again") { if (S.online && !S.host) return; startRace(buildStart(0)); }
    else if (a === "next") { startRace(buildStart(S.round + 1)); }
    else if (a === "restart") { S.paused = false; if (S.online) { togglePause(); return; } startRace(buildStart(S.round)); }
    else if (a === "lobby") { clearRace(); S.phase = "menu"; ui.play.forEach((x) => (x.style.display = "none")); setPreview(); menuView = "lobby"; renderLobby(); }
    else if (a === "create") { el.disabled = true; menuView = "lobby"; try { await connect(newCode(), true); } catch { msg(tt("Verbindung fehlgeschlagen.", "Connection failed.")); menuView = "online"; } renderMenu(); }
    else if (a === "join") {
      const code = ((hud.querySelector(".tb-code") as HTMLInputElement)?.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 4) { msg(tt("Bitte den Code eingeben.", "Please enter the code.")); return; }
      el.disabled = true; menuView = "lobby";
      try { await connect(code, false); } catch { msg(tt("Verbindung fehlgeschlagen.", "Connection failed.")); menuView = "online"; }
      renderMenu();
    }
    else if (a === "copy") { try { await navigator.clipboard.writeText(S.code); msg(tt("Code kopiert!", "Code copied!")); } catch { /* ignore */ } }
    else if (a === "start") { if (members.size > 8) { msg(tt("Maximal 8 Spieler.", "8 players max.")); return; } if (touch && !isFs()) toggleFs(); startRace(buildStart(0)); }
    else if (a === "leave") leaveOnline();
    else if (a === "fs") toggleFs();
    else if (a === "pause" || a === "resume") togglePause();
    else if (a === "quit") { S.paused = false; if (S.online) leaveOnline(); else { clearRace(); showMenu(); setPreview(); } }
  });
  if (touch) {
    const st = $(".tk-steer"), knob = st.querySelector("i") as HTMLElement;
    let sid = -1, sx = 0;
    on(st, "pointerdown", (e: PointerEvent) => { sid = e.pointerId; sx = e.clientX; st.setPointerCapture(e.pointerId); audioOn(); });
    on(st, "pointermove", (e: PointerEvent) => { if (e.pointerId !== sid) return; pad.x = Math.max(-1, Math.min(1, (e.clientX - sx) / 60)); knob.style.setProperty("--x", `${pad.x * 55}px`); });
    const up = (e: PointerEvent) => { if (e.pointerId !== sid) return; sid = -1; pad.x = 0; knob.style.setProperty("--x", "0px"); };
    on(st, "pointerup", up); on(st, "pointercancel", up);
    hud.querySelectorAll(".tk-btns button").forEach((b) => {
      const k = (b as HTMLElement).dataset.p as "drift" | "item" | "brake";
      const down = (e: Event) => { e.preventDefault(); pad[k] = true; b.classList.add("on"); audioOn(); };
      const off = () => { pad[k] = false; b.classList.remove("on"); };
      on(b as HTMLElement, "pointerdown", down); on(b as HTMLElement, "pointerup", off); on(b as HTMLElement, "pointercancel", off); on(b as HTMLElement, "pointerleave", off);
    });
  }

  // ── loop ─────────────────────────────────────────────────────────
  let last = performance.now(), raf = 0, acc = 0;
  const STEP = 1 / 120;
  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!S.paused || S.online) { acc += dt; let n = 0; while (acc >= STEP && n < 14) { simulate(STEP); acc -= STEP; n++; } if (n >= 14) acc = 0; }
    updateCamera(dt); drawHud(dt); audioTick();
    composer.render();
  }
  loadTrack(0); setPreview(); showMenu();
  frame();
  (root as HTMLElement & { __tk?: unknown }).__tk = { S, karts, get track() { return track; }, simulate, startRace, buildStart, me, keys, botThink, finishRace, camera, members, connect, projs, nanas, useItem, renderer };

  return () => {
    alive = false; cancelAnimationFrame(raf);
    for (const c of cleanups) c();
    if (ch && sb) void sb.removeChannel(ch);
    void ac?.close();
    renderer.dispose(); pmrem.dispose();
    root.innerHTML = "";
  };
}
