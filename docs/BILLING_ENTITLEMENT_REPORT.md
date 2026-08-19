# Billing and Entitlement Report

Free remains permanent. Plus and Pro access now resolves only from `users/{uid}/entitlements/current`, a client-read/server-write document. A local `tier`, `pro` or legacy trial flag cannot unlock paid features.

Founder-approved launch pricing is Free £0, Plus £3.99 per month and Pro £8.49 per month. Launch billing is monthly only; no annual plan is offered. The displayed plan copy and Terms use those values, but deployment still requires matching Stripe TEST and production price objects.

The Firebase Functions candidate provides authenticated Stripe Checkout, Billing Portal, signed webhook projection, promotion redemption and account deletion. Checkout now requires acceptance of the configured Terms URL. Stripe price IDs and secrets are parameters/secrets, never repository or client values. Promotion codes must exist and be active in Stripe and have server-controlled `taxmate_tier` and `taxmate_free_days` metadata; one UID/code redemption is transactional.

Active/trialing Stripe subscriptions win, promotions are a distinct source, payment-retry grace is distinct, cancellation/expiry falls to Free, and user records are retained. Offline entitlement cache is accepted for at most 72 hours and otherwise fails closed to Free. Cross-device restore reads the server document after sign-in.

Account deletion now removes UID-linked promotion-redemption records, requests receipt and Stripe customer cleanup without silently claiming success on failure, removes the personal tree, and applies explicit partnership last-member/remaining-member behavior.

No Stripe secret, price object, webhook or Function was configured or deployed in this programme. Paid buttons therefore fail safely in the local Founder Preview and do not change access. Deployment requires Stripe TEST price objects matching £3.99/month Plus and £8.49/month Pro, a valid Terms URL, VAT/tax confirmation, durable confirmation, cancellation/cooling-off review, secret injection, webhook registration and sandbox acceptance before any live release.
