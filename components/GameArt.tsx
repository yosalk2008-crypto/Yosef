import type { GameKey } from "@/lib/daily";

const S = { stroke: "#2c2a35", strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Sticker-style illustrations for the daily games (drawn for Geografik). */
export function GameArt({ game, className = "h-24 w-32" }: { game: GameKey; className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true">
      <g transform="translate(3 4)" opacity="0.18">
        <Art game={game} shadow />
      </g>
      <Art game={game} />
    </svg>
  );
}

function Art({ game, shadow = false }: { game: GameKey; shadow?: boolean }) {
  const s = shadow ? { stroke: "#000", strokeWidth: 3, strokeLinejoin: "round" as const } : S;
  const f = (c: string) => (shadow ? "#000" : c);
  switch (game) {
    case "laenderjagd":
      return (
        <g {...s}>
          <rect x="14" y="14" width="66" height="56" rx="9" fill={f("#fff")} />
          <path d="M26 52c4-12 10-18 18-16s10-10 18-6 8 14 2 20-14 2-22 6-20 4-16-4z" fill={f("#9fd06f")} />
          <circle cx="78" cy="48" r="17" fill={f("#e4effc")} />
          <path d="M90 60l14 14" strokeWidth={7} />
          <path d="M78 38c-5 0-8 4-8 8 0 6 8 13 8 13s8-7 8-13c0-4-3-8-8-8z" fill={f("#d6453d")} />
          <circle cx="78" cy="46" r="2.6" fill={f("#fff")} />
        </g>
      );
    case "massstab":
      return (
        <g {...s}>
          <rect x="8" y="34" width="38" height="38" rx="8" fill={f("#fff")} />
          <path d="M18 60c2-8 6-12 11-11s6-6 10-3 2 10-2 13-10 1-13 3-7 2-6-2z" fill={f("#8ec5f0")} />
          <rect x="54" y="10" width="58" height="62" rx="10" fill={f("#fff")} />
          <path d="M64 58c3-14 10-22 20-20s12-12 20-6 4 20-4 25-18 2-24 5-14 4-12-4z" fill={f("#8ec5f0")} />
          <path d="M14 22h28M14 22l5-5M14 22l5 5M42 22l-5-5M42 22l-5 5" strokeWidth={3.5} fill="none" />
        </g>
      );
    case "viererbande":
      return (
        <g {...s}>
          <rect x="24" y="8" width="34" height="34" rx="8" fill={f("#fff")} />
          <rect x="62" y="8" width="34" height="34" rx="8" fill={f("#c3aaf6")} />
          <rect x="24" y="46" width="34" height="34" rx="8" fill={f("#c3aaf6")} />
          <rect x="62" y="46" width="34" height="34" rx="8" fill={f("#fff")} />
          <path d="M33 25l5 5 10-10M71 63l5 5 10-10" fill="none" strokeWidth={3.5} />
        </g>
      );
    case "hoeher-tiefer":
      return (
        <g {...s}>
          <rect x="10" y="12" width="64" height="62" rx="10" fill={f("#fff")} />
          <rect x="20" y="46" width="12" height="18" rx="3" fill={f("#f0a0bf")} />
          <rect x="37" y="34" width="12" height="30" rx="3" fill={f("#f0a0bf")} />
          <rect x="54" y="22" width="12" height="42" rx="3" fill={f("#f0a0bf")} />
          <rect x="80" y="10" width="30" height="30" rx="9" fill={f("#9fd06f")} />
          <path d="M88 28l7-7 7 7" fill="none" strokeWidth={4} />
          <rect x="80" y="46" width="30" height="30" rx="9" fill={f("#fff")} />
          <path d="M88 57l7 7 7-7" fill="none" strokeWidth={4} />
        </g>
      );
    case "spitzenplatz":
      return (
        <g {...s}>
          <rect x="44" y="30" width="32" height="46" rx="5" fill={f("#fff")} />
          <rect x="12" y="46" width="32" height="30" rx="5" fill={f("#fff")} />
          <rect x="76" y="54" width="32" height="22" rx="5" fill={f("#fff")} />
          <circle cx="60" cy="16" r="11" fill={f("#f3d272")} />
          <path d="M57 13l3-2v10" fill="none" strokeWidth={3} />
          <path d="M24 60h8M88 66h8" />
        </g>
      );
    case "farbecht":
      return (
        <g {...s}>
          <rect x="10" y="16" width="70" height="52" rx="8" fill={f("#fff")} />
          <rect x="10" y="16" width="70" height="17" fill={f("#2c2a35")} />
          <rect x="10" y="33" width="70" height="18" fill={f("#f3d272")} strokeDasharray={shadow ? undefined : "5 5"} />
          <path d="M10 51h70v9a8 8 0 01-8 8H18a8 8 0 01-8-8z" fill={f("#f3d272")} />
          <rect x="10" y="16" width="70" height="52" rx="8" fill="none" />
          <path d="M84 52l20-34a6 6 0 0110 6l-22 32z" fill={f("#fff")} />
          <path d="M84 52l8 4-6 10-6-2z" fill={f("#d6453d")} />
        </g>
      );
    case "grenzgang":
      return (
        <g {...s}>
          <rect x="8" y="10" width="104" height="66" rx="10" fill={f("#fff")} />
          <path d="M26 60c10-2 12-16 26-18s16-16 30-18" fill="none" strokeDasharray={shadow ? undefined : "2 8"} strokeWidth={4} />
          <circle cx="24" cy="60" r="9" fill={f("#7fd3c4")} />
          <path d="M90 14c-7 0-11 5-11 11 0 8 11 18 11 18s11-10 11-18c0-6-4-11-11-11z" fill={f("#d6453d")} />
          <circle cx="90" cy="25" r="3.5" fill={f("#fff")} />
        </g>
      );
    case "zeitreise":
      return (
        <g {...s}>
          <rect x="36" y="20" width="76" height="54" rx="9" fill={f("#fff")} />
          <path d="M48 60c4-10 10-14 16-12s8-8 14-4 6 12 0 16-10 0-16 3-16 4-14-3z" fill={f("#f0ad8a")} />
          <path d="M8 10h34M8 80h34M12 10c0 18 16 22 16 35S12 62 12 80M38 10c0 18-16 22-16 35s16 17 16 35" fill={f("#fff")} />
          <path d="M16 74c3-8 6-10 9-10s6 2 9 10z" fill={f("#f3d272")} />
        </g>
      );
  }
}
