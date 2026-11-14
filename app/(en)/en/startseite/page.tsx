import type { Metadata } from "next";
import type { ComponentType } from "react";
import P, { meta } from "@/app/_p/home";
import { alternates } from "@/lib/seo";
import type { Lang } from "@/lib/i18n";

// The home page as its own subpage (e.g. to submit to Google), with its own canonical address.
const C = P as ComponentType<{ lang: Lang }>;
export const metadata: Metadata = { ...meta("en"), alternates: alternates("/startseite", "en") };

export default function Page() {
  return <C lang="en" />;
}
