"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { REGION_BY_KEY, REGIONS, entitiesFor, type Entity, type Region, type RegionKey } from "@/lib/data/regions";
import type { MapProjection } from "../MapView";

export type QuizParams = {
  region: Region;
  n: number | "alle";
  borders: boolean;
  oneLife: boolean;
  typing: boolean;
  ready: boolean;
};

export function useQuizParams(): QuizParams {
  const [p, setP] = useState<QuizParams>({ region: REGIONS[0], n: 10, borders: true, oneLife: false, typing: false, ready: false });
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const rk = sp.get("region") as RegionKey | null;
    const region = (rk && REGION_BY_KEY[rk]) || REGIONS[0];
    const nRaw = sp.get("n");
    const n = nRaw === "alle" ? "alle" : nRaw && +nRaw > 0 ? +nRaw : 10;
    setP({ region, n, borders: sp.get("grenzen") !== "aus", oneLife: sp.get("leben") === "1", typing: sp.get("modus") === "eingabe", ready: true });
  }, []);
  return p;
}

export function questionCount(p: QuizParams, total: number) {
  return p.n === "alle" ? total : Math.min(p.n, total);
}

type Box = [[number, number], [number, number]];
const BOXES: Partial<Record<RegionKey, { box: Box; rotate?: number }>> = {
  europa: { box: [[-24, 34], [44, 71]], rotate: -10 },
  asien: { box: [[26, -10], [148, 55]], rotate: -90 },
  afrika: { box: [[-25, -35], [58, 37]], rotate: -15 },
  nordamerika: { box: [[-168, 7], [-53, 72]], rotate: 100 },
  suedamerika: { box: [[-82, -56], [-34, 13]], rotate: 60 },
  ozeanien: { box: [[112, -47], [188, 8]], rotate: -150 },
  nahost: { box: [[24, 11], [64, 43]], rotate: -45 },
};

export function mapSetup(region: Region, entities: Entity[]): { projection: MapProjection; rotate: number; fitIds: string[]; fitBox?: Box } {
  const fitIds = entities.map((e) => e.id);
  if (region.shapes === "us") return { projection: "usa", rotate: 0, fitIds };
  if (region.shapes !== "world") return { projection: "mercator", rotate: 0, fitIds };
  const b = BOXES[region.key];
  if (b) return { projection: "world", rotate: b.rotate ?? 0, fitIds, fitBox: b.box };
  return { projection: "world", rotate: 0, fitIds };
}

const BEST_KEY = "geografik:best";
export function saveBest(key: string, pct: number): { best: number; isNew: boolean } {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) || "{}") as Record<string, number>;
    const prev = all[key] ?? -1;
    if (pct > prev) {
      all[key] = pct;
      localStorage.setItem(BEST_KEY, JSON.stringify(all));
    }
    return { best: Math.max(prev, pct), isNew: pct > prev && prev >= 0 };
  } catch {
    return { best: pct, isNew: false };
  }
}

export function QuizHeader({ title, region, done, total, score }: { title: string; region: Region; done: number; total: number; score: number }) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-muted">
            <Link href="/quiz" className="hover:text-ink">
              Quizze
            </Link>{" "}
            / {region.split && !region.parent ? `${region.label} – ${region.split}` : region.label}
          </p>
          <h1 className="text-2xl font-display font-semibold tracking-tight sm:text-3xl">{title}</h1>
        </div>
        <p className="text-sm font-semibold">
          {Math.min(done + 1, total)} / {total} · <span className="text-ok">{score} richtig</span>
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Fortschritt">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </div>
  );
}

export function QuizEnd({
  bestKey,
  score,
  total,
  missed,
  onRestart,
  extra,
}: {
  bestKey: string;
  score: number;
  total: number;
  missed: { name: string; answer?: string }[];
  onRestart: () => void;
  extra?: React.ReactNode;
}) {
  const pct = total ? Math.round((score / total) * 100) : 0;
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);
  useEffect(() => setBest(saveBest(bestKey, pct)), [bestKey, pct]);
  return (
    <section className="card pop p-6" aria-live="polite">
      <p className="text-sm font-semibold text-muted">Geschafft</p>
      <p className="mt-1 text-5xl font-display font-semibold tracking-tight">
        {score} / {total}
      </p>
      <p className="mt-1 text-muted">
        {pct} % richtig{best && (best.isNew ? " · neuer Rekord!" : ` · dein Rekord: ${best.best} %`)}
      </p>
      {extra}
      {missed.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold">Zum Wiederholen</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {missed.map((m, i) => (
              <li key={i} className="rounded-lg bg-surface px-3 py-2">
                <span className="font-semibold">{m.name}</span>
                {m.answer && <span className="text-muted"> – {m.answer}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={onRestart} className="btn-primary">
          Nochmal spielen
        </button>
        <Link href="/quiz" className="btn-ghost">
          Andere Einstellungen
        </Link>
      </div>
    </section>
  );
}

export function useEntities(region: Region) {
  const [list, setList] = useState<Entity[]>([]);
  useEffect(() => setList(entitiesFor(region.key)), [region.key]);
  return list;
}
