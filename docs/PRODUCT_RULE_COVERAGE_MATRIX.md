# Product & Rule Coverage Matrix — Final Candidate

The frozen W0 matrix is retained as `W0_PRODUCT_RULE_COVERAGE_MATRIX.md`. Evidence roots are `evidence/w0` and `evidence/final`.

| ID | Finding | W0 status | Risk | Target | Functional change | Test/evidence | Final status |
|---|---|---|---|---|---|---|---|
| TM-P0-01 | 2026-27 Class 2 stale | CONFIRMED | Wrong NI | W1 | £7,105 SPT / £3.65 weekly, versioned | Tax boundaries | FIXED |
| TM-P0-02 | MTD used profit | CONFIRMED | Wrong eligibility | W1 | Gross turnover plus optional gross property income | MTD fixtures/browser | FIXED |
| TM-P0-03 | MTD copy/quarters overstated | CONFIRMED | Regulatory | W1 | Non-submission copy; official cumulative periods | Unit/browser | FIXED |
| TM-P0-04 | SA103S mapping wrong | CONFIRMED | Filing | W1 | Official 2025-26 short-form map; future forms not guessed | Form snapshots | FIXED |
| TM-P0-05 | SA104S mapping wrong | CONFIRMED | Filing | W1 | Partner Statement concept map | Form snapshots | FIXED |
| TM-P0-06 | POA boundary/80% gap | CONFIRMED | Wrong guidance | W1 | Exact £1,000 and >80% exception | Tax boundaries | FIXED |
| TM-P0-07 | Remote rates unvalidated | CONFIRMED | Tax corruption | W1 | Strict known-year/source/schema validation | Rejection fixtures | FIXED |
| TM-P0-08 | Deletion incomplete | CONFIRMED | Privacy | W2/W3 | Server deletion inventory, orphan receipts, Auth/billing, shared retention | Integration + report | FIXED IN CANDIDATE |
| TM-P0-09 | Sync nondeterministic | CONFIRMED | Loss/resurrection | W2 | Per-item metadata, deterministic merge, tombstones | Sync/integration | FIXED |
| TM-P0-10 | Paid entitlement placeholder | CONFIRMED | Revenue/security | W3 | Stripe/server truth; controlled promotions; fail-closed offline | Entitlement suite | FIXED IN CANDIDATE |
| TM-P0-11 | Import weak | CONFIRMED | Corruption/XSS | W2 | Strict validation, preview, pre-backup, rollback | State/round-trip | FIXED |
| TM-P0-12 | Rules not auditable | CONFIRMED | Cross-user | W2 | Tracked rules, explicit membership, immutable config/entitlement | Firestore emulator 5/5 | FIXED IN CANDIDATE |
| TM-P0-13 | No automated suite | CONFIRMED | Regression | W0-W5 | Characterization/unit/integration/rules/browser stack | Full suite | FIXED |
| TM-P1-01 | Monolith | CONFIRMED | Change risk | W4 | Minimum core extraction only | Module suites | MITIGATED |
| TM-P1-02 | Privacy/runtime mismatch | CONFIRMED | UK GDPR/trust | W3 | Scrubbed telemetry, accurate regions/deletion/retention | Telemetry/browser | FIXED IN CANDIDATE |
| TM-P1-03 | Zoom/accessibility | CONFIRMED | Accessibility | W5 | Zoom, dialog semantics, focus/Escape, RTL checks | Mobile/browser | FIXED |
| TM-P1-04 | PWA identity/cache | CONFIRMED | Offline/update | W5 | Root identity, versioned shell, prior cache retained | True offline launch | FIXED |
| TM-P1-05 | SEO absent | CONFIRMED | Discovery | W5 | Canonical/meta/robots/sitemap/public help/privacy | Static/browser | FIXED IN CANDIDATE |
| TM-P1-06 | Browser/supply chain | CONFIRMED | XSS/supply chain | W5.6 | Pinned/vendored dependencies, external executable scripts, allow-listed declarative actions and enforcing CSP | Config, unit and browser review | MITIGATED |
| TM-P1-07 | Retention UX absent | CONFIRMED | Record loss | W2/W5 | Backup receipt notice and shared/provider retention copy | Import/legal | FIXED |
| TM-P1-08 | Version fragmentation | CONFIRMED | Rollback/support | W4/W5 | Separate app/build/state/tax/form/sync/PWA IDs | Settings/browser | FIXED |
