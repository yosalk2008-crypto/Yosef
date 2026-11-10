"use client";

import { useMemo, useState } from "react";
import { BY_ID, COUNTRIES, flagUrl } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { METRICS, val, type MetricKey } from "@/lib/metrics";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { SolutionRow, Solutions } from "../Solutions";

const LIVES = 3;
const KEYS: MetricKey[] = ["pop", "area", "gdppc", "life", "forest", "tour", "capPop", "mil"];
const POOL = COUNTRIES.filter((c) => (c.pop ?? 0) >= 1000000);

type Step = { a: string; b: string; m: MetricKey };

/** Deterministic chain: the right country of step i is the left country of step i+1. */
function chain(day: string, n: number): Step[] {
  const rng = makeRng(`${day}:hoeher-tiefer`);
  const steps: Step[] = [];
  let a = rng.pick(POOL).id;
  const recent: string[] = [a];
  while (steps.length < n) {
    const m = rng.pick(KEYS);
    const av = val(BY_ID[a], m);
    if (av == null) continue;
    const cand = POOL.filter((c) => {
      const v = val(c, m);
      return v != null && !recent.includes(c.id) && Math.abs(v - av) / Math.max(v, av) > 0.04;
    });
    if (!cand.length) continue;
    const b = rng.pick(cand).id;
    steps.push({ a, b, m });
    recent.push(b);
    if (recent.length > 30) recent.shift();
    a = b;
  }
  return steps;
}

type S = { picks: ("hi" | "lo")[] };

export function HoeherTiefer() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("hoeher-tiefer");
  const [local, setLocal] = useState<("hi" | "lo")[] | null>(null);
  const picks = local ?? saved?.state?.picks ?? [];
  const steps = useMemo(() => chain(day, Math.max(200, picks.length + 2)), [day, picks.length]);
  const results = picks.map((p, i) => {
    const s = steps[i];
    const higher = val(BY_ID[s.b], s.m)! > val(BY_ID[s.a], s.m)!;
    return (p === "hi") === higher;
  });
  const lost = results.filter((r) => !r).length;
  const correct = results.filter(Boolean).length;
  const over = lost >= LIVES;
  const [last, setLast] = useState<number | null>(null);
  const showing = last != null ? last : picks.length;
  const s = steps[showing];
  const A = BY_ID[s.a];
  const B = BY_ID[s.b];
  const revealed = last != null;

  const answer = (p: "hi" | "lo") => {
    if (revealed || over) return;
    const next = [...picks, p];
    setLocal(next);
    setLast(next.length - 1);
    const res = next.map((pp, i) => (pp === "hi") === (val(BY_ID[steps[i].b], steps[i].m)! > val(BY_ID[steps[i].a], steps[i].m)!));
    const nLost = res.filter((r) => !r).length;
    const nOk = res.filter(Boolean).length;
    const done = nLost >= LIVES;
    persist({
      done,
      score: nOk,
      max: nOk,
      label: `${nOk} richtig`,
      share: `Höher oder tiefer #${dayNumber(day)} · ${nOk} richtig\n${res.map((r) => (r ? "🟩" : "🟥")).join("")}`,
      state: { picks: next },
    });
  };

  const ok = revealed ? results[showing] : null;

  return (
    <GameShell
      game="hoeher-tiefer"
      day={day}
      isToday={isToday}
      rules={
        <>
          <p>Zwei Länder, eine Kennzahl. Hat das rechte Land einen <strong>höheren oder niedrigeren</strong> Wert als das linke?</p>
          <p>Jede Runde wechselt die Kennzahl: Einwohner, Fläche, BIP pro Kopf, Lebenserwartung und mehr. Du hast {LIVES} Leben – wie weit kommst du?</p>
          <p>Alle Spieler bekommen heute dieselbe Reihenfolge.</p>
        </>
      }
    >
      {!loaded ? (
        <div className="h-80 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold">Richtig: {correct}</span>
            <span className="flex items-center gap-1" aria-label={`${LIVES - lost} Leben übrig`}>
              {Array.from({ length: LIVES }).map((_, i) => (
                <svg key={i} viewBox="0 0 24 24" className={`h-5 w-5 ${i < LIVES - lost ? "text-rose-500" : "text-line"}`} fill="currentColor" aria-hidden="true">
                  <path d="M12 21s-7.5-4.6-9.5-9.3C1 8.2 3.3 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.7 0 6 3.7 4.5 7.2C19.5 16.4 12 21 12 21z" />
                </svg>
              ))}
            </span>
          </div>
          {!over || revealed ? (
            <>
              <p className="mb-3 text-center text-lg font-bold">
                Hat {B.n} {METRICS[s.m].question} als {A.n}?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Panel id={A.id} value={METRICS[s.m].fmt(val(A, s.m)!)} metric={METRICS[s.m].label} />
                <Panel
                  id={B.id}
                  value={revealed ? METRICS[s.m].fmt(val(B, s.m)!) : "?"}
                  metric={METRICS[s.m].label}
                  tone={ok == null ? undefined : ok ? "ok" : "bad"}
                />
              </div>
              {!revealed ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => answer("hi")} className="btn-primary h-14 bg-emerald-600 text-lg hover:bg-emerald-700">
                    ▲ Höher
                  </button>
                  <button type="button" onClick={() => answer("lo")} className="btn-primary h-14 bg-rose-600 text-lg hover:bg-rose-700">
                    ▼ Tiefer
                  </button>
                </div>
              ) : (
                <div className="pop mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <p className={`text-lg font-display font-semibold ${ok ? "text-ok" : "text-bad"}`}>{ok ? "Richtig!" : "Falsch!"}</p>
                  <button type="button" onClick={() => setLast(null)} className="btn-primary">
                    {over ? "Ergebnis" : "Weiter"}
                  </button>
                </div>
              )}
            </>
          ) : null}
          {over && !revealed && (
            <>
              <Solutions note="Alle Vergleiche, die du heute gespielt hast.">
                {picks.map((p, i) => {
                  const st = steps[i];
                  const a = BY_ID[st.a];
                  const b = BY_ID[st.b];
                  const M = METRICS[st.m];
                  const higher = val(b, st.m)! > val(a, st.m)!;
                  return (
                    <SolutionRow
                      key={i}
                      iso2={b.iso2}
                      title={`${b.n} vs. ${a.n}`}
                      right={`${M.label}: ${b.n} ${M.fmt(val(b, st.m)!)} – ${a.n} ${M.fmt(val(a, st.m)!)}, also ${higher ? "höher" : "tiefer"}`}
                      yours={p === "hi" ? "höher" : "tiefer"}
                      ok={results[i]}
                    />
                  );
                })}
              </Solutions>
              <ResultCard title="Keine Leben mehr" score={`${correct} richtig`} share={saved?.share || ""} isToday={isToday} current="hoeher-tiefer" />
            </>
          )}
        </>
      )}
    </GameShell>
  );
}

function Panel({ id, value, metric, tone }: { id: string; value: string; metric: string; tone?: "ok" | "bad" }) {
  const c = BY_ID[id];
  const ring = tone === "ok" ? "ring-4 ring-green-400" : tone === "bad" ? "ring-4 ring-red-400" : "";
  return (
    <div className={`card flex flex-col items-center p-4 text-center ${ring}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flagUrl(c.iso2)} alt="" className="h-16 w-auto rounded-md border border-line shadow-sm sm:h-24" />
      <p className="mt-3 text-lg font-display font-semibold leading-tight">{c.n}</p>
      <p className="mt-2 text-xs font-semibold text-muted">{metric}</p>
      <p className="text-xl font-bold sm:text-2xl">{value}</p>
    </div>
  );
}
