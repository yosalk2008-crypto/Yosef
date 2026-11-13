import type { Metadata } from "next";
import type { ComponentType } from "react";
import P, { meta } from "@/app/_p/halal";
import { alternates } from "@/lib/seo";
import type { Lang } from "@/lib/i18n";

const C = P as ComponentType<{ lang: Lang }>;
export const metadata: Metadata = { ...meta("de"), alternates: alternates("/halal", "de") };

export default function Page() {
  return <C lang="de" />;
}
