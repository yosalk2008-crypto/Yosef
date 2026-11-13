import type { Metadata } from "next";
import P, { generateStaticParams, metaFor } from "@/app/_p/taeglich";
import { alternates } from "@/lib/seo";

export { generateStaticParams };

export async function generateMetadata({ params }: { params: Promise<{ spiel: string }> }): Promise<Metadata> {
  const { spiel } = await params;
  return { ...(await metaFor("en", params)), alternates: alternates(`/taeglich/${spiel}`, "en") };
}

export default P;
