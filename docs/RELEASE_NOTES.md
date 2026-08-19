# TaxMate Production Readiness Candidate — Release Notes

Build `2026-08-19.production-readiness-rc.1` consolidates the W0–W5 programme, Founder UI freeze and Legal & Privacy Gate into a production-readiness candidate. It is not deployed.

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
- Firestore/Storage/Auth/Functions Emulator Suite covers cross-user denial, two-client convergence, offline tombstones, receipts, partnership and deletion flows.

## Legal, privacy and telemetry

- Current Privacy Policy, Terms, lawful-basis, processor/transfer and retention records.
- GA4 is optional and off by default; approved events are value-free.
- Sentry payloads are reduced to structural diagnostics.
- Public support is `support@taxmate.uk`; the private Outlook destination is not published.

## PWA and backup

- Portable ZIP validates manifest, SHA-256, linked/orphan receipt binaries and hostile/corrupt archives before mutation.
- Restore downloads a pre-restore ZIP and rolls back newly uploaded objects if restoration fails.
- Service-worker update now activates after the new shell is cached and offline fallback reads only the current cache identity.

External Firebase/Google, Stripe TEST, GA4 and Sentry staging remain blocked as recorded in `STAGING_EXTERNAL_SERVICE_REPORT.md`.
