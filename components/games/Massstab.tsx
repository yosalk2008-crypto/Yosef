"use client";

import { useEffect, useMemo, useState } from "react";
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { dayNumber } from "@/lib/daily";
import { useShapes, type ShapeSet } from "@/lib/geo";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { SolutionRow, Solutions } from "../Solutions";
import { useLang, useT } from "@/lib/i18n";
import { BY_ID } from "@/lib/data/countries";
import { ITEM_BY_ID, KIND_LABEL, ROUNDS, dailyPairs, isWater, itemName, type Item } from "@/lib/massstab";

/** Kept for the multiplayer solution card: the target ids of a day. */
export const targets = (day: string) => dailyPairs(day).map((p) => p.target);

const MIN_A = 100;
const MAX_A = 400000000;
const R = 6371;

let LOC = "de-DE";
const fmt = (v: number) => {
  if (v >= 1e6) return new Intl.NumberFormat(LOC, { maximumFractionDigits: v >= 1e7 ? 0 : 1 }).format(v / 1e6) + (LOC === "de-DE" ? " Mio. km²" : " million km²");
  return new Intl.NumberFormat(LOC).format(Math.round(v)) + " km²";
};
const num = (v: number) => v.toLocaleString(LOC);
const pct = (a: number, b: number) => new Intl.NumberFormat(LOC, { maximumFractionDigits: a / b < 0.1 ? 1 : 0 }).format((a / b) * 100) + " %";
const toArea = (s: number) => Math.pow(10, Math.log10(MIN_A) + s * (Math.log10(MAX_A) - Math.log10(MIN_A)));
const toSlider = (a: number) => (Math.log10(a) - Math.log10(MIN_A)) / (Math.log10(MAX_A) - Math.log10(MIN_A));

function scoreFor(guess: number, truth: number) {
  const f = Math.sqrt(guess / truth); // linear scale factor of the outline
  return Math.max(0, Math.round((10 - Math.abs(f - 1) * 10) * 10) / 10);
}
const emoji = (p: number) => (p >= 8 ? "🟩" : p >= 5 ? "🟨" : p > 0 ? "🟧" : "🟥");

type Geo = FeatureCollection<Geometry>;
let extraPromise: Promise<Record<string, Feature<Geometry>>> | null = null;
/** Oceans, seas, lakes, Greenland and Antarctica (public/geo/massstab.json). */
function useExtra() {
  const [x, setX] = useState<Record<string, Feature<Geometry>> | null>(null);
  useEffect(() => {
    extraPromise ??= fetch("/geo/massstab.json?v=1")
      .then((r) => r.json())
      .then((fc: { features: (Feature<Geometry> & { id: string })[] }) => Object.fromEntries(fc.features.map((f) => [f.id, f])));
    let alive = true;
    extraPromise.then((v) => alive && setX(v));
    return () => {
      alive = false;
    };
  }, []);
  return x;
}
function geoOf(item: Item, world: ShapeSet, extra: Record<string, Feature<Geometry>>): Geo {
  const features: Feature<Geometry>[] = [];
  for (const id of item.countries ?? []) if (world.byId[id]) features.push(world.byId[id]);
  for (const id of item.geo ?? []) {
    const f = extra[id] ?? world.byId[id];
    if (f) features.push(f);
  }
  return { type: "FeatureCollection", features };
}

type S = { guesses: number[] };

export function Massstab() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("massstab");
  const lang = useLang();
  const t = useT();
  LOC = lang === "en" ? "en-GB" : "de-DE";
  const pairs = useMemo(() => dailyPairs(day), [day]);
  const [local, setLocal] = useState<number[] | null>(null);
  const guesses = local ?? saved?.state?.guesses ?? [];
  const round = guesses.length;
  const over = round >= ROUNDS;
  const world = useShapes("world");
  const extra = useExtra();
  const [reveal, setReveal] = useState<number | null>(null); // round index being revealed

  const shown = reveal ?? Math.min(round, ROUNDS - 1);
  const ref = ITEM_BY_ID[pairs[shown].ref];
  const target = ITEM_BY_ID[pairs[shown].target];
  const [slider, setSlider] = useState<number | null>(null);
  const sliderVal = slider ?? toSlider(ref.area);
  const truth = (i: number) => ITEM_BY_ID[pairs[i].target].area;
  const points = guesses.map((g, i) => scoreFor(g, truth(i)));
  const total = Math.round(points.reduce((a, b) => a + b, 0) * 10) / 10;
  const nm = (x: Item) => itemName(x, lang);
  const kind = (x: Item) => KIND_LABEL[x.kind][lang === "en" ? 1 : 0];

  const submit = () => {
    const g = toArea(sliderVal);
    const next = [...guesses, g];
    setLocal(next);
    setReveal(round);
    const pts = next.map((x, i) => scoreFor(x, truth(i)));
    const sum = Math.round(pts.reduce((a, b) => a + b, 0) * 10) / 10;
    persist({
      done: next.length >= ROUNDS,
      score: sum,
      max: ROUNDS * 10,
      label: `${num(sum)}/${ROUNDS * 10}`,
      share: `${t("Maßstab", "To Scale")} #${dayNumber(day)} · ${num(sum)}/${ROUNDS * 10}\n${pts.map(emoji).join("")}`,
      state: { guesses: next },
    });
  };
  const nextRound = () => {
    setReveal(null);
    setSlider(null);
  };

  const revealed = reveal != null || over;
  const guessArea = reveal != null ? guesses[reveal] : over ? guesses[shown] : toArea(sliderVal);

  return (
    <GameShell
      game="massstab"
      day={day}
      isToday={isToday}
      rules={
        lang === "en" ? (
          <>
            <p>On the left is a <strong>reference</strong> – a country, a continent, a lake or a sea. On the right is something else, drawn true to shape but at the wrong size.</p>
            <p>Move the slider until it is as big as it really is compared with the left one. The closer, the more points (max. 10 per round, {ROUNDS} rounds).</p>
            <p>Every day brings different comparisons: countries, continents, oceans, seas and lakes.</p>
          </>
        ) : (
          <>
            <p>Links siehst du einen <strong>Vergleich</strong> – ein Land, einen Kontinent, einen See oder ein Meer. Rechts ist etwas anderes, in der richtigen Form, aber in der falschen Größe.</p>
            <p>Zieh den Regler, bis es im Vergleich zum linken so groß ist wie in Wirklichkeit. Je genauer, desto mehr Punkte (max. 10 pro Runde, {ROUNDS} Runden).</p>
            <p>Jeden Tag gibt es andere Vergleiche: Länder, Kontinente, Ozeane, Meere und Seen.</p>
          </>
        )
      }
    >
      {!loaded || !world || !extra ? (
        <div className="h-80 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold">
              {t("Runde", "Round")} {Math.min(shown + 1, ROUNDS)} {t("von", "of")} {ROUNDS}
            </span>
            <span className="text-muted">{t("Punkte", "Points")}: {num(total)}</span>
          </div>
          <div className="card overflow-hidden">
            <Compare
              key={pairs[shown].target}
              refGeo={geoOf(ref, world, extra)}
              refItem={ref}
              targetGeo={geoOf(target, world, extra)}
              targetItem={target}
              guessArea={guessArea}
              revealed={revealed}
            />
            <div className="grid grid-cols-2 border-t border-line text-center text-sm">
              <div className="border-r border-line p-3">
                <p className="text-[11px] font-bold text-muted">{kind(ref)}</p>
                <p className="font-bold">{nm(ref)}</p>
                <p className="text-muted">{fmt(ref.area)}</p>
              </div>
              <div className="p-3">
                <p className="text-[11px] font-bold text-muted">{kind(target)}</p>
                <p className="font-bold">{nm(target)}</p>
                <p className="text-muted">{revealed ? `${t("echt", "actual")}: ${fmt(target.area)}` : `${t("dein Tipp", "your guess")}: ${fmt(guessArea)}`}</p>
              </div>
            </div>
          </div>

          {!revealed && (
            <div className="card mt-4 p-4">
              <label htmlFor="size" className="mb-3 block text-sm font-semibold">
                {t(`Wie groß ist ${nm(target)} im Vergleich zu ${nm(ref)}?`, `How big is ${nm(target)} compared with ${nm(ref)}?`)}
              </label>
              <input
                id="size"
                type="range"
                min={0}
                max={1}
                step={0.0005}
                value={sliderVal}
                onChange={(e) => setSlider(+e.target.value)}
                className="slider bg-gradient-to-r from-sky-100 to-sky-400"
                aria-valuetext={`${pct(toArea(sliderVal), ref.area)} ${t("von", "of")} ${nm(ref)}`}
              />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{t("kleiner", "smaller")}</span>
                <span className="font-semibold text-ink">{pct(toArea(sliderVal), ref.area)} {t("von", "of")} {nm(ref)}</span>
                <span>{t("größer", "bigger")}</span>
              </div>
              <button type="button" onClick={submit} className="btn-primary mt-4 w-full">
                {t("Größe festlegen", "Lock in size")}
              </button>
            </div>
          )}

          {reveal != null && (
            <div className="card pop mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-2xl font-display font-semibold">{num(points[reveal])} / 10 {t("Punkte", "points")}</p>
                <p className="text-sm text-muted">
                  {t("Dein Tipp", "Your guess")}: {fmt(guesses[reveal])} · {t("echt", "actual")}: {fmt(target.area)} ({pct(target.area, ref.area)} {t("von", "of")} {nm(ref)})
                </p>
              </div>
              {round < ROUNDS && (
                <button type="button" onClick={nextRound} className="btn-primary">
                  {t("Nächste Runde", "Next round")}
                </button>
              )}
            </div>
          )}

          {over && (reveal == null || reveal === ROUNDS - 1) && (
            <>
              <Solutions note={t("Echte Flächen im Vergleich.", "Real areas compared.")}>
                {pairs.map((p, i) => {
                  const a = ITEM_BY_ID[p.target];
                  const b = ITEM_BY_ID[p.ref];
                  const km = (v: number) => `${fmt(v)} (${pct(v, b.area)} ${t("von", "of")} ${nm(b)})`;
                  return (
                    <SolutionRow
                      key={p.target}
                      iso2={a.kind === "land" ? BY_ID[a.id]?.iso2 : undefined}
                      title={`${nm(a)} · ${kind(a)}`}
                      right={km(a.area)}
                      yours={km(guesses[i])}
                      badge={{ text: `${num(points[i])} / 10`, pts: points[i], max: 10 }}
                    />
                  );
                })}
              </Solutions>
              <ResultCard title={t("Dein Ergebnis", "Your result")} score={`${num(total)} / ${ROUNDS * 10}`} share={saved?.share || ""} isToday={isToday} current="massstab" />
            </>
          )}
        </>
      )}
    </GameShell>
  );
}

const FILL = {
  ref: { land: "#64748b", water: "#3f6fa8" },
  target: { land: "#ee8a2f", water: "#1aa0d8" },
};

function Compare({ refGeo, refItem, targetGeo, targetItem, guessArea, revealed }: { refGeo: Geo; refItem: Item; targetGeo: Geo; targetItem: Item; guessArea: number; revealed: boolean }) {
  const geo = useMemo(() => {
    const make = (g: Geo, area: number) => {
      const [lng, lat] = geoCentroid(g);
      const p = geoAzimuthalEqualArea().rotate([-lng, -lat]).scale(1000).translate([0, 0]);
      const gp = geoPath(p);
      // equal-area projection: stretch the outline so it covers exactly the official area
      const norm = Math.sqrt(area / Math.max(1, geoArea(g) * R * R));
      const b = gp.bounds(g);
      return { d: gp(g) || "", b: [[b[0][0] * norm, b[0][1] * norm], [b[1][0] * norm, b[1][1] * norm]] as [[number, number], [number, number]], norm };
    };
    return { r: make(refGeo, refItem.area), t: make(targetGeo, targetItem.area) };
  }, [refGeo, targetGeo, refItem.area, targetItem.area]);

  // f rescales the target outline from its true size to the guessed size
  const f = Math.sqrt(guessArea / targetItem.area);
  const rb = geo.r.b;
  const tb = geo.t.b;
  const rw = rb[1][0] - rb[0][0];
  const rh = rb[1][1] - rb[0][1];
  const tw0 = tb[1][0] - tb[0][0];
  const th0 = tb[1][1] - tb[0][1];
  const tw = tw0 * f;
  const th = th0 * f;
  const showTrue = revealed;
  const gap = Math.max(rw, tw) * 0.15 + 10;
  const W = rw + gap + Math.max(tw, showTrue ? tw0 : 0);
  const H = Math.max(rh, th, showTrue ? th0 : 0);
  const pad = Math.max(W, H) * 0.06;
  const vbW = W + pad * 2;
  const vbH = Math.max(H + pad * 2, vbW * 0.5);
  const cy = vbH / 2;
  const rx = pad - rb[0][0];
  const ry = cy - (rb[0][1] + rh / 2);
  const tcx = pad + rw + gap + Math.max(tw, showTrue ? tw0 : 0) / 2;
  const cxT = tb[0][0] + tw0 / 2;
  const cyT = tb[0][1] + th0 / 2;
  const kr = isWater(refItem.kind) ? "water" : "land";
  const kt = isWater(targetItem.kind) ? "water" : "land";

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="block aspect-[16/9] w-full bg-[#eef3f9]" role="img" aria-label="Größenvergleich / size comparison">
      <path d={geo.r.d} transform={`translate(${rx} ${ry}) scale(${geo.r.norm})`} fill={FILL.ref[kr]} />
      {showTrue && (
        <path
          d={geo.t.d}
          transform={`translate(${tcx - cxT} ${cy - cyT}) scale(${geo.t.norm})`}
          fill={kt === "water" ? "rgb(22 163 74 / 0.28)" : "none"}
          stroke={kt === "water" ? "none" : "#16a34a"}
          strokeWidth={2}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path d={geo.t.d} transform={`translate(${tcx - cxT * f} ${cy - cyT * f}) scale(${geo.t.norm * f})`} fill={FILL.target[kt]} fillOpacity={showTrue ? 0.6 : 1} />
    </svg>
  );
}
