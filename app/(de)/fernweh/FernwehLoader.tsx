"use client";

import dynamic from "next/dynamic";

const F = dynamic(() => import("@/components/fernweh/Fernweh").then((m) => m.Fernweh), {
  ssr: false,
  loading: () => <div className="min-h-[80vh]" />,
});

export function FernwehLoader({ mode }: { mode: "daily" | "endlos" | "uebung" }) {
  return <F mode={mode} />;
}
