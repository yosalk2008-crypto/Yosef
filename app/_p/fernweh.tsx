import type { Metadata } from "next";
import { FernwehLoader } from "@/app/(de)/fernweh/FernwehLoader";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return { title: t("Fernweh – die tägliche Expedition auf der Weltkarte", "Wanderlust – the daily expedition on the world map"), description: t("Fünf Hinweise, fünf Pins auf einer Weltkarte ohne Namen: Je seltener dein passendes Land, desto mehr Kilometer – bis zu 500 km am Tag.", "Five clues, five pins on a world map without names: the rarer your fitting country, the more kilometres – up to 500 km a day.") };
};

export default function Page() {
  return <FernwehLoader mode="daily" />;
}
