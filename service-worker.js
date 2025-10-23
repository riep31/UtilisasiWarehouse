const CACHE_NAME = 'site-cache-v1';
const OFFLINE_PAGE = '/offline.html';
const ASSETS = [
  '/',
  'dashboard.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Install - cache shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS.concat([OFFLINE_PAGE]));
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch - strategy: network-first for navigation, cache-first for assets
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // navigation requests -> network first, fallback to cache/offline
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(req).then(res => {
        // put copy in cache
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match(OFFLINE_PAGE))
      )
    );
    return;
  }

  // For other requests -> cache-first, then network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        // Optionally cache images/scripts fetched from network
        if (req.method === 'GET' && response && response.status === 200 && response.type !== 'opaque') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() => {
        // If image request fails, optionally return placeholder
        if (req.destination === 'image') {
          return caches.match('/icons/icon-192.png');
        }
      });
    })
  );
});
