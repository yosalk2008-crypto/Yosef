import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizSetup } from "@/components/quiz/QuizSetup";
import Link from "@/components/Link";
import { QUIZ_TYPES, quizFits } from "@/lib/games";
import { MAIN_REGIONS, REGIONS, regionLabel } from "@/lib/data/regions";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Unbegrenzte Geografie-Quizze", "Unlimited geography quizzes"),
    description: t(
      "Flaggen, Hauptstädte, Umrisse, Karten-Quiz und „Alle nennen“ – für die Welt, alle Kontinente, den Nahen Osten, Bundesländer, Kantone, US-Staaten und syrische Gouvernements.",
      "Flags, capitals, outlines, map quizzes and “Name them all” – for the world, every continent, the Middle East, German states, Swiss cantons, US states and more."
    ),
  };
};

export default function QuizPage({ lang = "de" }: { lang?: Lang }) {
  const t = tr(lang);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:pt-12">
      <Suspense>
        <QuizSetup />
      </Suspense>
      <section className="mt-16">
        <h2 className="font-display text-2xl font-semibold">{t("Alle Quizze direkt starten", "Start any quiz directly")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {MAIN_REGIONS.map((r) => {
            const keys = [r, ...REGIONS.filter((x) => x.parent === r.key)];
            return (
              <div key={r.key} className="card p-4">
                <h3 className="font-display text-lg font-semibold">{regionLabel(r, lang)}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
                  {keys.flatMap((rr) =>
                    QUIZ_TYPES.filter((q) => quizFits(q.key, rr)).map((q) => (
                      <Link key={rr.key + q.key} href={`/quiz/${q.key}/${rr.key}`} className="font-semibold text-brand hover:underline">
                        {lang === "en" ? q.titleEn : q.title}
                        {rr.parent ? ` (${lang === "en" ? rr.splitEn : rr.split})` : ""}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
