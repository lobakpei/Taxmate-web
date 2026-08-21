# Founder Promo Operations

TaxMate Founder promos grant time-limited Plus or Pro access without Stripe Checkout, a payment method or a paid subscription. Firestore and the backend callable are canonical; client storage cannot create entitlement.

The admin command is deliberately not exposed in the app. It uses the locally authenticated Firebase CLI identity and Google Cloud IAM for the fixed production project `taxmate-uk-2`. Grant that project access only to Founder-authorised operators. Normal app users cannot enumerate codes; authorised operators can use the protected `list` command.

## Commands

Initialize the three Founder-approved names as inactive placeholders without inventing entitlement values:

```powershell
npm run promo:admin -- init-pending
```

Create a duration-based code, or complete an unused pending placeholder:

```powershell
npm run promo:admin -- create --code SAMPLECODE --tier pro --starts-at 2026-08-31T23:00:00Z --duration-days 90 --max-redemptions 20
```

Alternatively, use one fixed entitlement expiry:

```powershell
npm run promo:admin -- create --code SAMPLECODE --tier plus --starts-at 2026-08-31T23:00:00Z --expires-at 2027-01-01T00:00:00Z --max-redemptions 20
```

View one exact code without enumerating the collection:

```powershell
npm run promo:admin -- status --code SAMPLECODE
```

Correct the start time of an unused configured code with an update-time precondition:

```powershell
npm run promo:admin -- reschedule --code SAMPLECODE --starts-at 2026-08-20T00:00:00+01:00
```

`reschedule` is rejected after the first redemption. It changes only `startsAt` and the audit timestamp; tier, expiry model, capacity and existing grants cannot be altered by this command.

Disable future redemption without removing entitlements already granted:

```powershell
npm run promo:admin -- disable --code SAMPLECODE
```

`create` requires `--starts-at` and exactly one of `--duration-days`, `--expires-at` or `--permanent true`. Tier is restricted to `plus` or `pro`; duration and maximum redemption values are bounded. Duplicate redemption by the same UID and global redemption-count races are rejected transactionally.

Use `npm run promo:admin -- list` for capacity and `view` for one exact code. Permanent access uses `--permanent true`. `disable` blocks future redemption without changing existing grants; `revoke --code CODE --uid UID` atomically removes one specified grant. At runtime every active paid or Founder entitlement is considered: Pro wins over Plus, and Plus wins over Free. None of these transitions deletes bookkeeping, receipt, partnership or backup data.
