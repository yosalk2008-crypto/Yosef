"use client";

import { useState } from "react";

/**
 * Guess buttons on a question page. The solution (children) is in the HTML from the start so search
 * engines see it; it only folds open once you guessed or tapped "Lösung zeigen".
 */
export function Raten({
  options,
  correct,
  labels,
  children,
}: {
  options: [string, string, string][]; // [value, symbol, label]
  correct: string;
  labels: { right: string; wrong: string; show: string };
  children: React.ReactNode;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const shown = open || picked != null;
  return (
    <>
      <div className="answers">
        {options.map(([a, sym, label]) => (
          <button
            key={a}
            type="button"
            data-a={a}
            disabled={shown}
            onClick={() => setPicked(a)}
            className={`answer${picked === a ? " picked" : ""}${shown && a === correct ? " right" : ""}`}
          >
            <span className="dot" aria-hidden="true">
              {sym}
            </span>
            {label}
          </button>
        ))}
      </div>
      {!shown && (
        <button type="button" className="fshow" onClick={() => setOpen(true)}>
          {labels.show}
        </button>
      )}
      <div className={`fsol${shown ? " open" : ""}`} aria-live="polite">
        {picked != null && <p className={`fhit ${picked === correct ? "ok" : "no"}`}>{picked === correct ? labels.right : labels.wrong}</p>}
        {children}
      </div>
    </>
  );
}
