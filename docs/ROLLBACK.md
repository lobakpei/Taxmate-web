# TaxMate Release Rollback Instructions

Production is unchanged at pre-release commit `745f7497d374f000870c4a7a111130008f8945a7`, tree `4726b48f89150782f50e6227226c227c13765212`.

## Before release

No rollback action is required because no push, merge, production Hosting/Functions/rules deployment, Stripe LIVE change, migration or DNS change has occurred.

## Approved release sequence

After explicit Founder approval only: push candidate, merge through the approved release path, deploy production, then immediately run the live smoke test.

The first live smoke test is Google Sign-In: account selection → Firebase callback → non-null current user → session restore → logout.

If any Google Sign-In step fails, stop testing and immediately restore the pre-release production commit. Do not debug Auth in production.

## Coherent rollback

- Roll back Hosting client assets, build identity, service-worker cache and CSP headers together.
- Roll back Functions, Firestore rules, Storage rules, App Check and Stripe webhook configuration as separate versioned operations where they were changed by the release.
- Do not delete bookkeeping data during a downgrade, cancellation, refund or source rollback.
- Stripe rollback never creates or changes VAT registration and must not touch unrelated accounts or LIVE objects outside the approved TaxMate release.
- `taxmate-staging` is not deleted as part of production rollback; the Founder will decide its later retention separately.

Offline/source recovery remains available from the production baseline bundle and source archive under `evidence/w0/`, or by checking out commit `745f7497d374f000870c4a7a111130008f8945a7`.
