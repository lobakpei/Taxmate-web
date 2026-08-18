# Staging External-Service Report

## Readiness audit — 18 August 2026

Isolated external staging is **not configured**, so no external staging test is reported as passed. `.firebaserc` contains only production project `taxmate-uk-2`; the checked-in web config and App Check key also target production. No staging Firebase alias/web configuration, staging Auth test account, preview App Check site key, Stripe TEST price IDs/secrets/webhook endpoint, GA4 staging property/debug access or Sentry staging DSN/project access is present. Production was not used as a substitute.

Apple Sign-In has been intentionally removed by the Founder and is not part of this staging gate.

| Test not run | Minimum isolated staging state required |
|---|---|
| Google Sign-In, personal cloud sync and App Check | Staging Firebase project; Google provider; disposable test account; staging web config; preview-domain App Check key; candidate rules/config deployed only there |
| Receipt upload/download/delete and full ZIP binary restore | Staging Auth/Firestore/Storage plus a server-verified staging Plus/Pro entitlement and synthetic receipt files |
| Two-client initial/concurrent/offline/tombstone/no-resurrection flow | Two isolated browser clients signed into the same disposable staging account |
| Plus/Pro checkout, promotion tier/duration/expiry, cancellation and webhook truth | Stripe TEST secret, webhook secret, Plus/Pro test price IDs, staging Functions endpoint, and at least one disposable Plus and Pro promotion code with known expiry |
| GA4 delivery | Staging measurement ID/property and DebugView access |
| Sentry payload inspection | Staging DSN/project and event-inspection access |
| Actual deployed rules behavior | Candidate Firestore and Storage rules deployed only to the isolated staging project |

Minimum Founder input/setup required to continue: provide or authorize creation/configuration of the isolated staging Firebase project and its web/App Check config; provide disposable Google staging account access; provide Stripe TEST-mode price IDs, secrets/webhook and known promotion fixtures; and provide GA4/Sentry staging project access. Authentication secrets must be supplied through the relevant secure CLI/service mechanism, not committed to the repository or pasted into reports.

Local evidence remains valid but is not a substitute: 5/5 real Firestore-emulator rules tests, deterministic sync/migration/tombstone tests, fail-closed entitlement tests, receipt ZIP integrity/rollback tests, GA4/Sentry taxonomy/scrubbing tests, and the final browser/PWA gate.
