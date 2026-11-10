import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Geografik – tägliche Geografie-Rätsel & Länder-Quizze",
    template: "%s · Geografik",
  },
  description:
    "Acht neue Geografie-Rätsel jeden Tag und unbegrenzte Quizze zu Flaggen, Hauptstädten, Umrissen und Karten – Welt, Kontinente, Bundesländer, Kantone und US-Staaten.",
  openGraph: {
    title: "Geografik – tägliche Geografie-Rätsel",
    description: "Acht neue Rätsel jeden Tag plus unbegrenzte Länder-Quizze. Kostenlos und ohne Anmeldung.",
    locale: "de_DE",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0b1220" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
