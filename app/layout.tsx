import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Firmengrafik – Professionelle Websites im Abo",
    template: "%s · Firmengrafik",
  },
  description:
    "Moderne, professionelle Websites im Abo-Modell: Design, Domain, Hosting, SSL und schneller Änderungsservice – alles zu einem festen Monatspreis.",
  openGraph: {
    title: "Firmengrafik – Professionelle Websites im Abo",
    description:
      "Design, Domain, Hosting, SSL und schneller Änderungsservice – alles zu einem festen Monatspreis.",
    locale: "de_DE",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
