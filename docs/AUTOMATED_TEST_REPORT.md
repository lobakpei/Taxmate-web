# Automated Test Report

Command: `npm run test:all`.

- characterization: 4 tests;
- unit: 43/43 covering tax, MTD, form mappings, state/import, sync, entitlement, telemetry, portable ZIP integrity/limits and enforcing CSP structure;
- integration: local migration/reload/export/import/rollback, first-login merge, two-device item merge, offline tombstone reconnect and promotion/cancellation retention;
- static rules/config checks;
- characterization 4/4, integration 4/4, static rules 4/4 and real Firestore emulator 5/5. Total: 60/60 assertions across the gated commands.

The final command output should be regenerated immediately before handoff after the last source change. NPM reported six moderate advisories in the root development tree and nine moderate advisories in the Functions tree; no automatic or forced dependency rewrites were applied because they could introduce breaking changes. Review advisories before release.
