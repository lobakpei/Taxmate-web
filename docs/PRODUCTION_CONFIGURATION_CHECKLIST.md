# Production Configuration Checklist

Do not perform these actions until Founder release approval. Complete them first in approved isolated staging, then repeat the approved configuration in production with exact identity checks.

## Firebase / Google

- [ ] Create or approve a clearly named isolated TaxMate staging project.
- [ ] Register staging web app and configure Google Sign-In only.
- [ ] Configure staging Auth domain and disposable Google test account.
- [ ] Configure reCAPTCHA Enterprise App Check for the staging preview domain.
- [ ] Deploy candidate Functions, Firestore rules, Storage rules and indexes to staging only.
- [ ] Confirm Functions region `europe-west2`, Firestore region and actual Storage location.
- [ ] Run Google Auth, two-client, receipt, backup, deletion and partnership browser tests.
- [ ] Confirm deployed App Check enforcement and rejected missing/invalid tokens.

## Stripe TEST

- [ ] Use a TaxMate-owned TEST/sandbox account, not another product's sandbox.
- [ ] Create Plus at GBP £3.99 recurring monthly.
- [ ] Create Pro at GBP £8.49 recurring monthly.
- [ ] Confirm no annual launch Price.
- [ ] Decide and configure VAT/Stripe Tax treatment with Founder/accountant approval.
- [ ] Configure Checkout Terms URL, Billing Portal and durable confirmation email.
- [ ] Configure TEST secret and webhook secret through secure service configuration.
- [ ] Create disposable Plus and Pro promotion fixtures with documented duration/expiry.
- [ ] Decide refund-to-entitlement behaviour.
- [ ] Verify checkout, failure, duplicate webhook, cancellation, period end, expiry, downgrade, promotion and refund paths.

## Telemetry

- [ ] Create/access a staging-only GA4 property and measurement ID.
- [ ] Set GA4 user/event retention to two months; disable Signals, ads linking and unnecessary sharing/location/device collection.
- [ ] Verify no script/request before consent, approved events after consent and stop after withdrawal.
- [ ] Create/access staging-only Sentry project and DSN.
- [ ] Select a short Sentry retention period and inspect an actual received synthetic event.

## Release controls

- [ ] Confirm the ICO public register shows the actioned non-residential/alternative correspondence address.
- [ ] Confirm final consumer/business-user, VAT and refund decisions.
- [ ] Re-run all local and external staging gates at the exact final commit.
- [ ] Verify production `main`, target branch, commit, tree and diff immediately before push/PR.
- [ ] Obtain explicit Founder instruction: `批准發佈`.
