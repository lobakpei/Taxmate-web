# LIVE Billing and Founder Promo Report

Status captured on 20 August 2026. No secret value is included in this report.

## Stripe LIVE identity and objects

- TaxMate account: `acct_1U6Gd2Q2jZLVx6pg` — verified independently from ToodaLoop.
- Free: `prod_V6kCtAzaQBbRyB`, GBP £0 monthly.
- Plus product `prod_V6kCnxpbHlunTE`: `price_1U6Wi4Q2jZLVx6pgFbTCmjV3` at GBP £3.99 recurring monthly; `price_1U6ZfnQ2jZLVx6pgNCCfs5Cg` at GBP £29.99 recurring yearly.
- Pro product `prod_V6kCPUudWfPLi8`: `price_1U6ZgaQ2jZLVx6pgi7dHPBeO` at GBP £7.99 recurring monthly; `price_1U6ZgtQ2jZLVx6pgOeS7cRYl` at GBP £59.99 recurring yearly.
- Legacy Pro monthly: `price_1U6WiHQ2jZLVx6pgJWYXlwHv` at GBP £8.49 remains active only so existing subscribers retain their purchased cadence and entitlement; it is not a new-checkout target.
- Stripe Tax: off; checkout tax is £0.
- LIVE webhook destination: `we_1U6YWGQ2jZLVx6pguMI5xgI5`, active, production `taxmate-uk-2` Functions URL, seven required billing lifecycle events only.
- The webhook signing secret is stored as enabled Secret Manager version 1 under `STRIPE_WEBHOOK_SECRET` in `taxmate-uk-2`.
- A never-used restricted LIVE key named `TaxMate production billing` exists with the six approved permission groups. Its one-time value was not retained; `STRIPE_SECRET_KEY` remains absent until the Founder authorises rotation of that unused key.

Production Functions have not been deployed from this changed candidate. Paid Checkout therefore remains fail-closed until a usable restricted key is stored, the exact candidate is approved, the four non-secret LIVE Price parameters and legacy Pro Price allowlist are supplied, and the approved Functions are deployed.

## Founder promo engine

- TaxMate Founder promos are separate from Stripe coupons and Promotion Codes.
- `redeemPromotion` reads only server-side Firestore configuration and no longer binds or queries the Stripe secret.
- Code existence, active state, tier, expiry model, global limit and duplicate UID redemption are checked in one transaction.
- Redemptions store UID, code, granted tier, redemption time and entitlement expiry.
- Paid Stripe entitlement wins; otherwise the highest active Founder promo wins; expiry falls back to another active promo or Free.
- Firestore rules deny normal clients all reads and writes to promo definitions and redemption truth.
- The IAM-protected command supports `CREATE`, `DISABLE`, and exact-code `STATUS` without a source change or deployment.

Production placeholder records are present and non-redeemable:

- `HKGER` — `INACTIVE_PENDING_FOUNDER_VALUES`
- `EVRI` — `INACTIVE_PENDING_FOUNDER_VALUES`
- `WORCESTER` — `INACTIVE_PENDING_FOUNDER_VALUES`

All three have null tier, duration/expiry and maximum-redemption values, with redemption count zero. No entitlement values were invented.
