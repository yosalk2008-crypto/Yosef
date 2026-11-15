import type { Metadata } from "next";
import { FragePage, frageMeta, frageParams } from "@/app/_p/frage";
import { alternates } from "@/lib/seo";

export const generateStaticParams = frageParams("koscher");
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { ...(await frageMeta("koscher", "de", params)), alternates: alternates(`/koscher/frage/${slug}`, "de") };
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <FragePage game="koscher" lang="de" params={params} />;
}
