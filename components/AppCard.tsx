"use client";

/**
 * Home page: "Koshertrivia als App" – how to add it to the home screen (iPhone/iPad instructions, install
 * button on Android/Chrome) and the daily 7:00 reminder (web push). Hidden once dismissed (kt-app-card).
 */
import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import { currentSubscription, disableReminder, enableReminder, isIOS, isStandalone, pushSupported } from "@/lib/push";

/** Reminder (web push) stays hidden until the backend is live: set NEXT_PUBLIC_PUSH=1 in Vercel. */
const PUSH_ON = process.env.NEXT_PUBLIC_PUSH === "1";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function AppCard() {
  const t = useT();
  const lang = useLang();
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [canPush, setCanPush] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [bip, setBip] = useState<BIPEvent | null>(null);

  useEffect(() => {
    try { setHidden(localStorage.getItem("kt-app-card") === "aus"); } catch {}
    const st = isStandalone();
    const i = isIOS();
    setStandalone(st);
    setIos(i);
    // iPhone/iPad allow notifications only for the web app on the home screen
    setCanPush(PUSH_ON && pushSupported() && (!i || st));
    if (PUSH_ON) currentSubscription().then((s) => setOn(!!s)).catch(() => {});
    const onBip = (e: Event) => { e.preventDefault(); setBip(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onBip);
    setReady(true);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!ready || (hidden && !standalone) || (standalone && !PUSH_ON)) return null;

  const toggle = async () => {
    setBusy(true);
    setNote("");
    try {
      if (on) {
        await disableReminder();
        setOn(false);
      } else {
        const p = await enableReminder(lang);
        if (p === "granted") setOn(true);
        else setNote(t("Mitteilungen sind blockiert – du kannst sie in den Einstellungen deines Browsers erlauben.", "Notifications are blocked – you can allow them in your browser settings."));
      }
    } catch {
      setNote(t("Das hat nicht geklappt. Versuch es bitte noch einmal.", "That didn’t work. Please try again."));
    }
    setBusy(false);
  };

  return (
    <div className="chunk relative flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9" style={{ background: "#c9e6f0", ["--edge" as string]: "#8fbccb" }}>
      {!standalone && (
        <button
          type="button"
          aria-label={t("Ausblenden", "Hide")}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-xl font-bold text-ink/60 hover:bg-white/50"
          onClick={() => { setHidden(true); try { localStorage.setItem("kt-app-card", "aus"); } catch {} }}
        >
          ×
        </button>
      )}
      <div className="flex items-start gap-4 pr-8">
        <img src="/icon.png" alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-2xl bg-white p-1.5 shadow-[0_3px_0_#8fbccb]" />
        <div>
          <p className="font-display text-[24px] font-semibold leading-tight sm:text-[28px]">
            {standalone ? t("Tägliche Erinnerung", "Daily reminder") : t("Koshertrivia als App", "Koshertrivia as an app")}
          </p>
          <p className="mt-1 max-w-xl text-[15px] font-semibold text-ink/75 sm:text-base">
            {standalone
              ? t("Jeden Morgen um 7 Uhr eine Mitteilung, wenn die neuen Rätsel da sind.", "A notification every morning at 7 when the new puzzles are out.")
              : ios
                ? t("Tippe unten in Safari auf Teilen (□↑) und dann auf „Zum Home-Bildschirm“. Dann startet Koshertrivia wie eine App – ohne App Store" + (PUSH_ON ? ", und du kannst dich jeden Morgen erinnern lassen." : "."), "In Safari tap Share (□↑), then “Add to Home Screen”. Koshertrivia then opens like an app – no App Store needed" + (PUSH_ON ? ", and you can get a reminder every morning." : "."))
                : t("Auf den Startbildschirm legen und wie eine App spielen – ohne App Store. Spiele, die du schon geöffnet hast, gehen auch offline.", "Put it on your home screen and play it like an app – no App Store. Games you opened before also work offline.")}
          </p>
          {note && <p className="mt-2 text-sm font-bold text-[#b3372f]">{note}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
        {!standalone && bip && (
          <button
            type="button"
            className="btn-primary px-5"
            onClick={async () => { await bip.prompt(); await bip.userChoice.catch(() => null); setBip(null); }}
          >
            {t("Als App installieren", "Install as app")}
          </button>
        )}
        {canPush && (
          <button type="button" className={on ? "btn-ghost px-5" : "btn-primary px-5"} disabled={busy} onClick={toggle} aria-pressed={on}>
            {on ? t("🔔 Erinnerung an – ausschalten", "🔔 Reminder on – turn off") : t("🔔 Jeden Morgen erinnern", "🔔 Remind me every morning")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Registers the service worker (offline play, reminder) in the production build. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const go = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  }, []);
  return null;
}
