"use client";

import { useMemo, useState } from "react";
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from "d3-geo";
import { BY_ID, COUNTRIES } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { useShapes, type Shape } from "@/lib/geo";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";

const ROUNDS = 5;
const REF = "DEU";
const MIN_A = 1000;
const MAX_A = 20000000;
const POOL = COUNTRIES.filter((c) => c.shape && c.id !== REF && c.area >= 10000);

function targets(day: string) {
  const rng = makeRng(`${day}:massstab`);
  // one from each size band so every round feels different
  const bands = [
    [10000, 120000],
    [120000, 400000],
    [400000, 1000000],
    [1000000, 3000000],
    [3000000, 20000000],
  ];
  return rng.shuffle(bands.map(([lo, hi]) => rng.pick(POOL.filter((c) => c.area >= lo && c.area < hi)).id));
}

const fmt = (v: number) => new Intl.NumberFormat("de-DE").format(Math.round(v)) + " km²";
const toArea = (s: number) => Math.pow(10, Math.log10(MIN_A) + s * (Math.log10(MAX_A) - Math.log10(MIN_A)));
const toSlider = (a: number) => (Math.log10(a) - Math.log10(MIN_A)) / (Math.log10(MAX_A) - Math.log10(MIN_A));

function scoreFor(guess: number, truth: number) {
  const f = Math.sqrt(guess / truth); // linear scale factor of the outline
  return Math.max(0, Math.round((10 - Math.abs(f - 1) * 10) * 10) / 10);
}
const emoji = (p: number) => (p >= 8 ? "🟩" : p >= 5 ? "🟨" : p > 0 ? "🟧" : "🟥");

type S = { guesses: number[] };

export function Massstab() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("massstab");
  const ids = useMemo(() => targets(day), [day]);
  const [local, setLocal] = useState<number[] | null>(null);
  const guesses = local ?? saved?.state?.guesses ?? [];
  const round = guesses.length;
  const over = round >= ROUNDS;
  const shapes = useShapes("world");
  const [slider, setSlider] = useState(toSlider(BY_ID[REF].area));
  const [reveal, setReveal] = useState<number | null>(null); // round index being revealed

  const shown = reveal ?? Math.min(round, ROUNDS - 1);
  const target = BY_ID[ids[shown]];
  const points = guesses.map((g, i) => scoreFor(g, BY_ID[ids[i]].area));
  const total = Math.round(points.reduce((a, b) => a + b, 0) * 10) / 10;

  const submit = () => {
    const g = toArea(slider);
    const next = [...guesses, g];
    setLocal(next);
    setReveal(round);
    const pts = next.map((x, i) => scoreFor(x, BY_ID[ids[i]].area));
    const sum = Math.round(pts.reduce((a, b) => a + b, 0) * 10) / 10;
    const done = next.length >= ROUNDS;
    persist({
      done,
      score: sum,
      max: ROUNDS * 10,
      label: `${sum.toLocaleString("de-DE")}/${ROUNDS * 10}`,
      share: `Maßstab #${dayNumber(day)} · ${sum.toLocaleString("de-DE")}/${ROUNDS * 10}\n${pts.map(emoji).join("")}`,
      state: { guesses: next },
    });
  };
  const nextRound = () => {
    setReveal(null);
    setSlider(toSlider(BY_ID[REF].area));
  };

  const revealed = reveal != null || over;
  const guessArea = reveal != null ? guesses[reveal] : over ? guesses[shown] : toArea(slider);

  return (
    <GameShell
      game="massstab"
      day={day}
      isToday={isToday}
      rules={
        <>
          <p>
            Links siehst du <strong>Deutschland</strong>, rechts ein anderes Land. Beide sind flächentreu dargestellt – aber das rechte hat die falsche Größe.
          </p>
          <p>Zieh den Regler, bis das Land so groß ist wie in Wirklichkeit. Je genauer, desto mehr Punkte (max. 10 pro Runde, {ROUNDS} Runden).</p>
          <p>Tipp: Weltkarten in Mercator-Projektion lassen Länder nahe den Polen viel zu groß aussehen.</p>
        </>
      }
    >
      {!loaded || !shapes ? (
        <div className="h-80 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold">
              Runde {Math.min(shown + 1, ROUNDS)} von {ROUNDS}
            </span>
            <span className="text-muted">Punkte: {total.toLocaleString("de-DE")}</span>
          </div>
          <div className="card overflow-hidden">
            <Compare refShape={shapes.byId[REF]} target={shapes.byId[target.id]} guessArea={guessArea} trueArea={target.area} refArea={BY_ID[REF].area} revealed={revealed} />
            <div className="grid grid-cols-2 border-t border-line text-center text-sm">
              <div className="border-r border-line p-3">
                <p className="font-bold">Deutschland</p>
                <p className="text-muted">{fmt(BY_ID[REF].area)}</p>
              </div>
              <div className="p-3">
                <p className="font-bold">{target.n}</p>
                <p className="text-muted">{revealed ? `echt: ${fmt(target.area)}` : "Größe?"}</p>
              </div>
            </div>
          </div>

          {!revealed && (
            <div className="card mt-4 p-4">
              <label htmlFor="size" className="mb-3 block text-sm font-semibold">
                Größe von {target.n} einstellen
              </label>
              <input
                id="size"
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={slider}
                onChange={(e) => setSlider(+e.target.value)}
                className="slider bg-gradient-to-r from-sky-100 to-sky-400"
                aria-valuetext={`${Math.round((toArea(slider) / BY_ID[REF].area) * 100)} Prozent von Deutschland`}
              />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>kleiner</span>
                <span>größer</span>
              </div>
              <button type="button" onClick={submit} className="btn-primary mt-4 w-full">
                Größe festlegen
              </button>
            </div>
          )}

          {reveal != null && (
            <div className="card pop mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-2xl font-display font-semibold">{points[reveal].toLocaleString("de-DE")} / 10 Punkte</p>
                <p className="text-sm text-muted">
                  Dein Tipp: {fmt(guesses[reveal])} · echt: {fmt(target.area)} ({Math.round((target.area / BY_ID[REF].area) * 100)} % von Deutschland)
                </p>
              </div>
              {round < ROUNDS && (
                <button type="button" onClick={nextRound} className="btn-primary">
                  Nächste Runde
                </button>
              )}
            </div>
          )}

          {over && (reveal == null || reveal === ROUNDS - 1) && (
            <ResultCard title="Dein Ergebnis" score={`${total.toLocaleString("de-DE")} / ${ROUNDS * 10}`} share={saved?.share || ""} isToday={isToday} current="massstab">
              <ul className="space-y-1">
                {ids.map((id, i) => (
                  <li key={id} className="flex justify-between gap-3">
                    <span>
                      {emoji(points[i])} {BY_ID[id].n}
                    </span>
                    <span className="font-semibold text-ink">{points[i].toLocaleString("de-DE")}</span>
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

function Compare({
  refShape,
  target,
  guessArea,
  trueArea,
  refArea,
  revealed,
}: {
  refShape: Shape;
  target: Shape;
  guessArea: number;
  trueArea: number;
  refArea: number;
  revealed: boolean;
}) {
  const geo = useMemo(() => {
    const make = (s: Shape) => {
      const [lng, lat] = geoCentroid(s);
      const p = geoAzimuthalEqualArea().rotate([-lng, -lat]).scale(1000).translate([0, 0]);
      const gp = geoPath(p);
      return { d: gp(s) || "", b: gp.bounds(s) };
    };
    return { r: make(refShape), t: make(target) };
  }, [refShape, target]);

  // same projection scale => true relative size; f rescales the target outline
  const f = Math.sqrt(guessArea / trueArea);
  const rb = geo.r.b;
  const tb = geo.t.b;
  const rw = rb[1][0] - rb[0][0];
  const rh = rb[1][1] - rb[0][1];
  const tw = (tb[1][0] - tb[0][0]) * f;
  const th = (tb[1][1] - tb[0][1]) * f;
  const tw0 = tb[1][0] - tb[0][0];
  const th0 = tb[1][1] - tb[0][1];
  const gap = Math.max(rw, tw) * 0.15 + 10;
  const showTrue = revealed;
  const W = rw + gap + Math.max(tw, showTrue ? tw0 : 0);
  const H = Math.max(rh, th, showTrue ? th0 : 0);
  const pad = Math.max(W, H) * 0.06;
  const vbW = W + pad * 2;
  const vbH = Math.max(H + pad * 2, vbW * 0.5);
  const cy = vbH / 2;
  const rx = pad - rb[0][0];
  const ry = cy - (rb[0][1] + rh / 2);
  const tcx = pad + rw + gap + Math.max(tw, showTrue ? tw0 : 0) / 2;
  const tcxShape = (tb[0][0] + tw0 / 2) * f;
  const tcyShape = (tb[0][1] + th0 / 2) * f;
  void refArea;

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="block aspect-[16/9] w-full bg-sea" role="img" aria-label="Größenvergleich">
      <path d={geo.r.d} transform={`translate(${rx} ${ry})`} fill="#64748b" />
      {showTrue && (
        <path
          d={geo.t.d}
          transform={`translate(${tcx - tcxShape / f} ${cy - tcyShape / f})`}
          fill="none"
          stroke="#16a34a"
          strokeWidth={2}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path d={geo.t.d} transform={`translate(${tcx - tcxShape} ${cy - tcyShape}) scale(${f})`} fill={showTrue ? "rgb(14 165 233 / 0.55)" : "#0ea5e9"} />
    </svg>
  );
}
