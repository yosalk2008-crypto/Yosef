import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizSetup } from "@/components/quiz/QuizSetup";

export const metadata: Metadata = {
  title: "Unbegrenzte Geografie-Quizze",
  description: "Flaggen, Hauptstädte, Umrisse, Karten-Quiz und „Alle nennen“ – für die Welt, alle Kontinente, den Nahen Osten, Bundesländer, Kantone, US-Staaten und syrische Gouvernements.",
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
