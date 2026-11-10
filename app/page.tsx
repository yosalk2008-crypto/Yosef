import Link from "next/link";
import { DailyBoard } from "@/components/DailyBoard";
import { QUIZ_TYPES } from "@/lib/games";
import { REGIONS } from "@/lib/data/regions";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <WorldDots />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pb-20 sm:pt-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">Jeden Tag neu · kostenlos</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Wie gut kennst du die Welt?
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Acht Geografie-Rätsel pro Tag – für alle dieselben, jede Nacht neu. Dazu unbegrenzte Quizze zu
            Flaggen, Hauptstädten und Karten.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/taeglich/laenderjagd" className="btn-primary bg-teal-400 text-ink hover:bg-teal-300">
              Mit Länderjagd starten
            </Link>
            <Link href="/quiz" className="btn-ghost border-white/20 bg-white/10 text-white hover:bg-white/20">
              Freies Quiz
            </Link>
          </div>
        </div>
      </section>

      <section id="tagesspiele" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:py-14">
        <DailyBoard />
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Unbegrenzte Quizze</h2>
              <p className="mt-1 text-muted">Üben, so oft du willst – {REGIONS.length} Regionen von der Welt bis zu den Schweizer Kantonen.</p>
            </div>
            <Link href="/quiz" className="btn-ghost">
              Alle Quizze
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {QUIZ_TYPES.map((q) => (
              <Link key={q.key} href={`/quiz?typ=${q.key}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <p className="font-bold">{q.title}</p>
                <p className="mt-1 text-sm text-muted">{q.tagline}</p>
                <p className="mt-3 text-sm font-semibold text-brand group-hover:underline">Spielen →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function WorldDots() {
  // decorative dotted globe background
  const dots: [number, number][] = [];
  for (let y = 0; y < 14; y++) for (let x = 0; x < 40; x++) if ((x * 7 + y * 13) % 5 < 2) dots.push([x, y]);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x * 10 + 5} cy={y * 10 + 5} r={1.6} fill="#5eead4" />
      ))}
    </svg>
  );
}
