"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LAUNCH, allResults, dayNumber, formatDay, useStoreVersion, utcDate } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { Icon } from "./Icon";
import { GameArt } from "./GameArt";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function Archive() {
  const v = useStoreVersion();
  const [today, setToday] = useState<string | null>(null);
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [res, setRes] = useState<ReturnType<typeof allResults>>({});

  useEffect(() => {
    const t = utcDate();
    setToday(t);
    setMonth({ y: +t.slice(0, 4), m: +t.slice(5, 7) - 1 });
    setSel(t);
  }, []);
  useEffect(() => setRes(allResults()), [v]);

  const cells = useMemo(() => {
    if (!month) return [];
    const first = new Date(Date.UTC(month.y, month.m, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) out.push(new Date(Date.UTC(month.y, month.m, d)).toISOString().slice(0, 10));
    return out;
  }, [month]);

  if (!month || !today) return <div className="mt-8 h-96 animate-pulse rounded-2xl bg-line" />;

  const label = new Date(Date.UTC(month.y, month.m, 15)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
  const canPrev = `${month.y}-${String(month.m + 1).padStart(2, "0")}` > LAUNCH.slice(0, 7);
  const canNext = `${month.y}-${String(month.m + 1).padStart(2, "0")}` < today.slice(0, 7);
  const shift = (d: number) =>
    setMonth((cur) => {
      if (!cur) return cur;
      const { y, m } = cur;
      return { y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 };
    });
  const doneCount = (d: string) => Object.values(res[d] || {}).filter((r) => r?.done).length;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" className="btn-ghost px-3" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Vorheriger Monat">
            <Icon d="M15 18l-6-6 6-6" />
          </button>
          <p className="text-lg font-bold capitalize">{label}</p>
          <button type="button" className="btn-ghost px-3" onClick={() => shift(1)} disabled={!canNext} aria-label="Nächster Monat">
            <Icon d="M9 18l6-6-6-6" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, k) => {
            if (!d) return <div key={"e" + k} />;
            const playable = d >= LAUNCH && d <= today;
            const n = doneCount(d);
            const active = sel === d;
            return (
              <button
                key={d}
                type="button"
                disabled={!playable}
                onClick={() => setSel(d)}
                aria-pressed={active}
                aria-label={`${formatDay(d)}${n ? `, ${n} von 8 gespielt` : ""}`}
                className={`relative aspect-square rounded-lg text-sm font-semibold transition disabled:opacity-25 ${
                  active ? "bg-ink text-white" : n === 8 ? "bg-green-100 text-green-900" : n ? "bg-brand-soft text-ink" : "bg-surface hover:bg-line"
                }`}
              >
                {+d.slice(8)}
                {n > 0 && n < 8 && <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${active ? "bg-white" : "bg-brand"}`} />}
              </button>
            );
          })}
        </div>
      </div>
      {sel && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-muted">Rätsel #{dayNumber(sel)}</p>
          <p className="text-xl font-display font-semibold">{formatDay(sel)}</p>
          <ul className="mt-4 space-y-1.5">
            {GAMES.map((g) => {
              const r = res[sel]?.[g.key];
              return (
                <li key={g.key}>
                  <Link href={`/taeglich/${g.key}${sel === today ? "" : `?tag=${sel}`}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-surface">
                    <span className="flex items-center gap-2.5 font-semibold">
                      <span className="grid h-9 w-11 place-items-center rounded-xl" style={{ background: g.bg }}>
                        <GameArt game={g.key} className="h-7 w-9" />
                      </span>
                      {g.title}
                    </span>
                    <span className="text-sm text-muted">{r?.done ? `✓ ${r.label}` : "→"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
