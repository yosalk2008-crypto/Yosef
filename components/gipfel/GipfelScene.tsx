"use client";

/**
 * The volcano (designed and animated in Figma: "Koshertrivia – Gipfelsturm Vulkan", frames
 * 1 Aufstieg · 2 Gefahr · 3 Ausbruch · 4 Gipfel). Seven camps up a zig-zag trail, a climber who moves up
 * one camp per answer. mood: calm → tense (under 8 s, the volcano rumbles) → storm (under 4 s);
 * lost = eruption, won = flag on the crater rim. The motion itself is CSS (globals.css, .gs-*).
 */
export type Mood = "calm" | "read" | "tense" | "storm" | "won" | "lost";

// base + 7 camps (viewBox 800 × 500); the 7th sits on the crater rim
export const CAMPS: [number, number][] = [
  [150, 456],
  [250, 430],
  [392, 402],
  [292, 356],
  [424, 318],
  [338, 268],
  [444, 222],
  [420, 104],
];

const trail = CAMPS.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
const STARS: [number, number, number][] = [
  [70, 40, 1.6], [140, 88, 1.1], [210, 30, 1.4], [300, 64, 1], [560, 36, 1.5], [620, 92, 1], [700, 50, 1.3], [760, 110, 1],
  [35, 130, 1], [250, 120, 0.9], [520, 120, 0.9], [-120, 60, 1.2], [920, 70, 1.2], [-60, 140, 1], [860, 30, 1.4], [-220, 90, 1.1], [1000, 120, 1],
];
const FLOW_R = "M446 116 C456 150 470 176 486 206 C498 230 508 256 530 284 C552 312 566 344 590 376 C606 398 622 420 650 444";
const FLOW_L = "M402 118 C396 150 384 176 372 204 C366 218 366 232 360 246";
const EMBERS = [[410, 100, 2.2], [430, 98, 1.8], [418, 104, 1.6], [440, 102, 2], [400, 104, 1.5], [424, 96, 2.4], [412, 108, 1.4], [436, 106, 1.7]];
const BOMBS = [[340, 10, 6], [510, 0, 7], [300, 50, 4.5], [548, 44, 5], [380, -20, 4], [470, -30, 4.5], [260, 90, 4], [590, 80, 5]];

export function GipfelScene({ step, mood, compact }: { step: number; mood: Mood; compact?: boolean }) {
  const [cx, cy] = CAMPS[Math.min(step, 7)];
  return (
    <div className={`gs-scene gs-${mood}${compact ? " gs-compact" : ""}`} aria-hidden="true">
      <div className="gs-shakebox">
        <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMax meet" className="gs-svg" overflow="visible">
          <defs>
            <linearGradient id="gs-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1d1640" />
              <stop offset="0.45" stopColor="#4a2a6a" />
              <stop offset="0.78" stopColor="#b8486a" />
              <stop offset="1" stopColor="#f6935a" />
            </linearGradient>
            <linearGradient id="gs-sky-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a0f22" />
              <stop offset="0.5" stopColor="#7a1f2e" />
              <stop offset="1" stopColor="#ff6a2a" />
            </linearGradient>
            <linearGradient id="gs-rock" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4b3a5e" />
              <stop offset="0.55" stopColor="#2e2340" />
              <stop offset="1" stopColor="#1c1528" />
            </linearGradient>
            <linearGradient id="gs-rocklit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7a5a86" />
              <stop offset="1" stopColor="#4b3a5e" />
            </linearGradient>
            <linearGradient id="gs-lava" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff1a8" />
              <stop offset="0.35" stopColor="#ffb43a" />
              <stop offset="1" stopColor="#ff4d1f" />
            </linearGradient>
            <radialGradient id="gs-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffe27a" />
              <stop offset="0.4" stopColor="#ff8a2a" stopOpacity="0.7" />
              <stop offset="1" stopColor="#ff4d1f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gs-flash" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff3c0" stopOpacity="0.95" />
              <stop offset="0.5" stopColor="#ff8a2a" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ff4d1f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gs-moon" cx="0.4" cy="0.4" r="0.6">
              <stop offset="0" stopColor="#fff8e0" />
              <stop offset="1" stopColor="#ffd9a8" />
            </radialGradient>
            <filter id="gs-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* sky */}
          <rect x="-500" y="-1000" width="1800" height="1000" fill="#1d1640" />
          <rect x="-500" y="-120" width="1800" height="680" fill="url(#gs-sky)" />
          <rect className="gs-redsky" x="-500" y="-120" width="1800" height="680" fill="url(#gs-sky-red)" />
          <g className="gs-stars" fill="#fff">
            {STARS.map(([x, y, r], k) => (
              <circle key={k} cx={x} cy={y} r={r} style={{ animationDelay: `${(k % 5) * 0.6}s` }} />
            ))}
          </g>
          <g className="gs-moon">
            <circle cx="660" cy="96" r="44" fill="#ffd9a8" opacity=".18" />
            <circle cx="660" cy="96" r="27" fill="url(#gs-moon)" />
            <circle cx="651" cy="89" r="5" fill="#f2c48e" opacity=".6" />
            <circle cx="668" cy="104" r="3.5" fill="#f2c48e" opacity=".6" />
          </g>

          {/* far range */}
          <path d="M-520 500L-400 380l70 40 100-80 90 70 80-50 90 70 70-30 40 120zM560 500l80-110 60 30 80-90 100 80 80-60 100 70 140-40 140 60v90z" fill="#3b2a55" opacity=".85" />
          <path d="M-520 500l140-70 120 20 120-30 140 36 160 44zM600 500l120-50 120 20 140-30 220 30 120 30z" fill="#2a1e3e" />

          {/* smoke */}
          <g className="gs-smoke">
            <g className="gs-puff gs-p1">
              <g fill="#5e4a70"><circle cx="420" cy="74" r="26" /><circle cx="446" cy="62" r="20" /><circle cx="398" cy="60" r="17" /></g>
              <g fill="#c98a8a" opacity=".55"><circle cx="414" cy="86" r="16" /><circle cx="440" cy="78" r="11" /></g>
            </g>
            <g className="gs-puff gs-p2">
              <g fill="#6c5a80"><circle cx="452" cy="22" r="30" /><circle cx="484" cy="8" r="22" /><circle cx="428" cy="4" r="18" /></g>
              <g fill="#a07c96" opacity=".5"><circle cx="446" cy="36" r="16" /></g>
            </g>
            <g className="gs-puff gs-p3">
              <g fill="#7a6a8e" opacity=".85"><circle cx="500" cy="-30" r="34" /><circle cx="534" cy="-44" r="24" /><circle cx="470" cy="-48" r="20" /></g>
            </g>
          </g>

          {/* the volcano */}
          <g className="gs-volcano">
            <path d="M40 500L250 330C300 262 338 196 366 120q6-12 20-14l12 8q22 12 44 0l12-8q14 2 20 14c28 76 66 142 116 210l210 170z" fill="url(#gs-rock)" />
            <path d="M366 120q6-12 20-14l12 8q6 36-18 96c-20 50-50 90-80 130-20 26-60 60-110 100l60-110c50-68 88-134 116-210z" fill="url(#gs-rocklit)" opacity=".55" />
            <path d="M300 340l30 20 30-8M500 290l-30 28 30 22M210 420l40-10M620 380l-30 20 40 20M360 230l20 20M520 250l-20 12" fill="none" stroke="#1a1326" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
            <path d="M442 114l12-8q14 2 20 14c28 76 66 142 116 210l210 170H520c20-60 0-120-20-170-20-50-40-110-54-170z" fill="#120c1c" opacity=".45" />
            <path d="M330 200q90 14 180 0M300 262q120 20 248 0M262 322q158 26 324 0" fill="none" stroke="#5e4870" strokeWidth="2" opacity=".35" />
            <ellipse cx="420" cy="113" rx="40" ry="9" fill="#1a1326" />
            <path d="M380 112q40-10 80 0" fill="none" stroke="#ff9a4a" strokeWidth="2.5" strokeLinecap="round" opacity=".9" />
          </g>

          {/* lava */}
          <g className="gs-lava">
            <ellipse className="gs-craterglow" cx="420" cy="108" rx="80" ry="46" fill="url(#gs-glow)" />
            <path d="M386 112q34 12 68 0-16-6-34-6t-34 6z" fill="url(#gs-lava)" />
            <path className="gs-flowglow" d={FLOW_R} fill="none" stroke="#ff6a2a" strokeWidth="18" strokeLinecap="round" filter="url(#gs-blur)" />
            <path d={FLOW_R} fill="none" stroke="url(#gs-lava)" strokeWidth="7" strokeLinecap="round" />
            <path className="gs-flowpulse" d={FLOW_R} fill="none" stroke="#fff1a8" strokeWidth="3" strokeLinecap="round" strokeDasharray="14 46" />
            <path d={FLOW_L} fill="none" stroke="url(#gs-lava)" strokeWidth="5" strokeLinecap="round" />
            <path className="gs-flowpulse" d={FLOW_L} fill="none" stroke="#fff1a8" strokeWidth="2" strokeLinecap="round" strokeDasharray="10 40" />
            <path d="M530 284c10 16 26 26 38 46" fill="none" stroke="url(#gs-lava)" strokeWidth="3.5" strokeLinecap="round" />
            <g className="gs-cracks" stroke="#ff7a2a" strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M330 360l16 12-6 14" />
              <path d="M230 430l14-6 8 12" />
              <path d="M560 410l-12 16" />
              <path d="M470 318l-8 12" />
            </g>
            <ellipse className="gs-lavalake" cx="660" cy="452" rx="70" ry="12" fill="#ff7a2a" filter="url(#gs-blur)" />
            <g className="gs-embers" fill="#ffcf5a">
              {EMBERS.map(([x, y, r], k) => (
                <circle key={k} cx={x} cy={y} r={r} style={{ animationDelay: `${k * 0.35}s`, ["--dx" as string]: `${((k % 4) - 1.5) * 14}px` }} />
              ))}
            </g>
          </g>

          {/* foreground */}
          <path d="M-520 500v-30l220-8 140 12 120-8 100 14 140 8 160-4 180-8 120-6 440 6v24z" fill="#150f20" />
          <path d="M110 470l10-26 10 26zM126 472l8-20 8 20zM700 466l11-30 11 30zM720 470l8-20 8 20z" fill="#150f20" />

          {/* trail and camps */}
          <path d={trail} fill="none" stroke="#ffe7c4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8" opacity=".8" />
          {CAMPS.slice(1).map(([x, y], i) => {
            const n = i + 1;
            const done = step >= n;
            const cur = step + 1 === n && mood !== "won" && mood !== "lost";
            return (
              <g key={n} transform={`translate(${x} ${y})`} className={`gs-camp${done ? " done" : ""}${cur ? " cur" : ""}`}>
                {cur && <circle r="15" className="gs-ring" />}
                <line x1="0" y1="2" x2="0" y2="-20" stroke="#120c1c" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M1 -20h15l-5 6 5 6H1z" className="gs-flag" />
                <circle r="9" cy="3" className="gs-dot" />
                <text y="7.5" textAnchor="middle" className="gs-num">
                  {done ? "✓" : n}
                </text>
              </g>
            );
          })}

          {/* eruption (lost) */}
          <g className="gs-eruption">
            <ellipse className="gs-flash" cx="420" cy="90" rx="300" ry="220" fill="url(#gs-flash)" />
            <path className="gs-fountain" d="M402 112c-6-42-18-82-42-118 30 14 44 46 54 76 0-40 4-80 12-110 6 34 6 76 4 110 12-34 32-64 62-80-22 36-40 76-52 122z" fill="url(#gs-lava)" />
            <g className="gs-bombs" fill="#ffb43a">
              {BOMBS.map(([x, y, r], k) => (
                <circle key={k} cx={x} cy={y} r={r} style={{ animationDelay: `${0.15 + (k % 4) * 0.12}s` }} />
              ))}
            </g>
            <path className="gs-flood" d="M380 112q40 12 80 0c10 38 40 88 70 138s70 110 130 170l40 50-140 10c-40-50-90-100-130-150-30 30-70 80-130 130l-120 10c60-60 120-130 160-200 20-50 32-110 40-158z" fill="url(#gs-lava)" />
          </g>

          {/* climber */}
          <g className="gs-climber" style={{ transform: `translate(${cx}px, ${cy - 8}px)` }}>
            <g className="gs-body">
              <ellipse cx="0" cy="13" rx="10" ry="3" fill="#000" opacity=".3" />
              <rect x="-8.5" y="-7" width="8" height="13" rx="3" fill="#ee8a2f" stroke="#120c1c" strokeWidth="1.8" />
              <rect x="-3" y="-5" width="10" height="13" rx="4.5" fill="#3f86dd" stroke="#120c1c" strokeWidth="1.8" />
              <path d="M-1 8v5M5 8v5" stroke="#120c1c" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="2" cy="-10" r="5.8" fill="#ffd9b3" stroke="#120c1c" strokeWidth="1.8" />
              <path d="M-4 -11.5a6 6 0 0112 0z" fill="#d6453d" stroke="#120c1c" strokeWidth="1.5" />
              <circle cx="2" cy="-18" r="2" fill="#fff" stroke="#120c1c" strokeWidth="1.3" />
              <circle cx=".4" cy="-9.4" r="1" fill="#120c1c" />
              <circle cx="4.4" cy="-9.4" r="1" fill="#120c1c" />
              <path className="gs-mouth" d="M.6 -7q1.8 1.4 3.6 0" fill="none" stroke="#120c1c" strokeWidth="1.1" strokeLinecap="round" />
              <path d="M8 -2l6 -9M11 -12l5 2" stroke="#120c1c" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>

          {/* summit flag (won) */}
          <g transform={`translate(${CAMPS[7][0] + 14} ${CAMPS[7][1] - 4})`}>
           <g className="gs-summit">
            <line x1="0" y1="0" x2="0" y2="-40" stroke="#120c1c" strokeWidth="3" strokeLinecap="round" />
            <path d="M1 -40h28l-7 9 7 9H1z" fill="#ee8a2f" stroke="#120c1c" strokeWidth="2" strokeLinejoin="round" className="gs-wave" />
           </g>
          </g>
        </svg>
      </div>
      <div className="gs-ash">
        {Array.from({ length: 30 }, (_, k) => (
          <i key={k} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 7) * 0.31}s`, animationDuration: `${1.6 + (k % 5) * 0.35}s` }} />
        ))}
      </div>
    </div>
  );
}
