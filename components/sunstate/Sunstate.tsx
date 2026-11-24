"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";

declare global {
  interface Window {
    mountSunstate?: (el: HTMLElement, opts: { lang: string }) => () => void;
  }
}

const SRC = "/sunstate/game.js?v=1";

/** Loads the game script once and resolves when it has run. */
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

/** Sunstate Hustle – the game itself is plain canvas JS in /public/sunstate, mounted into this element. */
export function Sunstate() {
  const lang = useLang();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let alive = true;
    (async () => {
      try {
        if (!window.mountSunstate) await load(SRC);
        if (alive && ref.current && window.mountSunstate) cleanup = window.mountSunstate(ref.current, { lang });
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
    <div className="relative h-[calc(100dvh-64px)] min-h-[480px] w-full bg-[#0d0f14] sm:h-[calc(100dvh-72px)]">
      <div ref={ref} className="absolute inset-0" />
      {failed && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center font-semibold text-white">
          {t("Das Spiel konnte nicht geladen werden. Lade die Seite bitte neu.", "The game could not be loaded. Please reload the page.")}
        </p>
      )}
    </div>
  );
}
