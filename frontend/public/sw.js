/**
 * VivoQuest Service Worker
 * 
 * Provides offline caching for static application assets and web shell.
 * SECURITY NOTICE: Under HIPAA / Indian Health Data Privacy principles,
 * clinical API requests (/api/v1/*) are NEVER cached in CacheStorage.
 * Patient and clinical offline storage is handled strictly via client-controlled IndexedDB.
 */

const CACHE_NAME = 'vivoquest-app-v2';
const STATIC_ASSETS = [
  '/favicon.svg',
  '/manifest.json',
];

// Install: Cache essential static shell assets only (do NOT precache '/' to avoid stale index)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Static asset precache notice:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Purge all stale caches from previous versions (including vivoquest-app-v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Strict Network-First for HTML navigation; never serve stale HTML
// ALWAYS bypass CacheStorage for API calls (/api/*) to safeguard patient data
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT PRIVACY RULE: Never intercept or cache API endpoints or auth tokens
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/v1/')) {
    return; // Direct network fetch without caching
  }

  // Handle HTML navigation (page loads): ALWAYS NETWORK-FIRST
  if (
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback only when network completely fails
          return caches.match(event.request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Handle static assets (images, css, js): Stale-while-revalidate or Network-first
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname.endsWith('.js') ||
              url.pathname.endsWith('.css') ||
              url.pathname.endsWith('.png') ||
              url.pathname.endsWith('.svg') ||
              url.pathname.endsWith('.ico'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

