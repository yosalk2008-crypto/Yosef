"use client";

import { bestMatch, canon } from "@/lib/fuzzy";
import { Suggestion } from "../Suggestion";
import Link from "@/components/Link";
import { useEffect, useMemo, useRef, useState } from "react";
import { norm } from "@/lib/data/countries";
import { useShapes } from "@/lib/geo";
import { MapView } from "../MapView";
import { mapSetup, saveBest, useEntities, useQuizParams } from "./common";
import { useLang, useT } from "@/lib/i18n";
import { regionLabel } from "@/lib/data/regions";

export function NameAllQuiz() {
  const tt = useT();
  const lang = useLang();
  const params = useQuizParams();
  const all = useEntities(params.region);
  const shapes = useShapes(params.region.shapes);
  const [found, setFound] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"ready" | "running" | "over">("ready");
  const [left, setLeft] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const [sug, setSug] = useState<string | null>(null);
  const endAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [best, setBest] = useState<number | null>(null);

  const index = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of all) for (const n of [e.name, ...e.alt]) m.set(canon(n), e.id);
    return m;
  }, [all]);

  const total = all.length;
  const seconds = params.region.minutes * 60;

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) setPhase("over");
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "over") setBest(saveBest(`alle:${params.region.key}`, Math.round((found.length / Math.max(1, total)) * 100)).best);
  }, [phase, found.length, total, params.region.key]);

  useEffect(() => {
    if (phase === "running" && total > 0 && found.length === total) setPhase("over");
  }, [found.length, total, phase]);

  const start = () => {
    setFound([]);
    setText("");
    endAt.current = Date.now() + seconds * 1000;
    setLeft(seconds);
    setPhase("running");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fuzzyFind = (v: string) =>
    bestMatch(
      v,
      all.filter((e) => !found.includes(e.id)).map((e) => ({ item: e.id, names: [e.name, ...e.alt] }))
    );
  const accept = (id: string) => {
    if (pending.current) clearTimeout(pending.current);
    setSug(null);
    setFound((f) => (f.includes(id) ? f : [...f, id]));
    setLast(all.find((e) => e.id === id)!.name);
    setText("");
  };
  const onChange = (v: string) => {
    setText(v);
    if (pending.current) clearTimeout(pending.current);
    const key = canon(v);
    const id = index.get(key);
    if (!id || found.includes(id)) {
      // small typo ("Deutschlnad", "Kuwait" for "Kuwait-Stadt"): offer the right spelling
      const stillTyping = [...index.keys()].some((k) => k.length > key.length && k.startsWith(key));
      setSug(key.length >= 4 && !stillTyping ? fuzzyFind(v) : null);
      return;
    }
    setSug(null);
    // "Niger" vs "Nigeria", "Brasil" vs "Brasilien": wait briefly if a longer name could still follow
    const longer = [...index.keys()].some((k) => k.length > key.length && k.startsWith(key) && !found.includes(index.get(k)!));
    if (!longer) accept(id);
    else pending.current = setTimeout(() => accept(id), 1200);
  };
  const onEnter = () => {
    const id = index.get(canon(text)) ?? sug;
    if (id && !found.includes(id)) accept(id);
  };

  const setup = useMemo(() => mapSetup(params.region, all), [params.region, all]);
  const fill = (id: string) => (found.includes(id) ? "#16a34a" : phase === "over" ? "#dc2626" : "var(--color-land)");
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  if (!params.ready || !shapes || !all.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-10">
        <div className="aspect-video animate-pulse rounded-2xl bg-sea" />
      </div>
    );
  }
  const regionShapes = all.map((e) => shapes.byId[e.id]).filter(Boolean);
  const missing = all.filter((e) => !found.includes(e.id));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-10">
      <p className="text-sm font-semibold text-muted">
        <Link href="/quiz" className="hover:text-ink">
          {tt("Quizze", "Quizzes")}
        </Link>{" "}
        / {regionLabel(params.region, lang)}
      </p>
      <h1 className="text-2xl font-display font-semibold tracking-tight sm:text-3xl">{tt("Alle nennen", "Name them all")}</h1>

      <div className="sticky top-16 z-20 mt-4 rounded-2xl bg-ink p-3 text-white shadow-lg">
        <div className="flex items-center gap-3">
          {phase === "running" ? (
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onEnter();
                }
              }}
              placeholder={tt("Name eintippen …", "Type a name …")}
              className="input flex-1 border-transparent text-ink"
              aria-label={tt("Name eintippen", "Type a name")}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          ) : phase === "ready" ? (
            <button type="button" onClick={start} className="btn-primary flex-1 bg-teal-400 text-ink hover:bg-teal-300">
              {tt(`Start – ${params.region.minutes} Minuten`, `Start – ${params.region.minutes} minutes`)}
            </button>
          ) : (
            <button type="button" onClick={start} className="btn-primary flex-1 bg-teal-400 text-ink hover:bg-teal-300">
              {tt("Nochmal", "Again")}
            </button>
          )}
          <div className="text-right tabular-nums">
            <p className="text-xl font-display font-semibold leading-none">
              {found.length}/{total}
            </p>
            <p className={`text-sm ${left < 30 && phase === "running" ? "text-rose-300" : "text-slate-400"}`}>{phase === "ready" ? `${params.region.minutes}:00` : `${mm}:${ss}`}</p>
          </div>
        </div>
        {phase === "running" && (
          <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
            <span aria-live="polite">{last ? `✓ ${last}` : tt("Tipp einfach los – richtige Namen werden sofort erkannt.", "Just start typing – correct names are recognised instantly.")}</span>
            <button type="button" onClick={() => setPhase("over")} className="font-semibold text-white underline-offset-2 hover:underline">
              {tt("Aufgeben", "Give up")}
            </button>
          </div>
        )}
        {phase === "running" && sug && (
          <Suggestion
            dark
            name={all.find((e) => e.id === sug)!.name}
            hint={tt("oder Enter", "or press Enter")}
            onTake={() => {
              accept(sug);
              inputRef.current?.focus();
            }}
          />
        )}
      </div>

      <div className="mt-3">
        <MapView
          shapes={regionShapes}
          fit={setup.fitIds.map((id) => shapes.byId[id]).filter(Boolean)}
          projection={setup.projection}
          rotate={setup.rotate}
        fitBox={setup.fitBox}
          fill={fill}
          dots={() => true}
          aspect={params.region.shapes === "world" ? 1.6 : 1.4}
          label={`${tt("Karte", "Map")}: ${regionLabel(params.region, lang)}`}
        />
      </div>

      {phase === "over" && (
        <section className="card pop mt-6 p-6" aria-live="polite">
          <p className="text-sm font-semibold text-muted">{found.length === total ? tt("Alle gefunden!", "Found them all!") : tt("Zeit um", "Time’s up")}</p>
          <p className="mt-1 text-5xl font-display font-semibold tracking-tight">
            {found.length} / {total}
          </p>
          {best != null && <p className="mt-1 text-muted">{tt("Dein Rekord", "Your record")}: {best} %</p>}
          {missing.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold">{tt("Gefehlt haben", "Missed")} ({missing.length})</p>
              <p className="text-sm leading-relaxed text-muted">{missing.map((e) => e.name).join(" · ")}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
