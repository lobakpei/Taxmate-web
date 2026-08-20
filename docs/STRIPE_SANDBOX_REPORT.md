# TaxMate Correct-Account Stripe Sandbox Report

Verification date: 19 August 2026. Build: `2026-08-19.stripe-sandbox-rc.6`.

## Identity and isolation

- Fresh Dashboard navigation resolved the independent parent account `taxmate` (`acct_1U6Gd2Q2jZLVx6pg`), not ToodaLoop.
- Work was restricted to `taxmate sandbox` (`acct_1U6GdCL0bYJwhRlm`) and Stripe TEST mode. No LIVE object, real card, real customer or real payment was used.
- No ToodaLoop account or object was opened, changed or deleted. Repository scans contain zero account-specific references from the previous wrong-account sandbox.
- TEST secrets were held only in process memory and are absent from source, config, tests and reports.

## Canonical TEST objects

| Tier | Product | Price | Verified terms |
|---|---|---|---|
| Free | `prod_V6UNrw0u1CiCQh` | `price_1U6HOPL0bYJwhRlmvWSGdPhW` | £0.00 GBP monthly |
| Plus | `prod_V6UOvRXvg4ALAg` | `price_1U6HQBL0bYJwhRlmpOkns65Z` | £3.99 GBP monthly |
| Pro | `prod_V6UPAGq9Yx0e2f` | `price_1U6HQZL0bYJwhRlm1u5hbB7w` | £8.49 GBP monthly |

No annual price was created. Checkout `automatic_tax.enabled` was false and both completed receipts recorded tax £0. No VAT registration or Stripe Tax registration was created.

Promotion fixtures:

- Plus 30-day access: `promo_1U6HY7L0bYJwhRlmfah2RkaX` (`TAXMATEPLUS30`).
- Pro 90-day access: `promo_1U6HY8L0bYJwhRlmdpnsEH9C` (`TAXMATEPRO90`).
- Inactive expiry/rejection fixture: `promo_1U6HY8L0bYJwhRlmaStJVQ8A` (`TAXMATEEXPIRED`).

Tier and duration are server-read metadata. Duplicate redemption is rejected transactionally; the inactive fixture is rejected; promotion expiry resolves to Free unless another valid paid or promotional entitlement exists.

## Hosted Checkout and entitlement receipts

- A real Stripe-hosted TEST Plus Checkout completed for exactly £3.99 GBP and returned to the staging success URL.
- A real Stripe-hosted TEST Pro Checkout completed for exactly £8.49 GBP and returned to the staging success URL.
- Both receipts verified monthly recurrence, the canonical Price ID, tax £0, automatic tax disabled, completed/paid state and server subscription metadata.
- Actual `checkout.session.completed` events were signed and delivered to the candidate webhook in the local Functions/Firestore Emulator Suite. Both produced the correct server entitlement.
- Duplicate webhook delivery was idempotent. A later out-of-order subscription event could not resurrect a fully refunded paid period.
- Real TEST cancellation-at-period-end retained paid access. Immediate cancellation fell back to Free.
- A real partial Plus refund retained Plus and set `manual-review`. Completing the real refund immediately removed paid access; an active Pro promotion became the effective fallback. A seeded bookkeeping record survived both refunds.
- A declined Stripe TEST payment method produced `card_declined` and no entitlement.

During the real refund run, current Stripe API events exposed the invoice relationship through Invoice Payments rather than the legacy direct Charge invoice field. The candidate webhook was updated to resolve the PaymentIntent through `invoicePayments.list`, and the full lifecycle then passed.

## Remaining Stripe/staging limitation

The new Sandbox does not expose a usable public-business-profile editor: Stripe redirects its TEST public-details action to an activation-complete page, while the API refuses self-account profile updates. The candidate callable Checkout still requests explicit Terms consent and Stripe refuses that specific callable session until a Terms URL exists in the account profile. Live profile settings were not changed because this programme authorised Sandbox only.

The independently created hosted TEST receipts therefore validate Stripe Checkout, prices, tax, payments and lifecycle, while the exact candidate callable-creation path remains blocked by the Sandbox Terms-profile limitation. A persistent public webhook destination was not created because candidate staging Functions are not deployed; signed actual Stripe events were instead delivered to the exact candidate webhook under Emulator Suite. Both items require the already-recorded non-production staging Functions/profile setup and must not be tested against production as a substitute.

No push, merge or production deployment occurred.
