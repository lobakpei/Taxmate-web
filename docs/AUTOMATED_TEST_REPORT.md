# Automated Test Report

Command: `npm run test:all`.

- characterization: 4 tests;
- unit: tax, MTD, form mappings, state/import, sync, entitlement and telemetry;
- integration: local migration/reload/export/import/rollback, first-login merge, two-device item merge, offline tombstone reconnect and promotion/cancellation retention;
- static rules/config checks;
- real Firestore emulator: 5/5.

The final command output should be regenerated immediately before handoff after the last source change. NPM reported six moderate advisories in the root development tree and nine moderate advisories in the Functions tree; no automatic or forced dependency rewrites were applied because they could introduce breaking changes. Review advisories before release.
