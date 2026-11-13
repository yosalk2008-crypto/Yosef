"use client";

import Link from "@/components/Link";
import { useEffect, useState } from "react";
import { getResult, useStoreVersion, type GameKey } from "@/lib/daily";
import { getName, nameProblem, pointsFor, setName, submit, submitAllToday } from "@/lib/leaderboard";
import { useLang, useT } from "@/lib/i18n";

/** Under every finished daily game: enter a name once, then results go to the leaderboard automatically. */
export function LeaderboardJoin({ day, game, isToday, dark = false }: { day: string; game: GameKey; isToday: boolean; dark?: boolean }) {
  const lang = useLang();
  const t = useT();
  const [name, setNameState] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [pts, setPts] = useState<number | null>(null);
  const v = useStoreVersion();

  useEffect(() => {
    setNameState(getName());
    const r = getResult(day, game);
    if (r?.done) setPts(pointsFor(game, r));
  }, [day, game, v]);

  useEffect(() => {
    if (!name || !isToday) return;
    const r = getResult(day, game);
    if (!r?.done) return;
    setStatus("sending");
    submit(day, game, r).then((ok) => setStatus(ok ? "sent" : "failed"));
  }, [name, day, game, isToday, v]);

  const box = dark ? "bg-white/10 text-white" : "bg-paper";
  if (!isToday)
    return (
      <p className={`mt-4 rounded-2xl p-3 text-sm ${box}`}>
        {t("Archiv-Rätsel zählen nicht für die", "Archive puzzles don’t count for the")}{" "}
        <Link href="/bestenliste" className="font-bold underline">
          {t("Bestenliste", "leaderboard")}
        </Link>{" "}
        {t("– nur das Rätsel von heute.", "– only today’s puzzle does.")}
      </p>
    );

  if (!name)
    return (
      <form
        className={`mt-4 rounded-2xl p-4 ${box}`}
        onSubmit={async (e) => {
          e.preventDefault();
          const p = nameProblem(draft, lang);
          if (p) return setErr(p);
          setName(draft);
          setNameState(draft.trim());
          await submitAllToday();
        }}
      >
        <p className="font-display text-lg font-semibold">{t("In die Bestenliste eintragen", "Join the leaderboard")}</p>
        <p className={`text-sm ${dark ? "text-white/75" : "text-muted"}`}>
          {t(
            `Einmal einen Namen wählen – ab dann zählen deine heutigen Ergebnisse automatisch${pts != null ? ` (dieses Spiel: ${pts} von 100 Punkten)` : ""}.`,
            `Pick a name once – from then on today’s results count automatically${pts != null ? ` (this game: ${pts} of 100 points)` : ""}.`
          )}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setErr(null);
            }}
            maxLength={20}
            placeholder={t("Dein Name", "Your name")}
            className="input min-w-0 flex-1 text-ink"
            aria-label={t("Name für die Bestenliste", "Name for the leaderboard")}
            autoComplete="nickname"
          />
          <button type="submit" className="btn-primary shrink-0">
            Eintragen
          </button>
        </div>
        {err && <p className="mt-2 text-sm font-bold text-bad">{err}</p>}
        <p className={`mt-2 text-xs ${dark ? "text-white/60" : "text-muted"}`}>{t("Dein Name ist für alle sichtbar. Bitte keinen vollen Klarnamen.", "Your name is visible to everyone. Please don’t use your full real name.")}</p>
      </form>
    );

  return (
    <p className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3 text-sm font-semibold ${box}`}>
      <span>
        {status === "sending" && t("Wird eingetragen …", "Saving …")}
        {status === "sent" && t(`Eingetragen als ${name}${pts != null ? ` – ${pts} Punkte` : ""}.`, `Saved as ${name}${pts != null ? ` – ${pts} points` : ""}.`)}
        {status === "failed" && t("Die Bestenliste ist gerade nicht erreichbar. Wir versuchen es beim nächsten Mal erneut.", "The leaderboard can’t be reached right now. We’ll try again next time.")}
        {status === "idle" && t(`Du spielst als ${name}.`, `You’re playing as ${name}.`)}
      </span>
      <Link href={`/bestenliste?spiel=${game}`} className="font-bold underline underline-offset-2">
        {t("Zur Bestenliste", "Go to the leaderboard")}
      </Link>
    </p>
  );
}
