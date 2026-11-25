import type { Metadata } from "next";
import type { ComponentType } from "react";
import P, { meta } from "@/app/_p/southbeach";
import { alternates } from "@/lib/seo";
import type { Lang } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { SOUTHBEACH_ENABLED } from "@/lib/southbeach/flag";

const C = P as ComponentType<{ lang: Lang }>;
export const metadata: Metadata = !SOUTHBEACH_ENABLED ? { robots: { index: false } } : { ...meta("de"), alternates: alternates("/southbeach", "de") };

export default function Page() {
  if (!SOUTHBEACH_ENABLED) notFound();
  return <C lang="de" />;
}
