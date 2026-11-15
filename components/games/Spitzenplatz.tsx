"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BY_ID, flagUrl, cName } from "@/lib/data/countries";
import { dayNumber, formatDay } from "@/lib/daily";
import { METRIC_ICON, metricsOf, val, type MetricKey } from "@/lib/metrics";
import { useDaily } from "@/lib/useDaily";
import { useMpDaily } from "@/lib/mpDaily";
import { GAME_BY_KEY } from "@/lib/games";
import { GameShell, ResultCard } from "../GameShell";
import { GameArt } from "../GameArt";
import { SolutionRow, Solutions } from "../Solutions";
import { useLang, useT } from "@/lib/i18n";
import { REGIONS, band, bandEmoji, dailyRound, optimum, randomRound, rank, regionCountries, regionName, type RegionKey, type Round } from "@/lib/spitzenplatz";

type S = { picks: MetricKey[] };
type View = "start" | "welt" | "europa" | "regionen" | "endlos";

/** Kept for older imports (multiplayer solution card). */
export const pickCountries = (day: string) => dailyRound(day, "welt").ids;

const BAND_CLS = ["sp-b0", "sp-b1", "sp-b2", "sp-b3"];
const sum = (r: Round, picks: MetricKey[]) => picks.reduce((s, k, j) => s + rank(k, r.ids[j], r.region), 0);

/** Progress of the European daily lives next to the official (world) daily. */
function useLocal(key: string) {
  const [v, setV] = useState<MetricKey[] | null>(null);
  useEffect(() => {
    try {
      setV(JSON.parse(localStorage.getItem(key) || "null")?.picks ?? []);
    } catch {
      setV([]);
    }
  }, [key]);
  const save = useCallback(
    (picks: MetricKey[]) => {
      setV(picks);
      try {
        localStorage.setItem(key, JSON.stringify({ picks }));
      } catch {}
    },
    [key]
  );
  return [v, save] as const;
}

export function Spitzenplatz() {
  const mp = useMpDaily();
  const lang = useLang();
  const t = useT();
  const { day, isToday, loaded, saved, persist } = useDaily<S>("spitzenplatz");
  const [view, setView] = useState<View>(mp ? "welt" : "start");
  const [mode, setMode] = useState<"welt" | "europa">("welt");

  const world = useMemo(() => dailyRound(day, "welt"), [day]);
  const europe = useMemo(() => dailyRound(day, "europa"), [day]);
  const [wLocal, setWLocal] = useState<MetricKey[] | null>(null);
  const wPicks = wLocal ?? saved?.state?.picks ?? [];
  const [ePicks, setEPicks] = useLocal(`kt-spitze:${day}:europa`);

  // endless mode
  const [region, setRegion] = useState<RegionKey>("welt");
  const [round, setRound] = useState<Round | null>(null);
  const [nPicks, setNPicks] = useState<MetricKey[]>([]);
  const [stats, setStats] = useState({ rounds: 0, perfect: 0, over: 0 });

  const go = (v: View) => {
    setView(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickWorld = (k: MetricKey) => {
    const next = [...wPicks, k];
    setWLocal(next);
    const s = sum(world, next);
    const best = optimum(world).total;
    persist({
      done: next.length >= world.ids.length,
      score: s,
      max: best,
      label: t(`${s} Punkte`, `${s} points`),
      share: `${t("Spitzenplatz", "Top Spot")} #${dayNumber(day)} · ${t(`${s} Punkte (Bestwert ${best})`, `${s} points (best possible ${best})`)}\n${next.map((kk, j) => bandEmoji[band(rank(kk, world.ids[j], "welt"), "welt")]).join("")}`,
      state: { picks: next },
    });
  };

  const startEndless = (r: RegionKey) => {
    setRegion(r);
    setRound(randomRound(r));
    setNPicks([]);
    setStats({ rounds: 0, perfect: 0, over: 0 });
    go("endlos");
  };
  const pickEndless = (k: MetricKey) => {
    if (!round) return;
    const next = [...nPicks, k];
    setNPicks(next);
    if (next.length >= round.ids.length) {
      const diff = sum(round, next) - optimum(round).total;
      setStats((s) => ({ rounds: s.rounds + 1, perfect: s.perfect + (diff === 0 ? 1 : 0), over: s.over + diff }));
    }
  };
  const nextRound = () => {
    setRound(randomRound(region));
    setNPicks([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back =
    view !== "start" && !mp ? (
      <button type="button" onClick={() => go(view === "endlos" ? "regionen" : "start")} className="grid h-11 w-11 place-items-center rounded-full hover:bg-line" aria-label={t("Zurück", "Back")}>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
    ) : null;

  const rules =
    lang === "en" ? (
      <>
        <p>Countries appear one after another. Put each one into one of the categories – <strong>each category can only be used once</strong>.</p>
        <p>You get the country’s rank in that category as points (1st place = 1 point). <strong>Fewer points are better.</strong> In Europe, ranks are counted among European countries.</p>
        <p>In <strong>endless mode</strong> you pick a region and play round after round – with new categories every time.</p>
      </>
    ) : (
      <>
        <p>Nacheinander erscheinen Länder. Leg jedes in eine der Kategorien – <strong>jede Kategorie gibt es nur einmal</strong>.</p>
        <p>Du bekommst den Rang des Landes in dieser Kategorie als Punkte (Platz 1 = 1 Punkt). <strong>Weniger Punkte sind besser.</strong> Bei Europa zählt der Platz unter den europäischen Ländern.</p>
        <p>Im <strong>Endlosmodus</strong> wählst du eine Region und spielst Runde um Runde – jedes Mal mit neuen Kategorien.</p>
      </>
    );

  const variant = view === "start" || view === "regionen" ? "none" : "compact";

  return (
    <GameShell game="spitzenplatz" day={day} isToday={isToday} rules={rules} variant={mp ? "default" : variant} left={back}>
      {!loaded || ePicks == null ? (
        <div className="h-96 animate-pulse rounded-3xl bg-line" />
      ) : view === "start" ? (
        <Start
          day={day}
          mode={mode}
          setMode={setMode}
          progress={mode === "welt" ? [wPicks.length, world.ids.length] : [ePicks.length, europe.ids.length]}
          onPlay={() => go(mode)}
          onEndless={() => go("regionen")}
        />
      ) : view === "regionen" ? (
        <Regions onPick={startEndless} onBack={() => go("start")} />
      ) : view === "welt" ? (
        <Daily round={world} picks={wPicks} onPick={pickWorld} share={saved?.share || ""} isToday={isToday} />
      ) : view === "europa" ? (
        <Daily
          round={europe}
          picks={ePicks}
          onPick={(k) => setEPicks([...ePicks, k])}
          share={`${t("Spitzenplatz Europa", "Top Spot Europe")} #${dayNumber(day)} · ${t(`${sum(europe, ePicks)} Punkte (Bestwert ${optimum(europe).total})`, `${sum(europe, ePicks)} points (best possible ${optimum(europe).total})`)}\n${ePicks.map((k, j) => bandEmoji[band(rank(k, europe.ids[j], "europa"), "europa")]).join("")}`}
          isToday={isToday}
        />
      ) : round ? (
        <>
          <div className="mx-auto mb-4 flex max-w-md flex-wrap items-center justify-between gap-2 text-sm font-semibold">
            <span className="rounded-full bg-[#f3b86d] px-3 py-1">
              ∞ {regionName(region, lang)} · {t("Runde", "Round")} {stats.rounds + (nPicks.length >= round.ids.length ? 0 : 1)}
            </span>
            {stats.rounds > 0 && (
              <span className="text-muted">
                {t("Perfekt", "Perfect")}: {stats.perfect} · {t("über Bestwert", "over best")}: +{stats.over}
              </span>
            )}
          </div>
          <Board key={round.ids.join()} round={round} picks={nPicks} onPick={pickEndless} />
          {nPicks.length >= round.ids.length && <RoundEnd round={round} picks={nPicks} onNext={nextRound} />}
        </>
      ) : null}
    </GameShell>
  );
}

function Start({
  day,
  mode,
  setMode,
  progress,
  onPlay,
  onEndless,
}: {
  day: string;
  mode: "welt" | "europa";
  setMode: (m: "welt" | "europa") => void;
  progress: [number, number];
  onPlay: () => void;
  onEndless: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [done, total] = progress;
  return (
    <section className="sp-hero" style={{ background: GAME_BY_KEY.spitzenplatz.bg }}>
      <GameArt game="spitzenplatz" className="sp-float h-28 w-40 sm:h-32 sm:w-44" />
      <h1 className="mt-4 font-display text-[40px] font-semibold leading-none sm:text-5xl">{t("Spitzenplatz", "Top Spot")}</h1>
      <div className="sp-seg mt-6" role="radiogroup" aria-label={t("Spielfeld", "Field")}>
        {(["welt", "europa"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={mode === m ? "on" : ""}>
            {regionName(m, lang)}
          </button>
        ))}
      </div>
      <button type="button" onClick={onPlay} className="sp-btn mt-4">
        {done >= total ? t("Ergebnis ansehen", "See result") : done > 0 ? t(`Weiterspielen (${done}/${total})`, `Continue (${done}/${total})`) : t("Spielen", "Play")}
      </button>
      <button type="button" onClick={onEndless} className="sp-btn sp-btn-alt mt-3">
        <span className="font-display text-3xl leading-none" aria-hidden>
          ∞
        </span>
        <span className="text-left leading-tight">
          <span className="block">{t("Endlos spielen", "Endless mode")}</span>
          <span className="block text-[13px] font-semibold text-muted">{t("10 Regionen, neue Kategorien jede Runde", "10 regions, new categories every round")}</span>
        </span>
      </button>
      <p className="mt-5 font-display text-lg font-semibold">{formatDay(day, lang)}</p>
      <p className="text-sm font-semibold text-ink/60">
        {t("Nr.", "No.")} {dayNumber(day)}
      </p>
      <button type="button" onClick={() => window.dispatchEvent(new Event("kt-help"))} className="mt-3 text-sm font-semibold underline underline-offset-4">
        {t("So geht's", "How to play")}
      </button>
    </section>
  );
}

function Regions({ onPick, onBack }: { onPick: (r: RegionKey) => void; onBack: () => void }) {
  const t = useT();
  const lang = useLang();
  return (
    <section className="sp-hero" style={{ background: GAME_BY_KEY.spitzenplatz.bg }}>
      <p className="font-display text-6xl leading-none" aria-hidden>
        ∞
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{t("Endlos spielen", "Endless mode")}</h1>
      <p className="mt-2 max-w-sm text-center font-semibold text-ink/70">{t("Wähle eine Region. Die Plätze zählen innerhalb der Region, die Kategorien wechseln jede Runde.", "Pick a region. Ranks count within the region, and the categories change every round.")}</p>
      <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-2.5">
        {REGIONS.map((r) => (
          <button key={r.key} type="button" onClick={() => onPick(r.key)} className="sp-btn sp-region">
            <span className="text-2xl" aria-hidden>
              {r.emoji}
            </span>
            <span className="text-left leading-tight">
              <span className="block">{r[lang]}</span>
              <span className="block text-[12px] font-semibold text-muted">
                {regionCountries(r.key).length} {t("Länder", "countries")}
              </span>
            </span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onBack} className="mt-5 text-sm font-semibold underline underline-offset-4">
        {t("Zurück zum Tagesspiel", "Back to the daily game")}
      </button>
    </section>
  );
}

/** Flag, name and the column of categories. */
function Board({ round, picks, onPick }: { round: Round; picks: MetricKey[]; onPick: (k: MetricKey) => void }) {
  const lang = useLang();
  const t = useT();
  const M = metricsOf(lang);
  const i = picks.length;
  const over = i >= round.ids.length;
  const cur = !over ? BY_ID[round.ids[i]] : null;
  const total = sum(round, picks);
  const [hit, setHit] = useState<MetricKey | null>(null);
  const size = regionCountries(round.region).length;
  const field = t(`Platz unter ${size} Ländern`, `rank among ${size} countries`);

  const choose = (k: MetricKey) => {
    if (over || picks.includes(k)) return;
    setHit(k);
    setTimeout(() => setHit(null), 900);
    onPick(k);
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <ol className="flex gap-1.5" aria-label={t("Fortschritt", "Progress")}>
          {round.ids.map((id, j) => (
            <li key={id} className={`sp-dot ${j < i ? "done" : j === i ? "now" : ""}`} />
          ))}
        </ol>
        <p className="font-display text-lg font-semibold">
          {total} <span className="text-sm text-muted">{t("Punkte", "points")}</span>
        </p>
      </div>
      {cur ? (
        <div key={cur.id} className="sp-country mb-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagUrl(cur.iso2)} alt="" className="mx-auto h-24 w-auto max-w-[180px] rounded-md object-contain shadow-[0_3px_0_rgb(0_0_0/0.12)] sm:h-28" />
          <p className="mt-2 font-display text-2xl font-semibold">{cName(cur, lang)}</p>
          <p className="text-[13px] font-semibold text-muted">
            {t("Land", "Country")} {i + 1} {t("von", "of")} {round.ids.length} · {field}
          </p>
        </div>
      ) : (
        <p className="sp-country mb-4 text-center font-display text-2xl font-semibold">{t("Alle Länder verteilt!", "All countries placed!")}</p>
      )}
      <ul className="grid gap-2">
        {round.cats.map((k) => {
          const j = picks.indexOf(k);
          const c = j >= 0 ? BY_ID[round.ids[j]] : null;
          const r = c ? rank(k, c.id, round.region) : null;
          return (
            <li key={k}>
              <button type="button" disabled={!!c || over} onClick={() => choose(k)} className={`sp-cat ${c ? "used" : ""} ${hit === k ? "hit" : ""}`}>
                <span className="sp-ico" aria-hidden>
                  {METRIC_ICON[k]}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-bold leading-tight">{M[k].label}</span>
                  {c && (
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] font-semibold text-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flagUrl(c.iso2)} alt="" className="h-3.5 w-auto rounded-sm" />
                      {cName(c, lang)} · {M[k].fmt(val(c, k)!)}
                    </span>
                  )}
                </span>
                {r != null && <span className={`sp-rank ${BAND_CLS[band(r, round.region)]}`}>#{r}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Daily({ round, picks, onPick, share, isToday }: { round: Round; picks: MetricKey[]; onPick: (k: MetricKey) => void; share: string; isToday: boolean }) {
  const lang = useLang();
  const t = useT();
  const M = metricsOf(lang);
  const over = picks.length >= round.ids.length;
  const opt = useMemo(() => optimum(round), [round]);
  const total = sum(round, picks);
  return (
    <>
      <Board round={round} picks={picks} onPick={onPick} />
      {over && (
        <div className="mx-auto max-w-xl">
          <Solutions
            note={
              lang === "en" ? (
                <>The best possible assignment gives <strong className="text-ink">{opt.total} points</strong>, you have {total}. Fewer is better.</>
              ) : (
                <>Die bestmögliche Verteilung ergibt <strong className="text-ink">{opt.total} Punkte</strong>, du hast {total}. Weniger ist besser.</>
              )
            }
          >
            {round.ids.map((id, j) => {
              const c = BY_ID[id];
              const mine = picks[j];
              const ideal = opt.plan[j];
              const top = [...round.cats].sort((x, y) => rank(x, id, round.region) - rank(y, id, round.region))[0];
              return (
                <SolutionRow
                  key={id}
                  iso2={c.iso2}
                  title={cName(c, lang)}
                  rightLabel={t("Optimal", "Best")}
                  right={`${M[ideal].label} (${t("Platz", "rank")} ${rank(ideal, id, round.region)})`}
                  yours={`${M[mine].label} (${t("Platz", "rank")} ${rank(mine, id, round.region)})`}
                  extra={
                    top !== ideal ? (
                      <p className="text-sm text-muted">
                        {t("Stärkste Kategorie", "Strongest category")}: {M[top].label} ({t("Platz", "rank")} {rank(top, id, round.region)})
                      </p>
                    ) : null
                  }
                />
              );
            })}
          </Solutions>
          <ResultCard title={round.region === "europa" ? t("Deine Punkte · Europa", "Your points · Europe") : t("Deine Punkte", "Your points")} score={`${total}`} share={share} isToday={isToday} current="spitzenplatz" />
        </div>
      )}
    </>
  );
}

function RoundEnd({ round, picks, onNext }: { round: Round; picks: MetricKey[]; onNext: () => void }) {
  const lang = useLang();
  const t = useT();
  const M = metricsOf(lang);
  const opt = useMemo(() => optimum(round), [round]);
  const total = sum(round, picks);
  const diff = total - opt.total;
  return (
    <section className="sp-end mx-auto mt-5 max-w-md" aria-live="polite">
      <p className="font-display text-sm font-semibold text-ink/70">{diff === 0 ? t("Perfekte Runde!", "Perfect round!") : t("Runde geschafft", "Round done")}</p>
      <p className="font-display text-4xl font-semibold">
        {total} <span className="text-lg text-ink/60">/ {t("Bestwert", "best")} {opt.total}</span>
      </p>
      {diff > 0 && (
        <ul className="mt-3 space-y-1 text-[14px] font-semibold">
          {round.ids.map((id, j) =>
            picks[j] !== opt.plan[j] ? (
              <li key={id} className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(BY_ID[id].iso2)} alt="" className="h-3.5 w-auto rounded-sm" />
                {cName(BY_ID[id], lang)}: {M[opt.plan[j]].label} ({t("Platz", "rank")} {rank(opt.plan[j], id, round.region)})
              </li>
            ) : null
          )}
        </ul>
      )}
      <button type="button" onClick={onNext} className="sp-btn mt-4 w-full">
        {t("Nächste Runde", "Next round")}
      </button>
    </section>
  );
}
