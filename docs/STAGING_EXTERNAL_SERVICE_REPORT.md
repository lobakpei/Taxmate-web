# Existing Services and Isolated Sandbox Verification

## Verification date — 19 August 2026

Production was not used as a staging substitute. No production Firebase setting, Stripe LIVE object or production deployment was changed. A persistent non-production project, `taxmate-staging`, was created with test data only. No push or merge occurred.

### Isolated TaxMate Firebase staging

- Project `taxmate-staging` (project number `308981292791`) and Web app `TaxMate Staging Web` are retained for future releases.
- Firestore Native/Standard was created in `europe-west2` with deletion protection. Candidate Firestore rules and indexes deployed successfully.
- Google is the only enabled sign-in provider. Apple and all other providers remain disabled.
- A staging-only reCAPTCHA Enterprise key restricted to the two Firebase Hosting staging domains was created and registered with App Check.
- Candidate Hosting deployed to `https://taxmate-staging.web.app`; exact-host runtime selection prevents staging from selecting production Firebase configuration. The deployed preview remains build `2026-08-19.seo-implementation-rc.5`, while the newer local Stripe candidate is `2026-08-19.stripe-sandbox-rc.6`. The deployed build passed the in-page audit 29/29 with zero fail/warn and returned `X-Robots-Tag: noindex, nofollow, noarchive` on the homepage, Help and real 404 response.
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

A new root Dashboard navigation and account-switcher inspection resolved the independent `taxmate` parent account, then the isolated `taxmate sandbox` account. Neither ToodaLoop nor LIVE mode was entered. Canonical Free, Plus and Pro products/prices and Plus/Pro/expired promotion fixtures were created in that Sandbox only; exact non-secret IDs are recorded in `STRIPE_SANDBOX_REPORT.md`.

Real Stripe-hosted TEST Checkouts completed for Plus £3.99 and Pro £8.49. Both were GBP monthly, paid, tax £0 and automatic tax disabled. Actual Stripe completion, subscription, cancellation and refund events were signed and delivered to the candidate webhook in Emulator Suite. Promotion redemption, duplicate delivery, out-of-order safety, cancellation-at-period-end, immediate cancellation, declined test payment, partial-refund manual review, full-refund removal, active-promotion fallback and bookkeeping-data preservation passed.

The real refund receipt exposed a current Stripe API shape change: the invoice relationship is now resolved through Invoice Payments when a refunded Charge has only a PaymentIntent. The candidate webhook was fixed and the lifecycle gate rerun successfully. No secret is stored in the repository and the account-specific wrong-account reference scan remains zero.

The Sandbox public-details editor redirects incorrectly and its API refuses self-account profile updates. Stripe therefore still rejects the exact candidate callable Checkout creation with Terms consent until a Terms URL is present. LIVE profile settings were not changed. A persistent webhook destination also awaits deployed staging Functions; actual events were validated against the exact local candidate endpoint instead.

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
| Stripe account identity | PASS | Independent `taxmate` parent and `taxmate sandbox` re-read from fresh Dashboard navigation |
| Stripe TEST objects and server lifecycle | PASS | Canonical products/prices/promotions plus actual event lifecycle; persistent remote webhook awaits staging Functions |
| Hosted Checkout card completion | PASS | Correct-account Plus £3.99 and Pro £8.49 TEST receipts |
| VAT / Stripe Tax | PASS | Both receipts tax £0 with automatic tax disabled; no VAT/Tax registration created |
| Refund entitlement | PASS | Real partial/full TEST refunds and signed candidate webhook projection passed |
| GA4 received delivery | PASS | Fresh Realtime `upgrade_viewed` receipt and parameter drill-down observed |
| GA4 provider privacy settings | PASS | Enhanced Measurement, sharing/signals, granular collection and ads personalisation off; redaction and two-month retention configured |
| Sentry received payload | PASS_WITH_METADATA | Fresh `TAXMATE-9` proves scrubbed bookkeeping payload; trace and coarse provider-derived geography remain |
| Sentry provider privacy settings | PASS_WITH_LIMITATION | Server/default scrubbers, raw-IP prevention, sensitive fields and Enhanced Privacy on; 30-day plan lookback; coarse geography persists |

No production deployment, data migration or live billing configuration was changed or used as a substitute. Remaining staging blockers are Blaze-controlled Functions/Storage and the resulting real cloud receipt/App Check callable path.
