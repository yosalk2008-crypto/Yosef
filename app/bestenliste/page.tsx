import type { Metadata } from "next";
import { Suspense } from "react";
import { Leaderboard } from "@/components/Leaderboard";

export const metadata: Metadata = { title: "Bestenliste", description: "Wer hat heute die besten Ergebnisse in allen Koshertrivia-Spielen?" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">Bestenliste</h1>
      <p className="mt-2 text-muted">Jedes Spiel bringt bis zu 100 Punkte. Es zählt das Tagesrätsel von heute – dein erstes Ergebnis pro Spiel.</p>
      <Suspense>
        <Leaderboard />
      </Suspense>
    </div>
  );
}
