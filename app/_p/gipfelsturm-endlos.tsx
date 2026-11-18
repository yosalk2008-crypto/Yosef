import type { Metadata } from "next";
import { GipfelLoader } from "@/app/(de)/gipfelsturm/GipfelLoader";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return { title: t("Gipfelsturm – Endlos-Modus", "Summit Rush – endless mode"), description: t("Immer neue Berge: Länder oder Fußball, mit oder ohne Uhr.", "Endless new mountains: countries or football, with or without the clock.") };
};

export default function Page() {
  return <GipfelLoader mode="endlos" />;
}
