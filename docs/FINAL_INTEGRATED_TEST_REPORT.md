# Final Integrated Test Report

> **SUPERSEDED HISTORICAL EVIDENCE — NOT CURRENT CONTRACT TRUTH.** This report records the earlier release state and its then-valid £7.99/month / £59.99/year Pro evidence. Founder superseded that commercial contract on 29 August 2026 with launch £9.99/month, standard £11.99/month and £99.99/year. The historical evidence below is preserved unchanged and must not be used by a current pricing gate.

## Live Auth restoration RC.12 addendum — 20 August 2026

Build `2026-08-20.live-auth-restored-rc.12` restores live-production service-worker semantics without changing the Google provider, Firebase initialization, persistence, Auth callback observer, CSP or App Check. Production Firebase identity remains `taxmate-uk-2`, Apple Sign-In remains absent and approved billing/promotion/SEO/legal/telemetry behavior is unchanged. The complete repository gate passed 127/127 and a fresh local browser audit passed 29/29 with zero fail/warn and no console errors. Production-artifact staging/debug/TEST-secret scans returned zero. Per Founder instruction, verification did not open a Google popup.

## Live billing secret and Founder promo RC.10 addendum — 20 August 2026

Build `2026-08-20.billing-promo-rc.10` passed the complete repository gate at 127/127: characterization 4/4, unit 97/97, integration 5/5, static Firestore/Storage rules 5/5, Firestore/Storage Emulator Suite 11/11 and Auth/Functions Emulator Suite 5/5. The in-page browser audit passed 29/29 with zero fail/warn. `git diff --check`, production/staging separation, public secret/private-information checks and the repository scan for the four Founder codes passed.

The TaxMate LIVE restricted key was rotated without expanding its six permissions and stored only as enabled Secret Manager secret `STRIPE_SECRET_KEY` in `taxmate-uk-2`; the existing enabled `STRIPE_WEBHOOK_SECRET` was not rotated. A read-only API receipt confirmed the replacement key can read subscriptions, invoices and promotion codes. The four canonical LIVE Price IDs are now deterministic production Functions configuration, while TEST IDs remain confined to the Sandbox harness. Production has no deployed candidate Functions, so the Functions-runtime binding and paid Checkout smoke remain release-time checks after explicit deployment approval.

The four Founder campaigns are backend-only Firestore configuration, not Stripe coupons. Fixed campaign expiry, permanent Pro, exact caps, same-UID uniqueness, concurrent final-slot safety, success copy, 30/7/1/expired notices, annual renewal/end notices, paid/promo priority, permanent-Pro payment protection, disable/revoke separation and downgrade-without-deletion behavior are protected by the current regression suite. Exact campaign codes are absent from public repository source.

## Annual billing RC.9 addendum — 20 August 2026

The final repository gate passed 120/120 and the current in-page browser audit passed 29/29 with zero fail/warn. Four genuine correct-account Stripe-hosted TEST Checkouts verified Plus £3.99/month and £29.99/year and Pro £7.99/month and £59.99/year, exact GBP amounts, zero tax, recurring intervals and server entitlement. Annual cancel-at-period-end, period-end promo fallback and the affected shared cancellation/refund/webhook lifecycle also passed. Matching LIVE Price objects were created without real customers, cards, payments or subscriptions; production Functions and Hosting remain unchanged.

## Final UI freeze identity

Validated 18 August 2026 on branch `codex/taxmate-modernisation-20260817`, starting from committed RC `138efa4c891af30f9581e4e3488e4f5c1b5481e4`. Runtime identity is app `2.0.0-rc.1`, build `2026-08-18.final-ui-freeze.1`, PWA cache `taxmate-v2-rc-1-final-ui-freeze`. The final commit and tree are recorded at handoff because a commit cannot contain its own hash.

The working-tree audit found only the five Founder-approved changes: Home add-business/catch-up spacing; complete removal of Apple Sign-In in favour of Google only; approved green Tax hero in light mode while retaining the dark treatment; floating-add optical centring; and one independent promotion-code entry above all plan cards. A dedicated regression file protects all five decisions.

## Automated gate

`npm run test:all` passed 75/75: characterization 4, unit 58, integration 4, static Firebase rules 4 and real Firestore-emulator tests 5. `git diff --check` passed. The first identity run correctly failed after the build constant changed but before the HTML build marker changed; the marker was synchronized and the entire gate was rerun from the start without weakening a test.

## Browser and visual gate

The exact repository was served with the enforcing Hosting CSP at `http://127.0.0.1:4173/`, with Firebase disabled locally. The in-page audit passed 29/29 with zero warnings. Founder-fix measurements confirmed a 14px Home gap, Google as the sole account button, no Apple UI text, one promotion entry 14px above the first plan card, the approved green light-mode Tax gradient, and a horizontally centred floating plus with the approved 2px optical correction.

Responsive checks covered 320, 360, 375, 390 and 430 mobile widths plus 1280×800, 1440×900 and 1920×1080. All six languages were exercised at 320px in light and dark across Home, Income, Expenses, Tax and Settings: 60 language/theme/page checks with no document or visible-button overflow; Urdu remained RTL. A further 35 viewport/page checks found no overflow. At 1440×900 the entry dialog was 520px, centred, focused the date field and closed with Escape. Fresh-origin onboarding had exactly one root, opened, progressed and closed deliberately. Both browser origins had zero app-origin warning/error. After the preview server stopped, the final-freeze service worker relaunched the app and displayed the new build identity offline.

At the UI-freeze stage, external Firebase, Stripe TEST, GA4 and Sentry validation was not represented as passed; the later current status is recorded in the external-services addendum and `STAGING_EXTERNAL_SERVICE_REPORT.md`.

## Legal & Privacy Gate addendum — 19 August 2026

Build `2026-08-19.legal-privacy-gate.1` passed the complete `npm run test:all` command: characterization 4/4, unit 65/65, integration 4/4, static Firebase rules 4/4 and Firestore-emulator rules 5/5, for 82/82 total. The seven additional unit checks protect the current Privacy/Terms identity, optional GA4 default, minimised Sentry payload, server deletion and Checkout terms collection, Google-only authentication, removal of stale claims, and absence of private contact details or credentials in the public runtime.

Founder pricing and support-routing input produced build `2026-08-19.legal-privacy-gate.2`: Free £0, Plus £3.99/month, Pro £8.49/month, monthly-only launch billing, and public support routed through Namecheap to a private Microsoft Outlook destination. The destination address is not present in public source or reports. The complete gate was rerun after these changes; see `AUTOMATED_TEST_REPORT.md` for the latest result.

Browser checks passed for the in-app and standalone Privacy Policy and Terms, the analytics control remained unchecked, no Google Analytics script was loaded before consent, Google remained the only sign-in provider, and all checked pages had zero console warning/error. External service receipt, sync, Stripe, GA4 delivery and Sentry-receipt testing remains isolated-staging work and is not represented as passed.

## Production-readiness addendum — 19 August 2026

Build `2026-08-19.production-readiness-rc.1` adds 11 real Firestore/Storage emulator tests and three Auth/Functions integration tests. Evidence covers cross-user denial, owner-only receipts, two same-account clients, concurrent convergence, actual offline reconnect, tombstone non-resurrection, server-authoritative partnership join/leave, departing-member access removal, last-member partnership deletion and authenticated account deletion across Firestore, Storage, promotions and Auth.

The service worker was tested by installing the current shell, stopping the preview server, closing the active client and reopening the app. An initial run exposed fallback into an older retained cache; activation and current-cache lookup were corrected, after which the offline app displayed the exact production-readiness build identity. At that stage external services remained blocked; the later Stripe/Firebase reclassification appears below.

## Existing-services and Stripe sandbox addendum — 19 August 2026

Build `2026-08-19.external-services-rc.2` reclassified existing Firebase configuration from absent to verified while preserving the non-production boundary: the TaxMate Web app, Firestore, Storage, Hosting, Google provider and App Check registration exist, but candidate Functions are not deployed. An isolated TaxMate Stripe TEST sandbox was created without changing the other product sandbox or LIVE mode. The real TEST API integration passed 1/1 for Checkout construction, promotion tiers and expiry fixture, active/cancelled/declined subscription paths, signed webhook truth, duplicate-event idempotency and stale-event rejection. The repository gate increased to 94/94 after adding Stripe server invariants.

## GA4 and Sentry receipt addendum — 19 August 2026

Build `2026-08-19.external-services-rc.3` records action-time approved telemetry receipt checks. GA4 property `541961931` DebugView received one non-sensitive `upgrade_viewed` event with `client_storage=none`. Sentry issue `TAXMATE-8` received a synthetic exception whose message was reduced to `Application error`; no request, query, referrer, User-Agent, email, business name, amount, receipt, note or breadcrumb field was visible. Sentry still supplied trace identifiers and coarse geography. The check found a missing second-stage Sentry SDK/ingest CSP allowance; only the two exact hosts were added and a regression test raised the repository total to 95/95. A fresh enforcing-preview browser pass then returned 29/29 with zero fail/warn and no console warning/error, including successful Sentry SDK loading. Provider retention, GA4 Enhanced Measurement/query masking and Sentry IP/geolocation processing remain release review items.

## Production-readiness RC.4 addendum — 19 August 2026

The final repository gate passed 96/96. The freshly deployed staging Hosting build returned in-page audit 29/29 with zero fail/warn and the exact RC.4 identity. Separate Stripe gates passed 1/1 for the real TEST sandbox lifecycle and 1/1 for an actual hosted TEST Checkout receipt replayed through the signed candidate webhook. The hosted Pro payment was exactly £8.49, tax was zero with automatic tax disabled, and the resulting subscription was fully refunded and cancelled in TEST mode. Server tests confirm period-end cancellation, immediate full-refund removal with promotion fallback, partial-refund manual review and non-resurrection of a refunded paid period.

A persistent `taxmate-staging` Firebase target was created and limited to test data. Hosting, Firestore rules/indexes, Google-only Auth and App Check registration were configured without changing production. A real browser Google sign-in attempt returned `auth/internal-error`; deployed Functions/Storage could not be enabled because Firebase requires a Founder-approved Blaze billing link. Consequently the real staging Google/App Check/cloud-receipt path remains blocked and is not represented as passed.

GA4 Realtime received a fresh UI-originated `upgrade_viewed` after the consent dispatcher was corrected; its custom payload contained only `app_surface` and `client_storage=none`, with no bookkeeping or identity fields. The prior minimised Sentry synthetic receipt remains valid. A final read-only ICO check still showed the old correspondence address, so publication remains blocked pending confirmed update propagation.

## Stripe account refresh and SEO RC.5 addendum — 19 August 2026

The Stripe Dashboard was reopened after a fresh navigation and still identified the TaxMate-named sandbox under the wrong parent account. The mandatory stop rule was applied before mutation. No Product, Price, promotion, webhook, Checkout or LIVE setting was created or changed. Earlier external Stripe evidence was invalidated, every old account-specific ID was removed from the candidate, and the harness now requires and verifies environment-injected independent-account identities.

Build `2026-08-19.stripe-sandbox-rc.6` supersedes that stop after the Founder refreshed the login. Fresh Dashboard evidence resolved the independent `taxmate` parent and `taxmate sandbox`. Canonical monthly Free/Plus/Pro products, £3.99/£8.49 prices and Plus/Pro/expired promotion fixtures were created in TEST only. Real hosted Plus and Pro Checkouts completed with tax £0. Signed actual Stripe events passed backend entitlement, promotion, cancellation, declined-payment, duplicate, out-of-order, partial/full refund and data-preservation gates. The refund receipt exposed and fixed the current Invoice Payments API relationship. Repository regression passed 106/106. No LIVE, ToodaLoop, push, merge or production deployment occurred.

The exact Founder-approved search positioning was implemented without a marketing redesign. The homepage has one production canonical, exact title/meta/H1, crawlable explanatory copy and real public links. Robots, a production-only sitemap, an indexable Help page, crawlable non-indexed Privacy/Terms pages, Open Graph metadata, a truthful parseable `SoftwareApplication` block and a real noindex 404 are covered by regression tests. The separate staging config returned header-level noindex on every inspected response.

The full repository gate passed 106/106, targeted SEO/CSP/identity checks passed 13/13, the HTTP preview gate passed 1/1 and the deployed staging browser audit passed 29/29. Correct-account Stripe external gates separately passed hosted receipt 1/1 for Plus, hosted receipt 1/1 for Pro and hosted lifecycle 1/1.

## Final closeout — 20 August 2026

All unproven staging OAuth recovery experiments were removed. Candidate production Auth is byte-identical to committed RC.6 and retains the current live Google-only `taxmate-uk-2` popup path as `KNOWN_GOOD_RELEASE_INVARIANT`. The isolated staging callback result is recorded as `STAGING_ONLY_OAUTH_LIMITATION`; it is not a production release blocker and no further staging OAuth work is planned.

The complete repository gate passed again at 106/106. The focused Stripe/SEO/CSP/legal/privacy/security gate passed 30/30. Existing correct-account hosted Stripe TEST receipts and lifecycle evidence remain frozen and valid; the external mutation-capable harness was not rerun because no Stripe secret was present in the local closeout environment. No Stripe object or LIVE setting changed.

Staging Hosting packaging now explicitly excludes root Git metadata, Firebase CLI cache and debug logs. This independent security correction changes no application or Auth runtime behavior. The final preview remains available through the repository preview server. No push, merge or production deployment occurred.
