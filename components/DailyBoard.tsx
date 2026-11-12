"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LAUNCH, addDays, allResults, dayNumber, msUntilNextDay, useStoreVersion, utcDate, type DailyResult, type GameKey } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { GameArt } from "./GameArt";

function useCountdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = msUntilNextDay();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

export function DailyBoard() {
  const v = useStoreVersion();
  const router = useRouter();
  const [res, setRes] = useState<Partial<Record<GameKey, DailyResult>>>({});
  const left = useCountdown();
  useEffect(() => {
    const d = utcDate();
    setRes(allResults()[d] || {});
  }, [v]);

  const randomDay = (game: GameKey) => {
    const t = utcDate();
    const span = dayNumber(t) - 1;
    const day = addDays(LAUNCH, Math.floor(Math.random() * span));
    router.push(`/taeglich/${game}?tag=${day}`);
  };

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-[28px] font-semibold leading-none sm:text-4xl">Tägliche Spiele</h2>
        <div className="text-right">
          <p className="text-sm font-semibold text-muted">Neue Spiele in</p>
          <p className="flex items-center justify-end gap-1.5 font-display text-2xl font-semibold tabular-nums sm:text-[28px]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2M10 2h4" />
            </svg>
            {left || "--:--:--"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 lg:grid-cols-3">
        {GAMES.map((g) => {
          const r = res[g.key];
          const style = { background: g.bg, ["--edge" as string]: g.edge };
          return (
            <div key={g.key}>
              <Link href={`/taeglich/${g.key}`} className="chunk relative flex aspect-[1.15] flex-col items-center justify-center gap-2 px-2 text-center" style={style}>
                {r?.done && (
                  <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 font-display text-xs font-semibold text-white sm:text-sm">✓ {r.label}</span>
                )}
                <GameArt game={g.key} className="h-[42%] w-auto" />
                <span className="font-display text-[19px] font-semibold leading-tight sm:text-2xl">{g.title}</span>
              </Link>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => randomDay(g.key)} className="chunk grid h-12 place-items-center !rounded-2xl" style={style} aria-label={`${g.title}: zufälliges Rätsel aus dem Archiv`} title="Zufälliges Rätsel">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7h3c4 0 6 10 10 10h4M17 14l3 3-3 3M3 17h3c1.6 0 2.8-1.4 3.8-3M17 4l3 3-3 3M14 10c.8-1.6 1.6-3 3-3h3" />
                  </svg>
                </button>
                <Link href={`/archiv?spiel=${g.key}`} className="chunk grid h-12 place-items-center !rounded-2xl" style={style} aria-label={`${g.title}: Archiv`} title="Archiv">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="5" width="16" height="15" rx="2" />
                    <path d="M4 10h16M9 3v4M15 3v4" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
