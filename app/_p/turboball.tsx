import type { Metadata } from "next";
import { Turboball } from "@/components/turboball/Turboball";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Rocket Football – Auto-Fußball online im Browser", "Rocket Football – car soccer online in your browser"),
    description: t(
      "Auto-Fußball mit Boost, Sprüngen und Flips: gegen Bots oder online mit Freunden (1v1 bis 3v3). Kostenlos im Browser, mit Tastatur, Controller oder Handy.",
      "Car soccer with boost, jumps and flips: against bots or online with friends (1v1 to 3v3). Free in your browser, with keyboard, gamepad or phone."
    ),
  };
};

export default function Page() {
  return <Turboball />;
}
