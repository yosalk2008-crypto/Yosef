import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { HalalQuiz } from "@/app/(de)/halal/HalalQuiz";
import "@/app/(de)/koscher/kosher.css";
import "@/app/(de)/halal/halal.css";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Ist das halal?", "Is it halal?"),
    description: t(
      "Vape, Sportwetten, Zinsen, Kredite: Rate, was im Islam erlaubt ist – 135 Fragen mit Quellen aus Quran, Tafsir, Sahih al-Bukhari und Sahih Muslim.",
      "Vaping, sports betting, interest, loans: guess what Islam allows – 135 questions with sources from the Quran, Tafsir, Sahih al-Bukhari and Sahih Muslim."
    ),
  };
};

export default function Page() {
  return (
    <div className={inter.variable}>
      <HalalQuiz />
    </div>
  );
}
