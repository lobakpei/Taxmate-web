# TaxMate Production Readiness Candidate — Release Notes

Build `2026-08-20.google-only-auth-recovery-rc.11` is a minimum Google-only Auth recovery over RC.10. It leaves the Google SDK flow unchanged, keeps Apple Sign-In absent, and prevents the TaxMate service worker from intercepting Firebase Hosting's reserved `/__/` Auth callback namespace. All RC.10 billing, Founder-promotion, SEO, legal, telemetry, tax and approved UI behavior is preserved. The full gate passed 131/131 and the browser audit passed 29/29.

Build `2026-08-20.billing-promo-rc.10` closes LIVE billing-secret wiring and Founder promotions on top of approved RC.9. It preserves the approved billing UI and pricing, isolates all four canonical LIVE Price IDs from TEST, stores no Stripe secret in the repository, and adds backend-only fixed/permanent promotion lifecycle, entitlement priority, notifications, payment protection and Founder admin controls. The full gate passed 127/127 and the browser audit passed 29/29. Production remains undeployed pending Founder approval and release-time Functions secret-binding verification.

Build `2026-08-19.seo-implementation-rc.5` consolidates the W0–W5 programme, Founder UI freeze, Legal & Privacy Gate, persistent non-production staging setup, Founder-approved SEO implementation and approved GA4/Sentry receipt checks into a release candidate. It is not deployed to production.

Build `2026-08-19.stripe-sandbox-rc.6` adds correct-account TaxMate Sandbox provisioning and receipts, completed £3.99 Plus and £8.49 Pro hosted TEST Checkouts, promotion fixtures and the full cancellation/refund entitlement gate. It also updates the webhook for Stripe's current Invoice Payments refund relationship. No UI was redesigned and production remains unchanged.

## Product and UI

- Preserves the Founder-approved UI and final fixes.
- Google Sign-In only; Apple Sign-In is absent.
- Free £0; Plus £3.99/month or £29.99/year; Pro £7.99/month or £59.99/year.
- One independent promotion-code entry above all plan cards.
- Quarterly summary and receipt-pack wording no longer claims MTD submission/HMRC approval in any supported language.

## Security, sync and deletion

- Server-written entitlements remain canonical; stale client flags cannot unlock paid features.
- Callable Functions enforce App Check outside Emulator Suite.
- Partnership join is server-authoritative and validates the parent before membership creation.
- Partnership leave now revokes cloud access and deletes a last-member partnership.
- Account deletion removes personal cloud data, receipts, promotions and identity while retaining shared records only for remaining members.
- Account-specific Stripe IDs and earlier external receipts were removed after the refreshed Dashboard still resolved to the wrong parent account.
- Checkout now blocks duplicate live subscriptions; webhook projection is signed, idempotent and rejects stale event ordering.
- The Stripe integration harness now requires environment-injected account/Price identities and verifies that the TEST key resolves to the exact independent TaxMate account before running.
- Firestore/Storage/Auth/Functions Emulator Suite covers cross-user denial, two-client convergence, offline tombstones, receipts, partnership and deletion flows.
- Stripe Tax is explicitly off. Checkout totals are exactly £3.99/£29.99 for Plus and £7.99/£59.99 for Pro at the selected monthly/yearly cadence, with no VAT representation; full refunds immediately remove the refunded paid entitlement, partial refunds require manual review, and active promotion fallback remains server-derived.

## Legal, privacy and telemetry

- Current Privacy Policy, Terms, lawful-basis, processor/transfer and retention records.
- GA4 is optional and off by default; approved events are value-free.
- Sentry payloads are reduced to structural diagnostics.
- Public support is `support@taxmate.uk`; the private Outlook destination is not published.

## PWA and backup

- Portable ZIP validates manifest, SHA-256, linked/orphan receipt binaries and hostile/corrupt archives before mutation.
- Restore downloads a pre-restore ZIP and rolls back newly uploaded objects if restoration fails.
- Service-worker update now activates after the new shell is cached and offline fallback reads only the current cache identity.

At the earlier SEO RC.5 stage, correct-account hosted Stripe TEST had not yet been accepted. That historical limitation was cleared by RC.6 and RC.9 evidence; the current RC.10 status is stated at the top of this report. GA4/Sentry received-event inspection remains verified as recorded in `STAGING_EXTERNAL_SERVICE_REPORT.md`.

## Search implementation

- Uses the exact Founder-approved title, meta description, H1, supporting line and concise explanatory copy.
- Adds production canonical/Open Graph metadata and truthful `SoftwareApplication` JSON-LD without ratings, awards, company claims or HMRC certification.
- Adds a useful public Help page, real Help/Privacy/Terms anchors, production-only robots/sitemap URLs and a real non-indexable 404 page.
- Keeps Privacy and Terms crawlable but non-indexed; no fake hreflang is emitted.
- Deploys staging with a separate config that applies `X-Robots-Tag: noindex, nofollow, noarchive` to every response.
