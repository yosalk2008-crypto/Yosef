import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Firmengrafik – Websites, KI-Chatbots & Terminbuchung",
    template: "%s · Firmengrafik",
  },
  description:
    "Professionelle Websites im Abo, KI-Chatbots, KI-Telefonassistenten und Online-Terminbuchung für Unternehmen – alles aus einer Hand.",
  openGraph: {
    title: "Firmengrafik – Websites, KI-Chatbots & Terminbuchung",
    description:
      "Websites im Abo, KI-Chatbots, KI-Telefonassistenten und Online-Terminbuchung – alles aus einer Hand.",
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
