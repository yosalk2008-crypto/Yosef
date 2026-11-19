/** Sticker-style illustrations for the other games (same style as GameArt: ink outline, soft shadow). */
const S = { stroke: "#2c2a35", strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export type MoreKey = "koscher" | "halal" | "tiefgang" | "gipfelsturm" | "fernweh";

export function MoreArt({ game, className = "h-24 w-32" }: { game: MoreKey; className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true">
      <g transform="translate(3 4)" opacity="0.18">
        <Art game={game} shadow />
      </g>
      <Art game={game} />
    </svg>
  );
}

function Art({ game, shadow = false }: { game: MoreKey; shadow?: boolean }) {
  const s = shadow ? { stroke: "#000", strokeWidth: 3, strokeLinejoin: "round" as const } : S;
  const f = (c: string) => (shadow ? "#000" : c);
  switch (game) {
    case "koscher": // gold sack with an approval stamp
      return (
        <g {...s}>
          <path d="M46 30c-4-6 0-12 6-10l6 3 6-3c6-2 10 4 6 10 14 7 22 20 19 32-2 9-11 13-31 13S29 71 27 62c-3-12 5-25 19-32z" fill={f("#f3c33c")} />
          <path d="M45 30h26" />
          <path d="M44 52h29M58 44v18" stroke={shadow ? "#000" : "#b8862a"} strokeWidth={3.5} />
          <circle cx="90" cy="30" r="15" fill={f("#7fe0a8")} />
          <path d="M83 30l5 5 9-10" strokeWidth={4} />
          <circle cx="24" cy="70" r="7" fill={f("#ffd75a")} />
          <circle cx="16" cy="60" r="5" fill={f("#ffd75a")} />
        </g>
      );
    case "halal": // the road-trip car with a check sign
      return (
        <g {...s}>
          <path d="M8 76h104" strokeDasharray="10 8" />
          <path d="M20 62V50l10-14h38l14 14h14c4 0 6 3 6 6v6z" fill={f("#fff")} />
          <path d="M34 40h14v10H27zM54 40h12l9 10H54z" fill={f("#bfe0f5")} />
          <path d="M18 62h86" />
          <circle cx="38" cy="64" r="8" fill={f("#2c2a35")} />
          <circle cx="86" cy="64" r="8" fill={f("#2c2a35")} />
          <path d="M96 10v24" />
          <circle cx="96" cy="16" r="11" fill={f("#12a06d")} />
          <path d="M90 16l4 4 7-8" stroke={shadow ? "#000" : "#fff"} strokeWidth={3.5} />
        </g>
      );
    case "tiefgang": // a dive mask under water with bubbles
      return (
        <g {...s}>
          <path d="M6 24c10-6 18 6 28 0s18-6 28 0 18 6 28 0 18-6 24 0" fill="none" />
          <rect x="24" y="40" width="64" height="34" rx="15" fill={f("#f3d272")} />
          <rect x="31" y="46" width="22" height="22" rx="9" fill={f("#bfe0f5")} />
          <rect x="59" y="46" width="22" height="22" rx="9" fill={f("#bfe0f5")} />
          <path d="M94 74V36c0-6 4-10 10-10" fill="none" strokeWidth={5} />
          <circle cx="104" cy="54" r="5" fill={f("#fff")} />
          <circle cx="110" cy="42" r="3.5" fill={f("#fff")} />
          <circle cx="16" cy="56" r="4" fill={f("#fff")} />
        </g>
      );
    case "gipfelsturm": // the volcano with lava and a summit flag
      return (
        <g {...s}>
          <path d="M8 82l32-32c8-12 12-22 14-34h16c2 12 6 22 14 34l28 32z" fill={f("#6b4a8e")} />
          <path d="M54 16q8 6 16 0" fill={f("#ff8a2a")} />
          <path d="M66 18c2 12 8 20 14 30s10 20 16 32" fill="none" stroke={shadow ? "#000" : "#ff8a2a"} strokeWidth={5} />
          <path d="M40 4v18" />
          <path d="M40 5h16l-4 5 4 5H40" fill={f("#d6453d")} />
          <circle cx="66" cy="6" r="6" fill={f("#c9c1d6")} />
          <circle cx="78" cy="2" r="4" fill={f("#c9c1d6")} />
        </g>
      );
    case "fernweh": // folded map, dashed route and a pin
      return (
        <g {...s}>
          <path d="M10 24l30-8 30 8 30-8v54l-30 8-30-8-30 8z" fill={f("#f6efe0")} />
          <path d="M40 16v54M70 24v54" />
          <path d="M20 58c8-12 18-14 26-8s16 2 22-8" fill="none" strokeDasharray="3 6" stroke={shadow ? "#000" : "#d6453d"} />
          <path d="M84 50c-6-8-14-14-14-22a14 14 0 0128 0c0 8-8 14-14 22z" fill={f("#d6453d")} />
          <circle cx="84" cy="28" r="5" fill={f("#fff")} />
        </g>
      );
  }
}
