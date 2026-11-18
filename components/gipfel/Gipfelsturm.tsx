"use client";

/**
 * Gipfelsturm – seven questions, seven camps up the mountain. Every answer counts only once per climb,
 * 25 seconds per question (the clock starts after 2 seconds of reading). Wrong answers never end the
 * climb, only the clock does. Daily climb (one try, saved) or endless climbs with a free choice of theme.
 */
import Link from "@/components/Link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dayNumber, msUntilNextDay } from "@/lib/daily";
import { useDaily } from "@/lib/useDaily";
import { useLang, useT } from "@/lib/i18n";
import { ResultCard } from "../GameShell";
import { dailyPuzzle, dailyTheme, entName, lookup, randomPuzzle, suggest, theme, type Puzzle, type ThemeKey } from "@/lib/gipfel";
import { GipfelScene, type Mood } from "./GipfelScene";

const READ_MS = 2000;
const ANSWER_MS = 25000;

type Saved = { used: string[]; qStart: number | null; over: boolean; giveUp?: boolean; secs?: number[] };
type Fb = { kind: "ok" | "used" | "wrong" | "type" | "unknown" | "maybe"; text: string; id?: string };

const THEME_NAME: Record<ThemeKey, [string, string]> = { laender: ["Länder", "Countries"], fussball: ["Fußball", "Football"] };
const THING: Record<ThemeKey, [string, string]> = { laender: ["ein Land", "a country"], fussball: ["ein Fußballer", "a footballer"] };

function logUnknown(theme: ThemeKey, s: string) {
  try {
    const k = "kt-gipfel-unbekannt";
    const a: string[] = JSON.parse(localStorage.getItem(k) || "[]");
    a.push(`${theme}:${s}`);
    localStorage.setItem(k, JSON.stringify(a.slice(-100)));
  } catch {}
}

export function Gipfelsturm({ mode }: { mode: "daily" | "endlos" }) {
  const lang = useLang();
  const t = useT();
  const daily = useDaily<Saved>("gipfelsturm");

  // endless options
  const [pick, setPick] = useState<ThemeKey>("laender");
  const [timed, setTimed] = useState(true);
  const [seed, setSeed] = useState("");
  useEffect(() => {
    if (mode !== "endlos") return;
    try {
      const o = JSON.parse(localStorage.getItem("kt-gipfel-opts") || "{}");
      if (o.theme === "laender" || o.theme === "fussball") setPick(o.theme);
      if (o.timed === false) setTimed(false);
    } catch {}
    setSeed(Math.random().toString(36).slice(2, 10));
  }, [mode]);
  useEffect(() => {
    if (mode === "endlos") try { localStorage.setItem("kt-gipfel-opts", JSON.stringify({ theme: pick, timed })); } catch {}
  }, [mode, pick, timed]);

  const puzzle: Puzzle | null = useMemo(() => {
    if (mode === "daily") return daily.loaded ? dailyPuzzle(daily.day) : null;
    return seed ? randomPuzzle(pick, seed) : null;
  }, [mode, daily.loaded, daily.day, pick, seed]);
  const tk = puzzle?.theme ?? (mode === "daily" ? dailyTheme(daily.day) : pick);
  const th = useMemo(() => theme(tk), [tk]);
  const fame = useCallback((id: string) => th.theme.byId.get(id)?.fame ?? 0, [th]);
  const nameOf = useCallback((id: string) => {
    const e = th.theme.byId.get(id);
    return e ? entName(e, lang) : id;
  }, [th, lang]);
  const isTimed = mode === "daily" || timed;

  const [phase, setPhase] = useState<"intro" | "play" | "over">("intro");
  const [used, setUsed] = useState<string[]>([]);
  const [secs, setSecs] = useState<number[]>([]);
  const [qStart, setQStart] = useState<number | null>(null);
  const [giveUp, setGiveUp] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [input, setInput] = useState("");
  const [fb, setFb] = useState<Fb | null>(null);
  const [sel, setSel] = useState(-1);
  const [focus, setFocus] = useState(false);
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const i = used.length;
  const won = i >= 7;

  // restore the daily climb (one try per day; the clock keeps running across a reload)
  useEffect(() => {
    if (mode !== "daily" || !daily.loaded || !puzzle) return;
    const s = daily.saved?.state;
    // a climb saved for another theme (until 18.11. football days) no longer fits the puzzle – start fresh
    if (!s || s.used.some((id) => !th.theme.byId.has(id))) return;
    setUsed(s.used);
    setSecs(s.secs ?? []);
    setGiveUp(!!s.giveUp);
    setQStart(s.qStart);
    if (s.over || s.used.length >= 7 || (s.qStart && Date.now() > s.qStart + READ_MS + ANSWER_MS)) setPhase("over");
    else if (s.qStart) setPhase("play");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, daily.loaded, puzzle]);

  const save = useCallback(
    (u: string[], qs: number | null, over: boolean, gu = false, sc: number[] = secs) => {
      if (mode !== "daily" || !puzzle) return;
      const n = u.length;
      const row = Array.from({ length: 7 }, (_, k) => (k < n ? "🟩" : k === n && n < 7 ? "🟥" : "⬜")).join("");
      daily.persist({
        done: over,
        won: n >= 7,
        score: n,
        max: 7,
        label: `${n}/7`,
        share: `${t("Gipfelsturm", "Summit Rush")} #${dayNumber(daily.day)} · ${THEME_NAME[puzzle.theme][lang === "en" ? 1 : 0]}\n🏔️ ${n}/7${n >= 7 ? t(" – Gipfel!", " – summit!") : ""}\n${row}`,
        state: { used: u, qStart: qs, over, giveUp: gu, secs: sc },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, puzzle, daily.day, daily.persist, lang, secs]
  );

  const start = () => {
    const ts = Date.now();
    setUsed([]);
    setSecs([]);
    setGiveUp(false);
    setQStart(ts);
    setNow(ts);
    setFb(null);
    setInput("");
    setPhase("play");
    save([], ts, false, false, []);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // clock
  useEffect(() => {
    if (phase !== "play") return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [phase]);
  const readLeft = qStart ? Math.max(0, qStart + READ_MS - now) : 0;
  const left = qStart ? Math.max(0, Math.min(ANSWER_MS, qStart + READ_MS + ANSWER_MS - now)) : ANSWER_MS;
  useEffect(() => {
    if (phase === "play" && isTimed && qStart && now >= qStart + READ_MS + ANSWER_MS) {
      setPhase("over");
      save(used, qStart, true);
    }
  }, [phase, isTimed, qStart, now, used, save]);

  const finish = (u: string[], sc: number[]) => {
    setPhase("over");
    save(u, null, true, false, sc);
  };

  const q = puzzle && i < 7 ? puzzle.qs[i] : null;
  const valid = useMemo(() => new Set(q?.ids ?? []), [q]);
  const prefer = useCallback((id: string) => valid.has(id) && !used.includes(id), [valid, used]);

  const accept = (id: string) => {
    if (!puzzle || !qStart) return;
    const took = Math.max(0, (Date.now() - qStart - READ_MS) / 1000);
    const u = [...used, id];
    const sc = [...secs, Math.round(took * 10) / 10];
    setUsed(u);
    setSecs(sc);
    setInput("");
    setSel(-1);
    setFb({ kind: "ok", text: t(`${nameOf(id)} – weiter zum nächsten Lager!`, `${nameOf(id)} – on to the next camp!`), id });
    try { navigator.vibrate?.(25); } catch {}
    if (u.length >= 7) return finish(u, sc);
    const ts = Date.now();
    setQStart(ts);
    setNow(ts);
    save(u, ts, false, false, sc);
  };

  const reject = (f: Fb) => {
    setFb(f);
    setShake((s) => s + 1);
    try { navigator.vibrate?.([12, 40, 12]); } catch {}
  };

  const submitId = (id: string) => {
    if (!q) return;
    const name = nameOf(id);
    const at = used.indexOf(id);
    if (valid.has(id) && at < 0) return accept(id);
    if (at >= 0) return reject({ kind: "used", text: t(`${name} hast du schon bei Frage ${at + 1} verbraucht.`, `You already used ${name} on question ${at + 1}.`) });
    return reject({ kind: "wrong", text: t(`${name} passt hier nicht.`, `${name} doesn’t fit here.`) });
  };

  const submit = (raw = input) => {
    if (!q || !puzzle) return;
    const s = raw.trim();
    if (!s) {
      if (fb?.kind === "maybe" && fb.id) submitId(fb.id);
      return;
    }
    const r = lookup(th.index, s, prefer);
    if (r.kind === "found") {
      const id = r.ids.find((x) => prefer(x)) ?? r.ids.find((x) => used.includes(x)) ?? r.ids[0];
      return submitId(id);
    }
    if (r.kind === "maybe") {
      setFb({ kind: "maybe", text: "", id: r.id });
      return;
    }
    // something from the other theme?
    const other: ThemeKey = tk === "laender" ? "fussball" : "laender";
    const o = lookup(theme(other).index, s, () => false);
    if (o.kind === "found")
      return reject({
        kind: "type",
        text: t(`Das ist ${THING[other][0]} – gesucht ist ${THING[tk][0]}.`, `That’s ${THING[other][1]} – this asks for ${THING[tk][1]}.`),
      });
    logUnknown(tk, s);
    reject({ kind: "unknown", text: t("Nicht in unserer Liste – versuch eine andere Antwort.", "Not on our list – try another answer.") });
  };

  const sugs = useMemo(() => (phase === "play" ? suggest(th.index, input, fame, 6) : []), [phase, th, input, fame]);
  useEffect(() => setSel(-1), [input]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && sugs.length) {
      e.preventDefault();
      setSel((x) => (x + 1) % sugs.length);
    } else if (e.key === "ArrowUp" && sugs.length) {
      e.preventDefault();
      setSel((x) => (x <= 0 ? sugs.length - 1 : x - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (sel >= 0 && sugs[sel]) {
        setInput("");
        submitId(sugs[sel]);
      } else submit();
    } else if (e.key === "Escape") setSel(-1);
  };

  // winner / loser animation once
  const shown = useRef("");
  useEffect(() => {
    if (phase !== "over" || !puzzle) return;
    const key = `${puzzle.seed}:${used.length}`;
    if (shown.current === key) return;
    shown.current = key;
    if (mode === "daily" && daily.saved?.done && daily.saved.state && performance.now() < 4000) return; // just reloaded a finished day
    const w = window as unknown as { ktOutcome?: (o: object) => void };
    const go = () =>
      w.ktOutcome?.({
        win: used.length >= 7,
        title: used.length >= 7 ? t("Gipfel erreicht!", "Summit reached!") : giveUp ? t("Abgestiegen", "You turned back") : t("Ausbruch!", "Eruption!"),
        sub: used.length >= 7 ? t("Alle 7 Lager geschafft", "All 7 camps cleared") : t(`Lager ${used.length} von 7`, `Camp ${used.length} of 7`),
      });
    if (w.ktOutcome) setTimeout(go, 900);
    else {
      const s = document.createElement("script");
      s.src = "/fx/outcome.js?v=1";
      s.onload = () => setTimeout(go, 600);
      document.head.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, puzzle]);

  const mood: Mood =
    phase === "over" ? (won ? "won" : "lost") : phase !== "play" ? "calm" : readLeft > 0 ? "read" : !isTimed ? "calm" : left < 4000 ? "storm" : left < 8000 ? "tense" : "calm";

  if (!puzzle) return <div className="min-h-[70vh]" aria-busy="true" />;
  const tn = THEME_NAME[puzzle.theme][lang === "en" ? 1 : 0];
  const qText = (k: number) => (lang === "en" ? puzzle.qs[k].en : puzzle.qs[k].de);

  return (
    <div className="gs-wrap mx-auto max-w-3xl px-3 pb-16 pt-3 sm:px-4 sm:pt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[30px] font-semibold leading-none sm:text-[40px]">{t("Gipfelsturm", "Summit Rush")}</h1>
          <p className="mt-1 font-semibold text-muted">
            {mode === "daily" ? `#${dayNumber(daily.day)} · ` : t("Endlos · ", "Endless · ")}
            {tn}
          </p>
        </div>
        {mode === "daily" ? (
          <Link href="/gipfelsturm/endlos" className="chip !rounded-md">
            {t("Endlos spielen", "Play endless")}
          </Link>
        ) : (
          <Link href="/gipfelsturm" className="chip !rounded-md">
            {t("Tagesrätsel", "Daily climb")}
          </Link>
        )}
      </div>

      <div className="relative">
        <GipfelScene step={i} mood={mood} compact={phase === "play" && focus} />
        {phase === "play" && (
          <div className="gs-hud">
            <span className="gs-pill">{t(`Lager ${i + 1} / 7`, `Camp ${i + 1} / 7`)}</span>
            {isTimed && (
              <span className={`gs-pill gs-time${left < 8000 && !readLeft ? " low" : ""}`} aria-live="off">
                {readLeft > 0 ? t("Lesen …", "Read …") : `${(left / 1000).toFixed(1).replace(".", lang === "en" ? "." : ",")} s`}
              </span>
            )}
          </div>
        )}
        {phase === "play" && isTimed && (
          <div className="gs-bar" aria-hidden="true">
            <i style={{ transform: `scaleX(${readLeft > 0 ? 1 : left / ANSWER_MS})` }} className={readLeft > 0 ? "read" : left < 4000 ? "storm" : left < 8000 ? "tense" : ""} />
          </div>
        )}
      </div>

      {phase === "intro" && (
        <section className="card mt-4 p-5 sm:p-6">
          <h2 className="text-2xl font-semibold">{mode === "daily" ? t(`Heute: ${tn}`, `Today: ${tn}`) : t("Wähle dein Gebirge", "Choose your mountain")}</h2>
          <ul className="mt-3 space-y-1.5 text-[16px] leading-snug">
            <li>{t("7 Fragen, 7 Lager bis zum Krater. Jede richtige Antwort bringt dich ein Lager höher – läuft die Uhr ab, bricht der Vulkan aus.", "7 questions, 7 camps up the volcano. Every right answer takes you one camp higher.")}</li>
            <li><strong>{t("Jede Antwort zählt nur einmal.", "Every answer counts only once.")}</strong> {t("Die ersten Fragen haben viele Lösungen, die letzten nur noch ein, zwei – oft genau die berühmte, die du am Anfang verbraucht hast.", "The first questions have many answers, the last ones only one or two – often the famous one you spent early on.")}</li>
            <li>{isTimed ? t("25 Sekunden pro Frage, die Uhr startet nach 2 Sekunden Lesezeit. Falsche Antworten kosten nichts – nur die Zeit läuft weiter.", "25 seconds per question; the clock starts after 2 seconds of reading. Wrong answers cost nothing – the clock just keeps running.") : t("Ohne Zeitlimit – nimm dir Zeit.", "No time limit – take your time.")}</li>
            {mode === "daily" && <li>{t("Ein Versuch pro Tag, immer zu Ländern. Fußball gibt es im Endlos-Modus.", "One try per day, always about countries. Football is in the endless mode.")}</li>}
          </ul>
          {mode === "endlos" && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(["laender", "fussball"] as ThemeKey[]).map((k) => (
                <button key={k} type="button" onClick={() => { setPick(k); setSeed(Math.random().toString(36).slice(2, 10)); }} className={`chip !rounded-md ${pick === k ? "!bg-ink !text-white" : ""}`} aria-pressed={pick === k}>
                  {THEME_NAME[k][lang === "en" ? 1 : 0]}
                </button>
              ))}
              <label className="ml-1 flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-5 w-5 accent-[#ee8a2f]" />
                {t("Mit Uhr", "With clock")}
              </label>
            </div>
          )}
          <button type="button" onClick={start} className="btn-primary mt-5 w-full sm:w-auto" disabled={!puzzle}>
            {t("Aufstieg starten", "Start climbing")}
          </button>
        </section>
      )}

      {phase === "play" && q && (
        <section className="card gs-q mt-4 p-4 sm:p-6">
          <p className="text-sm font-bold text-muted">{t(`Frage ${i + 1} von 7`, `Question ${i + 1} of 7`)}</p>
          <h2 key={i} className="gs-qtext mt-1 text-[22px] font-semibold leading-snug sm:text-[27px]">{qText(i)}</h2>
          <form
            className="relative mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div key={shake} className={`flex gap-2 ${shake ? "gs-shake" : ""}`}>
              <input
                ref={inputRef}
                className="input flex-1"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (fb && fb.kind !== "ok") setFb(null);
                }}
                onKeyDown={onKey}
                onFocus={() => setFocus(true)}
                onBlur={() => setTimeout(() => setFocus(false), 150)}
                placeholder={t(`${THING[puzzle.theme][0][0].toUpperCase()}${THING[puzzle.theme][0].slice(1)} …`, `${THING[puzzle.theme][1][0].toUpperCase()}${THING[puzzle.theme][1].slice(1)} …`)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                aria-label={t("Deine Antwort", "Your answer")}
                role="combobox"
                aria-expanded={sugs.length > 0}
                aria-controls="gs-sugs"
                aria-activedescendant={sel >= 0 ? `gs-sug-${sel}` : undefined}
              />
              <button type="submit" className="btn-primary shrink-0 px-5">
                {t("Los", "Go")}
              </button>
            </div>
            {sugs.length > 0 && (
              <ul id="gs-sugs" role="listbox" className="gs-sugs">
                {sugs.map((id, k) => (
                  <li key={id} id={`gs-sug-${k}`} role="option" aria-selected={sel === k}>
                    <button
                      type="button"
                      className={sel === k ? "on" : ""}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setInput("");
                        submitId(id);
                        inputRef.current?.focus();
                      }}
                    >
                      {nameOf(id)}
                      {used.includes(id) && <span className="gs-usedtag">{t("verbraucht", "used")}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
          <div className="min-h-[44px]" aria-live="polite">
            {fb?.kind === "maybe" && fb.id ? (
              <p className="pop mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-[15px]">
                <span>
                  {t("Meintest du", "Did you mean")} <strong>{nameOf(fb.id)}</strong>?
                </span>
                <button type="button" className="rounded-lg bg-ink px-2.5 py-1 text-sm font-bold text-white" onClick={() => { setInput(""); submitId(fb.id!); inputRef.current?.focus(); }}>
                  {t("Ja", "Yes")}
                </button>
                <button type="button" className="rounded-lg px-2 py-1 text-sm font-bold text-muted" onClick={() => { setFb(null); inputRef.current?.focus(); }}>
                  {t("Nein", "No")}
                </button>
              </p>
            ) : fb ? (
              <p key={fb.text + shake} className={`pop mt-2 rounded-xl px-3 py-2 text-[15px] font-semibold gs-fb-${fb.kind}`}>{fb.text}</p>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {used.length > 0 && <span className="text-sm font-bold text-muted">{t("Verbraucht:", "Used:")}</span>}
            {used.map((id) => (
              <span key={id} className="gs-chip">{nameOf(id)}</span>
            ))}
            <button
              type="button"
              className="ml-auto text-sm font-bold text-muted underline decoration-dotted underline-offset-4"
              onClick={() => {
                setGiveUp(true);
                setPhase("over");
                save(used, null, true, true);
              }}
            >
              {t("Aufgeben", "Give up")}
            </button>
          </div>
        </section>
      )}

      {phase === "over" && (
        <>
          {mode === "daily" ? (
            <ResultCard title={won ? t("Gipfel erreicht!", "Summit reached!") : t("Dein Aufstieg", "Your climb")} score={`${used.length} / 7`} share={daily.saved?.share || ""} isToday={daily.isToday} current="gipfelsturm">
              {won ? t("Alle sieben Lager – stark!", "All seven camps – brilliant!") : t(`Bis Lager ${used.length}. Unten siehst du, welche Antworten wo gebraucht wurden.`, `Up to camp ${used.length}. Below you can see which answers were needed where.`)}
            </ResultCard>
          ) : (
            <section className="card mt-4 p-5 sm:p-6">
              <p className="font-display text-lg font-semibold text-muted">{won ? t("Gipfel erreicht!", "Summit reached!") : t("Dein Aufstieg", "Your climb")}</p>
              <p className="font-display text-5xl font-semibold">{used.length} / 7</p>
              <button type="button" className="btn-primary mt-4" onClick={() => { setSeed(Math.random().toString(36).slice(2, 10)); setPhase("intro"); setUsed([]); setQStart(null); setFb(null); }}>
                {t("Nächster Berg", "Next mountain")}
              </button>
            </section>
          )}
          <Explain puzzle={puzzle} used={used} secs={secs} nameOf={nameOf} fame={fame} qText={qText} />
          {mode === "daily" && <NextClimb />}
        </>
      )}
    </div>
  );
}

function Explain({ puzzle, used, secs, nameOf, fame, qText }: { puzzle: Puzzle; used: string[]; secs: number[]; nameOf: (id: string) => string; fame: (id: string) => number; qText: (k: number) => string }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="mt-6">
      <h2 className="text-[26px] font-semibold">{t("Die Auflösung", "The solution")}</h2>
      <p className="mt-1 text-muted">{t("Ein Weg, der alle sieben Fragen löst – und wo die Fallen lagen.", "One route that solves all seven questions – and where the traps were.")}</p>
      <ol className="mt-3 space-y-2.5">
        {puzzle.qs.map((q, k) => {
          const later = new Set(puzzle.qs.slice(k + 1).flatMap((x) => x.ids));
          const small = new Set(puzzle.qs.slice(k + 1).filter((x) => x.ids.length <= 6).flatMap((x) => x.ids));
          const all = [...q.ids].sort((a, b) => fame(b) - fame(a));
          const mine = used[k];
          return (
            <li key={q.key} className="card p-4">
              <div className="flex items-start gap-3">
                <span className={`gs-badge ${mine ? "ok" : k === used.length ? "bad" : ""}`}>{k + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{qText(k)}</p>
                  <p className="mt-1 text-[15px]">
                    {mine ? (
                      <>
                        {t("Deine Antwort:", "Your answer:")} <strong>{nameOf(mine)}</strong>
                        {secs[k] != null && <span className="text-muted"> · {String(secs[k]).replace(".", ",")} s</span>}
                      </>
                    ) : (
                      <span className="text-muted">{k === used.length ? t("Hier war Schluss.", "This is where it ended.") : t("Nicht erreicht.", "Not reached.")}</span>
                    )}
                    {mine !== puzzle.path[k] && <span className="text-muted"> · {t("Möglicher Weg:", "Possible route:")} {nameOf(puzzle.path[k])}</span>}
                  </p>
                  <button type="button" className="mt-1.5 text-sm font-bold text-brand underline-offset-4 hover:underline" onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}>
                    {open === k ? t("Antworten ausblenden", "Hide answers") : q.ids.length === 1 ? t("Die einzige Antwort", "The only answer") : t(`Alle ${q.ids.length} Antworten`, `All ${q.ids.length} answers`)}
                  </button>
                  {open === k && (
                    <p className="mt-2 text-[15px] leading-relaxed">
                      {all.slice(0, 150).map((id, n) => (
                        <span key={id}>
                          {n > 0 && ", "}
                          <span className={small.has(id) ? "gs-trap" : later.has(id) ? "font-semibold" : ""} title={small.has(id) ? t("Wird später gebraucht", "Needed later") : undefined}>
                            {nameOf(id)}
                          </span>
                        </span>
                      ))}
                      {all.length > 150 && <span className="text-muted"> {t(`und ${all.length - 150} weitere`, `and ${all.length - 150} more`)}</span>}
                      {small.size > 0 && <span className="mt-1 block text-sm text-muted">{t("Orange: wird bei einer der letzten Fragen gebraucht – die Falle.", "Orange: needed for one of the last questions – the trap.")}</span>}
                      {q.src && <span className="mt-1 block text-sm text-muted">{t("Quelle:", "Source:")} {q.src}</span>}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function NextClimb() {
  const t = useT();
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = msUntilNextDay();
      setLeft(`${Math.floor(ms / 3600000)}:${String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="mt-6 text-center font-semibold text-muted">
      {t("Nächster Berg in", "Next mountain in")} <span className="font-display text-ink">{left}</span> ·{" "}
      <Link href="/gipfelsturm/endlos" className="text-brand underline-offset-4 hover:underline">
        {t("Bis dahin endlos klettern", "Climb endlessly till then")}
      </Link>
    </p>
  );
}
