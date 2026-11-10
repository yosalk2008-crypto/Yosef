import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QUIZ_TYPES } from "@/lib/games";
import { QuizRunner } from "./QuizRunner";

export function generateStaticParams() {
  return QUIZ_TYPES.map((q) => ({ typ: q.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ typ: string }> }): Promise<Metadata> {
  const { typ } = await params;
  const q = QUIZ_TYPES.find((x) => x.key === typ);
  return q ? { title: `${q.title}-Quiz`, description: q.tagline } : {};
}

export default async function Page({ params }: { params: Promise<{ typ: string }> }) {
  const { typ } = await params;
  if (!QUIZ_TYPES.some((q) => q.key === typ)) notFound();
  return <QuizRunner typ={typ} />;
}
