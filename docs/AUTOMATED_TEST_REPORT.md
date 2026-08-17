# Automated Test Report

Command: `npm run test:all`.

- characterization: 4 tests;
- unit: 53/53 covering tax, MTD, form mappings, six-language parity/leak protection, deterministic onboarding, receipt-device controls, release identity, state/import, sync, entitlement, telemetry, portable ZIP integrity/limits and enforcing CSP structure;
- integration: local migration/reload/export/import/rollback, first-login merge, two-device item merge, offline tombstone reconnect and promotion/cancellation retention;
- static rules/config checks;
- characterization 4/4, integration 4/4, static rules 4/4 and real Firestore emulator 5/5. Total: 70/70 assertions across the gated commands.

Final full command completed successfully on 17 August 2026. NPM previously reported six moderate advisories in the root development tree and nine moderate advisories in the Functions tree; no automatic or forced dependency rewrites were applied because they could introduce breaking changes. Review advisories before release.
