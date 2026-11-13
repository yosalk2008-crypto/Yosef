import type { Metadata } from "next";
import P, { generateStaticParams, metaFor } from "@/app/_p/quiz-typ";
import { alternates } from "@/lib/seo";

export { generateStaticParams };

export async function generateMetadata({ params }: { params: Promise<{ typ: string }> }): Promise<Metadata> {
  const { typ } = await params;
  return { ...(await metaFor("de", params)), alternates: alternates(`/quiz/${typ}`, "de") };
}

export default P;
