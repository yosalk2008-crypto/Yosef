"use client";

import { useEffect, useRef } from "react";

export type Impact = { at: number; kind: "plankton" | "schwarm" | "selten" | "tiefsee" | "perle" | "miss" };

type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; color: string; kind: "snow" | "bubble" | "trail" | "spark" | "ring" | "glow" };

/**
 * Canvas effects on top of the ocean: caustics near the surface, rising bubbles, marine snow,
 * bioluminescent glows in the deep, the bubble trail behind a sinking answer and landing bursts.
 * Everything reads from refs so the 60 fps loop never re-renders React.
 */
export function OceanFx({ cam, sinking, impact, anchorY }: { cam: number; sinking: boolean; impact: Impact | null; anchorY: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ cam, sinking, impact, anchorY, lastCam: cam, lastImpact: 0 });
  state.current.cam = cam;
  state.current.sinking = sinking;
  state.current.impact = impact;
  state.current.anchorY = anchorY;

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const ps: P[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    // ambient particles live in screen space and get pushed by camera movement
    for (let i = 0; i < 90; i++) ps.push({ x: rnd(0, 1), y: rnd(0, 1), vx: rnd(-0.02, 0.02), vy: rnd(0.005, 0.03), r: rnd(0.6, 2), life: 0, max: Infinity, color: "", kind: "snow" });
    // deep glows (world space: y = metres)
    const glows = Array.from({ length: 60 }, () => ({ x: rnd(0.04, 0.9), m: rnd(900, 7000), r: rnd(1.5, 3.5), ph: rnd(0, 6.28), hue: Math.random() < 0.5 ? "120,240,220" : "170,160,255" }));

    let raf = 0;
    let t0 = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(50, t - t0) / 1000;
      t0 = t;
      const s = state.current;
      const dCam = s.cam - s.lastCam; // metres moved this frame
      s.lastCam = s.cam;
      const pxPerM = 0.85;
      ctx.clearRect(0, 0, w, h);

      // caustics near the surface
      const shallow = Math.max(0, 1 - s.cam / 220);
      if (shallow > 0) {
        ctx.save();
        ctx.globalAlpha = 0.12 * shallow;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        for (let k = 0; k < 7; k++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 16) {
            const yy = h * 0.2 + k * 40 + Math.sin(x / 50 + t / 900 + k) * 10 + Math.sin(x / 23 - t / 700) * 5;
            if (x === 0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // spawn rising bubbles in shallow water and a trail behind the sinking answer
      if (!reduce) {
        if (Math.random() < 0.08 + shallow * 0.2) ps.push({ x: rnd(0.02, 0.98) * w, y: h + 10, vx: rnd(-8, 8), vy: rnd(-60, -30), r: rnd(1.5, 4), life: 0, max: 6, color: "", kind: "bubble" });
        if (s.sinking) {
          for (let k = 0; k < 2; k++) ps.push({ x: w / 2 + rnd(-40, 40), y: s.anchorY - 10 + rnd(-6, 6), vx: rnd(-30, 30), vy: rnd(-110, -40), r: rnd(1.5, 4.5), life: 0, max: rnd(0.5, 1.1), color: "", kind: "trail" });
        }
      }

      // landing burst
      if (s.impact && s.impact.at !== s.lastImpact) {
        s.lastImpact = s.impact.at;
        const kind = s.impact.kind;
        const cx = w / 2;
        const cy = s.anchorY;
        const col = kind === "perle" ? "243,210,114" : kind === "tiefsee" ? "195,170,246" : kind === "selten" ? "240,160,191" : kind === "schwarm" ? "142,197,240" : kind === "miss" ? "214,69,61" : "159,208,111";
        const n = kind === "perle" ? 90 : kind === "miss" ? 24 : 40;
        for (let k = 0; k < n; k++) {
          const a = rnd(0, Math.PI * 2);
          const v = rnd(60, kind === "perle" ? 380 : 220);
          ps.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rnd(1.5, kind === "perle" ? 4 : 3), life: 0, max: rnd(0.6, 1.4), color: col, kind: "spark" });
        }
        for (let k = 0; k < (kind === "perle" ? 3 : 1); k++) ps.push({ x: cx, y: cy, vx: 0, vy: 0, r: 10, life: -k * 0.15, max: 0.9, color: col, kind: "ring" });
      }

      // deep glows (world space)
      const dark = Math.min(1, Math.max(0, (s.cam - 500) / 1500));
      if (dark > 0) {
        for (const g of glows) {
          const sy = s.anchorY + (g.m - s.cam) * pxPerM;
          if (sy < -20 || sy > h + 20) continue;
          const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 700 + g.ph))) * dark;
          const grd = ctx.createRadialGradient(g.x * w, sy, 0, g.x * w, sy, g.r * 6);
          grd.addColorStop(0, `rgba(${g.hue},${a})`);
          grd.addColorStop(1, `rgba(${g.hue},0)`);
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(g.x * w, sy, g.r * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        if (p.kind === "snow") {
          // screen-space snow: drifts down slowly, streams upward while the camera descends
          p.x += p.vx * dt;
          p.y += p.vy * dt - (dCam * pxPerM) / Math.max(1, h);
          if (p.y > 1.05) p.y = -0.05;
          if (p.y < -0.05) p.y = 1.05;
          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
          const alpha = 0.25 + dark * 0.35;
          const streak = Math.min(18, Math.abs(dCam) * pxPerM * 1.2);
          ctx.strokeStyle = `rgba(220,240,255,${alpha})`;
          ctx.lineWidth = p.r;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x * w, p.y * h);
          ctx.lineTo(p.x * w, p.y * h + streak + 0.1);
          ctx.stroke();
          continue;
        }
        p.life += dt;
        if (p.life > p.max) {
          ps.splice(i, 1);
          continue;
        }
        if (p.life < 0) continue;
        const k = p.life / p.max;
        if (p.kind === "bubble" || p.kind === "trail") {
          p.x += (p.vx + Math.sin(t / 200 + i) * 10) * dt;
          p.y += p.vy * dt - (dCam * pxPerM) * 0.6;
          ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * (p.kind === "trail" ? 0.9 : 0.5)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === "spark") {
          p.vx *= 0.94;
          p.vy = p.vy * 0.94 + 30 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.fillStyle = `rgba(${p.color},${1 - k})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "ring") {
          ctx.strokeStyle = `rgba(${p.color},${(1 - k) * 0.9})`;
          ctx.lineWidth = 4 * (1 - k) + 1;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 20 + k * 180, 8 + k * 60, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
