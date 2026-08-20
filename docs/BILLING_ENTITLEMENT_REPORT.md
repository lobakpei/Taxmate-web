# Billing and Entitlement Report

Free remains permanent. Plus and Pro access resolves only from `users/{uid}/entitlements/current`, a client-read/server-write document. A local `tier`, `pro` or legacy trial flag cannot unlock paid features.

Founder-approved pricing is Free £0; Plus £3.99/month or £29.99/year; and Pro £7.99/month or £59.99/year. Monthly and yearly are recurring subscriptions. The independent TaxMate Stripe account contains matching TEST and LIVE Price objects with strict mode separation. Stripe Tax is off and TaxMate does not add VAT at checkout.

Checkout is server-priced, requires Terms acceptance outside the local emulator, rejects a second non-ended subscription and uses Billing Portal for management. Active/trialing Stripe subscriptions win. Ordinary cancellation preserves paid entitlement until the selected monthly or yearly period end; full refund ends the refunded paid entitlement immediately; partial refund enters manual review. Existing monthly subscriptions are recognised as monthly and are never auto-migrated. These access transitions never delete bookkeeping data.

Founder free-access promo codes are separate from Stripe discounts. The callable reads canonical `founderPromotions/{code}` configuration in Firestore and transactionally checks active state, Plus/Pro tier, one valid expiry model, global redemption limit and duplicate UID redemption. `promotionRedemptions` preserves the user UID, code, granted tier, redemption time and entitlement expiry. The entitlement document can retain multiple active grants; after paid access ends, the highest valid Founder promo applies, then another valid promo, then Free.

Normal clients cannot read or write Founder promo definitions or redemption truth. The non-public admin command is protected by the authenticated Firebase CLI identity and Google Cloud IAM, and supports create, disable and exact-code status without an app release. Operational instructions are in `docs/FOUNDER_PROMO_OPERATIONS.md`.

The production webhook is active and its signing secret is stored in `taxmate-uk-2` Secret Manager. The approved restricted LIVE key exists and is unused, but its one-time value was not retained. `STRIPE_SECRET_KEY` is therefore not yet stored; rotation of that exact unused key requires Founder confirmation. No changed production Functions were deployed, so paid Checkout remains fail-closed rather than falling back to TEST credentials or client unlock.
