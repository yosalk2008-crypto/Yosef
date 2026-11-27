"use client";

import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { allResults, streak, todayFor, useStoreVersion } from "@/lib/daily";
import { GAMES, gTitle } from "@/lib/games";
import { stripLang, useLang, useT } from "@/lib/i18n";
import NextLink from "next/link";
import { MAIN_REGIONS, regionLabel } from "@/lib/data/regions";
import { GameArt } from "./GameArt";
import { MoreArt } from "./MoreArt";
import { TILES } from "./MoreBoard";
import { Logo } from "./Logo";
import { SOUTHBEACH_ENABLED } from "@/lib/southbeach/flag";

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

      {open && <Menu onClose={() => setOpen(false)} path={stripLang(path)} />}
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

const Chevron = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/** The menu that slides in from the left: daily games (with ✓ once played today), the other games as
 *  small tiles in their home-page colours, friends + leaderboard, regions and the rest as a plain list. */
function Menu({ onClose, path }: { onClose: () => void; path: string }) {
  const lang = useLang();
  const t = useT();
  const v = useStoreVersion();
  const [done, setDone] = useState<Record<string, string>>({});
  useEffect(() => {
    const all = allResults();
    const d: Record<string, string> = {};
    for (const g of [...GAMES.map((x) => x.key), "gipfelsturm", "fernweh"] as const) {
      const r = all[todayFor(g as never)]?.[g as never] as { done?: boolean; label?: string } | undefined;
      if (r?.done) d[g] = r.label || "✓";
    }
    setDone(d);
  }, [v]);
  const playedCount = GAMES.filter((g) => done[g.key]).length;
  const here = (href: string) => path === href || path.startsWith(href + "/");
  const ring = (href: string) => (here(href) ? " outline outline-[3px] outline-offset-2 outline-ink" : "");

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("Menü", "Menu")}>
      <button type="button" className="menu-fade absolute inset-0 bg-ink/45" onClick={onClose} aria-label={t("Menü schließen", "Close menu")} tabIndex={-1} />
      <nav className="menu-slide absolute inset-y-0 left-0 flex w-[min(100%,400px)] flex-col bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-line px-4 py-3 sm:px-5">
          <Link href="/" aria-label={t("Koshertrivia – Startseite", "Koshertrivia – home")}>
            <Logo />
          </Link>
          <button type="button" onClick={onClose} className="grid h-12 w-12 place-items-center rounded-2xl hover:bg-surface" aria-label={t("Menü schließen", "Close menu")} autoFocus>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">{t("Tägliche Spiele", "Daily games")}</h2>
            <span className="text-sm font-bold text-muted">{t(`${playedCount} von ${GAMES.length} gespielt`, `${playedCount} of ${GAMES.length} played`)}</span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {GAMES.map((g) => {
              const href = `/taeglich/${g.key}`;
              return (
                <Link
                  key={g.key}
                  href={href}
                  className={"chunk !rounded-xl relative flex items-center gap-2 py-2 pl-2 pr-2.5 font-display font-semibold" + ring(href)}
                  style={{ background: g.bg, ["--edge" as string]: g.edge }}
                >
                  <GameArt game={g.key} className="h-9 w-11 shrink-0" />
                  <span className="min-w-0 flex-1 text-[15px] leading-tight">{gTitle(g, lang)}</span>
                  {done[g.key] && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-white text-[13px] font-extrabold" aria-label={t("heute gespielt", "played today")}>
                      ✓
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <h2 className="mt-7 text-xl font-semibold">{t("Weitere Spiele", "More games")}</h2>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {TILES.map((g) => (
              <Link
                key={g.key}
                href={g.href}
                className={"chunk !rounded-xl relative flex items-center gap-2 py-2 pl-2 pr-2.5 text-white" + ring(g.href)}
                style={{ background: g.bg, ["--edge" as string]: g.edge }}
              >
                <MoreArt game={g.key} className="h-9 w-11 shrink-0 object-contain" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-[15px] font-semibold leading-tight">{t(g.de, g.en)}</span>
                  <span className="truncate text-[11px] font-bold leading-tight text-white/80">{g.daily && done[g.daily] ? `✓ ${done[g.daily]}` : t(g.subDe, g.subEn)}</span>
                </span>
              </Link>
            ))}
            <Link
              href="/andere-spiele"
              className={"chunk !rounded-xl relative flex items-center gap-2 py-2 pl-2 pr-2.5 text-white" + ring("/andere-spiele")}
              style={{ background: "linear-gradient(110deg, #ff3d7f 0%, #6a1f8a 50%, #1f6fff 100%)", ["--edge" as string]: "#1a0a2e" }}
            >
              <MoreArt game="spiele" className="h-9 w-11 shrink-0 object-contain" />
              <span className="flex min-w-0 flex-col">
                <span className="font-display text-[15px] font-semibold leading-tight">{t("Andere Spiele", "Other games")}</span>
                <span className="truncate text-[11px] font-bold leading-tight text-white/80">Cart Race · Rocket Football</span>
              </span>
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2.5">
            <Link href="/multiplayer" className={"chunk !rounded-xl flex flex-col gap-0.5 px-3.5 py-3" + ring("/multiplayer")} style={{ background: "#ee8a2f", ["--edge" as string]: "#b9621a" }}>
              <span className="flex -space-x-2" aria-hidden="true">
                {["#3f86dd", "#3e9a3a", "#d6453d"].map((c, k) => (
                  <span key={c} className="h-6 w-6 rounded-full border-2 border-ink" style={{ background: c, zIndex: 3 - k }} />
                ))}
              </span>
              <span className="mt-1 font-display text-[17px] font-semibold leading-tight">{t("Mit Freunden", "With friends")}</span>
              <span className="text-xs font-bold text-ink/70">{t("Server & 1v1", "Servers & 1v1")}</span>
            </Link>
            <Link href="/bestenliste" className={"chunk !rounded-xl flex flex-col gap-0.5 px-3.5 py-3" + ring("/bestenliste")} style={{ background: "#f3d272", ["--edge" as string]: "#c9a23c" }}>
              <span className="text-2xl leading-6" aria-hidden="true">🏆</span>
              <span className="mt-1 font-display text-[17px] font-semibold leading-tight">{t("Bestenliste", "Leaderboard")}</span>
              <span className="text-xs font-bold text-ink/70">{t("Wer ist heute vorne?", "Who leads today?")}</span>
            </Link>
          </div>

          <h2 className="mt-7 text-xl font-semibold">{t("Quiz nach Region", "Quiz by region")}</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {MAIN_REGIONS.map((r) => (
              <Link key={r.key} href={`/quiz?region=${r.key}`} className="chip !rounded-lg">
                {regionLabel(r, lang)}
              </Link>
            ))}
          </div>

          <div className="mt-7 overflow-hidden rounded-2xl border-2 border-line bg-white">
            {[
              ["/quiz", t("Alle Quizze", "All quizzes"), t("Flaggen, Hauptstädte, Umrisse, Karte", "Flags, capitals, outlines, map")],
              ["/archiv", t("Archiv", "Archive"), t("Alle früheren Tagesrätsel", "All past daily puzzles")],
              ["/laender", t("Alle Länder", "All countries"), t("Steckbriefe zu jedem Land", "A fact sheet for every country")],
            ].map(([href, title, sub], k) => (
              <Link key={href} href={href} className={`flex items-center gap-3 px-4 py-3 hover:bg-surface ${k ? "border-t-2 border-line" : ""} ${here(href) ? "bg-surface" : ""}`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-[17px] font-semibold leading-tight">{title}</span>
                  <span className="text-[13px] font-semibold text-muted">{sub}</span>
                </span>
                <Chevron />
              </Link>
            ))}
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
        </div>
      </nav>
    </div>
  );
}
