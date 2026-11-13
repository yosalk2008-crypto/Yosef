"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { QUIZ_TYPES, gTagline, gTitle, type QuizType } from "@/lib/games";
import { useHref, useLang, useT } from "@/lib/i18n";
import { REGIONS, entitiesFor, regionLabel, splitLabel, splitsOf, type RegionKey } from "@/lib/data/regions";

const LENGTHS = [
  { v: "10", label: "10" },
  { v: "25", label: "25" },
  { v: "50", label: "50" },
  { v: "alle", label: "Alle" },
];

export function QuizSetup() {
  const router = useRouter();
  const sp = useSearchParams();
  const lang = useLang();
  const t = useT();
  const href = useHref();
  const [typ, setTyp] = useState<QuizType>("flaggen");
  const [region, setRegion] = useState<RegionKey>("welt");
  const [n, setN] = useState("10");
  const [borders, setBorders] = useState(true);
  const [oneLife, setOneLife] = useState(false);
  const [input, setInput] = useState<"auswahl" | "eingabe">("auswahl");
  // opened from a region tile: the region is already chosen, so the region list is not shown again
  const [fixed, setFixed] = useState(false);

  useEffect(() => {
    const ty = sp.get("typ");
    if (ty && QUIZ_TYPES.some((q) => q.key === ty)) setTyp(ty as QuizType);
    const r = sp.get("region");
    if (r && REGIONS.some((x) => x.key === r)) {
      setRegion(r as RegionKey);
      setFixed(true);
      if (REGIONS.find((x) => x.key === r)!.kind === "states" && (!ty || ty === "flaggen")) setTyp("karte");
    }
  }, [sp]);

  const info = QUIZ_TYPES.find((q) => q.key === typ)!;
  const fits = (r: (typeof REGIONS)[number], t: QuizType) => {
    const inf = QUIZ_TYPES.find((q) => q.key === t)!;
    return (!inf.countriesOnly || r.kind === "countries") && !(t === "hauptstaedte" && r.noCapitals);
  };
  const regions = REGIONS.filter((r) => fits(r, typ));
  const cur = REGIONS.find((r) => r.key === region)!;
  useEffect(() => {
    if (regions.some((r) => r.key === region)) return;
    // fixed region: keep it and fall back to a game type that works for it; otherwise fall back to "Welt"
    if (fixed) setTyp("karte");
    else setRegion("welt");
  }, [regions, region, fixed]);
  const count = entitiesFor(region).length;
  const splits = splitsOf(region).filter((r) => regions.some((x) => x.key === r.key));
  const types = fixed ? QUIZ_TYPES.filter((q) => fits(cur, q.key) || splitsOf(region).some((x) => fits(x, q.key))) : QUIZ_TYPES;
  let step = 1;

  const start = () => {
    const q = new URLSearchParams({ region });
    if (typ !== "alle-nennen") q.set("n", n);
    if (typ === "karte") {
      if (!borders) q.set("grenzen", "aus");
      if (oneLife) q.set("leben", "1");
    }
    if (typ === "hauptstaedte" && input === "eingabe") q.set("modus", "eingabe");
    router.push(href(`/quiz/${typ}?${q}`));
  };

  const title = fixed ? regionLabel(cur.parent ? REGIONS.find((r) => r.key === cur.parent)! : cur, lang) : t("Unbegrenzte Quizze", "Unlimited quizzes");
  return (
    <>
    <h1 className="text-3xl font-display font-semibold tracking-tight sm:text-4xl">{title}</h1>
    <p className="mt-2 text-muted">{fixed ? t("Wähle Spielart und Länge – so oft du willst.", "Pick a quiz type and length – as often as you like.") : t("Wähle Spielart, Region und Länge – so oft du willst.", "Pick a quiz type, region and length – as often as you like.")}</p>
    <div className="mt-8 space-y-8">
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-muted">{step++} · {t("Spielart", "Quiz type")}</legend>
        <div className={`grid gap-2 ${types.length === 5 ? "sm:grid-cols-5" : types.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          {types.map((q) => (
            <button
              key={q.key}
              type="button"
              aria-pressed={typ === q.key}
              onClick={() => setTyp(q.key)}
              className={`rounded-xl border-2 p-3 text-left transition ${typ === q.key ? "border-ink bg-white shadow-sm" : "border-transparent bg-white hover:border-line"}`}
            >
              <span className="block font-bold">{gTitle(q, lang)}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{gTagline(q, lang)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {fixed ? (
        splits.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-sm font-bold text-muted">{step++} · {t("Aufteilung", "Split")}</legend>
            <div className="flex flex-wrap gap-2">
              {splits.map((r) => (
                <button key={r.key} type="button" aria-pressed={region === r.key} onClick={() => setRegion(r.key)} className="chip">
                  {splitLabel(r, lang)}
                </button>
              ))}
            </div>
          </fieldset>
        )
      ) : (
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-muted">{step++} · {t("Region", "Region")}</legend>
        <div className="flex flex-wrap gap-2">
          {regions
            .filter((r) => !r.parent)
            .map((r) => (
              <button key={r.key} type="button" aria-pressed={region === r.key || REGIONS.find((x) => x.key === region)?.parent === r.key} onClick={() => setRegion(r.key)} className="chip">
                {regionLabel(r, lang)}
              </button>
            ))}
        </div>
        {splits.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-muted">{t("Aufteilung", "Split")}:</span>
            {splits.map((r) => (
              <button key={r.key} type="button" aria-pressed={region === r.key} onClick={() => setRegion(r.key)} className="chip">
                {splitLabel(r, lang)}
              </button>
            ))}
          </div>
        )}
        {info.countriesOnly && <p className="mt-2 text-xs text-muted">{t("Flaggen gibt es nur für Länder.", "Flags only exist for countries.")}</p>}
      </fieldset>
      )}

      {typ !== "alle-nennen" ? (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-muted">{step++} · {t("Anzahl Fragen", "Number of questions")}</legend>
          <div className="flex flex-wrap gap-2">
            {LENGTHS.map((l) => (
              <button key={l.v} type="button" aria-pressed={n === l.v} onClick={() => setN(l.v)} className="chip min-w-14 justify-center" disabled={l.v !== "alle" && +l.v > count}>
                {l.v === "alle" ? `${t("Alle", "All")} (${count})` : l.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-muted">
          {t(
            `Nenne alle ${count} Gebiete der Region in ${REGIONS.find((r) => r.key === region)!.minutes} Minuten.`,
            `Name all ${count} places in the region in ${REGIONS.find((r) => r.key === region)!.minutes} minutes.`
          )}
        </p>
      )}

      {typ === "karte" && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-muted">{t("Optionen", "Options")}</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={borders} onClick={() => setBorders(true)}>
              {t("Grenzen anzeigen", "Show borders")}
            </button>
            <button type="button" className="chip" aria-pressed={!borders} onClick={() => setBorders(false)}>
              {t("Keine Grenzen", "No borders")}
            </button>
            <button type="button" className="chip" aria-pressed={oneLife} onClick={() => setOneLife((x) => !x)}>
              {t("1-Leben-Modus", "One-life mode")}
            </button>
          </div>
        </fieldset>
      )}
      {typ === "hauptstaedte" && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-muted">{t("Antworten", "Answers")}</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={input === "auswahl"} onClick={() => setInput("auswahl")}>
              {t("4 Antworten zur Auswahl", "Choose from 4 answers")}
            </button>
            <button type="button" className="chip" aria-pressed={input === "eingabe"} onClick={() => setInput("eingabe")}>
              {t("Selbst eintippen", "Type it yourself")}
            </button>
          </div>
        </fieldset>
      )}

      <button type="button" onClick={start} className="btn-primary w-full text-lg sm:w-auto sm:px-10">
        {t("Quiz starten", "Start quiz")}
      </button>
    </div>
    </>
  );
}
