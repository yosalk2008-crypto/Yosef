"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";

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
  const lang = useLang();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let alive = true;
    (async () => {
      try {
        (window as unknown as { KT_LANG?: string }).KT_LANG = lang;
        if (!window.HALAL) await load("/halal/data.js?v=4");
        if (lang === "en" && !(window as unknown as { HALAL_EN?: unknown }).HALAL_EN) await load("/halal/data.en.js?v=4");
        if (!window.mountHalal) await load("/halal/app.js?v=2");
        if (alive && ref.current && window.mountHalal) cleanup = window.mountHalal(ref.current);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, [lang]);

  return (
    <div className="kosher halal">
      <div ref={ref} tabIndex={-1} className="outline-none">
        {!failed && <section className="band big" style={{ minHeight: 420 }} aria-busy="true" />}
      </div>
      {failed && <p className="wrap pt-10 font-semibold">{t("Das Quiz konnte nicht geladen werden. Lade die Seite bitte neu.", "The quiz could not be loaded. Please reload the page.")}</p>}
      <p className="kfoot">
        {t(
          "Vereinfachte Darstellung aus sunnitischer Sicht. Wo die Gelehrten unterschiedlicher Meinung sind, lautet die Antwort „kommt drauf an“. Bei persönlichen Fragen hilft ein Imam oder Gelehrter deines Vertrauens weiter.",
          "A simplified overview from a Sunni perspective. Where scholars disagree, the answer is “it depends”. For personal questions, ask an imam or scholar you trust."
        )}
      </p>
    </div>
  );
}
