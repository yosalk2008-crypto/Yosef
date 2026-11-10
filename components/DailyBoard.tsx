"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { allResults, dayNumber, streak, useStoreVersion, utcDate, type DailyResult, type GameKey } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { Icon } from "./Icon";

export function DailyBoard() {
  const v = useStoreVersion();
  const [today, setToday] = useState<string | null>(null);
  const [res, setRes] = useState<Partial<Record<GameKey, DailyResult>>>({});
  const [st, setSt] = useState({ current: 0, best: 0 });
  useEffect(() => {
    const d = utcDate();
    setToday(d);
    setRes(allResults()[d] || {});
    setSt(streak());
  }, [v]);
  const done = GAMES.filter((g) => res[g.key]?.done).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tagesspiele {today && <span className="text-muted">#{dayNumber(today)}</span>}</h2>
          <p className="mt-1 text-muted">
            {done === 0 ? "Acht Rätsel warten auf dich." : done === GAMES.length ? "Alles geschafft – stark! Morgen gibt es neue Rätsel." : `${done} von ${GAMES.length} geschafft.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Stat label="Serie" value={`${st.current} ${st.current === 1 ? "Tag" : "Tage"}`} icon="M12 3c1 3 4 4.5 4 8.5a4 4 0 01-8 0c0-1.6.7-2.7 1.5-3.5.2 1.5 1 2.5 2 2.5-1-3 .5-5.5.5-7.5z" />
          <Stat label="Rekord" value={`${st.best}`} icon="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={GAMES.length} aria-valuenow={done} aria-label="Fortschritt heute">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / GAMES.length) * 100}%` }} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GAMES.map((g) => {
          const r = res[g.key];
          return (
            <Link key={g.key} href={`/taeglich/${g.key}`} className="card group relative flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${g.color}`}>
                  <Icon d={g.icon} className="h-5 w-5" />
                </span>
                {r?.done ? (
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-sm font-bold text-brand">✓ {r.label}</span>
                ) : (
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted">Offen</span>
                )}
              </div>
              <p className="mt-4 text-lg font-bold">{g.title}</p>
              <p className="mt-1 flex-1 text-sm leading-snug text-muted">{g.tagline}</p>
              <p className="mt-4 text-sm font-semibold text-ink group-hover:underline">{r?.done ? "Ergebnis ansehen →" : "Spielen →"}</p>
            </Link>
          );
        })}
      </div>
      <p className="mt-5 text-sm text-muted">
        Ein Tag verpasst? Im <Link href="/archiv" className="font-semibold text-brand hover:underline">Archiv</Link> findest du alle bisherigen Rätsel.
      </p>
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card flex items-center gap-2.5 px-3.5 py-2">
      <Icon d={icon} className="h-5 w-5 text-orange" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="text-sm font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}
