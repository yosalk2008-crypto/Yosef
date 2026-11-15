"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { loadScript } from "@/lib/mp";

/** Figma art from /koscher/art.js (sack, car); loaded once. */
type Art = { sack?: string; car?: string };
export function useKtArt() {
  const [art, setArt] = useState<Art | null>(() => (typeof window !== "undefined" ? ((window as unknown as { KT_ART?: Art }).KT_ART ?? null) : null));
  useEffect(() => {
    if (art) return;
    let on = true;
    loadScript("/koscher/art.js?v=1")
      .then(() => on && setArt((window as unknown as { KT_ART?: Art }).KT_ART ?? {}))
      .catch(() => on && setArt({}));
    return () => {
      on = false;
    };
  }, [art]);
  return art;
}

export type RaceRow = { id: string; name: string; prev: number; now: number; hit?: boolean; missed?: boolean };

/** Counts from `from` to `to` once after mount. */
function Count({ from, to, ms = 900, delay = 0 }: { from: number; to: number; ms?: number; delay?: number }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (from === to) return setV(to);
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - t0) / ms));
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, ms, delay]);
  return <>{v}</>;
}

/** Biggest rows first, at most `max`, always including me. */
function pick(rows: RaceRow[], me: string, max: number) {
  const s = [...rows].sort((a, b) => b.now - a.now || a.name.localeCompare(b.name));
  const top = s.slice(0, max);
  const mine = s.find((r) => r.id === me);
  if (mine && !top.includes(mine)) top[top.length - 1] = mine;
  return top;
}

const fillOf = (v: number, max: number) => (v <= 0 ? 0 : Math.min(4, 1 + Math.floor((v / max) * 3.999)));

/** "Ist das koscher?": a gold sack for every player; coins rain into the sacks of everyone who got it right. */
export function GoldRace({ rows, me, finish, animate }: { rows: RaceRow[]; me: string; finish: number; animate: boolean }) {
  const t = useT();
  const art = useKtArt();
  const list = pick(rows, me, 10);
  return (
    <div className="mpr-vault" aria-label={t("Goldsäcke aller Spieler", "Everyone’s gold sacks")}>
      {list.map((r, k) => {
        const v = animate ? r.now : r.now;
        const gain = r.now - r.prev;
        return (
          <div key={r.id} className={`mpr-sackbox${r.id === me ? " me" : ""}${animate && r.missed ? " miss" : ""}`}>
            <div
              className={`mpr-sack${animate && gain > 0 ? " bump" : ""}`}
              data-fill={fillOf(v, finish)}
              style={{ ["--s" as string]: (0.72 + 0.4 * Math.min(1, v / finish)).toFixed(3), ["--d" as string]: `${0.15 + k * 0.08}s` }}
              dangerouslySetInnerHTML={{ __html: art?.sack ?? "" }}
            />
            {animate &&
              gain > 0 &&
              Array.from({ length: Math.min(5, Math.round(gain / 10) + 1) }, (_, j) => (
                <i key={j} className="mpr-coin" style={{ left: `${30 + ((j * 23) % 40)}%`, animationDelay: `${0.1 + k * 0.08 + j * 0.11}s` }} aria-hidden="true" />
              ))}
            <span className="mpr-gold">
              <i className="mpr-coinicon" aria-hidden="true" />
              {animate ? <Count from={r.prev} to={r.now} delay={250 + k * 80} /> : r.now}
            </span>
            {animate && gain > 0 && <span className="mpr-plus">+{gain}</span>}
            <span className="mpr-name">{r.id === me ? t("Du", "You") : r.name}</span>
          </div>
        );
      })}
    </div>
  );
}

/** "Ist das halal?": a lane per player; every car drives its km, wrong answers stall. */
export function CarRace({ rows, me, finish, animate }: { rows: RaceRow[]; me: string; finish: number; animate: boolean }) {
  const t = useT();
  const art = useKtArt();
  const list = pick(rows, me, 8);
  const [go, setGo] = useState(!animate);
  const ref = useRef(false);
  useEffect(() => {
    if (!animate || ref.current) return;
    ref.current = true;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)));
    return () => cancelAnimationFrame(id);
  }, [animate]);
  return (
    <div className="mpr-track" aria-label={t("Rennen aller Spieler", "Everyone’s race")}>
      <div className="mpr-finish" aria-hidden="true" />
      {list.map((r, k) => {
        const km = go ? r.now : r.prev;
        const moving = animate && r.now > r.prev;
        return (
          <div key={r.id} className={`mpr-lane${r.id === me ? " me" : ""}`}>
            <span className="mpr-lname">{r.id === me ? t("Du", "You") : r.name}</span>
            <div className="mpr-road">
              <div
                className={`mpr-car${moving ? " moving" : ""}${animate && r.missed ? " stall" : ""}`}
                style={{ left: `calc(${Math.min(1, km / finish).toFixed(4)} * (100% - 74px))`, transitionDelay: `${k * 0.07}s` }}
              >
                <span dangerouslySetInnerHTML={{ __html: art?.car ?? "" }} />
                {moving && <i className="mpr-dust" aria-hidden="true" />}
                {animate && r.missed && <i className="mpr-puff" aria-hidden="true" />}
              </div>
            </div>
            <span className="mpr-km">
              {animate ? <Count from={r.prev} to={r.now} ms={1300} delay={k * 70} /> : r.now}
              <small> km</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
