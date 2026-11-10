"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";

/** Only on the home page and the legal pages – it gets in the way while playing. */
export function SiteFooter() {
  const path = usePathname();
  if (!["/", "/impressum", "/datenschutz", "/quellen"].includes(path)) return null;
  return (
    <footer className="border-t-2 border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name} · ein Projekt von {site.company}
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Rechtliches">
          <Link href="/quellen" className="hover:text-ink">
            Datenquellen
          </Link>
          <Link href="/impressum" className="hover:text-ink">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-ink">
            Datenschutz
          </Link>
        </nav>
      </div>
    </footer>
  );
}
