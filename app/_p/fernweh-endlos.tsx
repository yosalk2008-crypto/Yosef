import type { Metadata } from "next";
import { FernwehLoader } from "@/app/(de)/fernweh/FernwehLoader";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return { title: t("Fernweh – Endlos-Modus", "Wanderlust – endless mode"), description: t("Immer neue Expeditionen mit fünf Hinweisen.", "Endless new expeditions with five clues.") };
};

export default function Page() {
  return (
    <FernwehLoader mode="endlos" />
  );
}
