import type { Metadata } from "next";
import { Archive } from "@/components/Archive";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => {
  const t = tr(lang);
  return { title: t("Archiv", "Archive"), description: t("Alle bisherigen Tagesrätsel zum Nachspielen.", "Every past daily puzzle, ready to replay.") };
};

export default function ArchivPage({ lang }: { lang: Lang }) {
  const t = tr(lang);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:pt-12">
      <h1 className="text-3xl font-display font-semibold tracking-tight sm:text-4xl">{t("Archiv", "Archive")}</h1>
      <p className="mt-2 text-muted">{t("Über tausend frühere Tagesrätsel – wähle einen Tag und spiel nach.", "Over a thousand past daily puzzles – pick a day and play.")}</p>
      <Archive />
    </div>
  );
}
