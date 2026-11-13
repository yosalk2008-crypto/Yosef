import type { Metadata } from "next";
import { TiefgangLoader } from "@/app/(de)/tiefgang/TiefgangLoader";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return { title: t("Tiefgang – Endlos-Modus", "Deep Dive – endless mode"), description: t("Unbegrenzte Runden Tiefgang mit zufälligen Fragen.", "Unlimited rounds of Deep Dive with random questions.") };
};

export default function Page() {
  return <TiefgangLoader mode="endlos" />;
}
