"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dayNumber, formatDay, msUntilNextDay, type GameKey } from "@/lib/daily";
import { GAME_BY_KEY, GAMES } from "@/lib/games";
import { Icon } from "./Icon";
import { GameArt } from "./GameArt";

export function GameShell({
  game,
  day,
  isToday,
  rules,
  children,
}: {
  game: GameKey;
  day: string;
  isToday: boolean;
  rules: React.ReactNode;
  children: React.ReactNode;
}) {
  const info = GAME_BY_KEY[game];
  const [help, setHelp] = useState(false);
  useEffect(() => {
    try {
      const k = "geografik:seen:" + game;
      if (!localStorage.getItem(k)) {
        setHelp(true);
        localStorage.setItem(k, "1");
      }
    } catch {}
  }, [game]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:pt-10">
      <div className="chunk mb-6 flex items-center justify-between gap-3 p-3 sm:p-4" style={{ background: info.bg, ["--edge" as string]: info.edge }}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-14 w-16 shrink-0 place-items-center rounded-2xl bg-white/45 sm:h-16 sm:w-20">
            <GameArt game={game} className="h-11 w-14 sm:h-12 sm:w-16" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold leading-tight sm:text-3xl">
              {info.title} <span className="text-ink/55">#{dayNumber(day)}</span>
            </h1>
            <p className="text-sm font-semibold text-ink/70">
              {formatDay(day)}
              {!isToday && (
                <>
                  {" – "}
                  <Link href="/archiv" className="underline underline-offset-2">
                    aus dem Archiv
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setHelp(true)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/60 hover:bg-white" aria-haspopup="dialog" aria-label="Regeln">
          <Icon d="M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4.5M12 18h.01M12 21a9 9 0 100-18 9 9 0 000 18z" className="h-6 w-6" />
        </button>
      </div>
      {children}
      {help && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={() => setHelp(false)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-3xl bg-white p-6 shadow-[0_6px_0_#d9d0c3]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 grid h-20 w-28 place-items-center rounded-2xl" style={{ background: info.bg }}>
              <GameArt game={game} className="h-16 w-24" />
            </div>
            <h2 id="rules-title" className="text-center text-2xl font-semibold">
              So geht {info.title}
            </h2>
            <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:text-ink">{rules}</div>
            <button type="button" className="btn-primary mt-6 w-full" onClick={() => setHelp(false)} autoFocus>
              Los geht&apos;s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResultCard({
  title,
  score,
  share,
  isToday,
  current,
  children,
}: {
  title: string;
  score: string;
  share: string;
  isToday: boolean;
  current: GameKey;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = msUntilNextDay();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const copy = async () => {
    const text = share + "\nfirmengrafik.de";
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const next = GAMES.filter((g) => g.key !== current);
  return (
    <section className="card mt-6 p-5 sm:p-6" aria-live="polite">
      <p className="font-display text-lg font-semibold text-muted">{title}</p>
      <p className="font-display text-5xl font-semibold">{score}</p>
      {children && <div className="mt-3 text-[15px] text-muted">{children}</div>}
      <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-paper p-3 font-sans text-sm font-semibold">{share}</pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-primary">
          {copied ? "Kopiert ✓" : "Ergebnis teilen"}
        </button>
        <Link href="/" className="btn-ghost">
          Alle Tagesspiele
        </Link>
      </div>
      {isToday && <p className="mt-4 text-sm text-muted">Nächstes Rätsel in {left}</p>}
      <div className="mt-5 border-t-2 border-line pt-4">
        <p className="mb-2 text-sm font-semibold">Weiterspielen</p>
        <div className="flex flex-wrap gap-2">
          {next.map((g) => (
            <Link key={g.key} href={`/taeglich/${g.key}`} className="chunk flex items-center gap-1.5 !rounded-2xl py-1.5 pl-1.5 pr-3 font-display font-semibold" style={{ background: g.bg, ["--edge" as string]: g.edge }}>
              <GameArt game={g.key} className="h-7 w-9" />
              {g.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
