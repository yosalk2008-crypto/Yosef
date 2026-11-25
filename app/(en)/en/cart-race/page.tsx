import type { Metadata } from "next";
import P, { meta } from "@/app/_p/turbokart";
import { alternates } from "@/lib/seo";

export const metadata: Metadata = { ...meta("en"), alternates: alternates("/cart-race", "en") };

export default function Page() {
  return <P />;
}
