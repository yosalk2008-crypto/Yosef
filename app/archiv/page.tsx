import type { Metadata } from "next";
import { Archive } from "@/components/Archive";

export const metadata: Metadata = { title: "Archiv", description: "Alle bisherigen Tagesrätsel zum Nachspielen." };

export default function ArchivPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:pt-12">
      <h1 className="text-3xl font-display font-semibold tracking-tight sm:text-4xl">Archiv</h1>
      <p className="mt-2 text-muted">Über tausend frühere Tagesrätsel – wähle einen Tag und spiel nach.</p>
      <Archive />
    </div>
  );
}
