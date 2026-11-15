import type { Metadata } from "next";
import { Uebersicht, uebersichtMeta } from "@/app/_p/laender";
import { alternates } from "@/lib/seo";

export const metadata: Metadata = { ...uebersichtMeta("en"), alternates: alternates("/laender", "en") };

export default function Page() {
  return <Uebersicht lang="en" />;
}
