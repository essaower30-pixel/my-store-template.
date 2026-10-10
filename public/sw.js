const CACHE_NAME = 'smart-trader-v27';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Helper to match cached HTML regardless of query strings
async function getCachedHtml(request) {
  const cache = await caches.open(CACHE_NAME);
  // 1. Exact match
  let match = await cache.match(request);
  if (match) return match;
  // 2. Match ignoring search params (e.g. /?store=store_1 -> matches / or /index.html)
  match = await cache.match(request, { ignoreSearch: true });
  if (match) return match;
  // 3. Fallback to cached index.html
  match = await cache.match('/index.html');
  if (match) return match;
  // 4. Fallback to cached root
  match = await cache.match('/');
  return match;
}

// Install event: Pre-cache core shell and dynamically discover asset bundles
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Pre-cache static URLs
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch((err) => console.warn('Pre-cache skip:', url, err))
        )
      );

      // 2. Discover and precache all JS and CSS script tags from /index.html
      try {
        const indexRes = await fetch('/index.html', { cache: 'no-cache' });
        if (indexRes.ok) {
          const htmlText = await indexRes.clone().text();
          const assetUrls = [];
          const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
          const linkRegex = /<link[^>]+href=["']([^"']+)["']/gi;
          let match;
          while ((match = scriptRegex.exec(htmlText)) !== null) {
            const src = match[1];
            if (src && !src.startsWith('http') && !src.startsWith('//')) {
              assetUrls.push(src);
            }
          }
          while ((match = linkRegex.exec(htmlText)) !== null) {
            const href = match[1];
            if (href && !href.startsWith('http') && !href.startsWith('//') && (href.endsWith('.css') || href.endsWith('.js') || href.includes('/assets/'))) {
              assetUrls.push(href);
            }
          }
          await Promise.allSettled(
            assetUrls.map((url) =>
              fetch(url)
                .then((res) => {
                  if (res.ok) return cache.put(url, res);
                })
                .catch((err) => console.warn('Asset precache skip:', url, err))
            )
          );
        }
      } catch (err) {
        console.warn('Index asset discovery skip:', err);
      }
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

  // NEVER intercept or cache Vite development modules, HMR, or dev-server specific requests
  if (
    request.url.includes('/@vite/') ||
    request.url.includes('/@fs/') ||
    request.url.includes('/node_modules/') ||
    request.url.includes('/src/') ||
    request.url.includes('?v=') ||
    request.url.includes('?t=') ||
    request.url.includes('ais-dev-')
  ) {
    return;
  }

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
    // Network-Only for all other API routes (e.g. sync, manifest, AI routes)
    event.respondWith(fetch(request));
    return;
  }

  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    // Fast Network-First with timeout fallback to cache for offline responsiveness
    event.respondWith(
      new Promise((resolve) => {
        let responded = false;

        // Quick timeout: If offline or slow network, serve cached HTML immediately within 1200ms
        const timeoutId = setTimeout(async () => {
          if (!responded) {
            responded = true;
            const cached = await getCachedHtml(request);
            if (cached) resolve(cached);
          }
        }, 1200);

        fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, copy);
              cache.put('/index.html', networkResponse.clone());
              cache.put('/', networkResponse.clone());
            }
            if (!responded) {
              responded = true;
              clearTimeout(timeoutId);
              resolve(networkResponse);
            }
          })
          .catch(async () => {
            if (!responded) {
              responded = true;
              clearTimeout(timeoutId);
              const cached = await getCachedHtml(request);
              resolve(cached || new Response('Offline', { status: 503 }));
            }
          });
      })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): Cache-First with background revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return instantly from cache, and background refresh if online
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      // Not in cache: Fetch from network and store
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async (err) => {
          console.warn('Network request failed offline:', request.url, err);
          const fallback = await caches.match(request, { ignoreSearch: true });
          if (fallback) return fallback;
          return new Response('', { status: 408, statusText: 'Offline asset unavailable' });
        });
    })
  );
});
