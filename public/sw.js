/* Koshertrivia service worker: offline play for pages and games opened before, and the daily reminder.
 * - build files (/_next/static), map data, flags, icons, game data: cache first (they are versioned or rarely change)
 * - pages: network first; offline the last copy, or /offline
 * - never caches /api, other sites (Supabase, Google Maps) or POST requests
 */
const V = "kt-v1";
const STATIC = V + "-static";
const PAGES = V + "-pages";
const MAX_PAGES = 60;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(PAGES).then((c) => c.addAll(["/offline", "/en/offline", "/"]).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(V)).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

const STATIC_PATH = /^\/(_next\/static|geo|flags|fx|thumbs|tiefgang|koscher|halal|southbeach)\/|^\/(icon|apple-icon|favicon)/;

async function trimPages() {
  const c = await caches.open(PAGES);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_PAGES; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (STATIC_PATH.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && res.type === "basic") {
            const c = await caches.open(PAGES);
            await c.put(req, res.clone());
            trimPages();
          }
          return res;
        } catch {
          const c = await caches.open(PAGES);
          return (
            (await c.match(req, { ignoreSearch: true })) ||
            (await c.match(url.pathname.startsWith("/en") ? "/en/offline" : "/offline")) ||
            new Response("Offline", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } })
          );
        }
      })()
    );
  }
});

// daily reminder
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(d.title || "Koshertrivia", {
      body: d.body || "Die neuen Tagesrätsel sind da.",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: "kt-daily",
      data: { url: d.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const w of list) if (w.url.startsWith(self.location.origin) && "focus" in w) { w.navigate(target); return w.focus(); }
      return self.clients.openWindow(target);
    })
  );
});
