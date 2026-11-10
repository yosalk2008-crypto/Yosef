import Link from "next/link";
import { DailyBoard } from "@/components/DailyBoard";
import { REGIONS } from "@/lib/data/regions";

const REGION_BLUE = { background: "#6aa8f0", ["--edge" as string]: "#4b88d1" };

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:pt-10">
        <DailyBoard />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6">
        <Link
          href="/tiefgang"
          className="chunk relative flex flex-col items-start gap-4 overflow-hidden px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8"
          style={{ background: "linear-gradient(160deg, #3f96d6 0%, #16528f 55%, #0a2656 100%)", ["--edge" as string]: "#061a3d" }}
        >
          <span className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full border-4 border-white/15" aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-3 right-24 h-10 w-10 rounded-full border-[3px] border-white/20" aria-hidden="true" />
          <span className="relative">
            <span className="inline-block rounded-full bg-[#f3d272] px-3 py-1 font-display text-sm font-semibold text-ink">Neu</span>
            <span className="mt-2 block font-display text-3xl font-semibold sm:text-4xl">Tiefgang</span>
            <span className="mt-1 block max-w-md text-lg font-semibold text-white/85">
              Das Quiz der seltenen Antworten: Je unbekannter deine richtige Antwort, desto tiefer tauchst du.
            </span>
          </span>
          <span className="relative btn-primary bg-[#f3d272] text-ink shadow-[0_4px_0_#b8962f] hover:bg-[#f7dc8a]">Jetzt abtauchen</span>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[28px] font-semibold leading-none sm:text-4xl">Quiz nach Region</h2>
          <Link href="/quiz" className="flex items-center gap-1 font-display text-lg font-semibold hover:underline">
            Alle Quizze
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Link href="/quiz/karte?region=welt&n=10" className="chunk relative flex flex-col items-center px-5 pb-6 pt-6 text-center" style={REGION_BLUE}>
            <div className="relative w-full max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/thumbs/welt.svg" alt="" className="w-full" />
              <span className="absolute left-[29%] top-[62%] grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-ink bg-[#9fd06f] shadow-[0_3px_0_#2c2a35]" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#2c2a35">
                  <path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
                </svg>
              </span>
            </div>
            <span className="mt-3 font-display text-lg font-semibold text-ink/80">Welt</span>
            <span className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">Länder auf der Karte</span>
          </Link>
          <Link href="/quiz/flaggen?region=welt&n=10" className="chunk relative flex flex-col items-center px-5 pb-6 pt-6 text-center" style={REGION_BLUE}>
            <div className="relative w-full max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/thumbs/welt.svg" alt="" className="w-full" />
              <span className="absolute right-[6%] top-[4%] rotate-6 rounded-xl border-[3px] border-ink bg-white p-1.5 shadow-[0_4px_0_#2c2a35]" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/flags/jp.svg" alt="" className="h-12 w-auto rounded-md sm:h-16" />
              </span>
            </div>
            <span className="mt-3 font-display text-lg font-semibold text-ink/80">Welt</span>
            <span className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">Flaggen raten</span>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {REGIONS.map((r) => (
            <Link key={r.key} href={`/quiz?region=${r.key}`} className="chunk flex flex-col items-center px-3 pb-4 pt-4 text-center" style={REGION_BLUE}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/thumbs/${r.key}.svg`} alt="" className="aspect-[1.6] w-full max-w-[220px] object-contain" loading="lazy" />
              <span className="mt-2 font-display text-[19px] font-semibold leading-tight sm:text-[22px]">{r.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 pb-16 pt-6 text-center">
        <h2 className="text-3xl font-semibold leading-tight sm:text-[40px]">Die Welt kennenlernen, ein Rätsel nach dem anderen</h2>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Geografik ist kostenlos und braucht keine Anmeldung. Jeden Tag gibt es acht neue Rätsel zu Ländern, Grenzen, Flaggen und Geschichte – für alle
          dieselben, damit du dich mit Freunden vergleichen kannst.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Zum Üben gibt es unbegrenzte Quizze: von der ganzen Welt bis zu den deutschen Bundesländern, Schweizer Kantonen und österreichischen Bundesländern.
        </p>
      </section>
    </>
  );
}
