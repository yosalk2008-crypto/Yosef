"use client";

import { useEffect, useMemo, useState } from "react";
import { BY_ID, COUNTRIES, flagUrl } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { deltaE, hslToHex, isNeutral, recolorSvg, svgDataUrl } from "@/lib/color";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { SolutionRow, Solutions } from "../Solutions";
import { useLang, useT } from "@/lib/i18n";
import { cName } from "@/lib/data/countries";

const ROUNDS = 5;
const POOL = COUNTRIES.filter((c) => c.flag.simple && c.flag.colors.some((h) => !isNeutral(h)) && (c.pop ?? 0) >= 500000);

function rounds(day: string) {
  const rng = makeRng(`${day}:farbecht`);
  return rng.sample(POOL, ROUNDS).map((c) => ({ id: c.id, color: rng.pick(c.flag.colors.filter((h) => !isNeutral(h))) }));
}

function points(guess: string, truth: string) {
  return Math.max(0, Math.round((10 - deltaE(guess, truth) / 12) * 10) / 10);
}
const emoji = (p: number) => (p >= 8 ? "🟩" : p >= 5 ? "🟨" : p > 0 ? "🟧" : "🟥");

type S = { guesses: string[] };

export function Farbecht() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("farbecht");
  const lang = useLang();
  const t = useT();
  const LOC = lang === "en" ? "en-GB" : "de-DE";
  const plan = useMemo(() => rounds(day), [day]);
  const [local, setLocal] = useState<string[] | null>(null);
  const guesses = local ?? saved?.state?.guesses ?? [];
  const round = guesses.length;
  const over = round >= ROUNDS;
  const [reveal, setReveal] = useState<number | null>(null);
  const idx = reveal ?? Math.min(round, ROUNDS - 1);
  const r = plan[idx];
  const c = BY_ID[r.id];

  const [hsl, setHsl] = useState<[number, number, number]>([0, 0, 50]);
  const color = hslToHex(...hsl);
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSvg(null);
    fetch(flagUrl(c.iso2))
      .then((x) => x.text())
      .then((t) => alive && setSvg(t));
    return () => {
      alive = false;
    };
  }, [c.iso2]);

  const pts = guesses.map((g, i) => points(g, plan[i].color));
  const total = Math.round(pts.reduce((a, b) => a + b, 0) * 10) / 10;
  const revealed = reveal != null || over;
  const shownGuess = reveal != null ? guesses[reveal] : over ? guesses[idx] : color;

  const submit = () => {
    const next = [...guesses, color];
    setLocal(next);
    setReveal(round);
    const p = next.map((g, i) => points(g, plan[i].color));
    const sum = Math.round(p.reduce((a, b) => a + b, 0) * 10) / 10;
    persist({
      done: next.length >= ROUNDS,
      score: sum,
      max: ROUNDS * 10,
      label: `${sum.toLocaleString(LOC)}/${ROUNDS * 10}`,
      share: `${t("Farbecht", "True Colours")} #${dayNumber(day)} · ${sum.toLocaleString(LOC)}/${ROUNDS * 10}\n${p.map(emoji).join("")}`,
      state: { guesses: next },
    });
  };

  const sliders: { label: string; max: number; i: 0 | 1 | 2; bg: string; unit: string }[] = [
    { label: t("Farbton", "Hue"), max: 360, i: 0, unit: "°", bg: "linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" },
    { label: t("Sättigung", "Saturation"), max: 100, i: 1, unit: " %", bg: `linear-gradient(90deg,${hslToHex(hsl[0], 0, hsl[2])},${hslToHex(hsl[0], 100, hsl[2])})` },
    { label: t("Helligkeit", "Lightness"), max: 100, i: 2, unit: " %", bg: `linear-gradient(90deg,#000,${hslToHex(hsl[0], hsl[1], 50)},#fff)` },
  ];

  return (
    <GameShell
      game="farbecht"
      day={day}
      isToday={isToday}
      rules={
        <>
          {lang === "en" ? (
            <>
              <p>In every flag one colour is wrong. That area always shows your current mix.</p>
              <p>Use the three sliders for <strong>hue, saturation and lightness</strong> to set the original colour – from memory.</p>
              <p>The smaller the colour difference, the more points (max. 10 per flag, {ROUNDS} flags).</p>
            </>
          ) : (
            <>
              <p>In jeder Flagge ist eine Farbe falsch. Die betroffene Fläche zeigt immer deine aktuelle Mischung.</p>
              <p>Stell mit den drei Reglern <strong>Farbton, Sättigung und Helligkeit</strong> die Originalfarbe ein – aus dem Gedächtnis.</p>
              <p>Je kleiner der Farbabstand, desto mehr Punkte (max. 10 pro Flagge, {ROUNDS} Flaggen).</p>
            </>
          )}
        </>
      }
    >
      {!loaded ? (
        <div className="h-96 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold">
              {t("Flagge", "Flag")} {idx + 1} {t("von", "of")} {ROUNDS}: {cName(c, lang)}
            </span>
            <span className="text-muted">{t("Punkte", "Points")}: {total.toLocaleString(LOC)}</span>
          </div>
          <div className={`grid gap-3 ${revealed ? "grid-cols-2" : "grid-cols-1"}`}>
            <figure className="card overflow-hidden p-3">
              {svg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={svgDataUrl(recolorSvg(svg, r.color, shownGuess))} alt={t(`Flagge von ${c.n} mit deiner Farbe`, `Flag of ${c.nEn} with your colour`)} className="mx-auto aspect-[4/3] w-full max-w-md rounded-md border border-line object-cover" />
              ) : (
                <div className="mx-auto aspect-[4/3] w-full max-w-md animate-pulse rounded-md bg-line" />
              )}
              {revealed && <figcaption className="mt-2 text-center text-sm font-semibold">{t("Deine Farbe", "Your colour")}</figcaption>}
            </figure>
            {revealed && svg && (
              <figure className="card pop overflow-hidden p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={svgDataUrl(svg)} alt={t(`Originalflagge von ${c.n}`, `Original flag of ${c.nEn}`)} className="mx-auto aspect-[4/3] w-full max-w-md rounded-md border border-line object-cover" />
                <figcaption className="mt-2 text-center text-sm font-semibold">Original</figcaption>
              </figure>
            )}
          </div>

          {!revealed && (
            <div className="card mt-4 space-y-4 p-4">
              {sliders.map((s) => (
                <div key={s.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <label htmlFor={"sl" + s.i} className="font-semibold">
                      {s.label}
                    </label>
                    <span className="tabular-nums text-muted">
                      {hsl[s.i]}
                      {s.unit}
                    </span>
                  </div>
                  <input
                    id={"sl" + s.i}
                    type="range"
                    min={0}
                    max={s.max}
                    value={hsl[s.i]}
                    onChange={(e) => {
                      const v = [...hsl] as [number, number, number];
                      v[s.i] = +e.target.value;
                      setHsl(v);
                    }}
                    className="slider"
                    style={{ background: s.bg }}
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <span className="h-12 w-12 shrink-0 rounded-xl border border-line" style={{ background: color }} aria-hidden="true" />
                <button type="button" onClick={submit} className="btn-primary flex-1" disabled={!svg}>
                  {t("Farbe festlegen", "Lock in colour")}
                </button>
              </div>
            </div>
          )}

          {reveal != null && (
            <div className="card pop mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex overflow-hidden rounded-xl border border-line" aria-hidden="true">
                  <span className="h-12 w-8" style={{ background: guesses[reveal] }} />
                  <span className="h-12 w-8" style={{ background: plan[reveal].color }} />
                </span>
                <p className="text-2xl font-display font-semibold">{pts[reveal].toLocaleString(LOC)} / 10</p>
              </div>
              {round < ROUNDS ? (
                <button
                  type="button"
                  onClick={() => {
                    setReveal(null);
                    setHsl([0, 0, 50]);
                  }}
                  className="btn-primary"
                >
                  {t("Nächste Flagge", "Next flag")}
                </button>
              ) : (
                <button type="button" onClick={() => setReveal(null)} className="btn-primary">
                  {t("Ergebnis", "Result")}
                </button>
              )}
            </div>
          )}

          {over && reveal == null && (
            <>
              <Solutions>
                {plan.map((p, i) => {
                  const sw = (hex: string) => (
                    <span className="inline-flex items-center gap-1.5 align-middle">
                      <span className="inline-block h-5 w-9 rounded-md border-2 border-ink/70" style={{ background: hex }} aria-hidden="true" />
                      <span className="font-mono text-sm uppercase">{hex}</span>
                    </span>
                  );
                  return (
                    <SolutionRow key={p.id} iso2={BY_ID[p.id].iso2} title={cName(BY_ID[p.id], lang)} right={sw(p.color)} yours={guesses[i] ? sw(guesses[i]) : "–"} badge={{ text: `${pts[i].toLocaleString(LOC)} / 10`, pts: pts[i], max: 10 }} />
                  );
                })}
              </Solutions>
              <ResultCard title={t("Dein Ergebnis", "Your result")} score={`${total.toLocaleString(LOC)} / ${ROUNDS * 10}`} share={saved?.share || ""} isToday={isToday} current="farbecht" />
            </>
          )}
        </>
      )}
    </GameShell>
  );
}
