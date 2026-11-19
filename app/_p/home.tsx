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
  // tells Google the site's name, so a search for "Koshertrivia" shows it as the brand (and as "Kosher Trivia")
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://koshertrivia.de/#website",
        name: "Koshertrivia",
        alternateName: ["Kosher Trivia", "koshertrivia.de"],
        url: lang === "en" ? "https://koshertrivia.de/en" : "https://koshertrivia.de/",
        inLanguage: lang,
        publisher: { "@id": "https://koshertrivia.de/#org" },
      },
      { "@type": "Organization", "@id": "https://koshertrivia.de/#org", name: "Koshertrivia", url: "https://koshertrivia.de/"},
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="mx-auto max-w-6xl px-4 pb-2 pt-5 sm:pt-7">
        <DailyBoard />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-6 sm:pt-8 lg:grid-cols-[2fr_1fr]">
        <Link
          href="/koscher"
          className="chunk relative flex items-center justify-between gap-3 overflow-hidden px-5 py-4 text-white sm:px-8 sm:py-5 lg:col-span-2"
          style={{ background: "linear-gradient(160deg, #1f4fd1 0%, #13224a 55%, #0a1630 100%)", ["--edge" as string]: "#050c1f" }}
        >
          <span className="pointer-events-none absolute -right-4 -top-8 h-36 w-36 rounded-full border-4 border-white/10" aria-hidden="true" />
          <span className="relative">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-semibold sm:text-4xl">
              {t("Ist das koscher?", "Is it kosher?")}
            </span>
            <span className="mt-1 hidden max-w-xl text-base font-semibold text-white/85 sm:block sm:text-lg">
              {t("Shrimps, Giraffe, Lichtschalter am Schabbat: Rate, was im Judentum erlaubt ist – über 180 Fragen mit Erklärungen.", "Shrimp, giraffe, light switches on Shabbat: guess what Judaism allows – over 180 questions with explanations.")}
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
            </span>
            <span className="mt-1 hidden max-w-xl text-base font-semibold text-white/85 sm:block sm:text-lg">
              {t("Vape, Sportwetten, Zinsen, Kredite: Rate, was im Islam erlaubt ist – 185 Fragen mit Quellen aus Quran, Bukhari und Muslim.", "Vaping, sports betting, interest, loans: guess what Islam allows – 185 questions with sources from the Quran, Bukhari and Muslim.")}
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
            </span>
            <span className="mt-1 hidden max-w-md text-base font-semibold text-white/85 sm:block sm:text-lg">
              {t("Das Quiz der seltenen Antworten: Je unbekannter deine richtige Antwort, desto tiefer tauchst du.", "The quiz of rare answers: the more obscure your correct answer, the deeper you dive.")}
            </span>
          </span>
          <span className="relative btn-primary shrink-0 bg-[#f3d272] px-4 text-ink max-sm:min-h-0 max-sm:py-2 max-sm:text-sm shadow-[0_4px_0_#b8962f] hover:bg-[#f7dc8a]"><span className="sm:hidden">{t("Los", "Go")}</span><span className="hidden sm:inline">{t("Jetzt abtauchen", "Dive in")}</span></span>
        </Link>
        <Link
          href="/gipfelsturm"
          className="chunk relative flex items-center justify-between gap-3 overflow-hidden px-5 py-4 text-white sm:px-8 lg:col-start-1"
          style={{ background: "linear-gradient(165deg, #1d1640 0%, #4a2a6a 45%, #b8486a 78%, #f6935a 100%)", ["--edge" as string]: "#120c1c" }}
        >
          <svg viewBox="0 0 200 90" className="pointer-events-none absolute bottom-0 right-24 hidden h-[90px] w-[200px] sm:block" aria-hidden="true">
            <ellipse cx="100" cy="22" rx="34" ry="16" fill="#ff8a2a" opacity=".45" />
            <path d="M10 90l50-40c12-16 22-30 28-48h24c6 18 16 32 28 48l50 40z" fill="#2e2340" />
            <path d="M88 2q12 6 24 0" stroke="#ffb43a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M106 6c4 14 10 24 18 36s14 26 22 40" stroke="#ffb43a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="96" cy="-6" r="9" fill="#7a6a8e" opacity=".8" /><circle cx="108" cy="-14" r="7" fill="#7a6a8e" opacity=".6" />
          </svg>
          <span className="relative">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-semibold sm:text-3xl">
              {t("Gipfelsturm", "Summit Rush")}
            </span>
            <span className="mt-1 hidden max-w-md text-base font-semibold text-white/90 sm:block sm:text-lg">
              {t("7 Fragen, 7 Lager bis zum Krater – und jede Antwort zählt nur einmal. Heb dir die Berühmten für oben auf, bevor der Vulkan ausbricht.", "7 questions, 7 camps up to the crater – and every answer counts only once. Save the famous ones for the top before the volcano blows.")}
            </span>
          </span>
          <span className="relative btn-primary shrink-0 bg-white px-4 text-ink max-sm:min-h-0 max-sm:py-2 max-sm:text-sm shadow-[0_4px_0_#9aa6c2] hover:bg-[#eef1f8]"><span className="sm:hidden">{t("Los", "Go")}</span><span className="hidden sm:inline">{t("Aufsteigen", "Start climbing")}</span></span>
        </Link>
        <Link
          href="/fernweh"
          className="chunk relative flex items-center justify-between gap-3 overflow-hidden px-5 py-4 sm:px-8 lg:col-start-1"
          style={{ background: "#a9d3dc", ["--edge" as string]: "#7fb0bc" }}
        >
          <svg viewBox="0 0 220 90" className="pointer-events-none absolute -bottom-2 right-24 hidden h-[90px] w-[220px] sm:block" aria-hidden="true">
            <path d="M20 70c10-30 40-40 60-30s30 20 50 6 40-30 70-10" fill="none" stroke="#2c2a35" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" opacity=".5" />
            <path d="M150 40c0-8 6-14 14-14s14 6 14 14c0 10-14 22-14 22s-14-12-14-22z" fill="#d6453d" stroke="#2c2a35" strokeWidth="2.5" />
            <circle cx="164" cy="40" r="5" fill="#fff" />
            <path d="M40 30l8 4-8 4-8-4z M52 62h22l-4 8H56z" fill="#f6efe0" stroke="#2c2a35" strokeWidth="2" />
          </svg>
          <span className="relative">
            <span className="block font-display text-2xl font-semibold sm:text-3xl">{t("Fernweh", "Wanderlust")}</span>
            <span className="mt-1 hidden max-w-md text-base font-semibold text-ink/75 sm:block sm:text-lg">
              {t("5 Hinweise, 5 Pins auf einer Karte ohne Namen. Je seltener dein Land, desto weiter kommst du – bis 500 km am Tag.", "5 clues, 5 pins on a map without names. The rarer your country, the further you get – up to 500 km a day.")}
            </span>
          </span>
          <span className="relative btn-primary shrink-0 px-4 max-sm:min-h-0 max-sm:py-2 max-sm:text-sm"><span className="sm:hidden">{t("Los", "Go")}</span><span className="hidden sm:inline">{t("Losreisen", "Set off")}</span></span>
        </Link>
        <Link href="/bestenliste" className="chunk flex items-center justify-between gap-4 px-5 py-4 lg:col-start-2 lg:row-span-3 lg:row-start-3" style={{ background: "#f3d272", ["--edge" as string]: "#c9a43c" }}>
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
          <Link href="/quiz/karte/welt?n=10" className="chunk relative flex flex-col items-center px-5 pb-6 pt-6 text-center" style={REGION_BLUE}>
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
          <Link href="/quiz/flaggen/welt?n=10" className="chunk relative flex flex-col items-center px-5 pb-6 pt-6 text-center" style={REGION_BLUE}>
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
