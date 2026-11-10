"use client";

import { useMemo, useState } from "react";
import { BY_ID, COUNTRIES, flagUrl, type Country } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { bearing, distanceKm, useShapes } from "@/lib/geo";
import { METRICS } from "@/lib/metrics";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { MapView } from "../MapView";
import { Picker } from "../Picker";

const MAX = 8;
const POOL = COUNTRIES.filter((c) => c.pop != null && c.gdppc != null && (c.pop ?? 0) >= 100000);

export function pickTarget(day: string): Country {
  return makeRng(`${day}:laenderjagd`).pick(POOL);
}

function heat(km: number) {
  if (km === 0) return { color: "#16a34a", emoji: "🟩" };
  if (km < 1500) return { color: "#eab308", emoji: "🟨" };
  if (km < 4000) return { color: "#f97316", emoji: "🟧" };
  return { color: "#dc2626", emoji: "🟥" };
}

type S = { guesses: string[] };

export function Laenderjagd() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("laenderjagd");
  const target = useMemo(() => pickTarget(day), [day]);
  const [local, setLocal] = useState<string[] | null>(null);
  const guesses = local ?? saved?.state?.guesses ?? [];
  const won = guesses.includes(target.id);
  const over = won || guesses.length >= MAX;
  const shapes = useShapes("world");

  const options = useMemo(() => COUNTRIES.map((c) => ({ id: c.id, label: c.n, alt: c.alt })), []);

  const guess = (id: string) => {
    if (over || guesses.includes(id)) return;
    const next = [...guesses, id];
    setLocal(next);
    const isWin = id === target.id;
    const done = isWin || next.length >= MAX;
    const share = `Länderjagd #${dayNumber(day)} · ${isWin ? next.length : "X"}/${MAX}\n` + next.map((g) => heat(distanceKm(BY_ID[g].ll, target.ll) * (g === target.id ? 0 : 1)).emoji).join("");
    persist({
      done,
      won: isWin,
      score: isWin ? MAX + 1 - next.length : 0,
      max: MAX,
      label: done ? (isWin ? `${next.length}/${MAX}` : `X/${MAX}`) : `${next.length}/${MAX}`,
      share,
      state: { guesses: next },
    });
  };

  const fill = (id: string) => {
    if (over && id === target.id) return "#16a34a";
    if (!guesses.includes(id)) return "var(--color-land)";
    return heat(id === target.id ? 0 : distanceKm(BY_ID[id].ll, target.ll)).color;
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
          <p>Nach jedem Tipp siehst du, ob der Kontinent stimmt und ob das gesuchte Land mehr oder weniger Einwohner, Fläche und BIP pro Kopf hat (▲ mehr, ▼ weniger).</p>
          <p>Entfernung und Richtung zeigen dir, wo du weitersuchen solltest. Die Farbe auf der Karte wird wärmer, je näher du kommst.</p>
        </>
      }
    >
      {!loaded ? (
        <div className="h-64 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          {!over && (
            <div className="mb-4">
              <Picker options={options} onPick={guess} disabled={guesses} />
              <p className="mt-2 text-sm text-muted">
                Versuch {guesses.length + 1} von {MAX}
              </p>
            </div>
          )}

          {guesses.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-3 py-2.5 font-semibold">Land</th>
                    <th className="px-2 py-2.5 font-semibold">Kontinent</th>
                    <th className="px-2 py-2.5 font-semibold">Einwohner</th>
                    <th className="px-2 py-2.5 font-semibold">Fläche</th>
                    <th className="px-2 py-2.5 font-semibold">BIP/Kopf</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Entfernung</th>
                  </tr>
                </thead>
                <tbody>
                  {[...guesses].reverse().map((id) => (
                    <Row key={id} g={BY_ID[id]} t={target} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            {shapes ? (
              <MapView shapes={shapes.list} fill={fill} dots={(id) => guesses.includes(id) || (over && id === target.id)} label="Weltkarte mit deinen Tipps" />
            ) : (
              <div className="aspect-video animate-pulse rounded-2xl bg-sea" />
            )}
          </div>

          {over && (
            <ResultCard
              title={won ? "Gefunden!" : "Leider nicht geschafft"}
              score={won ? `${guesses.length}/${MAX}` : `X/${MAX}`}
              share={saved?.share || ""}
              isToday={isToday}
              current="laenderjagd"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(target.iso2)} alt="" className="h-8 w-auto rounded border border-line" />
                <span>
                  Gesucht war <strong className="text-ink">{target.n}</strong> ({target.cont}, Hauptstadt {target.cap}).
                </span>
              </div>
            </ResultCard>
          )}
        </>
      )}
    </GameShell>
  );
}

function Cmp({ g, t, k }: { g: Country; t: Country; k: "pop" | "area" | "gdppc" }) {
  const gv = g[k] as number | null;
  const tv = t[k] as number | null;
  if (gv == null || tv == null) return <td className="px-2 py-2.5 text-muted">–</td>;
  const same = g.id === t.id;
  const ratio = tv / gv;
  const close = ratio > 0.8 && ratio < 1.25;
  const cls = same ? "bg-green-100 text-green-800" : close ? "bg-yellow-100 text-yellow-900" : "bg-surface text-ink";
  return (
    <td className="px-2 py-2">
      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 font-medium ${cls}`}>
        {METRICS[k].fmt(gv)}
        {!same && <span aria-label={tv > gv ? "gesuchtes Land hat mehr" : "gesuchtes Land hat weniger"}>{tv > gv ? "▲" : "▼"}</span>}
      </span>
    </td>
  );
}

function Row({ g, t }: { g: Country; t: Country }) {
  const same = g.id === t.id;
  const km = same ? 0 : distanceKm(g.ll, t.ll);
  const dir = bearing(g.ll, t.ll);
  const h = heat(km);
  return (
    <tr className="pop border-b border-line last:border-0">
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-2 font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagUrl(g.iso2)} alt="" className="h-4 w-auto rounded-sm border border-line" />
          {g.n}
        </span>
      </td>
      <td className="px-2 py-2">
        <span className={`inline-flex whitespace-nowrap rounded-lg px-2 py-1 font-medium ${g.cont === t.cont ? "bg-green-100 text-green-800" : "bg-surface text-muted"}`}>
          {g.cont === t.cont ? "✓ " : "✗ "}
          {g.cont}
        </span>
      </td>
      <Cmp g={g} t={t} k="pop" />
      <Cmp g={g} t={t} k="area" />
      <Cmp g={g} t={t} k="gdppc" />
      <td className="px-3 py-2 text-right">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 font-semibold text-white" style={{ background: h.color }}>
          {same ? "Treffer" : `${new Intl.NumberFormat("de-DE").format(Math.round(km / 10) * 10)} km ${dir.arrow}`}
        </span>
      </td>
    </tr>
  );
}
