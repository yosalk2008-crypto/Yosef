"use client";

import dynamic from "next/dynamic";

const G = dynamic(() => import("@/components/gipfel/Gipfelsturm").then((m) => m.Gipfelsturm), {
  ssr: false,
  loading: () => <div className="min-h-[80vh]" />,
});

export function GipfelLoader({ mode }: { mode: "daily" | "endlos" }) {
  return <G mode={mode} />;
}
