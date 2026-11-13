import type { Metadata } from "next";
import P, { generateStaticParams, metaFor } from "@/app/_p/taeglich";
import { alternates } from "@/lib/seo";

export { generateStaticParams };

export async function generateMetadata({ params }: { params: Promise<{ spiel: string }> }): Promise<Metadata> {
  const { spiel } = await params;
  return { ...(await metaFor("de", params)), alternates: alternates(`/taeglich/${spiel}`, "de") };
}

export default P;
