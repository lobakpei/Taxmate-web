# TaxMate Isolated Staging Evidence — Final Closeout

Verification closeout: 20 August 2026. Production `taxmate-uk-2`, Stripe LIVE and production user data were not modified or used as substitutes.

## Retained PASS evidence

- `taxmate-staging` remains the isolated non-production project with test data only.
- Candidate Functions and the persistent Stripe TEST webhook were validated without changing production.
- Firestore and Storage rules, receipt upload/download/delete lifecycle, receipt-binary ZIP restore and cross-user denial passed.
- App Check token infrastructure and IAM cleanup passed within the approved staging boundary.
- Correct-account TaxMate Stripe Sandbox passed Plus £3.99 and Pro £8.49 GBP monthly hosted Checkout, tax £0, signed webhook delivery, duplicate/out-of-order handling, promotions, cancellation, expiry, partial-refund review, full-refund entitlement removal and data preservation.
- GA4 received the allow-listed staging event with privacy controls; Sentry received a scrubbed synthetic event without bookkeeping or identity payload fields.
- Staging Hosting remains globally `noindex`; deployment excludes repository metadata, Firebase CLI cache and debug logs.

## Staging-only limitation

The isolated Google OAuth callback did not complete in `taxmate-staging`. A minimal Firebase App + Auth-only probe reproduced the stall without loading TaxMate, Firestore, Storage, Stripe, telemetry or App Check. The temporary probe and temporary data were removed.

Classification: `STAGING_ONLY_OAUTH_LIMITATION`.

This limitation is not a production release blocker, must not trigger further production Auth changes and does not invalidate the retained staging data/security or Stripe evidence. The Founder will decide separately whether to retain or delete the staging project after release.
