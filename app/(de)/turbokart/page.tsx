import type { Metadata } from "next";
import P, { meta } from "@/app/_p/turbokart";
import { alternates } from "@/lib/seo";

export const metadata: Metadata = { ...meta("de"), alternates: alternates("/turbokart", "de") };

export default function Page() {
  return <P />;
}
