# Staging External-Service Report

No isolated staging credentials or configuration were available. `.firebaserc` contains only the production project `taxmate-uk-2`; no staging Firebase/Stripe/GA4/Sentry environment variables were present. Production was not used as a substitute.

| Test not run | Required staging state | Release impact | Safest next action |
|---|---|---|---|
| Google and Apple sign-in | Isolated Firebase project with both providers and test accounts | Blocks production identity release | Configure providers only in staging and run browser sign-in/sign-out/reload |
| Personal cloud sync and App Check | Staging Firestore, preview-domain App Check and test user | Blocks cloud production release | Deploy candidate rules/config to staging, then inspect verified requests |
| Receipt upload/download/delete and full ZIP binary restore | Staging Auth + Storage + Plus/Pro test entitlement | Blocks receipt production release | Use synthetic receipts in staging; verify associations, orphan handling and rollback |
| Genuine two-client sync/offline/delete flow | Two browser sessions signed into the same staging account | Blocks sync production release | Run concurrent edit, reconnect and tombstone/no-resurrection scenarios |
| Plus/Pro checkout, promotion, expiry, cancellation and webhook truth | Stripe test prices, test keys, webhook endpoint and staging Functions | Blocks paid-plan release | Configure Stripe test mode only and exercise the full entitlement lifecycle |
| GA4 delivery | Staging measurement property/debug access | Blocks telemetry acceptance | Verify allow-listed event names contain no financial or user values |
| Sentry synthetic error payload | Staging DSN/project access | Blocks error-telemetry acceptance | Trigger a synthetic staging error and inspect the received scrubbed payload |
| Actual staging Security Rules | Isolated deployed staging Firestore/Storage rules | Blocks production rule deployment | Repeat owner/outsider/malformed/size/type cases against staging services |

Local substitutes that did run: 5/5 real Firestore-emulator security tests, deterministic sync/migration tests, fail-closed entitlement tests, receipt ZIP integrity/rollback unit tests, and GA4/Sentry taxonomy/scrubbing unit tests. These are valid engineering evidence but are not reported as external staging success.
