/** Little sea creatures for the Tiefgang rarity tiers (drawn for Geografik). */
export function Creature({ tier, className = "h-16 w-16" }: { tier: string; className?: string }) {
  const s = { stroke: "#2c2a35", strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {tier === "plankton" && (
        <g {...s}>
          <circle cx="20" cy="26" r="7" fill="#9fd06f" />
          <circle cx="40" cy="20" r="5" fill="#c9eba6" />
          <circle cx="38" cy="42" r="8" fill="#9fd06f" />
          <circle cx="18" cy="46" r="4" fill="#c9eba6" />
          <circle cx="20" cy="26" r="1.5" fill="#2c2a35" stroke="none" />
          <circle cx="38" cy="42" r="1.8" fill="#2c2a35" stroke="none" />
        </g>
      )}
      {tier === "schwarm" && (
        <g {...s}>
          {[
            [10, 18],
            [28, 34],
            [8, 46],
          ].map(([x, y], k) => (
            <g key={k} transform={`translate(${x} ${y})`}>
              <path d="M2 0c6-6 16-6 22 0-6 6-16 6-22 0z" fill="#8ec5f0" />
              <path d="M24 0l8-5v10z" fill="#8ec5f0" />
              <circle cx="8" cy="-1" r="1.4" fill="#2c2a35" stroke="none" />
            </g>
          ))}
        </g>
      )}
      {tier === "selten" && (
        <g {...s}>
          <circle cx="30" cy="32" r="16" fill="#f0a0bf" />
          <path d="M14 26l-5-3M14 38l-5 3M30 16v-5M22 18l-3-5M38 18l3-5M30 48v5M22 46l-3 5M38 46l3 5" />
          <path d="M46 32l10-8v16z" fill="#f0a0bf" />
          <circle cx="24" cy="28" r="2.4" fill="#2c2a35" stroke="none" />
          <path d="M18 36c2 2 4 2 6 0" fill="none" />
        </g>
      )}
      {tier === "tiefsee" && (
        <g {...s}>
          <path d="M8 36c4-14 20-20 34-12l12-8v28l-12-8c-14 8-30 2-34 0z" fill="#c3aaf6" />
          <path d="M22 22c-2-10 6-16 14-12" fill="none" />
          <circle cx="37" cy="10" r="4" fill="#f3d272" />
          <path d="M10 38l6 4 4-4 4 4 4-4" fill="#fff" />
          <circle cx="20" cy="30" r="2.6" fill="#2c2a35" stroke="none" />
        </g>
      )}
      {tier === "perle" && (
        <g {...s}>
          <path d="M6 38c0-14 12-24 26-24s26 10 26 24z" fill="#e9dfd1" />
          <path d="M6 38h52c-2 10-12 16-26 16S8 48 6 38z" fill="#d9cbb6" />
          <circle cx="32" cy="34" r="9" fill="#fff8e6" />
          <circle cx="29" cy="31" r="2.5" fill="#fff" stroke="none" />
          <path d="M48 10l2 4 4 1-4 2-2 4-2-4-4-2 4-1z" fill="#f3d272" strokeWidth={2} />
        </g>
      )}
      {tier === "none" && (
        <g {...s}>
          <circle cx="24" cy="38" r="9" fill="none" />
          <circle cx="40" cy="24" r="6" fill="none" />
          <circle cx="42" cy="44" r="4" fill="none" />
        </g>
      )}
    </svg>
  );
}
