import Link from "@/components/Link";
import { DailyBoard } from "@/components/DailyBoard";
import { MoreBoard } from "@/components/MoreBoard";
import { AppCard } from "@/components/AppCard";
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

      <section className="mx-auto max-w-6xl px-4 pt-8 empty:hidden">
        <AppCard />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:pt-16">
        <MoreBoard />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pt-8 sm:pt-10 lg:grid-cols-2">
        <Link
          href="/multiplayer"
          className="chunk relative flex min-h-[170px] items-center justify-between gap-4 overflow-hidden px-6 py-6 sm:min-h-[220px] sm:px-9"
          style={{ background: "#ee8a2f", ["--edge" as string]: "#b9621a" }}
        >
          <span className="relative">
            <span className="block font-display text-[28px] font-semibold leading-tight sm:text-[40px]">{t("Mit Freunden spielen", "Play with friends")}</span>
            <span className="mt-2 block max-w-sm text-base font-semibold text-ink/75 sm:text-lg">
              {t("Server erstellen oder mit Code beitreten – alle beantworten dieselbe Frage.", "Create a server or join with a code – everyone answers the same question.")}
            </span>
            <span className="btn-primary mt-4 px-5">{t("Server finden", "Find a server")}</span>
          </span>
          <span className="relative hidden shrink-0 -space-x-4 sm:flex" aria-hidden="true">
            {["#3f86dd", "#3e9a3a", "#d6453d", "#8a5cd6"].map((c, k) => (
              <span key={c} className="h-16 w-16 rounded-full border-[3px] border-ink lg:h-14 lg:w-14 xl:h-16 xl:w-16" style={{ background: c, zIndex: 4 - k }} />
            ))}
          </span>
        </Link>
        <Link
          href="/bestenliste"
          className="chunk relative flex min-h-[170px] items-center justify-between gap-4 overflow-hidden px-6 py-6 sm:min-h-[220px] sm:px-9"
          style={{ background: "#f3d272", ["--edge" as string]: "#c9a43c" }}
        >
          <span className="relative">
            <span className="block font-display text-[28px] font-semibold leading-tight sm:text-[40px]">{t("Bestenliste", "Leaderboard")}</span>
            <span className="mt-2 block max-w-sm text-base font-semibold text-ink/75 sm:text-lg">{t("Wer hat heute die meisten Punkte?", "Who has the most points today?")}</span>
            <span className="btn-primary mt-4 px-5">{t("Zur Bestenliste", "See the leaderboard")}</span>
          </span>
          <svg viewBox="0 0 64 56" className="h-24 w-28 shrink-0 sm:h-32 sm:w-36" aria-hidden="true">
            <rect x="22" y="14" width="20" height="40" rx="3" fill="#fff" stroke="#2c2a35" strokeWidth="3" />
            <rect x="3" y="26" width="19" height="28" rx="3" fill="#fff" stroke="#2c2a35" strokeWidth="3" />
            <rect x="42" y="34" width="19" height="20" rx="3" fill="#fff" stroke="#2c2a35" strokeWidth="3" />
            <text x="32" y="38" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2c2a35">1</text>
            <text x="12.5" y="46" textAnchor="middle" fontSize="13" fontWeight="700" fill="#2c2a35">2</text>
            <text x="51.5" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2c2a35">3</text>
            <path d="M32 2l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#ee8a2f" stroke="#2c2a35" strokeWidth="2" strokeLinejoin="round" />
          </svg>
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
