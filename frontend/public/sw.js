/**
 * VivoQuest Service Worker
 * 
 * Provides offline caching for static application assets and web shell.
 * SECURITY NOTICE: Under HIPAA / Indian Health Data Privacy principles,
 * clinical API requests (/api/v1/*) are NEVER cached in CacheStorage.
 * Patient and clinical offline storage is handled strictly via client-controlled IndexedDB.
 */

const CACHE_NAME = 'vivoquest-app-v1';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
];

// Install: Cache core static assets
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

// Activate: Clean up previous cache versions
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

// Fetch: Network-first for dynamic content, cache-first for static assets
// ALWAYS bypass CacheStorage for API calls (/api/*) to safeguard patient data
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT PRIVACY RULE: Never intercept or cache API endpoints or auth tokens
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/v1/')) {
    return; // Let browser perform direct network fetch without caching
  }

  // Handle static page and asset navigation
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Cache successful responses for static assets (images, css, js)
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
        }).catch(() => {
          // If offline and request is HTML navigation, fallback to root or cached page
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
    );
  }
});
