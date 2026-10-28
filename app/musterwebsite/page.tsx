import Link from "next/link";
import { CarSvg } from "@/components/Vehicles";

const angebote = [
  { klasse: "Klasse B", title: "Auto", text: "Schaltung oder Automatik, auf Wunsch ab 17 mit Begleitetem Fahren." },
  { klasse: "Klasse A", title: "Motorrad", text: "A1, A2 und A. Ausrüstung stellen wir dir." },
  { klasse: "Klasse BE", title: "Anhänger", text: "Für Wohnwagen und Anhänger bis 3.500 kg." },
];

export default function MusterStart() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <section className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fs">Fahrschule in Neuss</p>
          <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Dein Führerschein.
            <br />
            <span className="text-fs">Entspannt</span>
            <br />
            gemacht.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Moderne Ausbildung für Auto und Motorrad, direkt am Neusser Hauptbahnhof.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/musterwebsite/kontakt" className="rounded-full bg-fs px-6 py-3 font-semibold text-white transition hover:brightness-110">
              Jetzt anmelden
            </Link>
            <Link href="/musterwebsite/preise" className="rounded-full bg-surface px-6 py-3 font-semibold transition hover:bg-line">
              Preise ansehen
            </Link>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-fs-soft px-8 pb-14 pt-20">
          <span className="absolute left-5 top-5 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold shadow-sm">
            ★ 4,9 · 312 Bewertungen
          </span>
          <CarSvg className="mx-auto w-full max-w-sm text-fs" />
          <div className="absolute inset-x-0 bottom-8 border-t-[3px] border-dashed border-fs/30" />
        </div>
      </section>

      <section className="mt-16 grid grid-cols-3 gap-6 border-t border-line pt-10 sm:max-w-xl">
        {[
          ["87 %", "bestehen beim ersten Mal"],
          ["25+", "Jahre Erfahrung"],
          ["5 Min.", "zu Fuß vom Hbf"],
        ].map(([v, l]) => (
          <div key={l}>
            <p className="text-3xl font-bold tracking-tight">{v}</p>
            <p className="mt-1 text-sm text-muted">{l}</p>
          </div>
        ))}
      </section>

      <section className="mt-24">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Was wir anbieten</h2>
          <Link href="/musterwebsite/preise" className="text-sm font-semibold text-fs hover:underline">
            Alle Preise →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {angebote.map((a) => (
            <div key={a.klasse} className="rounded-2xl bg-surface p-7 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-sm font-semibold text-fs">{a.klasse}</p>
              <h3 className="mt-2 text-xl font-semibold">{a.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink px-8 py-12 text-white sm:flex-row sm:items-center sm:px-12">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Kostenloses Erstgespräch</h2>
          <p className="mt-2 text-white/65">15 Minuten, unverbindlich, im Büro oder am Telefon.</p>
        </div>
        <Link href="/musterwebsite/kontakt" className="rounded-full bg-white px-6 py-3 font-semibold text-ink transition hover:bg-fs-soft">
          Termin anfragen
        </Link>
      </section>
    </div>
  );
}
