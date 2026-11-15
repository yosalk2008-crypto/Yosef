import type { Metadata } from "next";
import P, { quizRegionMeta, quizRegionParams } from "@/app/_p/quiz-region";
import { alternates } from "@/lib/seo";

export const generateStaticParams = quizRegionParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ typ: string; region: string }> }): Promise<Metadata> {
  const { typ, region } = await params;
  return { ...(await quizRegionMeta("en", params)), alternates: alternates(`/quiz/${typ}/${region}`, "en") };
}

export default P;
