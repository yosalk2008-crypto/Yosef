import type { Metadata } from "next";
import Link from "next/link";
import { MusterNav } from "./MusterNav";

export const metadata: Metadata = {
  title: { default: "Musterwebsite", template: "%s · Musterwebsite" },
  description: "Beispiel-Website einer Fahrschule – so modern kann Ihre Website mit Firmengrafik aussehen.",
};

export default function MusterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-xs sm:text-sm">
          <span className="text-white/75">
            Sie sehen eine <strong className="text-white">Musterwebsite</strong> von Firmengrafik – alle Inhalte sind Beispiele.
          </span>
          <span className="flex gap-4">
            <Link href="/" className="font-semibold text-white/80 hover:text-white">← Zurück zu Firmengrafik</Link>
            <Link href="/#anfrage" className="font-semibold text-indigo-300 hover:text-indigo-200">So eine Website anfragen</Link>
          </span>
        </div>
      </div>
      <MusterNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-5 py-8 text-sm text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Fahrschule Quirinus · Neuss</span>
          <span>
            Musterseite mit Beispielinhalten · erstellt von{" "}
            <Link href="/" className="font-medium text-ink hover:underline">Firmengrafik</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
