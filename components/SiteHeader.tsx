"use client";

import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { streak, useStoreVersion } from "@/lib/daily";
import { GAMES, gTitle } from "@/lib/games";
import { stripLang, useLang, useT } from "@/lib/i18n";
import NextLink from "next/link";
import { MAIN_REGIONS, regionLabel } from "@/lib/data/regions";
import { GameArt } from "./GameArt";
import { Logo } from "./Logo";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState(0);
  const v = useStoreVersion();
  const path = usePathname();
  const lang = useLang();
  const t = useT();
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
          <button type="button" onClick={() => setOpen(true)} className="grid h-12 w-12 place-items-center rounded-2xl hover:bg-surface" aria-label={t("Menü öffnen", "Open menu")} aria-expanded={open}>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Link href="/" aria-label={t("Koshertrivia – Startseite", "Koshertrivia – home")}>
            <Logo />
          </Link>
          <div className="flex items-center justify-end gap-1">
            <LangSwitch />
            <span className="flex items-center gap-1.5 rounded-2xl px-2 py-1" title={t(`Serie: ${st} ${st === 1 ? "Tag" : "Tage"} in Folge`, `Streak: ${st} ${st === 1 ? "day" : "days"} in a row`)} aria-label={t(`Serie: ${st} Tage`, `Streak: ${st} days`)}>
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
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("Menü", "Menu")}>
          <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label={t("Menü schließen", "Close menu")} tabIndex={-1} />
          <nav className="absolute inset-y-0 left-0 w-full max-w-sm overflow-y-auto bg-paper p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} className="grid h-12 w-12 place-items-center rounded-2xl hover:bg-surface" aria-label={t("Menü schließen", "Close menu")} autoFocus>
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <h2 className="mb-2 mt-2 text-lg font-semibold">{t("Tägliche Spiele", "Daily games")}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {GAMES.map((g) => (
                <Link
                  key={g.key}
                  href={`/taeglich/${g.key}`}
                  className="chunk !rounded-md flex items-center gap-2 px-2.5 py-2 font-display font-semibold"
                  style={{ background: g.bg, ["--edge" as string]: g.edge }}
                >
                  <GameArt game={g.key} className="h-9 w-12 shrink-0" />
                  <span className="text-[15px] leading-tight">{gTitle(g, lang)}</span>
                </Link>
              ))}
            </div>
            <Link href="/tiefgang" className="chunk !rounded-md mt-3 flex items-center justify-between px-4 py-3 font-display text-lg font-semibold text-white" style={{ background: "linear-gradient(160deg, #3f96d6, #0a2656)", ["--edge" as string]: "#061a3d" }}>
              {t("Tiefgang", "Deep Dive")}
              <span className="rounded-full bg-[#f3d272] px-2.5 py-0.5 text-sm text-ink">{t("Neu", "New")}</span>
            </Link>
            <Link
              href="/koscher"
              className="chunk !rounded-md mt-3 flex items-center justify-between px-4 py-3 font-display text-lg font-semibold text-white"
              style={{ background: "linear-gradient(160deg, #1f4fd1, #0a1630)", ["--edge" as string]: "#050c1f" }}
            >
              {t("Ist das koscher?", "Is it kosher?")}
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-ink">{t("Neu", "New")}</span>
            </Link>
            <Link
              href="/halal"
              className="chunk !rounded-md mt-3 flex items-center justify-between px-4 py-3 font-display text-lg font-semibold text-white"
              style={{ background: "linear-gradient(160deg, #12a06d, #062a20)", ["--edge" as string]: "#03170f" }}
            >
              {t("Ist das halal?", "Is it halal?")}
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-ink">{t("Neu", "New")}</span>
            </Link>
            <Link href="/multiplayer" className="chunk !rounded-md mt-3 flex items-center justify-between px-4 py-3 font-display text-lg font-semibold" style={{ background: "#ee8a2f", ["--edge" as string]: "#b9621a" }}>
              {t("Mit Freunden spielen", "Play with friends")}
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-ink">{t("Neu", "New")}</span>
            </Link>
            <h2 className="mb-2 mt-6 text-lg font-semibold">{t("Quiz nach Region", "Quiz by region")}</h2>
            <div className="flex flex-wrap gap-2">
              {MAIN_REGIONS.map((r) => (
                <Link key={r.key} href={`/quiz?region=${r.key}`} className="chip !rounded-md">
                  {regionLabel(r, lang)}
                </Link>
              ))}
            </div>
            <div className="mt-6 grid gap-2">
              <Link href="/bestenliste" className="btn-ghost justify-start">
                {t("Bestenliste", "Leaderboard")}
              </Link>
              <Link href="/archiv" className="btn-ghost justify-start">
                {t("Archiv – alle früheren Rätsel", "Archive – all past puzzles")}
              </Link>
              <Link href="/quiz" className="btn-ghost justify-start">
                {t("Alle Quizze", "All quizzes")}
              </Link>
            </div>
            <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted" aria-label={t("Rechtliches", "Legal")}>
              <Link href="/impressum" className="hover:text-ink">
                {t("Impressum", "Legal notice")}
              </Link>
              <Link href="/datenschutz" className="hover:text-ink">
                {t("Datenschutz", "Privacy")}
              </Link>
              <Link href="/quellen" className="hover:text-ink">
                {t("Datenquellen", "Data sources")}
              </Link>
            </nav>
          </nav>
        </div>
      )}
    </>
  );
}

/** DE | EN – the same page in the other language (keeps the query, e.g. ?region=…). */
function LangSwitch() {
  const lang = useLang();
  const path = usePathname();
  const [q, setQ] = useState("");
  useEffect(() => setQ(window.location.search), [path]);
  const base = stripLang(path);
  const other = lang === "en" ? base : base === "/" ? "/en" : "/en" + base;
  return (
    <NextLink
      href={other + q}
      onClick={() => setQ(window.location.search)}
      hrefLang={lang === "en" ? "de" : "en"}
      className="rounded-xl px-2 py-1.5 font-display text-[15px] font-semibold text-muted hover:bg-surface hover:text-ink"
      aria-label={lang === "en" ? "Auf Deutsch anzeigen" : "Switch to English"}
    >
      {lang === "en" ? "DE" : "EN"}
    </NextLink>
  );
}
