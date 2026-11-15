import type { Metadata } from "next";
import { LandPage, landMeta, landParams } from "@/app/_p/laender";
import { alternates } from "@/lib/seo";

export const generateStaticParams = landParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ land: string }> }): Promise<Metadata> {
  const { land } = await params;
  return { ...(await landMeta("de", params)), alternates: alternates(`/laender/${land}`, "de") };
}

export default function Page({ params }: { params: Promise<{ land: string }> }) {
  return <LandPage lang="de" params={params} />;
}
