import type { Metadata } from "next";
import Link from "@/components/Link";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const meta = (lang: Lang): Metadata => ({ title: lang === "en" ? "Offline" : "Offline", robots: { index: false } });

/** Shown by the service worker when there is no connection and the page was never opened before. */
export default function Offline({ lang }: { lang: Lang }) {
  const t = tr(lang);
  const p = lang === "en" ? "/en" : "";
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-6xl" aria-hidden="true">📡</p>
      <h1 className="mt-4 text-[32px] font-semibold leading-tight">{t("Gerade kein Internet", "No internet right now")}</h1>
      <p className="mt-3 text-lg font-semibold text-muted">
        {t(
          "Diese Seite hast du offline noch nicht geöffnet. Spiele, die du schon einmal geöffnet hast, funktionieren auch ohne Verbindung – neue Tagesrätsel, Bestenliste und Multiplayer brauchen Internet.",
          "You haven’t opened this page offline yet. Games you opened before also work without a connection – new daily puzzles, the leaderboard and multiplayer need internet."
        )}
      </p>
      <Link href={`${p}/`} className="btn-primary mt-6 inline-flex">{t("Zur Startseite", "Go to the home page")}</Link>
    </section>
  );
}
