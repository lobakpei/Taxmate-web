# Automated Test Report

Command: `npm run test:all`.

- characterization: 4 tests;
- unit: 65/65 covering tax, MTD, form mappings, six-language parity/leak protection, deterministic onboarding, receipt-device controls, all five Founder final-freeze UI decisions, release identity, state/import, sync, entitlement, telemetry, legal/runtime consistency, portable ZIP integrity/limits and enforcing CSP structure;
- integration: local migration/reload/export/import/rollback, first-login merge, two-device item merge, offline tombstone reconnect and promotion/cancellation retention;
- static rules/config checks;
- characterization 4/4, integration 4/4, static rules 4/4, real Firestore/Storage rules emulator 11/11 and Auth/Functions integration emulator 3/3. Total: 91/91 tests across the gated commands.

Final full command completed successfully on 19 August 2026 for build `2026-08-19.production-readiness-rc.1`. Root production dependencies reported 0 vulnerabilities. Functions production dependencies reported 8 moderate transitive advisories and 0 high/critical; npm's proposed complete fixes require incompatible major upgrades, so no automatic or forced dependency rewrite was applied.
