"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getResult, useStoreVersion, type GameKey } from "@/lib/daily";
import { getName, nameProblem, pointsFor, setName, submit, submitAllToday } from "@/lib/leaderboard";

/** Under every finished daily game: enter a name once, then results go to the leaderboard automatically. */
export function LeaderboardJoin({ day, game, isToday, dark = false }: { day: string; game: GameKey; isToday: boolean; dark?: boolean }) {
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
        Archiv-Rätsel zählen nicht für die <Link href="/bestenliste" className="font-bold underline">Bestenliste</Link> – nur das Rätsel von heute.
      </p>
    );

  if (!name)
    return (
      <form
        className={`mt-4 rounded-2xl p-4 ${box}`}
        onSubmit={async (e) => {
          e.preventDefault();
          const p = nameProblem(draft);
          if (p) return setErr(p);
          setName(draft);
          setNameState(draft.trim());
          await submitAllToday();
        }}
      >
        <p className="font-display text-lg font-semibold">In die Bestenliste eintragen</p>
        <p className={`text-sm ${dark ? "text-white/75" : "text-muted"}`}>
          Einmal einen Namen wählen – ab dann zählen deine heutigen Ergebnisse automatisch{pts != null ? ` (dieses Spiel: ${pts} von 100 Punkten)` : ""}.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setErr(null);
            }}
            maxLength={20}
            placeholder="Dein Name"
            className="input min-w-0 flex-1 text-ink"
            aria-label="Name für die Bestenliste"
            autoComplete="nickname"
          />
          <button type="submit" className="btn-primary shrink-0">
            Eintragen
          </button>
        </div>
        {err && <p className="mt-2 text-sm font-bold text-bad">{err}</p>}
        <p className={`mt-2 text-xs ${dark ? "text-white/60" : "text-muted"}`}>Dein Name ist für alle sichtbar. Bitte keinen vollen Klarnamen.</p>
      </form>
    );

  return (
    <p className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3 text-sm font-semibold ${box}`}>
      <span>
        {status === "sending" && "Wird eingetragen …"}
        {status === "sent" && `Eingetragen als ${name}${pts != null ? ` – ${pts} Punkte` : ""}.`}
        {status === "failed" && "Die Bestenliste ist gerade nicht erreichbar. Wir versuchen es beim nächsten Mal erneut."}
        {status === "idle" && `Du spielst als ${name}.`}
      </span>
      <Link href={`/bestenliste?spiel=${game}`} className="font-bold underline underline-offset-2">
        Zur Bestenliste
      </Link>
    </p>
  );
}
