import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { KosherQuiz } from "@/app/(de)/koscher/KosherQuiz";
import "@/app/(de)/koscher/kosher.css";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Ist das koscher?", "Is it kosher?"),
    description: t(
      "Shrimps, Giraffe, Lichtschalter am Schabbat: Rate, was im Judentum erlaubt ist – über 140 Fragen mit Erklärungen.",
      "Shrimp, giraffe, light switches on Shabbat: guess what Judaism allows – over 140 questions with explanations."
    ),
  };
};

export default function Page() {
  return (
    <div className={inter.variable}>
      <KosherQuiz />
    </div>
  );
}
