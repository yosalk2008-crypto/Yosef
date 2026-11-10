import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES, GAME_BY_KEY } from "@/lib/games";
import type { GameKey } from "@/lib/daily";
import { DailyGame } from "./DailyGame";

export function generateStaticParams() {
  return GAMES.map((g) => ({ spiel: g.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ spiel: string }> }): Promise<Metadata> {
  const { spiel } = await params;
  const g = GAME_BY_KEY[spiel as GameKey];
  if (!g) return {};
  return { title: `${g.title} – tägliches Geografie-Rätsel`, description: g.tagline };
}

export default async function Page({ params }: { params: Promise<{ spiel: string }> }) {
  const { spiel } = await params;
  if (!GAME_BY_KEY[spiel as GameKey]) notFound();
  return <DailyGame game={spiel as Exclude<GameKey, "tiefgang">} />;
}
