"use client";

import { bestMatch } from "@/lib/fuzzy";
import { useMemo, useRef, useState } from "react";
import { norm } from "@/lib/data/countries";

export type PickOption = { id: string; label: string; alt?: string[]; hint?: string };

/** Text input with autocomplete. Calls onPick with the chosen option id. */
export function Picker({
  options,
  onPick,
  disabled = [],
  placeholder = "Land eingeben …",
  autoFocus = true,
  buttonLabel = "Raten",
}: {
  options: PickOption[];
  onPick: (id: string) => void;
  disabled?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  buttonLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(
    () => options.map((o) => ({ o, keys: [o.label, ...(o.alt || [])].map(norm) })),
    [options]
  );

  const matches = useMemo(() => {
    const nq = norm(q);
    if (!nq) return [];
    const starts: PickOption[] = [];
    const contains: PickOption[] = [];
    for (const { o, keys } of index) {
      if (disabled.includes(o.id)) continue;
      if (keys.some((k) => k.startsWith(nq))) starts.push(o);
      else if (nq.length > 2 && keys.some((k) => k.includes(nq))) contains.push(o);
    }
    starts.sort((a, b) => a.label.localeCompare(b.label, "de"));
    if (!starts.length && !contains.length && nq.length >= 4) {
      // nothing starts with it: offer the name it is a small typo of ("Deutshcland", "Kuwait-Stadt")
      const fz = bestMatch(q, index.filter(({ o }) => !disabled.includes(o.id)).map(({ o }) => ({ item: o, names: [o.label, ...(o.alt || [])] })));
      if (fz) return [fz];
    }
    return [...starts, ...contains].slice(0, 8);
  }, [q, index, disabled]);

  const choose = (o?: PickOption) => {
    const pick = o || matches[active] || matches[0];
    if (!pick) return;
    onPick(pick.id);
    setQ("");
    setActive(0);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          choose();
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          className="input flex-1"
          aria-label={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="picker-list"
        />
        <button type="submit" className="btn-primary shrink-0" disabled={!matches.length}>
          {buttonLabel}
        </button>
      </form>
      {open && matches.length > 0 && (
        <ul id="picker-list" role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-white p-1 shadow-xl">
          {matches.map((o, i) => (
            <li key={o.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[15px] ${i === active ? "bg-brand-soft text-ink" : "text-ink"}`}
              >
                <span>{o.label}</span>
                {o.hint && <span className="text-xs text-muted">{o.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
