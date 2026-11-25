import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { SUPA_KEY, SUPA_URL, getName } from "@/lib/leaderboard";
import { A, buildArena } from "./arena";
import { makeBallMesh, makeCarMesh, type CarMesh } from "./car";
import { CSS } from "./ui";

type Lang = "de" | "en";
type Inp = { T: number; S: number; B: boolean; J: boolean; slide: boolean; roll: number; P: number };
type Car = {
  id: string; name: string; team: 0 | 1; bot: boolean; remote: boolean; diff: number;
  p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; yaw: number; ground: boolean;
  boost: number; boosting: boolean; jumpT: number; holdT: number; w: THREE.Vector3; n: THREE.Vector3; flipT: number; flipAxis: THREE.Vector3; flipped: boolean; prevJ: boolean;
  dead: number; hitCd: number; mesh: CarMesh; inp: Inp; slot: number; upT: number;
  goals: number; saves: number; shots: number; air?: { x: number; y: number; z: number }; flipNext?: boolean; kickFlip?: boolean; tgt?: { p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; t: number; b: boolean };
};

// physics scaled from Rocket League's measured values (car length 118 uu ≈ 3.7 m here, 1 uu ≈ 0.0314 m)
const JUMP_V = 9.2, JUMP_HOLD = 45.8, DODGE_V = 15.7, FLIP_T = 0.65, BOOST_A = 31;
const BALL_R = 2.1, G = 20.4, CAR_HALF = new THREE.Vector3(1.05, 0.55, 1.85), CAR_UP = 0.6;
const MAX_DRIVE = 28, MAX_CAR = 46, SUPERSONIC = 40, MATCH = 300;
const NAME_KEY = "geografik:mpname";

export async function mountTurboball(root: HTMLElement, opts: { lang: Lang }) {
  const lang = opts.lang, tt = (de: string, en: string) => (lang === "en" ? en : de);
  const touch = matchMedia("(pointer: coarse)").matches;
  let alive = true;
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(el: Window | HTMLElement | Document, ev: K | string, fn: (e: never) => void, o?: AddEventListenerOptions) => { el.addEventListener(ev, fn as EventListener, o); cleanups.push(() => el.removeEventListener(ev, fn as EventListener, o)); };

  // ── renderer ─────────────────────────────────────────────────────
  const style = document.createElement("style"); style.textContent = CSS; root.appendChild(style);
  const wrap = document.createElement("div"); wrap.className = "tb-root"; root.appendChild(wrap);
  const renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  wrap.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#070a16", 160, 700);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(touch ? 80 : 75, 1, 0.2, 2000);
  scene.add(new THREE.HemisphereLight("#9fb6ff", "#20301f", 0.7));
  const sun = new THREE.DirectionalLight("#f2f5ff", 2.6); sun.position.set(30, 80, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 70, bottom: -70, near: 10, far: 200 }); sun.shadow.bias = -0.0005;
  scene.add(sun);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.55, 0.9); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const arena = buildArena(scene);
  const ballMesh = makeBallMesh(BALL_R); scene.add(ballMesh);
  // showroom car for the main menu (on a glowing turntable)
  const show = makeCarMesh(0, 0); show.flame.visible = true; scene.add(show.group);
  const SHOW = new THREE.Vector3(7, 0, -6);
  show.group.position.copy(SHOW); show.group.scale.setScalar(1.25);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.12, 48), new THREE.MeshStandardMaterial({ color: "#11162a", metalness: 0.8, roughness: 0.3 }));
  const discRing = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.06, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.4, 3), toneMapped: false }));
  discRing.rotation.x = Math.PI / 2; discRing.position.y = 0.12; disc.position.copy(SHOW).setY(0.06); discRing.position.x = SHOW.x; discRing.position.z = SHOW.z; scene.add(disc, discRing);
  const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.35, depthWrite: false }));
  scene.add(ballShadow);
  const resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize(); on(window, "resize", resize);

  // ── audio ────────────────────────────────────────────────────────
  let ac: AudioContext | null = null, master: GainNode | null = null, eng: OscillatorNode | null = null, engG: GainNode | null = null, boostG: GainNode | null = null, crowdG: GainNode | null = null;
  const noiseBuf = () => { const b = ac!.createBuffer(1, ac!.sampleRate * 2, ac!.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  function audioOn() {
    if (ac) { void ac.resume(); return; }
    try {
      ac = new AudioContext(); master = ac.createGain(); master.gain.value = localStorage.getItem("kt-sound") === "0" ? 0 : 0.5; master.connect(ac.destination);
      eng = ac.createOscillator(); eng.type = "sawtooth"; engG = ac.createGain(); engG.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
      eng.connect(lp); lp.connect(engG); engG.connect(master); eng.start();
      const n = ac.createBufferSource(); n.buffer = noiseBuf(); n.loop = true; const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 0.6;
      boostG = ac.createGain(); boostG.gain.value = 0; n.connect(bp); bp.connect(boostG); boostG.connect(master); n.start();
      const cn = ac.createBufferSource(); cn.buffer = noiseBuf(); cn.loop = true; const cl = ac.createBiquadFilter(); cl.type = "lowpass"; cl.frequency.value = 500;
      crowdG = ac.createGain(); crowdG.gain.value = 0.05; cn.connect(cl); cl.connect(crowdG); crowdG.connect(master); cn.start();
    } catch { ac = null; }
  }
  function tone(f: number, d: number, v = 0.2, type: OscillatorType = "sine", f2?: number) {
    if (!ac || !master) return;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; if (f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + d);
    g.gain.setValueAtTime(v, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d); o.connect(g); g.connect(master); o.start(); o.stop(ac.currentTime + d + 0.02);
  }
  function thump(v: number) {
    if (!ac || !master) return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf(); const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 300 + v * 40; const g = ac.createGain();
    g.gain.setValueAtTime(Math.min(0.8, 0.15 + v / 40), ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25); s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(ac.currentTime + 0.3);
    tone(90 + v * 2, 0.18, Math.min(0.5, v / 50), "sine", 40);
  }
  const cheer = (v: number, d: number) => { if (crowdG && ac) { crowdG.gain.cancelScheduledValues(ac.currentTime); crowdG.gain.setTargetAtTime(v, ac.currentTime, 0.1); crowdG.gain.setTargetAtTime(0.05, ac.currentTime + d, 1); } };

  // ── state ────────────────────────────────────────────────────────
  const ball = { p: new THREE.Vector3(0, BALL_R, 0), v: new THREE.Vector3(), last: "" as string, lastTeam: -1, localHitT: -9 };
  const cars: Car[] = [];
  const S = {
    phase: "menu" as "menu" | "count" | "play" | "goal" | "end",
    t: 0, clock: MATCH, ot: false, score: [0, 0] as [number, number], countT: 0, goalT: 0, lastScorer: "", lastTeam: 0,
    ballCam: true, paused: false, mode: 1, diff: 1, online: false, host: true, code: "", me: "", myName: "", shake: 0,
  };
  const myId = Math.random().toString(36).slice(2, 10);
  S.me = myId;
  try { S.myName = (localStorage.getItem(NAME_KEY) || getName() || "").slice(0, 16); } catch { /* ignore */ }

  function makeCar(id: string, name: string, team: 0 | 1, bot: boolean, remote: boolean, slot: number): Car {
    const mesh = makeCarMesh(team, slot);
    scene.add(mesh.group);
    const label = nameSprite(name, team); mesh.group.add(label); label.position.y = 2.6; mesh.name = label;
    const c: Car = { id, name, team, bot, remote, diff: S.diff, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), yaw: 0, ground: true, boost: 33, boosting: false, jumpT: 0, holdT: 0, w: new THREE.Vector3(), n: new THREE.Vector3(0, 1, 0), flipT: 0, flipAxis: new THREE.Vector3(), flipped: false, prevJ: false, dead: 0, hitCd: 0, mesh, inp: { T: 0, S: 0, B: false, J: false, slide: false, roll: 0, P: 0 }, slot, upT: 0, goals: 0, saves: 0, shots: 0 };
    cars.push(c);
    return c;
  }
  function removeCar(c: Car) { scene.remove(c.mesh.group); const i = cars.indexOf(c); if (i >= 0) cars.splice(i, 1); }
  function nameSprite(text: string, team: 0 | 1) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d")!;
    g.font = "800 30px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,.7)"; g.strokeText(text, 128, 32); g.fillStyle = team === 0 ? "#8ec2ff" : "#ffbe85"; g.fillText(text, 128, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(4, 1, 1); s.renderOrder = 10;
    return s;
  }
  const me = () => cars.find((c) => c.id === myId) || null;

  // kickoff spots per team (blue at -z)
  const SPOTS: [number, number][][] = [[[0, -40]], [[-18, -36], [18, -36]], [[-18, -36], [18, -36], [0, -50]]];
  function kickoff() {
    ball.p.set(0, BALL_R, 0); ball.v.set(0, 0, 0); ball.last = ""; ball.lastTeam = -1;
    for (const team of [0, 1] as const) {
      const list = cars.filter((c) => c.team === team).sort((a, b) => a.slot - b.slot);
      const spots = SPOTS[Math.min(2, Math.max(list.length, 1) - 1)].slice();
      list.forEach((c, i) => {
        const [x, z] = spots[i % spots.length] || [i * 6 - 6, -50];
        const sz = team === 0 ? 1 : -1;
        c.p.set(team === 0 ? x : -x, 0, z * sz); c.v.set(0, 0, 0); c.yaw = Math.atan2(-c.p.x, -c.p.z); c.q.setFromEuler(new THREE.Euler(0, c.yaw, 0)); c.ground = true; c.n.set(0, 1, 0); c.boost = 33; c.dead = 0; c.flipT = 0; c.flipped = false; c.mesh.group.visible = true;
      });
    }
    S.phase = "count"; S.countT = 3; for (const p of arena.pads) p.t = 0; lastCount = -1;
    const m0 = me(); if (m0) { camYaw = Math.atan2(-m0.p.x, -m0.p.z); camPos.set(m0.p.x - Math.sin(camYaw) * 10.5, 3.4, m0.p.z - Math.cos(camYaw) * 10.5); }
    beep(3);
  }
  let lastBeep = 0;
  function beep(n: number) { if (n !== lastBeep) { lastBeep = n; tone(n > 0 ? 660 : 990, n > 0 ? 0.15 : 0.4, 0.25, "square"); } }

  // ── arena collisions ─────────────────────────────────────────────
  // The arena as a distance field: positive inside, with round fillets (radius FIL) between floor, walls and
  // ceiling – so balls roll up the curves and cars drive onto the walls like in the real game.
  const FIL = A.FIL;
  const fil = (a: number, b: number) => (a < FIL && b < FIL ? FIL - Math.hypot(FIL - a, FIL - b) : Math.min(a, b));
  function sdf(x: number, y: number, z: number) {
    const { W, L, H, RC, GW, GH, GD } = A;
    const mouth = Math.abs(x) < GW / 2 && y < GH;
    if (mouth && Math.abs(z) > L / 2) return Math.min(GW / 2 - Math.abs(x), GH - y, L / 2 + GD - Math.abs(z), y); // inside a goal
    let a: number;
    if (mouth) a = W / 2 - Math.abs(x); // no end wall in front of the goal
    else { const qx = Math.abs(x) - (W / 2 - RC), qz = Math.abs(z) - (L / 2 - RC); a = RC - (Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0)); }
    return Math.min(fil(a, y), fil(a, H - y));
  }
  const gradN = new THREE.Vector3();
  function grad(x: number, y: number, z: number, out = gradN) {
    const e = 0.04;
    out.set(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e));
    const l = out.length(); if (l < 1e-6) out.set(0, 1, 0); else out.divideScalar(l);
    return out;
  }
  /** Pushes a sphere out of the arena surface. Returns impact speed (0 when nothing was hit). */
  function collide(p: THREE.Vector3, v: THREE.Vector3, r: number, e: number, fr = 0.97) {
    let hit = 0;
    for (let k = 0; k < 2; k++) {
      const d = sdf(p.x, p.y, p.z); if (d >= r) break;
      const n = grad(p.x, p.y, p.z);
      p.addScaledVector(n, r - d);
      const vn = v.dot(n);
      if (vn < 0) { v.addScaledVector(n, -vn); v.multiplyScalar(fr); v.addScaledVector(n, -e * vn); hit = Math.max(hit, -vn); }
    }
    return hit;
  }

  // ── car physics ──────────────────────────────────────────────────
  const fwdV = new THREE.Vector3(), upV = new THREE.Vector3(), rgtV = new THREE.Vector3(), tq = new THREE.Quaternion(), tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
  const axes = (c: Car) => { fwdV.set(0, 0, 1).applyQuaternion(c.q); upV.set(0, 1, 0).applyQuaternion(c.q); rgtV.set(-1, 0, 0).applyQuaternion(c.q); };
  function stepCar(c: Car, dt: number) {
    if (c.dead > 0) { c.dead -= dt; if (c.dead <= 0) respawn(c); return; }
    const I = c.inp, frozen = S.phase === "count";
    const jumpEdge = I.J && !c.prevJ; c.prevJ = I.J;
    c.hitCd = Math.max(0, c.hitCd - dt);
    if (frozen) { c.v.set(0, 0, 0); return; }
    if (c.ground) {
      // driving on any surface (floor, ramps, walls): forward lies in the surface plane, up is the surface normal
      const n = c.n;
      fT.set(0, 0, 1).applyQuaternion(c.q); fT.addScaledVector(n, -fT.dot(n));
      if (fT.lengthSq() < 1e-4) fT.set(0, 0, 1).addScaledVector(n, -n.z); fT.normalize();
      sT.crossVectors(n, fT);
      let vf = c.v.dot(fT), vs = c.v.dot(sT);
      const boosting = I.B && c.boost > 0;
      if (boosting) { vf += BOOST_A * dt; c.boost = Math.max(0, c.boost - 33.3 * dt); }
      if (I.T > 0.05) vf += vf < -0.5 ? 50 * dt * I.T : Math.max(0, 34 * (1 - vf / MAX_DRIVE)) * I.T * dt;
      else if (I.T < -0.05) vf += vf > 0.5 ? -50 * dt * -I.T : -Math.max(0, 18 * (1 + vf / 14)) * -I.T * dt;
      else if (!boosting) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 7 * dt);
      const sp = Math.abs(vf), steerRate = (3.0 - Math.min(1.6, sp / 20)) * (I.slide ? 1.35 : 1);
      tq.setFromAxisAngle(n, -I.S * steerRate * Math.min(1, sp / 3 + 0.15) * Math.sign(vf || 1) * dt); fT.applyQuaternion(tq);
      sT.crossVectors(n, fT);
      vs *= Math.exp(-(I.slide ? 1.3 : 14) * dt);
      // gravity along the surface (slows you down on walls and ramps)
      const gf = -G * fT.y, gs = -G * sT.y; vf += gf * dt; vs += gs * dt;
      vf = Math.max(-16, Math.min(MAX_CAR, vf));
      c.v.copy(fT).multiplyScalar(vf).addScaledVector(sT, vs);
      c.boosting = boosting;
      c.p.addScaledVector(c.v, dt);
      // stay on the surface
      const d = sdf(c.p.x, c.p.y, c.p.z), n2 = grad(c.p.x, c.p.y, c.p.z, tv2);
      const pullAway = -G * n2.y; // > 0: gravity pulls the car off (ceiling, overhang)
      if (d > 0.9 || pullAway > STICK || (n2.y < 0.35 && c.v.length() < 5)) {
        c.ground = false; c.jumpT = 0.3; c.flipped = false; c.holdT = 0; c.w.set(0, 0, 0);
      } else {
        c.p.addScaledVector(n2, -d); c.n.copy(n2);
        c.v.addScaledVector(n2, -c.v.dot(n2));
        fT.addScaledVector(n2, -fT.dot(n2)).normalize();
        setBasis(c, fT, n2);
      }
      c.yaw = Math.atan2(fT.x, fT.z);
      // jump along the car's up axis; holding the button up to 0.2 s jumps higher (Rocket League)
      if (jumpEdge) { c.v.addScaledVector(c.n, JUMP_V); c.p.addScaledVector(c.n, 0.08); c.ground = false; c.jumpT = 0; c.holdT = 0.2; c.flipped = false; c.w.set(0, 0, 0); tone(300, 0.08, 0.06, "triangle"); }
      if (c.ground) { padCheck(c); return; }
      return;
    } else {
      c.jumpT += dt;
      if (c.holdT > 0) { if (I.J) { axes(c); c.v.addScaledVector(upV, JUMP_HOLD * dt); c.holdT -= dt; } else c.holdT = 0; }
      // second jump within 1.25 s: flip in the stick direction, otherwise a double jump
      if (jumpEdge && !c.flipped && c.jumpT < 1.25) {
        c.flipped = true; c.holdT = 0;
        if (Math.abs(I.T) > 0.4 || Math.abs(I.S) > 0.4) {
          axes(c);
          const yaw = Math.atan2(fwdV.x, fwdV.z);
          const lx = -I.S, lz = I.T, l = Math.hypot(lx, lz) || 1;
          const dx = (Math.sin(yaw) * lz + Math.cos(yaw) * lx) / l, dz = (Math.cos(yaw) * lz - Math.sin(yaw) * lx) / l;
          c.v.x += dx * DODGE_V; c.v.z += dz * DODGE_V; c.v.y = Math.max(0, c.v.y) * 0.15;
          c.flipT = FLIP_T; c.flipAxis.set(dz, 0, -dx).normalize(); c.w.set(0, 0, 0);
          tone(420, 0.12, 0.08, "triangle", 220);
        } else { axes(c); c.v.addScaledVector(upV, JUMP_V); tone(380, 0.08, 0.06, "triangle"); }
      }
      if (c.flipT > 0) {
        const k = Math.min(c.flipT, dt); c.flipT -= dt;
        tq.setFromAxisAngle(c.flipAxis, (Math.PI * 2 * k) / FLIP_T); c.q.premultiply(tq);
      } else {
        // air control with angular acceleration, damping and a 5.5 rad/s cap (car-local axes: x pitch, y yaw, z roll)
        const ip = -I.T, iy = I.roll ? 0 : -I.S, ir = I.roll ? I.S : 0;
        c.w.x += (ip * 12.5 - c.w.x * 2.8 * (1 - Math.abs(ip))) * dt;
        c.w.y += (iy * 9.1 - c.w.y * 1.9 * (1 - Math.abs(iy))) * dt;
        c.w.z += (ir * 24 - c.w.z * 4.5 * (1 - Math.abs(ir))) * dt;
        if (c.w.length() > 5.5) c.w.setLength(5.5);
        tq.setFromEuler(new THREE.Euler(c.w.x * dt, c.w.y * dt, c.w.z * dt, "YXZ")); c.q.multiply(tq);
      }
      c.v.y -= G * dt;
      c.boosting = I.B && c.boost > 0;
      if (c.boosting) { axes(c); c.v.addScaledVector(fwdV, BOOST_A * dt); c.boost = Math.max(0, c.boost - 33.3 * dt); }
    }
    if (c.v.length() > MAX_CAR) c.v.setLength(MAX_CAR);
    c.p.addScaledVector(c.v, dt);
    // body against the arena (sphere around the car's centre)
    axes(c);
    tv.copy(c.p).addScaledVector(upV, 1.2); collide(tv, c.v, 1.2, 0.1, 0.95); c.p.copy(tv).addScaledVector(upV, -1.2);
    // touching a surface with the wheels: land on it (floor, ramp or wall)
    const dW = sdf(c.p.x, c.p.y, c.p.z);
    if (dW < 0.25 && c.jumpT > 0.1) {
      const n = grad(c.p.x, c.p.y, c.p.z, tv2);
      if (upV.dot(n) > 0.45 && -G * n.y < STICK) {
        c.ground = true; c.n.copy(n); c.p.addScaledVector(n, -dW); c.v.addScaledVector(n, -c.v.dot(n));
        c.flipT = 0; c.w.set(0, 0, 0); c.upT = 0;
        fT.copy(fwdV).addScaledVector(n, -fwdV.dot(n)); if (fT.lengthSq() < 1e-4) fT.copy(c.v).addScaledVector(n, -c.v.dot(n)); fT.normalize();
        setBasis(c, fT, n); c.yaw = Math.atan2(fT.x, fT.z);
      } else {
        // on the roof or the side (also in a curve): the car rights itself after a moment
        c.v.multiplyScalar(0.92); c.upT += dt;
        if (c.upT > 0.45) {
          c.upT = 0; c.ground = true; c.n.copy(n); c.p.addScaledVector(n, -dW); c.v.addScaledVector(n, -c.v.dot(n)); c.flipT = 0; c.w.set(0, 0, 0);
          fT.copy(fwdV).addScaledVector(n, -fwdV.dot(n)); if (fT.lengthSq() < 1e-3) fT.copy(upV).addScaledVector(n, -upV.dot(n)); if (fT.lengthSq() < 1e-3) fT.set(1, 0, 0).addScaledVector(n, -n.x); fT.normalize();
          setBasis(c, fT, n); c.yaw = Math.atan2(fT.x, fT.z);
        }
      }
    }
    padCheck(c);
  }
  const m4 = new THREE.Matrix4(), fT = new THREE.Vector3(), sT = new THREE.Vector3(), bX = new THREE.Vector3(), bZ = new THREE.Vector3();
  const STICK = 10;
  function setBasis(c: Car, f: THREE.Vector3, n: THREE.Vector3) {
    bX.crossVectors(n, f).normalize(); bZ.crossVectors(bX, n).normalize();
    m4.makeBasis(bX, n, bZ); c.q.setFromRotationMatrix(m4);
  }
  function padCheck(c: Car) {
    // boost pads
    for (const pd of arena.pads) {
      if (pd.t > 0 || c.boost >= 100 || c.p.y > 2) continue;
      if (Math.hypot(pd.x - c.p.x, pd.z - c.p.z) < (pd.big ? 2.4 : 1.6)) { c.boost = Math.min(100, c.boost + (pd.big ? 100 : 12)); pd.t = pd.big ? 10 : 4; if (c.id === myId) tone(pd.big ? 880 : 1200, 0.12, 0.08); }
    }
  }
  function respawn(c: Car) {
    const s = c.team === 0 ? -1 : 1;
    c.p.set((Math.random() - 0.5) * 30, 0, s * (A.L / 2 - 12)); c.v.set(0, 0, 0); c.yaw = s < 0 ? 0 : Math.PI; c.q.setFromEuler(new THREE.Euler(0, c.yaw, 0));
    c.ground = true; c.n.set(0, 1, 0); c.boost = 33; c.dead = 0; c.mesh.group.visible = true;
  }
  function demolish(c: Car, by?: Car) {
    if (c.dead > 0) return;
    c.dead = 3; c.mesh.group.visible = false;
    burst(c.p.x, c.p.y + 0.6, c.p.z, c.team === 0 ? "#5aa8ff" : "#ffa04a", 40, 18);
    thump(40); S.shake = Math.max(S.shake, dist3(c.p, camera.position) < 30 ? 0.8 : 0.2);
    if (by && (c.id === myId || by.id === myId)) msg(c.id === myId ? tt(`${by.name} hat dich zerstört!`, `${by.name} demolished you!`) : tt(`Zerstört: ${c.name}`, `Demolished: ${c.name}`));
  }
  const dist3 = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b);

  // ── ball ─────────────────────────────────────────────────────────
  const inv = new THREE.Quaternion(), local = new THREE.Vector3(), cen = new THREE.Vector3();
  function stepBall(dt: number) {
    if (S.phase === "count") return;
    ball.v.y -= G * dt;
    ball.p.addScaledVector(ball.v, dt);
    const hit = collide(ball.p, ball.v, BALL_R, 0.62, 0.985);
    if (hit > 4) thump(hit * 0.6);
    if (ball.p.y < BALL_R + 0.05) { ball.v.x *= 1 - 0.35 * dt; ball.v.z *= 1 - 0.35 * dt; }
    if (ball.v.length() > 62) ball.v.setLength(62);
  }
  /** Car–ball touch. Returns true on contact. */
  function carBall(c: Car) {
    if (c.dead > 0) return false;
    cen.set(0, CAR_UP, 0).applyQuaternion(c.q).add(c.p);
    inv.copy(c.q).invert();
    local.copy(ball.p).sub(cen).applyQuaternion(inv);
    const cx = Math.max(-CAR_HALF.x, Math.min(CAR_HALF.x, local.x)), cy = Math.max(-CAR_HALF.y, Math.min(CAR_HALF.y, local.y)), cz = Math.max(-CAR_HALF.z, Math.min(CAR_HALF.z, local.z));
    tv.set(local.x - cx, local.y - cy, local.z - cz);
    const d = tv.length();
    if (d >= BALL_R) return false;
    if (d < 1e-4) tv.set(0, 1, 0); else tv.divideScalar(d);
    const n = tv.applyQuaternion(c.q);
    ball.p.addScaledVector(n, BALL_R - d);
    tv2.copy(ball.v).sub(c.v);
    const vn = tv2.dot(n);
    if (vn < 0) {
      const j = (-(1 + 0.55) * vn) / (1 + 1 / 4);
      ball.v.addScaledVector(n, j); c.v.addScaledVector(n, -j / 4);
      if (c.hitCd <= 0) {
        // extra shove from the car, mostly horizontal (makes shots feel like the real thing)
        tv2.copy(ball.p).sub(cen); tv2.y *= 0.35; tv2.normalize();
        const extra = Math.min(14, 2.5 + -vn * 0.3);
        ball.v.addScaledVector(tv2, extra);
        c.hitCd = 0.12;
        thump(Math.min(50, -vn + 8));
        const toGoal = c.team === 0 ? 1 : -1;
        if (ball.v.z * toGoal > 15 && Math.abs(ball.p.z - toGoal * A.L / 2) < 45) c.shots++;
        if (ball.lastTeam !== -1 && ball.lastTeam !== c.team && Math.abs(ball.p.z + toGoal * A.L / 2) < 25 && ball.v.z * -toGoal < 5) c.saves++;
      }
      ball.last = c.id; ball.lastTeam = c.team;
    }
    return true;
  }
  function carCar(a: Car, b: Car) {
    if (a.dead > 0 || b.dead > 0) return;
    tv.set(b.p.x - a.p.x, b.p.y - a.p.y, b.p.z - a.p.z);
    const d = tv.length(); if (d > 3 || d < 1e-4) return;
    tv.divideScalar(d);
    const push = (3 - d) / 2;
    if (!a.remote) a.p.addScaledVector(tv, -push); if (!b.remote) b.p.addScaledVector(tv, push);
    const close = a.v.dot(tv) - b.v.dot(tv);
    if (close <= 0) return;
    const sa = a.v.length(), sb = b.v.length();
    if (a.team !== b.team && sa > SUPERSONIC && a.v.dot(tv) > 25 && !b.remote) { demolish(b, a); sendDemo(b, a); return; }
    if (a.team !== b.team && sb > SUPERSONIC && -b.v.dot(tv) > 25 && !a.remote) { demolish(a, b); sendDemo(a, b); return; }
    if (!b.remote) { b.v.addScaledVector(tv, close * 0.8); b.v.y += Math.min(6, close * 0.25); b.ground = b.v.y > 0.5 ? false : b.ground; }
    if (!a.remote) a.v.addScaledVector(tv, -close * 0.35);
    if (a.id === myId || b.id === myId) thump(close);
  }

  // ── bots ─────────────────────────────────────────────────────────
  // Ball prediction (same physics as the real ball), refreshed every few ticks and shared by all bots.
  const PRED_DT = 1 / 30, PRED_N = 105;
  const pred: { x: number; y: number; z: number }[] = [];
  let predAt = -1;
  const pp0 = new THREE.Vector3(), pv0 = new THREE.Vector3();
  function predict() {
    if (S.t - predAt < 0.05 && pred.length) return;
    predAt = S.t; pred.length = 0;
    pp0.copy(ball.p); pv0.copy(ball.v);
    for (let i = 0; i < PRED_N; i++) {
      pv0.y -= G * PRED_DT; pp0.addScaledVector(pv0, PRED_DT); collide(pp0, pv0, BALL_R, 0.62, 0.985);
      if (pp0.y < BALL_R + 0.05) { pv0.x *= 1 - 0.35 * PRED_DT; pv0.z *= 1 - 0.35 * PRED_DT; }
      pred.push({ x: pp0.x, y: pp0.y, z: pp0.z });
    }
  }
  const angTo = (c: Car, x: number, z: number) => { let d = Math.atan2(x - c.p.x, z - c.p.z) - c.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  /** Drive towards a point; returns the heading error. */
  function steerTo(c: Car, x: number, z: number, wantSpeed: number) {
    const I = c.inp, da = angTo(c, x, z), sp = c.v.length(), d = Math.hypot(x - c.p.x, z - c.p.z);
    I.S = Math.max(-1, Math.min(1, -da * 3));
    I.slide = Math.abs(da) > 1.2 && sp > 10 && d > 6;
    if (Math.abs(da) > 2.4 && d < 10 && sp < 10) { I.T = -1; I.S = -I.S; return da; }
    I.T = sp < wantSpeed + 1 ? 1 : sp > wantSpeed + 6 ? -0.4 : 0;
    I.B = c.boost > 0 && Math.abs(da) < 0.35 && sp < wantSpeed - 2 && wantSpeed > 26 && sp < MAX_CAR - 1;
    return da;
  }
  const SKILL = [
    { react: 0.45, aerial: 0, speed: 0.75, flip: 0.25, err: 3 },
    { react: 0.12, aerial: 9, speed: 0.95, flip: 0.8, err: 1 },
    { react: 0, aerial: 15, speed: 1, flip: 1, err: 0 },
  ];
  function botThink(c: Car) {
    const I = c.inp; I.J = false; I.B = false; I.slide = false; I.roll = 0; I.T = 0; I.S = 0;
    if (c.dead > 0 || S.phase === "count") return;
    const sk = SKILL[Math.max(0, Math.min(2, c.diff))];
    predict();
    const dir = c.team === 0 ? 1 : -1, goalZ = dir * (A.L / 2 + 2), ownZ = -dir * (A.L / 2);
    axes(c);
    // ── in the air: aerial towards the target or land on the wheels
    if (!c.ground) {
      if (c.flipT > 0) return;
      const tg = c.air;
      if (tg && c.jumpT < 2.6) {
        tv.set(tg.x - c.p.x, tg.y - c.p.y, tg.z - c.p.z); const dl = tv.length(); tv.normalize();
        // point the nose at the target (bots steer their car directly – like a perfect stick)
        tq.setFromUnitVectors(tv2.set(0, 0, 1), tv); c.q.slerp(tq, Math.min(1, 7 * (1 / 60)));
        I.B = fwdV.dot(tv) > 0.8 && c.boost > 0;
        if (c.holdT > 0) I.J = true;
        if (!c.flipped && c.jumpT > 0.22 && c.jumpT < 0.3 && tg.y > 7) I.J = false; // release, then double jump below
        if (!c.flipped && c.jumpT > 0.3 && tg.y > 7 && c.prevJ === false) { I.J = true; I.T = 0; I.S = 0; }
        if (dl < BALL_R + 2.5 && !c.flipped && c.jumpT > 0.3) { I.J = true; I.T = 1; }
        if (Math.hypot(ball.p.x - tg.x, ball.p.z - tg.z) > 12) c.air = undefined;
      } else {
        c.air = undefined;
        // recover: level out
        tq.setFromEuler(new THREE.Euler(0, Math.atan2(c.v.x || fwdV.x, c.v.z || fwdV.z), 0)); c.q.slerp(tq, Math.min(1, 5 / 60));
      }
      return;
    }
    c.air = undefined;
    if (c.n.y < 0.6) { I.J = true; return; } // bots leave walls
    // ── kickoff: full boost at the ball, flip into it
    const atKick = Math.hypot(ball.p.x, ball.p.z) < 0.5 && ball.v.lengthSq() < 0.5;
    const mates = cars.filter((o) => o.team === c.team && o.dead <= 0);
    if (atKick) {
      const taker = mates.reduce((a, b) => (Math.hypot(a.p.x, a.p.z) - (a.bot ? 0 : 0.1) <= Math.hypot(b.p.x, b.p.z) ? a : b), c);
      if (taker === c) {
        steerTo(c, ball.p.x, ball.p.z - dir * 1.2, MAX_CAR); I.B = c.boost > 0; I.T = 1;
        const d = Math.hypot(ball.p.x - c.p.x, ball.p.z - c.p.z);
        if (d < 10 && sk.flip > 0.5) { I.J = true; c.kickFlip = true; }
        return;
      }
      // others: grab boost on the way back
      let best = arena.pads[0], bd = 1e9;
      for (const pd of arena.pads) if (pd.t <= 0 && (pd.z - ownZ) * dir < 30) { const d = Math.hypot(pd.x - c.p.x, pd.z - c.p.z); if (d < bd) { bd = d; best = pd; } }
      steerTo(c, best.x, best.z, 30); return;
    }
    if (c.kickFlip && c.ground) c.kickFlip = false;
    // ── find where the car can reach the ball first
    const spNow = c.v.length(), vmax = c.boost > 15 ? MAX_CAR : MAX_DRIVE;
    let hit = -1, hx = 0, hz = 0, hy = 0;
    const aimX = Math.max(-A.GW / 2 + 3, Math.min(A.GW / 2 - 3, c.p.x * -0.15));
    for (let i = Math.floor(sk.react / PRED_DT); i < pred.length; i++) {
      const b = pred[i], t = (i + 1) * PRED_DT;
      const maxH = c.boost > 20 ? sk.aerial : 0;
      if (b.y > Math.max(3.8, maxH)) continue;
      // contact point behind the ball, on the line from the opponent goal
      tv.set(aimX - b.x, 0, goalZ - b.z).normalize();
      const px = b.x - tv.x * (BALL_R + 1.4), pz = b.z - tv.z * (BALL_R + 1.4);
      const d = Math.hypot(px - c.p.x, pz - c.p.z), turn = Math.abs(angTo(c, px, pz)) * 0.32;
      const avg = Math.max(12, (spNow + vmax * sk.speed) / 2);
      const need = turn + d / avg + (b.y > 3.8 ? 0.35 + b.y * 0.05 : 0);
      if (need <= t) { hit = i; hx = px; hz = pz; hy = b.y; break; }
    }
    // roles: who reaches the ball first attacks, the last one stays back
    const reach = (o: Car) => Math.hypot(ball.p.x - o.p.x, ball.p.z - o.p.z) + ((o.p.z - ball.p.z) * (o.team === 0 ? 1 : -1) > 0 ? 25 : 0) + (o.bot ? 0 : -4);
    const order = mates.slice().sort((a, b) => reach(a) - reach(b));
    const role = order.indexOf(c);
    const danger = pred.some((b) => (b.z - ownZ) * dir < 2 && Math.abs(b.x) < A.GW / 2 + 2 && b.y < A.GH);
    const ballSide = (ball.p.z - c.p.z) * dir; // > 0: we are goal-side (good)
    if (role === 0 || (danger && role === 1) || mates.length === 1) {
      if (hit < 0) { const b = pred[pred.length - 1]; hx = b.x; hz = b.z - dir * 4; hy = b.y; }
      const t = (Math.max(hit, 0) + 1) * PRED_DT;
      // wrong side of the ball: drive around it towards our own goal side first
      if (ballSide < -1 && !danger) {
        const side = c.p.x > ball.p.x ? 1 : -1;
        steerTo(c, ball.p.x + side * 9, ball.p.z - dir * 12, MAX_CAR * sk.speed); return;
      }
      if (danger && ballSide < 0) {
        // get back to goal fast (far post), then turn to the ball
        const post = ball.p.x > 0 ? -A.GW / 4 : A.GW / 4;
        steerTo(c, post, ownZ + dir * 3, MAX_CAR); if (Math.abs(c.p.z - ownZ) > 12) I.B = c.boost > 0; return;
      }
      const d = Math.hypot(hx - c.p.x, hz - c.p.z);
      const want = hit < 0 ? MAX_CAR : Math.min(MAX_CAR, (d / Math.max(0.1, t)) * 1.1 + 2);
      const da = steerTo(c, hx, hz, Math.max(want, 14) * sk.speed + (sk.err ? 0 : 3));
      // aerial when the ball will be up high
      if (hy > 5 && sk.aerial > 0 && c.boost > 25 && Math.abs(da) < 0.25 && d < t * (spNow + 18) && d > t * spNow * 0.4) {
        const b = pred[Math.max(hit, 0)]; c.air = { x: b.x - tv.set(aimX - b.x, 0, goalZ - b.z).normalize().x * 1.5, y: b.y, z: b.z - tv.z * 1.5 };
        I.J = true; return;
      }
      // jump for bouncing balls at mid height
      const bd = Math.hypot(ball.p.x - c.p.x, ball.p.z - c.p.z);
      if (ball.p.y > 3.6 && ball.p.y < 6.5 && bd < 6 && Math.abs(da) < 0.5) I.J = true;
      // power shot: jump and flip forward into the ball
      if (bd < 7.5 && ball.p.y < 3.8 && Math.abs(angTo(c, ball.p.x, ball.p.z)) < 0.35 && spNow > 12 && Math.random() < sk.flip * 0.4) { I.J = true; c.flipNext = true; }
      return;
    }
    if (c.flipNext) { c.flipNext = false; }
    // ── support / last man
    let tx: number, tz: number;
    if (role === mates.length - 1 && mates.length > 1) { tx = ball.p.x * 0.3; tz = ownZ + dir * Math.min(22, Math.max(4, Math.abs(ball.p.z - ownZ) * 0.35)); }
    else { tx = ball.p.x * 0.6 + (c.p.x > ball.p.x ? 8 : -8); tz = ball.p.z - dir * 22; }
    if ((tz - ownZ) * dir < 3) tz = ownZ + dir * 3;
    // top up boost on the way if a pad is close
    if (c.boost < 50) for (const pd of arena.pads) if (pd.t <= 0 && Math.hypot(pd.x - c.p.x, pd.z - c.p.z) < 14 && (pd.z - ball.p.z) * dir < 0) { tx = pd.x; tz = pd.z; break; }
    const d = Math.hypot(tx - c.p.x, tz - c.p.z);
    steerTo(c, tx, tz, d > 25 ? MAX_CAR * sk.speed : d > 6 ? 24 : 4);
    if (d < 4) { I.T = 0; I.S = Math.max(-1, Math.min(1, -angTo(c, ball.p.x, ball.p.z) * 2)); I.T = Math.abs(angTo(c, ball.p.x, ball.p.z)) > 0.5 ? 0.4 : 0; }
  }
  // bots press the second jump (flip forward) a moment after a ground jump
  function botAfterJump(c: Car) {
    if (!c.bot || c.ground || c.flipped || c.flipT > 0) return;
    if ((c.flipNext || c.kickFlip) && c.jumpT > 0.1) { c.inp.J = !c.prevJ; c.inp.T = 1; c.inp.S = 0; if (c.inp.J) { c.flipNext = false; c.kickFlip = false; } }
  }

  // ── fx ───────────────────────────────────────────────────────────
  type P = { m: THREE.Mesh; v: THREE.Vector3; life: number; max: number; grow: number };
  const parts: P[] = [];
  const pGeo = new THREE.IcosahedronGeometry(0.4, 0);
  function burst(x: number, y: number, z: number, col: string, n: number, sp: number) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.5), transparent: true, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(pGeo, mat); m.position.set(x, y, z); scene.add(m);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize().multiplyScalar(sp * (0.4 + Math.random()));
      parts.push({ m, v, life: 0.9 + Math.random() * 0.8, max: 1.7, grow: 0.6 + Math.random() });
    }
  }
  const flash = new THREE.PointLight("#fff", 0, 80, 1.5); scene.add(flash);
  const trailGeo = new THREE.SphereGeometry(0.5, 8, 6), trailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2, 2.6), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  function stepFx(dt: number) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0) { scene.remove(p.m); parts.splice(i, 1); continue; }
      p.v.y -= 6 * dt; p.v.multiplyScalar(1 - 1.2 * dt); p.m.position.addScaledVector(p.v, dt);
      p.m.scale.setScalar(Math.max(0.05, p.life * p.grow)); (p.m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, p.life);
    }
    flash.intensity = Math.max(0, flash.intensity - dt * 600);
    // ball trail when fast
    if (ball.v.length() > 30 && S.phase !== "count" && Math.random() < 0.8) {
      const m = new THREE.Mesh(trailGeo, trailMat); m.position.copy(ball.p); scene.add(m);
      parts.push({ m, v: new THREE.Vector3(), life: 0.35, max: 0.35, grow: 4 });
    }
    // boost particles
    for (const c of cars) if (c.boosting && c.dead <= 0 && Math.random() < 0.7) {
      axes(c);
      const m = new THREE.Mesh(pGeo, c.team === 0 ? blueP : orangeP); m.position.copy(c.p).addScaledVector(upV, 0.5).addScaledVector(fwdV, -2.1); scene.add(m);
      parts.push({ m, v: fwdV.clone().multiplyScalar(-8).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2)), life: 0.4, max: 0.4, grow: 1.6 });
    }
  }
  const blueP = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.2, 3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const orangeP = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

  // ── game flow ────────────────────────────────────────────────────
  function goal(team: 0 | 1, scorerId: string) {
    S.score[team]++; S.phase = "goal"; S.goalT = 3.2; S.lastTeam = team;
    const sc = cars.find((c) => c.id === scorerId);
    if (sc && sc.team === team) sc.goals++;
    S.lastScorer = sc && sc.team === team ? sc.name : "";
    const col = team === 0 ? "#3d8cff" : "#ff8a2a";
    burst(ball.p.x, ball.p.y, ball.p.z, col, 120, 34); burst(ball.p.x, ball.p.y, ball.p.z, "#ffffff", 40, 20);
    flash.color.set(col); flash.position.copy(ball.p); flash.intensity = 900;
    ballMesh.visible = false; S.shake = 1;
    tone(220, 1.2, 0.3, "sawtooth"); tone(330, 1.2, 0.25, "sawtooth"); cheer(0.5, 2.5);
    showGoal(team, S.lastScorer);
    if (S.ot) S.clock = 0;
  }
  function endMatch() {
    S.phase = "end"; cheer(0.35, 2); tone(523, 0.3, 0.2); setTimeout(() => tone(659, 0.3, 0.2), 200); setTimeout(() => tone(784, 0.6, 0.2), 400);
    showEnd();
  }
  function simulate(dt: number) {
    S.t += dt;
    const authority = !S.online || S.host;
    if (S.phase === "count") { S.countT -= dt; beep(Math.ceil(S.countT)); if (S.countT <= 0) { S.phase = "play"; beep(0); } }
    if (S.phase === "goal") { S.goalT -= dt; if (S.goalT <= 0 && authority) { if (S.clock <= 0 && !S.ot && S.score[0] !== S.score[1]) endMatch(); else if (S.ot && S.clock <= 0) endMatch(); else { ballMesh.visible = true; kickoff(); } } }
    if (S.phase === "play" && authority) {
      if (S.ot) S.clock += dt; else S.clock -= dt;
      if (!S.ot && S.clock <= 0 && ball.p.y < BALL_R + 0.6) {
        S.clock = 0;
        if (S.score[0] === S.score[1]) { S.ot = true; msg(tt("VERLÄNGERUNG – das nächste Tor gewinnt!", "OVERTIME – next goal wins!")); kickoff(); }
        else endMatch();
      }
    }
    for (const c of cars) if (c.bot && authority) { botThink(c); botAfterJump(c); }
    const mine = me(); if (mine) readInput(mine.inp);
    for (const c of cars) if (!c.remote) stepCar(c, dt);
    for (const pd of arena.pads) if (pd.t > 0) pd.t -= dt;
    // ball: host / offline simulates, clients predict
    stepBall(dt);
    for (const c of cars) {
      if (c.remote) continue;
      if (S.online && !S.host && c.id !== myId) continue;
      if (S.phase === "count") continue;
      if (carBall(c) && S.online && !S.host && c.id === myId) { ball.localHitT = S.t; sendHit(); }
    }
    for (let i = 0; i < cars.length; i++) for (let k = i + 1; k < cars.length; k++) carCar(cars[i], cars[k]);
    // goal?
    if (S.phase === "play" && authority && Math.abs(ball.p.z) > A.L / 2 + BALL_R * 0.9 && Math.abs(ball.p.x) < A.GW / 2) {
      const team: 0 | 1 = ball.p.z > 0 ? 0 : 1;
      goal(team, ball.last); sendGoal(team, ball.last);
    }
  }

  // ── input ────────────────────────────────────────────────────────
  const keys = new Set<string>();
  const mouse = { l: false, r: false };
  const pad = { x: 0, y: 0, boost: false, jump: false, slide: false };
  on(window, "keydown", (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    keys.add(e.code); audioOn();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.code === "KeyC" || e.code === "KeyY") toggleCam();
    if (e.code === "Escape" && S.phase !== "menu") togglePause();
  });
  on(window, "keyup", (e: KeyboardEvent) => keys.delete(e.code));
  on(window, "blur", () => keys.clear());
  on(renderer.domElement, "mousedown", (e: MouseEvent) => { audioOn(); if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true; });
  on(window, "mouseup", (e: MouseEvent) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
  on(renderer.domElement, "contextmenu", (e: Event) => e.preventDefault());
  let gpCam = false;
  function readInput(I: Inp) {
    const k = (...c: string[]) => c.some((x) => keys.has(x));
    I.T = (k("KeyW", "ArrowUp") ? 1 : 0) - (k("KeyS", "ArrowDown") ? 1 : 0);
    I.S = (k("KeyD", "ArrowRight") ? 1 : 0) - (k("KeyA", "ArrowLeft") ? 1 : 0);
    I.B = k("ShiftLeft", "ShiftRight") || mouse.l;
    I.J = k("Space") || mouse.r;
    I.slide = k("ControlLeft", "KeyQ", "KeyE");
    I.roll = k("KeyQ", "KeyE") ? 1 : 0;
    // gamepad (standard layout)
    const gp = navigator.getGamepads?.().find((g) => g && g.connected);
    if (gp) {
      const ax = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0, ay = Math.abs(gp.axes[1]) > 0.2 ? gp.axes[1] : 0;
      const rt = gp.buttons[7]?.value || 0, lt = gp.buttons[6]?.value || 0;
      if (ax) I.S = ax; if (rt || lt) I.T = rt - lt;
      if (!S.ballCam && false) I.P = ay;
      if (!(I.T) && ay && !me()?.ground) I.T = -ay;
      if (gp.buttons[0]?.pressed) I.J = true;
      if (gp.buttons[1]?.pressed) I.B = true;
      if (gp.buttons[2]?.pressed) { I.slide = true; I.roll = 1; }
      if (gp.buttons[3]?.pressed && !gpCam) toggleCam(); gpCam = !!gp.buttons[3]?.pressed;
    }
    // touch
    if (touch) {
      const mag = Math.min(1, Math.hypot(pad.x, pad.y)), c = me();
      if (c && mag > 0.15) {
        if (c.ground) {
          // the stick points where the car should go (relative to the camera); the car drives as long as it is pushed
          const camYaw = Math.atan2(camLook.x - camPos.x, camLook.z - camPos.z);
          const want = camYaw - Math.atan2(pad.x, -pad.y);
          let da = want - c.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          if (Math.abs(da) > 2.5 && c.v.length() < 6) { I.T = -mag; I.S = Math.max(-1, Math.min(1, (da > 0 ? Math.PI - da : -Math.PI - da) * 2.5)); }
          else { I.T = mag; I.S = Math.max(-1, Math.min(1, -da * 2.5)); I.slide = Math.abs(da) > 1.4 && c.v.length() > 12; }
        } else { I.S = pad.x; I.T = -pad.y; }
      }
      if (pad.boost) I.B = true; if (pad.jump) I.J = true; if (pad.slide) { I.slide = true; I.roll = 1; }
    }
    if (S.paused) { I.T = 0; I.S = 0; I.B = false; I.J = false; }
  }
  function toggleCam() { S.ballCam = !S.ballCam; ui.cam.textContent = S.ballCam ? tt("Ball-Kamera", "Ball cam") : tt("Auto-Kamera", "Car cam"); ui.camB.classList.toggle("off", !S.ballCam); }

  // ── network (Supabase Realtime) ──────────────────────────────────
  let sb: ReturnType<typeof createClient> | null = null, ch: RealtimeChannel | null = null, sendT = 0;
  const members = new Map<string, { name: string; team: 0 | 1 }>();
  const send = (event: string, payload: unknown) => { void ch?.send({ type: "broadcast", event, payload }); };
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const pack = (c: Car) => [c.id, c.team, r2(c.p.x), r2(c.p.y), r2(c.p.z), r2(c.q.x), r2(c.q.y), r2(c.q.z), r2(c.q.w), r2(c.v.x), r2(c.v.y), r2(c.v.z), c.boosting ? 1 : 0, c.name, c.slot, c.dead > 0 ? 1 : 0];
  function unpack(a: (string | number)[], bot: boolean) {
    const id = a[0] as string; if (id === myId) return;
    let c = cars.find((x) => x.id === id);
    if (!c) { c = makeCar(id, a[13] as string, a[1] as 0 | 1, bot, true, a[14] as number); }
    if (c.team !== a[1]) { removeCar(c); c = makeCar(id, a[13] as string, a[1] as 0 | 1, bot, true, a[14] as number); }
    c.remote = true;
    c.tgt = { p: new THREE.Vector3(a[2] as number, a[3] as number, a[4] as number), q: new THREE.Quaternion(a[5] as number, a[6] as number, a[7] as number, a[8] as number), v: new THREE.Vector3(a[9] as number, a[10] as number, a[11] as number), t: performance.now(), b: !!a[12] };
    const dead = !!a[15];
    if (dead && c.dead <= 0) { c.dead = 3; c.mesh.group.visible = false; } else if (!dead && c.dead > 0) { c.dead = 0; c.mesh.group.visible = true; c.p.copy(c.tgt.p); }
  }
  function netTick(dt: number) {
    if (!S.online || !ch) return;
    sendT -= dt; if (sendT > 0) return; sendT = 1 / 15;
    const mine = me();
    if (mine) send("c", pack(mine));
    if (S.host) send("s", { b: [r2(ball.p.x), r2(ball.p.y), r2(ball.p.z), r2(ball.v.x), r2(ball.v.y), r2(ball.v.z)], ph: S.phase, ck: r2(S.clock), ot: S.ot, sc: S.score, ct: r2(S.countT), bots: cars.filter((c) => c.bot).map(pack), pads: arena.pads.map((p) => (p.t > 0 ? 1 : 0)).join("") });
  }
  function sendHit() { send("hit", { b: [r2(ball.p.x), r2(ball.p.y), r2(ball.p.z), r2(ball.v.x), r2(ball.v.y), r2(ball.v.z)], by: myId }); }
  function sendGoal(team: number, by: string) { if (S.online && S.host) send("goal", { team, by, b: [ball.p.x, ball.p.y, ball.p.z] }); }
  function sendDemo(victim: Car, by: Car) { if (S.online) send("demo", { v: victim.id, by: by.id }); }
  function lobbyMembers() { return [...members.entries()].map(([id, m]) => ({ id, ...m })); }
  async function connect(code: string, host: boolean) {
    sb = sb || createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, realtime: { params: { eventsPerSecond: 40 } } });
    if (ch) { await sb.removeChannel(ch); ch = null; }
    S.online = true; S.host = host; S.code = code;
    const c = sb.channel(`kt:tb:${code}`, { config: { broadcast: { self: false }, presence: { key: myId } } });
    c.on("presence", { event: "sync" }, () => {
      const st = c.presenceState<{ name: string; team: 0 | 1 }>();
      members.clear();
      for (const [id, arr] of Object.entries(st)) if (arr[0]) members.set(id, { name: arr[0].name, team: arr[0].team });
      // players who left
      for (const car of cars.slice()) if (!car.bot && car.id !== myId && !members.has(car.id)) removeCar(car);
      if (!host && !members.has(hostId)) { if (hostId) { msg(tt("Der Gastgeber hat das Spiel verlassen.", "The host left the game.")); leaveOnline(); } }
      if (host && S.phase !== "menu") fillBots();
      renderLobby();
    });
    let hostId = host ? myId : "";
    c.on("broadcast", { event: "c" }, ({ payload }) => unpack(payload as (string | number)[], false));
    c.on("broadcast", { event: "s" }, ({ payload }) => {
      const s = payload as { b: number[]; ph: typeof S.phase; ck: number; ot: boolean; sc: [number, number]; ct: number; bots: (string | number)[][]; pads: string };
      if (S.host) return;
      if (S.phase === "menu" || S.phase === "end") { if (s.ph !== "end") startOnlineMatch(); }
      if (s.ph === "count" && S.phase !== "count") { const mine = me(); if (mine) placeKick(mine); ballMesh.visible = true; }
      if (s.ph === "end" && S.phase !== "end") { S.score = s.sc; endMatch(); }
      S.phase = s.ph; S.clock = s.ck; S.ot = s.ot; S.score = s.sc; S.countT = s.ct;
      if (S.t - ball.localHitT > 0.35) {
        const tgt = new THREE.Vector3(s.b[0], s.b[1], s.b[2]);
        if (tgt.distanceTo(ball.p) > 12) ball.p.copy(tgt); else ball.p.lerp(tgt, 0.45);
        ball.v.set(s.b[3], s.b[4], s.b[5]);
      }
      for (const b of s.bots) unpack(b, true);
      const ids = new Set(s.bots.map((b) => b[0]));
      for (const car of cars.slice()) if (car.bot && !ids.has(car.id)) removeCar(car);
      s.pads.split("").forEach((x, i) => { const p = arena.pads[i]; if (p) p.t = x === "1" ? Math.max(p.t, 0.5) : 0; });
    });
    c.on("broadcast", { event: "hit" }, ({ payload }) => {
      const h = payload as { b: number[]; by: string };
      ball.p.set(h.b[0], h.b[1], h.b[2]); ball.v.set(h.b[3], h.b[4], h.b[5]);
      const car = cars.find((x) => x.id === h.by); if (car) { ball.last = car.id; ball.lastTeam = car.team; }
      if (!S.host) ball.localHitT = S.t;
    });
    c.on("broadcast", { event: "goal" }, ({ payload }) => {
      const g = payload as { team: 0 | 1; by: string; b: number[] };
      if (S.host) return;
      ball.p.set(g.b[0], g.b[1], g.b[2]); S.score[g.team]--; goal(g.team, g.by);
    });
    c.on("broadcast", { event: "demo" }, ({ payload }) => {
      const d = payload as { v: string; by: string };
      const v = cars.find((x) => x.id === d.v), by = cars.find((x) => x.id === d.by);
      if (v && v.id !== myId) demolish(v, by); else if (v && v.id === myId) demolish(v, by);
    });
    c.on("broadcast", { event: "cfg" }, ({ payload }) => {
      const cfg = payload as { mode: number; diff: number; host: string; teams: Record<string, 0 | 1> };
      hostId = cfg.host; S.mode = cfg.mode; S.diff = cfg.diff;
      const t = cfg.teams[myId]; if (t !== undefined && t !== myTeam) { myTeam = t; void c.track({ name: S.myName, team: myTeam }); }
      renderLobby();
    });
    c.on("broadcast", { event: "start" }, () => { if (!S.host) startOnlineMatch(); });
    c.on("broadcast", { event: "hello" }, () => { if (S.host) sendCfg(); });
    await new Promise<void>((res) => c.subscribe(async (st) => { if (st === "SUBSCRIBED") { await c.track({ name: S.myName, team: myTeam }); if (!host) c.send({ type: "broadcast", event: "hello", payload: {} }); res(); } }));
    ch = c;
    if (host) sendCfg();
  }
  let myTeam: 0 | 1 = 0;
  function sendCfg() {
    if (!S.host) return;
    const teams: Record<string, 0 | 1> = {};
    for (const m of lobbyMembers()) teams[m.id] = m.team;
    send("cfg", { mode: S.mode, diff: S.diff, host: myId, teams });
  }
  function leaveOnline() {
    if (ch && sb) void sb.removeChannel(ch);
    ch = null; S.online = false; S.host = true; members.clear();
    for (const c of cars.slice()) removeCar(c);
    S.phase = "menu"; showMenu();
  }
  function placeKick(c: Car) {
    const list = [...lobbyMembers().filter((m) => m.team === c.team).map((m) => m.id)].sort();
    const i = Math.max(0, list.indexOf(c.id)), spots = SPOTS[Math.min(2, S.mode - 1)], [x, z] = spots[i % spots.length];
    const s = c.team === 0 ? 1 : -1;
    c.p.set(c.team === 0 ? x : -x, 0, z * s); c.v.set(0, 0, 0); c.yaw = Math.atan2(-c.p.x, -c.p.z); c.q.setFromEuler(new THREE.Euler(0, c.yaw, 0)); c.ground = true; c.n.set(0, 1, 0); c.boost = 33; c.dead = 0; c.mesh.group.visible = true;
  }
  function fillBots() {
    // humans first, bots fill the empty seats
    const humans = lobbyMembers();
    for (const team of [0, 1] as const) {
      const h = humans.filter((m) => m.team === team).length;
      const bots = cars.filter((c) => c.bot && c.team === team);
      const need = Math.max(0, S.mode - h);
      while (bots.length > need) removeCar(bots.pop()!);
      for (let i = bots.length; i < need; i++) addBot(team, h + i);
    }
    for (const m of humans) if (m.id !== myId && !cars.find((c) => c.id === m.id)) { /* created on first state message */ }
  }
  const BOT_NAMES = ["Blitz", "Turbo", "Funke", "Nitro", "Komet", "Rakete", "Atlas", "Zero"];
  function addBot(team: 0 | 1, slot: number) {
    const used = new Set(cars.map((c) => c.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) || "Bot";
    const c = makeCar("b" + Math.random().toString(36).slice(2, 7), name, team, true, false, slot); c.diff = S.diff;
    return c;
  }

  // ── match setup ──────────────────────────────────────────────────
  function startOffline(mode: number, diff: number) {
    S.online = false; S.host = true; S.mode = mode; S.diff = diff;
    for (const c of cars.slice()) removeCar(c);
    makeCar(myId, S.myName || tt("Du", "You"), 0, false, false, 0);
    for (let i = 1; i < mode; i++) addBot(0, i);
    for (let i = 0; i < mode; i++) addBot(1, i);
    beginMatch();
  }
  function beginMatch() {
    S.score = [0, 0]; S.clock = MATCH; S.ot = false; for (const c of cars) { c.goals = 0; c.saves = 0; c.shots = 0; }
    ballMesh.visible = true; hideMenu(); kickoff(); audioOn(); cheer(0.25, 1.5);
  }
  function startOnlineMatch() {
    for (const c of cars.slice()) if (c.id === myId) removeCar(c);
    const mine = makeCar(myId, S.myName || tt("Spieler", "Player"), myTeam, false, false, lobbyMembers().filter((m) => m.team === myTeam).map((m) => m.id).sort().indexOf(myId));
    if (S.host) { fillBots(); beginMatch(); send("start", {}); }
    else { S.score = [0, 0]; hideMenu(); placeKick(mine); audioOn(); }
  }

  // ── UI ───────────────────────────────────────────────────────────
  const hud = document.createElement("div"); hud.className = "tb-hud"; wrap.appendChild(hud);
  const ico = {
    cam: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/></svg>`,
    fs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`,
  };
  hud.innerHTML = `
    <div class="tb-score"><div class="tb-team-s blue"><b class="tb-sb">0</b><small>${tt("BLAU", "BLUE")}</small></div><div class="tb-mid"><span class="tb-clock">5:00</span><span class="tb-ot"></span></div><div class="tb-team-s orange"><b class="tb-so">0</b><small>ORANGE</small></div></div>
    <div class="tb-msg"><span></span></div><div class="tb-big"></div>
    <div class="tb-speed"><span>0</span><small>KM/H</small></div>
    <div class="tb-boost"><svg viewBox="0 0 120 120"><defs><linearGradient id="tbBoostG" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ff5a00"/><stop offset=".6" stop-color="#ffb020"/><stop offset="1" stop-color="#fff2a0"/></linearGradient></defs>
      <circle cx="60" cy="60" r="40" class="disc"/><path d="M 22.4 81.7 A 46 46 0 1 1 97.6 81.7" class="bg"/><path d="M 22.4 81.7 A 46 46 0 1 1 97.6 81.7" class="ticks"/><path d="M 22.4 81.7 A 46 46 0 1 1 97.6 81.7" class="fg"/></svg><b>33</b><small>BOOST</small></div>
    <div class="tb-ic l"><button data-a="pause" aria-label="Pause">${ico.pause}</button></div>
    <div class="tb-ic r"><button data-a="cam" class="tb-cam">${ico.cam}<span>${tt("Ball-Kamera", "Ball cam")}</span></button><button data-a="fs" aria-label="${tt("Vollbild", "Fullscreen")}">${ico.fs}</button></div>
    ${touch ? `<div class="tb-joy"><i></i></div><div class="tb-btns"><button data-p="boost" class="b">BOOST</button><button data-p="jump" class="j">${tt("SPRUNG", "JUMP")}</button><button data-p="slide" class="r">DRIFT</button></div>` : ""}
    <div class="tb-menu"></div>`;
  const $ = (s: string) => hud.querySelector(s) as HTMLElement;
  const ui = { sb: $(".tb-sb"), so: $(".tb-so"), clock: $(".tb-clock"), ot: $(".tb-ot"), msg: $(".tb-msg"), msgT: $(".tb-msg span"), big: $(".tb-big"), boostBox: $(".tb-boost"), boost: $(".tb-boost b"), ring: $(".tb-boost .fg"), speed: $(".tb-speed"), speedT: $(".tb-speed span"), cam: $(".tb-cam span"), camB: $(".tb-cam"), menu: $(".tb-menu"), play: [$(".tb-score"), $(".tb-boost"), $(".tb-speed"), $(".tb-ic.r"), $(".tb-ic.l")] };
  const ARC = 2 * Math.PI * 46 * (280 / 360);
  ui.ring.style.strokeDasharray = `${ARC} 999`;
  let msgT = 0;
  function msg(t: string) { ui.msgT.textContent = t; ui.msg.style.opacity = "1"; msgT = 3; }
  function showGoal(team: 0 | 1, who: string) {
    const kmh = Math.round(ball.v.length() * 3.6 * 1.6);
    ui.big.innerHTML = `<div class="tb-goalwrap"><div class="tb-goalband ${team === 0 ? "blue" : "orange"}"></div><div class="tb-goaltxt"><b>${tt("TOR!", "GOAL!")}</b><span>${who ? `${who} · ` : ""}${kmh} KM/H</span></div></div>`;
    ui.big.style.display = "block"; (team === 0 ? ui.sb : ui.so).classList.remove("pop"); void ui.sb.offsetWidth; (team === 0 ? ui.sb : ui.so).classList.add("pop");
    setTimeout(() => { if (S.phase !== "end" && ui.big.querySelector(".tb-goalwrap")) ui.big.style.display = "none"; }, 3000);
  }
  // fullscreen (real API, CSS fallback on iPhone)
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
  function togglePause() {
    if (S.phase === "menu" || S.phase === "end") return;
    S.paused = !S.paused;
    if (S.paused) { openPanel(`<div class="tb-panel"><div class="tb-ph"><h2>${tt("PAUSE", "PAUSED")}</h2></div>${S.online ? `<p class="tb-hint">${tt("Online läuft das Spiel weiter.", "Online, the match keeps running.")}</p>` : ""}<button data-a="resume" class="tb-go"><span>${tt("WEITER", "RESUME")}</span></button><div class="tb-row"><button data-a="fs" class="tb-ghost">${tt("Vollbild", "Fullscreen")}</button><button data-a="quit" class="tb-ghost">${tt("Spiel verlassen", "Leave match")}</button></div>${controlsHtml()}</div>`); }
    else ui.menu.style.display = "none";
  }
  const controlsHtml = () => `<details class="tb-keys"><summary>${tt("STEUERUNG", "CONTROLS")}</summary><div>
    <b>W / S</b><span>${tt("Gas, Bremse, rückwärts · in der Luft: Nase hoch/runter", "throttle, brake, reverse · in the air: pitch")}</span>
    <b>A / D</b><span>${tt("lenken · in der Luft: drehen", "steer · in the air: yaw")}</span>
    <b>${tt("Leertaste", "Space")}</b><span>${tt("springen (halten = höher) · nochmal: Doppelsprung, mit Richtung: Flip", "jump (hold = higher) · again: double jump, with a direction: flip")}</span>
    <b>Shift</b><span>${tt("Boost (auch Linksklick)", "boost (or left click)")}</span>
    <b>Strg / Q</b><span>${tt("Driften · in der Luft rollen", "powerslide · air roll")}</span>
    <b>C</b><span>${tt("Ball-Kamera an/aus", "ball cam on/off")}</span>
    <b>F</b><span>${tt("Vollbild", "fullscreen")}</span>
    <b>🎮</b><span>${tt("RT/LT Gas/Rück · A Sprung · B Boost · X Drift · Y Kamera", "RT/LT throttle/reverse · A jump · B boost · X slide · Y camera")}</span>
    <b>📱</b><span>${tt("Joystick zeigt die Richtung und fährt · Boost · Sprung · Drift", "stick points the way and drives · boost · jump · drift")}</span></div></details>`;
  let menuView: "main" | "solo" | "online" | "lobby" = "main";
  function openPanel(html: string) { ui.menu.className = "tb-menu center"; ui.menu.innerHTML = html; ui.menu.style.display = "flex"; }
  function showMenu() { S.phase = "menu"; S.paused = false; ui.big.style.display = "none"; menuView = "main"; renderMenu(); }
  function hideMenu() { ui.menu.style.display = "none"; }
  const chips = (k: string, opts: [number, string, string?][], cur: number) => `<div class="tb-chips" data-k="${k}">${opts.map(([v, l, sub]) => `<button data-v="${v}" class="${cur === v ? "on" : ""}"><span>${l}${sub ? `<small>${sub}</small>` : ""}</span></button>`).join("")}</div>`;
  const nameIn = () => `<label class="tb-name">${tt("NAME", "NAME")}<input maxlength="16" value="${(S.myName || "").replace(/"/g, "")}" placeholder="${tt("Dein Name", "Your name")}"></label>`;
  const modes = () => chips("mode", [[1, "1 v 1"], [2, "2 v 2"], [3, "3 v 3"]], S.mode);
  function renderMenu() {
    if (menuView === "main") {
      ui.menu.className = "tb-menu"; ui.menu.style.display = "block";
      ui.menu.innerHTML = `<div class="tb-main-l"><h1 class="tb-logo"><span class="a">ROCKET</span><span class="b">FOOTBALL</span></h1><p class="tb-tag">${tt("Auto-Fußball · Boost · Flips · Tore", "Car soccer · boost · flips · goals")}</p>
        ${nameIn()}
        <button class="tb-item hot" data-a="solo"><i>⚡</i><span><b>${tt("SPIELEN", "PLAY")}</b><small>${tt("Gegen Bots · 1v1 bis 3v3", "Vs bots · 1v1 to 3v3")}</small></span></button>
        <button class="tb-item hot2" data-a="online"><i>🌐</i><span><b>ONLINE</b><small>${tt("Mit Freunden per Code", "With friends via code")}</small></span></button>
        <button class="tb-item" data-a="fs"><i>⛶</i><span><b>${tt("VOLLBILD", "FULLSCREEN")}</b><small>${tt("Für das beste Erlebnis", "For the best experience")}</small></span></button>
        ${controlsHtml()}</div>`;
      return;
    }
    if (menuView === "solo") openPanel(`<div class="tb-panel"><div class="tb-ph"><h2>${tt("GEGEN BOTS", "VS BOTS")}</h2><button class="tb-ghost tb-back" data-a="back">✕</button></div>
      <div class="tb-lbl">${tt("MODUS", "MODE")}</div>${modes()}
      <div class="tb-lbl">${tt("BOT-STÄRKE", "BOT SKILL")}</div>${chips("diff", [[0, tt("Anfänger", "Rookie"), tt("zum Reinkommen", "to get started")], [1, "Profi", tt("Aerials, Flips", "aerials, flips")], [2, "Champion", tt("gnadenlos", "merciless")]], S.diff)}
      <button class="tb-go" data-a="go"><span>${tt("ANSTOSS!", "KICK OFF!")}</span></button></div>`);
    if (menuView === "online") openPanel(`<div class="tb-panel"><div class="tb-ph"><h2>ONLINE</h2><button class="tb-ghost tb-back" data-a="back">✕</button></div>${nameIn()}
      <div class="tb-lbl">${tt("NEUER RAUM", "NEW ROOM")}</div>${modes()}
      <button class="tb-go" data-a="create"><span>${tt("RAUM ERSTELLEN", "CREATE ROOM")}</span></button>
      <div class="tb-lbl">${tt("BEITRETEN", "JOIN")}</div>
      <div class="tb-join"><input class="tb-code" maxlength="5" placeholder="CODE"><button class="tb-go orange" data-a="join" style="padding:10px 18px;font-size:18px"><span>${tt("LOS", "GO")}</span></button></div>
      <p class="tb-hint">${tt("Freie Plätze füllen Bots auf.", "Bots fill the empty seats.")}</p></div>`);
    if (menuView === "lobby") renderLobby();
  }
  function renderLobby() {
    if (menuView !== "lobby" || S.phase !== "menu") return;
    const ms = lobbyMembers();
    const col = (team: 0 | 1) => {
      const list = ms.filter((m) => m.team === team);
      const rows = list.map((m) => `<li><span>${m.name || "?"}</span>${m.id === myId ? `<i>${tt("DU", "YOU")}</i>` : ""}</li>`).join("") + Array.from({ length: Math.max(0, S.mode - list.length) }, () => `<li class="bot"><span>🤖 Bot</span></li>`).join("");
      return `<div class="tb-team ${team === 0 ? "blue" : "orange"}"><h3>${team === 0 ? tt("BLAU", "BLUE") : "ORANGE"}</h3><ul>${rows}</ul>${myTeam !== team ? `<button class="tb-ghost" data-a="team" data-t="${team}">${tt("Beitreten", "Join")}</button>` : ""}</div>`;
    };
    openPanel(`<div class="tb-panel wide"><div class="tb-ph"><h2>${tt("RAUM", "ROOM")}</h2><button class="tb-ghost tb-back" data-a="leave">✕</button></div>
      <div class="tb-codebox"><span class="tb-codebig">${S.code}</span><button class="tb-ghost" data-a="copy">${tt("Kopieren", "Copy")}</button></div>
      <p class="tb-hint">${tt("Freunde öffnen Rocket Football → Online → Code eingeben.", "Friends open Rocket Football → Online → enter the code.")}</p>
      ${S.host ? `${modes()}${chips("diff", [[0, tt("Bots leicht", "Easy bots")], [1, tt("Bots mittel", "Medium bots")], [2, tt("Bots schwer", "Hard bots")]], S.diff)}` : `<p class="tb-hint">${S.mode} v ${S.mode}</p>`}
      <div class="tb-teams">${col(0)}${col(1)}</div>
      ${S.host ? `<button class="tb-go" data-a="start"><span>${tt("SPIEL STARTEN", "START MATCH")}</span></button>` : `<p class="tb-hint">${tt("Warte auf den Gastgeber …", "Waiting for the host …")}</p>`}</div>`);
  }
  const pts = (c: Car) => c.goals * 100 + c.saves * 50 + c.shots * 20;
  function showEnd() {
    const mine = me(), won = mine ? S.score[mine.team] > S.score[1 - mine.team] : S.score[0] > S.score[1];
    const mvp = cars.slice().sort((a, b) => pts(b) - pts(a))[0];
    const rows = cars.slice().sort((a, b) => a.team - b.team || pts(b) - pts(a)).map((c) => `<tr class="${c.team === 0 ? "blue" : "orange"}${c.id === myId ? " me" : ""}"><td>${c.name}${c.bot ? " 🤖" : ""}</td><td class="pts">${pts(c)}</td><td>${c.goals}</td><td>${c.shots}</td><td>${c.saves}</td></tr>`).join("");
    openPanel(`<div class="tb-panel wide"><div class="tb-result ${won ? "win" : "lose"}">${won ? tt("SIEG!", "VICTORY!") : tt("NIEDERLAGE", "DEFEAT")}</div>
      <div class="tb-final"><b class="blue">${S.score[0]}</b><span>–</span><b class="orange">${S.score[1]}</b></div>
      ${mvp ? `<div class="tb-mvp"><b>MVP</b><span>★ ${mvp.name}</span></div>` : ""}
      <table class="tb-stats"><tr><th></th><th>${tt("PUNKTE", "SCORE")}</th><th>${tt("TORE", "GOALS")}</th><th>${tt("SCHÜSSE", "SHOTS")}</th><th>${tt("PARADEN", "SAVES")}</th></tr>${rows}</table>
      ${S.online ? (S.host ? `<button class="tb-go" data-a="again"><span>${tt("REVANCHE", "REMATCH")}</span></button>` : `<p class="tb-hint">${tt("Der Gastgeber kann eine Revanche starten.", "The host can start a rematch.")}</p>`) + `<button class="tb-ghost" data-a="leave">${tt("Raum verlassen", "Leave room")}</button>` : `<div class="tb-row"><button class="tb-go" data-a="rematch"><span>${tt("NOCHMAL", "PLAY AGAIN")}</span></button></div><button class="tb-ghost" data-a="menu">${tt("Hauptmenü", "Main menu")}</button>`}</div>`);
  }
  const newCode = () => { const A2 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; const r = crypto.getRandomValues(new Uint32Array(5)); for (const x of r) s += A2[x % A2.length]; return s; };
  on(hud, "input", (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.closest(".tb-name")) { S.myName = t.value.trim().slice(0, 16); try { localStorage.setItem(NAME_KEY, S.myName); } catch { /* ignore */ } }
  });
  on(hud, "click", async (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null; if (!el) return;
    audioOn(); tone(1200, 0.05, 0.04, "square");
    const seg = el.closest(".tb-chips") as HTMLElement | null;
    if (seg) { const k = seg.dataset.k, v = +el.dataset.v!; if (k === "mode") S.mode = v; if (k === "diff") S.diff = v; if (menuView === "lobby") { sendCfg(); renderLobby(); } else renderMenu(); return; }
    const a = el.dataset.a;
    if (a === "solo") { menuView = "solo"; renderMenu(); }
    else if (a === "online") { menuView = "online"; renderMenu(); }
    else if (a === "back" || a === "menu") { menuView = "main"; if (a === "menu") { for (const c of cars.slice()) removeCar(c); S.phase = "menu"; } renderMenu(); }
    else if (a === "go" || a === "rematch") { if (touch && !isFs()) toggleFs(); startOffline(S.mode, S.diff); }
    else if (a === "create") { el.disabled = true; menuView = "lobby"; myTeam = 0; try { await connect(newCode(), true); } catch { msg(tt("Verbindung fehlgeschlagen.", "Connection failed.")); menuView = "online"; } renderMenu(); }
    else if (a === "join") {
      const code = ((hud.querySelector(".tb-code") as HTMLInputElement)?.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 4) { msg(tt("Bitte den Code eingeben.", "Please enter the code.")); return; }
      el.disabled = true; menuView = "lobby"; myTeam = 1;
      try { await connect(code, false); } catch { msg(tt("Verbindung fehlgeschlagen.", "Connection failed.")); menuView = "online"; }
      renderMenu();
    }
    else if (a === "copy") { try { await navigator.clipboard.writeText(S.code); msg(tt("Code kopiert!", "Code copied!")); } catch { /* ignore */ } }
    else if (a === "team") { myTeam = (+el.dataset.t! as 0 | 1); await ch?.track({ name: S.myName, team: myTeam }); }
    else if (a === "start") { if (touch && !isFs()) toggleFs(); startOnlineMatch(); }
    else if (a === "again") { S.phase = "menu"; startOnlineMatch(); }
    else if (a === "leave") leaveOnline();
    else if (a === "cam") toggleCam();
    else if (a === "fs") toggleFs();
    else if (a === "pause" || a === "resume") togglePause();
    else if (a === "quit") { S.paused = false; if (S.online) leaveOnline(); else { for (const c of cars.slice()) removeCar(c); showMenu(); } }
  });
  on(window, "keydown", (e: KeyboardEvent) => { if (e.code === "KeyF" && (e.target as HTMLElement)?.tagName !== "INPUT") toggleFs(); });
  // touch controls
  if (touch) {
    const joy = $(".tb-joy"), knob = joy.querySelector("i") as HTMLElement;
    let jid = -1, jx = 0, jy = 0;
    on(joy, "pointerdown", (e: PointerEvent) => { jid = e.pointerId; const r = joy.getBoundingClientRect(); jx = r.left + r.width / 2; jy = r.top + r.height / 2; joy.setPointerCapture(e.pointerId); audioOn(); });
    on(joy, "pointermove", (e: PointerEvent) => { if (e.pointerId !== jid) return; const dx = (e.clientX - jx) / 50, dy = (e.clientY - jy) / 50, l = Math.hypot(dx, dy); const k = l > 1 ? 1 / l : 1; pad.x = dx * k; pad.y = dy * k; knob.style.transform = `translate(${pad.x * 40}px, ${pad.y * 40}px)`; });
    const up = (e: PointerEvent) => { if (e.pointerId !== jid) return; jid = -1; pad.x = pad.y = 0; knob.style.transform = ""; };
    on(joy, "pointerup", up); on(joy, "pointercancel", up);
    hud.querySelectorAll("[data-p]").forEach((b) => {
      const k = (b as HTMLElement).dataset.p as "boost" | "jump" | "slide";
      on(b as HTMLElement, "pointerdown", (e: PointerEvent) => { e.preventDefault(); pad[k] = true; b.classList.add("on"); audioOn(); });
      const off = () => { pad[k] = false; b.classList.remove("on"); };
      on(b as HTMLElement, "pointerup", off); on(b as HTMLElement, "pointercancel", off); on(b as HTMLElement, "pointerleave", off);
    });
  }
  let lastCount = -1, lastScore = "0:0";
  function drawHud(dt: number) {
    const sc = S.score.join(":");
    if (sc !== lastScore) { lastScore = sc; ui.sb.textContent = String(S.score[0]); ui.so.textContent = String(S.score[1]); }
    const ck = Math.max(0, Math.ceil(S.clock));
    ui.clock.textContent = `${S.ot ? "+" : ""}${Math.floor(ck / 60)}:${String(ck % 60).padStart(2, "0")}`;
    ui.clock.classList.toggle("low", !S.ot && ck <= 30 && S.phase === "play");
    ui.ot.textContent = S.ot ? tt("VERLÄNGERUNG", "OVERTIME") : "";
    const mine = me(), b = mine ? Math.round(mine.boost) : 0;
    ui.boost.textContent = String(b); ui.ring.style.strokeDashoffset = String(ARC * (1 - b / 100));
    ui.boostBox.classList.toggle("on", !!mine?.boosting);
    const kmh = mine ? Math.round(mine.v.length() * 3.6 * 1.6) : 0;
    ui.speedT.textContent = String(kmh); ui.speed.classList.toggle("ss", !!mine && mine.v.length() > SUPERSONIC);
    const inGame = S.phase !== "menu";
    for (const el of ui.play) el.style.visibility = inGame ? "visible" : "hidden";
    if (S.phase === "count") {
      const n = Math.max(1, Math.ceil(S.countT));
      if (n !== lastCount) { lastCount = n; ui.big.innerHTML = `<div class="tb-count">${n}</div>`; ui.big.style.display = "block"; }
    } else if (lastCount > 0 && S.phase === "play") {
      lastCount = 0; ui.big.innerHTML = `<div class="tb-count go">GO!</div>`; ui.big.style.display = "block";
      setTimeout(() => { if (ui.big.querySelector(".tb-count.go")) ui.big.style.display = "none"; }, 800);
    }
    msgT -= dt; if (msgT <= 0) ui.msg.style.opacity = "0";
  }

  // ── render loop ──────────────────────────────────────────────────
  const camPos = new THREE.Vector3(0, 20, -70), camLook = new THREE.Vector3();
  let camYaw = 0;
  let last = performance.now(), acc = 0, menuAng = 0;
  function frame() {
    if (!alive) return;
    requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S.phase !== "menu" && !(S.paused && !S.online)) { acc += dt; while (acc >= 1 / 60) { simulate(1 / 60); acc -= 1 / 60; } }
    // remote cars: follow the latest state, extrapolated a little
    for (const c of cars) if (c.remote && c.tgt) {
      const age = Math.min(0.25, (now - c.tgt.t) / 1000);
      tv.copy(c.tgt.p).addScaledVector(c.tgt.v, age);
      if (c.p.distanceTo(tv) > 10) c.p.copy(tv); else c.p.lerp(tv, Math.min(1, dt * 14));
      c.q.slerp(c.tgt.q, Math.min(1, dt * 14)); c.v.copy(c.tgt.v); c.boosting = c.tgt.b;
    }
    netTick(dt);
    // place meshes
    for (const c of cars) {
      c.mesh.group.position.copy(c.p); c.mesh.group.quaternion.copy(c.q);
      c.mesh.flame.visible = c.boosting && c.dead <= 0;
      if (c.mesh.flame.visible) c.mesh.flame.scale.set(1, 1, 0.8 + Math.random() * 0.5);
      const sp = c.v.dot(fwdV.set(0, 0, 1).applyQuaternion(c.q));
      c.mesh.wheels.forEach((w, i) => { w.children[0].rotation.x += sp * dt / 0.42; w.children[1].rotation.x = w.children[0].rotation.x; if (i < 2) w.rotation.y = -(c.inp.S || 0) * 0.4; });
      if (c.mesh.name) c.mesh.name.visible = c.id !== myId && S.phase !== "menu";
    }
    for (const pd of arena.pads) { const on2 = pd.t <= 0; pd.mesh.visible = on2; if (pd.orb) { pd.orb.visible = on2; pd.orb.position.y = 1.6 + Math.sin(now / 300 + pd.x) * 0.25; pd.orb.rotation.y += dt * 2; } }
    ballMesh.position.copy(ball.p);
    const bs = ball.v.length(); if (bs > 0.1) { tv.set(ball.v.z, 0, -ball.v.x).normalize(); tq.setFromAxisAngle(tv, (bs * dt) / BALL_R); ballMesh.quaternion.premultiply(tq); }
    ballShadow.position.set(ball.p.x, 0.03, ball.p.z); ballShadow.scale.setScalar(Math.max(0.4, 1 - ball.p.y / 30)); ballShadow.visible = ballMesh.visible;
    stepFx(dt);
    // engine sound
    const mine = me();
    if (ac && engG && eng && boostG) {
      const sp = mine ? mine.v.length() : 0;
      eng.frequency.setTargetAtTime(45 + sp * 4.2, ac.currentTime, 0.05);
      engG.gain.setTargetAtTime(mine && S.phase !== "menu" ? 0.05 + Math.min(0.06, sp / 600) : 0, ac.currentTime, 0.1);
      boostG.gain.setTargetAtTime(mine?.boosting ? 0.12 : 0, ac.currentTime, 0.05);
    }
    // camera
    const inMenu = S.phase === "menu" || !mine;
    show.group.visible = disc.visible = discRing.visible = inMenu && menuView === "main";
    if (inMenu && menuView === "main") {
      // showroom: slow orbit, car on the right side of the screen
      menuAng += dt * 0.25; show.group.rotation.y += dt * 0.35;
      show.flame.scale.set(1, 1, 0.6 + Math.random() * 0.4);
      camPos.set(SHOW.x + Math.sin(menuAng) * 11, 3.4, SHOW.z + Math.cos(menuAng) * 11);
      const vx = SHOW.x - camPos.x, vz = SHOW.z - camPos.z, vl = Math.hypot(vx, vz);
      const asp = camera.aspect, off = asp > 1.2 ? 3.6 : 0;
      camLook.set(SHOW.x + (vz / vl) * off, 1.3, SHOW.z - (vx / vl) * off);
      camera.position.copy(camPos); camera.lookAt(camLook);
    } else if (inMenu) {
      menuAng += dt * 0.08;
      camPos.set(Math.sin(menuAng) * 70, 26, Math.cos(menuAng) * 90); camLook.set(0, 4, 0);
      camera.position.copy(camPos); camera.lookAt(camLook);
    } else {
      // Rocket-League-like camera: the car always stays in the lower part of the picture.
      // Ball cam turns smoothly towards the ball (horizontal angle only); car cam follows the driving direction.
      const tgt = mine.dead > 0 ? camLook : mine.p;
      const bx = ball.p.x - mine.p.x, bz = ball.p.z - mine.p.z, bdist = Math.hypot(bx, bz);
      let wantYaw = camYaw;
      if (S.ballCam && S.phase !== "goal") { if (bdist > 4) wantYaw = Math.atan2(bx, bz); }
      else { const vl = Math.hypot(mine.v.x, mine.v.z); wantYaw = vl > 4 ? Math.atan2(mine.v.x, mine.v.z) : Math.atan2(fwdV.set(0, 0, 1).applyQuaternion(mine.q).x, fwdV.z); }
      let dy = wantYaw - camYaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      camYaw += dy * Math.min(1, dt * (S.ballCam ? 5 : 4));
      const dx = Math.sin(camYaw), dz = Math.cos(camYaw);
      const lift = S.ballCam ? Math.max(0, Math.min(5, (ball.p.y - tgt.y) * 0.12)) : 0;
      const want = tv.set(tgt.x - dx * 10.5, tgt.y + 3.4 + lift * 0.4, tgt.z - dz * 10.5);
      // keep the camera inside the arena
      const dIn = sdf(want.x, want.y, want.z); if (dIn < 1) want.addScaledVector(grad(want.x, want.y, want.z, tv2), 1 - dIn);
      want.y = Math.max(1.2, Math.min(A.H - 1, want.y));
      camPos.lerp(want, Math.min(1, dt * 12));
      camLook.lerp(tv2.set(tgt.x + dx * 4, tgt.y + 1.6 + lift, tgt.z + dz * 4), Math.min(1, dt * 14));
      camera.position.copy(camPos);
      if (S.shake > 0) { camera.position.x += (Math.random() - 0.5) * S.shake; camera.position.y += (Math.random() - 0.5) * S.shake; S.shake = Math.max(0, S.shake - dt * 2); }
      camera.lookAt(camLook);
      const spd = mine.v.length(), fov = (touch ? 80 : 75) + Math.min(10, spd / 4);
      if (Math.abs(camera.fov - fov) > 0.3) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
    }
    drawHud(dt);
    composer.render();
  }
  showMenu();
  requestAnimationFrame(frame);
  (root as unknown as { __tb: unknown }).__tb = { S, cars, ball, simulate, kickoff, startOffline, me, keys, goal, connect, members, camera, renderer, scene };

  return () => {
    alive = false;
    for (const f of cleanups) f();
    if (ch && sb) void sb.removeChannel(ch);
    try { void ac?.close(); } catch { /* ignore */ }
    renderer.dispose(); pmrem.dispose();
    root.innerHTML = "";
  };
}
