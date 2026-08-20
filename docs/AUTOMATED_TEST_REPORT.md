# TaxMate Final Automated Test Report

Closeout date: 20 August 2026. Build: `2026-08-20.annual-billing-rc.9`.

## Full repository gate

Command: `npm run test:all`.

- characterization: 4/4;
- unit: 91/91;
- integration: 5/5;
- static Firestore/Storage rules: 5/5;
- Firestore/Storage Emulator Suite: 11/11;
- Auth/Functions Emulator Suite: 4/4.

Total: **120/120 PASS**.

## Focused closeout gate

Stripe server invariants and entitlement, SEO and HTTP preview, enforcing CSP, legal/runtime alignment, GA4 minimisation, Sentry minimisation, deletion consistency, Google-only Auth surface and public private-information/secret scan: **30/30 PASS**.

Correct-account Stripe delta: four genuine hosted TEST Checkouts passed for Plus £3.99/month and £29.99/year and Pro £7.99/month and £59.99/year. A signed-webhook delta gate passed 1/1 for exact amount, GBP, zero tax, subscription interval, immediate entitlement, annual cancel-at-period-end, annual period end and Founder-promo fallback. Because shared lifecycle code changed, the generic Sandbox checkout/promotion/cancellation/refund/signature/idempotency/out-of-order gate was rerun and passed 1/1.

`git diff --check` and final clean-working-tree verification are recorded in the Founder handoff. Production was not deployed.
