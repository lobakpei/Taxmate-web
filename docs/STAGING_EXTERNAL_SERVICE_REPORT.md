# Existing Services and Isolated Sandbox Verification

## Verification date — 19 August 2026

Production was not used as a staging substitute. No production Firebase setting, Stripe LIVE object or production deployment was changed. A persistent non-production project, `taxmate-staging`, was created with test data only. No push or merge occurred.

### Isolated TaxMate Firebase staging

- Project `taxmate-staging` (project number `308981292791`) and Web app `TaxMate Staging Web` are retained for future releases.
- Firestore Native/Standard was created in `europe-west2` with deletion protection. Candidate Firestore rules and indexes deployed successfully.
- Google is the only enabled sign-in provider. Apple and all other providers remain disabled.
- A staging-only reCAPTCHA Enterprise key restricted to the two Firebase Hosting staging domains was created and registered with App Check.
- Candidate Hosting deployed to `https://taxmate-staging.web.app`; exact-host runtime selection prevents staging from selecting production Firebase configuration. The final deployment exposed build `2026-08-19.seo-implementation-rc.5`, cache `taxmate-v2-rc-1-seo-implementation-rc-5`, passed the in-page audit 29/29 with zero fail/warn, and returned `X-Robots-Tag: noindex, nofollow, noarchive` on the homepage, Help and real 404 response.
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

The Stripe Dashboard was reopened in a fresh browser context and hard-navigated rather than relying on the earlier page. Its account switcher still identified the sandbox as belonging to the wrong parent account. Under the Founder stop rule, no Stripe Product, Price, promotion, webhook, Checkout, payment, refund or account setting was created or changed.

All earlier account-specific Stripe IDs and external TEST receipts are invalid for TaxMate and have been removed from source, config, tests and reports. The integration harness now requires the future independent TaxMate account ID and Plus/Pro Price IDs through environment variables, verifies the API key resolves to that exact account, and refuses malformed or missing identities. No secret is stored in the repository.

Canonical TaxMate Product, Price, promotion and webhook IDs are therefore `BLOCKED_NOT_CREATED`. Source/emulator tests still protect the Founder-approved £3.99/£8.49 monthly pricing policy, Stripe Tax off, signed webhook truth, cancellation, promotion fallback and refund behavior, but they are not evidence of correct-account external Stripe receipt.

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
| Stripe account identity | FAIL | Fresh account switcher still resolved to the wrong parent account; Stripe work stopped before mutation |
| Stripe TEST objects and server lifecycle | BLOCKED | Correct-account Product/Price/promotion/webhook objects were not created |
| Hosted Checkout card completion | BLOCKED | Earlier account receipt invalidated; correct-account hosted TEST not run |
| VAT / Stripe Tax | BLOCKED | Source policy is fixed off, but correct-account Checkout tax receipt is absent |
| Refund entitlement | BLOCKED | Source/emulator behavior passes; correct-account webhook/refund lifecycle is absent |
| GA4 received delivery | PASS | Fresh Realtime `upgrade_viewed` receipt and parameter drill-down observed |
| GA4 provider privacy settings | PASS | Enhanced Measurement, sharing/signals, granular collection and ads personalisation off; redaction and two-month retention configured |
| Sentry received payload | PASS_WITH_METADATA | Fresh `TAXMATE-9` proves scrubbed bookkeeping payload; trace and coarse provider-derived geography remain |
| Sentry provider privacy settings | PASS_WITH_LIMITATION | Server/default scrubbers, raw-IP prevention, sensitive fields and Enhanced Privacy on; 30-day plan lookback; coarse geography persists |

No production deployment, data migration or live billing configuration was changed or used as a substitute. Remaining staging blockers are Blaze-controlled Functions/Storage and the resulting real cloud receipt/App Check callable path.
