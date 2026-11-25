import type { Metadata } from "next";
import P, { meta } from "@/app/_p/turboball";
import { alternates } from "@/lib/seo";

export const metadata: Metadata = { ...meta("en"), alternates: alternates("/turboball", "en") };

export default function Page() {
  return <P />;
}
