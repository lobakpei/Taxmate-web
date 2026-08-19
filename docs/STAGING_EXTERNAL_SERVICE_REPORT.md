# Existing Services and Isolated Sandbox Verification

## Verification date — 19 August 2026

Production was not used as a staging substitute. No production Firebase setting, Stripe LIVE object or production deployment was changed. A persistent non-production project, `taxmate-staging`, was created with test data only. No push or merge occurred.

### Isolated TaxMate Firebase staging

- Project `taxmate-staging` (project number `308981292791`) and Web app `TaxMate Staging Web` are retained for future releases.
- Firestore Native/Standard was created in `europe-west2` with deletion protection. Candidate Firestore rules and indexes deployed successfully.
- Google is the only enabled sign-in provider. Apple and all other providers remain disabled.
- A staging-only reCAPTCHA Enterprise key restricted to the two Firebase Hosting staging domains was created and registered with App Check.
- Candidate Hosting deployed to `https://taxmate-staging.web.app`; exact-host runtime selection prevents staging from selecting production Firebase configuration. The final deployment exposed build `2026-08-19.production-readiness-rc.4`, cache `taxmate-v2-rc-1-production-readiness-rc-4`, and passed the in-page audit 29/29 with zero fail/warn.
- The in-app-browser Google popup returned Firebase `auth/internal-error`; Firestore then operated offline. This is not reported as a successful sign-in/cloud-sync receipt.
- Firebase refused Functions deployment and Storage initialisation until Blaze is enabled. No billing account was linked and no paid plan was accepted. This is the minimum remaining Founder-controlled setup.

### Existing TaxMate Google/Firebase resources

- Firebase CLI is authenticated as the authorised workspace account and resolves the repository default to `taxmate-uk-2`.
- Web app `taxmate-web` exists with app ID `1:995936701479:web:ed61c51a65e61aa1d21202`; Hosting exists at the matching Firebase site.
- Repository client configuration matches project number `995936701479`, the Web app, Storage bucket and `europe-west2` Functions URLs.
- Firestore is Native mode in `europe-west2`. Storage is in `US-CENTRAL1` with seven-day soft delete.
- App Check registration exists. Firestore and Storage enforcement are enabled; Auth enforcement is not enabled. No debug token was present.
- Google is configured as an authentication provider: the Identity Toolkit provider-discovery request from `https://taxmate.uk/` returned `google.com` and an OAuth authorisation URI. Apple is absent by design.
- The Cloud Functions API for `taxmate-uk-2` is disabled/not previously used. Therefore the candidate Functions are not deployed, despite the repository containing Functions code. Production was not enabled or deployed as part of this audit.
- The in-app Firebase Console session is signed in as a different Google account without project access. CLI/API evidence above is authoritative for configuration; an end-to-end browser Google login was not performed.

### TaxMate Stripe TEST sandbox

An empty, isolated `TaxMate` sandbox was created under the existing provider account. The pre-existing `toodaloop sandbox` was not modified. Sandbox account: `acct_1U671tDl7HCNqvcV` (`livemode:false`).

| Tier | Product | Monthly Price | Amount |
|---|---|---|---:|
| Free | `prod_V6JfalYbsiQocA` | `price_1U672UDl7HCNqvcVlXulcEe8` | GBP 0.00 |
| Plus | `prod_V6JgZRBvRd6EjS` | `price_1U673BDl7HCNqvcVgMV17BxO` | GBP 3.99 |
| Pro | `prod_V6JhhSUJ2VxVIo` | `price_1U673zDl7HCNqvcVI2CIiX6w` | GBP 8.49 |

Only monthly recurring prices exist for launch. Checkout public URLs point to the TaxMate site, Privacy Policy, Terms and `support@taxmate.uk`; telephone display was disabled. Stripe-generated fake sandbox identity/address data remains test placeholder data and is not treated as Founder business truth.

Promotion fixtures are TEST-only:

- `TAXMATEPLUS30` / `promo_1U678eDl7HCNqvcVZUp8H9eh`: Plus, 30 days;
- `TAXMATEPRO90` / `promo_1U678eDl7HCNqvcVsnI1rCJd`: Pro, 90 days;
- `TAXMATEEXPIRED` / `promo_1U67SBDl7HCNqvcVCn5XvDLc`: inactive expiry fixture.

`npm run test:stripe:sandbox` passed against real Stripe TEST APIs plus isolated local Auth/Firestore/Functions emulators. It verified server-selected Plus/Pro prices, hosted Checkout session creation, Terms acceptance requirement, cancel URL/session expiry, customer reuse, active and invalid/inactive promotion handling, one-UID redemption, real TEST subscription creation, webhook-driven Pro entitlement, duplicate-subscription blocking, period-end cancellation, immediate cancellation to Free, declined-card rejection with no unlock, signed webhook validation, duplicate event idempotency and out-of-order event protection. Generated customers/subscriptions were removed; one orphan from an earlier failed run was explicitly deleted.

Founder launch policy is encoded: Checkout sets `automatic_tax.enabled=false`; the completed hosted payment recorded GBP 849 with tax 0; no VAT registration was created. Full-refund, partial-refund and cancellation projections are server-owned and covered by signed webhook integration tests.

A real hosted TEST Checkout completed with Stripe's test card for Pro at exactly £8.49. The actual `checkout.session.completed` event was retrieved from Stripe, re-signed for the local candidate webhook, accepted by the Functions emulator and projected an active Pro entitlement. The TEST payment was then fully refunded for £8.49 and its subscription cancelled; Stripe reported refund `succeeded` and subscription `canceled`. Plus and Pro server-created sessions remained exactly GBP 399/849, monthly, with Stripe Tax off and no dynamically supplied client price.

### Other external services

- GA4 Measurement ID `G-W1WWK7EVTR` matches existing property `541961931`, Web stream `15084238688`. Enhanced Measurement is off; email and 18 query-key redactions are on; event/user retention is two months with activity reset off; all account data-sharing choices, Google Signals, user-provided data, granular location/device collection and advertising personalisation are off. A declarative consent-action defect was fixed and regression-tested. A new `upgrade_viewed` then appeared in Realtime with one count; drill-down showed `app_surface`, GA automatic fields and `client_storage=none`, with no bookkeeping values or identity fields.
- The existing EU Sentry project (`o4511574896541696`, project `4511574911549520`) now has server/default scrubbing, raw-IP storage prevention, the defensive sensitive-field list and Enhanced Privacy enabled; anonymous shared issues are disabled. The Developer plan provides a 30-day lookback. Replay is not configured and usage is zero. Fresh issue `TAXMATE-9` stored only `Application error`, structural stack data, level and trace metadata; it had no request, URL/query, referrer, User-Agent, email, breadcrumb or bookkeeping fields. Sentry still derived coarse geography despite raw-IP storage prevention. An older production event predating the candidate retains excessive request/user fields, so the undeployed candidate does not remediate production yet.

### Gate classification

| Surface | Status | Evidence / remaining minimum state |
|---|---|---|
| Existing Firebase/Web app/Hosting | PASS | Read-only CLI/API identity match |
| Google provider configuration | PASS | Provider discovery succeeds; full browser login NOT_TESTED |
| App Check configuration | PASS | Registration present; Firestore/Storage enforced, Auth unenforced |
| Candidate deployed Functions | FAIL | Cloud Functions API disabled; production deployment prohibited |
| Rules, receipts, deletion and two-client behavior | PASS | 11/11 rules/Storage emulator plus 3/3 Auth/Functions emulator |
| Real cloud receipt/full-ZIP restore | BLOCKED | Requires approved non-production Firebase deployment and disposable account |
| Stripe TEST objects and server lifecycle | PASS | Isolated TaxMate sandbox and real TEST API integration pass |
| Hosted Checkout card completion | PASS | Real hosted Pro TEST Checkout paid £8.49 and reached backend Pro entitlement |
| VAT / Stripe Tax | PASS | Stripe Tax off; tax 0; no VAT registration; exact final monthly prices |
| Refund entitlement | PASS | Cancellation, full refund, promotion fallback and partial-refund manual review are server-tested |
| GA4 received delivery | PASS | Fresh Realtime `upgrade_viewed` receipt and parameter drill-down observed |
| GA4 provider privacy settings | PASS | Enhanced Measurement, sharing/signals, granular collection and ads personalisation off; redaction and two-month retention configured |
| Sentry received payload | PASS_WITH_METADATA | Fresh `TAXMATE-9` proves scrubbed bookkeeping payload; trace and coarse provider-derived geography remain |
| Sentry provider privacy settings | PASS_WITH_LIMITATION | Server/default scrubbers, raw-IP prevention, sensitive fields and Enhanced Privacy on; 30-day plan lookback; coarse geography persists |

No production deployment, data migration or live billing configuration was changed or used as a substitute. Remaining staging blockers are Blaze-controlled Functions/Storage and the resulting real cloud receipt/App Check callable path.
