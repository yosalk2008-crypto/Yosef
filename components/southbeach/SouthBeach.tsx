"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";

/** South Beach – 3D game (three.js), loaded only on this page. */
export function SouthBeach() {
  const lang = useLang();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let alive = true;
    (async () => {
      try {
        const probe = document.createElement("canvas");
        if (!probe.getContext("webgl2")) throw new Error("webgl2");
        const { mountSouthBeach } = await import("./game");
        if (!alive || !ref.current) return;
        const c = await mountSouthBeach(ref.current, { lang });
        if (alive) cleanup = c;
        else c();
      } catch (e) {
        console.error(e);
        if (alive) setFailed(e instanceof Error && e.message === "webgl2" ? "webgl" : "load");
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, [lang]);

  return (
    <div className="relative h-[calc(100dvh-64px)] min-h-[480px] w-full bg-[#120a1c] sm:h-[calc(100dvh-72px)]">
      <div ref={ref} className="absolute inset-0" />
      {failed && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center font-semibold text-white">
          {failed === "webgl"
            ? t("Dein Browser unterstützt kein WebGL 2 – bitte einen aktuellen Chrome, Edge, Firefox oder Safari nutzen.", "Your browser doesn't support WebGL 2 – please use a current Chrome, Edge, Firefox or Safari.")
            : t("Das Spiel konnte nicht geladen werden. Lade die Seite bitte neu.", "The game could not be loaded. Please reload the page.")}
        </p>
      )}
    </div>
  );
}
