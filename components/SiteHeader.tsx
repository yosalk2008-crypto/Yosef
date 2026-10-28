"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const links = [
  { href: "/#leistungen", label: "Leistungen" },
  { href: "/#pakete", label: "Pakete" },
  { href: "/#ablauf", label: "Ablauf" },
  { href: "/musterwebsite", label: "Musterwebsite" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? "border-b border-white/10 bg-ink/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo light />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#anfrage"
            className="ml-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-brand-soft"
          >
            Anfrage stellen
          </Link>
        </nav>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg text-white md:hidden"
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
        <nav className="border-t border-white/10 px-5 pb-5 md:hidden" aria-label="Mobile Navigation">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block border-b border-white/5 py-3 text-base font-medium text-white/80"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#anfrage"
            onClick={() => setOpen(false)}
            className="mt-4 block rounded-full bg-white py-3 text-center font-semibold text-ink"
          >
            Anfrage stellen
          </Link>
        </nav>
      )}
    </header>
  );
}
