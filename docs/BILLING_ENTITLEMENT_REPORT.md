# Billing and Entitlement Report

Free remains permanent. Plus and Pro access resolves only from `users/{uid}/entitlements/current`, a client-read/server-write document. A local `tier`, `pro` or legacy trial flag cannot unlock paid features.

Founder-approved launch pricing is Free £0, Plus £3.99 per month and Pro £8.49 per month. Launch billing is monthly only; no annual plan is offered.

An isolated TaxMate Stripe TEST sandbox now contains exact GBP monthly products/prices and controlled Plus/Pro promotion fixtures. Real TEST API integration passed server-priced hosted Checkout session creation, mandatory Terms acceptance, cancel/expiry, one-customer reuse, duplicate subscription prevention, direct promotion tier/duration/duplicate/inactive checks, active subscription and cancellation lifecycle, declined-card no-unlock behavior, signed webhook processing, event idempotency and out-of-order protection. Stripe object IDs and complete evidence are in `STAGING_EXTERNAL_SERVICE_REPORT.md`.

The Firebase Functions candidate enforces App Check outside emulators and authentication for Checkout, Billing Portal and promotion redemption. Stripe price IDs and secrets remain server parameters/secrets. Checkout rejects an existing non-ended subscription and directs it to Billing Portal management. Active/trialing Stripe subscriptions win; promotions are distinct; cancellation/expiry falls to Free while user records remain. Offline entitlement cache fails closed after 72 hours.

Account deletion removes UID-linked promotion-redemption records and attempts Stripe customer cleanup before deleting personal cloud data and Auth identity. Partnership shared records are retained only while another member remains.

Not yet complete: no candidate Function/webhook has been deployed; hosted card form completion requires a separately approved TEST transaction; Stripe Tax is pending because head-office/tax behaviour is unset; and refund-to-entitlement behavior is a Founder/legal/accountant decision. No Stripe LIVE object or payment was created.
