/* TaxMate UK — service worker (resilient install for PWA installability) */
const CACHE = 'taxmate-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Cache each file individually so one failure doesn't abort the whole install
    await Promise.all(SHELL.map(async (u) => {
      try { await c.add(new Request(u, { cache: 'reload' })); } catch (err) { /* ignore individual failures */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only handle same-origin GET; let Firebase/CDN pass straight through
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const res = await fetch(e.request);
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    } catch (err) {
      const cached = await caches.match(e.request);
      return cached || caches.match('./index.html') || caches.match('./');
    }
  })());
});
