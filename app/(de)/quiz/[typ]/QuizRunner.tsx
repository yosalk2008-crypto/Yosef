"use client";

import dynamic from "next/dynamic";
import type { QuizType } from "@/lib/games";

const loading = () => (
  <div className="mx-auto max-w-3xl px-4 pt-10">
    <div className="h-80 animate-pulse rounded-2xl bg-line" />
  </div>
);

const MC = dynamic(() => import("@/components/quiz/ChoiceQuiz").then((m) => m.ChoiceQuiz), { ssr: false, loading });
const MapQ = dynamic(() => import("@/components/quiz/MapQuiz").then((m) => m.MapQuiz), { ssr: false, loading });
const NameAll = dynamic(() => import("@/components/quiz/NameAllQuiz").then((m) => m.NameAllQuiz), { ssr: false, loading });

export function QuizRunner({ typ }: { typ: string }) {
  const t = typ as QuizType;
  if (t === "karte") return <MapQ />;
  if (t === "alle-nennen") return <NameAll />;
  return <MC typ={t} />;
}
