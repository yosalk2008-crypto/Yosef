import type { Metadata } from "next";
import { GipfelLoader } from "@/app/(de)/gipfelsturm/GipfelLoader";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Gipfelsturm – 7 Fragen, jede Antwort nur einmal", "Summit Rush – 7 questions, every answer only once"),
    description: t(
      "Jeden Tag ein neuer Berg: 7 Fragen zu Ländern oder Fußball, 25 Sekunden pro Frage – und jede Antwort zählt nur einmal. Spar dir die berühmten Namen für den Gipfel auf.",
      "A new mountain every day: 7 questions on countries or football, 25 seconds each – and every answer counts only once. Save the famous names for the summit."
    ),
  };
};

export default function Page() {
  return <GipfelLoader mode="daily" />;
}
