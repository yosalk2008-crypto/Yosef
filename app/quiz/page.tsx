import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizSetup } from "@/components/quiz/QuizSetup";

export const metadata: Metadata = {
  title: "Unbegrenzte Geografie-Quizze",
  description: "Flaggen, Hauptstädte, Umrisse, Karten-Quiz und „Alle nennen“ – für die Welt, alle Kontinente, Bundesländer, Kantone und US-Staaten.",
};

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:pt-12">
      <h1 className="text-3xl font-display font-semibold tracking-tight sm:text-4xl">Unbegrenzte Quizze</h1>
      <p className="mt-2 text-muted">Wähle Spielart, Region und Länge – so oft du willst.</p>
      <Suspense>
        <QuizSetup />
      </Suspense>
    </div>
  );
}
