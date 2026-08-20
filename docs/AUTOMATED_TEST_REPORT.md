# TaxMate Final Automated Test Report

Closeout date: 20 August 2026. Build: `2026-08-20.live-auth-restored-rc.12`.

## Full repository gate

Command: `npm run test:all`.

- characterization: 4/4;
- unit: 97/97;
- integration: 5/5;
- static Firestore/Storage rules: 5/5;
- Firestore/Storage Emulator Suite: 11/11;
- Auth/Functions Emulator Suite: 5/5.

Total: **127/127 PASS**.

## Focused closeout gate

Stripe server invariants and entitlement, SEO and HTTP preview, enforcing CSP, legal/runtime alignment, GA4 minimisation, Sentry minimisation, deletion consistency, Google-only Auth surface and public private-information/secret scan: **30/30 PASS**.

Correct-account Stripe delta: four genuine hosted TEST Checkouts passed for Plus £3.99/month and £29.99/year and Pro £7.99/month and £59.99/year. A signed-webhook delta gate passed 1/1 for exact amount, GBP, zero tax, subscription interval, immediate entitlement, annual cancel-at-period-end, annual period end and Founder-promo fallback. Because shared lifecycle code changed, the generic Sandbox checkout/promotion/cancellation/refund/signature/idempotency/out-of-order gate was rerun and passed 1/1.

RC.12 restores the service-worker install, activation and fetch behavior of Founder-confirmed known-good live production while retaining the candidate offline shell. The Google provider, popup, persistence and callback implementation remains behavior-equivalent to live, with Apple Sign-In absent. The current Functions Emulator delta passed 5/5; the prior correct-account hosted Sandbox receipts remain frozen and were not recreated. No popup/staging OAuth test is part of this gate.

`git diff --check` and final clean-working-tree verification are recorded in the Founder handoff. Production was not deployed.
