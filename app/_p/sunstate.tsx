import type { Metadata } from "next";
import { Sunstate } from "@/components/sunstate/Sunstate";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Sunstate Hustle – Heist-Spiel im Browser", "Sunstate Hustle – heist game in your browser"),
    description: t(
      "Neon-Großstadt bei Nacht: Driften, Tresore hacken, Geldtransporter stoppen, der Polizei entkommen und Schwarzgeld in der eigenen Autowaschanlage waschen. Kostenlos im Browser.",
      "Neon city by night: drift, hack safes, stop armored trucks, outrun the police and launder dirty money through your own car wash. Free in your browser."
    ),
  };
};

export default function Page() {
  return <Sunstate />;
}
