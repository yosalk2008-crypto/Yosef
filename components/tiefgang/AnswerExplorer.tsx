"use client";

import { useMemo, useState } from "react";
import { norm } from "@/lib/data/countries";
import { TIERS, meters, tierName, tierOf, type Question } from "@/lib/tiefgang";
import { useLang, useT } from "@/lib/i18n";
import { ansAltsEn, ansName } from "@/lib/tiefgang-i18n";
import { Creature } from "./Creatures";

/** All valid answers of one prompt, rarest first, with tier filters and search. */
export function AnswerExplorer({ q, mine }: { q: Question; mine?: string }) {
  const lang = useLang();
  const t_ = useT();
  const [tab, setTab] = useState<string>("alle");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(12);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of q.answers) c[tierOf(a).key] = (c[tierOf(a).key] || 0) + 1;
    return c;
  }, [q]);
  const list = useMemo(() => {
    const s = norm(search);
    return [...q.answers]
      .reverse()
      .filter((a) => (tab === "alle" || tierOf(a).key === tab) && (!s || [a.name, ...a.alt, ...ansAltsEn(a.name, q.key)].some((x) => norm(x).includes(s))));
  }, [q, tab, search]);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t_("Seltenheitsstufen", "Rarity tiers")}>
        <button type="button" role="tab" aria-selected={tab === "alle"} onClick={() => setTab("alle")} className={`rounded-full px-3 py-1.5 text-sm font-bold ${tab === "alle" ? "bg-ink text-white" : "bg-paper"}`}>
          {t_("Alle", "All")} {q.answers.length}
        </button>
        {TIERS.map((t) =>
          counts[t.key] ? (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${tab === t.key ? "ring-2 ring-ink" : ""}`}
              style={{ background: t.color }}
            >
              {tierName(t, lang)} {counts[t.key]}
            </button>
          ) : null
        )}
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t_("Alle Antworten durchsuchen …", "Search all answers …")} className="input mt-3 min-h-11 py-2 text-base" aria-label={t_("Antworten durchsuchen", "Search answers")} />
      <ul className="mt-3 divide-y-2 divide-paper">
        {list.slice(0, limit).map((a) => {
          const t = tierOf(a);
          const isMine = mine === a.id;
          return (
            <li key={a.id} className={`flex items-center justify-between gap-3 py-2 ${isMine ? "rounded-xl bg-brand-soft px-2" : ""}`}>
              <span className="flex min-w-0 items-center gap-2">
                <Creature tier={t.key} className="h-7 w-7 shrink-0" />
                <span className="truncate font-semibold">
                  {ansName(a.name, lang, q.key)}
                  {isMine && <span className="ml-1.5 text-sm text-brand">({t_("deine Antwort", "your answer")})</span>}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-ink/70">
                {a.pts} {lang === "en" ? "pts" : "P."} · {new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE").format(meters(a.pts))} m
              </span>
            </li>
          );
        })}
      </ul>
      {list.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 30)} className="mt-2 text-sm font-bold text-brand hover:underline">
          {t_(`Mehr anzeigen (${list.length - limit} weitere)`, `Show more (${list.length - limit} more)`)}
        </button>
      )}
      {list.length === 0 && <p className="mt-3 text-sm text-ink/60">{t_("Keine Antwort gefunden.", "No answer found.")}</p>}
    </div>
  );
}
