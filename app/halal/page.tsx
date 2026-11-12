import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { HalalQuiz } from "./HalalQuiz";
import "../koscher/kosher.css";
import "./halal.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Ist das halal?",
  description: "Vape, Sportwetten, Zinsen, Kredite: Rate, was im Islam erlaubt ist – 125 Fragen mit Quellen aus Quran, Tafsir, Sahih al-Bukhari und Sahih Muslim.",
};

export default function Page() {
  return (
    <div className={inter.variable}>
      <HalalQuiz />
    </div>
  );
}
