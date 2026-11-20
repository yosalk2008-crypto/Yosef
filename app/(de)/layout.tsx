import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "GeoDuels – tägliche Geografie-Rätsel & Länder-Quizze",
    template: "%s · GeoDuels",
  },
  description:
    "Acht neue Geografie-Rätsel jeden Tag und unbegrenzte Quizze zu Flaggen, Hauptstädten, Umrissen und Karten – Welt, Kontinente, Naher Osten, Bundesländer, Kantone, US-Staaten, syrische Gouvernements, marokkanische Regionen und türkische Provinzen.",
  openGraph: {
    title: "GeoDuels – tägliche Geografie-Rätsel",
    description: "Acht neue Rätsel jeden Tag plus unbegrenzte Länder-Quizze. Kostenlos und ohne Anmeldung.",
    siteName: "GeoDuels",
    locale: "de_DE",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#f6f2ec" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="de">{children}</RootShell>;
}
