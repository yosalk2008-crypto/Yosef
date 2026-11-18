"use client";

/**
 * Fernweh – the daily expedition: five clues, one pin each on an unlabelled world map. The rarer the
 * fitting country, the more kilometres (40–100 per clue, 500 a day). Layout: the map fills the left,
 * the logbook panel on the right holds distance, clue, route map, result card and the big button.
 * Daily (one try, saved), endless and a single practice clue. Facts and tiers live in lib/fernweh.ts.
 */
import Link from "@/components/Link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allResults, dayNumber, msUntilNextDay, utcDate } from "@/lib/daily";
import { useDaily } from "@/lib/useDaily";
import { useLang, useT } from "@/lib/i18n";
import { BY_ID_ALL, cName } from "@/lib/data/countries";
import { useShapes, type Shape } from "@/lib/geo";
import { MapView } from "../MapView";
import { Picker } from "../Picker";
import { ResultCard } from "../GameShell";
import { CLUES_PER_DAY, KM, MISS, NOT_PINNABLE, TERRITORY_OWNER, TIERS, cluePool, expedition, factLine, kmOf, rankFor, tierOf, why, type Clue } from "@/lib/fernweh";
import { RouteMap } from "./RouteMap";

type Pick = { id: string | null; km: number; via?: string };
type Saved = { picks: Pick[]; qStart: number | null; stars: number; late?: boolean };
type Opts = { secs: 0 | 30 | 60; hideName: boolean; hideBorders: boolean; search: boolean };

const LAND = "#eee3c4";
const BORDER = "#3a2f28";
const GRID = "rgba(58,47,40,0.22)";
const PICK = "#c9302c";
const NOWHERE = { x: -9999, y: -9999 };

/** World shapes plus the overseas parts that count as their country (Greenland → Denmark …). */
function useAtlas() {
  const world = useShapes("world");
  const [extra, setExtra] = useState<Shape[] | null>(null);
  useEffect(() => {
    fetch("/geo/territorien.json")
      .then((r) => r.json())
      .then((fc: { features: Shape[] }) => setExtra(fc.features.map((f) => ({ ...f, id: String(f.id) }))))
      .catch(() => setExtra([]));
  }, []);
  return useMemo(() => (world && extra ? [...world.list, ...extra] : null), [world, extra]);
}
const owner = (id: string) => TERRITORY_OWNER[id] ?? id;
const VIA: Record<string, [string, string]> = { GRL: ["Grönland", "Greenland"], FLK: ["Falklandinseln", "Falklands"], PRI: ["Puerto Rico", "Puerto Rico"], NCL: ["Neukaledonien", "New Caledonia"], ATF: ["Französische Südgebiete", "French Southern Lands"] };

/** Width / height of an element, so the map fills its box (callback ref: the element mounts late). */
function useAspect(fallback: number) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [a, setA] = useState(fallback);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setA(Math.max(0.8, Math.min(2.6, r.width / r.height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, a] as const;
}

export function Fernweh({ mode }: { mode: "daily" | "endlos" | "uebung" }) {
  const lang = useLang();
  const t = useT();
  const daily = useDaily<Saved>("fernweh");
  const shapes = useAtlas();
  const [mapBox, aspect] = useAspect(1.6);

  const [opts, setOpts] = useState<Opts>({ secs: 0, hideName: false, hideBorders: false, search: false });
  useEffect(() => {
    try {
      const o = JSON.parse(localStorage.getItem("kt-fernweh-opts") || "{}");
      setOpts((x) => ({ ...x, ...o }));
    } catch {}
  }, []);
  const setOpt = (o: Partial<Opts>) =>
    setOpts((x) => {
      const n = { ...x, ...o };
      try { localStorage.setItem("kt-fernweh-opts", JSON.stringify(n)); } catch {}
      return n;
    });
  const stars = (opts.secs ? 1 : 0) + (opts.secs === 30 ? 1 : 0) + (opts.hideName ? 1 : 0) + (opts.hideBorders ? 1 : 0);

  const [seed, setSeed] = useState("");
  useEffect(() => setSeed(Math.random().toString(36).slice(2, 10)), [mode]);
  const clues: Clue[] = useMemo(() => {
    if (mode === "daily") return daily.loaded ? expedition(`tag:${daily.day}`) : [];
    if (!seed) return [];
    if (mode === "uebung") {
      const pool = cluePool().filter((c) => c.ids.length >= 5 && c.ids.length <= 20);
      return [pool[Math.abs([...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)) % pool.length]];
    }
    return expedition(`frei:${seed}`);
  }, [mode, daily.loaded, daily.day, seed]);
  const total = mode === "uebung" ? 1 : CLUES_PER_DAY;

  const [phase, setPhase] = useState<"intro" | "play" | "reveal" | "camp">("intro");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [sel, setSel] = useState<{ id: string; at: { x: number; y: number } } | null>(null);
  const [note, setNote] = useState("");
  const [qStart, setQStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const i = phase === "reveal" ? picks.length - 1 : picks.length;
  const clue = clues[Math.max(0, Math.min(i, clues.length - 1))];
  const cNameOf = useCallback((id: string) => (BY_ID_ALL[id] ? cName(BY_ID_ALL[id], lang) : id), [lang]);

  // restore today's expedition (one try; the clock keeps running across a reload)
  const restored = useRef(false);
  useEffect(() => {
    if (mode !== "daily" || !daily.loaded || restored.current || !clues.length) return;
    restored.current = true;
    const s = daily.saved?.state;
    if (!s) return;
    setPicks(s.picks);
    setQStart(s.qStart);
    if (s.picks.length >= CLUES_PER_DAY || daily.saved?.done) setPhase("camp");
    else if (s.qStart) setPhase("play");
  }, [mode, daily.loaded, daily.saved, clues.length]);

  const save = useCallback(
    (p: Pick[], qs: number | null) => {
      if (mode !== "daily") return;
      const km = p.reduce((s, x) => s + x.km, 0);
      const done = p.length >= CLUES_PER_DAY;
      const row = p.map((x, k) => (x.id && x.km ? TIERS[tierOf(clues[k], x.id)].emoji : MISS.emoji)).join("");
      daily.persist({
        done,
        won: km >= 300,
        score: km,
        max: 500,
        label: `${km} km`,
        share: `${t("Fernweh", "Wanderlust")} #${dayNumber(daily.day)} · ${km}/500 km${"*".repeat(stars)}\n${row}`,
        state: { picks: p, qStart: qs, stars, late: !daily.isToday },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, clues, daily.day, daily.persist, daily.isToday, stars, lang]
  );

  const start = () => {
    const ts = Date.now();
    setPicks([]);
    setSel(null);
    setNote("");
    setQStart(ts);
    setNow(ts);
    setPhase("play");
    save([], ts);
  };

  useEffect(() => {
    if (phase !== "play" || !opts.secs) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [phase, opts.secs]);
  const left = opts.secs && qStart ? Math.max(0, qStart + opts.secs * 1000 - now) : 0;

  const lockIn = useCallback(
    (forced = false) => {
      if (phase !== "play" || !clue) return;
      const id = sel && !NOT_PINNABLE.has(sel.id) ? owner(sel.id) : null;
      if (!id && !forced) return;
      const p = [...picks, { id, km: kmOf(clue, id), via: sel && TERRITORY_OWNER[sel.id] ? sel.id : undefined }];
      setPicks(p);
      setPhase("reveal");
      save(p, null);
      try { navigator.vibrate?.(p[p.length - 1].km ? 25 : [60]); } catch {}
    },
    [phase, clue, sel, picks, save]
  );
  useEffect(() => {
    if (phase === "play" && opts.secs && qStart && now >= qStart + opts.secs * 1000) lockIn(true);
  }, [phase, opts.secs, qStart, now, lockIn]);

  const next = () => {
    if (picks.length >= total) {
      setPhase("camp");
      window.scrollTo({ top: 0 });
      return;
    }
    const ts = Date.now();
    setSel(null);
    setNote("");
    setQStart(ts);
    setNow(ts);
    setPhase("play");
    save(picks, ts);
  };

  const onPick = (id: string, at: { x: number; y: number }) => {
    if (phase !== "play") return;
    setSel({ id, at });
    setNote(NOT_PINNABLE.has(id) ? t("Dieses Gebiet zählt in Fernweh nicht – wähle ein anderes Land.", "This area doesn’t count in Wanderlust – pick another country.") : "");
  };
  const onSea = () => {
    if (phase !== "play") return;
    setSel(null);
    setNote(t("Das ist Meer – setz den Pin auf ein Land.", "That’s the sea – drop the pin on a country."));
  };

  // keyboard: Space / Enter drop the pin or go on
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
      if (e.key !== "Enter" && e.key !== " ") return;
      if (phase !== "play" && phase !== "reveal") return;
      e.preventDefault();
      if (phase === "play") lockIn();
      else next();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // winner / loser animation at the camp
  const shown = useRef(false);
  const kmTotal = picks.reduce((s, x) => s + x.km, 0);
  useEffect(() => {
    if (phase !== "camp" || shown.current || mode === "uebung") return;
    shown.current = true;
    if (mode === "daily" && performance.now() < 4000 && daily.saved?.done) return;
    const go = () =>
      (window as unknown as { ktOutcome?: (o: object) => void }).ktOutcome?.({
        win: kmTotal >= 300,
        title: kmTotal >= 300 ? t("Starke Expedition!", "Great expedition!") : t("Zurück im Camp", "Back at camp"),
        sub: `${kmTotal} / 500 km · ${rankFor(kmTotal)[lang === "en" ? 1 : 0]}`,
      });
    const w = window as unknown as { ktOutcome?: unknown };
    if (w.ktOutcome) setTimeout(go, 500);
    else {
      const s = document.createElement("script");
      s.src = "/fx/outcome.js?v=1";
      s.onload = () => setTimeout(go, 400);
      document.head.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const pickOpts = useMemo(
    () => Object.values(BY_ID_ALL).filter((c) => !NOT_PINNABLE.has(c.id)).map((c) => ({ id: c.id, label: cName(c, lang), alt: [...c.alt, c.n] })),
    [lang]
  );

  if (!shapes || !clues.length) return <div className="fw-app fw-loading" aria-busy="true" />;

  if (phase === "camp")
    return (
      <div className="fw-page mx-auto max-w-5xl px-3 pb-16 pt-4 sm:px-4 sm:pt-6">
        <Header mode={mode} day={daily.day} stars={stars} />
        <Camp
          mode={mode}
          clues={clues.slice(0, Math.max(1, picks.length))}
          picks={picks}
          shapes={shapes}
          nameOf={cNameOf}
          share={daily.saved?.share || ""}
          isToday={daily.isToday}
          day={daily.day}
          onAgain={() => {
            setSeed(Math.random().toString(36).slice(2, 10));
            setPicks([]);
            setPhase("intro");
            shown.current = false;
          }}
        />
      </div>
    );

  const reveal = phase === "reveal" ? clues[picks.length - 1] : null;
  const last = picks[picks.length - 1];
  const fill = (id: string) => {
    const o = owner(id);
    if (reveal) return reveal.ids.includes(o) ? TIERS[tierOf(reveal, o)].color : LAND;
    if (sel && owner(sel.id) === o) return NOT_PINNABLE.has(o) ? "#d8cfb8" : "#f2c59a";
    return LAND;
  };
  const pinAt = phase === "play" ? sel?.at : null;
  const pin = (k: number, ppu: number) => {
    if (!pinAt || pinAt.x < -999) return null;
    const s = 1 / (k * ppu);
    return (
      <g transform={`translate(${pinAt.x} ${pinAt.y}) scale(${s})`} pointerEvents="none">
        <g className="fw-pin">
          <ellipse cx="0" cy="1" rx="7" ry="2.6" fill="#000" opacity=".28" />
          <path d="M0 0C-3-9-12-14-12-24a12 12 0 0124 0C12-14 3-9 0 0z" fill={PICK} stroke="#2a211c" strokeWidth="2.2" />
          <circle cy="-24" r="4.5" fill="#f6efe0" />
        </g>
      </g>
    );
  };
  const kmSoFar = picks.reduce((s, x) => s + x.km, 0);
  const shownSel = sel ? cNameOf(owner(sel.id)) + (VIA[sel.id] ? ` (${t("über", "via")} ${VIA[sel.id][lang === "en" ? 1 : 0]})` : "") : "";
  const lastShape = last?.id ? (last.via ?? last.id) : null;
  const hit = !!(reveal && last?.id && reveal.ids.includes(last.id));
  const firstTime = !!(reveal && last?.id && picks.slice(0, -1).every((p) => p.id !== last.id));
  const n = phase === "reveal" ? picks.length : picks.length + 1;
  const highlight =
    reveal && lastShape ? { id: lastShape, color: hit ? PICK : "#2a211c" } : phase === "play" && sel ? { id: sel.id, color: NOT_PINNABLE.has(sel.id) ? "#8a7f6b" : PICK } : null;

  return (
    <div className="fw-app">
      <div className="fw-mapcol" ref={mapBox}>
        <MapView
          shapes={shapes}
          fill={fill}
          stroke={BORDER}
          showBorders={!opts.hideBorders || phase === "reveal"}
          onPick={phase === "play" ? onPick : undefined}
          onSea={onSea}
          dots={(id) => !!BY_ID_ALL[id]}
          dotFill={fill}
          overlay={pin}
          projection="mercator"
          graticule={GRID}
          focus={reveal ? lastShape : "*"}
          highlight={highlight}
          aspect={aspect}
          className="fw-atlas"
          label={t("Weltkarte ohne Beschriftung", "Unlabelled world map")}
        />
        {reveal && (
          <div className="fw-stampcard" aria-live="polite">
            {firstTime && hit && <span className="fw-newtag">{t("Neues Land", "New place")}</span>}
            <p className="fw-small">{t(`Pin ${n} von ${total}`, `Pin ${n} of ${total}`)}</p>
            <p className="fw-country">{last?.id ? cNameOf(last.id) : t("Kein Land", "No country")}</p>
            <div className="fw-stamprow">
              <Stamp tier={hit ? tierOf(reveal, last.id!) : -1} />
              <span className="fw-dots" aria-hidden="true" />
              <span className="fw-plus">{hit ? `+${last.km} km` : "0 km"}</span>
            </div>
          </div>
        )}
        {phase === "play" && sel && !opts.hideName && <div className="fw-target">📍 {shownSel}</div>}
      </div>

      <aside className="fw-panel">
        <div className="fw-top">
          <div>
            <p className="fw-small">{t("Strecke", "Distance")}</p>
            <p className="fw-dist">
              {kmSoFar} <span>km</span>
            </p>
          </div>
          <div className="text-right">
            <span className="fw-badge">{mode === "daily" ? `Nr. ${dayNumber(daily.day)}` : mode === "endlos" ? t("Endlos", "Endless") : t("Übung", "Practice")}</span>
            <div className="fw-cells" aria-label={t(`Hinweis ${Math.min(n, total)} von ${total}`, `Clue ${Math.min(n, total)} of ${total}`)}>
              {Array.from({ length: total }, (_, k) => {
                const p = picks[k];
                const c = p ? (p.id && p.km ? TIERS[tierOf(clues[k], p.id)].color : MISS.color) : undefined;
                return <i key={k} style={c ? { background: c } : undefined} className={k === picks.length && phase === "play" ? "cur" : ""} />;
              })}
            </div>
            {stars > 0 && <span className="fw-stars">{"★".repeat(stars)}</span>}
          </div>
        </div>

        {phase === "intro" ? (
          <Intro mode={mode} opts={opts} setOpt={setOpt} onStart={start} done={!!daily.saved?.done && mode === "daily"} onCamp={() => setPhase("camp")} />
        ) : (
          <>
            <div className="fw-prompt">
              <p className="fw-small fw-red">{t(`Hinweis ${n} von ${total}`, `Clue ${n} of ${total}`)}</p>
              <p key={i} className="fw-cluetext">{lang === "en" ? clue.en : clue.de}</p>
              {opts.secs > 0 && phase === "play" && <p className={`fw-time${left < 10000 ? " low" : ""}`}>⏱ {Math.ceil(left / 1000)} s</p>}
            </div>
            {phase === "reveal" && reveal && last && (
              <div className="fw-factcard">
                <div className="fw-facthead flex items-center justify-between gap-2">
                  <Stamp tier={hit ? tierOf(reveal, last.id!) : -1} small />
                  <span className="fw-plus">{hit ? `+${last.km} km` : "0 km"}</span>
                </div>
                <p className="mt-2 font-bold">{last.id ? cNameOf(last.id) : "—"}</p>
                <p className="fw-fact">{last.id ? why(reveal, last.id, lang).join(" ") : t("Die Zeit ist abgelaufen, ohne dass ein Pin auf einem Land lag.", "Time ran out without a pin on a country.")}</p>
                <p className="fw-fact">{t(`${reveal.ids.length} Länder hätten gepasst – auf der Karte nach Seltenheit gefärbt.`, `${reveal.ids.length} countries would have fitted – coloured by rarity on the map.`)}</p>
                <Legend />
              </div>
            )}
            {phase === "play" && (
              <div className="fw-status" aria-live="polite">
                {note ? <span className="fw-red">{note}</span> : sel ? (opts.hideName ? t("Pin gesetzt.", "Pin dropped.") : <>📍 {shownSel}</>) : t("Tippe auf ein Land. Den Pin kannst du umsetzen, bis du ihn setzt.", "Tap a country. You can move the pin until you drop it.")}
                {opts.search && (
                  <div className="mt-2">
                    <Picker options={pickOpts} onPick={(id) => onPick(id, NOWHERE)} placeholder={t("Land suchen …", "Search a country …")} buttonLabel={t("Wählen", "Pick")} />
                  </div>
                )}
              </div>
            )}
            <div className="fw-route">
              <RouteMap km={kmSoFar} />
            </div>
            <div className="fw-actions">
              <p className="fw-keys" aria-hidden="true">
                {phase === "play" ? (
                  <>
                    {t("Klicken = Pin", "Click = pin")} · <kbd>Enter</kbd> {t("= setzen", "= drop")}
                  </>
                ) : (
                  <>
                    <kbd>Enter</kbd> {t("= weiter", "= next")}
                  </>
                )}
              </p>
              {phase === "play" ? (
                <button type="button" className="fw-drop" disabled={!sel || NOT_PINNABLE.has(sel.id)} onClick={() => lockIn()}>
                  {t("Pin setzen", "Drop pin")}
                </button>
              ) : (
                <button type="button" className="fw-drop" onClick={next}>
                  {picks.length >= total ? (mode === "uebung" ? t("Fertig ▲", "Done ▲") : t("Ins Camp ▲", "On to camp ▲")) : t("Nächster Hinweis ▲", "Next clue ▲")}
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Header({ mode, day, stars }: { mode: string; day: string; stars: number }) {
  const t = useT();
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="fw-title">{t("Fernweh", "Wanderlust")}</h1>
        <p className="fw-small mt-1">
          {mode === "daily" ? t(`Expedition Nr. ${dayNumber(day)}`, `Expedition no. ${dayNumber(day)}`) : mode === "endlos" ? t("Endlos", "Endless") : t("Übungshinweis", "Practice clue")}
          {stars > 0 && <span className="ml-1">{"★".repeat(stars)}</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {mode !== "daily" && <Link href="/fernweh" className="fw-opt">{t("Tagesexpedition", "Daily expedition")}</Link>}
        {mode !== "endlos" && <Link href="/fernweh/endlos" className="fw-opt">{t("Endlos", "Endless")}</Link>}
        {mode !== "uebung" && <Link href="/fernweh/uebung" className="fw-opt">{t("Üben", "Practice")}</Link>}
      </div>
    </div>
  );
}

function Intro({ mode, opts, setOpt, onStart, done, onCamp }: { mode: string; opts: Opts; setOpt: (o: Partial<Opts>) => void; onStart: () => void; done: boolean; onCamp: () => void }) {
  const t = useT();
  return (
    <div className="fw-intro">
      <h1 className="fw-title">{t("Fernweh", "Wanderlust")}</h1>
      <p className="fw-cluetext !text-[20px]">{mode === "uebung" ? t("Ein Übungshinweis – so oft du willst.", "One practice clue – as often as you like.") : t("Fünf Hinweise, fünf Pins. Wie weit kommst du heute?", "Five clues, five pins. How far do you get today?")}</p>
      <ul className="fw-rules">
        <li>{t("Setz für jeden Hinweis einen Pin auf ein passendes Land – die Karte hat keine Namen.", "Drop one pin per clue on a country that fits – the map has no names.")}</li>
        <li>{t("Je weniger naheliegend dein Land, desto weiter kommst du: 40 · 55 · 70 · 85 · 100 km. Bis 500 km am Tag.", "The less obvious your country, the further you get: 40 · 55 · 70 · 85 · 100 km. Up to 500 km a day.")}</li>
        <li>{t("Ein Versuch pro Hinweis. Länder dürfen mehrmals vorkommen.", "One try per clue. Countries may come up more than once.")}</li>
        <li>{t("Überseegebiete zählen zu ihrem Land (Grönland = Dänemark). Fakten: Weltbank, CIA World Factbook.", "Overseas territories count as their country (Greenland = Denmark). Facts: World Bank, CIA World Factbook.")}</li>
      </ul>
      <fieldset className="mt-1">
        <legend className="fw-small">{t("Schwierigkeit – gibt ★ beim Teilen", "Difficulty – earns ★ when sharing")}</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {([0, 60, 30] as const).map((s) => (
            <button key={s} type="button" className={`fw-opt${opts.secs === s ? " on" : ""}`} aria-pressed={opts.secs === s} onClick={() => setOpt({ secs: s })}>
              {s ? `${s} s` : t("Ohne Uhr", "No clock")}
            </button>
          ))}
        </div>
        {(
          [
            ["hideName", t("Ländername am Pin ausblenden", "Hide the country name")],
            ["hideBorders", t("Ländergrenzen ausblenden", "Hide borders")],
            ["search", t("Länder auch per Suche wählen", "Also pick by search")],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="mt-1.5 flex items-center gap-2 text-[15px]">
            <input type="checkbox" className="h-5 w-5 accent-[#c9302c]" checked={opts[k]} onChange={(e) => setOpt({ [k]: e.target.checked })} />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="fw-actions">
        {done ? (
          <button type="button" className="fw-drop" onClick={onCamp}>{t("Zum Camp ▲", "To the camp ▲")}</button>
        ) : (
          <button type="button" className="fw-drop" onClick={onStart}>{t("Expedition starten ▲", "Start expedition ▲")}</button>
        )}
        <p className="mt-3 flex flex-wrap justify-center gap-4 text-sm font-bold">
          {mode !== "endlos" && <Link href="/fernweh/endlos" className="underline underline-offset-4">{t("Endlos", "Endless")}</Link>}
          {mode !== "uebung" && <Link href="/fernweh/uebung" className="underline underline-offset-4">{t("Üben", "Practice")}</Link>}
          {mode !== "daily" && <Link href="/fernweh" className="underline underline-offset-4">{t("Tagesexpedition", "Daily expedition")}</Link>}
        </p>
      </div>
    </div>
  );
}

function Stamp({ tier, small }: { tier: number; small?: boolean }) {
  const lang = useLang();
  const x = tier < 0 ? MISS : TIERS[tier];
  return (
    <span className={`fw-stamp${small ? " small" : ""}`} style={{ color: x.color, borderColor: x.color }}>
      {tier === 4 ? "💎 " : ""}
      {lang === "en" ? x.en : x.de}
    </span>
  );
}

function TierChip({ tier }: { tier: number }) {
  const lang = useLang();
  const x = tier < 0 ? MISS : TIERS[tier];
  return (
    <span className="fw-tier" style={{ background: x.color, color: tier === 4 || tier < 0 ? "#fff" : "#1f1d26" }}>
      {tier === 4 ? "💎 " : ""}
      {lang === "en" ? x.en : x.de}
      {tier >= 0 ? ` · +${KM[tier]} km` : " · 0 km"}
    </span>
  );
}

function Legend() {
  const lang = useLang();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] font-bold">
      {TIERS.map((x, k) => (
        <span key={k} className="fw-leg">
          <i style={{ background: x.color }} />
          {lang === "en" ? x.en : x.de} {KM[k]}
        </span>
      ))}
    </div>
  );
}

function Camp({ mode, clues, picks, shapes, nameOf, share, isToday, day, onAgain }: { mode: string; clues: Clue[]; picks: Pick[]; shapes: Shape[]; nameOf: (id: string) => string; share: string; isToday: boolean; day: string; onAgain: () => void }) {
  const t = useT();
  const lang = useLang();
  const [tab, setTab] = useState(0);
  const km = picks.reduce((s, x) => s + x.km, 0);
  const max = clues.length * 100;
  const rank = rankFor(mode === "uebung" ? km * 5 : km)[lang === "en" ? 1 : 0];
  const c = clues[tab];
  const fill = (id: string) => {
    const o = owner(id);
    return c?.ids.includes(o) ? TIERS[tierOf(c, o)].color : LAND;
  };
  const mine = picks[tab]?.id ?? null;
  return (
    <section className="mt-2">
      <div className="fw-campgrid">
        <div>
          {mode === "daily" ? (
            <ResultCard title={t("Expeditionsbericht", "Expedition report")} score={`${km} / 500 km`} share={share} isToday={isToday} current="fernweh">
              {rank}
            </ResultCard>
          ) : (
            <div className="fw-factcard !p-5">
              <p className="fw-small">{t("Expeditionsbericht", "Expedition report")}</p>
              <p className="fw-dist mt-1">{km} / {max} <span>km</span></p>
              <p className="mt-1">{rank}</p>
              <button type="button" className="fw-drop mt-4" onClick={onAgain}>
                {mode === "uebung" ? t("Neuer Übungshinweis ▲", "New practice clue ▲") : t("Neue Expedition ▲", "New expedition ▲")}
              </button>
            </div>
          )}
        </div>
        {mode !== "uebung" && (
          <div className="fw-route fw-route-camp">
            <RouteMap km={km} />
          </div>
        )}
      </div>

      <h2 className="fw-title mt-8 !text-[28px]">{t("Die Lösungen", "The answers")}</h2>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist">
        {clues.map((_, k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`fw-opt${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>
            {k + 1} · {picks[k]?.km ?? 0} km
          </button>
        ))}
      </div>
      {c && (
        <div className="mt-3">
          <p className="fw-cluetext !text-[22px]">{lang === "en" ? c.en : c.de}</p>
          <p className="mt-2 text-[15px]">
            {t("Dein Pin:", "Your pin:")} <strong>{mine ? nameOf(mine) : "—"}</strong> <TierChip tier={mine && c.ids.includes(mine) ? tierOf(c, mine) : -1} />
          </p>
          {mine && <p className="fw-fact">{why(c, mine, lang).join(" ")} {factLine(mine, lang)}</p>}
          <div className="mt-3">
            <MapView shapes={shapes} fill={fill} stroke={BORDER} dots={(id) => !!BY_ID_ALL[id]} dotFill={fill} projection="mercator" graticule={GRID} highlight={mine ? { id: mine, color: PICK } : null} aspect={1.7} className="fw-atlas" label={t("Lösungskarte", "Answer map")} />
          </div>
          <Legend />
          <div className="mt-3 space-y-1.5">
            {[4, 3, 2, 1, 0].map((tier) => {
              const ids = c.ids.filter((id) => tierOf(c, id) === tier);
              if (!ids.length) return null;
              return (
                <p key={tier} className="text-[15px] leading-relaxed">
                  <TierChip tier={tier} /> {ids.map((id) => nameOf(id)).join(", ")}
                </p>
              );
            })}
          </div>
          {c.src && <p className="mt-1 text-sm opacity-75">{t("Quelle:", "Source:")} {c.src}</p>}
          <Dispute clue={c} day={day} />
        </div>
      )}
      {mode === "daily" && <Logbook />}
      {mode === "daily" && <NextExpedition />}
    </section>
  );
}

/** "Sollte ein anderes Land zählen?" – kept in the browser (kt-fernweh-einspruch) for the editors. */
function Dispute({ clue, day }: { clue: Clue; day: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [land, setLand] = useState("");
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    setOpen(false);
    setSent(false);
  }, [clue.key]);
  if (sent) return <p className="mt-3 text-[15px] font-semibold">{t("Danke – wir schauen uns das an.", "Thanks – we’ll look into it.")}</p>;
  if (!open)
    return (
      <button type="button" className="mt-3 text-sm font-bold text-[#c9302c] underline-offset-4 hover:underline" onClick={() => setOpen(true)}>
        {t("Sollte ein anderes Land zählen?", "Should another country count?")}
      </button>
    );
  return (
    <form
      className="fw-factcard mt-3 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const k = "kt-fernweh-einspruch";
          const a = JSON.parse(localStorage.getItem(k) || "[]");
          a.push({ day, clue: clue.key, land: land.slice(0, 60), why: reason.slice(0, 300), at: new Date().toISOString() });
          localStorage.setItem(k, JSON.stringify(a.slice(-50)));
        } catch {}
        setSent(true);
      }}
    >
      <label className="text-sm font-bold">
        {t("Welches Land?", "Which country?")}
        <input className="input mt-1" value={land} onChange={(e) => setLand(e.target.value)} required maxLength={60} />
      </label>
      <label className="text-sm font-bold">
        {t("Warum?", "Why?")}
        <textarea className="input mt-1 min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
      </label>
      <button type="submit" className="fw-opt justify-self-start">{t("Melden", "Report")}</button>
    </form>
  );
}

/** Logbook: the last expeditions played in this browser (late plays from the archive are marked). */
function Logbook() {
  const t = useT();
  const [rows, setRows] = useState<{ day: string; label: string; late: boolean }[]>([]);
  useEffect(() => {
    const all = allResults();
    setRows(
      Object.entries(all)
        .filter(([, g]) => g?.fernweh?.done)
        .map(([day, g]) => ({ day, label: g.fernweh!.label, late: !!(g.fernweh!.state as Saved | undefined)?.late }))
        .sort((a, b) => (a.day < b.day ? 1 : -1))
        .slice(0, 14)
    );
  }, []);
  const today = utcDate();
  return (
    <section className="mt-8">
      <h2 className="fw-title !text-[26px]">{t("Logbuch", "Logbook")}</h2>
      <p className="mt-1 text-[15px]">{t("Deine letzten Expeditionen – antippen zum Nachsehen. Ältere Tage kannst du nachholen.", "Your recent expeditions – tap to look again. You can catch up on older days.")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {rows.map((r) => (
          <Link key={r.day} href={r.day === today ? "/fernweh" : `/fernweh?tag=${r.day}`} className="fw-opt">
            Nr. {dayNumber(r.day)} · {r.label}
            {r.late ? ` · ${t("nachgeholt", "late")}` : ""}
          </Link>
        ))}
        {[1, 2, 3].map((k) => {
          const d = new Date(Date.parse(today) - k * 86400000).toISOString().slice(0, 10);
          return rows.some((r) => r.day === d) ? null : (
            <Link key={d} href={`/fernweh?tag=${d}`} className="fw-opt opacity-80">
              Nr. {dayNumber(d)} · {t("nachholen", "catch up")}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NextExpedition() {
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
    <p className="mt-6 text-center font-bold">
      {t("Nächste Expedition in", "Next expedition in")} <span className="tabular-nums">{left}</span> ·{" "}
      <Link href="/fernweh/endlos" className="text-[#c9302c] underline-offset-4 hover:underline">
        {t("Bis dahin endlos reisen", "Travel endlessly till then")}
      </Link>
    </p>
  );
}
