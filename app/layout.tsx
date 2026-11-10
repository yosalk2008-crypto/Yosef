import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap", weight: ["500", "600", "700"] });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Geografik – tägliche Geografie-Rätsel & Länder-Quizze",
    template: "%s · Geografik",
  },
  description:
    "Acht neue Geografie-Rätsel jeden Tag und unbegrenzte Quizze zu Flaggen, Hauptstädten, Umrissen und Karten – Welt, Kontinente, Naher Osten, Bundesländer, Kantone, US-Staaten und syrische Gouvernements.",
  openGraph: {
    title: "Geografik – tägliche Geografie-Rätsel",
    description: "Acht neue Rätsel jeden Tag plus unbegrenzte Länder-Quizze. Kostenlos und ohne Anmeldung.",
    locale: "de_DE",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#f6f2ec" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
