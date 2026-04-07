// CABI Plant Detective — Service Worker v2
// Network-first strategy ensures users always get the latest version
// Cache is used as fallback when offline only

const CACHE_VERSION = 'cabi-v2-' + new Date().toISOString().slice(0, 10);
const PRECACHE_ASSETS = ["/", "/index.html", "/favicon.png", "/cabi-logo.png", "/favicon.svg", "/manifest.json"];

// Install — precache essential shell assets, then activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting(); // Activate new SW immediately without waiting
});

// Activate — delete ALL old caches (forces full cache refresh on every deploy)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // Take control of all open pages immediately
});

// Fetch — network-first for everything, cache as fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // For navigation requests (HTML pages) — always network first
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response for offline fallback
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // For hashed Vite assets (e.g., /assets/index-abc123.js) — cache-first with network fallback
  // These have content hashes, so cached version is always correct
  if (url.pathname.match(/\/assets\/.*\.[a-f0-9]{8,}\.(js|css|woff2?|png|jpg|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For API and data requests — network-first, short cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For everything else (images, fonts, etc.) — network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
