"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    mountHalal?: (el: HTMLElement) => () => void;
    HALAL?: unknown[];
  }
}

/** Loads a script once and resolves when it has run. */
function load(src: string) {
  return new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(`script[data-k="${src}"]`);
    if (found?.dataset.ready) return resolve();
    const s = found ?? document.createElement("script");
    s.addEventListener("load", () => {
      s.dataset.ready = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error(src)));
    if (!found) {
      s.src = src;
      s.dataset.k = src;
      document.body.appendChild(s);
    }
  });
}

/** "Ist das halal?" – the quiz lives in /public/halal (plain JS, same engine and styles as "Ist das koscher?"). */
export function HalalQuiz() {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let alive = true;
    (async () => {
      try {
        if (!window.HALAL) await load("/halal/data.js?v=3");
        if (!window.mountHalal) await load("/halal/app.js?v=1");
        if (alive && ref.current && window.mountHalal) cleanup = window.mountHalal(ref.current);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, []);

  return (
    <div className="kosher halal">
      <div ref={ref} tabIndex={-1} className="outline-none">
        {!failed && <section className="band big" style={{ minHeight: 420 }} aria-busy="true" />}
      </div>
      {failed && <p className="wrap pt-10 font-semibold">Das Quiz konnte nicht geladen werden. Lade die Seite bitte neu.</p>}
      <p className="kfoot">
        Vereinfachte Darstellung aus sunnitischer Sicht. Wo die Gelehrten unterschiedlicher Meinung sind, lautet die Antwort „kommt drauf an“. Bei
        persönlichen Fragen hilft ein Imam oder Gelehrter deines Vertrauens weiter.
      </p>
    </div>
  );
}
