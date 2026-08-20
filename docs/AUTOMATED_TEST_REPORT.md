# TaxMate Final Automated Test Report

Closeout date: 20 August 2026. Build: `2026-08-20.google-only-auth-recovery-rc.11`.

## Full repository gate

Command: `npm run test:all`.

- characterization: 4/4;
- unit: 101/101;
- integration: 5/5;
- static Firestore/Storage rules: 5/5;
- Firestore/Storage Emulator Suite: 11/11;
- Auth/Functions Emulator Suite: 5/5.

Total: **131/131 PASS**.

## Focused closeout gate

Stripe server invariants and entitlement, SEO and HTTP preview, enforcing CSP, legal/runtime alignment, GA4 minimisation, Sentry minimisation, deletion consistency, Google-only Auth surface and public private-information/secret scan: **30/30 PASS**.

Correct-account Stripe delta: four genuine hosted TEST Checkouts passed for Plus £3.99/month and £29.99/year and Pro £7.99/month and £59.99/year. A signed-webhook delta gate passed 1/1 for exact amount, GBP, zero tax, subscription interval, immediate entitlement, annual cancel-at-period-end, annual period end and Founder-promo fallback. Because shared lifecycle code changed, the generic Sandbox checkout/promotion/cancellation/refund/signature/idempotency/out-of-order gate was rerun and passed 1/1.

RC.11 preserves all RC.10 billing/promotion behavior and adds four Google-only Auth recovery invariants. The production service worker now bypasses Firebase Hosting's reserved `/__/` namespace before `respondWith`, so the Google popup callback is handled by Firebase rather than the TaxMate app shell. The current Functions Emulator delta passed 5/5; the prior RC.9 correct-account hosted Sandbox receipts remain frozen and were not recreated. The current browser audit passed 29/29 with zero fail/warn.

`git diff --check` and final clean-working-tree verification are recorded in the Founder handoff. Production was not deployed.
