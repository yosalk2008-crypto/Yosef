"use client";

/** "Meintest du …?" – offered after a small typo; tapping it puts the right spelling into the field. */
import { useT } from "@/lib/i18n";

export function Suggestion({ name, onTake, dark = false, hint }: { name: string; onTake: () => void; dark?: boolean; hint?: string }) {
  const t = useT();
  return (
    <p className={`pop mt-2 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-[15px] ${dark ? "bg-white/15 text-white" : "bg-brand-soft text-ink"}`} role="status">
      <span>
        {t("Meintest du", "Did you mean")} <strong>{name}</strong>?
      </span>
      <button type="button" onClick={onTake} className="rounded-lg bg-ink px-2.5 py-1 text-sm font-bold text-white hover:bg-ink/85">
        {t("Übernehmen", "Use it")}
      </button>
      {hint && <span className="text-sm opacity-70">{hint}</span>}
    </p>
  );
}
