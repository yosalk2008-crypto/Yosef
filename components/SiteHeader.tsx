"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { streak, useStoreVersion } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { MAIN_REGIONS } from "@/lib/data/regions";
import { GameArt } from "./GameArt";
import { Logo } from "./Logo";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState(0);
  const v = useStoreVersion();
  const path = usePathname();
  useEffect(() => setSt(streak().current), [v, path]);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-3 sm:h-[72px] sm:px-4">
          <button type="button" onClick={() => setOpen(true)} className="grid h-12 w-12 place-items-center rounded-2xl hover:bg-surface" aria-label="Menü öffnen" aria-expanded={open}>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Link href="/" aria-label="Koshertrivia – Startseite">
            <Logo />
          </Link>
          <div className="flex justify-end">
            <span className="flex items-center gap-1.5 rounded-2xl px-2 py-1" title={`Serie: ${st} ${st === 1 ? "Tag" : "Tage"} in Folge`} aria-label={`Serie: ${st} Tage`}>
              <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                <path d="M12 2.5c1.2 3.4 5.5 5.8 5.5 11a5.5 5.5 0 01-11 0c0-2.4 1-4 2.3-5.2.2 2 1.2 3.2 2.4 3.4-1-3.6.3-6.6.8-9.2z" fill={st > 0 ? "#ee8a2f" : "#cfc7bc"} />
                <path d="M12 12.5c.6 1.6 2.6 2.6 2.6 5a2.6 2.6 0 01-5.2 0c0-1.3.6-2.2 1.2-2.7.2.9.6 1.4 1.1 1.5-.4-1.6.1-2.8.3-3.8z" fill={st > 0 ? "#f3d272" : "#e6dfd5"} />
              </svg>
              <span className="font-display text-2xl font-semibold tabular-nums">{st}</span>
            </span>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menü">
          <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Menü schließen" tabIndex={-1} />
          <nav className="absolute inset-y-0 left-0 w-full max-w-sm overflow-y-auto bg-paper p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} className="grid h-12 w-12 place-items-center rounded-2xl hover:bg-surface" aria-label="Menü schließen" autoFocus>
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <h2 className="mb-2 mt-2 text-lg font-semibold">Tägliche Spiele</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {GAMES.map((g) => (
                <Link
                  key={g.key}
                  href={`/taeglich/${g.key}`}
                  className="chunk !rounded-xl flex items-center gap-2 px-2.5 py-2 font-display font-semibold"
                  style={{ background: g.bg, ["--edge" as string]: g.edge }}
                >
                  <GameArt game={g.key} className="h-9 w-12 shrink-0" />
                  <span className="text-[15px] leading-tight">{g.title}</span>
                </Link>
              ))}
            </div>
            <Link href="/tiefgang" className="chunk !rounded-xl mt-3 flex items-center justify-between px-4 py-3 font-display text-lg font-semibold text-white" style={{ background: "linear-gradient(160deg, #3f96d6, #0a2656)", ["--edge" as string]: "#061a3d" }}>
              Tiefgang
              <span className="rounded-full bg-[#f3d272] px-2.5 py-0.5 text-sm text-ink">Neu</span>
            </Link>
            <Link
              href="/koscher"
              className="chunk !rounded-xl mt-3 flex items-center justify-between px-4 py-3 font-display text-lg font-semibold text-white"
              style={{ background: "linear-gradient(160deg, #1f4fd1, #0a1630)", ["--edge" as string]: "#050c1f" }}
            >
              Ist das koscher?
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-ink">Neu</span>
            </Link>
            <Link
              href="/halal"
              className="chunk !rounded-xl mt-3 flex items-center justify-between px-4 py-3 font-display text-lg font-semibold text-white"
              style={{ background: "linear-gradient(160deg, #12a06d, #062a20)", ["--edge" as string]: "#03170f" }}
            >
              Ist das halal?
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-ink">Neu</span>
            </Link>
            <Link href="/multiplayer" className="chunk !rounded-xl mt-3 flex items-center justify-between px-4 py-3 font-display text-lg font-semibold" style={{ background: "#ee8a2f", ["--edge" as string]: "#b9621a" }}>
              Mit Freunden spielen
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-ink">Neu</span>
            </Link>
            <h2 className="mb-2 mt-6 text-lg font-semibold">Quiz nach Region</h2>
            <div className="flex flex-wrap gap-2">
              {MAIN_REGIONS.map((r) => (
                <Link key={r.key} href={`/quiz?region=${r.key}`} className="chip !rounded-xl">
                  {r.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 grid gap-2">
              <Link href="/bestenliste" className="btn-ghost justify-start">
                Bestenliste
              </Link>
              <Link href="/archiv" className="btn-ghost justify-start">
                Archiv – alle früheren Rätsel
              </Link>
              <Link href="/quiz" className="btn-ghost justify-start">
                Alle Quizze
              </Link>
            </div>
            <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted" aria-label="Rechtliches">
              <Link href="/impressum" className="hover:text-ink">
                Impressum
              </Link>
              <Link href="/datenschutz" className="hover:text-ink">
                Datenschutz
              </Link>
              <Link href="/quellen" className="hover:text-ink">
                Datenquellen
              </Link>
            </nav>
          </nav>
        </div>
      )}
    </>
  );
}
