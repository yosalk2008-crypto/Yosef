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
  boost: number; boosting: boolean; jumpT: number; flipT: number; flipAxis: THREE.Vector3; flipped: boolean; prevJ: boolean;
  dead: number; hitCd: number; mesh: CarMesh; inp: Inp; slot: number; upT: number;
  goals: number; saves: number; shots: number; tgt?: { p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; t: number; b: boolean };
};

const BALL_R = 2.1, G = 22, CAR_HALF = new THREE.Vector3(1.05, 0.55, 1.85), CAR_UP = 0.6;
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
    const c: Car = { id, name, team, bot, remote, diff: S.diff, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), yaw: 0, ground: true, boost: 33, boosting: false, jumpT: 0, flipT: 0, flipAxis: new THREE.Vector3(), flipped: false, prevJ: false, dead: 0, hitCd: 0, mesh, inp: { T: 0, S: 0, B: false, J: false, slide: false, roll: 0, P: 0 }, slot, upT: 0, goals: 0, saves: 0, shots: 0 };
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
        c.p.set(team === 0 ? x : -x, 0, z * sz); c.v.set(0, 0, 0); c.yaw = Math.atan2(-c.p.x, -c.p.z); c.q.setFromEuler(new THREE.Euler(0, c.yaw, 0)); c.ground = true; c.boost = 33; c.dead = 0; c.flipT = 0; c.flipped = false; c.mesh.group.visible = true;
      });
    }
    S.phase = "count"; S.countT = 3; for (const p of arena.pads) p.t = 0;
    beep(3);
  }
  let lastBeep = 0;
  function beep(n: number) { if (n !== lastBeep) { lastBeep = n; tone(n > 0 ? 660 : 990, n > 0 ? 0.15 : 0.4, 0.25, "square"); } }

  // ── arena collisions ─────────────────────────────────────────────
  const tmpN = new THREE.Vector3();
  /** Pushes a sphere out of the arena walls. Returns impact speed (0 when nothing was hit). */
  function collide(p: THREE.Vector3, v: THREE.Vector3, r: number, e: number, fr = 0.97) {
    const { W, L, H, RC, GW, GH, GD } = A;
    let hit = 0;
    const bounce = (nx: number, ny: number, nz: number, pen: number) => {
      p.x += nx * pen; p.y += ny * pen; p.z += nz * pen;
      const vn = v.x * nx + v.y * ny + v.z * nz;
      if (vn < 0) { v.x -= (1 + e) * vn * nx; v.y -= (1 + e) * vn * ny; v.z -= (1 + e) * vn * nz; v.x *= fr; v.z *= fr; if (ny === 0) v.y *= fr; hit = Math.max(hit, -vn); }
    };
    const inMouth = Math.abs(p.x) < GW / 2 && p.y < GH;
    if (Math.abs(p.z) > L / 2 - r && inMouth) {
      // inside a goal
      const s = Math.sign(p.z);
      if (p.x > GW / 2 - r) bounce(-1, 0, 0, p.x - (GW / 2 - r));
      if (p.x < -GW / 2 + r) bounce(1, 0, 0, -GW / 2 + r - p.x);
      if (p.y > GH - r && Math.abs(p.z) > L / 2) bounce(0, -1, 0, p.y - (GH - r));
      if (Math.abs(p.z) > L / 2 + GD - r) bounce(0, 0, -s, Math.abs(p.z) - (L / 2 + GD - r));
    } else {
      // crossbar / posts: treat the goal frame edge as a wall when outside the mouth
      if (p.x > W / 2 - r) bounce(-1, 0, 0, p.x - (W / 2 - r));
      if (p.x < -W / 2 + r) bounce(1, 0, 0, -W / 2 + r - p.x);
      if (p.z > L / 2 - r) bounce(0, 0, -1, p.z - (L / 2 - r));
      if (p.z < -L / 2 + r) bounce(0, 0, 1, -L / 2 + r - p.z);
      const cx = W / 2 - RC, cz = L / 2 - RC;
      if (Math.abs(p.x) > cx && Math.abs(p.z) > cz) {
        const ox = Math.sign(p.x) * cx, oz = Math.sign(p.z) * cz, dx = p.x - ox, dz = p.z - oz, d = Math.hypot(dx, dz);
        if (d > RC - r) bounce(-dx / d, 0, -dz / d, d - (RC - r));
      }
    }
    if (p.y < r) bounce(0, 1, 0, r - p.y);
    if (p.y > A.H - r) bounce(0, -1, 0, p.y - (A.H - r));
    void H;
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
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      let vf = c.v.x * fx + c.v.z * fz, vs = c.v.x * fz - c.v.z * fx;
      const boosting = I.B && c.boost > 0;
      if (boosting) { vf += 26 * dt; c.boost = Math.max(0, c.boost - 33 * dt); }
      if (I.T > 0.05) vf += vf < -0.5 ? 50 * dt * I.T : Math.max(0, 34 * (1 - vf / MAX_DRIVE)) * I.T * dt;
      else if (I.T < -0.05) vf += vf > 0.5 ? -50 * dt * -I.T : -Math.max(0, 18 * (1 + vf / 14)) * -I.T * dt;
      else if (!boosting) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 7 * dt);
      const sp = Math.abs(vf), steerRate = (3.0 - Math.min(1.6, sp / 20)) * (I.slide ? 1.35 : 1);
      c.yaw -= I.S * steerRate * Math.min(1, sp / 3 + 0.15) * Math.sign(vf || 1) * dt;
      vs *= Math.exp(-(I.slide ? 1.3 : 14) * dt);
      vf = Math.max(-16, Math.min(MAX_CAR, vf));
      const nfx = Math.sin(c.yaw), nfz = Math.cos(c.yaw);
      c.v.set(nfx * vf + nfz * vs, 0, nfz * vf - nfx * vs);
      c.q.setFromEuler(new THREE.Euler(0, c.yaw, 0));
      c.boosting = boosting;
      if (jumpEdge) { c.v.y = 10.5; c.ground = false; c.jumpT = 0; c.flipped = false; c.p.y += 0.05; tone(300, 0.08, 0.06, "triangle"); }
    } else {
      c.jumpT += dt;
      // second jump: dodge in the stick direction, or a double jump
      if (jumpEdge && !c.flipped && c.jumpT < 1.4) {
        c.flipped = true;
        if (Math.abs(I.T) > 0.3 || Math.abs(I.S) > 0.3) {
          const yaw = Math.atan2(fwdV.set(0, 0, 1).applyQuaternion(c.q).x, fwdV.z);
          const lx = -I.S, lz = I.T, l = Math.hypot(lx, lz) || 1;
          const dx = (Math.sin(yaw) * lz + Math.cos(yaw) * lx) / l, dz = (Math.cos(yaw) * lz - Math.sin(yaw) * lx) / l;
          c.v.x += dx * 11; c.v.z += dz * 11; c.v.y = Math.max(c.v.y * 0.3, 1.5);
          c.flipT = 0.6; c.flipAxis.set(dz, 0, -dx).normalize();
          tone(420, 0.12, 0.08, "triangle", 220);
        } else { c.v.y += 9; tone(380, 0.08, 0.06, "triangle"); }
      }
      if (c.flipT > 0) {
        const k = Math.min(c.flipT, dt); c.flipT -= dt;
        tq.setFromAxisAngle(c.flipAxis, (Math.PI * 2 * k) / 0.6); c.q.premultiply(tq);
      } else {
        // air control in the car's own axes
        const pitch = -I.T * 4.6 * dt, yawR = (I.roll ? 0 : -I.S * 3.8) * dt, roll = (I.roll ? I.S * 4.6 : 0) * dt;
        tq.setFromEuler(new THREE.Euler(pitch, yawR, roll, "YXZ")); c.q.multiply(tq);
      }
      c.v.y -= G * dt;
      c.boosting = I.B && c.boost > 0;
      if (c.boosting) { axes(c); c.v.addScaledVector(fwdV, 28 * dt); c.boost = Math.max(0, c.boost - 33 * dt); }
    }
    if (c.v.length() > MAX_CAR) c.v.setLength(MAX_CAR);
    c.p.addScaledVector(c.v, dt);
    // arena: collide a sphere at the car's centre
    tv.copy(c.p); tv.y += 1.4; collide(tv, c.v, 1.4, 0.1, 0.9); c.p.set(tv.x, tv.y - 1.4, tv.z);
    if (!c.ground && c.p.y <= 0.05 && c.v.y <= 1.5 && c.jumpT > 0.1) {
      // landing: keep the heading, flip upright
      axes(c);
      c.yaw = Math.atan2(fwdV.x, fwdV.z);
      if (upV.y < 0.2) c.yaw = Math.atan2(-fwdV.x, -fwdV.z) + Math.PI;
      c.ground = true; c.p.y = 0; c.v.y = 0; c.flipT = 0; c.q.setFromEuler(new THREE.Euler(0, c.yaw, 0));
    }
    if (c.ground) c.p.y = 0;
    // boost pads
    for (const pd of arena.pads) {
      if (pd.t > 0 || c.boost >= 100 || c.p.y > 2) continue;
      if (Math.hypot(pd.x - c.p.x, pd.z - c.p.z) < (pd.big ? 2.4 : 1.6)) { c.boost = Math.min(100, c.boost + (pd.big ? 100 : 12)); pd.t = pd.big ? 10 : 4; if (c.id === myId) tone(pd.big ? 880 : 1200, 0.12, 0.08); }
    }
  }
  function respawn(c: Car) {
    const s = c.team === 0 ? -1 : 1;
    c.p.set((Math.random() - 0.5) * 30, 0, s * (A.L / 2 - 12)); c.v.set(0, 0, 0); c.yaw = s < 0 ? 0 : Math.PI; c.q.setFromEuler(new THREE.Euler(0, c.yaw, 0));
    c.ground = true; c.boost = 33; c.dead = 0; c.mesh.group.visible = true;
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
    ball.v.y -= G * 0.85 * dt;
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
  function botThink(c: Car) {
    const I = c.inp; I.J = false; I.B = false; I.slide = false; I.roll = 0;
    if (c.dead > 0) return;
    const goalZ = c.team === 0 ? A.L / 2 : -A.L / 2, ownZ = -goalZ, dir = Math.sign(goalZ);
    const mates = cars.filter((o) => o.team === c.team && o.dead <= 0);
    const dBall = (o: Car) => Math.hypot(o.p.x - ball.p.x, o.p.z - ball.p.z) + ((o.p.z - ball.p.z) * dir > 0 ? 18 : 0);
    const first = mates.reduce((a, b) => (dBall(a) <= dBall(b) ? a : b), c);
    // predicted ball spot
    const look = Math.min(1.0, Math.hypot(c.p.x - ball.p.x, c.p.z - ball.p.z) / 40) * (0.5 + c.diff * 0.25);
    const bx = ball.p.x + ball.v.x * look, bz = ball.p.z + ball.v.z * look;
    let tx: number, tz: number, attack = false;
    if (first === c || mates.length === 1) {
      attack = true;
      // aim to hit the ball towards the opponent goal: approach from behind
      const gx = 0 - bx, gz = goalZ - bz, gl = Math.hypot(gx, gz) || 1;
      const behind = (c.p.z - bz) * dir > -1.5; // car is in front of the ball (wrong side)
      if (behind) { tx = bx + (c.p.x > bx ? 7 : -7); tz = bz - dir * 9; }
      else { tx = bx - (gx / gl) * (BALL_R + 1.2); tz = bz - (gz / gl) * (BALL_R + 1.2); }
    } else {
      // support: sit between the ball and our goal
      const k = mates.indexOf(c) % 2 ? 0.65 : 0.4;
      tx = ball.p.x * 0.5; tz = ownZ + (ball.p.z - ownZ) * k;
      if (Math.abs(tz - ownZ) < 6) tz = ownZ + dir * 6;
    }
    // grab boost when low and far from the action
    if (c.boost < 25 && !attack) {
      let best: (typeof arena.pads)[number] | null = null, bd = 1e9;
      for (const pd of arena.pads) if (pd.t <= 0) { const d = Math.hypot(pd.x - c.p.x, pd.z - c.p.z) + (pd.big ? -10 : 0); if (d < bd) { bd = d; best = pd; } }
      if (best && bd < 30) { tx = best.x; tz = best.z; }
    }
    const want = Math.atan2(tx - c.p.x, tz - c.p.z);
    let da = want - c.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    const d = Math.hypot(tx - c.p.x, tz - c.p.z);
    I.S = Math.max(-1, Math.min(1, -da * 2.4));
    I.T = Math.abs(da) > 2.3 && d < 12 ? -1 : d < 3 && !attack ? 0 : 1;
    I.slide = Math.abs(da) > 1.4 && c.v.length() > 12;
    I.B = c.diff > 0 && Math.abs(da) < 0.3 && c.boost > 0 && (d > 18 || (attack && c.diff > 1 && d > 8)) && c.ground;
    if (!c.ground) { I.T = 0; I.S = 0; I.B = false; }
    // jumps and dodges into the ball
    const bd3 = Math.hypot(c.p.x - ball.p.x, c.p.z - ball.p.z);
    if (attack && c.ground && bd3 < 9 && ball.p.y > 3.2 && ball.p.y < 8 && Math.abs(da) < 0.5 && c.diff > 0) I.J = true;
    if (attack && c.ground && bd3 < 6.5 && ball.p.y < 3.5 && Math.abs(da) < 0.35 && c.v.length() > 14 && Math.random() < 0.05 * (1 + c.diff)) I.J = true;
    if (!c.ground && !c.flipped && c.jumpT > 0.12 && bd3 < 5.5 && c.diff > 0) { I.J = true; I.T = 1; I.S = 0; }
    if (c.ground && c.v.length() < 2 && Math.abs(da) > 2.5) I.T = -1;
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
    for (const c of cars) if (c.bot && authority) botThink(c);
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
  const pad = { x: 0, y: 0, gas: false, rev: false, boost: false, jump: false };
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
      if (Math.abs(pad.x) > 0.1) I.S = pad.x;
      if (pad.gas || pad.rev) I.T = (pad.gas ? 1 : 0) - (pad.rev ? 1 : 0);
      if (!me()?.ground && Math.abs(pad.y) > 0.2) I.T = -pad.y;
      if (pad.boost) I.B = true; if (pad.jump) I.J = true;
    }
    if (S.paused) { I.T = 0; I.S = 0; I.B = false; I.J = false; }
  }
  function toggleCam() { S.ballCam = !S.ballCam; ui.cam.textContent = S.ballCam ? tt("Ball-Kamera", "Ball cam") : tt("Auto-Kamera", "Car cam"); ui.cam.classList.toggle("off", !S.ballCam); }

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
    c.p.set(c.team === 0 ? x : -x, 0, z * s); c.v.set(0, 0, 0); c.yaw = Math.atan2(-c.p.x, -c.p.z); c.q.setFromEuler(new THREE.Euler(0, c.yaw, 0)); c.ground = true; c.boost = 33; c.dead = 0; c.mesh.group.visible = true;
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
  hud.innerHTML = `
    <div class="tb-score"><b class="tb-sb">0</b><span class="tb-clock">5:00</span><b class="tb-so">0</b></div>
    <div class="tb-msg"></div><div class="tb-big"></div>
    <div class="tb-boost"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="tb-bg"/><circle cx="50" cy="50" r="42" class="tb-fg"/></svg><b>33</b></div>
    <button class="tb-cam" data-a="cam">${tt("Ball-Kamera", "Ball cam")}</button>
    <button class="tb-pause" data-a="pause">❚❚</button>
    ${touch ? `<div class="tb-joy"><i></i></div><div class="tb-btns"><button data-p="jump" class="j">${tt("SPRUNG", "JUMP")}</button><button data-p="boost" class="b">BOOST</button><button data-p="gas" class="g">GAS</button><button data-p="rev" class="r">${tt("RÜCK", "REV")}</button></div>` : ""}
    <div class="tb-menu"></div>`;
  const $ = (s: string) => hud.querySelector(s) as HTMLElement;
  const ui = { sb: $(".tb-sb"), so: $(".tb-so"), clock: $(".tb-clock"), msg: $(".tb-msg"), big: $(".tb-big"), boost: $(".tb-boost b"), ring: $(".tb-fg"), cam: $(".tb-cam"), menu: $(".tb-menu") };
  let msgT = 0;
  function msg(t: string) { ui.msg.textContent = t; ui.msg.style.opacity = "1"; msgT = 3; }
  function showGoal(team: 0 | 1, who: string) {
    ui.big.innerHTML = `<div class="tb-goal ${team === 0 ? "blue" : "orange"}">${tt("TOR!", "GOAL!")}</div>${who ? `<small>${who}</small>` : ""}`;
    ui.big.style.display = "block"; setTimeout(() => { if (S.phase !== "end") ui.big.style.display = "none"; }, 2800);
  }
  S.paused = false;
  function togglePause() {
    if (S.phase === "menu" || S.phase === "end") return;
    S.paused = !S.paused;
    if (S.paused) { ui.menu.innerHTML = `<div class="tb-card"><h2>${tt("Pause", "Paused")}</h2>${S.online ? `<p>${tt("Online läuft das Spiel weiter.", "Online, the match keeps running.")}</p>` : ""}<button data-a="resume" class="tb-main">${tt("Weiter", "Resume")}</button><button data-a="quit">${tt("Spiel verlassen", "Leave match")}</button>${controlsHtml()}</div>`; ui.menu.style.display = "flex"; }
    else ui.menu.style.display = "none";
  }
  const controlsHtml = () => `<details class="tb-keys"><summary>${tt("Steuerung", "Controls")}</summary><div>
    <b>W / S</b><span>${tt("Gas / Bremse, rückwärts (in der Luft: Nase hoch/runter)", "throttle / brake, reverse (in the air: pitch)")}</span>
    <b>A / D</b><span>${tt("lenken (in der Luft: drehen)", "steer (in the air: yaw)")}</span>
    <b>${tt("Leertaste / Rechtsklick", "Space / right click")}</b><span>${tt("springen, in der Luft nochmal: Doppelsprung oder mit Richtung ein Flip", "jump, again in the air: double jump or flip with a direction")}</span>
    <b>${tt("Shift / Linksklick", "Shift / left click")}</b><span>Boost</span>
    <b>Strg / Q</b><span>${tt("Driften, in der Luft rollen", "powerslide, air roll")}</span>
    <b>C</b><span>${tt("Ball-Kamera an/aus", "ball cam on/off")}</span>
    <b>🎮</b><span>${tt("Controller: RT/LT Gas/Rück, A Sprung, B Boost, X Drift, Y Kamera", "Gamepad: RT/LT throttle/reverse, A jump, B boost, X slide, Y camera")}</span></div></details>`;
  let menuView: "main" | "solo" | "online" | "lobby" = "main";
  function showMenu() { S.phase = "menu"; S.paused = false; ui.menu.style.display = "flex"; ui.big.style.display = "none"; menuView = "main"; renderMenu(); }
  function hideMenu() { ui.menu.style.display = "none"; }
  function renderMenu() {
    const title = `<h1 class="tb-title">TURBO<span>BALL</span></h1><p class="tb-sub">${tt("Auto-Fußball · Boost · Flips · Tore", "Car soccer · boost · flips · goals")}</p>`;
    const nameIn = `<label class="tb-name">${tt("Dein Name", "Your name")}<input maxlength="16" value="${(S.myName || "").replace(/"/g, "")}" placeholder="${tt("Name", "Name")}"></label>`;
    if (menuView === "main") ui.menu.innerHTML = `<div class="tb-card">${title}${nameIn}<button class="tb-main" data-a="solo">${tt("Gegen Bots spielen", "Play vs bots")}</button><button class="tb-main alt" data-a="online">${tt("Online mit Freunden", "Online with friends")}</button>${controlsHtml()}</div>`;
    if (menuView === "solo") ui.menu.innerHTML = `<div class="tb-card"><h2>${tt("Gegen Bots", "Vs bots")}</h2>
      <div class="tb-seg" data-k="mode">${[1, 2, 3].map((m) => `<button data-v="${m}" class="${S.mode === m ? "on" : ""}">${m}v${m}</button>`).join("")}</div>
      <div class="tb-seg" data-k="diff">${[tt("Anfänger", "Rookie"), tt("Profi", "Pro"), tt("Champion", "All-star")].map((d, i) => `<button data-v="${i}" class="${S.diff === i ? "on" : ""}">${d}</button>`).join("")}</div>
      <button class="tb-main" data-a="go">${tt("Anstoß!", "Kick off!")}</button><button data-a="back">${tt("Zurück", "Back")}</button></div>`;
    if (menuView === "online") ui.menu.innerHTML = `<div class="tb-card"><h2>${tt("Online", "Online")}</h2>${nameIn}
      <div class="tb-seg" data-k="mode">${[1, 2, 3].map((m) => `<button data-v="${m}" class="${S.mode === m ? "on" : ""}">${m}v${m}</button>`).join("")}</div>
      <button class="tb-main" data-a="create">${tt("Raum erstellen", "Create room")}</button>
      <div class="tb-join"><input class="tb-code" maxlength="5" placeholder="${tt("CODE", "CODE")}"><button data-a="join">${tt("Beitreten", "Join")}</button></div>
      <p class="tb-hint">${tt("Freie Plätze füllen Bots auf.", "Bots fill the empty seats.")}</p><button data-a="back">${tt("Zurück", "Back")}</button></div>`;
    if (menuView === "lobby") renderLobby();
  }
  function renderLobby() {
    if (menuView !== "lobby" || S.phase !== "menu") return;
    const ms = lobbyMembers();
    const col = (team: 0 | 1) => {
      const list = ms.filter((m) => m.team === team);
      const rows = list.map((m) => `<li>${m.name || "?"}${m.id === myId ? ` <i>(${tt("du", "you")})</i>` : ""}</li>`).join("") + Array.from({ length: Math.max(0, S.mode - list.length) }, () => `<li class="bot">🤖 Bot</li>`).join("");
      return `<div class="tb-team ${team === 0 ? "blue" : "orange"}"><h3>${team === 0 ? tt("Blau", "Blue") : "Orange"}</h3><ul>${rows}</ul>${myTeam !== team ? `<button data-a="team" data-t="${team}">${tt("Wechseln", "Switch")}</button>` : ""}</div>`;
    };
    ui.menu.innerHTML = `<div class="tb-card wide"><h2>${tt("Raum", "Room")} <span class="tb-codebig">${S.code}</span></h2>
      <p class="tb-hint">${tt("Schick Freunden den Code. Sie gehen auf Turboball → Online → Code eingeben.", "Send your friends the code. They open Turboball → Online → enter the code.")}</p>
      ${S.host ? `<div class="tb-seg" data-k="mode">${[1, 2, 3].map((m) => `<button data-v="${m}" class="${S.mode === m ? "on" : ""}">${m}v${m}</button>`).join("")}</div><div class="tb-seg" data-k="diff">${[tt("Bots leicht", "Easy bots"), tt("Bots mittel", "Medium bots"), tt("Bots schwer", "Hard bots")].map((d, i) => `<button data-v="${i}" class="${S.diff === i ? "on" : ""}">${d}</button>`).join("")}</div>` : `<p class="tb-hint">${S.mode}v${S.mode}</p>`}
      <div class="tb-teams">${col(0)}${col(1)}</div>
      ${S.host ? `<button class="tb-main" data-a="start">${tt("Spiel starten", "Start match")}</button>` : `<p class="tb-hint">${tt("Warte auf den Gastgeber …", "Waiting for the host …")}</p>`}
      <button data-a="leave">${tt("Raum verlassen", "Leave room")}</button></div>`;
  }
  function showEnd() {
    const mine = me(), won = mine ? S.score[mine.team] > S.score[1 - mine.team] : S.score[0] > S.score[1];
    const rows = cars.slice().sort((a, b) => a.team - b.team || b.goals - a.goals).map((c) => `<tr class="${c.team === 0 ? "blue" : "orange"}"><td>${c.name}${c.bot ? " 🤖" : ""}</td><td>${c.goals}</td><td>${c.shots}</td><td>${c.saves}</td></tr>`).join("");
    ui.menu.innerHTML = `<div class="tb-card wide"><h2 class="${won ? "win" : "lose"}">${won ? tt("SIEG!", "VICTORY!") : tt("NIEDERLAGE", "DEFEAT")}</h2>
      <div class="tb-final"><b class="blue">${S.score[0]}</b><span>:</span><b class="orange">${S.score[1]}</b></div>
      <table class="tb-stats"><tr><th></th><th>${tt("Tore", "Goals")}</th><th>${tt("Schüsse", "Shots")}</th><th>${tt("Paraden", "Saves")}</th></tr>${rows}</table>
      ${S.online ? (S.host ? `<button class="tb-main" data-a="again">${tt("Revanche", "Rematch")}</button>` : `<p class="tb-hint">${tt("Der Gastgeber kann eine Revanche starten.", "The host can start a rematch.")}</p>`) + `<button data-a="leave">${tt("Raum verlassen", "Leave room")}</button>` : `<button class="tb-main" data-a="rematch">${tt("Nochmal", "Play again")}</button><button data-a="menu">${tt("Hauptmenü", "Main menu")}</button>`}</div>`;
    ui.menu.style.display = "flex";
  }
  const newCode = () => { const A2 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; const r = crypto.getRandomValues(new Uint32Array(5)); for (const x of r) s += A2[x % A2.length]; return s; };
  on(hud, "input", (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.closest(".tb-name")) { S.myName = t.value.trim().slice(0, 16); try { localStorage.setItem(NAME_KEY, S.myName); } catch { /* ignore */ } }
  });
  on(hud, "click", async (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null; if (!el) return;
    audioOn();
    const seg = el.closest(".tb-seg") as HTMLElement | null;
    if (seg) { const k = seg.dataset.k, v = +el.dataset.v!; if (k === "mode") S.mode = v; if (k === "diff") S.diff = v; if (menuView === "lobby") { sendCfg(); renderLobby(); } else renderMenu(); return; }
    const a = el.dataset.a;
    if (a === "solo") { menuView = "solo"; renderMenu(); }
    else if (a === "online") { menuView = "online"; renderMenu(); }
    else if (a === "back" || a === "menu") { menuView = "main"; renderMenu(); if (a === "menu") { for (const c of cars.slice()) removeCar(c); S.phase = "menu"; } }
    else if (a === "go" || a === "rematch") startOffline(S.mode, S.diff);
    else if (a === "create") { el.disabled = true; menuView = "lobby"; myTeam = 0; try { await connect(newCode(), true); } catch { msg(tt("Verbindung fehlgeschlagen.", "Connection failed.")); menuView = "online"; } renderMenu(); }
    else if (a === "join") {
      const code = ((hud.querySelector(".tb-code") as HTMLInputElement)?.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 4) { msg(tt("Bitte den Code eingeben.", "Please enter the code.")); return; }
      el.disabled = true; menuView = "lobby"; myTeam = 1;
      try { await connect(code, false); } catch { msg(tt("Verbindung fehlgeschlagen.", "Connection failed.")); menuView = "online"; }
      renderMenu();
    }
    else if (a === "team") { myTeam = (+el.dataset.t! as 0 | 1); await ch?.track({ name: S.myName, team: myTeam }); }
    else if (a === "start") startOnlineMatch();
    else if (a === "again") { S.phase = "menu"; startOnlineMatch(); }
    else if (a === "leave") leaveOnline();
    else if (a === "cam") toggleCam();
    else if (a === "pause") togglePause();
    else if (a === "resume") togglePause();
    else if (a === "quit") { S.paused = false; if (S.online) leaveOnline(); else { for (const c of cars.slice()) removeCar(c); showMenu(); } }
  });
  // touch controls
  if (touch) {
    const joy = $(".tb-joy"), knob = joy.querySelector("i") as HTMLElement;
    let jid = -1, jx = 0, jy = 0;
    on(joy, "pointerdown", (e: PointerEvent) => { jid = e.pointerId; const r = joy.getBoundingClientRect(); jx = r.left + r.width / 2; jy = r.top + r.height / 2; joy.setPointerCapture(e.pointerId); audioOn(); });
    on(joy, "pointermove", (e: PointerEvent) => { if (e.pointerId !== jid) return; const dx = (e.clientX - jx) / 50, dy = (e.clientY - jy) / 50, l = Math.hypot(dx, dy); const k = l > 1 ? 1 / l : 1; pad.x = dx * k; pad.y = dy * k; knob.style.transform = `translate(${pad.x * 40}px, ${pad.y * 40}px)`; });
    const up = (e: PointerEvent) => { if (e.pointerId !== jid) return; jid = -1; pad.x = pad.y = 0; knob.style.transform = ""; };
    on(joy, "pointerup", up); on(joy, "pointercancel", up);
    hud.querySelectorAll("[data-p]").forEach((b) => {
      const k = (b as HTMLElement).dataset.p as "gas" | "rev" | "boost" | "jump";
      on(b as HTMLElement, "pointerdown", (e: PointerEvent) => { e.preventDefault(); pad[k] = true; b.classList.add("on"); audioOn(); });
      const off = () => { pad[k] = false; b.classList.remove("on"); };
      on(b as HTMLElement, "pointerup", off); on(b as HTMLElement, "pointercancel", off); on(b as HTMLElement, "pointerleave", off);
    });
  }
  function drawHud(dt: number) {
    ui.sb.textContent = String(S.score[0]); ui.so.textContent = String(S.score[1]);
    const ck = Math.max(0, Math.ceil(S.clock)); ui.clock.textContent = `${S.ot ? "+" : ""}${Math.floor(ck / 60)}:${String(ck % 60).padStart(2, "0")}`;
    const mine = me(), b = mine ? Math.round(mine.boost) : 0;
    ui.boost.textContent = String(b); ui.ring.style.strokeDashoffset = String(264 * (1 - b / 100));
    if (S.phase === "count") { ui.big.innerHTML = `<div class="tb-count">${Math.max(1, Math.ceil(S.countT))}</div>`; ui.big.style.display = "block"; }
    else if (S.phase === "play" && ui.big.querySelector(".tb-count")) { ui.big.innerHTML = `<div class="tb-count go">GO!</div>`; setTimeout(() => { if (S.phase === "play") ui.big.style.display = "none"; }, 600); }
    msgT -= dt; if (msgT <= 0) ui.msg.style.opacity = "0";
  }

  // ── render loop ──────────────────────────────────────────────────
  const camPos = new THREE.Vector3(0, 20, -70), camLook = new THREE.Vector3();
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
    if (S.phase === "menu" || !mine) {
      menuAng += dt * 0.08;
      camPos.set(Math.sin(menuAng) * 70, 26, Math.cos(menuAng) * 90); camLook.set(0, 4, 0);
      camera.position.copy(camPos); camera.lookAt(camLook);
    } else {
      const tgt = mine.dead > 0 ? ball.p : mine.p;
      let dx: number, dz: number, dy = 0;
      if (S.ballCam && S.phase !== "goal") { dx = ball.p.x - tgt.x; dz = ball.p.z - tgt.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; dy = Math.max(-0.2, Math.min(0.5, (ball.p.y - tgt.y) / Math.max(10, l))); }
      else { fwdV.set(0, 0, 1).applyQuaternion(mine.q); const l = Math.hypot(fwdV.x, fwdV.z) || 1; dx = mine.ground ? fwdV.x / l : Math.sin(mine.yaw); dz = mine.ground ? fwdV.z / l : Math.cos(mine.yaw); if (!mine.ground) { const vl = Math.hypot(mine.v.x, mine.v.z); if (vl > 3) { dx = mine.v.x / vl; dz = mine.v.z / vl; } } }
      const want = tv.set(tgt.x - dx * 10, tgt.y + 3.6 + dy * 4, tgt.z - dz * 10);
      want.y = Math.max(1.2, Math.min(A.H - 1, want.y));
      camPos.lerp(want, Math.min(1, dt * 9));
      if (S.ballCam && S.phase !== "goal") camLook.lerp(tv2.set(tgt.x + dx * 6, tgt.y + 1.8 + dy * 8, tgt.z + dz * 6).lerp(ball.p, 0.25), Math.min(1, dt * 10));
      else camLook.lerp(tv2.set(tgt.x + dx * 8, tgt.y + 1.6, tgt.z + dz * 8), Math.min(1, dt * 10));
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
