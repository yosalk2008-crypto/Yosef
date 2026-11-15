import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QUIZ_TYPES, quizFits, quizRegionParams, type QuizType } from "@/lib/games";
import { REGION_BY_KEY, entitiesFor, regionLabel, type RegionKey } from "@/lib/data/regions";
import { QuizRunner } from "@/app/(de)/quiz/[typ]/QuizRunner";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export { quizRegionParams };

export async function quizRegionMeta(lang: Lang, params: Promise<{ typ: string; region: string }>): Promise<Metadata> {
  const { typ, region } = await params;
  const q = QUIZ_TYPES.find((x) => x.key === typ);
  const r = REGION_BY_KEY[region as RegionKey];
  if (!q || !r) return {};
  const t = tr(lang);
  const n = entitiesFor(r.key).length;
  const reg = regionLabel(r, lang);
  const what: Record<QuizType, [string, string]> = {
    flaggen: [`Erkennst du alle ${n} Flaggen?`, `Can you name all ${n} flags?`],
    hauptstaedte: [`Kennst du die Hauptstädte aller ${n} Gebiete?`, `Do you know all ${n} capitals?`],
    umrisse: [`Erkenne alle ${n} Gebiete an ihrem Umriss.`, `Recognise all ${n} places by their outline.`],
    karte: [`Finde alle ${n} Gebiete auf der Karte.`, `Find all ${n} places on the map.`],
    "alle-nennen": [`Wie viele der ${n} Gebiete kannst du in ${r.minutes} Minuten nennen?`, `How many of the ${n} places can you name in ${r.minutes} minutes?`],
  };
  return {
    title: t(`${q.title}-Quiz: ${reg}`, `${q.titleEn} quiz: ${reg}`),
    description: t(`${q.title}-Quiz ${reg}: ${what[q.key][0]} Kostenlos, ohne Anmeldung, so oft du willst.`, `${q.titleEn} quiz ${reg}: ${what[q.key][1]} Free, no sign-up, as often as you like.`),
  };
}

export default async function Page({ params }: { params: Promise<{ typ: string; region: string }> }) {
  const { typ, region } = await params;
  const r = REGION_BY_KEY[region as RegionKey];
  if (!r || !QUIZ_TYPES.some((q) => q.key === typ) || !quizFits(typ as QuizType, r)) notFound();
  return <QuizRunner typ={typ} />;
}
