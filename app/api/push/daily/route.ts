/**
 * Sends the daily reminder to every stored subscription. Called by two Vercel crons (vercel.json, 05:00 and
 * 06:00 UTC); only the call that lands in the 7 o'clock hour in Germany sends (winter and summer time),
 * `?force=1` sends at once. Protected by CRON_SECRET (Vercel sends it as a Bearer token).
 * Needs the env vars CRON_SECRET and VAPID_PRIVATE_KEY. Dead subscriptions (404/410) are removed.
 */
import webpush from "web-push";
import { SUPA_KEY, SUPA_URL } from "@/lib/leaderboard";
import { VAPID_PUBLIC_KEY } from "@/lib/push";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TEXT = {
  de: { title: "Neue Tagesrätsel sind da 🌍", body: "Fernweh, Gipfelsturm, Tiefgang und alle Tagesspiele – heute neu. Schaffst du deine Serie?", url: "/" },
  en: { title: "New daily puzzles are here 🌍", body: "Wanderlust, Summit Rush, Deep Dive and every daily game – new today. Keep your streak going!", url: "/en" },
};

const rpc = (fn: string, body: object) =>
  fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!secret || !priv) return Response.json({ error: "not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });

  const hour = +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23" }).format(new Date());
  if (hour !== 7 && new URL(req.url).searchParams.get("force") !== "1") return Response.json({ skipped: `Berlin hour ${hour}` });

  webpush.setVapidDetails(`mailto:${site.email}`, VAPID_PUBLIC_KEY, priv);
  const r = await rpc("push_list", { p_secret: secret });
  if (!r.ok) return Response.json({ error: "list failed" }, { status: 500 });
  const subs = (await r.json()) as { endpoint: string; p256dh: string; auth: string; lang: "de" | "en" }[];

  const dead: string[] = [];
  let sent = 0;
  for (let i = 0; i < subs.length; i += 50) {
    await Promise.all(
      subs.slice(i, i + 50).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(TEXT[s.lang] ?? TEXT.de), { TTL: 6 * 3600, urgency: "normal" });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.endpoint);
        }
      })
    );
  }
  if (dead.length) await rpc("push_remove", { p_secret: secret, p_endpoints: dead });
  return Response.json({ subscribers: subs.length, sent, removed: dead.length });
}
