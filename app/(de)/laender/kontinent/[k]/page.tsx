import type { Metadata } from "next";
import { KontinentPage, kontinentMeta, kontinentParams } from "@/app/_p/laender";
import { alternates } from "@/lib/seo";

export const generateStaticParams = kontinentParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ k: string }> }): Promise<Metadata> {
  const { k } = await params;
  return { ...(await kontinentMeta("de", params)), alternates: alternates(`/laender/kontinent/${k}`, "de") };
}

export default function Page({ params }: { params: Promise<{ k: string }> }) {
  return <KontinentPage lang="de" params={params} />;
}
