"use client";

/**
 * The mountain: seven camps up a zig-zag trail, a climber who moves up one camp per answer.
 * mood: calm → tense (under 8 s) → storm (under 4 s); won plants the flag, lost sends an avalanche.
 */
export type Mood = "calm" | "read" | "tense" | "storm" | "won" | "lost";

// base + 7 camps (viewBox 400 × 250); the 7th is the summit
export const CAMPS: [number, number][] = [
  [58, 228],
  [118, 210],
  [196, 192],
  [126, 165],
  [214, 140],
  [150, 113],
  [232, 84],
  [204, 40],
];

const trail = CAMPS.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

export function GipfelScene({ step, mood, compact }: { step: number; mood: Mood; compact?: boolean }) {
  const [cx, cy] = CAMPS[Math.min(step, 7)];
  return (
    <div className={`gs-scene gs-${mood}${compact ? " gs-compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMax meet" className="gs-svg" overflow="visible">
        <defs>
          <linearGradient id="gs-rock" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7d8bb0" />
            <stop offset="1" stopColor="#4a5679" />
          </linearGradient>
          <linearGradient id="gs-rock2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a9b7d6" />
            <stop offset="1" stopColor="#7c8db5" />
          </linearGradient>
        </defs>
        <g className="gs-sun">
          <circle cx="330" cy="52" r="22" fill="#fff3c4" />
          <circle cx="330" cy="52" r="32" fill="#fff3c4" opacity=".25" />
        </g>
        <g className="gs-clouds">
          <path d="M40 70c6-12 26-12 32-2 10-6 24 0 22 10H34c-4-4 0-9 6-8z" fill="#fff" opacity=".85" />
          <path d="M282 112c5-9 20-10 25-2 8-5 19 0 18 8h-48c-3-3 0-7 5-6z" fill="#fff" opacity=".7" />
        </g>
        {/* far range */}
        <path d="M-420 250L-330 170l50 34 60-70 50 50 60-40 50 46 50-30 50 40 30-24 52-82 46 70 40-46 52 74 44-58 48 60 50-44 60 40 60-56 70 60 60-30 80 60v60z" fill="url(#gs-rock2)" opacity=".75" />
        <rect x="-420" y="236" width="1240" height="40" fill="#5f6d92" />
        {/* the mountain */}
        <path d="M-420 250L-200 214l120 6 120-38 44-6 30 8 92-152 34 36 30-12 90 118 50 26 100 30 230 10v40z" fill="url(#gs-rock)" />
        <path d="M206 32l34 36 30-12 36 48-26-10-18 14-22-18-20 16-14-22-24 18-16-8z" fill="#fff" />
        <path d="M206 32l-26 48 16-8 14 14 10-22z" fill="#dfe9f7" />
        <path d="M114 184l20-34 16 12 12-10-14 30-12-6z" fill="#fff" opacity=".55" />
        {/* trail and camps */}
        <path d={trail} className="gs-trail" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 7" />
        {CAMPS.slice(1).map(([x, y], i) => {
          const n = i + 1;
          const done = step >= n;
          const cur = step + 1 === n && mood !== "won" && mood !== "lost";
          return (
            <g key={n} transform={`translate(${x} ${y})`} className={`gs-camp${done ? " done" : ""}${cur ? " cur" : ""}`}>
              {cur && <circle r="13" className="gs-ring" />}
              <line x1="0" y1="2" x2="0" y2="-17" stroke="#2c2a35" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M1 -17h13l-4 5 4 5H1z" className="gs-flag" />
              <circle r="8" cy="3" className="gs-dot" />
              <text y="6.5" textAnchor="middle" className="gs-num">
                {done ? "✓" : n}
              </text>
            </g>
          );
        })}
        {/* climber */}
        <g className="gs-climber" style={{ transform: `translate(${cx}px, ${cy - 4}px)` }}>
          <g className="gs-body">
            <ellipse cx="0" cy="12" rx="9" ry="2.5" fill="#000" opacity=".18" />
            <rect x="-7.5" y="-6" width="7" height="12" rx="3" fill="#ee8a2f" stroke="#2c2a35" strokeWidth="1.6" />
            <rect x="-3" y="-4" width="9" height="12" rx="4" fill="#3f86dd" stroke="#2c2a35" strokeWidth="1.6" />
            <path d="M-1 8v4M4 8v4" stroke="#2c2a35" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="1.5" cy="-9" r="5.2" fill="#ffd9b3" stroke="#2c2a35" strokeWidth="1.6" />
            <path d="M-3.8 -10.5a5.4 5.4 0 0110.6 0z" fill="#d6453d" stroke="#2c2a35" strokeWidth="1.4" />
            <circle cx="1.5" cy="-16.2" r="1.8" fill="#fff" stroke="#2c2a35" strokeWidth="1.2" />
            <g className="gs-face">
              <circle cx="0" cy="-8.6" r=".9" fill="#2c2a35" />
              <circle cx="3.6" cy="-8.6" r=".9" fill="#2c2a35" />
              <path className="gs-mouth" d="M.2 -6.4q1.6 1.3 3.2 0" fill="none" stroke="#2c2a35" strokeWidth="1" strokeLinecap="round" />
            </g>
            <path d="M7 -2l5 -8M10 -11l4 2" stroke="#2c2a35" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </g>
        {/* summit flag on success */}
        <g className="gs-summit" transform={`translate(${CAMPS[7][0] + 6} ${CAMPS[7][1] - 6})`}>
          <line x1="0" y1="0" x2="0" y2="-26" stroke="#2c2a35" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M1 -26h20l-5 7 5 7H1z" fill="#ee8a2f" stroke="#2c2a35" strokeWidth="1.6" strokeLinejoin="round" className="gs-wave" />
        </g>
        {/* avalanche */}
        <path className="gs-avalanche" d="M150 10c40 20 80 10 120 30 40 20 60 60 140 70v160H-20V140c60-20 100-40 130-80 10-16 22-40 40-50z" fill="#f4f8ff" />
      </svg>
      <div className="gs-snow">
        {Array.from({ length: 28 }, (_, k) => (
          <i key={k} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 7) * 0.31}s`, animationDuration: `${1.4 + (k % 5) * 0.3}s` }} />
        ))}
      </div>
    </div>
  );
}
