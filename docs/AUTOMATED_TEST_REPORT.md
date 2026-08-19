# Automated Test Report

Command: `npm run test:all`.

- characterization: 4 tests;
- unit: 79/79 covering tax, MTD, form mappings, six-language parity/leak protection, deterministic onboarding, receipt-device controls, all five Founder final-freeze UI decisions, release identity, state/import, sync, entitlement, telemetry, legal/runtime consistency, Stripe server-source invariants and old-ID exclusion, portable ZIP integrity/limits, enforcing CSP and technical SEO;
- integration: local migration/reload/export/import/rollback, first-login merge, two-device item merge, offline tombstone reconnect and promotion/cancellation retention;
- static rules/config checks;
- characterization 4/4, unit 79/79, integration 5/5, static rules 4/4, real Firestore/Storage rules emulator 11/11 and Auth/Functions integration emulator 3/3. Total: 106/106 tests across the repository gate. Correct-account external Stripe tests were intentionally not run because the refreshed Dashboard identity failed the account boundary.

Final full command completed successfully on 19 August 2026 for build `2026-08-19.seo-implementation-rc.5`. The repository gate is 106/106 after adding exact title/meta/H1/canonical, robots/sitemap, JSON-LD, public-link, staging-noindex, real HTTP 200/404 and zero account-specific Stripe-ID regressions. Root production dependencies reported 0 vulnerabilities. Functions production dependencies reported 8 moderate transitive advisories and 0 high/critical; npm's proposed complete fixes require incompatible major upgrades, so no automatic or forced dependency rewrite was applied.

Stripe Sandbox RC.6 reran the complete repository gate after the current-API refund webhook fix: characterization 4/4, unit 79/79, integration 5/5, static rules 4/4, Firestore/Storage rules emulator 11/11 and Auth/Functions emulator 3/3, totalling 106/106. External correct-account gates separately passed hosted receipt 1/1 for Plus, hosted receipt 1/1 for Pro and hosted lifecycle 1/1. Secret scanning found no Stripe secret or webhook signing secret in the working tree; the object-identity regression permits only the canonical TaxMate Sandbox allow-list.
