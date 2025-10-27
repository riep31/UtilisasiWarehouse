// ========================================
// PWA SERVICE WORKER - CLEAN VERSION
// Utilisasi Warehouse System
// HANYA: Cache static files + NO CACHE Google Sheets API
// ========================================

const CACHE_NAME = 'utilisasi-warehouse-v1.0.1';
const OFFLINE_PAGE = './offline.html';

// Assets yang akan di-cache saat install
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './offline.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ========================================
// INSTALL EVENT
// ========================================
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] All assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
});

// ========================================
// ACTIVATE EVENT
// ========================================
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// ========================================
// FETCH EVENT - CACHING STRATEGY
// ========================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP(S) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // ========================================
  // CRITICAL: NEVER CACHE GOOGLE SHEETS API
  // Selalu ambil data terbaru dari network
  // ========================================
  if (url.hostname === 'sheets.googleapis.com') {
    console.log('[SW] Google Sheets API - Network Only (no cache)');
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      .catch(error => {
        console.error('[SW] Google Sheets fetch failed:', error);
        return new Response(
          JSON.stringify({ error: 'Tidak ada koneksi internet' }), 
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Skip cross-origin requests except trusted CDNs
  if (url.origin !== location.origin && !isTrustedOrigin(url.origin)) {
    return;
  }

  // ========================================
  // STRATEGY 1: Network First (for HTML pages)
  // ========================================
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }

  // ========================================
  // STRATEGY 2: Cache First (for static assets)
  // ========================================
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });

            return response;
          })
          .catch(error => {
            console.error('[SW] Fetch failed:', error);
            
            if (request.destination === 'image') {
              return caches.match('./icons/icon-192.png');
            }
            
            return caches.match(OFFLINE_PAGE);
          });
      })
  );
});

// ========================================
// HELPER FUNCTIONS
// ========================================
function isTrustedOrigin(origin) {
  const trustedOrigins = [
    'https://riep31.github.io',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com'
  ];
  return trustedOrigins.some(trusted => origin.startsWith(trusted));
}

// ========================================
// MESSAGE EVENT
// Untuk komunikasi dengan halaman (clear cache, dll)
// ========================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing cache...');
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded - Clean version (no auto refresh)');
