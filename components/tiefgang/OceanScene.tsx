"use client";

import { useEffect, useRef, useState } from "react";
import { meters, tierOf, type Question } from "@/lib/tiefgang";

type Result = { input: string; pts: number; answer?: string; id?: string; perle?: boolean };

const PXM = 0.85; // pixels per metre
const SKY = 220; // pixels of sky above the surface
const MAX = 7000;
const WORLD = SKY + (MAX + 400) * PXM;
const y = (m: number) => SKY + m * PXM;
const nf = new Intl.NumberFormat("de-DE");

const FACTS: [number, string][] = [
  [40, "Das Sonnenlicht wird schwächer"],
  [200, "Hier beginnt die Dämmerzone"],
  [332, "Tiefster Tauchgang mit Tauchgerät"],
  [530, "Kaiserpinguine tauchen bis hierher"],
  [1000, "Mitternachtszone – kein Sonnenlicht mehr"],
  [2000, "Pottwale jagen bis in diese Tiefe"],
  [3700, "Durchschnittliche Tiefe der Ozeane"],
  [3800, "Hier liegt das Wrack der Titanic"],
  [6000, "Hadalzone – nur noch Tiefseegräben"],
  [7000, "Meeresgrund. Der Marianengraben wäre 11.000 m tief"],
];

const TIER_LINES: [number, string, string][] = [
  [100, "Plankton", "#9fd06f"],
  [300, "Schwarm", "#8ec5f0"],
  [550, "Selten", "#f0a0bf"],
  [800, "Tiefsee", "#c3aaf6"],
  [1000, "Tiefseeperle", "#f3d272"],
];

function waterGradient() {
  const stops: [number, string][] = [
    [0, "#4aa6e0"],
    [150, "#2f86c8"],
    [600, "#1a5c9e"],
    [1500, "#0f3a72"],
    [3500, "#081f45"],
    [7400, "#030b1f"],
  ];
  return `linear-gradient(180deg, #bfe6fb 0px, #93d1f3 ${SKY - 4}px, ${stops.map(([m, c]) => `${c} ${Math.round(y(m))}px`).join(", ")})`;
}

export function OceanScene({ cam, results, questions, sinking, base }: { cam: number; results: Result[]; questions: Question[]; sinking: Result | null; base: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vh, setVh] = useState(700);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVh(el.clientHeight));
    ro.observe(el);
    setVh(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  void questions;
  const offset = y(cam) - vh * 0.34;

  // cumulative landing depths of previous answers
  let acc = 0;
  const landed = results.map((r) => {
    acc += meters(r.pts);
    return { r, depth: acc };
  });
  const showLines = true;

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 will-change-transform" style={{ height: WORLD, transform: `translate3d(0, ${-offset}px, 0)`, background: waterGradient() }}>
        {/* sky */}
        <Sun />
        <Cloud x="12%" top={40} s={1} />
        <Cloud x="58%" top={70} s={0.8} />
        <Cloud x="80%" top={30} s={1.1} />
        {/* surface */}
        <svg className="absolute inset-x-0" style={{ top: SKY - 14 }} height="28" width="100%" preserveAspectRatio="none" viewBox="0 0 400 28">
          <path d="M0 14 Q 25 4 50 14 T 100 14 T 150 14 T 200 14 T 250 14 T 300 14 T 350 14 T 400 14 V28 H0z" fill="#4aa6e0" />
        </svg>
        <Boat />
        {/* light rays */}
        <div className="absolute inset-x-0" style={{ top: SKY, height: 320, background: "repeating-linear-gradient(100deg, rgb(255 255 255 / 0.07) 0 40px, transparent 40px 110px)", maskImage: "linear-gradient(180deg, black, transparent)" }} />
        {/* kelp */}
        <Kelp side="left" />
        <Kelp side="right" />
        {/* life */}
        <Fishes top={y(60)} left="18%" n={5} color="#0c3b6e" />
        <Fishes top={y(150)} left="62%" n={4} color="#0a3361" />
        <Fishes top={y(330)} left="10%" n={3} color="#082a52" />
        <Jelly top={y(650)} left="72%" />
        <Jelly top={y(900)} left="20%" />
        <Angler top={y(1600)} left="70%" />
        <Squid top={y(2600)} left="14%" />
        <Wreck top={y(3800)} />
        <Angler top={y(5200)} left="22%" />
        <Floor />

        {/* depth ruler */}
        <div className="absolute bottom-0 right-0 w-14" style={{ top: SKY }}>
          {Array.from({ length: MAX / 100 + 1 }).map((_, k) => {
            const m = k * 100;
            const major = m % 500 === 0;
            return (
              <div key={m} className="absolute right-0 flex items-center gap-1" style={{ top: m * PXM - 6 }}>
                {major && <span className="text-[10px] font-bold text-white/60">{nf.format(m)} m</span>}
                <span className="h-px bg-white/40" style={{ width: major ? 14 : 7 }} />
              </div>
            );
          })}
        </div>

        {/* facts */}
        {FACTS.map(([m, t]) => (
          <p key={m} className="absolute left-4 max-w-[60%] text-[11px] font-bold text-white/55 sm:left-[12%] sm:text-xs" style={{ top: y(m) - 8 }}>
            {nf.format(m)} m · {t}
          </p>
        ))}

        {/* tier lines for the current dive */}
        {showLines &&
          TIER_LINES.map(([d, name, c]) => (
            <div key={name} className="absolute left-0 right-14 flex items-center justify-end gap-2" style={{ top: y(base + d) }}>
              <span className="h-0 flex-1 border-t-2 border-dashed opacity-60" style={{ borderColor: c }} />
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-ink" style={{ background: c }}>
                {name} · {d / 10} P.
              </span>
            </div>
          ))}

        {/* answers that already landed */}
        {landed.map(({ r, depth }, k) =>
          r.pts > 0 && !(sinking && k === landed.length - 1) ? (
            <div key={k} className="absolute left-[8%] sm:left-[20%]" style={{ top: y(depth) - 12 }}>
              <span className="rounded-lg border-2 border-ink/70 px-2 py-0.5 text-xs font-bold text-ink" style={{ background: tierOf(r).color }}>
                {r.answer}
              </span>
            </div>
          ) : null
        )}

        {/* the answer that is sinking right now */}
        {sinking && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: y(cam) - 20 }}>
            <div className="relative">
              <span className="sink-bubble absolute -top-10 left-3 h-3 w-3 rounded-full border-2 border-white/70" />
              <span className="sink-bubble absolute -top-16 left-10 h-2 w-2 rounded-full border-2 border-white/60" style={{ animationDelay: "0.3s" }} />
              <span className="sink-bubble absolute -top-8 right-4 h-4 w-4 rounded-full border-2 border-white/50" style={{ animationDelay: "0.6s" }} />
              <span className="block -rotate-2 rounded-xl border-[3px] border-ink bg-[#f3d272] px-3 py-1.5 font-display text-lg font-semibold text-ink shadow-[0_4px_0_rgb(0_0_0_/_0.35)]">
                {sinking.answer} ▼
              </span>
            </div>
          </div>
        )}

        {/* you */}
        <div className="absolute right-16" style={{ top: y(cam) - 18 }}>
          <Bell />
        </div>
      </div>
      <style>{`
        @keyframes sinkBubble { 0% { transform: translateY(0); opacity: .9 } 100% { transform: translateY(-60px); opacity: 0 } }
        .sink-bubble { animation: sinkBubble 1.1s ease-out infinite; }
        @keyframes sway { 0%,100% { transform: skewX(-4deg) } 50% { transform: skewX(4deg) } }
        .kelp { transform-origin: bottom; animation: sway 5s ease-in-out infinite; }
        @keyframes swim { 0% { transform: translateX(-30px) } 50% { transform: translateX(30px) } 100% { transform: translateX(-30px) } }
        .swim { animation: swim 14s ease-in-out infinite; }
        @keyframes bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        .bob { animation: bob 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .sink-bubble, .kelp, .swim, .bob { animation: none } }
      `}</style>
    </div>
  );
}

function Sun() {
  return <div className="absolute right-[18%] h-16 w-16 rounded-full bg-[#ffe27a] shadow-[0_0_40px_10px_rgb(255_226_122_/_0.6)]" style={{ top: 50 }} />;
}

function Cloud({ x, top, s }: { x: string; top: number; s: number }) {
  return (
    <svg className="absolute" style={{ left: x, top, width: 110 * s }} viewBox="0 0 110 44">
      <path d="M18 40c-10 0-16-6-14-14s10-10 16-8c2-10 12-16 22-12 6-8 22-8 28 4 10-2 20 6 18 16 8 2 10 14-2 14z" fill="#fff" opacity="0.95" />
    </svg>
  );
}

function Boat() {
  return (
    <svg className="bob absolute left-[30%]" style={{ top: SKY - 44, width: 86 }} viewBox="0 0 86 48">
      <path d="M6 30h74l-10 14H18z" fill="#f0ad8a" stroke="#2c2a35" strokeWidth="3" strokeLinejoin="round" />
      <rect x="30" y="14" width="22" height="16" rx="3" fill="#fff" stroke="#2c2a35" strokeWidth="3" />
      <path d="M58 30V6M58 8l14 10H58" fill="#f3d272" stroke="#2c2a35" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 30v18" stroke="#2c2a35" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

function Kelp({ side }: { side: "left" | "right" }) {
  const xs = side === "left" ? [6, 24, 44] : [10, 30];
  return (
    <div className={`absolute ${side === "left" ? "left-0" : "right-14"}`} style={{ top: SKY + 40, height: 240, width: 70 }}>
      {xs.map((x, k) => (
        <svg key={k} className="kelp absolute bottom-0" style={{ left: x, height: 150 + k * 40, animationDelay: `${k * 0.8}s` }} viewBox="0 0 20 200" preserveAspectRatio="none">
          <path d="M10 200 C 0 160, 20 130, 10 100 S 0 40, 10 0" fill="none" stroke="#2a7d6a" strokeWidth="6" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

function Fishes({ top, left, n, color }: { top: number; left: string; n: number; color: string }) {
  return (
    <div className="swim absolute" style={{ top, left }}>
      {Array.from({ length: n }).map((_, k) => (
        <svg key={k} className="absolute" style={{ left: k * 22 + (k % 2) * 6, top: (k % 3) * 12, width: 22 }} viewBox="0 0 22 10">
          <path d="M1 5c4-5 10-5 14 0-4 5-10 5-14 0zM15 5l6-4v8z" fill={color} />
        </svg>
      ))}
    </div>
  );
}

function Jelly({ top, left }: { top: number; left: string }) {
  return (
    <svg className="bob absolute" style={{ top, left, width: 34 }} viewBox="0 0 34 46">
      <path d="M2 18C2 8 9 2 17 2s15 6 15 16z" fill="#c3aaf6" opacity="0.55" />
      <path d="M7 18c0 10 3 14 0 26M14 18c0 10 3 14 0 24M21 18c0 10 3 14 0 26M28 18c0 10 3 14 0 22" fill="none" stroke="#c3aaf6" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

function Angler({ top, left }: { top: number; left: string }) {
  return (
    <svg className="swim absolute" style={{ top, left, width: 64 }} viewBox="0 0 64 40">
      <circle cx="40" cy="5" r="4" fill="#f3d272" />
      <circle cx="40" cy="5" r="9" fill="#f3d272" opacity="0.25" />
      <path d="M40 9c-6 4-10 8-12 12" fill="none" stroke="#1d2f55" strokeWidth="2" />
      <path d="M4 24c4-12 20-16 32-10l14-8v32l-14-8C24 36 8 34 4 24z" fill="#14244a" />
      <path d="M8 26l4 3 3-3 3 3 3-3" fill="none" stroke="#7a8bb5" strokeWidth="1.5" />
    </svg>
  );
}

function Squid({ top, left }: { top: number; left: string }) {
  return (
    <svg className="bob absolute" style={{ top, left, width: 40 }} viewBox="0 0 40 70">
      <path d="M20 2c9 8 12 18 10 30H10C8 20 11 10 20 2z" fill="#1d2f55" />
      <path d="M12 32c-2 12 2 20-2 34M17 32c0 14 2 22 0 34M23 32c0 14-2 22 0 34M28 32c2 12-2 20 2 34" fill="none" stroke="#1d2f55" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Wreck({ top }: { top: number }) {
  return (
    <svg className="absolute left-[30%]" style={{ top: top - 30, width: 150 }} viewBox="0 0 150 50">
      <path d="M6 30h138l-14 18H26z" fill="#0b1836" transform="rotate(-6 75 30)" />
      <rect x="50" y="10" width="10" height="20" fill="#0b1836" transform="rotate(-6 75 30)" />
      <rect x="72" y="8" width="10" height="22" fill="#0b1836" transform="rotate(-6 75 30)" />
      <rect x="94" y="10" width="10" height="20" fill="#0b1836" transform="rotate(-6 75 30)" />
    </svg>
  );
}

function Floor() {
  return (
    <svg className="absolute inset-x-0" style={{ top: y(MAX) - 10, height: 400 * PXM + 10 }} width="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
      <path d="M0 20 Q 40 0 80 16 T 160 12 T 240 20 T 320 8 T 400 18 V100 H0z" fill="#0d1a33" />
    </svg>
  );
}

function Bell() {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" role="img" aria-label="Du">
      <path d="M20 0v6" stroke="#fff" strokeWidth="2" strokeDasharray="2 3" />
      <path d="M8 30V18a12 12 0 0124 0v12z" fill="#f3d272" stroke="#2c2a35" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="20" cy="19" r="5" fill="#8ec5f0" stroke="#2c2a35" strokeWidth="2.5" />
      <path d="M5 30h30v5H5z" fill="#f0ad8a" stroke="#2c2a35" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
