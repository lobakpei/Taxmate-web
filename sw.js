/* TaxMate UK — service worker (resilient install for PWA installability) */
const CACHE = 'taxmate-v2-ltd-v1-5-pricing-contract-1';
const SHELL = ['/', '/index.html', '/help.html', '/privacy.html', '/terms.html', '/manifest.json', '/favicon.ico', '/favicon-48x48.png', '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png',
  '/src/core/versions.js','/src/core/tax-rules.js','/src/core/tax-engine.js','/src/core/mtd.js','/src/core/form-mappings.js','/src/core/money.js','/src/core/partnership.js','/src/core/state-schema.js','/src/core/domain-schema.js','/src/core/company-profile.js','/src/core/company-identity.js','/src/core/company-tax-rules.js','/src/core/company-profile-history.js','/src/core/company-treatment.js','/src/core/company-ledger.js','/src/core/company-remuneration-rules.js','/src/core/company-remuneration.js','/src/core/company-scenario.js','/src/core/company-tax.js','/src/core/company-deadlines.js','/src/core/company-workspace.js','/src/core/domain-migration.js','/src/integration/ltd/company-state.js','/src/integration/ltd/company-state-repository.js','/src/integration/ltd/company-structural-state.js','/src/integration/ltd/company-transaction-adapter.js','/src/integration/ltd/companies-house-provider.js','/src/integration/ltd/CanonicalCompanyDriver.js','/src/integration/ltd/TaxMateLtdUIFacade.js','/src/integration/ltd/TaxMateLtdProductionAdapter.js','/src/integration/ltd/approved-copy.json','/src/ui/ltd/workbench-renderer.js','/src/ui/ltd/workbench.css','/src/core/revision-sync.js','/src/core/ltd-sync.js','/src/core/company-evidence.js','/src/core/portable-backup.js','/src/core/onboarding-root.js','/src/core/sync.js','/src/core/entitlement.js','/src/core/company-access.js','/src/core/telemetry.js',
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
