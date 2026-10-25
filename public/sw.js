// Minimal service worker: makes the app installable and lets the shell open
// without a connection. The API is never cached, so data is always fresh.
// Bump CACHE whenever a file is added to SHELL or the shell changes shape.
const CACHE = 'compost-v7';
const SHELL = [
  '/', '/save', '/style.css', '/strings.js', '/api.js', '/app.js', '/save.js',
  '/store.js', '/format.js', '/rack.js', '/vault.js', '/heap.js',
  '/keys.js', '/palette.js', '/palette.css', '/search.js', '/export.js', '/zip.js',
  '/shelf.js', '/shelf.css',
  '/daily.js', '/daily.css',
  '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png',
  '/fonts/literata-latin-wght-normal.woff2', '/fonts/literata-latin-wght-italic.woff2',
  '/fonts/ibm-plex-sans-latin-400-normal.woff2', '/fonts/ibm-plex-sans-latin-400-italic.woff2',
  '/fonts/ibm-plex-sans-latin-500-normal.woff2',
  // Phase 4: reader
  '/reader.js', '/reader.css', '/extract.js', '/vendor/Readability.js', '/vendor/purify.es.mjs',
];

// Phase 4: article images come through the same-origin /img proxy and are
// kept for offline reading, cache first, at most IMG_LIMIT of them (oldest
// out first). Article text lives in 'compost-content', written by reader.js.
// Both survive a CACHE bump.
const IMG_CACHE = 'compost-img';
const IMG_LIMIT = 400;
const KEEP = [IMG_CACHE, 'compost-content'];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname !== '/img') return;
  event.respondWith(
    caches.open(IMG_CACHE).then(async (cache) => {
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const res = await fetch(event.request);
      if (res.ok) {
        await cache.put(event.request, res.clone());
        trimImages(cache);
      }
      return res;
    }).catch(() => Response.error())
  );
});

async function trimImages(cache) {
  const keys = await cache.keys();
  for (const request of keys.slice(0, Math.max(0, keys.length - IMG_LIMIT))) await cache.delete(request);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first, cache as the fallback.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname === '/img') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && SHELL.includes(url.pathname)) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(url.pathname, copy));
        }
        return res;
      })
      .catch(() => caches.match(url.pathname).then((hit) => hit || Response.error()))
  );
});
