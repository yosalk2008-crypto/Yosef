"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { QUIZ_TYPES, type QuizType } from "@/lib/games";
import { REGIONS, entitiesFor, type RegionKey } from "@/lib/data/regions";

const LENGTHS = [
  { v: "10", label: "10" },
  { v: "25", label: "25" },
  { v: "50", label: "50" },
  { v: "alle", label: "Alle" },
];

export function QuizSetup() {
  const router = useRouter();
  const sp = useSearchParams();
  const [typ, setTyp] = useState<QuizType>("flaggen");
  const [region, setRegion] = useState<RegionKey>("welt");
  const [n, setN] = useState("10");
  const [borders, setBorders] = useState(true);
  const [oneLife, setOneLife] = useState(false);
  const [input, setInput] = useState<"auswahl" | "eingabe">("auswahl");

  useEffect(() => {
    const t = sp.get("typ");
    if (t && QUIZ_TYPES.some((q) => q.key === t)) setTyp(t as QuizType);
    const r = sp.get("region");
    if (r && REGIONS.some((x) => x.key === r)) {
      setRegion(r as RegionKey);
      if (REGIONS.find((x) => x.key === r)!.kind === "states" && (!t || t === "flaggen")) setTyp("karte");
    }
  }, [sp]);

  const info = QUIZ_TYPES.find((q) => q.key === typ)!;
  const regions = REGIONS.filter((r) => (!info.countriesOnly || r.kind === "countries") && !(typ === "hauptstaedte" && r.noCapitals));
  useEffect(() => {
    if (!regions.some((r) => r.key === region)) setRegion("welt");
  }, [regions, region]);
  const count = entitiesFor(region).length;

  const start = () => {
    const q = new URLSearchParams({ region });
    if (typ !== "alle-nennen") q.set("n", n);
    if (typ === "karte") {
      if (!borders) q.set("grenzen", "aus");
      if (oneLife) q.set("leben", "1");
    }
    if (typ === "hauptstaedte" && input === "eingabe") q.set("modus", "eingabe");
    router.push(`/quiz/${typ}?${q}`);
  };

  return (
    <div className="mt-8 space-y-8">
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-muted">1 · Spielart</legend>
        <div className="grid gap-2 sm:grid-cols-5">
          {QUIZ_TYPES.map((q) => (
            <button
              key={q.key}
              type="button"
              aria-pressed={typ === q.key}
              onClick={() => setTyp(q.key)}
              className={`rounded-xl border-2 p-3 text-left transition ${typ === q.key ? "border-ink bg-white shadow-sm" : "border-transparent bg-white hover:border-line"}`}
            >
              <span className="block font-bold">{q.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{q.tagline}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-bold text-muted">2 · Region</legend>
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <button key={r.key} type="button" aria-pressed={region === r.key} onClick={() => setRegion(r.key)} className="chip">
              {r.label}
            </button>
          ))}
        </div>
        {info.countriesOnly && <p className="mt-2 text-xs text-muted">Flaggen gibt es nur für Länder.</p>}
      </fieldset>

      {typ !== "alle-nennen" ? (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-muted">3 · Anzahl Fragen</legend>
          <div className="flex flex-wrap gap-2">
            {LENGTHS.map((l) => (
              <button key={l.v} type="button" aria-pressed={n === l.v} onClick={() => setN(l.v)} className="chip min-w-14 justify-center" disabled={l.v !== "alle" && +l.v > count}>
                {l.v === "alle" ? `Alle (${count})` : l.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-muted">
          Nenne alle {count} Gebiete der Region in{" "}
          {REGIONS.find((r) => r.key === region)!.minutes} Minuten.
        </p>
      )}

      {typ === "karte" && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-muted">Optionen</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={borders} onClick={() => setBorders(true)}>
              Grenzen anzeigen
            </button>
            <button type="button" className="chip" aria-pressed={!borders} onClick={() => setBorders(false)}>
              Keine Grenzen
            </button>
            <button type="button" className="chip" aria-pressed={oneLife} onClick={() => setOneLife((x) => !x)}>
              1-Leben-Modus
            </button>
          </div>
        </fieldset>
      )}
      {typ === "hauptstaedte" && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-muted">Antworten</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={input === "auswahl"} onClick={() => setInput("auswahl")}>
              4 Antworten zur Auswahl
            </button>
            <button type="button" className="chip" aria-pressed={input === "eingabe"} onClick={() => setInput("eingabe")}>
              Selbst eintippen
            </button>
          </div>
        </fieldset>
      )}

      <button type="button" onClick={start} className="btn-primary w-full text-lg sm:w-auto sm:px-10">
        Quiz starten
      </button>
    </div>
  );
}
