# Automated Test Report

Command: `npm run test:all`.

- characterization: 4 tests;
- unit: 68/68 covering tax, MTD, form mappings, six-language parity/leak protection, deterministic onboarding, receipt-device controls, all five Founder final-freeze UI decisions, release identity, state/import, sync, entitlement, telemetry, legal/runtime consistency, Stripe server-source invariants, portable ZIP integrity/limits and enforcing CSP structure;
- integration: local migration/reload/export/import/rollback, first-login merge, two-device item merge, offline tombstone reconnect and promotion/cancellation retention;
- static rules/config checks;
- characterization 4/4, unit 69/69, integration 4/4, static rules 4/4, real Firestore/Storage rules emulator 11/11 and Auth/Functions integration emulator 3/3. Total: 95/95 tests across the repository gate. The separate real Stripe TEST sandbox integration passed 1/1.

Final full command completed successfully on 19 August 2026 for build `2026-08-19.external-services-rc.3`. The repository gate is 95/95 after adding the exact Sentry CSP-host regression. Root production dependencies reported 0 vulnerabilities. Functions production dependencies reported 8 moderate transitive advisories and 0 high/critical; npm's proposed complete fixes require incompatible major upgrades, so no automatic or forced dependency rewrite was applied.
