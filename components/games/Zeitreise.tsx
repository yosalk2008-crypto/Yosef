"use client";

import { useMemo, useState } from "react";
import { BY_ID } from "@/lib/data/countries";
import { EVENTS, YEAR_MAX, YEAR_MIN, type HistEvent } from "@/lib/data/events";
import { dayNumber } from "@/lib/daily";
import { distanceKm, useShapes } from "@/lib/geo";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { MapView } from "../MapView";

const ROUNDS = 5;

function plan(day: string): HistEvent[] {
  const rng = makeRng(`${day}:zeitreise`);
  // spread over the centuries: 1 before 1800, 2 from 1800–1949, 2 from 1950
  const early = EVENTS.filter((e) => e.year < 1800);
  const mid = EVENTS.filter((e) => e.year >= 1800 && e.year < 1950);
  const late = EVENTS.filter((e) => e.year >= 1950);
  return rng.shuffle([...rng.sample(early, 1), ...rng.sample(mid, 2), ...rng.sample(late, 2)]);
}

function score(e: HistEvent, year: number, place: string) {
  const dy = Math.abs(year - e.year);
  const yearPts = Math.max(0, 5 - dy / 8);
  const ok = e.at.includes(place);
  const km = ok ? 0 : Math.min(...e.at.map((id) => distanceKm(BY_ID[place].ll, BY_ID[id].ll)));
  const placePts = ok ? 5 : Math.max(0, 5 * (1 - km / 3000));
  return { yearPts: Math.round(yearPts * 10) / 10, placePts: Math.round(placePts * 10) / 10, km, ok, dy };
}
const emoji = (p: number) => (p >= 8 ? "🟩" : p >= 5 ? "🟨" : p > 0 ? "🟧" : "🟥");

type Guess = { year: number; place: string };
type S = { guesses: Guess[] };

export function Zeitreise() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("zeitreise");
  const events = useMemo(() => plan(day), [day]);
  const shapes = useShapes("world");
  const [local, setLocal] = useState<Guess[] | null>(null);
  const guesses = local ?? saved?.state?.guesses ?? [];
  const round = guesses.length;
  const over = round >= ROUNDS;
  const [reveal, setReveal] = useState<number | null>(null);
  const idx = reveal ?? Math.min(round, ROUNDS - 1);
  const e = events[idx];
  const [year, setYear] = useState(1800);
  const [place, setPlace] = useState<string | null>(null);

  const results = guesses.map((g, i) => score(events[i], g.year, g.place));
  const total = Math.round(results.reduce((s, r) => s + r.yearPts + r.placePts, 0) * 10) / 10;
  const revealed = reveal != null || over;
  const shown = revealed ? guesses[idx] : place ? { year, place } : null;

  const submit = () => {
    if (!place) return;
    const next = [...guesses, { year, place }];
    setLocal(next);
    setReveal(round);
    const res = next.map((g, i) => score(events[i], g.year, g.place));
    const sum = Math.round(res.reduce((s, r) => s + r.yearPts + r.placePts, 0) * 10) / 10;
    persist({
      done: next.length >= ROUNDS,
      score: sum,
      max: ROUNDS * 10,
      label: `${sum.toLocaleString("de-DE")}/${ROUNDS * 10}`,
      share: `Zeitreise #${dayNumber(day)} · ${sum.toLocaleString("de-DE")}/${ROUNDS * 10}\n${res.map((r) => emoji(r.yearPts + r.placePts)).join("")}`,
      state: { guesses: next },
    });
  };

  const fill = (id: string) => {
    if (revealed && e.at.includes(id)) return "#16a34a";
    if (shown && shown.place === id) return revealed ? "#dc2626" : "#0f766e";
    return "var(--color-land)";
  };

  const r = revealed && guesses[idx] ? results[idx] : null;

  return (
    <GameShell
      game="zeitreise"
      day={day}
      isToday={isToday}
      rules={
        <>
          <p>Jede Runde beschreibt ein historisches Ereignis. Tippe auf der Karte auf das <strong>Land, in dem es stattfand</strong> (heutige Grenzen), und stell das <strong>Jahr</strong> ein.</p>
          <p>Bis zu 5 Punkte für den Ort (weniger, je weiter du daneben liegst) und 5 Punkte für das Jahr (pro 8 Jahre Abweichung ein Punkt weniger).</p>
          <p>{ROUNDS} Runden, maximal {ROUNDS * 10} Punkte.</p>
        </>
      }
    >
      {!loaded ? (
        <div className="h-96 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold">
              Ereignis {idx + 1} von {ROUNDS}
            </span>
            <span className="text-muted">Punkte: {total.toLocaleString("de-DE")}</span>
          </div>
          <div className="card mb-3 p-4">
            <p className="text-lg font-bold leading-snug sm:text-xl">„{e.text}“</p>
          </div>
          {shapes ? (
            <MapView shapes={shapes.list} fill={fill} onPick={revealed ? undefined : (id) => setPlace(id)} dots={() => true} label="Weltkarte – tippe auf ein Land" />
          ) : (
            <div className="aspect-video animate-pulse rounded-2xl bg-sea" />
          )}

          {!revealed && (
            <div className="card mt-3 p-4">
              <p className="text-sm">
                Ort: <strong>{place ? BY_ID[place].n : "noch nicht gewählt – tippe auf die Karte"}</strong>
              </p>
              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="year" className="text-sm font-semibold">
                    Jahr
                  </label>
                  <span className="text-2xl font-extrabold tabular-nums">{year}</span>
                </div>
                <input id="year" type="range" min={YEAR_MIN} max={YEAR_MAX} value={year} onChange={(ev) => setYear(+ev.target.value)} className="slider bg-gradient-to-r from-orange-100 to-orange-400" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">{YEAR_MIN}</span>
                  <div className="flex gap-1">
                    {[-10, -1, 1, 10].map((d) => (
                      <button key={d} type="button" className="btn-ghost min-h-9 px-2.5 text-sm" onClick={() => setYear((y) => Math.min(YEAR_MAX, Math.max(YEAR_MIN, y + d)))}>
                        {d > 0 ? `+${d}` : d}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted">{YEAR_MAX}</span>
                </div>
              </div>
              <button type="button" onClick={submit} disabled={!place} className="btn-primary mt-4 w-full">
                Festlegen
              </button>
            </div>
          )}

          {reveal != null && r && (
            <div className="card pop mt-3 p-4">
              <p className="text-2xl font-extrabold">{(r.yearPts + r.placePts).toLocaleString("de-DE")} / 10 Punkte</p>
              <p className="mt-1 text-sm text-muted">
                {e.year} in {e.at.map((id) => BY_ID[id].n).join(" / ")}. Du: {guesses[reveal].year} ({r.dy === 0 ? "genau" : `${r.dy} Jahre daneben`}), {BY_ID[guesses[reveal].place].n}
                {r.ok ? " ✓" : ` (${new Intl.NumberFormat("de-DE").format(Math.round(r.km / 10) * 10)} km entfernt)`}
              </p>
              <button
                type="button"
                className="btn-primary mt-3"
                onClick={() => {
                  setReveal(null);
                  setPlace(null);
                  setYear(1800);
                }}
              >
                {round < ROUNDS ? "Nächstes Ereignis" : "Ergebnis"}
              </button>
            </div>
          )}

          {over && reveal == null && (
            <ResultCard title="Dein Ergebnis" score={`${total.toLocaleString("de-DE")} / ${ROUNDS * 10}`} share={saved?.share || ""} isToday={isToday} current="zeitreise">
              <ul className="space-y-1.5">
                {events.map((ev, i) => (
                  <li key={ev.text} className="flex justify-between gap-3">
                    <span>
                      {emoji(results[i].yearPts + results[i].placePts)} {ev.text} ({ev.year})
                    </span>
                    <span className="shrink-0 font-semibold text-ink">{(results[i].yearPts + results[i].placePts).toLocaleString("de-DE")}</span>
                  </li>
                ))}
              </ul>
            </ResultCard>
          )}
        </>
      )}
    </GameShell>
  );
}
