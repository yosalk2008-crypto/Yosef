import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Koshertrivia – daily geography puzzles & country quizzes",
    template: "%s · Koshertrivia",
  },
  description:
    "Eight new geography puzzles every day and unlimited quizzes on flags, capitals, outlines and maps – world, continents, Middle East, German states, Swiss cantons, US states and more.",
  openGraph: {
    title: "Koshertrivia – daily geography puzzles",
    description: "Eight new puzzles every day plus unlimited country quizzes. Free, no sign-up.",
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#f6f2ec" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
