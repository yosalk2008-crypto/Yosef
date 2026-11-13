import type { Metadata } from "next";
import { Suspense } from "react";
import { Leaderboard } from "@/components/Leaderboard";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return { title: t("Bestenliste", "Leaderboard"), description: t("Wer hat heute die besten Ergebnisse in allen Koshertrivia-Spielen?", "Who has the best results in all Koshertrivia games today?") };
};

export default function Page({ lang }: { lang: Lang }) {
  const t = tr(lang);
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("Bestenliste", "Leaderboard")}</h1>
      <p className="mt-2 text-muted">
        {t(
          "Jedes Spiel bringt bis zu 100 Punkte. Es zählt das Tagesrätsel von heute – dein erstes Ergebnis pro Spiel.",
          "Each game is worth up to 100 points. Only today's daily puzzle counts – your first result per game."
        )}
      </p>
      <Suspense>
        <Leaderboard />
      </Suspense>
    </div>
  );
}
