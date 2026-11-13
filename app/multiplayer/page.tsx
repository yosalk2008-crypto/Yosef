import type { Metadata } from "next";
import { Suspense } from "react";
import { Multiplayer } from "@/components/mp/Multiplayer";

export const metadata: Metadata = {
  title: "Mit Freunden spielen – Multiplayer",
  description: "Erstelle einen Server oder tritt mit Code bei: Ist das koscher?, Ist das halal?, Tiefgang, Flaggen und Hauptstädte live mit Freunden spielen.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <Multiplayer />
    </Suspense>
  );
}
