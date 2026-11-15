import type { Metadata } from "next";
import { FragenPage, fragenMeta } from "@/app/_p/frage";
import { alternates } from "@/lib/seo";

export const metadata: Metadata = { ...fragenMeta("halal", "en"), alternates: alternates("/halal/fragen", "en") };

export default function Page() {
  return <FragenPage game="halal" lang="en" />;
}
