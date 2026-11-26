/**
 * Daily reminder (web push), browser side. The subscription is stored in Supabase through
 * push_subscribe / push_unsubscribe; /api/push/daily sends the reminder every morning at about 7:00.
 * iPhone/iPad only allow it for the web app added to the home screen (iOS 16.4+).
 */
import { SUPA_KEY, SUPA_URL } from "./leaderboard";

export const VAPID_PUBLIC_KEY = "BOgUzq5i46z5gNQDkXvbhFUL0fHSDMdmkPBdT-rseaoCe3TSD6-94lYNC9qO9YInIk7yQUGy9iwawIOVVPDkgTM";

const rpc = (fn: string, body: object) =>
  fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export const isIOS = () =>
  typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Asks for permission and stores the subscription. Returns the permission state. */
export async function enableReminder(lang: "de" | "en"): Promise<NotificationPermission> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const r = await rpc("push_subscribe", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_lang: lang });
  if (!r.ok) throw new Error("subscribe failed");
  return perm;
}

export async function disableReminder() {
  const sub = await currentSubscription();
  if (!sub) return;
  await rpc("push_unsubscribe", { p_endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}
