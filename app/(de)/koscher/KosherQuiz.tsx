"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";

declare global {
  interface Window {
    mountKosher?: (el: HTMLElement) => () => void;
    QUESTIONS?: unknown[];
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

/** "Ist das koscher?" – the quiz itself lives in /public/koscher (plain JS), mounted into this element. */
export function KosherQuiz() {
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
        if (!window.QUESTIONS) await load("/koscher/data.js?v=8");
        if (lang === "en" && !(window as unknown as { QUESTIONS_EN?: unknown }).QUESTIONS_EN) await load("/koscher/data.en.js?v=8");
        if (!window.mountKosher) await load("/koscher/app.js?v=7");
        if (alive && ref.current && window.mountKosher) cleanup = window.mountKosher(ref.current);
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
    <div className="kosher">
      <div ref={ref} tabIndex={-1} className="outline-none">
        {!failed && <section className="band big" style={{ minHeight: 420 }} aria-busy="true" />}
      </div>
      {failed && <p className="wrap pt-10 font-semibold">{t("Das Quiz konnte nicht geladen werden. Lade die Seite bitte neu.", "The quiz could not be loaded. Please reload the page.")}</p>}
      <p className="kfoot">
        {t(
          "Vereinfachte Darstellung nach traditioneller Halacha. Bei echten religiösen Fragen hilft ein Rabbiner weiter.",
          "A simplified overview based on traditional halacha. For real religious questions, ask a rabbi."
        )}
      </p>
    </div>
  );
}
