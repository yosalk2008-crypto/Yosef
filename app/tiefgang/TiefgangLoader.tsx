"use client";

import dynamic from "next/dynamic";

const T = dynamic(() => import("@/components/tiefgang/Tiefgang").then((m) => m.Tiefgang), {
  ssr: false,
  loading: () => <div className="min-h-[80vh]" style={{ background: "rgb(72 158 220)" }} />,
});

export function TiefgangLoader({ mode }: { mode: "daily" | "endlos" }) {
  return <T mode={mode} />;
}
