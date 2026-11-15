import type { Metadata } from "next";
import { FragenPage, fragenMeta } from "@/app/_p/frage";
import { alternates } from "@/lib/seo";

export const metadata: Metadata = { ...fragenMeta("halal", "de"), alternates: alternates("/halal/fragen", "de") };

export default function Page() {
  return <FragenPage game="halal" lang="de" />;
}
