import type { Metadata } from "next";
import { FragePage, frageMeta, frageParams } from "@/app/_p/frage";
import { alternates } from "@/lib/seo";

export const generateStaticParams = frageParams("koscher");
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { ...(await frageMeta("koscher", "en", params)), alternates: alternates(`/koscher/frage/${slug}`, "en") };
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <FragePage game="koscher" lang="en" params={params} />;
}
