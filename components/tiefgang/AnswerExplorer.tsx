"use client";

import { useMemo, useState } from "react";
import { norm } from "@/lib/data/countries";
import { TIERS, meters, tierOf, type Question } from "@/lib/tiefgang";
import { Creature } from "./Creatures";

/** All valid answers of one prompt, rarest first, with tier filters and search. */
export function AnswerExplorer({ q, mine }: { q: Question; mine?: string }) {
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
      .filter((a) => (tab === "alle" || tierOf(a).key === tab) && (!s || norm(a.name).includes(s) || a.alt.some((x) => norm(x).includes(s))));
  }, [q, tab, search]);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Seltenheitsstufen">
        <button type="button" role="tab" aria-selected={tab === "alle"} onClick={() => setTab("alle")} className={`rounded-full px-3 py-1.5 text-sm font-bold ${tab === "alle" ? "bg-ink text-white" : "bg-paper"}`}>
          Alle {q.answers.length}
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
              {t.name} {counts[t.key]}
            </button>
          ) : null
        )}
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Alle Antworten durchsuchen …" className="input mt-3 min-h-11 py-2 text-base" aria-label="Antworten durchsuchen" />
      <ul className="mt-3 divide-y-2 divide-paper">
        {list.slice(0, limit).map((a) => {
          const t = tierOf(a);
          const isMine = mine === a.id;
          return (
            <li key={a.id} className={`flex items-center justify-between gap-3 py-2 ${isMine ? "rounded-xl bg-brand-soft px-2" : ""}`}>
              <span className="flex min-w-0 items-center gap-2">
                <Creature tier={t.key} className="h-7 w-7 shrink-0" />
                <span className="truncate font-semibold">
                  {a.name}
                  {isMine && <span className="ml-1.5 text-sm text-brand">(deine Antwort)</span>}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-ink/70">
                {a.pts} P. · {new Intl.NumberFormat("de-DE").format(meters(a.pts))} m
              </span>
            </li>
          );
        })}
      </ul>
      {list.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 30)} className="mt-2 text-sm font-bold text-brand hover:underline">
          Mehr anzeigen ({list.length - limit} weitere)
        </button>
      )}
      {list.length === 0 && <p className="mt-3 text-sm text-ink/60">Keine Antwort gefunden.</p>}
    </div>
  );
}
