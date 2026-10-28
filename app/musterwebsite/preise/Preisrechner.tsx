"use client";

import { useState } from "react";

type Klasse = {
  id: string;
  label: string;
  grundbetrag: number;
  stunde: number;
  sonderfahrt: number;
  sonderfahrten: number;
  theorie?: number;
  praxis: number;
  start: number;
};

const klassen: Klasse[] = [
  { id: "b", label: "Auto (B)", grundbetrag: 390, stunde: 62, sonderfahrt: 72, sonderfahrten: 12, theorie: 120, praxis: 220, start: 25 },
  { id: "a", label: "Motorrad (A)", grundbetrag: 420, stunde: 70, sonderfahrt: 80, sonderfahrten: 12, theorie: 120, praxis: 250, start: 15 },
  { id: "be", label: "Anhänger (BE)", grundbetrag: 250, stunde: 68, sonderfahrt: 75, sonderfahrten: 5, praxis: 220, start: 6 },
];

const euro = (n: number) => n.toLocaleString("de-DE") + " €";

export function Preisrechner() {
  const [id, setId] = useState("b");
  const k = klassen.find((x) => x.id === id)!;
  const [stunden, setStunden] = useState(k.start);

  const rows = [
    { label: "Grundbetrag", sub: "Anmeldung & Theorie", preis: k.grundbetrag },
    { label: "Übungsstunde", sub: "45 Minuten", preis: k.stunde },
    { label: "Sonderfahrt", sub: `${k.sonderfahrten} × Pflicht`, preis: k.sonderfahrt },
    ...(k.theorie ? [{ label: "Theorieprüfung", sub: "Vorstellung", preis: k.theorie }] : []),
    { label: "Praxisprüfung", sub: "Vorstellung", preis: k.praxis },
  ];

  const total = k.grundbetrag + stunden * k.stunde + k.sonderfahrten * k.sonderfahrt + (k.theorie ?? 0) + k.praxis;

  return (
    <>
      <div className="mt-8 inline-flex rounded-full bg-surface p-1" role="tablist">
        {klassen.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === id}
            onClick={() => {
              setId(x.id);
              setStunden(x.start);
            }}
            className={`rounded-full px-4 py-2 text-sm transition ${
              x.id === id ? "bg-white font-semibold shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-surface px-7 py-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between border-b border-line py-4 last:border-0">
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-sm text-muted">{r.sub}</p>
              </div>
              <p className="font-semibold">{euro(r.preis)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-surface p-7">
          <h2 className="text-lg font-semibold">Kostenrechner</h2>
          <label htmlFor="stunden" className="mt-5 flex justify-between text-sm">
            <span className="text-muted">Übungsstunden</span>
            <span className="font-semibold">{stunden}</span>
          </label>
          <input
            id="stunden"
            type="range"
            min={0}
            max={60}
            value={stunden}
            onChange={(e) => setStunden(Number(e.target.value))}
            className="mt-3 w-full accent-[#2257d6]"
          />
          <p className="mt-6 text-sm text-muted">Geschätzte Gesamtkosten</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{euro(total)}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Inkl. Grundbetrag, Sonderfahrten und Prüfungen. Ohne Gebühren von Stadt und TÜV.
          </p>
        </div>
      </div>
    </>
  );
}
