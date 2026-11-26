import type { Metadata } from "next";
import type { ComponentType } from "react";
import P, { meta } from "@/app/_p/offline";
import type { Lang } from "@/lib/i18n";

const C = P as ComponentType<{ lang: Lang }>;
export const metadata: Metadata = meta("en");

export default function Page() {
  return <C lang="en" />;
}
