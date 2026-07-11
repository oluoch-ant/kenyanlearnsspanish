/* Oluoch aprende español — offline service worker.
   Bump VERSION on every deploy so installed phones pick up the new build. */
const VERSION = "aprende-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* cache-first: the app is a single self-contained page, so once installed it
   works with no connection at all; a background fetch refreshes the cache */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // NEVER cache the sync API. This is not theoretical: a cached authorised GET /api/sync was
  // being replayed for a later request with the WRONG passphrase, returning 200 with somebody
  // else's payload, and it also served stale progress on a pull. The API is live data — it must
  // always go to the network.
  if (new URL(e.request.url).pathname.startsWith("/api/")) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const refresh = fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
