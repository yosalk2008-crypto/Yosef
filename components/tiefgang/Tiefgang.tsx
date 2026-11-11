"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dayNumber, msUntilNextDay, utcDate } from "@/lib/daily";
import { useDaily } from "@/lib/useDaily";
import { LeaderboardJoin } from "../LeaderboardJoin";
import { Suggestion } from "../Suggestion";
import { MAX_PTS, ROUNDS, SECONDS, check, dailyQuestions, emojiFor, meters, randomQuestions, tierOf, type Question } from "@/lib/tiefgang";
import { AnswerExplorer } from "./AnswerExplorer";
import { Creature } from "./Creatures";
import { OceanScene } from "./OceanScene";
import type { Impact } from "./OceanFx";

type Result = { input: string; pts: number; answer?: string; id?: string; perle?: boolean; reason?: string };
type S = { results: Result[]; pending?: number };

const MAX_M = ROUNDS * MAX_PTS * 10;
const nf = new Intl.NumberFormat("de-DE");

/** Ocean colour for a depth fraction 0 (surface) … 1 (7.000 m). */
function oceanAt(f: number) {
  const stops: [number, [number, number, number]][] = [
    [0, [72, 158, 220]],
    [0.18, [44, 122, 196]],
    [0.45, [22, 82, 150]],
    [0.75, [10, 38, 86]],
    [1, [4, 12, 34]],
  ];
  const x = Math.min(1, Math.max(0, f));
  let i = 0;
  while (i < stops.length - 2 && x > stops[i + 1][0]) i++;
  const [a, ca] = stops[i];
  const [b, cb] = stops[i + 1];
  const t = (x - a) / (b - a);
  const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

export function Tiefgang({ mode }: { mode: "daily" | "endlos" }) {
  const daily = useDaily<S>("tiefgang");
  const [seed, setSeed] = useState(0);
  const questions = useMemo<Question[]>(
    () => (mode === "daily" ? dailyQuestions(daily.day) : randomQuestions(ROUNDS)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, daily.day, seed]
  );

  const [results, setResults] = useState<Result[]>([]);
  const [phase, setPhase] = useState<"intro" | "countdown" | "question" | "sinking" | "reveal" | "done">("intro");
  const [count, setCount] = useState(3);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [input, setInput] = useState("");
  const [sug, setSug] = useState<string | null>(null);
  const deadline = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restored = useRef(false);

  // restore daily progress; a question left open by reloading counts as missed
  useEffect(() => {
    if (mode !== "daily" || !daily.loaded || restored.current) return;
    restored.current = true;
    const s = daily.saved?.state;
    if (!s) return;
    const r = [...s.results];
    if (s.pending != null && s.pending === r.length) r.push({ input: "", pts: 0, reason: "Seite während der Frage verlassen." });
    jump.current = true;
    setResults(r);
    if (r.length >= ROUNDS) setPhase("done");
    else if (r.length > 0) setPhase("intro");
  }, [mode, daily.loaded, daily.saved]);

  const i = results.length;
  const q = questions[Math.min(phase === "reveal" ? i - 1 : i, ROUNDS - 1)];
  const totalPts = results.reduce((s, r) => s + r.pts, 0);
  const totalM = meters(totalPts);

  // camera depth: glides to the current total; while an answer sinks, the camera follows it
  const [cam, setCam] = useState(0);
  const camRef = useRef(0);
  const jump = useRef(true);
  useEffect(() => {
    const from = camRef.current;
    const to = totalM;
    if (jump.current && phase !== "sinking") {
      jump.current = false;
      camRef.current = to;
      setCam(to);
      return;
    }
    if (from === to) {
      if (phase === "sinking") setPhase("reveal");
      return;
    }
    const sinking = phase === "sinking";
    const dur = sinking ? Math.min(4800, 1400 + Math.abs(to - from) * 3.2) : 700;
    const t0 = performance.now();
    let raf = 0;
    const ease = (x: number) => (sinking ? 1 - Math.pow(1 - x, 2.4) : 1 - Math.pow(1 - x, 3));
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const v = from + (to - from) * ease(k);
      camRef.current = v;
      setCam(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else if (sinking) {
        const last = results[results.length - 1];
        setImpact({ at: Date.now(), kind: last ? (tierOf(last).key as Impact["kind"]) : "plankton" });
        setTimeout(() => setPhase("reveal"), 450);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalM, phase === "sinking"]);
  const sinkBase = phase === "sinking" && results.length ? totalM - meters(results[results.length - 1].pts) : totalM;

  const save = useCallback(
    (r: Result[], pending?: number) => {
      if (mode !== "daily") return;
      const pts = r.reduce((s, x) => s + x.pts, 0);
      const done = r.length >= ROUNDS;
      daily.persist({
        done,
        score: pts,
        max: ROUNDS * MAX_PTS,
        label: `${nf.format(meters(pts))} m`,
        share: `Tiefgang #${dayNumber(daily.day)} · ${nf.format(meters(pts))} m\n${r.map((x) => emojiFor(x.pts, x.perle)).join("")}${r.some((x) => x.perle) ? " – Tiefseeperle gefunden!" : ""}`,
        state: { results: r, pending },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, daily.day, daily.persist]
  );

  // "Die Uhr startet in 3 … 2 … 1", then the 25-second timer runs
  const start = () => {
    setInput("");
    setSug(null);
    setLeft(SECONDS);
    setCount(3);
    setPhase("countdown");
  };
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      deadline.current = Date.now() + SECONDS * 1000;
      setPhase("question");
      save(results, results.length);
      setTimeout(() => inputRef.current?.focus(), 30);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  const finish = useCallback(
    (text: string, timedOut = false) => {
      const quest = questions[results.length];
      let r: Result;
      if (timedOut) r = { input: text, pts: 0, reason: "Die Zeit ist abgelaufen." };
      else {
        const v = check(quest, text, sug != null);
        if (!v.ok && v.suggest) {
          setSug(v.suggest);
          return;
        }
        r = v.ok ? { input: text, pts: v.answer.pts, answer: v.answer.name, id: v.answer.id, perle: v.answer.perle } : { input: text, pts: 0, reason: v.reason };
      }
      const next = [...results, r];
      setResults(next);
      setPhase(r.pts > 0 ? "sinking" : "reveal");
      if (r.pts <= 0) setImpact({ at: Date.now(), kind: "miss" });
      save(next);
    },
    [questions, results, save, sug]
  );

  useEffect(() => {
    if (phase !== "question") return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) {
        clearInterval(id);
        finish(inputRef.current?.value ?? "", true);
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, finish]);

  const restart = () => {
    jump.current = true;
    setSeed((x) => x + 1);
    setResults([]);
    setPhase("intro");
  };

  const last = phase === "reveal" ? results[results.length - 1] : null;
  const shownQ = phase === "reveal" ? questions[results.length - 1] : questions[i];

  if (mode === "daily" && !daily.loaded) return <div className="h-[calc(100dvh-64px)] animate-pulse" style={{ background: oceanAt(0.05) }} />;

  const sinkingAnswer = phase === "sinking" ? results[results.length - 1] : null;

  return (
    <div className="relative h-[calc(100dvh-64px)] min-h-[560px] overflow-hidden text-white sm:h-[calc(100dvh-72px)]">
      <OceanScene cam={cam} results={results} questions={questions} sinking={sinkingAnswer} base={sinkBase} impact={impact} />
      {phase === "countdown" && count > 0 && (
        <div key={count} className="countdown-num pointer-events-none absolute inset-x-0 top-[22%] z-30 text-center font-display text-[120px] font-semibold leading-none text-white drop-shadow-[0_6px_0_rgb(0_0_0_/_0.35)]" aria-hidden="true">
          {count}
        </div>
      )}
      <style>{`@keyframes cd { 0% { transform: scale(1.8); opacity: 0 } 25% { transform: scale(1); opacity: 1 } 80% { opacity: 1 } 100% { transform: scale(.7); opacity: 0 } } .countdown-num { animation: cd .9s ease-out forwards } @media (prefers-reduced-motion: reduce) { .countdown-num { animation: none } }`}</style>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-[#051a3a]/70 to-transparent px-4 pb-6 pt-3">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-white/70">Tiefe</p>
            <p className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{nf.format(Math.round(cam))} m</p>
          </div>
          <div className="pt-1 text-center">
            <p className="font-display text-sm font-semibold">
              Tiefgang{mode === "daily" ? ` #${dayNumber(daily.day)}` : " – Endlos"}
            </p>
            <div className="mt-1 flex justify-center gap-1" aria-label={`Frage ${Math.min(i + 1, ROUNDS)} von ${ROUNDS}`}>
              {Array.from({ length: ROUNDS }).map((_, k) => {
                const r = results[k];
                const c = r ? (r.pts > 0 ? tierOf(r).color : "#d6453d") : k === i ? "#ffffff" : "rgb(255 255 255 / 0.25)";
                return <span key={k} className="h-2.5 w-4 rounded-sm" style={{ background: c }} />;
              })}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white/70">Punkte</p>
            <p className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{Math.round(cam / 10)}</p>
          </div>
        </div>
      </div>
      <div className="absolute right-3 top-20 z-30">
        <Link href={mode === "daily" ? "/tiefgang/endlos" : "/tiefgang"} className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-bold backdrop-blur hover:bg-white/25">
          {mode === "daily" ? "Endlos" : "Tagesrunde"}
        </Link>
      </div>

      {/* foreground panels */}
      <div className="absolute inset-x-0 bottom-0 top-24 z-20 overflow-y-auto px-4 pb-6">
        <div className="mx-auto flex min-h-full max-w-xl flex-col justify-end">
          {phase === "intro" && (
            <div className="pop mb-2 rounded-[28px] bg-[#082650]/85 p-6 shadow-[0_6px_0_rgb(0_0_0_/_0.3)] backdrop-blur-sm sm:p-7">
              {results.length === 0 ? (
                <>
                  <h1 className="text-3xl font-semibold">Tiefgang</h1>
                  <p className="mt-1 text-lg font-semibold text-white/85">Je seltener deine richtige Antwort, desto tiefer sinkt sie.</p>
                  <ul className="mt-4 space-y-1.5 text-[15px] leading-relaxed text-white/85">
                    <li>{ROUNDS} Fragen, je {SECONDS} Sekunden, eine Antwort pro Frage.</li>
                    <li>Bekannte Antworten bringen 10 Punkte, seltene bis zu 100. 1 Punkt = 10 Meter.</li>
                    <li>Stufen: Plankton, Schwarm, Selten, Tiefsee – und pro Frage genau eine <strong>Tiefseeperle</strong>, die seltenste Antwort.</li>
                    <li>Falsch oder zu spät = 0 Meter. Kleine Tippfehler verzeihen wir.</li>
                  </ul>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold">Frage {i + 1} von {ROUNDS}</h2>
                  <p className="mt-1 text-white/80">Du bist bei {nf.format(totalM)} m. Bereit für den nächsten Tauchgang?</p>
                </>
              )}
              <button type="button" onClick={start} className="btn-primary mt-5 w-full bg-[#f3d272] text-lg text-ink shadow-[0_4px_0_#b8962f] hover:bg-[#f7dc8a]">
                {results.length === 0 ? "Abtauchen ▼" : "Weiter tauchen ▼"}
              </button>
            </div>
          )}

          {(phase === "countdown" || phase === "question") && shownQ && (
            <div className="pop mb-2" key={"q" + i}>
              <div className="rounded-[28px] bg-[#082650]/85 p-5 shadow-[0_6px_0_rgb(0_0_0_/_0.3)] backdrop-blur-sm sm:p-6">
                <p className="text-sm font-bold text-[#7fe3d2]">
                  Frage {i + 1} von {ROUNDS}
                </p>
                <h2 className="mt-1 text-[26px] font-semibold leading-snug sm:text-3xl">{shownQ.text}</h2>
                <p className="mt-1 text-sm font-semibold text-white/65">{shownQ.hint} Seltenere Antworten sinken tiefer.</p>
              </div>
              {phase === "countdown" ? (
                <p className="mt-4 text-center font-display text-lg font-semibold text-white/85" aria-live="polite">
                  Abtauchen – die Uhr startet in {Math.max(1, count)} …
                </p>
              ) : (
                <form
                  className="mt-3 flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Enter while "Meintest du …?" is shown takes the suggestion, like in the other games
                    if (sug) {
                      setInput(sug);
                      finish(sug);
                    } else if (input.trim()) finish(input);
                  }}
                >
                  <Timer left={left} />
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setSug(null);
                    }}
                    className="input min-w-0 flex-1 text-ink"
                    placeholder="Eine Antwort …"
                    aria-label="Antwort"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button type="submit" className="btn-primary shrink-0 bg-[#f3d272] px-4 text-ink shadow-[0_4px_0_#b8962f] hover:bg-[#f7dc8a]" disabled={!input.trim()}>
                    Tauchen
                  </button>
                </form>
              )}
              {phase === "question" && sug && (
                <Suggestion
                  dark
                  name={sug}
                  hint="oder Enter"
                  onTake={() => {
                    setInput(sug);
                    setSug(null);
                    inputRef.current?.focus();
                  }}
                />
              )}
            </div>
          )}

            {phase === "reveal" && last && shownQ && (
              <div className={`pop mb-2 rounded-[28px] bg-white/95 p-5 text-ink shadow-[0_6px_0_rgb(0_0_0_/_0.3)] sm:p-6 ${last.perle ? "ring-4 ring-[#f3d272] shadow-[0_0_60px_rgb(243_210_114_/_0.8)]" : ""}`}>
                <p className="font-display font-semibold text-ink/60">{shownQ.text}</p>
                {last.pts > 0 ? (
                  <div className="mt-3 flex items-center gap-4">
                    <Creature tier={tierOf(last).key} className={`shrink-0 ${last.perle ? "h-24 w-24" : "h-20 w-20"}`} />
                    <div>
                      <p className="inline-block rounded-full px-3 py-1 font-display text-lg font-semibold" style={{ background: tierOf(last).color }}>
                        {tierOf(last).name}
                      </p>
                      <p className="mt-1 font-display text-4xl font-semibold text-[#0f4c8a] sm:text-5xl">+{nf.format(meters(last.pts))} m</p>
                      <p className="text-lg font-semibold">
                        {last.answer} – {last.pts} von {MAX_PTS} Punkten
                      </p>
                      <p className="text-sm text-ink/70">{tierOf(last).desc}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-4">
                    <Creature tier="none" className="h-16 w-16 shrink-0" />
                    <div>
                      <p className="font-display text-4xl font-semibold text-bad">0 m</p>
                      <p className="text-lg font-semibold">{last.reason}</p>
                    </div>
                  </div>
                )}
                <details className="mt-4 rounded-2xl bg-paper p-3">
                  <summary className="cursor-pointer font-display font-semibold">Alle {shownQ.answers.length} gültigen Antworten ansehen</summary>
                  <div className="mt-3">
                    <AnswerExplorer q={shownQ} mine={last.id} />
                  </div>
                </details>
                <button type="button" onClick={() => (results.length >= ROUNDS ? setPhase("done") : start())} className="btn-primary mt-5 w-full bg-[#0f4c8a] shadow-[0_4px_0_#08294b] hover:bg-[#13599f] sm:w-auto sm:px-8" autoFocus>
                  {results.length >= ROUNDS ? "Ergebnis ansehen" : "Nächste Frage"}
                </button>
              </div>
            )}

            {phase === "done" && <Done results={results} questions={questions} mode={mode} isToday={daily.isToday} share={daily.saved?.share} onRestart={restart} totalM={totalM} />}
        </div>
      </div>
    </div>
  );
}

function Timer({ left }: { left: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const danger = left <= 5;
  return (
    <div className={`relative h-16 w-16 shrink-0 ${danger ? "animate-pulse" : ""}`} role="timer" aria-label={`${left} Sekunden übrig`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e6dfd5" strokeWidth="7" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={danger ? "#d6453d" : "#0f4c8a"} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / SECONDS)} style={{ transition: "stroke-dashoffset 0.2s linear" }} />
      </svg>
      <span className={`absolute inset-0 grid place-items-center font-display text-xl font-semibold ${danger ? "text-bad" : "text-ink"}`}>{left}</span>
    </div>
  );
}

function Done({ results, questions, mode, isToday, share, onRestart, totalM }: { results: Result[]; questions: Question[]; mode: string; isToday: boolean; share?: string; onRestart: () => void; totalM: number }) {
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = msUntilNextDay();
      setLeft(`${Math.floor(ms / 3600000)}:${String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  const text = share || `Tiefgang · ${nf.format(totalM)} m\n${results.map((r) => emojiFor(r.pts, r.perle)).join("")}`;
  const copy = async () => {
    try {
      const t = text + "\nfirmengrafik.de/tiefgang";
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) await navigator.share({ text: t });
      else await navigator.clipboard.writeText(t);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="pop rounded-[28px] bg-white/95 p-5 text-ink shadow-[0_6px_0_rgb(0_0_0_/_0.3)] sm:p-7">
      <p className="font-display text-lg font-semibold text-ink/60">Deine Tauchtiefe</p>
      <p className="font-display text-6xl font-semibold text-[#0f4c8a]">{nf.format(totalM)} m</p>
      {results.some((r) => r.perle) && (
        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#f3d272] px-3 py-1.5 font-display font-semibold">
          <Creature tier="perle" className="h-7 w-7" /> Du hast eine Tiefseeperle gefunden!
        </p>
      )}
      <DiveLog results={results} />
      <ul className="mt-5 space-y-2">
        {results.map((r, k) => {
          const t = r.pts > 0 ? tierOf(r) : null;
          return (
            <li key={k} className="rounded-2xl bg-paper px-3 py-2.5">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Creature tier={t ? t.key : "none"} className="h-9 w-9 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm text-ink/60">{questions[k]?.text}</span>
                      <span className="font-semibold">{r.answer || (r.input ? `„${r.input}“` : "keine Antwort")}</span>
                      {t && <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: t.color }}>{t.name}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-lg font-semibold tabular-nums">{nf.format(meters(r.pts))} m</span>
                </summary>
                {questions[k] && (
                  <div className="mt-3 rounded-2xl bg-white p-3">
                    <AnswerExplorer q={questions[k]} mine={r.id} />
                  </div>
                )}
              </details>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-ink/60">Tippe auf eine Frage, um alle gültigen Antworten und die Tiefseeperle zu sehen.</p>
      <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-paper p-3 font-sans text-sm font-semibold">{text}</pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-primary bg-[#0f4c8a] shadow-[0_4px_0_#08294b] hover:bg-[#13599f]">
          {copied ? "Kopiert ✓" : "Ergebnis teilen"}
        </button>
        {mode === "daily" ? (
          <Link href="/tiefgang/endlos" className="btn-ghost">
            Endlos weiterspielen
          </Link>
        ) : (
          <button type="button" onClick={onRestart} className="btn-ghost">
            Neue Runde
          </button>
        )}
        <Link href="/" className="btn-ghost">
          Zur Startseite
        </Link>
      </div>
      {mode === "daily" && <p className="mt-4 text-sm text-ink/60">Neue Fragen in {left} Stunden.</p>}
      {mode === "daily" && <LeaderboardJoin day={utcDate()} game="tiefgang" isToday={isToday} />}
    </div>
  );
}

/** Seven dives as vertical lines, each sinking to the depth reached. */
function DiveLog({ results }: { results: Result[] }) {
  const H = 150;
  return (
    <div className="mt-5 rounded-2xl bg-[#0b2a55] p-4 text-white">
      <p className="font-display font-semibold">Tauch-Logbuch</p>
      <svg viewBox={`0 0 ${ROUNDS * 40 + 44} ${H + 30}`} className="mt-2 w-full" role="img" aria-label="Tiefe je Frage">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1="0" x2={ROUNDS * 40} y1={10 + f * H} y2={10 + f * H} stroke="rgb(255 255 255 / 0.15)" strokeDasharray="3 4" />
            <text x={ROUNDS * 40 + 42} y={13 + f * H} textAnchor="end" fontSize="9" fill="rgb(255 255 255 / 0.6)">
              {f * 1000} m
            </text>
          </g>
        ))}
        {Array.from({ length: ROUNDS }).map((_, k) => {
          const r = results[k];
          const y = 10 + ((r?.pts ?? 0) / MAX_PTS) * H;
          const x = 20 + k * 40;
          const c = r && r.pts > 0 ? tierOf(r).color : "#94a3b8";
          return (
            <g key={k}>
              <line x1={x} x2={x} y1={10} y2={y} stroke={c} strokeWidth="3" strokeLinecap="round" />
              <circle cx={x} cy={y} r={r?.perle ? 8 : 6} fill={c} stroke="#fff" strokeWidth="2" />
              <text x={x} y={H + 26} textAnchor="middle" fontSize="10" fill="rgb(255 255 255 / 0.75)">
                {k + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export { oceanAt };
