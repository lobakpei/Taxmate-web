/* TaxMate UK — service worker (version-coherent, offline-safe shell) */
const CACHE = 'taxmate-v2-focused-hotfix-production-1';
const SHELL = ['/', '/index.html', '/help.html', '/privacy.html', '/terms.html', '/manifest.json?v=20260903-6', '/favicon.ico?v=20260903-6', '/favicon-16x16.png?v=20260903-6', '/favicon-32x32.png?v=20260903-6', '/favicon-48x48.png?v=20260903-6', '/apple-touch-icon.png?v=20260903-6', '/icon-192.png?v=20260903-6', '/icon-512.png?v=20260903-6', '/icon-512-maskable.png?v=20260903-6', '/taxmate-share-20260831-v2.png', '/assets/brand/derived/taxmate-brand-logo-light.svg', '/assets/brand/derived/taxmate-brand-logo-dark.svg', '/assets/brand/derived/taxmate-icon-light.svg', '/assets/brand/derived/taxmate-icon-dark.svg',
  '/src/core/versions.js','/src/core/tax-rules.js','/src/core/tax-engine.js','/src/core/mtd.js','/src/core/form-mappings.js','/src/core/money.js','/src/core/partnership.js','/src/core/partner-invite.js','/src/core/state-schema.js','/src/core/account-storage.js','/src/core/assistant.js','/src/core/domain-schema.js','/src/core/company-profile.js','/src/core/company-identity.js','/src/core/company-tax-rules.js','/src/core/company-profile-history.js','/src/core/company-treatment.js','/src/core/company-ledger.js','/src/core/company-remuneration-rules.js','/src/core/company-remuneration.js','/src/core/company-scenario.js','/src/core/company-tax.js','/src/core/company-deadlines.js','/src/core/company-workspace.js','/src/core/domain-migration.js','/src/integration/ltd/company-state.js','/src/integration/ltd/company-state-repository.js','/src/integration/ltd/company-structural-state.js','/src/integration/ltd/company-transaction-adapter.js','/src/integration/ltd/companies-house-provider.js','/src/integration/ltd/CanonicalCompanyDriver.js','/src/integration/ltd/TaxMateLtdUIFacade.js','/src/integration/ltd/TaxMateLtdProductionAdapter.js','/src/integration/ltd/approved-copy.json','/src/ui/ltd/workbench-renderer.js','/src/ui/ltd/workbench.css','/src/core/revision-sync.js','/src/core/ltd-sync.js','/src/core/company-evidence.js','/src/core/portable-backup.js','/src/core/onboarding-root.js','/src/core/sync.js','/src/core/entitlement.js','/src/core/company-access.js','/src/core/telemetry.js','/src/core/product-content.js',
  '/src/core/backup-export.js','/src/core/pwa-install.js','/firebase-environment.js','/src/app/bootstrap.js','/src/app/sentry-bootstrap.js','/src/app/action-dispatch.js','/src/app/app.js','/src/app/audit.js','/vendor/jszip-3.10.1.min.js'];

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
      const cached = await c.match(url.pathname, { ignoreSearch: true });
      if (cached) return cached;
      // An interrupted browser/SW upgrade can leave an older client with an
      // incomplete current cache. Repair the one missing immutable shell asset
      // when connectivity returns; never substitute HTML for executable bytes.
      try {
        const res = await fetch(e.request);
        const type = String(res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok || (!['/', '/index.html', '/help.html', '/privacy.html', '/terms.html'].includes(url.pathname) && type.includes('text/html'))) return Response.error();
        await c.put(url.pathname, res.clone());
        return res;
      } catch (error) {
        return Response.error();
      }
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
