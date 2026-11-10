"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flagUrl, norm } from "@/lib/data/countries";
import type { Entity } from "@/lib/data/regions";
import type { QuizType } from "@/lib/games";
import { useShapes } from "@/lib/geo";
import { randomRng } from "@/lib/rng";
import { ShapeOutline } from "../Shape";
import { QuizEnd, QuizHeader, questionCount, useEntities, useQuizParams } from "./common";

type Q = { e: Entity; options: Entity[] };

const TITLES: Record<string, string> = { flaggen: "Flaggen-Quiz", hauptstaedte: "Hauptstädte-Quiz", umrisse: "Umrisse-Quiz" };

export function ChoiceQuiz({ typ }: { typ: QuizType }) {
  const params = useQuizParams();
  const all = useEntities(params.region);
  const shapes = useShapes(params.region.shapes);
  const [seed, setSeed] = useState(0);

  const pool = useMemo(() => {
    if (typ === "flaggen") return all.filter((e) => e.iso2);
    if (typ === "hauptstaedte") return all.filter((e) => e.capital);
    return shapes ? all.filter((e) => shapes.byId[e.id]) : [];
  }, [all, typ, shapes]);

  const questions = useMemo<Q[]>(() => {
    if (!pool.length) return [];
    const rng = randomRng();
    const n = questionCount(params, pool.length);
    return rng.sample(pool, n).map((e) => {
      const others = rng.sample(
        pool.filter((o) => o.id !== e.id && (typ !== "hauptstaedte" || o.capital !== e.capital)),
        3
      );
      return { e, options: rng.shuffle([e, ...others]) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, seed, params.ready]);

  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState<{ text: string; ok: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<{ name: string; answer?: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restart = () => {
    setSeed((s) => s + 1);
    setI(0);
    setPicked(null);
    setTyped(null);
    setScore(0);
    setMissed([]);
  };

  const q = questions[i];
  const answered = picked != null || typed != null;
  const done = questions.length > 0 && i >= questions.length;

  const next = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPicked(null);
    setTyped(null);
    setI((x) => x + 1);
  }, []);

  const label = (e: Entity) => (typ === "hauptstaedte" ? e.capital! : e.name);
  const answerText = (e: Entity) => (typ === "hauptstaedte" ? `${e.capital}` : e.name);

  const record = (ok: boolean) => {
    if (ok) {
      setScore((s) => s + 1);
      timer.current = setTimeout(next, 750);
    } else setMissed((m) => [...m, { name: typ === "hauptstaedte" ? q.e.name : q.e.name, answer: typ === "hauptstaedte" ? q.e.capital! : undefined }]);
  };

  const choose = (id: string) => {
    if (answered || !q) return;
    setPicked(id);
    record(id === q.e.id);
  };

  const submitTyped = (text: string) => {
    if (answered || !q || !text.trim()) return;
    const ok = [q.e.capital!, ...q.e.capitalAlt].some((c) => norm(c) === norm(text));
    setTyped({ text, ok });
    record(ok);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement)?.tagName === "INPUT") return;
      if (!q) return;
      if (answered && (ev.key === "Enter" || ev.key === " ")) {
        ev.preventDefault();
        next();
      } else if (!answered && ["1", "2", "3", "4"].includes(ev.key) && !params.typing) choose(q.options[+ev.key - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!params.ready || !questions.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-10">
        <div className="h-80 animate-pulse rounded-2xl bg-line" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <QuizHeader title={TITLES[typ]} region={params.region} done={Math.min(i, questions.length)} total={questions.length} score={score} />
      {done ? (
        <QuizEnd bestKey={`${typ}:${params.region.key}:${params.n}:${params.typing ? "t" : "c"}`} score={score} total={questions.length} missed={missed} onRestart={restart} />
      ) : (
        <div key={i} className="pop">
          <div className="card grid min-h-[220px] place-items-center p-5 sm:min-h-[260px]">
            {typ === "flaggen" && q.e.iso2 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flagUrl(q.e.iso2)} alt="Gesuchte Flagge" className="max-h-52 w-auto max-w-full rounded-lg border border-line shadow-sm" />
            )}
            {typ === "umrisse" && shapes?.byId[q.e.id] && <ShapeOutline shape={shapes.byId[q.e.id]} fill="#0f766e" className="h-56 w-56" size={300} label="Gesuchter Umriss" />}
            {typ === "hauptstaedte" && (
              <p className="text-center text-2xl font-extrabold sm:text-3xl">
                <span className="mb-1 block text-sm font-semibold uppercase tracking-wider text-muted">Hauptstadt von</span>
                {q.e.name}
              </p>
            )}
          </div>

          {params.typing && typ === "hauptstaedte" ? (
            <TypeAnswer key={i} onSubmit={submitTyped} result={typed} correct={q.e.capital!} />
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, k) => {
                const isRight = o.id === q.e.id;
                const state = !answered ? "" : isRight ? "border-ok bg-green-50 text-green-900" : picked === o.id ? "border-bad bg-red-50 text-red-900" : "opacity-60";
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => choose(o.id)}
                    disabled={answered}
                    className={`flex min-h-[56px] items-center gap-3 rounded-xl border-2 border-line bg-white px-4 py-3 text-left font-semibold transition hover:border-ink disabled:hover:border-current ${state}`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-xs font-bold text-muted">{k + 1}</span>
                    {label(o)}
                  </button>
                );
              })}
            </div>
          )}

          {answered && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className={`font-bold ${picked === q.e.id || typed?.ok ? "text-ok" : "text-bad"}`} role="status">
                {picked === q.e.id || typed?.ok ? "Richtig!" : `Richtig wäre: ${answerText(q.e)}`}
              </p>
              <button type="button" onClick={next} className="btn-primary" autoFocus>
                Weiter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypeAnswer({ onSubmit, result, correct }: { onSubmit: (t: string) => void; result: { text: string; ok: boolean } | null; correct: string }) {
  const [t, setT] = useState("");
  void correct;
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(t);
      }}
    >
      <input
        value={t}
        onChange={(e) => setT(e.target.value)}
        disabled={!!result}
        autoFocus
        placeholder="Hauptstadt eintippen …"
        className={`input flex-1 ${result ? (result.ok ? "border-ok" : "border-bad") : ""}`}
        aria-label="Hauptstadt"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="btn-primary" disabled={!!result || !t.trim()}>
        Prüfen
      </button>
    </form>
  );
}
