# Existing Services and Isolated Sandbox Verification

## Verification date — 19 August 2026

Production was not used as a staging substitute. No Firebase, Hosting, GA4, Sentry or Stripe LIVE deployment/configuration was changed. No push or merge occurred.

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

Stripe Tax is `pending` because `head_office` is missing, and all three prices have unspecified tax behaviour. Refund-to-entitlement handling is intentionally not invented. VAT/tax and refund policy remain Founder/accountant decisions.

### Other external services

- GA4 Measurement ID `G-W1WWK7EVTR` matches existing property `541961931`, Web stream `15084238688`. With explicit Founder approval, DebugView received one non-sensitive `upgrade_viewed` test event with `client_storage=none`, `debug_mode` and allow-listed `app_surface`. Enhanced Measurement remains enabled and URL query-parameter masking remains disabled; no provider setting was changed.
- The existing EU Sentry project (`o4511574896541696`, project `4511574911549520`) received one synthetic exception as `TAXMATE-8`. Candidate scrubbing replaced the message with `Application error` and removed request, query, referrer, User-Agent, email, breadcrumb and bookkeeping fields. Sentry still added trace metadata and coarse provider-derived geography. An older production event predating the candidate retains request/URL-query/referrer/User-Agent/User fields, so the undeployed candidate does not remediate production yet. A missing CSP allow-list for the second-stage SDK bundle and exact EU ingestion host was corrected and regression-tested.

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
| Hosted Checkout card completion | BLOCKED_CONFIRMATION | Requires action-time approval for a TEST financial transaction in the browser |
| VAT / Stripe Tax | BLOCKED_FOUNDER_INPUT | Head office, registration/tax behaviour and price presentation decision |
| Refund entitlement | BLOCKED_FOUNDER_INPUT | Commercial/legal behavior not yet specified |
| GA4 received delivery | PASS | One approved `upgrade_viewed` event visible in the correct DebugView |
| GA4 provider privacy settings | BLOCKED_REVIEW | Enhanced Measurement on; URL query masking off; retention/sharing settings still require review |
| Sentry received payload | PASS_WITH_METADATA | `TAXMATE-8` proves scrubbed bookkeeping payload; trace and coarse geography remain provider metadata |
| Sentry provider privacy settings | BLOCKED_REVIEW | Retention and IP/geolocation processing settings remain unverified |

No production service was changed or used as a substitute for missing staging isolation.
