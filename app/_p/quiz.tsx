import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizSetup } from "@/components/quiz/QuizSetup";
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

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:pt-12">
      <Suspense>
        <QuizSetup />
      </Suspense>
    </div>
  );
}
