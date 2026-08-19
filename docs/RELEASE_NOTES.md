# TaxMate Production Readiness Candidate — Release Notes

Build `2026-08-19.seo-implementation-rc.5` consolidates the W0–W5 programme, Founder UI freeze, Legal & Privacy Gate, persistent non-production staging setup, Founder-approved SEO implementation and approved GA4/Sentry receipt checks into a release candidate. It is not deployed to production.

## Product and UI

- Preserves the Founder-approved UI and final fixes.
- Google Sign-In only; Apple Sign-In is absent.
- Free £0, Plus £3.99/month and Pro £8.49/month; monthly launch billing only.
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
- Stripe Tax is explicitly off. Checkout totals remain exactly £3.99/£8.49 monthly with no VAT representation; full refunds immediately remove the refunded paid entitlement, partial refunds require manual review, and active promotion fallback remains server-derived.

## Legal, privacy and telemetry

- Current Privacy Policy, Terms, lawful-basis, processor/transfer and retention records.
- GA4 is optional and off by default; approved events are value-free.
- Sentry payloads are reduced to structural diagnostics.
- Public support is `support@taxmate.uk`; the private Outlook destination is not published.

## PWA and backup

- Portable ZIP validates manifest, SHA-256, linked/orphan receipt binaries and hostile/corrupt archives before mutation.
- Restore downloads a pre-restore ZIP and rolls back newly uploaded objects if restoration fails.
- Service-worker update now activates after the new shell is cached and offline fallback reads only the current cache identity.

Correct-account hosted Stripe TEST remains blocked and no earlier account evidence is accepted. GA4/Sentry received-event inspection remains verified as recorded in `STAGING_EXTERNAL_SERVICE_REPORT.md`. A persistent staging Firebase project and Hosting/Firestore/Auth/App Check configuration now exist, but deployed Functions/Storage and the real Google/App Check/receipt path remain blocked by the Founder-controlled staging Blaze billing link.

## Search implementation

- Uses the exact Founder-approved title, meta description, H1, supporting line and concise explanatory copy.
- Adds production canonical/Open Graph metadata and truthful `SoftwareApplication` JSON-LD without ratings, awards, company claims or HMRC certification.
- Adds a useful public Help page, real Help/Privacy/Terms anchors, production-only robots/sitemap URLs and a real non-indexable 404 page.
- Keeps Privacy and Terms crawlable but non-indexed; no fake hreflang is emitted.
- Deploys staging with a separate config that applies `X-Robots-Tag: noindex, nofollow, noarchive` to every response.
