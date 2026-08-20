/* TaxMate UK — service worker (resilient install for PWA installability) */
const CACHE = 'taxmate-v2-rc-1-production-cleanroom-rc-7';
const CACHE_PREFIX = 'taxmate-';
const SHELL = ['/', '/index.html', '/help.html', '/privacy.html', '/terms.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png',
  '/src/core/versions.js','/src/core/tax-rules.js','/src/core/tax-engine.js','/src/core/mtd.js','/src/core/form-mappings.js','/src/core/state-schema.js','/src/core/portable-backup.js','/src/core/onboarding-root.js','/src/core/sync.js','/src/core/entitlement.js','/src/core/telemetry.js','/src/core/legal.js',
  '/firebase-environment.js','/src/app/bootstrap.js','/src/app/sentry-bootstrap.js','/src/app/action-dispatch.js','/src/app/app.js','/src/app/audit.js','/vendor/jszip-3.10.1.min.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Cache each file individually so one failure doesn't abort the whole install
    await Promise.all(SHELL.map(async (u) => {
      try { await c.add(new Request(u, { cache: 'reload' })); } catch (err) { /* ignore individual failures */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).sort();
    await Promise.all(old.slice(0,-1).map(k => caches.delete(k))); // retain one previous shell for rollback
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
      const current = await caches.open(CACHE);
      const cached = await current.match(e.request);
      return cached || current.match('/index.html') || current.match('/');
    }
  })());
});
