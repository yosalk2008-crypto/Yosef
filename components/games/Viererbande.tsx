"use client";

import { useMemo, useState } from "react";
import { BY_ID, COUNTRIES, SUBREGION_DE, flagUrl, norm, type Country } from "@/lib/data/countries";
import { dayNumber } from "@/lib/daily";
import { useShapes } from "@/lib/geo";
import { makeRng, type Rng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { ShapeOutline } from "../Shape";

type Cat = { key: string; label: string; diff: number; test: (c: Country) => boolean };

function categories(): Cat[] {
  const cats: Cat[] = [];
  const subs = new Map<string, number>();
  for (const c of COUNTRIES) subs.set(c.sub, (subs.get(c.sub) || 0) + 1);
  for (const [sub, n] of subs) if (n >= 5 && SUBREGION_DE[sub]) cats.push({ key: "sub:" + sub, label: `Liegt in ${SUBREGION_DE[sub]}`, diff: 1, test: (c) => c.sub === sub });
  for (const x of COUNTRIES)
    if (x.borders.length >= 5) cats.push({ key: "nb:" + x.id, label: `Grenzt an ${x.n}`, diff: 2, test: (c) => c.borders.includes(x.id) });
  cats.push({ key: "landlocked", label: "Hat keinen Zugang zum Meer", diff: 2, test: (c) => c.landlocked });
  cats.push({ key: "island", label: "Hat keine Landgrenze", diff: 2, test: (c) => c.borders.length === 0 });
  for (const L of "ABCDKLMNPST")
    cats.push({ key: "cap:" + L, label: `Hauptstadt beginnt mit „${L}“`, diff: 3, test: (c) => !!c.cap && c.cap.toUpperCase().startsWith(L) });
  for (const L of "BGKMNS") cats.push({ key: "nm:" + L, label: `Name beginnt mit „${L}“`, diff: 2, test: (c) => c.n.toUpperCase().startsWith(L) });
  cats.push({ key: "stan", label: "Name endet auf „-stan“", diff: 1, test: (c) => c.n.endsWith("stan") });
  cats.push({ key: "land", label: "Name endet auf „-land“", diff: 2, test: (c) => c.n.endsWith("land") });
  cats.push({ key: "ien", label: "Name endet auf „-ien“", diff: 2, test: (c) => c.n.endsWith("ien") });
  cats.push({ key: "pop100", label: "Über 100 Mio. Einwohner", diff: 2, test: (c) => (c.pop ?? 0) > 1e8 });
  cats.push({ key: "pop1", label: "Unter 1 Mio. Einwohner", diff: 3, test: (c) => c.pop != null && c.pop < 1e6 });
  cats.push({ key: "rich", label: "BIP pro Kopf über 50.000 $", diff: 3, test: (c) => (c.gdppc ?? 0) > 50000 });
  cats.push({ key: "big", label: "Fläche über 2 Mio. km²", diff: 2, test: (c) => c.area > 2e6 });
  cats.push({ key: "forest", label: "Mehr als 60 % Wald", diff: 4, test: (c) => (c.forest ?? 0) > 60 });
  cats.push({ key: "flag2", label: "Flagge hat genau zwei Farben", diff: 4, test: (c) => c.flag.colors.length === 2 });
  cats.push({
    key: "capname",
    label: "Hauptstadt heißt (fast) wie das Land",
    diff: 3,
    test: (c) => !!c.cap && norm(c.cap).slice(0, 5) === norm(c.n).slice(0, 5),
  });
  return cats;
}

const CATS = categories();
const TILE_POOL = COUNTRIES.filter((c) => c.shape && (c.pop ?? 0) >= 300000);
const MODES = ["name", "flag", "shape", "capital"] as const;
type Mode = (typeof MODES)[number];
const COLORS = [
  { bg: "bg-yellow-300", text: "text-yellow-950", emoji: "🟨" },
  { bg: "bg-green-400", text: "text-green-950", emoji: "🟩" },
  { bg: "bg-sky-400", text: "text-sky-950", emoji: "🟦" },
  { bg: "bg-violet-400", text: "text-violet-950", emoji: "🟪" },
];

type Puzzle = { groups: { cat: Cat; ids: string[] }[]; tiles: { id: string; mode: Mode }[] };

function build(rng: Rng): Puzzle | null {
  const chosen: Cat[] = [];
  const types = new Set<string>();
  for (const c of rng.shuffle(CATS)) {
    const type = c.key.split(":")[0];
    if (types.has(type)) continue;
    chosen.push(c);
    types.add(type);
    if (chosen.length === 4) break;
  }
  const groups: Puzzle["groups"] = [];
  const used = new Set<string>();
  for (const cat of chosen) {
    const cand = TILE_POOL.filter((c) => !used.has(c.id) && cat.test(c) && chosen.every((o) => o === cat || !o.test(c)));
    if (cand.length < 4) return null;
    const ids = rng.sample(cand, 4).map((c) => c.id);
    ids.forEach((i) => used.add(i));
    groups.push({ cat, ids });
  }
  groups.sort((a, b) => a.cat.diff - b.cat.diff);
  const tiles = rng.shuffle(groups.flatMap((g) => g.ids)).map((id) => ({ id, mode: rng.pick(MODES) }));
  return { groups, tiles };
}

export function makePuzzle(day: string): Puzzle {
  const rng = makeRng(`${day}:viererbande`);
  for (let i = 0; i < 500; i++) {
    const p = build(rng);
    if (p) return p;
  }
  throw new Error("no puzzle");
}

const MAX_MISTAKES = 4;
type S = { guesses: string[][] };

export function Viererbande() {
  const { day, isToday, loaded, saved, persist } = useDaily<S>("viererbande");
  const puzzle = useMemo(() => makePuzzle(day), [day]);
  const shapes = useShapes("world");
  const [local, setLocal] = useState<string[][] | null>(null);
  const guesses = local ?? saved?.state?.guesses ?? [];
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);

  const groupOf = (id: string) => puzzle.groups.findIndex((g) => g.ids.includes(id));
  const isSolved = (gi: number) => guesses.some((gs) => gs.every((id) => groupOf(id) === gi));
  const solved = puzzle.groups.map((_, i) => i).filter(isSolved);
  const mistakes = guesses.filter((gs) => !gs.every((id) => groupOf(id) === groupOf(gs[0]))).length;
  const won = solved.length === 4;
  const over = won || mistakes >= MAX_MISTAKES;
  const tileIds = (order ?? puzzle.tiles.map((t) => t.id)).filter((id) => !solved.includes(groupOf(id)));
  const modeOf = (id: string) => puzzle.tiles.find((t) => t.id === id)!.mode;

  const toggle = (id: string) => {
    if (over) return;
    setMsg(null);
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s));
  };

  const check = () => {
    if (sel.length !== 4) return;
    const key = [...sel].sort().join();
    if (guesses.some((g) => [...g].sort().join() === key)) {
      setMsg("Diese Kombination hattest du schon.");
      return;
    }
    const next = [...guesses, sel];
    setLocal(next);
    const counts = puzzle.groups.map((g) => sel.filter((id) => g.ids.includes(id)).length);
    const best = Math.max(...counts);
    if (best === 4) {
      setMsg("Richtig!");
      setSel([]);
    } else {
      setMsg(best === 3 ? "Fast – eine Kachel ist falsch." : "Leider falsch.");
      setShake(true);
      setTimeout(() => setShake(false), 350);
    }
    const nSolved = puzzle.groups.filter((g, gi) => next.some((gs) => gs.every((id) => groupOf(id) === gi))).length;
    const nMistakes = next.filter((gs) => !gs.every((id) => groupOf(id) === groupOf(gs[0]))).length;
    const done = nSolved === 4 || nMistakes >= MAX_MISTAKES;
    const share =
      `Viererbande #${dayNumber(day)} · ${nSolved}/4${nSolved === 4 ? ` mit ${nMistakes} Fehler${nMistakes === 1 ? "" : "n"}` : ""}\n` +
      next.map((gs) => gs.map((id) => COLORS[groupOf(id)].emoji).join("")).join("\n");
    persist({
      done,
      won: nSolved === 4,
      score: nSolved,
      max: 4,
      label: nSolved === 4 ? `${nMistakes} Fehler` : `${nSolved}/4`,
      share,
      state: { guesses: next },
    });
  };

  const shuffle = () => setOrder(makeRng(Math.random() * 1e9).shuffle(tileIds));

  const shownGroups = over ? puzzle.groups.map((_, i) => i) : solved;

  return (
    <GameShell
      game="viererbande"
      day={day}
      isToday={isToday}
      rules={
        <>
          <p>
            Die 16 Kacheln zeigen Länder – mal als Name, mal als <strong>Flagge</strong>, <strong>Umriss</strong> oder <strong>Hauptstadt</strong>.
          </p>
          <p>Finde vier Gruppen aus je vier Ländern, die etwas gemeinsam haben. Wähle vier Kacheln und tippe auf „Prüfen“.</p>
          <p>Du darfst dir {MAX_MISTAKES} Fehler erlauben. Vorsicht: Manche Länder passen scheinbar in mehrere Gruppen.</p>
        </>
      }
    >
      {!loaded || !shapes ? (
        <div className="h-96 animate-pulse rounded-2xl bg-line" />
      ) : (
        <>
          <div className="space-y-2">
            {shownGroups.map((gi) => {
              const g = puzzle.groups[gi];
              const c = COLORS[gi];
              return (
                <div key={gi} className={`pop rounded-xl p-3 text-center ${c.bg} ${c.text}`}>
                  <p className="font-extrabold">{g.cat.label}</p>
                  <p className="text-sm font-medium">{g.ids.map((id) => BY_ID[id].n).join(" · ")}</p>
                </div>
              );
            })}
          </div>
          {!over && (
            <div className={`mt-2 grid grid-cols-4 gap-2 ${shake ? "shake" : ""}`}>
              {tileIds.map((id) => (
                <Tile key={id} id={id} mode={modeOf(id)} selected={sel.includes(id)} onClick={() => toggle(id)} shape={shapes.byId[id]} />
              ))}
            </div>
          )}
          {!over && (
            <>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted" aria-label={`Noch ${MAX_MISTAKES - mistakes} Fehler erlaubt`}>
                Fehler übrig:
                {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                  <span key={i} className={`h-3 w-3 rounded-full ${i < MAX_MISTAKES - mistakes ? "bg-ink" : "bg-line"}`} />
                ))}
              </div>
              <p className="mt-2 h-5 text-center text-sm font-semibold" role="status">
                {msg}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-ghost" onClick={shuffle}>
                  Mischen
                </button>
                <button type="button" className="btn-ghost" onClick={() => setSel([])} disabled={!sel.length}>
                  Auswahl aufheben
                </button>
                <button type="button" className="btn-primary" onClick={check} disabled={sel.length !== 4}>
                  Prüfen
                </button>
              </div>
            </>
          )}
          {over && (
            <ResultCard
              title={won ? "Alle Gruppen gefunden" : "Keine Fehler mehr übrig"}
              score={won ? `${mistakes} Fehler` : `${solved.length}/4 Gruppen`}
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

function Tile({ id, mode, selected, onClick, shape }: { id: string; mode: Mode; selected: boolean; onClick: () => void; shape?: import("@/lib/geo").Shape }) {
  const c = BY_ID[id];
  const base = `relative grid aspect-square place-items-center overflow-hidden rounded-xl border-2 p-1.5 text-center transition active:scale-95 sm:aspect-[4/3] ${
    selected ? "border-ink bg-ink text-white" : "border-transparent bg-white text-ink shadow-sm hover:border-line"
  }`;
  let content: React.ReactNode;
  let label = c.n;
  if (mode === "flag") {
    // eslint-disable-next-line @next/next/no-img-element
    content = <img src={flagUrl(c.iso2)} alt="" className={`max-h-[70%] w-[85%] object-contain ${selected ? "opacity-90" : ""}`} draggable={false} />;
    label = "Flagge";
  } else if (mode === "shape" && shape) {
    content = <ShapeOutline shape={shape} fill={selected ? "#ffffff" : "#334155"} className="h-[85%] w-[85%]" />;
    label = "Umriss";
  } else if (mode === "capital") {
    content = (
      <span>
        <span className={`block text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${selected ? "text-slate-300" : "text-muted"}`}>Hauptstadt</span>
        <span className="block text-[12px] font-bold leading-tight break-words [hyphens:auto] sm:text-sm">{c.cap}</span>
      </span>
    );
    label = `Hauptstadt ${c.cap}`;
  } else {
    content = <span className="text-[12px] font-bold leading-tight break-words [hyphens:auto] sm:text-sm">{c.n}</span>;
  }
  return (
    <button type="button" className={base} onClick={onClick} aria-pressed={selected} aria-label={mode === "name" || mode === "capital" ? label : `${label} (Kachel)`}>
      {content}
    </button>
  );
}
