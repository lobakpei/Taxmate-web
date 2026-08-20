# Billing and Entitlement Report

Free remains permanent. Plus and Pro access resolves only from `users/{uid}/entitlements/current`, a client-read/server-write document. A local `tier`, `pro` or legacy trial flag cannot unlock paid features.

Founder-approved launch pricing is Free £0, Plus £3.99 per month and Pro £8.49 per month. Launch billing is monthly only; no annual plan is offered.

Correct-account Stripe Sandbox validation is blocked. A fresh Dashboard context still resolved to the wrong parent account, so the stop rule was applied before any Stripe mutation. All earlier account-specific IDs and external receipts were invalidated and removed from the candidate. The harness now requires environment-injected identities and verifies the TEST key resolves to the exact independent TaxMate account before running.

The Firebase Functions candidate enforces App Check outside emulators and authentication for Checkout, Billing Portal and promotion redemption. Stripe price IDs and secrets remain server parameters/secrets. Checkout rejects an existing non-ended subscription and directs it to Billing Portal management. Active/trialing Stripe subscriptions win; promotions are distinct; cancellation/expiry falls to Free while user records remain. Offline entitlement cache fails closed after 72 hours.

Account deletion removes UID-linked promotion-redemption records and attempts Stripe customer cleanup before deleting personal cloud data and Auth identity. Partnership shared records are retained only while another member remains.

Source and Emulator Suite checks confirm that Checkout explicitly disables Stripe Tax; full refunds immediately end the refunded paid entitlement with active-promotion fallback; partial refunds preserve entitlement and enter manual review; and downgrade/refund does not delete bookkeeping data. These checks are not substituted for the still-required correct-account hosted TEST Checkout and webhook receipt. Candidate Functions also remain undeployed because the isolated staging project requires Founder-authorised Blaze billing. No Stripe LIVE object or payment was created.
