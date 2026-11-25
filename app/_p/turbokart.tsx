import type { Metadata } from "next";
import { Turbokart } from "@/components/turbokart/Turbokart";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Turbokart – Kart-Rennen online im Browser", "Turbokart – kart racing online in your browser"),
    description: t(
      "Kart-Rennen mit Driften, Mini-Turbos und Items: 3 Strecken, 8 Fahrer, Cup-Modus und Online-Rennen mit Freunden. Kostenlos im Browser, mit Tastatur, Controller oder Handy.",
      "Kart racing with drifting, mini-turbos and items: 3 tracks, 8 racers, cup mode and online races with friends. Free in your browser, with keyboard, gamepad or phone."
    ),
  };
};

export default function Page() {
  return <Turbokart />;
}
