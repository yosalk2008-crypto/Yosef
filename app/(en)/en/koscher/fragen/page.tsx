import type { Metadata } from "next";
import { FragenPage, fragenMeta } from "@/app/_p/frage";
import { alternates } from "@/lib/seo";

export const metadata: Metadata = { ...fragenMeta("koscher", "en"), alternates: alternates("/koscher/fragen", "en") };

export default function Page() {
  return <FragenPage game="koscher" lang="en" />;
}
