"use client";

import { useEffect, useRef, useState } from "react";
import { norm } from "@/lib/data/countries";

type Egg = { id: number; kind: "syrien" | "kurdistan" };

const TRIGGERS: { kind: Egg["kind"]; words: string[] }[] = [
  { kind: "syrien", words: ["syrien", "syria", "suriya", "sourie", "syrie"] },
  { kind: "kurdistan", words: ["kurdistan"] },
];

/** Watches every text field on the site and plays a short animation for a few special words. */
export function EasterEggs() {
  const [eggs, setEggs] = useState<Egg[]>([]);
  const fired = useRef(new WeakMap<EventTarget, Set<string>>());
  const seq = useRef(0);

  useEffect(() => {
    const onInput = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el || !("value" in el)) return;
      const v = norm(el.value).replace(/\s+/g, "");
      const seen = fired.current.get(el) || new Set<string>();
      for (const t of TRIGGERS) {
        const hit = t.words.some((w) => v.includes(w));
        if (hit && !seen.has(t.kind)) {
          seen.add(t.kind);
          const id = ++seq.current;
          setEggs((x) => [...x, { id, kind: t.kind }]);
          setTimeout(() => setEggs((x) => x.filter((g) => g.id !== id)), t.kind === "syrien" ? 3200 : 3000);
        } else if (!hit) seen.delete(t.kind); // typed again later: play again
      }
      fired.current.set(el, seen);
    };
    // capture: quiz inputs are cleared right after a correct answer, so catch the value first
    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, []);

  if (!eggs.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-live="polite">
      {eggs.map((g) => (g.kind === "syrien" ? <Lions key={g.id} /> : <Hint key={g.id} />))}
    </div>
  );
}

function Lions() {
  const small = Array.from({ length: 14 }, (_, i) => ({
    left: 4 + ((i * 53) % 92),
    delay: (i % 7) * 0.12,
    size: 28 + ((i * 17) % 30),
    drift: ((i * 37) % 60) - 30,
  }));
  return (
    <>
      <span className="sr-only">Syrien 🦁</span>
      <div className="egg-lion-flash absolute inset-0" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="egg-lion text-[9rem] leading-none sm:text-[13rem]" aria-hidden="true">
          🦁
        </span>
      </div>
      {small.map((s, i) => (
        <span
          key={i}
          className="egg-lion-rise absolute bottom-[-4rem]"
          style={{ left: `${s.left}%`, fontSize: s.size, animationDelay: `${0.25 + s.delay}s`, ["--drift" as string]: `${s.drift}px` }}
          aria-hidden="true"
        >
          🦁
        </span>
      ))}
    </>
  );
}

function Hint() {
  return (
    <div className="absolute inset-x-0 top-24 grid place-items-center px-4">
      <p className="egg-hint rounded-2xl bg-ink px-5 py-3 font-display text-lg font-semibold text-white shadow-xl" role="status">
        Kurdistan ist kein eigener Staat.
      </p>
    </div>
  );
}
