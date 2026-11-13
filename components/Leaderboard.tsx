"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { utcDate, type GameKey } from "@/lib/daily";
import { GAME_BY_KEY } from "@/lib/games";
import { LB_GAMES, fetchBoard, getName, nameProblem, setName, submitAllToday, type Row } from "@/lib/leaderboard";
import { GameArt } from "./GameArt";
import { useLang, useT } from "@/lib/i18n";
import { gTitle } from "@/lib/games";

type Scope = "heute" | "gesamt";

export function Leaderboard() {
  const sp = useSearchParams();
  const lang = useLang();
  const t = useT();
  const [scope, setScope] = useState<Scope>("heute");
  const [game, setGame] = useState<GameKey | "alle">("alle");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [name, setNameState] = useState<string | null>(null);

  useEffect(() => {
    const g = sp.get("spiel");
    if (g && LB_GAMES.some((x) => x.key === g)) setGame(g as GameKey);
    setNameState(getName());
  }, [sp]);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(false);
    fetchBoard({ day: scope === "heute" ? utcDate() : undefined, game })
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [scope, game, name]);

  const me = rows?.find((r) => r.is_me);
  const max = game === "alle" ? (scope === "heute" ? LB_GAMES.length * 100 : null) : scope === "heute" ? 100 : null;

  return (
    <div className="mt-6">
      <div className="flex gap-2" role="tablist" aria-label={t("Zeitraum", "Period")}>
        {(["heute", "gesamt"] as Scope[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={scope === s} onClick={() => setScope(s)} className="chip" aria-pressed={scope === s}>
            {s === "heute" ? t("Heute", "Today") : t("Alle Zeit", "All time")}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label={t("Spiel", "Game")}>
        <button type="button" onClick={() => setGame("alle")} className="chip" aria-pressed={game === "alle"}>
          {t("Alle Spiele", "All games")}
        </button>
        {LB_GAMES.map((g) => (
          <button key={g.key} type="button" onClick={() => setGame(g.key)} className="chip gap-1.5 pl-1.5" aria-pressed={game === g.key}>
            {GAME_BY_KEY[g.key] ? (
              <span className="grid h-7 w-8 place-items-center rounded-lg" style={{ background: GAME_BY_KEY[g.key].bg }}>
                <GameArt game={g.key} className="h-5 w-7" />
              </span>
            ) : (
              <span className="grid h-7 w-8 place-items-center rounded-lg bg-[#16528f] text-xs text-white">🌊</span>
            )}
            {GAME_BY_KEY[g.key] ? gTitle(GAME_BY_KEY[g.key], lang) : t("Tiefgang", "Deep Dive")}
          </button>
        ))}
      </div>

      <NameBar name={name} onChange={setNameState} />

      <div className="card mt-4 overflow-hidden">
        {error && <p className="p-5 font-semibold text-bad">{t("Die Bestenliste ist gerade nicht erreichbar. Versuch es gleich noch einmal.", "The leaderboard can’t be reached right now. Try again in a moment.")}</p>}
        {!error && rows === null && <div className="h-64 animate-pulse bg-paper" />}
        {!error && rows?.length === 0 && (
          <p className="p-6 text-muted">
            {t(
              `Noch niemand eingetragen. Spiel ${game === "alle" ? "ein Tagesspiel" : "dieses Spiel"} und trag deinen Namen ein – dann stehst du ganz oben.`,
              `Nobody here yet. Play ${game === "alle" ? "a daily game" : "this game"} and enter your name – you’ll go straight to the top.`
            )}
          </p>
        )}
        {!error && rows && rows.length > 0 && (
          <ol>
            {rows.map((r) => (
              <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-3 border-b-2 border-paper px-4 py-3 last:border-0 ${r.is_me ? "bg-brand-soft" : ""}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-semibold ${r.rank === 1 ? "bg-[#f3d272]" : r.rank === 2 ? "bg-[#dcdfe6]" : r.rank === 3 ? "bg-[#f0c39d]" : "bg-paper"}`}>
                  {r.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-semibold">
                    {r.name}
                    {r.is_me && <span className="ml-2 text-sm text-brand">({t("du", "you")})</span>}
                  </span>
                  <span className="text-sm text-muted">
                    {game === "alle" ? `${r.games} ${r.games === 1 ? t("Spiel", "game") : t("Spiele", "games")}` : r.label}
                  </span>
                </span>
                <span className="shrink-0 text-right font-display text-xl font-semibold tabular-nums">
                  {new Intl.NumberFormat("de-DE").format(r.points)}
                  {max && <span className="text-sm text-muted"> / {new Intl.NumberFormat("de-DE").format(max)}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      {me && me.rank > 50 && <p className="mt-3 text-sm font-semibold">{t(`Du bist auf Platz ${me.rank}.`, `You are in place ${me.rank}.`)}</p>}
    </div>
  );
}

function NameBar({ name, onChange }: { name: string | null; onChange: (n: string) => void }) {
  const lang = useLang();
  const t = useT();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (name && !edit)
    return (
      <p className="mt-4 text-sm text-muted">
        {t("Du spielst als", "You’re playing as")} <strong className="text-ink">{name}</strong>.{" "}
        <button type="button" className="font-bold text-brand underline" onClick={() => (setDraft(name), setEdit(true))}>
          {t("Name ändern", "Change name")}
        </button>
      </p>
    );
  return (
    <form
      className="mt-4 flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const p = nameProblem(draft, lang);
        if (p) return setErr(p);
        setName(draft);
        onChange(draft.trim());
        setEdit(false);
        await submitAllToday();
        onChange(draft.trim() + "");
      }}
    >
      <input value={draft} onChange={(e) => (setDraft(e.target.value), setErr(null))} maxLength={20} placeholder={t("Dein Name", "Your name")} className="input min-w-0 flex-1" aria-label="Name" />
      <button type="submit" className="btn-primary">
        {name ? t("Speichern", "Save") : t("Mitmachen", "Join")}
      </button>
      {err && <p className="w-full text-sm font-bold text-bad">{err}</p>}
      {name && <p className="w-full text-xs text-muted">{t("Neue Ergebnisse erscheinen unter dem neuen Namen; deine Gesamtwertung übernimmt ihn ebenfalls.", "New results appear under the new name; your all-time total takes it over too.")}</p>}
    </form>
  );
}
