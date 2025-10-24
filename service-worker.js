// ========================================
// PWA SERVICE WORKER
// Utilisasi Warehouse System
// ========================================

const CACHE_NAME = 'utilisasi-warehouse-v1.0.0';
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
        return self.skipWaiting(); // Activate immediately
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
        // Delete old caches
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
        return self.clients.claim(); // Take control immediately
      })
  );
});

// ========================================
// FETCH EVENT - CACHING STRATEGY
// ========================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP(S) requests (e.g., chrome-extension://)
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip cross-origin requests except for known CDNs
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
          // Clone and cache the response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Show offline page
              return caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }

  // ========================================
  // STRATEGY 2: Cache First (for assets)
  // ========================================
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache invalid responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone and cache for future use
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });

            return response;
          })
          .catch(error => {
            console.error('[SW] Fetch failed:', error);
            
            // Return placeholder for images
            if (request.destination === 'image') {
              return caches.match('./icons/icon-192.png');
            }
            
            // Return offline page for other requests
            return caches.match(OFFLINE_PAGE);
          });
      })
  );
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Check if origin is trusted
function isTrustedOrigin(origin) {
  const trustedOrigins = [
    'https://riep31.github.io',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
    'https://sheets.googleapis.com'
  ];
  return trustedOrigins.some(trusted => origin.startsWith(trusted));
}

// ========================================
// MESSAGE EVENT (for communication with pages)
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

// ========================================
// BACKGROUND SYNC (optional - for future use)
// ========================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
    // Add background sync logic here
  }
});

// ========================================
// PUSH NOTIFICATION (optional - for future use)
// ========================================
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Notifikasi baru',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Utilisasi Warehouse', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./')
  );
});

console.log('[SW] Service Worker script loaded');
