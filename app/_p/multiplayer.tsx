import type { Metadata } from "next";
import { Suspense } from "react";
import { Multiplayer } from "@/components/mp/Multiplayer";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return {
    title: t("Mit Freunden spielen – Multiplayer", "Play with friends – multiplayer"),
    description: t(
      "Erstelle einen Server oder tritt mit Code bei: Ist das koscher?, Ist das halal?, Tiefgang, Flaggen, Hauptstädte und die Tagesspiele live mit Freunden spielen.",
      "Create a server or join with a code: play Is it kosher?, Is it halal?, Deep Dive, flags, capitals and the daily games live with friends."
    ),
  };
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <Multiplayer />
    </Suspense>
  );
}
