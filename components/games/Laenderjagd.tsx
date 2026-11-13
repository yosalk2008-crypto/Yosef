"use client";

import { useMemo, useState } from "react";
import { BY_ID, COUNTRIES, flagUrl, type Country } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { TEMPERATUR } from "@/lib/data/temperatur";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { SolutionRow, Solutions } from "../Solutions";
import { Picker } from "../Picker";

const MAX = 8;
const POOL = COUNTRIES.filter((c) => c.pop != null && c.gdppc != null && (c.pop ?? 0) >= 100000);

export function pickTarget(day: string): Country {
  return makeRng(`${day}:laenderjagd`).pick(POOL);
}

type S = { guesses: string[]; gaveUp?: boolean };

/** The three yes/no checks of a guess against the target: same continent, same landlocked status, neighbour. */
function checks(g: Country, t: Country) {
  const hit = g.id === t.id;
  return {
    cont: hit || g.cont === t.cont,
    land: hit || g.landlocked === t.landlocked,
    nb: hit || t.borders.includes(g.id),
  };
}
const sq = (ok: boolean) => (ok ? "🟩" : "🟥");

export function Laenderjagd() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("laenderjagd");
  const target = useMemo(() => pickTarget(day), [day]);
  const [local, setLocal] = useState<S | null>(null);
  const st = local ?? saved?.state ?? { guesses: [] };
  const guesses = (st.guesses ?? []).filter((g) => BY_ID[g]);
  const won = guesses.includes(target.id);
  const over = won || guesses.length >= MAX || !!st.gaveUp;

  const options = useMemo(() => COUNTRIES.map((c) => ({ id: c.id, label: c.n, alt: c.alt })), []);

  const save = (next: string[], gaveUp = false) => {
    setLocal({ guesses: next, gaveUp });
    const isWin = next.includes(target.id);
    const done = isWin || gaveUp || next.length >= MAX;
    const share =
      `Länderjagd #${dayNumber(day)} · ${isWin ? next.length : "X"}/${MAX}\n` +
      next
        .map((g) => {
          const c = checks(BY_ID[g], target);
          return g === target.id ? "🟩🟩🟩 🎯" : sq(c.cont) + sq(c.land) + sq(c.nb);
        })
        .join("\n");
    persist({
      done,
      won: isWin,
      score: isWin ? MAX + 1 - next.length : 0,
      max: MAX,
      label: done ? (isWin ? `${next.length}/${MAX}` : `X/${MAX}`) : `${next.length}/${MAX}`,
      share,
      state: { guesses: next, gaveUp },
    });
  };
  const guess = (id: string) => {
    if (over || guesses.includes(id)) return;
    save([...guesses, id]);
  };

  return (
    <GameShell
      game="laenderjagd"
      day={day}
      isToday={isToday}
      rules={
        <>
          <p>
            Errate das gesuchte Land in höchstens <strong>{MAX} Versuchen</strong>.
          </p>
          <p>
            Nach jedem Tipp siehst du, ob das gesuchte Land auf demselben <strong>Kontinent</strong> liegt, ob es genau wie dein Tipp ein{" "}
            <strong>Binnenstaat</strong> ist (oder eben nicht) und ob dein Tipp ein <strong>Nachbar</strong> des gesuchten Landes ist. Grün heißt: stimmt.
          </p>
          <p>Darunter zeigen Pfeile, ob das gesuchte Land wärmer oder kälter ist (Ø Jahrestemperatur) und mehr oder weniger Einwohner und Fläche hat.</p>
        </>
      }
    >
      {!loaded ? (
        <div className="h-64 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted">Versuche</p>
              <p className="font-display text-3xl font-semibold leading-none">
                {guesses.length}
                <span className="text-lg text-muted"> / {MAX}</span>
              </p>
            </div>
            {!over && guesses.length > 0 && (
              <button type="button" onClick={() => save(guesses, true)} className="btn-ghost text-[#b03a3a]">
                Aufgeben
              </button>
            )}
          </div>
          {!over && (
            <div className="mb-5">
              <Picker options={options} onPick={guess} disabled={guesses} />
            </div>
          )}

          <div className="space-y-4">
            {[...guesses].reverse().map((id, k) => (
              <GuessCard key={id} g={BY_ID[id]} t={target} n={guesses.length - k} />
            ))}
          </div>

          {over && (
            <Solutions>
              <SolutionRow
                iso2={target.iso2}
                title={`Gesucht war ${target.n}`}
                right={`${target.cont}, Hauptstadt ${target.cap}`}
                yours={
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {guesses.map((g) => (
                      <span key={g} className="rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold text-ink">
                        {g === target.id ? "🎯" : "✗"} {BY_ID[g].n}
                      </span>
                    ))}
                  </span>
                }
                ok={won}
              />
            </Solutions>
          )}
          {over && (
            <ResultCard
              title={won ? "Gefunden!" : "Leider nicht geschafft"}
              score={won ? `${guesses.length}/${MAX}` : `X/${MAX}`}
              share={saved?.share || ""}
              isToday={isToday}
              current="laenderjagd"
            />
          )}
        </>
      )}
    </GameShell>
  );
}

const nf = (v: number, d = 0) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
function fmtPop(v: number) {
  if (v >= 1e9) return `${nf(v / 1e9, 2)} Mrd.`;
  if (v >= 1e6) return `${nf(v / 1e6, 1)} Mio.`;
  return nf(Math.round(v / 1000) * 1000);
}
function fmtArea(v: number) {
  if (v >= 1e6) return `${nf(v / 1e6, 1)} Mio. km²`;
  if (v >= 1000) return `${nf(Math.round(v / 100) * 100)} km²`;
  return `${nf(v)} km²`;
}

function YesNo({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl px-2 py-3 text-center text-ink" style={{ background: ok ? "#9fd06f" : "#ef7470" }}>
      <span className="text-xs font-bold sm:text-sm">{label}</span>
      <span className="mt-0.5 font-display text-[15px] font-semibold leading-tight break-words [hyphens:auto] sm:text-xl">{value}</span>
    </div>
  );
}

function Compare({ label, g, t, fmt }: { label: string; g: number | null | undefined; t: number | null | undefined; fmt: (v: number) => string }) {
  const known = g != null && t != null;
  const same = known && g === t;
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-3 text-center ${same ? "border-[#7bb04c] bg-[#e9f6dc]" : "border-line bg-white"}`}>
      <span className="text-xs font-bold sm:text-sm">{label}</span>
      <span className="mt-0.5 flex items-center gap-1 whitespace-nowrap font-display text-base font-semibold sm:text-xl">
        {g == null ? "–" : fmt(g)}
        {known && !same && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-label={t! > g! ? "gesuchtes Land: mehr" : "gesuchtes Land: weniger"} role="img">
            <path d={t! > g! ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </div>
  );
}

function GuessCard({ g, t, n }: { g: Country; t: Country; n: number }) {
  const c = checks(g, t);
  const hit = g.id === t.id;
  return (
    <div className={`pop card p-3 sm:p-4 ${hit ? "ring-4 ring-[#9fd06f]" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagUrl(g.iso2)} alt="" className="h-8 w-auto rounded-md border border-line sm:h-10" />
        <span className="min-w-0 flex-1 truncate font-display text-xl font-semibold sm:text-2xl">{g.n}</span>
        <span className="font-display text-lg font-semibold text-muted">#{n}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <YesNo label="Kontinent" value={g.cont} ok={c.cont} />
        <YesNo label="Binnenstaat" value={g.landlocked ? "Ja" : "Nein"} ok={c.land} />
        <YesNo label="Nachbar" value={hit ? "Treffer" : t.borders.includes(g.id) ? "Ja" : "Nein"} ok={c.nb} />
        <Compare label="Ø Temperatur" g={TEMPERATUR[g.id]} t={TEMPERATUR[t.id]} fmt={(v) => `${nf(v, 1)} °C`} />
        <Compare label="Bevölkerung" g={g.pop} t={t.pop} fmt={fmtPop} />
        <Compare label="Fläche" g={g.area} t={t.area} fmt={fmtArea} />
      </div>
    </div>
  );
}
