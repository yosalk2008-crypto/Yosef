import Link from "@/components/Link";
import { DailyBoard } from "@/components/DailyBoard";
import { MAIN_REGIONS, regionLabel } from "@/lib/data/regions";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

const REGION_BLUE = { background: "#6aa8f0", ["--edge" as string]: "#4b88d1" };

export const meta = (lang: Lang): import("next").Metadata =>
  lang === "en"
    ? { title: { absolute: "Koshertrivia – daily geography puzzles & country quizzes" }, description: "Eight new geography puzzles every day plus unlimited quizzes on flags, capitals, outlines and maps." }
    : {};

export default function Home({ lang }: { lang: Lang }) {
  const t = tr(lang);
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-5 sm:pt-7 lg:grid-cols-[2fr_1fr]">
        <Link
          href="/koscher"
          className="chunk relative flex items-center justify-between gap-3 overflow-hidden px-5 py-4 text-white sm:px-8 sm:py-5 lg:col-span-2"
          style={{ background: "linear-gradient(160deg, #1f4fd1 0%, #13224a 55%, #0a1630 100%)", ["--edge" as string]: "#050c1f" }}
        >
          <span className="pointer-events-none absolute -right-4 -top-8 h-36 w-36 rounded-full border-4 border-white/10" aria-hidden="true" />
          <span className="relative">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-semibold sm:text-4xl">
              {t("Ist das koscher?", "Is it kosher?")}
              <span className="hidden rounded-full bg-white px-2.5 py-0.5 text-sm text-ink sm:inline">{t("Neu", "New")}</span>
            </span>
            <span className="mt-1 hidden max-w-xl text-base font-semibold text-white/85 sm:block sm:text-lg">
              {t("Shrimps, Giraffe, Lichtschalter am Schabbat: Rate, was im Judentum erlaubt ist – über 140 Fragen mit Erklärungen.", "Shrimp, giraffe, light switches on Shabbat: guess what Judaism allows – over 140 questions with explanations.")}
            </span>
          </span>
          <span className="relative flex items-center gap-4">
            <span className="hidden rotate-[-10deg] rounded-lg border-[3px] border-[#7fe0a8] px-3 py-1.5 font-display text-lg font-semibold uppercase tracking-wide text-[#7fe0a8] md:block" aria-hidden="true">
              {t("Koscher", "Kosher")}
            </span>
            <span className="btn-primary shrink-0 bg-white px-4 text-ink max-sm:min-h-0 max-sm:py-2 max-sm:text-sm shadow-[0_4px_0_#9fb3df] hover:bg-[#eaf1ff]">Zum Quiz</span>
          </span>
        </Link>
        <Link
          href="/halal"
          className="chunk relative flex items-center justify-between gap-3 overflow-hidden px-5 py-4 text-white sm:px-8 sm:py-5 lg:col-span-2"
          style={{ background: "linear-gradient(160deg, #12a06d 0%, #0b3b2d 55%, #062a20 100%)", ["--edge" as string]: "#03170f" }}
        >
          <span className="pointer-events-none absolute -right-4 -top-8 h-36 w-36 rounded-full border-4 border-white/10" aria-hidden="true" />
          <span className="relative">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-semibold sm:text-4xl">
              {t("Ist das halal?", "Is it halal?")}
              <span className="hidden rounded-full bg-white px-2.5 py-0.5 text-sm text-ink sm:inline">{t("Neu", "New")}</span>
            </span>
            <span className="mt-1 hidden max-w-xl text-base font-semibold text-white/85 sm:block sm:text-lg">
              {t("Vape, Sportwetten, Zinsen, Kredite: Rate, was im Islam erlaubt ist – 145 Fragen mit Quellen aus Quran, Bukhari und Muslim.", "Vaping, sports betting, interest, loans: guess what Islam allows – 145 questions with sources from the Quran, Bukhari and Muslim.")}
            </span>
          </span>
          <span className="relative flex items-center gap-4">
            <span className="hidden rotate-[-10deg] rounded-lg border-[3px] border-[#a7f3d0] px-3 py-1.5 font-display text-lg font-semibold uppercase tracking-wide text-[#a7f3d0] md:block" aria-hidden="true">
              Halal
            </span>
            <span className="btn-primary shrink-0 bg-white px-4 text-ink max-sm:min-h-0 max-sm:py-2 max-sm:text-sm shadow-[0_4px_0_#9fd8bf] hover:bg-[#e6f6ef]">Zum Quiz</span>
          </span>
        </Link>
        <Link
          href="/tiefgang"
          className="chunk relative flex items-center justify-between gap-3 overflow-hidden px-5 py-4 text-white sm:px-8"
          style={{ background: "linear-gradient(160deg, #3f96d6 0%, #16528f 55%, #0a2656 100%)", ["--edge" as string]: "#061a3d" }}
        >
          <span className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full border-4 border-white/15" aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-3 right-24 h-10 w-10 rounded-full border-[3px] border-white/20" aria-hidden="true" />
          <span className="relative">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-semibold sm:text-3xl">
              {t("Tiefgang", "Deep Dive")}
              <span className="hidden rounded-full bg-[#f3d272] px-2.5 py-0.5 text-sm text-ink sm:inline">{t("Neu", "New")}</span>
            </span>
            <span className="mt-1 hidden max-w-md text-base font-semibold text-white/85 sm:block sm:text-lg">
              {t("Das Quiz der seltenen Antworten: Je unbekannter deine richtige Antwort, desto tiefer tauchst du.", "The quiz of rare answers: the more obscure your correct answer, the deeper you dive.")}
            </span>
          </span>
          <span className="relative btn-primary shrink-0 bg-[#f3d272] px-4 text-ink max-sm:min-h-0 max-sm:py-2 max-sm:text-sm shadow-[0_4px_0_#b8962f] hover:bg-[#f7dc8a]"><span className="sm:hidden">{t("Los", "Go")}</span><span className="hidden sm:inline">{t("Jetzt abtauchen", "Dive in")}</span></span>
        </Link>
        <Link href="/bestenliste" className="chunk flex items-center justify-between gap-4 px-5 py-4" style={{ background: "#f3d272", ["--edge" as string]: "#c9a43c" }}>
          <span>
            <span className="block font-display text-2xl font-semibold sm:text-3xl">{t("Bestenliste", "Leaderboard")}</span>
            <span className="mt-1 hidden text-base font-semibold text-ink/75 sm:block sm:text-lg">{t("Wer hat heute die meisten Punkte?", "Who has the most points today?")}</span>
          </span>
          <svg viewBox="0 0 64 56" className="h-12 w-16 shrink-0" aria-hidden="true">
            <rect x="22" y="14" width="20" height="40" rx="3" fill="#fff" stroke="#2c2a35" strokeWidth="3" />
            <rect x="3" y="26" width="19" height="28" rx="3" fill="#fff" stroke="#2c2a35" strokeWidth="3" />
            <rect x="42" y="34" width="19" height="20" rx="3" fill="#fff" stroke="#2c2a35" strokeWidth="3" />
            <text x="32" y="38" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2c2a35">1</text>
            <text x="12.5" y="46" textAnchor="middle" fontSize="13" fontWeight="700" fill="#2c2a35">2</text>
            <text x="51.5" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2c2a35">3</text>
            <path d="M32 2l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#ee8a2f" stroke="#2c2a35" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </Link>
        <Link
          href="/multiplayer"
          className="chunk relative flex items-center justify-between gap-3 overflow-hidden px-5 py-4 sm:px-8 lg:col-span-2"
          style={{ background: "#ee8a2f", ["--edge" as string]: "#b9621a" }}
        >
          <span className="relative">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-semibold sm:text-3xl">
              {t("Mit Freunden spielen", "Play with friends")}
              <span className="hidden rounded-full bg-white px-2.5 py-0.5 text-sm text-ink sm:inline">{t("Neu", "New")}</span>
            </span>
            <span className="mt-1 hidden max-w-xl text-base font-semibold text-ink/75 sm:block sm:text-lg">
              {t("Server erstellen oder mit Code beitreten – alle beantworten dieselbe Frage, dann vergleicht ihr eure Antworten.", "Create a server or join with a code – everyone answers the same question, then you compare answers.")}
            </span>
          </span>
          <span className="relative flex items-center gap-4">
            <span className="hidden -space-x-3 md:flex" aria-hidden="true">
              {["#3f86dd", "#3e9a3a", "#d6453d", "#8a5cd6"].map((c, k) => (
                <span key={c} className="h-11 w-11 rounded-full border-[3px] border-ink" style={{ background: c, zIndex: 4 - k }} />
              ))}
            </span>
            <span className="btn-primary shrink-0 px-4 max-sm:min-h-0 max-sm:py-2 max-sm:text-sm">{t("Server finden", "Find a server")}</span>
          </span>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:pt-10">
        <DailyBoard />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[28px] font-semibold leading-none sm:text-4xl">{t("Quiz nach Region", "Quiz by region")}</h2>
          <Link href="/quiz" className="flex items-center gap-1 font-display text-lg font-semibold hover:underline">
            {t("Alle Quizze", "All quizzes")}
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
            <span className="mt-3 font-display text-lg font-semibold text-ink/80">{t("Welt", "World")}</span>
            <span className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">{t("Länder auf der Karte", "Countries on the map")}</span>
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
            <span className="mt-3 font-display text-lg font-semibold text-ink/80">{t("Welt", "World")}</span>
            <span className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">{t("Flaggen raten", "Guess the flag")}</span>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {MAIN_REGIONS.map((r) => (
            <Link key={r.key} href={`/quiz?region=${r.key}`} className="chunk flex flex-col items-center px-3 pb-4 pt-4 text-center" style={REGION_BLUE}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/thumbs/${r.key}.svg`} alt="" className="aspect-[1.6] w-full max-w-[220px] object-contain" loading="lazy" />
              <span className="mt-2 font-display text-[19px] font-semibold leading-tight sm:text-[22px]">{regionLabel(r, lang)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 pb-16 pt-6 text-center">
        <h2 className="text-3xl font-semibold leading-tight sm:text-[40px]">{t("Die Welt kennenlernen, ein Rätsel nach dem anderen", "Get to know the world, one puzzle at a time")}</h2>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          {t(
            "Koshertrivia ist kostenlos und braucht keine Anmeldung. Jeden Tag gibt es acht neue Rätsel zu Ländern, Grenzen, Flaggen und Zahlen – für alle dieselben, damit du dich mit Freunden vergleichen kannst.",
            "Koshertrivia is free and needs no sign-up. Every day there are eight new puzzles about countries, borders, flags and numbers – the same for everyone, so you can compare with friends."
          )}
        </p>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          {t(
            "Zum Üben gibt es unbegrenzte Quizze: von der ganzen Welt bis zu den deutschen Bundesländern, Schweizer Kantonen und österreichischen Bundesländern.",
            "For practice there are unlimited quizzes: from the whole world down to German states, Swiss cantons and US states."
          )}
        </p>
      </section>
    </>
  );
}
