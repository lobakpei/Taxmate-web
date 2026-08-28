# Sentry local/test isolation and 19:54:17 diagnosis

Date: 2026-08-28

## Verdict

The four `Application error` issues recorded at 19:54:17 BST came from the localhost actual-app integration run. They did not come from deployed TaxMate 2.0.6 and did not come from production Firebase data. Each issue was a genuine candidate module-initialisation defect, not an intentionally exercised accounting rejection.

## Process and environment correlation

- Windows process evidence showed `node.exe` PID 22724 starting at 19:53:06 BST.
- That process served the real TaxMate `index.html` app shell over loopback for the current actual-app integration/browser run.
- The four alerts arrived together at 19:54:17 BST while that loopback run was loading the newly mounted Ltd modules.
- The source names match modules present in the local Ltd candidate and absent from deployed TaxMate 2.0.6.
- Classification: localhost/actual-app local browser testing. It was not the standalone Founder Preview and not production Hosting.

The existing privacy scrubber deliberately replaced exception values with `Application error`, so the Sentry payload did not retain private state or raw exception text. Source-order reproduction and the four matching top-level guards provide the decisive source-level correlation.

## Exact failures

| Sentry source | Source category | Exact guard category | Classification |
|---|---|---|---|
| `src/core/company-workspace` | UMD factory initialisation | `TaxMate company-workspace dependencies are required` because `TaxMateRevisionSync` was not loaded | Genuine candidate runtime defect |
| `src/core/company-scenario` | UMD factory initialisation | `TaxMate company-scenario dependencies are required` because `TaxMateRevisionSync` was not loaded | Genuine candidate runtime defect |
| `src/core/company-remuneration` | UMD factory initialisation | `TaxMate company-remuneration dependencies are required` because `TaxMateRevisionSync` was not loaded | Genuine candidate runtime defect |
| `src/core/company-tax` | UMD factory initialisation | `TaxMate company-tax dependencies are required` because `TaxMateRevisionSync` was not loaded | Genuine candidate runtime defect |

The same ordering defect could also have failed `company-ledger`; regression coverage now includes that dependency even though it was not one of the four reported issues.

## Product fix

`index.html` now loads `src/core/revision-sync.js` before every canonical Ltd module that depends on it. This is an actual-app script-order correction only; no accounting rule or Fable visual implementation was changed.

Regression: `tests/unit/sentry-isolation.test.js` verifies the load order for company ledger, remuneration, scenario, tax and workspace.

## Environment isolation

`src/app/sentry-bootstrap.js` no longer causes an unconditional Sentry SDK request. Production telemetry is permitted only when all of the following are true:

- the current hostname is in the injected production host allowlist;
- `sentry.enabled === true`;
- `sentry.environment === 'production'`;
- the configured loader URL matches the narrowly allowed Sentry loader shape;
- no emulator/functions-origin override is active; and
- `navigator.webdriver !== true`.

Therefore localhost, `127.0.0.1`, Firebase emulators, automated browsers and Founder local preview use a no-op transport and never request the production SDK or ingestion endpoint. The production configuration still initialises Sentry with:

- environment `production`;
- release `taxmate-web@2.1.0`;
- dist/build `2026-08-28.ltd-v1-5-actual-app.1`;
- tags for app version, build ID and PWA cache identity.

No server secret is added to browser configuration. The browser-visible loader identity is not a server credential.

## Privacy

`src/core/telemetry.js` retains the existing fail-closed privacy boundary. It removes user, request, message, breadcrumb, contexts and extra payloads; replaces exception text with `Application error`; removes query strings and frame variables; and permits only controlled release/build/cache tags. Tests prove that bookkeeping amounts, descriptions, business names, email, receipt data and authorization data do not survive scrubbing.

## Automated evidence

- Sentry isolation and load order: 3/3 PASS in `tests/unit/sentry-isolation.test.js`.
- Telemetry privacy and value-free analytics: 3/3 PASS in `tests/unit/telemetry.test.js`.
- Actual app real-browser acceptance: 95 assertions PASS; `sentryRequests = []`, `externalRequests = []`, zero fatal page/console errors.
- Paid Cloud/Partner Sync browser acceptance: 90 assertions PASS with the same external-network guard.
- The network guards classify any attempted Sentry/ingest request as an acceptance failure rather than silently allowing it.

## Production truth

- Production TaxMate 2.0.6 changed: NO.
- Production Sentry configuration changed: NO.
- Production Firebase data changed: NO.
- Production deployment performed: NO.
- Incremental cost: GBP 0.
