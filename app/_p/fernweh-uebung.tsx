import type { Metadata } from "next";
import { FernwehLoader } from "@/app/(de)/fernweh/FernwehLoader";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return { title: t("Fernweh – Übungshinweis", "Wanderlust – practice clue"), description: t("Ein einzelner Hinweis zum Üben, beliebig oft.", "A single clue to practise, as often as you like.") };
};

export default function Page() {
  return <FernwehLoader mode="uebung" />;
}
