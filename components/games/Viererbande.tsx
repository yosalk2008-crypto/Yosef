"use client";

import { useMemo, useState } from "react";
import { BY_ID, COUNTRIES, CONTINENTS, flagUrl, type Country } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { useShapes, type Shape } from "@/lib/geo";
import { fmtBig } from "@/lib/metrics";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { ShapeOutline } from "../Shape";
import { useLang, useT, type Lang } from "@/lib/i18n";
import { cCap, cName } from "@/lib/data/countries";

/**
 * Viererbande: four countries, each shown four ways – flag, outline, capital and one fact.
 * Find the four tiles that belong to the same country.
 */

type Kind = "flag" | "shape" | "cap" | "fact";
const KINDS: Kind[] = ["flag", "shape", "cap", "fact"];
type FactKey = "pop" | "gdppc" | "tour" | "area" | "life";

const nf = (d = 0, lang: Lang = "de") => new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: d });
function factText(c: Country, k: FactKey, lang: Lang = "de"): { label: string; value: string } {
  const en = lang === "en";
  switch (k) {
    case "pop":
      return { label: en ? "Population" : "Einwohner", value: fmtBig(c.pop!, "", lang) };
    case "gdppc":
      return en
        ? { label: "GDP per capita", value: "$" + nf(0, lang).format(Math.round(c.gdppc! / 100) * 100) }
        : { label: "BIP pro Kopf", value: nf().format(Math.round(c.gdppc! / 100) * 100) + " $" };
    case "tour":
      return { label: en ? "Tourists per year" : "Touristen pro Jahr", value: fmtBig(c.tour!, "", lang) };
    case "area":
      return { label: en ? "Area" : "Fläche", value: nf(0, lang).format(Math.round(c.area / 1000) * 1000) + " km²" };
    case "life":
      return { label: en ? "Life expectancy" : "Lebenserwartung", value: nf(1, lang).format(c.life!) + (en ? " years" : " Jahre") };
  }
}

const POOL = COUNTRIES.filter((c) => c.shape && c.cap && (c.pop ?? 0) >= 1000000 && c.gdppc != null);

type Group = { country: string; fact: FactKey };
type Puzzle = { groups: Group[]; tiles: string[] };

export function makePuzzle(day: string): Puzzle {
  const rng = makeRng(`${day}:viererbande`);
  // four countries from the same continent, so the tiles look alike
  let picks: Country[] = [];
  for (let i = 0; i < 50 && picks.length < 4; i++) {
    const cont = rng.pick(CONTINENTS);
    // the best-known countries of the continent (by population and economy)
    const fame = (c: Country) => Math.log10(c.pop ?? 1) + Math.log10(c.gdp ?? 1);
    const pool = POOL.filter((c) => c.cont === cont)
      .sort((a, b) => fame(b) - fame(a))
      .slice(0, 22);
    if (pool.length >= 6) picks = rng.sample(pool, 4);
  }
  if (picks.length < 4) picks = rng.sample(POOL, 4);
  // easiest (most populous) first: yellow, green, blue, purple
  picks.sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0));
  const groups = picks.map((c) => {
    const options: FactKey[] = ["pop", "gdppc", "area", ...(c.tour ? (["tour"] as FactKey[]) : []), ...(c.life ? (["life"] as FactKey[]) : [])];
    return { country: c.id, fact: rng.pick(options) };
  });
  const tiles = rng.shuffle(groups.flatMap((g) => KINDS.map((k) => `${g.country}:${k}`)));
  return { groups, tiles };
}

const COLORS = [
  { bg: "#f3d272", emoji: "🟨" },
  { bg: "#9fd06f", emoji: "🟩" },
  { bg: "#8ec5f0", emoji: "🟦" },
  { bg: "#c3aaf6", emoji: "🟪" },
];
const MAX_MISTAKES = 4;
type S = { guesses: string[][] };

export function Viererbande() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("viererbande");
  const lang = useLang();
  const t = useT();
  const puzzle = useMemo(() => makePuzzle(day), [day]);
  const shapes = useShapes("world");
  const [local, setLocal] = useState<string[][] | null>(null);
  // ignore progress saved by the old version of the game
  const stored = (saved?.state?.guesses ?? []).filter((g) => g.every((id) => id.includes(":")));
  const guesses = local ?? stored;
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);

  const groupOf = (tile: string) => puzzle.groups.findIndex((g) => tile.startsWith(g.country + ":"));
  const isRight = (gs: string[]) => gs.every((t) => groupOf(t) === groupOf(gs[0]));
  const solved = puzzle.groups.map((_, i) => i).filter((gi) => guesses.some((gs) => isRight(gs) && groupOf(gs[0]) === gi));
  const mistakes = guesses.filter((gs) => !isRight(gs)).length;
  const won = solved.length === 4;
  const over = won || mistakes >= MAX_MISTAKES;
  const tiles = (order ?? puzzle.tiles).filter((t) => !solved.includes(groupOf(t)));

  const toggle = (t: string) => {
    if (over) return;
    setMsg(null);
    setSel((s) => (s.includes(t) ? s.filter((x) => x !== t) : s.length < 4 ? [...s, t] : s));
  };

  const check = () => {
    if (sel.length !== 4) return;
    const key = [...sel].sort().join();
    if (guesses.some((g) => [...g].sort().join() === key)) {
      setMsg(t("Diese Kombination hattest du schon.", "You already tried that combination."));
      return;
    }
    const next = [...guesses, sel];
    setLocal(next);
    const best = Math.max(...puzzle.groups.map((_, gi) => sel.filter((t) => groupOf(t) === gi).length));
    if (best === 4) {
      setMsg(t(`Richtig – das ist ${BY_ID[puzzle.groups[groupOf(sel[0])].country].n}!`, `Correct – that’s ${BY_ID[puzzle.groups[groupOf(sel[0])].country].nEn}!`));
      setSel([]);
    } else {
      setMsg(best === 3 ? t("Fast – eine Kachel gehört zu einem anderen Land.", "Close – one tile belongs to another country.") : t("Leider falsch.", "Not quite."));
      setShake(true);
      setTimeout(() => setShake(false), 350);
    }
    const nSolved = puzzle.groups.filter((_, gi) => next.some((gs) => isRight(gs) && groupOf(gs[0]) === gi)).length;
    const nMistakes = next.filter((gs) => !isRight(gs)).length;
    persist({
      done: nSolved === 4 || nMistakes >= MAX_MISTAKES,
      won: nSolved === 4,
      score: nSolved,
      max: 4,
      label: nSolved === 4 ? t(`${nMistakes} Fehler`, `${nMistakes} ${nMistakes === 1 ? "mistake" : "mistakes"}`) : `${nSolved}/4`,
      share:
        (lang === "en"
          ? `Gang of Four #${dayNumber(day)} · ${nSolved}/4${nSolved === 4 ? ` with ${nMistakes} ${nMistakes === 1 ? "mistake" : "mistakes"}` : ""}\n`
          : `Viererbande #${dayNumber(day)} · ${nSolved}/4${nSolved === 4 ? ` mit ${nMistakes} Fehler${nMistakes === 1 ? "" : "n"}` : ""}\n`) +
        next.map((gs) => gs.map((t) => COLORS[groupOf(t)].emoji).join("")).join("\n"),
      state: { guesses: next },
    });
  };

  const shownGroups = over ? puzzle.groups.map((_, i) => i) : solved;

  return (
    <GameShell
      game="viererbande"
      day={day}
      isToday={isToday}
      rules={
        <>
          {lang === "en" ? (
            <>
              <p>
                Four countries are hidden in 16 tiles. Each country appears four times: as a <strong>flag</strong>, an <strong>outline</strong>, its{" "}
                <strong>capital</strong> and a <strong>fact</strong> such as population, GDP per capita or tourists.
              </p>
              <p>Pick the four tiles that belong to the same country and tap “Check”. All four countries are on the same continent.</p>
              <p>You can make {MAX_MISTAKES} mistakes.</p>
            </>
          ) : (
            <>
              <p>
                Vier Länder verstecken sich in 16 Kacheln. Jedes Land kommt viermal vor: als <strong>Flagge</strong>, als <strong>Umriss</strong>, mit seiner{" "}
                <strong>Hauptstadt</strong> und mit einem <strong>Fakt</strong> wie Einwohnerzahl, BIP pro Kopf oder Touristen.
              </p>
              <p>Wähle die vier Kacheln, die zum selben Land gehören, und tippe auf „Prüfen“. Alle vier Länder liegen auf demselben Kontinent.</p>
              <p>Du darfst dir {MAX_MISTAKES} Fehler erlauben.</p>
            </>
          )}
        </>
      }
    >
      {!loaded || !shapes ? (
        <div className="h-96 animate-pulse rounded-3xl bg-line" />
      ) : (
        <>
          <div className="space-y-2">
            {shownGroups.map((gi) => {
              const g = puzzle.groups[gi];
              const c = BY_ID[g.country];
              const f = factText(c, g.fact, lang);
              return (
                <div key={gi} className="pop flex items-center gap-3 rounded-2xl p-3" style={{ background: COLORS[gi].bg, boxShadow: "0 4px 0 rgb(0 0 0 / 0.12)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flagUrl(c.iso2)} alt="" className="h-9 w-auto rounded-md border-2 border-ink/80" />
                  <ShapeOutline shape={shapes.byId[c.id]} fill="#2c2a35" className="h-10 w-10 shrink-0" size={100} label={t(`Umriss von ${c.n}`, `Outline of ${c.nEn}`)} />
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold leading-tight">{cName(c, lang)}</p>
                    <p className="text-sm font-semibold text-ink/75">
                      {t("Hauptstadt", "Capital")} {cCap(c, lang)} – {f.label}: {f.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {!over && (
            <div className={`mt-2 grid grid-cols-4 gap-2 sm:gap-2.5 ${shake ? "shake" : ""}`}>
              {tiles.map((t) => (
                <Tile key={t} tile={t} fact={puzzle.groups[groupOf(t)].fact} selected={sel.includes(t)} onClick={() => toggle(t)} shape={shapes.byId[t.split(":")[0]]} lang={lang} />
              ))}
            </div>
          )}
          {!over && (
            <>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-muted" aria-label={t(`Noch ${MAX_MISTAKES - mistakes} Fehler erlaubt`, `${MAX_MISTAKES - mistakes} mistakes left`)}>
                {t("Fehler übrig:", "Mistakes left:")}
                {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                  <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < MAX_MISTAKES - mistakes ? "bg-ink" : "bg-line"}`} />
                ))}
              </div>
              <p className="mt-2 min-h-5 text-center text-sm font-bold" role="status">
                {msg}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOrder(makeRng(Math.random() * 1e9).shuffle(tiles))}>
                  {t("Mischen", "Shuffle")}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setSel([])} disabled={!sel.length}>
                  {t("Abwählen", "Deselect")}
                </button>
                <button type="button" className="btn-primary" onClick={check} disabled={sel.length !== 4}>
                  {t("Prüfen", "Check")}
                </button>
              </div>
            </>
          )}
          {over && (
            <ResultCard
              title={won ? t("Alle Länder gefunden", "All countries found") : t("Keine Fehler mehr übrig", "No mistakes left")}
              score={won ? t(`${mistakes} Fehler`, `${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}`) : t(`${solved.length}/4 Länder`, `${solved.length}/4 countries`)}
              share={saved?.share || ""}
              isToday={isToday}
              current="viererbande"
            />
          )}
        </>
      )}
    </GameShell>
  );
}

function Tile({ tile, fact, selected, onClick, shape, lang }: { tile: string; fact: FactKey; selected: boolean; onClick: () => void; shape?: Shape; lang: Lang }) {
  const en = lang === "en";
  const [id, kind] = tile.split(":") as [string, Kind];
  const c = BY_ID[id];
  let content: React.ReactNode;
  let label: string;
  if (kind === "flag") {
    // eslint-disable-next-line @next/next/no-img-element
    content = <img src={flagUrl(c.iso2)} alt="" className="max-h-[62%] w-[80%] rounded-md object-contain shadow-sm" draggable={false} />;
    label = en ? "Flag" : "Flagge";
  } else if (kind === "shape") {
    content = shape ? <ShapeOutline shape={shape} fill={selected ? "#ffffff" : "#2c2a35"} className="absolute inset-[8%] h-[84%] w-[84%]" size={120} pad={0.03} /> : null;
    label = en ? "Outline" : "Umriss";
  } else if (kind === "cap") {
    content = <span className="font-display text-[15px] font-bold leading-tight break-words [hyphens:auto] sm:text-xl">{cCap(c, lang)}</span>;
    label = `${en ? "Capital" : "Hauptstadt"} ${cCap(c, lang)}`;
  } else {
    const f = factText(c, fact, lang);
    content = (
      <span className="flex flex-col items-center justify-center leading-tight">
        <span className={`block text-[10px] font-bold sm:text-xs ${selected ? "text-white/75" : "text-muted"}`}>{f.label}</span>
        <span className="mt-0.5 block font-display text-[14px] font-bold sm:text-xl">{f.value}</span>
      </span>
    );
    label = `${f.label} ${f.value}`;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={`tile-btn relative flex aspect-square items-center justify-center p-1.5 text-center sm:aspect-[4/3] ${selected ? "tile-selected" : ""}`}
    >
      {content}
    </button>
  );
}
