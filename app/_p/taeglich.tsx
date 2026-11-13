import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES, GAME_BY_KEY } from "@/lib/games";
import type { GameKey } from "@/lib/daily";
import { DailyGame } from "@/app/(de)/taeglich/[spiel]/DailyGame";
import type { Lang } from "@/lib/i18n";

export function generateStaticParams() {
  return GAMES.map((g) => ({ spiel: g.key }));
}

export async function metaFor(lang: Lang, params: Promise<{ spiel: string }>): Promise<Metadata> {
  const { spiel } = await params;
  const g = GAME_BY_KEY[spiel as GameKey];
  if (!g) return {};
  return lang === "en" ? { title: `${g.titleEn} – daily geography puzzle`, description: g.taglineEn } : { title: `${g.title} – tägliches Geografie-Rätsel`, description: g.tagline };
}

export default async function Page({ params }: { params: Promise<{ spiel: string }> }) {
  const { spiel } = await params;
  if (!GAME_BY_KEY[spiel as GameKey]) notFound();
  return <DailyGame game={spiel as Exclude<GameKey, "tiefgang">} />;
}
