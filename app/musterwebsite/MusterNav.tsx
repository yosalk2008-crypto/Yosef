"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const base = "/musterwebsite";
const links = [
  { href: base, label: "Start" },
  { href: `${base}/bewertungen`, label: "Fotos & Bewertungen" },
  { href: `${base}/fuhrpark`, label: "Fuhrpark" },
  { href: `${base}/team`, label: "Team" },
  { href: `${base}/preise`, label: "Preise" },
  { href: `${base}/kontakt`, label: "Kontakt" },
];

export function MusterNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href={base} className="flex items-center gap-2.5 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-fs text-sm font-bold text-white">Q</span>
          Fahrschule Quirinus
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation Musterwebsite">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                pathname === l.href ? "bg-surface font-semibold text-ink" : "text-ink/70 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Menü öffnen"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-line px-5 pb-4 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block border-b border-line py-3 ${pathname === l.href ? "font-semibold text-fs" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
