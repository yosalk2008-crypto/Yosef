"use client";

import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { stripLang, useT } from "@/lib/i18n";

/** Only on the home page and the legal pages – it gets in the way while playing. */
export function SiteFooter() {
  const path = stripLang(usePathname());
  const t = useT();
  if (!["/", "/impressum", "/datenschutz", "/quellen"].includes(path)) return null;
  return (
    <footer className="border-t-2 border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name} · {t("ein Projekt von", "a project by")} {site.company}
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={t("Rechtliches", "Legal")}>
          <Link href="/quellen" className="hover:text-ink">
            {t("Datenquellen", "Data sources")}
          </Link>
          <Link href="/impressum" className="hover:text-ink">
            {t("Impressum", "Legal notice")}
          </Link>
          <Link href="/datenschutz" className="hover:text-ink">
            {t("Datenschutz", "Privacy")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
