const CACHE_NAME = 'smart-trader-v13';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg'
];

// Install event: Pre-cache core shell immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch((err) => console.warn('Pre-cache skip:', url, err))
        )
      );
    })
  );
});

// Activate event: Clean up old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Cache-First for instant HTML navigation & static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  // EXCLUDE API ROUTES FROM CACHE-FIRST OR HANDLE WITH NETWORK-FIRST
  if (request.url.includes('/api/')) {
    if (request.url.includes('/api/custom-icon')) {
      // Network-First for custom icon so it can be loaded offline but updates immediately when online
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => caches.match(request))
      );
      return;
    }
    // Network-Only for all other API routes (e.g. manifest, analytics, AI routes)
    event.respondWith(fetch(request));
    return;
  }

  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    // Serve HTML from CACHE immediately for instantaneous PWA launch without splash freeze
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Revalidate in background without blocking launcher
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          // Fallback to index.html or root in cache
          return caches.match('/index.html')
            .then((res) => res || caches.match('/'))
            .then((res) => {
              if (res) return res;

              // If not cached at all, fetch network
              return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  const copy = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
              });
            });
        })
        .catch(() => {
          return caches.match('/index.html')
            .then((res) => res || caches.match('/'))
            .then((res) => res || new Response('Offline', { status: 503 }));
        })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): Cache-First with background revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return instantly from cache
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});

        return cachedResponse;
      }

      // Not in cache: Fetch from network and store
      return fetch(request).then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('Network request failed offline:', request.url, err);
      });
    })
  );
});
