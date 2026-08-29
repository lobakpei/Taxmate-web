/* TaxMate UK — service worker (version-coherent, offline-safe shell) */
const CACHE = 'taxmate-v2-sync-runtime-integrity-2';
const SHELL = ['/', '/index.html', '/help.html', '/privacy.html', '/terms.html', '/manifest.json', '/favicon.ico', '/favicon-48x48.png', '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png',
  '/src/core/versions.js','/src/core/tax-rules.js','/src/core/tax-engine.js','/src/core/mtd.js','/src/core/form-mappings.js','/src/core/state-schema.js','/src/core/portable-backup.js','/src/core/onboarding-root.js','/src/core/sync.js','/src/core/entitlement.js','/src/core/telemetry.js','/src/core/product-content.js',
  '/src/core/pwa-install.js','/firebase-environment.js','/src/app/bootstrap.js','/src/app/sentry-bootstrap.js','/src/app/action-dispatch.js','/src/app/app.js','/src/app/audit.js','/vendor/jszip-3.10.1.min.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    try {
      const c = await caches.open(CACHE);
      const requests = SHELL.map(u => new Request(u, { cache: 'reload' }));
      await c.addAll(requests);
      for (const u of SHELL) {
        const response = await c.match(u, { ignoreSearch: true });
        const type = String(response && response.headers.get('content-type') || '').toLowerCase();
        if (!response || !response.ok || (!['/', '/index.html', '/help.html', '/privacy.html', '/terms.html'].includes(u) && type.includes('text/html'))) throw new Error('invalid-essential-runtime-response');
      }
      await self.skipWaiting();
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
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
    const c = await caches.open(CACHE);
    const isNavigation = e.request.mode === 'navigate';
    const essentialPath = SHELL.includes(url.pathname) || (url.pathname === '/' && SHELL.includes('/'));
    if (isNavigation) {
      const exact = await c.match(url.pathname, { ignoreSearch: true });
      return exact || c.match('/index.html', { ignoreSearch: true }) || Response.error();
    }
    if (essentialPath) {
      return (await c.match(url.pathname, { ignoreSearch: true })) || Response.error();
    }
    try {
      const res = await fetch(e.request);
      const type = String(res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && !type.includes('text/html')) c.put(e.request, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      return (await c.match(e.request)) || Response.error();
    }
  })());
});
