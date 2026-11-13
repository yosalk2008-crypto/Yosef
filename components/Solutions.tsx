"use client";

import { flagUrl } from "@/lib/data/countries";
import { useT } from "@/lib/i18n";

/** The answers to a finished daily game, shown above the result card. */
export function Solutions({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  const t = useT();
  return (
    <section className="card mt-6 p-5 sm:p-6" aria-labelledby="loesungen">
      <h2 id="loesungen" className="font-display text-2xl font-semibold">
        {t("Lösungen", "Solutions")}
      </h2>
      {note && <p className="mt-1 text-[15px] text-muted">{note}</p>}
      <ol className="mt-4 space-y-2.5">{children}</ol>
    </section>
  );
}

const tone = (p: number, max: number) => {
  const f = p / max;
  return f >= 0.8 ? "bg-green-100 text-green-800" : f >= 0.5 ? "bg-yellow-100 text-yellow-900" : f > 0 ? "bg-orange-100 text-orange-900" : "bg-red-100 text-red-800";
};

/** One solved item: what it was, what you said, what was right. */
export function SolutionRow({
  iso2,
  title,
  right,
  rightLabel,
  yours,
  badge,
  ok,
  extra,
}: {
  iso2?: string;
  title: React.ReactNode;
  right: React.ReactNode;
  rightLabel?: string;
  yours?: React.ReactNode;
  badge?: { text: string; pts: number; max: number };
  ok?: boolean;
  extra?: React.ReactNode;
}) {
  const t = useT();
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-paper p-3">
      {iso2 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flagUrl(iso2)} alt="" className="mt-0.5 h-8 w-auto shrink-0 rounded border border-line" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold leading-tight">{title}</p>
        <p className="mt-1 text-[15px]">
          <span className="font-semibold text-ok">{rightLabel ?? t("Richtig", "Correct")}:</span> {right}
        </p>
        {yours != null && (
          <p className="text-[15px] text-muted">
            <span className={`font-semibold ${ok === false ? "text-bad" : ok ? "text-ok" : "text-ink"}`}>{t("Du", "You")}:</span> {yours}
          </p>
        )}
        {extra}
      </div>
      {badge && <span className={`shrink-0 rounded-lg px-2.5 py-1 font-display text-sm font-semibold tabular-nums ${tone(badge.pts, badge.max)}`}>{badge.text}</span>}
      {!badge && ok != null && (
        <span className={`shrink-0 rounded-lg px-2.5 py-1 font-display text-sm font-semibold ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{ok ? t("richtig", "right") : t("falsch", "wrong")}</span>
      )}
    </li>
  );
}
