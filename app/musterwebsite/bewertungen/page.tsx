import type { Metadata } from "next";
import { BikeSvg, CarSvg } from "@/components/Vehicles";
import { PageHead, Stars } from "../ui";

export const metadata: Metadata = { title: "Fotos & Bewertungen" };

const fotos = [
  { caption: "Lea · Klasse B bestanden", bg: "bg-fs-soft", el: <CarSvg className="w-2/3 text-fs" /> },
  { caption: "Murat · Klasse A2 bestanden", bg: "bg-surface", el: <BikeSvg className="w-1/2 text-fs" /> },
  { caption: "Jonas · Klasse B197 bestanden", bg: "bg-fs-soft", el: <CarSvg className="w-2/3 text-ink" /> },
];

const reviews = [
  { text: "Ich hatte Angst vor der Autobahn. Mit viel Ruhe geübt und beim ersten Versuch bestanden.", name: "Lea K. · Klasse B" },
  { text: "Fahrstunden morgens vor der Arbeit waren kein Problem. Sehr flexibel.", name: "Daniel R. · Klasse B197" },
  { text: "Klare Preise, keine Überraschungen. Am Ende genau so teuer wie besprochen.", name: "Familie Wolters · B17" },
];

export default function Bewertungen() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <PageHead eyebrow="Fotos & Bewertungen" title="Unsere Fahrschüler" text="Eindrücke aus der Fahrschule und was unsere Fahrschüler sagen." />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {fotos.map((f) => (
          <figure key={f.caption}>
            <div className={`grid aspect-[4/3] place-items-center rounded-2xl ${f.bg}`}>{f.el}</div>
            <figcaption className="mt-3 text-sm text-muted">{f.caption}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Platzhalter – hier erscheinen später echte Fotos.</p>

      <div className="mt-20 flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-3xl font-bold tracking-tight">Bewertungen</h2>
        <div className="flex items-center gap-3">
          <span className="text-5xl font-bold tracking-tight">4,9</span>
          <div>
            <Stars />
            <p className="text-sm text-muted">312 Google-Bewertungen</p>
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {reviews.map((r) => (
          <blockquote key={r.name} className="rounded-2xl bg-surface p-7">
            <Stars />
            <p className="mt-4 leading-relaxed">{r.text}</p>
            <footer className="mt-5 text-sm text-muted">{r.name}</footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
