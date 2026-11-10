"use client";

import dynamic from "next/dynamic";
import type { GameKey } from "@/lib/daily";

const loading = () => (
  <div className="mx-auto max-w-3xl px-4 pt-10">
    <div className="h-12 w-64 animate-pulse rounded-xl bg-line" />
    <div className="mt-6 h-80 animate-pulse rounded-2xl bg-line" />
  </div>
);

const MAP: Record<GameKey, React.ComponentType> = {
  laenderjagd: dynamic(() => import("@/components/games/Laenderjagd").then((m) => m.Laenderjagd), { ssr: false, loading }),
  massstab: dynamic(() => import("@/components/games/Massstab").then((m) => m.Massstab), { ssr: false, loading }),
  viererbande: dynamic(() => import("@/components/games/Viererbande").then((m) => m.Viererbande), { ssr: false, loading }),
  "hoeher-tiefer": dynamic(() => import("@/components/games/HoeherTiefer").then((m) => m.HoeherTiefer), { ssr: false, loading }),
  spitzenplatz: dynamic(() => import("@/components/games/Spitzenplatz").then((m) => m.Spitzenplatz), { ssr: false, loading }),
  farbecht: dynamic(() => import("@/components/games/Farbecht").then((m) => m.Farbecht), { ssr: false, loading }),
  grenzgang: dynamic(() => import("@/components/games/Grenzgang").then((m) => m.Grenzgang), { ssr: false, loading }),
  zeitreise: dynamic(() => import("@/components/games/Zeitreise").then((m) => m.Zeitreise), { ssr: false, loading }),
};

export function DailyGame({ game }: { game: GameKey }) {
  const C = MAP[game];
  return <C />;
}
