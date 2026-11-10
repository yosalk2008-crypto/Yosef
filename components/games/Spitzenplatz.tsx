"use client";

import { useMemo, useState } from "react";
import { BY_ID, COUNTRIES, flagUrl } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { METRICS, globalRank, val, type MetricKey } from "@/lib/metrics";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";

const CATS: MetricKey[] = ["area", "pop", "gdppc", "mil", "life", "tour", "forest", "capPop"];
const POOL = COUNTRIES.filter((c) => (c.pop ?? 0) >= 2000000 && CATS.every((k) => val(c, k) != null));

function pickCountries(day: string) {
  // half well-known heavyweights, half from the rest, in random order
  const rng = makeRng(`${day}:spitzenplatz`);
  const big = rng.sample(POOL.filter((c) => (c.pop ?? 0) >= 30000000), 4);
  const rest = rng.sample(POOL.filter((c) => !big.includes(c)), 4);
  return rng.shuffle([...big, ...rest]).map((c) => c.id);
}

/** Best possible total (minimum sum of ranks) via DP over category subsets. */
function optimum(ids: string[]) {
  const n = ids.length;
  const dp = new Array(1 << n).fill(Infinity);
  dp[0] = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    const i = popcount(mask);
    if (i >= n || dp[mask] === Infinity) continue;
    for (let c = 0; c < n; c++) if (!(mask & (1 << c))) dp[mask | (1 << c)] = Math.min(dp[mask | (1 << c)], dp[mask] + globalRank(CATS[c], ids[i]));
  }
  return dp[(1 << n) - 1];
}
function popcount(x: number) {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>= 1;
  }
  return c;
}
const emoji = (r: number) => (r <= 10 ? "🟩" : r <= 30 ? "🟨" : r <= 70 ? "🟧" : "🟥");

type S = { picks: MetricKey[] };

export function Spitzenplatz() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("spitzenplatz");
  const ids = useMemo(() => pickCountries(day), [day]);
  const best = useMemo(() => optimum(ids), [ids]);
  const [local, setLocal] = useState<MetricKey[] | null>(null);
  const picks = local ?? saved?.state?.picks ?? [];
  const i = picks.length;
  const over = i >= ids.length;
  const total = picks.reduce((s, k, j) => s + globalRank(k, ids[j]), 0);

  const choose = (k: MetricKey) => {
    if (over || picks.includes(k)) return;
    const next = [...picks, k];
    setLocal(next);
    const sum = next.reduce((s, kk, j) => s + globalRank(kk, ids[j]), 0);
    const done = next.length >= ids.length;
    persist({
      done,
      score: sum,
      max: best,
      label: `${sum} Punkte`,
      share: `Spitzenplatz #${dayNumber(day)} · ${sum} Punkte (Bestwert ${best})\n${next.map((kk, j) => emoji(globalRank(kk, ids[j]))).join("")}`,
      state: { picks: next },
    });
  };

  const current = !over ? BY_ID[ids[i]] : null;

  return (
    <GameShell
      game="spitzenplatz"
      day={day}
      isToday={isToday}
      rules={
        <>
          <p>Nacheinander erscheinen <strong>acht Länder</strong>. Ordne jedes einer der acht Kategorien zu – jede Kategorie gibt es nur einmal.</p>
          <p>Du bekommst den weltweiten Rang des Landes in dieser Kategorie als Punkte (Platz 1 = 1 Punkt). <strong>Weniger Punkte sind besser.</strong></p>
          <p>Überleg gut: Wer jetzt die beste Kategorie verbraucht, hat sie später nicht mehr.</p>
        </>
      }
    >
      {!loaded ? (
        <div className="h-96 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          {current && (
            <div className="card pop mb-4 flex items-center gap-4 p-4" key={current.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagUrl(current.iso2)} alt="" className="h-14 w-auto rounded-md border border-line" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Land {i + 1} von {ids.length}
                </p>
                <p className="text-2xl font-extrabold">{current.n}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Punkte</p>
                <p className="text-2xl font-extrabold">{total}</p>
              </div>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {CATS.map((k) => {
              const j = picks.indexOf(k);
              const assigned = j >= 0 ? BY_ID[ids[j]] : null;
              const r = assigned ? globalRank(k, assigned.id) : null;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={!!assigned || over}
                  onClick={() => choose(k)}
                  className={`flex min-h-[64px] items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                    assigned ? "border-line bg-surface" : "border-line bg-white hover:border-ink hover:shadow-sm"
                  }`}
                >
                  <span>
                    <span className="block font-bold">{METRICS[k].label}</span>
                    {assigned ? (
                      <span className="flex items-center gap-1.5 text-sm text-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={flagUrl(assigned.iso2)} alt="" className="h-3.5 w-auto rounded-sm" />
                        {assigned.n} · {METRICS[k].fmt(val(assigned, k)!)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted">frei</span>
                    )}
                  </span>
                  {r != null && (
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-extrabold ${r <= 10 ? "bg-green-100 text-green-800" : r <= 30 ? "bg-yellow-100 text-yellow-900" : r <= 70 ? "bg-orange-100 text-orange-900" : "bg-red-100 text-red-800"}`}>
                      Platz {r}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {over && (
            <ResultCard title="Deine Punkte" score={`${total}`} share={saved?.share || ""} isToday={isToday} current="spitzenplatz">
              Die bestmögliche Verteilung hätte <strong className="text-ink">{best} Punkte</strong> ergeben.
            </ResultCard>
          )}
        </>
      )}
    </GameShell>
  );
}
