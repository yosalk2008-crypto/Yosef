"use client";

/**
 * Home page: the other games as tiles (same shape as the daily games, but in their own deep brand
 * colours so the two groups stay apart). Gipfelsturm and Fernweh show today's result once played.
 */
import Link from "@/components/Link";
import { useEffect, useState } from "react";
import { allResults, todayFor, useStoreVersion, type DailyResult, type GameKey } from "@/lib/daily";
import { useT } from "@/lib/i18n";
import { MoreArt, type MoreKey } from "./MoreArt";
import { SOUTHBEACH_ENABLED } from "@/lib/southbeach/flag";

type Tile = { key: MoreKey; href: string; de: string; en: string; subDe: string; subEn: string; bg: string; edge: string; daily?: GameKey; dark?: boolean };

const ALL_TILES: Tile[] = [
  { key: "spiele", href: "/andere-spiele", de: "Andere Spiele", en: "Other games", subDe: "Kart-Rennen & Auto-Fußball", subEn: "Kart racing & car soccer", bg: "linear-gradient(160deg, #ff3d7f 0%, #6a1f8a 55%, #1f6fff 120%)", edge: "#1a0a2e", dark: true },
  { key: "koscher", href: "/koscher", de: "Ist das koscher?", en: "Is it kosher?", subDe: "Erlaubt im Judentum?", subEn: "Allowed in Judaism?", bg: "linear-gradient(160deg, #2f62e0 0%, #16307a 100%)", edge: "#0b1a45", dark: true },
  { key: "halal", href: "/halal", de: "Ist das halal?", en: "Is it halal?", subDe: "Erlaubt im Islam?", subEn: "Allowed in Islam?", bg: "linear-gradient(160deg, #18b07a 0%, #0c5a40 100%)", edge: "#063322", dark: true },
  { key: "tiefgang", href: "/tiefgang", de: "Tiefgang", en: "Deep Dive", subDe: "Je seltener, desto tiefer", subEn: "The rarer, the deeper", bg: "linear-gradient(160deg, #46a4e4 0%, #1a5aa0 100%)", edge: "#0b2f5e", dark: true },
  { key: "gipfelsturm", href: "/gipfelsturm", de: "Gipfelsturm", en: "Summit Rush", subDe: "Jede Antwort nur einmal", subEn: "Every answer only once", bg: "linear-gradient(165deg, #3a2466 0%, #a8466e 60%, #f08a56 100%)", edge: "#1c1030", daily: "gipfelsturm", dark: true },
  { key: "fernweh", href: "/fernweh", de: "Fernweh", en: "Wanderlust", subDe: "5 Pins, bis 500 km", subEn: "5 pins, up to 500 km", bg: "linear-gradient(160deg, #3fa0b4 0%, #1f6475 100%)", edge: "#0f3a45", daily: "fernweh", dark: true },
  { key: "sunstate", href: "/southbeach", de: "South Beach", en: "South Beach", subDe: "3D-Open-World", subEn: "3D open world", bg: "linear-gradient(160deg, #ff3b6b 0%, #5a1748 55%, #1a0c2e 100%)", edge: "#12061a", dark: true },
];
// South Beach is paused: its tile is hidden until the flag is switched back on
const TILES = ALL_TILES.filter((x) => x.key !== "sunstate" || SOUTHBEACH_ENABLED);

export function MoreBoard() {
  const t = useT();
  const v = useStoreVersion();
  const [res, setRes] = useState<Partial<Record<GameKey, DailyResult>>>({});
  useEffect(() => {
    const all = allResults();
    const r: Partial<Record<GameKey, DailyResult>> = {};
    for (const g of ["gipfelsturm", "fernweh"] as GameKey[]) {
      const x = all[todayFor(g)]?.[g];
      if (x) r[g] = x;
    }
    setRes(r);
  }, [v]);

  return (
    <>
      <h2 className="text-[28px] font-semibold leading-none sm:text-4xl">{t("Weitere Spiele", "More games")}</h2>
      <div className={`mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 ${TILES.length > 5 ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
        {TILES.map((g, k) => {
          const r = g.daily ? res[g.daily] : undefined;
          return (
            <Link
              key={g.key}
              href={g.href}
              className={`chunk relative flex aspect-[1.15] flex-col items-center justify-center gap-1.5 px-2 pt-7 text-center text-white ${k === TILES.length - 1 && TILES.length % 2 === 1 ? "max-sm:col-span-2 max-sm:aspect-[2.3]" : ""}`}
              style={{ background: g.bg, ["--edge" as string]: g.edge }}
            >
              {r?.done && <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 font-display text-xs font-semibold text-ink sm:text-sm">✓ {r.label}</span>}
              {g.daily && !r?.done && <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">{t("Täglich neu", "Daily")}</span>}
              <MoreArt game={g.key} className="h-[38%] w-auto" />
              <span className="font-display text-[19px] font-semibold leading-tight sm:text-2xl">{t(g.de, g.en)}</span>
              <span className="text-[13px] font-bold leading-tight text-white/80 sm:text-sm">{t(g.subDe, g.subEn)}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
