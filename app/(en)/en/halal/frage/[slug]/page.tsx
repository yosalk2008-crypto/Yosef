import type { Metadata } from "next";
import { FragePage, frageMeta, frageParams } from "@/app/_p/frage";
import { alternates } from "@/lib/seo";

export const generateStaticParams = frageParams("halal");
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { ...(await frageMeta("halal", "en", params)), alternates: alternates(`/halal/frage/${slug}`, "en") };
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <FragePage game="halal" lang="en" params={params} />;
}
