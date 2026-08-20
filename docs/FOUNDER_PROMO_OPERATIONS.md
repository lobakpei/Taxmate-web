# Founder Promo Operations

TaxMate Founder promos grant time-limited Plus or Pro access without Stripe Checkout, a payment method or a paid subscription. Firestore and the backend callable are canonical; client storage cannot create entitlement.

The admin command is deliberately not exposed in the app. It uses the locally authenticated Firebase CLI identity and Google Cloud IAM for the fixed production project `taxmate-uk-2`. Grant that project access only to Founder-authorised operators. The command has no operation for listing all codes.

## Commands

Initialize the three Founder-approved names as inactive placeholders without inventing entitlement values:

```powershell
npm run promo:admin -- init-pending
```

Create a duration-based code, or complete an unused pending placeholder:

```powershell
npm run promo:admin -- create --code SAMPLECODE --tier pro --duration-days 90 --max-redemptions 20
```

Alternatively, use one fixed entitlement expiry:

```powershell
npm run promo:admin -- create --code SAMPLECODE --tier plus --expires-at 2026-12-31T23:59:59Z --max-redemptions 20
```

View one exact code without enumerating the collection:

```powershell
npm run promo:admin -- status --code SAMPLECODE
```

Disable future redemption without removing entitlements already granted:

```powershell
npm run promo:admin -- disable --code SAMPLECODE
```

`create` requires exactly one of `--duration-days` or `--expires-at`. Tier is restricted to `plus` or `pro`; duration and maximum redemption values are bounded. Duplicate redemption by the same UID and global redemption-count races are rejected transactionally.

At runtime, an active paid Stripe entitlement wins. Otherwise the highest valid Founder promo applies; when it expires, another valid Founder promo can apply, otherwise the account falls back to Free. None of these transitions deletes bookkeeping or receipt data.
