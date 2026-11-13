"use client";

import { useMemo, useState } from "react";
import { LAND_ONLY, useShapes } from "@/lib/geo";
import { randomRng } from "@/lib/rng";
import { MapView } from "../MapView";
import { QuizEnd, QuizHeader, mapSetup, questionCount, useEntities, useQuizParams } from "./common";
import { useLang, useT } from "@/lib/i18n";
import { regionLabel } from "@/lib/data/regions";

const TRY_COLORS = ["#16a34a", "#eab308", "#f97316", "#dc2626"]; // found on 1st … 4th try
const MAX_TRIES = 4;

export function MapQuiz() {
  const tt = useT();
  const lang = useLang();
  const params = useQuizParams();
  const all = useEntities(params.region);
  const shapes = useShapes(params.region.shapes);
  const [seed, setSeed] = useState(0);

  const pool = useMemo(() => (shapes ? all.filter((e) => shapes.byId[e.id]) : []), [all, shapes]);
  const order = useMemo(() => {
    if (!pool.length || !params.ready) return [];
    return randomRng().sample(pool, questionCount(params, pool.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, seed, params.ready]);

  const [i, setI] = useState(0);
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<Record<string, number>>({}); // id -> try index (0-3) or 4 = failed
  const [flash, setFlash] = useState<string | null>(null);
  const [dead, setDead] = useState(false);

  const target = order[i];
  const done = order.length > 0 && (i >= order.length || dead);
  const score = Object.values(result).filter((t) => t < MAX_TRIES).length;

  const restart = () => {
    setSeed((s) => s + 1);
    setI(0);
    setTries(0);
    setResult({});
    setDead(false);
  };

  const pick = (id: string) => {
    if (done || !target || result[id] != null) return;
    if (id === target.id) {
      setResult((r) => ({ ...r, [id]: tries }));
      setTries(0);
      setI((x) => x + 1);
      return;
    }
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 600);
    if (params.oneLife) {
      setResult((r) => ({ ...r, [target.id]: MAX_TRIES }));
      setDead(true);
      return;
    }
    const t = tries + 1;
    if (t >= MAX_TRIES) {
      setResult((r) => ({ ...r, [target.id]: MAX_TRIES }));
      setTries(0);
      setI((x) => x + 1);
    } else setTries(t);
  };

  const setup = useMemo(() => mapSetup(params.region, all), [params.region, all]);
  const fill = (id: string) => {
    if (flash === id) return "#fca5a5";
    const r = result[id];
    if (r != null) return r >= MAX_TRIES ? "#7f1d1d" : TRY_COLORS[r];
    // after 3 misses, hint with a pulse colour on the target
    if (target && id === target.id && tries === MAX_TRIES - 1) return "#fde68a";
    return params.borders ? "var(--color-land)" : "#b6c2d1";
  };

  if (!params.ready || !shapes || !order.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-10">
        <div className="aspect-video animate-pulse rounded-2xl bg-sea" />
      </div>
    );
  }

  // plain land without a country (Western Sahara) is drawn on world maps so there are no holes
  const extra = params.region.shapes === "world" && (params.region.key === "welt" || params.region.key === "afrika") ? [...LAND_ONLY].map((id) => shapes.byId[id]).filter(Boolean) : [];
  const regionShapes = [...pool.map((e) => shapes.byId[e.id]), ...extra];
  const missed = order.filter((e) => result[e.id] === MAX_TRIES).map((e) => ({ name: e.name }));
  const firstTry = Object.values(result).filter((t) => t === 0).length;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-10">
      <QuizHeader title={tt("Auf der Karte", "On the map")} region={params.region} done={Math.min(i, order.length)} total={order.length} score={score} />
      {!done && target && (
        <div className="sticky top-16 z-20 mb-3 flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lg">
          <p className="text-lg font-bold sm:text-xl">
            <span className="text-slate-400">{tt("Wo liegt", "Where is")}</span> {target.name}?
          </p>
          <span className="flex gap-1.5" aria-label={params.oneLife ? tt("1-Leben-Modus", "One-life mode") : tt(`Versuch ${tries + 1} von ${MAX_TRIES}`, `Try ${tries + 1} of ${MAX_TRIES}`)}>
            {params.oneLife ? (
              <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold">{tt("1 Leben", "1 life")}</span>
            ) : (
              TRY_COLORS.map((c, k) => <span key={c} className="h-3 w-3 rounded-full" style={{ background: k === tries ? c : k < tries ? "#475569" : "#1e293b", outline: k === tries ? "2px solid white" : "none" }} />)
            )}
          </span>
        </div>
      )}
      <MapView
        shapes={regionShapes}
        fit={setup.fitIds.map((id) => shapes.byId[id]).filter(Boolean)}
        projection={setup.projection}
        rotate={setup.rotate}
        fitBox={setup.fitBox}
        fill={fill}
        showBorders={params.borders}
        onPick={done ? undefined : pick}
        dots={() => true}
        aspect={params.region.shapes === "world" ? 1.6 : 1.4}
        label={`${tt("Karte", "Map")}: ${regionLabel(params.region, lang)}`}
      />
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {[1, 2, 3, 4].map((x) => tt(`${x}. Versuch`, `Try ${x}`)).map((l, k) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: TRY_COLORS[k] }} />
            {l}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#7f1d1d]" />
          {tt("nicht gefunden", "not found")}
        </span>
      </div>
      {done && (
        <div className="mt-6">
          <QuizEnd
            bestKey={`karte:${params.region.key}:${params.n}:${params.borders ? "b" : "nb"}:${params.oneLife ? "1" : "4"}`}
            score={score}
            total={order.length}
            missed={missed}
            onRestart={restart}
            extra={
              <p className="mt-2 text-sm text-muted">
                {dead ? tt("Ein Fehler im 1-Leben-Modus beendet das Spiel. ", "One mistake ends the game in one-life mode. ") : ""}
                {tt("Beim ersten Versuch gefunden", "Found on the first try")}: <strong className="text-ink">{firstTry}</strong>
              </p>
            }
          />
        </div>
      )}
    </div>
  );
}
