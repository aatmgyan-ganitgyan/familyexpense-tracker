const CACHE_NAME = 'family-expense-tracker-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.png',
  '/icon-512.png',
  '/file.svg',
  '/globe.svg',
  '/window.svg',
];

// Install event - Cache static assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Non-critical cache addAll failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - Clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept cross-origin or external API requests (e.g. Supabase DB/Auth)
  if (url.origin !== self.location.origin) return;

  // Never intercept document navigations or server actions / API routes
  // Let Next.js server-side auth & middleware handle all page loads cleanly
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth')
  ) {
    return;
  }

  // Cache-first strategy for static assets only (images, icons, manifest)
  if (
    url.pathname.startsWith('/icon') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
