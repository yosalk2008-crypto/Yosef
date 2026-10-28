import type { Metadata } from "next";
import { PageHead } from "../ui";
import { Preisrechner } from "./Preisrechner";

export const metadata: Metadata = { title: "Preise" };

const extras = [
  { title: "Ferienkurs", text: "Komplette Theorie in sieben Tagen." },
  { title: "Auffrischung", text: "Einzelstunden für Wiedereinsteiger." },
  { title: "Ratenzahlung", text: "Bis zu sechs Monatsraten ohne Zinsen." },
];

export default function Preise() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <PageHead eyebrow="Preise & Angebot" title="Transparente Preise" text="Alle Preise inkl. MwSt. Gebühren für Stadt und TÜV kommen separat hinzu." />
      <Preisrechner />
      <h2 className="mt-20 text-3xl font-bold tracking-tight">Außerdem</h2>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {extras.map((e) => (
          <div key={e.title} className="rounded-2xl bg-surface p-7">
            <h3 className="font-semibold">{e.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{e.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
