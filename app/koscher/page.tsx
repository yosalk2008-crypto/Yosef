import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { KosherQuiz } from "./KosherQuiz";
import "./kosher.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Ist das koscher?",
  description: "Shrimps, Giraffe, Lichtschalter am Schabbat: Rate, was im Judentum erlaubt ist – über 100 Fragen mit Erklärungen.",
};

export default function Page() {
  return (
    <div className={inter.variable}>
      <KosherQuiz />
    </div>
  );
}
