import type { Metadata } from "next";
import { RanglistePage, ranglisteMeta, ranglisteParams } from "@/app/_p/laender";
import { alternates } from "@/lib/seo";

export const generateStaticParams = ranglisteParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ wert: string }> }): Promise<Metadata> {
  const { wert } = await params;
  return { ...(await ranglisteMeta("de", params)), alternates: alternates(`/laender/rangliste/${wert}`, "de") };
}

export default function Page({ params }: { params: Promise<{ wert: string }> }) {
  return <RanglistePage lang="de" params={params} />;
}
