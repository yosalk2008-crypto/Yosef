"use client";

/**
 * Fernweh – the daily expedition: five clues, one pin each on an unlabelled world map. The rarer the
 * fitting country, the more kilometres (40–100 per clue, 500 a day). Daily (one try, saved), endless and
 * a single practice clue. The facts and tiers live in lib/fernweh.ts.
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
import { CLUES_PER_DAY, KM, MISS, NOT_PINNABLE, TERRITORY_OWNER, TIERS, cluePool, expedition, factLine, kmOf, rankFor, tierOf, type Clue } from "@/lib/fernweh";

type Pick = { id: string | null; km: number };
type Saved = { picks: Pick[]; qStart: number | null; stars: number; late?: boolean };
type Opts = { secs: 0 | 30 | 60; hideName: boolean; hideBorders: boolean; search: boolean };

const SEA = "#a9d3dc";
const LAND = "#f6efe0";
const BORDER = "#b9a88a";

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

export function Fernweh({ mode }: { mode: "daily" | "endlos" | "uebung" }) {
  const lang = useLang();
  const t = useT();
  const daily = useDaily<Saved>("fernweh");
  const shapes = useAtlas();

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
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const f = () => setNarrow(window.innerWidth < 640);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [sel, setSel] = useState<{ id: string; at: { x: number; y: number } } | null>(null);
  const [note, setNote] = useState("");
  const [qStart, setQStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const i = phase === "reveal" ? picks.length - 1 : picks.length;
  const clue = clues[i];
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

  // optional clock
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
      const p = [...picks, { id, km: kmOf(clue, id) }];
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
    if (NOT_PINNABLE.has(id)) {
      setSel({ id, at });
      setNote(t("Dieses Gebiet zählt in Fernweh nicht – wähle ein anderes Land.", "This area doesn’t count in Wanderlust – pick another country."));
      return;
    }
    setSel({ id, at });
    setNote("");
  };
  const onSea = () => {
    if (phase !== "play") return;
    setSel(null);
    setNote(t("Das ist Meer – setz den Pin auf ein Land.", "That’s the sea – drop the pin on a country."));
  };

  // keyboard: Enter locks in / goes on
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key !== "Enter") return;
      if (phase === "play") lockIn();
      else if (phase === "reveal") next();
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

  if (!shapes || !clues.length) return <div className="min-h-[80vh]" aria-busy="true" />;

  const reveal = phase === "reveal" ? clues[picks.length - 1] : null;
  const last = picks[picks.length - 1];
  const fill = (id: string) => {
    const o = owner(id);
    if (reveal) {
      if (reveal.ids.includes(o)) return TIERS[tierOf(reveal, o)].color;
      if (last?.id === o) return MISS.color;
      return LAND;
    }
    if (sel && owner(sel.id) === o) return NOT_PINNABLE.has(o) ? "#d9d2c3" : "#f3b86d";
    return LAND;
  };
  const pin = (k: number, ppu: number) => {
    const at = phase === "play" ? sel?.at : null;
    if (!at) return null;
    const s = 1 / (k * ppu);
    return (
      <g transform={`translate(${at.x} ${at.y}) scale(${s})`} pointerEvents="none">
        <ellipse cx="0" cy="0" rx="7" ry="3" fill="#000" opacity=".25" />
        <path d="M0 0C-3-9-12-14-12-24a12 12 0 0124 0C12-14 3-9 0 0z" fill="#d6453d" stroke="#2c2a35" strokeWidth="2" />
        <circle cy="-24" r="4.5" fill="#fff" />
      </g>
    );
  };
  const kmSoFar = picks.reduce((s, x) => s + x.km, 0);
  const selName = sel ? cNameOf(owner(sel.id)) + (TERRITORY_OWNER[sel.id] ? ` (${t("über", "via")} ${sel.id === "GRL" ? t("Grönland", "Greenland") : sel.id === "FLK" ? t("Falklandinseln", "Falklands") : sel.id === "PRI" ? "Puerto Rico" : sel.id === "NCL" ? t("Neukaledonien", "New Caledonia") : t("Überseegebiet", "overseas territory")})` : "") : "";

  return (
    <div className="fw-wrap mx-auto max-w-5xl px-3 pb-16 pt-3 sm:px-4 sm:pt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[30px] font-semibold leading-none sm:text-[40px]">{t("Fernweh", "Wanderlust")}</h1>
          <p className="mt-1 font-semibold text-muted">
            {mode === "daily" ? t(`Expedition #${dayNumber(daily.day)}`, `Expedition #${dayNumber(daily.day)}`) : mode === "endlos" ? t("Endlos", "Endless") : t("Übungshinweis", "Practice clue")}
            {stars > 0 && <span className="ml-1 text-orange">{"★".repeat(stars)}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode !== "daily" && <Link href="/fernweh" className="chip !rounded-md">{t("Tagesexpedition", "Daily expedition")}</Link>}
          {mode !== "endlos" && <Link href="/fernweh/endlos" className="chip !rounded-md">{t("Endlos", "Endless")}</Link>}
          {mode !== "uebung" && <Link href="/fernweh/uebung" className="chip !rounded-md">{t("Üben", "Practice")}</Link>}
        </div>
      </div>

      {(phase === "play" || phase === "reveal") && clue && (
        <div className="fw-clue card mb-3 flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <span className="fw-step">{t(`Hinweis ${picks.length + (phase === "reveal" ? 0 : 1)} / ${total}`, `Clue ${picks.length + (phase === "reveal" ? 0 : 1)} / ${total}`)}</span>
          <p key={i} className="fw-cluetext order-last min-w-0 basis-full text-[20px] font-semibold leading-snug sm:order-none sm:basis-0 sm:flex-1 sm:text-[24px]">{lang === "en" ? clue.en : clue.de}</p>
          <span className="ml-auto flex items-center gap-2 sm:ml-0">
          <span className="fw-km" aria-label={t("Kilometer", "Kilometres")}>{kmSoFar} km</span>
          {opts.secs > 0 && phase === "play" && <span className={`fw-time${left < 10000 ? " low" : ""}`}>{Math.ceil(left / 1000)} s</span>}
          </span>
        </div>
      )}

      {phase !== "camp" && (
        <div className="fw-map relative">
          <MapView
            shapes={shapes}
            fill={fill}
            stroke={BORDER}
            showBorders={!opts.hideBorders || phase === "reveal"}
            onPick={phase === "play" ? onPick : undefined}
            onSea={onSea}
            dots={(id) => !!BY_ID_ALL[id]}
            overlay={pin}
            aspect={narrow ? 1.35 : 1.75}
            className="fw-atlas"
            label={t("Weltkarte ohne Beschriftung", "Unlabelled world map")}
          />
          {phase === "intro" && <Intro mode={mode} opts={opts} setOpt={setOpt} onStart={start} done={!!daily.saved?.done && mode === "daily"} onCamp={() => setPhase("camp")} />}
        </div>
      )}

      {phase === "play" && (
        <div className="fw-bar card mt-3 flex flex-wrap items-center gap-3 p-3 sm:p-4">
          <div className="min-w-0 flex-1 font-semibold" aria-live="polite">
            {note ? <span className="text-bad">{note}</span> : sel ? (opts.hideName ? t("Pin gesetzt – Land wird nicht angezeigt", "Pin dropped – country hidden") : <>📍 {selName}</>) : <span className="text-muted">{t("Tippe auf ein Land. Du kannst den Pin umsetzen, bis du ihn einloggst.", "Tap a country. You can move the pin until you lock it in.")}</span>}
          </div>
          {opts.search && (
            <div className="w-full sm:w-72">
              <Picker options={pickOpts} onPick={(id) => onPick(id, centroidOf(shapes, id))} placeholder={t("Land suchen …", "Search a country …")} buttonLabel={t("Wählen", "Pick")} />
            </div>
          )}
          <button type="button" className="btn-primary" disabled={!sel || NOT_PINNABLE.has(sel.id)} onClick={() => lockIn()}>
            {t("Pin einloggen", "Lock in pin")}
          </button>
        </div>
      )}

      {phase === "reveal" && reveal && <Reveal clue={reveal} pick={last} nameOf={cNameOf} onNext={next} lastOne={picks.length >= total} practice={mode === "uebung"} />}

      {phase === "camp" && (
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
      )}
    </div>
  );
}

function centroidOf(shapes: Shape[], id: string): { x: number; y: number } {
  // the search picker has no map position – the pin is then only shown as a highlighted country
  void shapes;
  void id;
  return { x: -9999, y: -9999 };
}

function Intro({ mode, opts, setOpt, onStart, done, onCamp }: { mode: string; opts: Opts; setOpt: (o: Partial<Opts>) => void; onStart: () => void; done: boolean; onCamp: () => void }) {
  const t = useT();
  return (
    <div className="fw-intro">
      <div className="card max-w-lg p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">{mode === "uebung" ? t("Ein Übungshinweis", "One practice clue") : t("Fünf Hinweise, fünf Pins", "Five clues, five pins")}</h2>
        <ul className="mt-2 space-y-1.5 text-[15px] leading-snug">
          <li>{t("Setz für jeden Hinweis einen Pin auf ein passendes Land – die Karte hat keine Namen.", "Drop one pin per clue on a country that fits – the map has no names.")}</li>
          <li>{t("Je weniger naheliegend dein Land, desto weiter kommst du: 40, 55, 70, 85 oder 100 km. Bis zu 500 km am Tag.", "The less obvious your country, the further you get: 40, 55, 70, 85 or 100 km. Up to 500 km a day.")}</li>
          <li>{t("Ein Versuch pro Hinweis. Länder dürfen bei mehreren Hinweisen vorkommen.", "One try per clue. Countries may fit more than one clue.")}</li>
          <li className="text-muted">{t("Überseegebiete zählen zu ihrem Land (Grönland = Dänemark). Die Fakten stammen aus den Länderdaten der Seite (Weltbank, CIA World Factbook).", "Overseas territories count as their country (Greenland = Denmark). Facts come from the site’s country data (World Bank, CIA World Factbook).")}</li>
        </ul>
        <fieldset className="mt-3">
          <legend className="text-sm font-bold text-muted">{t("Schwierigkeit (★ auf dem Teilen-Bild)", "Difficulty (★ on the share card)")}</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {([0, 60, 30] as const).map((s) => (
              <button key={s} type="button" className={`chip !rounded-md ${opts.secs === s ? "!bg-ink !text-white" : ""}`} aria-pressed={opts.secs === s} onClick={() => setOpt({ secs: s })}>
                {s ? t(`${s} s pro Hinweis`, `${s} s per clue`) : t("Ohne Uhr", "No clock")}
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[15px] font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[#ee8a2f]" checked={opts.hideName} onChange={(e) => setOpt({ hideName: e.target.checked })} />
            {t("Ländername unter dem Pin ausblenden", "Hide the country name under the pin")}
          </label>
          <label className="mt-1 flex items-center gap-2 text-[15px] font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[#ee8a2f]" checked={opts.hideBorders} onChange={(e) => setOpt({ hideBorders: e.target.checked })} />
            {t("Ländergrenzen ausblenden", "Hide borders")}
          </label>
          <label className="mt-1 flex items-center gap-2 text-[15px] font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[#ee8a2f]" checked={opts.search} onChange={(e) => setOpt({ search: e.target.checked })} />
            {t("Länder auch per Suche wählen (Tastatur)", "Also pick countries by search (keyboard)")}
          </label>
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-2">
          {done ? (
            <button type="button" className="btn-primary" onClick={onCamp}>{t("Zum Camp", "To the camp")}</button>
          ) : (
            <button type="button" className="btn-primary" onClick={onStart}>{t("Expedition starten", "Start the expedition")}</button>
          )}
        </div>
      </div>
    </div>
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

function Reveal({ clue, pick, nameOf, onNext, lastOne, practice }: { clue: Clue; pick: Pick; nameOf: (id: string) => string; onNext: () => void; lastOne: boolean; practice: boolean }) {
  const t = useT();
  const lang = useLang();
  const hit = !!pick.id && clue.ids.includes(pick.id);
  return (
    <div className="fw-reveal card mt-3 p-4 sm:p-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <TierChip tier={hit ? tierOf(clue, pick.id!) : -1} />
        <p className="font-semibold">
          {pick.id ? (hit ? t(`${nameOf(pick.id)} passt!`, `${nameOf(pick.id)} fits!`) : t(`${nameOf(pick.id)} passt nicht.`, `${nameOf(pick.id)} doesn’t fit.`)) : t("Kein Land gewählt.", "No country picked.")}
        </p>
      </div>
      {pick.id && <p className="mt-1 text-[15px] text-muted">{nameOf(pick.id)}: {factLine(pick.id, lang)}</p>}
      <p className="mt-2 text-[15px]">
        {t(`${clue.ids.length} Länder hätten gepasst – auf der Karte nach Seltenheit eingefärbt.`, `${clue.ids.length} countries would have fitted – coloured by rarity on the map.`)}
        {clue.src && <span className="text-muted"> {t("Quelle:", "Source:")} {clue.src}.</span>}
      </p>
      <Legend />
      <button type="button" className="btn-primary mt-3" onClick={onNext} autoFocus>
        {lastOne ? (practice ? t("Fertig", "Done") : t("Ins Camp", "To the camp")) : t("Nächster Hinweis", "Next clue")}
      </button>
    </div>
  );
}

function Legend() {
  const lang = useLang();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[13px] font-bold">
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
    if (c?.ids.includes(o)) return TIERS[tierOf(c, o)].color;
    if (picks[tab]?.id === o) return MISS.color;
    return LAND;
  };
  return (
    <section className="mt-2">
      {mode === "daily" ? (
        <ResultCard title={t("Expeditionsbericht", "Expedition report")} score={`${km} / 500 km`} share={share} isToday={isToday} current="fernweh">
          {rank}
        </ResultCard>
      ) : (
        <div className="card p-5 sm:p-6">
          <p className="font-display text-lg font-semibold text-muted">{t("Expeditionsbericht", "Expedition report")}</p>
          <p className="font-display text-5xl font-semibold">{km} / {max} km</p>
          <p className="mt-1 text-muted">{rank}</p>
          <button type="button" className="btn-primary mt-4" onClick={onAgain}>
            {mode === "uebung" ? t("Neuer Übungshinweis", "New practice clue") : t("Neue Expedition", "New expedition")}
          </button>
        </div>
      )}

      <h2 className="mt-6 text-[26px] font-semibold">{t("Die Lösungen", "The answers")}</h2>
      <div className="mt-2 flex flex-wrap gap-2" role="tablist">
        {clues.map((_, k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`chip !rounded-md ${tab === k ? "!bg-ink !text-white" : ""}`} onClick={() => setTab(k)}>
            {k + 1} · {picks[k]?.km ?? 0} km
          </button>
        ))}
      </div>
      {c && (
        <div className="mt-3">
          <p className="text-[19px] font-semibold">{lang === "en" ? c.en : c.de}</p>
          <p className="mt-1 text-[15px]">
            {t("Dein Pin:", "Your pin:")} <strong>{picks[tab]?.id ? nameOf(picks[tab].id!) : "—"}</strong> <TierChip tier={picks[tab]?.id && c.ids.includes(picks[tab].id!) ? tierOf(c, picks[tab].id!) : -1} />
          </p>
          <div className="mt-2">
            <MapView shapes={shapes} fill={fill} stroke={BORDER} dots={(id) => !!BY_ID_ALL[id]} aspect={1.9} className="fw-atlas" label={t("Lösungskarte", "Answer map")} />
          </div>
          <Legend />
          <div className="mt-3 space-y-1.5">
            {[4, 3, 2, 1, 0].map((tier) => {
              const ids = c.ids.filter((id) => tierOf(c, id) === tier);
              if (!ids.length) return null;
              return (
                <p key={tier} className="text-[15px] leading-relaxed">
                  <TierChip tier={tier} />{" "}
                  {ids.map((id) => nameOf(id)).join(", ")}
                </p>
              );
            })}
          </div>
          {c.src && <p className="mt-1 text-sm text-muted">{t("Quelle:", "Source:")} {c.src}</p>}
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
  const [why, setWhy] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) return <p className="mt-3 text-[15px] font-semibold text-ok">{t("Danke – wir schauen uns das an.", "Thanks – we’ll look into it.")}</p>;
  if (!open)
    return (
      <button type="button" className="mt-3 text-sm font-bold text-brand underline-offset-4 hover:underline" onClick={() => setOpen(true)}>
        {t("Sollte ein anderes Land zählen?", "Should another country count?")}
      </button>
    );
  return (
    <form
      className="card mt-3 grid gap-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const k = "kt-fernweh-einspruch";
          const a = JSON.parse(localStorage.getItem(k) || "[]");
          a.push({ day, clue: clue.key, land: land.slice(0, 60), why: why.slice(0, 300), at: new Date().toISOString() });
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
        <textarea className="input mt-1 min-h-[80px]" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} />
      </label>
      <button type="submit" className="btn-primary justify-self-start">{t("Melden", "Report")}</button>
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
      <h2 className="text-[24px] font-semibold">{t("Logbuch", "Logbook")}</h2>
      <p className="text-muted">{t("Deine letzten Expeditionen – antippen zum Nachsehen. Ältere Tage kannst du nachholen.", "Your recent expeditions – tap to look again. You can catch up on older days.")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {rows.map((r) => (
          <Link key={r.day} href={r.day === today ? "/fernweh" : `/fernweh?tag=${r.day}`} className="chip !rounded-md">
            #{dayNumber(r.day)} · {r.label}
            {r.late ? ` · ${t("nachgeholt", "late")}` : ""}
          </Link>
        ))}
        {[1, 2, 3].map((n) => {
          const d = new Date(Date.parse(today) - n * 86400000).toISOString().slice(0, 10);
          return rows.some((r) => r.day === d) ? null : (
            <Link key={d} href={`/fernweh?tag=${d}`} className="chip !rounded-md opacity-80">
              #{dayNumber(d)} · {t("nachholen", "catch up")}
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
    <p className="mt-6 text-center font-semibold text-muted">
      {t("Nächste Expedition in", "Next expedition in")} <span className="font-display text-ink">{left}</span> ·{" "}
      <Link href="/fernweh/endlos" className="text-brand underline-offset-4 hover:underline">
        {t("Bis dahin endlos reisen", "Travel endlessly till then")}
      </Link>
    </p>
  );
}
