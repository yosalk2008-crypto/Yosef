"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dayNumber, msUntilNextDay } from "@/lib/daily";
import { useDaily } from "@/lib/useDaily";
import { MAX_PTS, ROUNDS, SECONDS, check, dailyQuestions, emojiFor, meters, randomQuestions, tierOf, type Question } from "@/lib/tiefgang";
import { AnswerExplorer } from "./AnswerExplorer";
import { Creature } from "./Creatures";

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
  const [phase, setPhase] = useState<"intro" | "question" | "reveal" | "done">("intro");
  const [left, setLeft] = useState(SECONDS);
  const [input, setInput] = useState("");
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
    setResults(r);
    if (r.length >= ROUNDS) setPhase("done");
    else if (r.length > 0) setPhase("intro");
  }, [mode, daily.loaded, daily.saved]);

  const i = results.length;
  const q = questions[Math.min(phase === "reveal" ? i - 1 : i, ROUNDS - 1)];
  const totalPts = results.reduce((s, r) => s + r.pts, 0);
  const totalM = meters(totalPts);

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

  const start = () => {
    setInput("");
    deadline.current = Date.now() + SECONDS * 1000;
    setLeft(SECONDS);
    setPhase("question");
    save(results, results.length);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const finish = useCallback(
    (text: string, timedOut = false) => {
      const quest = questions[results.length];
      let r: Result;
      if (timedOut) r = { input: text, pts: 0, reason: "Die Zeit ist abgelaufen." };
      else {
        const v = check(quest, text);
        r = v.ok ? { input: text, pts: v.answer.pts, answer: v.answer.name, id: v.answer.id, perle: v.answer.perle } : { input: text, pts: 0, reason: v.reason };
      }
      const next = [...results, r];
      setResults(next);
      setPhase("reveal");
      save(next);
    },
    [questions, results, save]
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
    setSeed((x) => x + 1);
    setResults([]);
    setPhase("intro");
  };

  const depthF = totalM / MAX_M;
  const bgTop = oceanAt(depthF * 0.9);
  const bgBottom = oceanAt(Math.min(1, depthF + 0.25));
  const dark = true;
  const last = phase === "reveal" ? results[results.length - 1] : null;
  const shownQ = phase === "reveal" ? questions[results.length - 1] : questions[i];

  if (mode === "daily" && !daily.loaded) return <div className="min-h-[80vh] animate-pulse" style={{ background: oceanAt(0.05) }} />;

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden transition-[background] duration-1000" style={{ background: `linear-gradient(180deg, ${bgTop}, ${bgBottom})` }}>
      <Bubbles />
      <div className={`relative mx-auto flex max-w-5xl gap-6 px-4 pb-16 pt-6 sm:pt-10 ${dark ? "text-white" : "text-ink"}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">Tiefgang{mode === "daily" ? ` #${dayNumber(daily.day)}` : " – Endlos"}</h1>
              <p className={`font-semibold ${dark ? "text-white/75" : "text-ink/70"}`}>Je seltener deine richtige Antwort, desto tiefer tauchst du.</p>
            </div>
            <div className="flex gap-2">
              <Link href={mode === "daily" ? "/tiefgang/endlos" : "/tiefgang"} className="rounded-2xl bg-white/15 px-4 py-2.5 font-display font-semibold backdrop-blur hover:bg-white/25">
                {mode === "daily" ? "Endlos-Modus" : "Tagesrunde"}
              </Link>
            </div>
          </div>

          {/* mobile depth bar */}
          <div className="mt-5 md:hidden">
            <div className="flex items-baseline justify-between font-display font-semibold">
              <span>Tiefe</span>
              <span className="text-2xl tabular-nums">{nf.format(totalM)} m</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-[#7fe3d2] transition-all duration-700" style={{ width: `${depthF * 100}%` }} />
            </div>
          </div>

          <div className="mt-6">
            {phase === "intro" && (
              <div className="pop rounded-[28px] bg-white/95 p-6 text-ink shadow-[0_6px_0_rgb(0_0_0_/_0.2)] sm:p-8">
                {results.length === 0 ? (
                  <>
                    <h2 className="text-2xl font-semibold sm:text-3xl">So funktioniert&apos;s</h2>
                    <ul className="mt-4 space-y-2 text-[17px] leading-relaxed text-ink/85">
                      <li>Du bekommst {ROUNDS} Fragen und hast pro Frage {SECONDS} Sekunden für eine Antwort.</li>
                      <li>Jede richtige Antwort bringt 10 bis 100 Punkte. Bekannte Antworten bringen wenig, seltene viel.</li>
                      <li>Ein Punkt sind 10 Meter Tauchtiefe – maximal {nf.format(MAX_M)} m.</li>
                      <li>Jede Antwort landet in einer Stufe: Plankton, Schwarm, Selten oder Tiefsee. Die eine seltenste Antwort jeder Frage ist die <strong>Tiefseeperle</strong> – es gibt pro Frage nur eine.</li>
                      <li>Falsche Antworten oder abgelaufene Zeit bringen 0 Meter. Kleine Tippfehler verzeihen wir.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold">Frage {i + 1} von {ROUNDS}</h2>
                    <p className="mt-2 text-ink/80">Bisher {nf.format(totalM)} m. Bereit für den nächsten Tauchgang?</p>
                  </>
                )}
                <button type="button" onClick={start} className="btn-primary mt-6 w-full bg-[#0f4c8a] text-lg shadow-[0_4px_0_#08294b] hover:bg-[#13599f] sm:w-auto sm:px-10">
                  {results.length === 0 ? "Abtauchen" : "Weiter tauchen"}
                </button>
              </div>
            )}

            {phase === "question" && shownQ && (
              <div className="pop rounded-[28px] bg-white/95 p-5 text-ink shadow-[0_6px_0_rgb(0_0_0_/_0.25)] sm:p-7" key={i}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display font-semibold text-ink/60">
                      Frage {i + 1} von {ROUNDS}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold leading-snug sm:text-[28px]">{shownQ.text}</h2>
                    <p className="mt-1 text-sm font-semibold text-ink/60">{shownQ.hint}</p>
                  </div>
                  <Timer left={left} />
                </div>
                <form
                  className="mt-5 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (input.trim()) finish(input);
                  }}
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="input flex-1"
                    placeholder="Deine seltene Antwort …"
                    aria-label="Antwort"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button type="submit" className="btn-primary bg-[#0f4c8a] shadow-[0_4px_0_#08294b] hover:bg-[#13599f]" disabled={!input.trim()}>
                    Antworten
                  </button>
                </form>
              </div>
            )}

            {phase === "reveal" && last && shownQ && (
              <div className="pop rounded-[28px] bg-white/95 p-5 text-ink shadow-[0_6px_0_rgb(0_0_0_/_0.25)] sm:p-7">
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

            {phase === "done" && <Done results={results} questions={questions} mode={mode} share={daily.saved?.share} onRestart={restart} totalM={totalM} />}
          </div>
        </div>
        <DepthGauge meters={totalM} />
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

function DepthGauge({ meters: m }: { meters: number }) {
  const f = m / MAX_M;
  const ticks = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000];
  return (
    <aside className="sticky top-24 hidden h-[70vh] w-24 shrink-0 md:block" aria-label={`Tauchtiefe ${nf.format(m)} Meter`}>
      <div className="relative h-full">
        <div className="absolute bottom-0 left-9 top-0 w-2 rounded-full bg-white/25" />
        <div className="absolute left-9 top-0 w-2 rounded-full bg-[#7fe3d2] transition-all duration-700" style={{ height: `${f * 100}%` }} />
        {ticks.map((t) => (
          <div key={t} className="absolute left-0 flex -translate-y-1/2 items-center gap-1 text-xs font-bold text-white/70" style={{ top: `${(t / MAX_M) * 100}%` }}>
            <span className="w-8 text-right tabular-nums">{t / 1000}k</span>
          </div>
        ))}
        <div className="absolute left-[22px] -translate-y-1/2 transition-all duration-700" style={{ top: `${f * 100}%` }}>
          <div className="flex items-center gap-1.5">
            <span className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-ink bg-[#f3d272] shadow-[0_3px_0_rgb(0_0_0_/_0.3)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#2c2a35" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="7" width="16" height="9" rx="4" />
                <path d="M9 16v3M15 16v3" />
              </svg>
            </span>
          </div>
          <p className="mt-1 whitespace-nowrap text-center font-display text-sm font-semibold text-white">{nf.format(m)} m</p>
        </div>
      </div>
    </aside>
  );
}

function Done({ results, questions, mode, share, onRestart, totalM }: { results: Result[]; questions: Question[]; mode: string; share?: string; onRestart: () => void; totalM: number }) {
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

function Bubbles() {
  const b = [
    [8, 14, 6],
    [18, 9, 9],
    [32, 18, 5],
    [55, 11, 7],
    [71, 16, 10],
    [84, 12, 6],
    [93, 20, 8],
  ];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <style>{`@keyframes rise{0%{transform:translateY(0);opacity:0}10%{opacity:.6}100%{transform:translateY(-110vh);opacity:0}}@media (prefers-reduced-motion: reduce){.bubble{animation:none!important;display:none}}`}</style>
      {b.map(([x, d, s], k) => (
        <span
          key={k}
          className="bubble absolute bottom-[-20px] rounded-full border-2 border-white/40"
          style={{ left: `${x}%`, width: s * 3, height: s * 3, animation: `rise ${d}s linear ${k * 1.7}s infinite` }}
        />
      ))}
    </div>
  );
}
