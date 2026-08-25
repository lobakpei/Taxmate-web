/* TaxMate UK — service worker (resilient install for PWA installability) */
const CACHE = 'taxmate-v2-fresh-device-hydration-1';
const SHELL = ['/', '/index.html', '/help.html', '/privacy.html', '/terms.html', '/manifest.json', '/favicon.ico', '/favicon-48x48.png', '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png',
  '/src/core/versions.js','/src/core/tax-rules.js','/src/core/tax-engine.js','/src/core/mtd.js','/src/core/form-mappings.js','/src/core/state-schema.js','/src/core/portable-backup.js','/src/core/onboarding-root.js','/src/core/sync.js','/src/core/entitlement.js','/src/core/telemetry.js','/src/core/legal.js',
  '/src/core/pwa-install.js','/firebase-environment.js','/src/app/bootstrap.js','/src/app/sentry-bootstrap.js','/src/app/action-dispatch.js','/src/app/app.js','/src/app/audit.js','/vendor/jszip-3.10.1.min.js'];

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
