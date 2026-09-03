(function attachVersions(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxMateCore = Object.assign(root.TaxMateCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function versionsFactory() {
  const VERSIONS = Object.freeze({
    APP_VERSION: '2.1.15',
    BUILD_ID: '2026-09-02.focused-repair-production.1',
    STATE_SCHEMA_VERSION: 5,
    TAX_RULESET_VERSION: '2026-27.2026-08-17.1',
    FORM_MAPPING_VERSION: '2025-26.2026-04-06.1',
    SYNC_SCHEMA_VERSION: 5,
    PWA_CACHE_VERSION: 'taxmate-v2-focused-repair-production-1'
  });
  return { VERSIONS };
});
