# LIVE Billing and Founder Promo Report

Status captured on 20 August 2026. No secret value is included in this report.

## Stripe LIVE identity and objects

- TaxMate account: `acct_1U6Gd2Q2jZLVx6pg` — verified independently from ToodaLoop.
- Free: `prod_V6kCtAzaQBbRyB`, GBP £0 monthly.
- Plus product `prod_V6kCnxpbHlunTE`: `price_1U6Wi4Q2jZLVx6pgFbTCmjV3` at GBP £3.99 recurring monthly; `price_1U6ZfnQ2jZLVx6pgNCCfs5Cg` at GBP £29.99 recurring yearly.
- Pro product `prod_V6kCPUudWfPLi8`: `price_1U6ZgaQ2jZLVx6pgi7dHPBeO` at GBP £7.99 recurring monthly; `price_1U6ZgtQ2jZLVx6pgOeS7cRYl` at GBP £59.99 recurring yearly.
- Legacy Pro monthly: `price_1U6WiHQ2jZLVx6pgJWYXlwHv` at GBP £8.49 is archived from new sales while remaining recognised as historical entitlement for any existing subscriber.
- Stripe Tax: off; checkout tax is £0.
- LIVE webhook destination: `we_1U6YWGQ2jZLVx6pguMI5xgI5`, active, production `taxmate-uk-2` Functions URL, seven required billing lifecycle events only.
- `STRIPE_WEBHOOK_SECRET` and the rotated replacement `STRIPE_SECRET_KEY` are stored as enabled Secret Manager version 1 in `taxmate-uk-2`; no value is present in source, frontend, logs or reports.
- The replacement restricted LIVE key retains only Customers, Checkout Sessions and Customer Portal WRITE plus Invoices, Subscriptions and Promotion Codes READ.

Production Functions have not been deployed from this changed candidate. The replacement restricted key and four non-secret LIVE Price parameters are ready, but paid Checkout remains fail-closed until the exact candidate is approved, Functions are deployed and the runtime secret binding passes its release smoke test.

## Founder promo engine

- TaxMate Founder promos are separate from Stripe coupons and Promotion Codes.
- `redeemPromotion` reads only server-side Firestore configuration and no longer binds or queries the Stripe secret.
- Code existence, start, active state, tier, fixed/permanent expiry model, global limit and duplicate UID redemption are checked in one transaction, including a concurrent final-slot gate.
- Redemptions store UID, code, granted tier, redemption time, start, entitlement expiry and `founder_promo` source.
- All paid and Founder grants resolve by tier: any Pro, otherwise any Plus, otherwise Free. Permanent Pro blocks Checkout. Fixed expiry never auto-charges and falls back to the actual remaining tier.
- Firestore rules deny normal clients all reads and writes to promo definitions and redemption truth.
- The IAM-protected command supports `LIST`, `VIEW`, `CREATE`, atomic placeholder migration, `DISABLE`, and specific-redemption `REVOKE` without an app deployment.

Production now contains exactly four active Founder configurations:

- two fixed-expiry Pro campaigns starting 1 September 2026, ending at the exclusive 1 September 2027 boundary, with capacities 100 and 50;
- one fixed-expiry Plus campaign starting 1 September 2026, ending at the exclusive 1 January 2027 boundary, with capacity 500;
- one permanent Pro campaign starting 1 September 2026, with capacity 3.

All four had zero redemptions at configuration verification. The three inactive placeholders were migrated atomically and no longer exist. Exact codes remain backend-only and are intentionally absent from public repository source and reports.
