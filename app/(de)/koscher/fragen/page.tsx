import type { Metadata } from "next";
import { FragenPage, fragenMeta } from "@/app/_p/frage";
import { alternates } from "@/lib/seo";

export const metadata: Metadata = { ...fragenMeta("koscher", "de"), alternates: alternates("/koscher/fragen", "de") };

export default function Page() {
  return <FragenPage game="koscher" lang="de" />;
}
