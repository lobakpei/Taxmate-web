# Billing and Entitlement Report

Free remains permanent. Plus and Pro access now resolves only from `users/{uid}/entitlements/current`, a client-read/server-write document. A local `tier`, `pro` or legacy trial flag cannot unlock paid features.

The Firebase Functions candidate provides authenticated Stripe Checkout, Billing Portal, signed webhook projection, promotion redemption and account deletion. Stripe price IDs and secrets are parameters/secrets, never repository or client values. Promotion codes must exist and be active in Stripe and have server-controlled `taxmate_tier` and `taxmate_free_days` metadata; one UID/code redemption is transactional.

Active/trialing Stripe subscriptions win, promotions are a distinct source, payment-retry grace is distinct, cancellation/expiry falls to Free, and user records are retained. Offline entitlement cache is accepted for at most 72 hours and otherwise fails closed to Free. Cross-device restore reads the server document after sign-in.

No Stripe secret, price, webhook or Function was configured or deployed in this programme. Paid buttons therefore fail safely in the local Founder Preview and do not change access. Deployment requires Stripe account configuration, secret injection, webhook registration, price IDs and sandbox acceptance before any live release.
