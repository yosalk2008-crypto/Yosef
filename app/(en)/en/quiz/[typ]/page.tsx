import type { Metadata } from "next";
import P, { generateStaticParams, metaFor } from "@/app/_p/quiz-typ";
import { alternates } from "@/lib/seo";

export { generateStaticParams };

export async function generateMetadata({ params }: { params: Promise<{ typ: string }> }): Promise<Metadata> {
  const { typ } = await params;
  return { ...(await metaFor("en", params)), alternates: alternates(`/quiz/${typ}`, "en") };
}

export default P;
