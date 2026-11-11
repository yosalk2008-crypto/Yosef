"use client";

import { useMemo, useState } from "react";
import { BY_ID, COUNTRIES, flagUrl } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { useShapes } from "@/lib/geo";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { SolutionRow, Solutions } from "../Solutions";
import { MapView } from "../MapView";
import { Picker } from "../Picker";

function bfs(from: string, allowed?: Set<string>): Record<string, number> {
  const dist: Record<string, number> = { [from]: 0 };
  const q = [from];
  while (q.length) {
    const x = q.shift()!;
    for (const n of BY_ID[x].borders) {
      if (dist[n] != null) continue;
      if (allowed && !allowed.has(n)) continue;
      dist[n] = dist[x] + 1;
      q.push(n);
    }
  }
  return dist;
}

const START_POOL = COUNTRIES.filter((c) => c.borders.length > 0 && (c.pop ?? 0) >= 500000);

export function makeRoute(day: string) {
  const rng = makeRng(`${day}:grenzgang`);
  for (let i = 0; i < 1000; i++) {
    const a = rng.pick(START_POOL);
    const d = bfs(a.id);
    const want = 4 + rng.int(3); // 3–5 countries in between
    const cand = START_POOL.filter((c) => d[c.id] === want);
    if (!cand.length) continue;
    const b = rng.pick(cand);
    return { a: a.id, b: b.id, d: want };
  }
  return { a: "PRT", b: "POL", d: 4 };
}

type S = { guesses: string[] };

export function Grenzgang() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("grenzgang");
  const route = useMemo(() => makeRoute(day), [day]);
  const fromA = useMemo(() => bfs(route.a), [route.a]);
  const fromB = useMemo(() => bfs(route.b), [route.b]);
  const MAX = route.d - 1 + 4;
  const [local, setLocal] = useState<string[] | null>(null);
  const guesses = (local ?? saved?.state?.guesses ?? []).filter((g) => BY_ID[g]);
  const shapes = useShapes("world");

  const quality = (id: string) => {
    const s = (fromA[id] ?? 99) + (fromB[id] ?? 99);
    return s === route.d ? "on" : s === route.d + 1 ? "near" : "off";
  };
  const connected = (gs: string[]) => {
    const allowed = new Set([route.a, route.b, ...gs]);
    return bfs(route.a, allowed)[route.b] != null;
  };
  const won = connected(guesses);
  const over = won || guesses.length >= MAX;

  // one shortest path to reveal at the end
  const solution = useMemo(() => {
    const path: string[] = [];
    let cur = route.b;
    while (cur !== route.a) {
      const prev = BY_ID[cur].borders.find((n) => fromA[n] === fromA[cur] - 1);
      if (!prev) break; // should not happen with symmetric borders – never crash the game
      if (prev !== route.a) path.unshift(prev);
      cur = prev;
    }
    return path;
  }, [route, fromA]);

  const options = useMemo(() => COUNTRIES.filter((c) => c.id !== route.a && c.id !== route.b).map((c) => ({ id: c.id, label: c.n, alt: c.alt })), [route]);

  const guess = (id: string) => {
    if (over || guesses.includes(id)) return;
    const next = [...guesses, id];
    setLocal(next);
    const w = connected(next);
    const done = w || next.length >= MAX;
    const e = (g: string) => (quality(g) === "on" ? "🟩" : quality(g) === "near" ? "🟧" : "🟥");
    persist({
      done,
      won: w,
      score: w ? MAX - next.length + 1 : 0,
      max: MAX,
      label: w ? `${next.length} Tipps` : "nicht geschafft",
      share: `Grenzgang #${dayNumber(day)} · ${BY_ID[route.a].n} → ${BY_ID[route.b].n}\n${w ? `${next.length} Tipps (kürzester Weg: ${route.d - 1})` : "nicht geschafft"}\n${next.map(e).join("")}`,
      state: { guesses: next },
    });
  };

  const colorOf = (id: string) => {
    if (id === route.a || id === route.b) return "#0b1220";
    if (guesses.includes(id)) return quality(id) === "on" ? "#16a34a" : quality(id) === "near" ? "#f97316" : "#dc2626";
    if (over && solution.includes(id)) return "#86efac";
    return "var(--color-land)";
  };

  const fitIds = [route.a, route.b, ...solution];

  return (
    <GameShell
      game="grenzgang"
      day={day}
      isToday={isToday}
      rules={
        <>
          <p>
            Finde einen Landweg von <strong>{BY_ID[route.a].n}</strong> nach <strong>{BY_ID[route.b].n}</strong>. Nenne dazu Länder, die dazwischen liegen – jedes muss an das nächste grenzen.
          </p>
          <p>
            <span className="font-semibold text-green-700">Grün</span>: liegt auf einem kürzesten Weg. <span className="font-semibold text-orange-600">Orange</span>: ein kleiner Umweg.{" "}
            <span className="font-semibold text-red-600">Rot</span>: weit daneben.
          </p>
          <p>Du gewinnst, sobald deine Länder eine durchgehende Verbindung bilden. Du hast {MAX} Tipps.</p>
        </>
      }
    >
      {!loaded ? (
        <div className="h-96 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          <div className="card mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 sm:gap-3 sm:p-4">
            <Endpoint id={route.a} label="Start" />
            <div className="text-center text-xs text-muted sm:text-sm">
              <p className="text-xl sm:text-2xl" aria-hidden="true">
                →
              </p>
              <p className="whitespace-nowrap">mind. {route.d - 1} Länder</p>
            </div>
            <Endpoint id={route.b} label="Ziel" right />
          </div>
          {!over && (
            <div className="mb-4">
              <Picker options={options} onPick={guess} disabled={guesses} placeholder="Land dazwischen …" buttonLabel="Hinzufügen" />
              <p className="mt-2 text-sm text-muted">
                Tipp {guesses.length + 1} von {MAX}
              </p>
            </div>
          )}
          {shapes ? (
            <MapView showBorders={false} shapes={shapes.list} fit={fitIds.map((id) => shapes.byId[id]).filter(Boolean)} fill={colorOf} dots={(id) => id === route.a || id === route.b || guesses.includes(id) || (over && solution.includes(id))} label="Karte mit Start, Ziel und deinen Tipps" />
          ) : (
            <div className="aspect-video animate-pulse rounded-2xl bg-sea" />
          )}
          {guesses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {guesses.map((g) => (
                <span key={g} className={`pop rounded-full px-3 py-1.5 text-sm font-semibold text-white ${quality(g) === "on" ? "bg-green-600" : quality(g) === "near" ? "bg-orange-500" : "bg-red-600"}`}>
                  {BY_ID[g].n}
                </span>
              ))}
            </div>
          )}
          {over && (
            <>
              <Solutions>
                <SolutionRow
                  title={`Von ${BY_ID[route.a].n} nach ${BY_ID[route.b].n}`}
                  rightLabel="Ein kürzester Weg"
                  right={
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {[route.a, ...solution, route.b].map((id, k) => (
                        <span key={id} className="inline-flex items-center gap-1.5">
                          {k > 0 && <span className="text-muted">→</span>}
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-sm font-semibold">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={flagUrl(BY_ID[id].iso2)} alt="" className="h-3.5 w-auto rounded-sm" />
                            {BY_ID[id].n}
                          </span>
                        </span>
                      ))}
                    </span>
                  }
                  extra={(() => {
                    const others = COUNTRIES.filter((c) => c.id !== route.a && c.id !== route.b && !solution.includes(c.id) && quality(c.id) === "on").map((c) => c.n).slice(0, 12);
                    return (
                      <>
                        <p className="mt-1 text-sm text-muted">Kürzester Weg: {route.d - 1} {route.d - 1 === 1 ? "Land" : "Länder"} dazwischen.{others.length > 0 && ` Ebenfalls auf einem kürzesten Weg: ${others.join(", ")}.`}</p>
                        <p className="mt-2 flex flex-wrap gap-1.5">
                          {guesses.map((g) => {
                            const q = quality(g);
                            return (
                              <span key={g} className="rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold">
                                {q === "on" ? "🟩" : q === "near" ? "🟧" : "🟥"} {BY_ID[g].n}
                              </span>
                            );
                          })}
                        </p>
                      </>
                    );
                  })()}
                />
              </Solutions>
              <ResultCard title={won ? "Verbindung gefunden!" : "Leider keine Verbindung"} score={won ? `${guesses.length} Tipps` : "–"} share={saved?.share || ""} isToday={isToday} current="grenzgang" />
            </>
          )}
        </>
      )}
    </GameShell>
  );
}

function Endpoint({ id, label, right }: { id: string; label: string; right?: boolean }) {
  const c = BY_ID[id];
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5 ${right ? "items-end text-right sm:flex-row-reverse" : "items-start"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flagUrl(c.iso2)} alt="" className="h-8 w-auto rounded border border-line sm:h-9" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted sm:text-xs">{label}</p>
        <p className="font-display font-semibold leading-tight break-words [hyphens:auto]">{c.n}</p>
      </div>
    </div>
  );
}
