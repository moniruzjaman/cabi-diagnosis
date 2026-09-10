/* ==========================================================================
   Crop Doctor — Service Worker
   100% offline-first. After first visit, the entire app is available
   with no network connection.
   ========================================================================== */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = 'crop-doctor-' + CACHE_VERSION;
const DATA_CACHE_NAME = 'crop-doctor-data-' + CACHE_VERSION;

// Core app shell — must be cached for offline use
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.webmanifest',
  '/assets/icons/icon.svg',
  '/assets/icons/maskable-192.png',
  '/assets/icons/maskable-512.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/img/og-image.jpg',
  '/assets/img/screenshot-home.png',
  '/assets/img/screenshot-diagnosis.png',
  '/assets/img/screenshot-result.png',
  // Field photos
  '/assets/img/rice-blast.svg',
  '/assets/img/wheat-rust.svg',
  '/assets/img/maize-streak.svg',
  '/assets/img/jute-die-back.svg',
  '/assets/img/tomato-early-blight.svg',
  '/assets/img/brinjal-fruit-rot.svg',
  '/assets/img/potato-late-blight.svg',
  '/assets/img/mango-anthracnose.svg',
  '/assets/img/banana-bunchy-top.svg',
  '/assets/img/cotton-boll-weevil.svg',
  '/assets/img/chili-mosaic.svg',
  // Crop photos
  '/assets/img/crop-rice.svg',
  '/assets/img/crop-wheat.svg',
  '/assets/img/crop-maize.svg',
  '/assets/img/crop-jute.svg',
  '/assets/img/crop-tomato.svg',
  '/assets/img/crop-brinjal.svg',
  '/assets/img/crop-potato.svg',
  '/assets/img/crop-mango.svg',
  '/assets/img/crop-banana.svg',
  '/assets/img/crop-cotton.svg',
  '/assets/img/crop-chili.svg',
  // Static pages
  '/privacy.html',
  '/about.html',
  '/404.html',
  '/robots.txt'
];

// Install — cache everything
self.addEventListener('install', function(event) {
  console.log('[SW] Install — caching all core assets');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Caching core assets:', CORE_ASSETS.length, 'files');
        return cache.addAll(CORE_ASSETS);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Activate — clean up old caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(name) {
            if (name !== CACHE_NAME && name !== DATA_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

// Fetch — cache-first, falling back to network
self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = request.url;

  // Skip cross-origin requests (e.g. Google Fonts)
  if (url.indexOf(location.origin) !== 0 && url.indexOf('http') === 0) {
    // Only cache same-origin; let cross-origin fall through to network
    if (request.destination === 'font' ||
        url.indexOf('googleapis.com') !== -1 ||
        url.indexOf('gstatic.com') !== -1) {
      // Allow fonts to load from network (they're preloaded in HTML)
      return;
    }
    // Block other cross-origin requests
    event.respondWith(fetch(request).catch(function() { return; }));
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(CACHE_NAME + '/index.html')
        .then(function(response) {
          if (response) {
            return response;
          }
          // First visit — try network, then fall back to cached 404
          return fetch(request)
            .then(function(networkResponse) {
              if (networkResponse && networkResponse.status === 200) {
                return networkResponse;
              }
              throw new Error('Network response failed');
            })
            .catch(function() {
              return caches.match('/404.html');
            });
        })
    );
    return;
  }

  // Cache-first for all other requests (CSS, JS, fonts, images)
  event.respondWith(
    caches.match(request)
      .then(function(response) {
        if (response) {
          return response;
        }

        // Not in cache — fetch from network and cache the response
        return fetch(request)
          .then(function(networkResponse) {
            // Cache the response if valid
            if (networkResponse &&
                networkResponse.status === 200 &&
                networkResponse.type !== 'opaque') {

              var responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(function() {
            // If both cache and network fail, try to serve a fallback
            if (request.destination === 'image') {
              return caches.match('/assets/img/screenshot-home.png');
            }
            return undefined;
          });
      })
  );
});

// Listen for messages from the app (e.g. to skip waiting)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Reload clients after new SW takes control
  if (event.data && event.data.type === 'RELOAD_CLIENTS') {
    self.clients.matchAll().then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    });
  }
});
