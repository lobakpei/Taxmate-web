# Automated Test Report

Command: `npm run test:all`.

- characterization: 4 tests;
- unit: 65/65 covering tax, MTD, form mappings, six-language parity/leak protection, deterministic onboarding, receipt-device controls, all five Founder final-freeze UI decisions, release identity, state/import, sync, entitlement, telemetry, legal/runtime consistency, portable ZIP integrity/limits and enforcing CSP structure;
- integration: local migration/reload/export/import/rollback, first-login merge, two-device item merge, offline tombstone reconnect and promotion/cancellation retention;
- static rules/config checks;
- characterization 4/4, integration 4/4, static rules 4/4 and real Firestore emulator 5/5. Total: 82/82 assertions across the gated commands.

Final full command completed successfully on 19 August 2026 for build `2026-08-19.legal-privacy-gate.2`. NPM previously reported six moderate advisories in the root development tree and nine moderate advisories in the Functions tree; no automatic or forced dependency rewrites were applied because they could introduce breaking changes. Review advisories before release.
