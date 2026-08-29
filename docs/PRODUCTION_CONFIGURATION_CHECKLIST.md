# Production Configuration Checklist

> **SUPERSEDED HISTORICAL EVIDENCE — NOT CURRENT CONTRACT TRUTH.** This report records the earlier release state and its then-valid £7.99/month / £59.99/year Pro evidence. Founder superseded that commercial contract on 29 August 2026 with launch £9.99/month, standard £11.99/month and £99.99/year. The historical evidence below is preserved unchanged and must not be used by a current pricing gate.

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
- [x] Confirm Plus at GBP £3.99 recurring monthly and £29.99 recurring yearly.
- [x] Confirm Pro at GBP £7.99 recurring monthly and £59.99 recurring yearly.
- [x] Archive the former Pro £8.49 monthly Price from new sales while recognising it for historical subscriber entitlement.
- [x] Configure Founder-approved launch treatment: Stripe Tax off, no VAT added/invoiced and no VAT registration created.
- [ ] Configure Checkout Terms URL, Billing Portal and durable confirmation email.
- [ ] Configure TEST secret and webhook secret through secure service configuration.
- [ ] Create disposable Plus and Pro TEST promotion fixtures with documented duration/expiry in the independent TaxMate account only.
- [x] Encode Founder-approved refund-to-entitlement behaviour.
- [ ] Verify checkout, failure, duplicate webhook, cancellation, period end, expiry, downgrade, promotion, partial-review and full-refund paths in the correct-account TEST environment.

## Telemetry

- [ ] Create/access a staging-only GA4 property and measurement ID.
- [ ] Set GA4 user/event retention to two months; disable Signals, ads linking and unnecessary sharing/location/device collection.
- [ ] Verify no script/request before consent, approved events after consent and stop after withdrawal.
- [ ] Create/access staging-only Sentry project and DSN.
- [ ] Select a short Sentry retention period and inspect an actual received synthetic event.

## Stripe LIVE and Founder promo

- [x] Verify the independent TaxMate LIVE account identity.
- [x] Create Free £0; Plus £3.99/month and £29.99/year; Pro £7.99/month and £59.99/year; keep Stripe Tax off.
- [x] Create the production webhook for the seven required billing lifecycle events.
- [x] Store the webhook signing secret only as `STRIPE_WEBHOOK_SECRET` in `taxmate-uk-2` Secret Manager.
- [x] Rotate the exact never-used restricted key after Founder confirmation and store its replacement only as enabled `STRIPE_SECRET_KEY` version 1.
- [x] Supply the four non-secret LIVE Price IDs and legacy Pro Price allowlist in the deterministic `functions/.env.taxmate-uk-2` production configuration.
- [ ] Deploy the exact newly approved Functions candidate and run fail-closed LIVE API smoke checks without a real card or charge.
- [x] Atomically migrate the three unused pending placeholders and create the fourth campaign so production contains exactly the four Founder-approved fixed/permanent configurations.
- [x] Verify authorised LIST/VIEW/CREATE/DISABLE/specific-REVOKE admin paths and transactional capacity accounting in automated tests.
- [x] Verify normal clients cannot enumerate promo definitions or write entitlement truth.

## Release controls

- [ ] Confirm the ICO public register shows the actioned non-residential/alternative correspondence address.
- [ ] Confirm final consumer/business-user legal judgement. VAT and refund product decisions are recorded and technically verified.
- [ ] Re-run all local and external staging gates at the exact final commit.
- [ ] Verify production `main`, target branch, commit, tree and diff immediately before push/PR.
- [ ] Obtain explicit Founder instruction: `批准發佈`.
