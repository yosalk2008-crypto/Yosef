/**
 * Fernweh tier badges, designed in Figma (file "Koshertrivia – Gipfelsturm Vulkan", page "Fernweh"):
 * the rarer the country, the faster the vehicle – boot 40, bike 55, train 70, ship 85, balloon 100,
 * a crossed-out compass for a miss. Same geometry as the Figma export (96 × 100).
 */
import { MISS, TIERS } from "@/lib/fernweh";

const INK = "#2c2a35";
const W = "#fffaf0";
const ICONS = [
  `<path d="M20 10h14v18l13 6c5 2 7 5 7 9v5H14V10z" fill="${W}"/><path d="M14 48h40v5H14z" fill="${INK}"/><path d="M34 22h-7M34 28h-7M38 32h-4"/><path d="M14 10h20"/>`,
  `<circle cx="15" cy="42" r="10" fill="${W}"/><circle cx="49" cy="42" r="10" fill="${W}"/><path d="M15 42l10-18h16M25 24l9 18 9-22M34 42H15M43 20h6M22 20h7"/><circle cx="34" cy="42" r="2.5" fill="${INK}"/>`,
  `<rect x="14" y="6" width="36" height="38" rx="9" fill="${W}"/><rect x="20" y="13" width="24" height="12" rx="3" fill="#bfe0f5"/><circle cx="22" cy="35" r="2.6" fill="${INK}"/><circle cx="42" cy="35" r="2.6" fill="${INK}"/><path d="M22 44l-7 10M42 44l7 10M18 52h28"/>`,
  `<path d="M20 30V18h16v12M28 18V9h7v9" fill="${W}"/><path d="M6 32h52l-8 14H14z" fill="${W}"/><path d="M4 54c5 0 5-4 10-4s5 4 10 4 5-4 10-4 5 4 10 4 5-4 10-4 5 4 10 4"/><circle cx="24" cy="38" r="2" fill="${INK}"/><circle cx="34" cy="38" r="2" fill="${INK}"/><circle cx="44" cy="38" r="2" fill="${INK}"/>`,
  `<path d="M32 4c11 0 19 8 19 19 0 10-10 18-15 22h-8c-5-4-15-12-15-22C13 12 21 4 32 4z" fill="${W}"/><path d="M32 4c-5 6-6 30-4 41M32 4c5 6 6 30 4 41"/><path d="M28 45l-2 6M36 45l2 6"/><rect x="25" y="51" width="14" height="8" rx="2" fill="#c98b4f"/><path d="M51 8l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" fill="#fff6c2" stroke-width="2.4"/>`,
];
const MISS_ICON = `<circle cx="32" cy="32" r="22" fill="${W}"/><path d="M32 14v4M32 46v4M14 32h4M46 32h4"/><path d="M24 24l16 16M40 24L24 40" stroke="${MISS.color}" stroke-width="5"/>`;
export const VEHICLE: [string, string][] = [
  ["Wanderschuh", "Hiking boot"],
  ["Fahrrad", "Bike"],
  ["Zug", "Train"],
  ["Schiff", "Ship"],
  ["Heißluftballon", "Hot-air balloon"],
];

/** tier 0–4, or -1 for a miss */
export function Badge({ tier, size = 48, className = "" }: { tier: number; size?: number; className?: string }) {
  const color = tier < 0 ? MISS.color : TIERS[tier].color;
  const icon = tier < 0 ? MISS_ICON : ICONS[tier];
  return (
    <svg width={size} height={(size * 100) / 96} viewBox="0 0 96 100" className={className} aria-hidden="true">
      <circle cx="48" cy="52" r="44" fill={INK} />
      <circle cx="48" cy="48" r="44" fill={color} stroke={INK} strokeWidth="4" />
      <circle cx="48" cy="48" r="35" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" strokeDasharray="3 5" />
      <g transform="translate(16 16)" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: icon }} />
    </svg>
  );
}
