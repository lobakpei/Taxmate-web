# TaxMate Production Readiness Report

Founder-facing status — 19 August 2026. `PASS`, `FAIL`, `BLOCKED` and `NOT_TESTED` are the only item statuses. This is engineering evidence, not a claim of full legal compliance.

| # | Item | Status | Evidence / blocker |
|---:|---|---|---|
| 1 | Final branch | PASS | `codex/taxmate-modernisation-20260817` |
| 2 | Final candidate commit | PASS | Exact SHA is recorded in the final handoff because a commit cannot contain its own SHA |
| 3 | Tree SHA | PASS | Exact tree is recorded in the final handoff |
| 4 | Build ID | PASS | `2026-08-19.external-services-rc.3` |
| 5 | Working tree clean | PASS | Required at final handoff after the RC commit |
| 6 | Legal Gate | PASS | Privacy, Terms, matrices, runtime alignment and regression tests complete |
| 7 | ICO Gate | BLOCKED | Awaiting public propagation of the confirmed correspondence-address update |
| 8 | Google Auth | BLOCKED | Existing Google provider configuration PASS; full browser sign-in with a disposable non-production account not tested |
| 9 | Firebase | BLOCKED | Existing project/app/Firestore/Storage/Hosting verified; candidate Functions are not deployed and production cannot substitute for staging |
| 10 | App Check | BLOCKED | Existing Web registration and Firestore/Storage enforcement PASS; Auth unenforced and candidate callable token path not deployed |
| 11 | Firestore / Storage rules | PASS | Real Emulator Suite rules and denial tests |
| 12 | Two-client sync | PASS | Two separate same-account emulator clients converge after concurrent edits |
| 13 | Offline sync | PASS | Real disable-network → queued edit → reconnect path |
| 14 | Tombstones | PASS | Offline tombstone wins and record does not resurrect |
| 15 | Receipts | BLOCKED | Storage Emulator lifecycle PASS; real staged cloud/full-ZIP receipt restore unavailable |
| 16 | Backup / restore | PASS | JSON and ZIP, manifest, SHA-256, linked/orphan binaries, corrupt rejection and rollback tests |
| 17 | Stripe TEST | PASS | Isolated TaxMate sandbox; real TEST API + local emulator integration passed |
| 18 | Plus £3.99 | PASS | Exact monthly TEST Product/Price and Checkout session verified |
| 19 | Pro £8.49 | PASS | Exact monthly TEST Product/Price and active subscription verified |
| 20 | Promotion | PASS | Plus 30-day, Pro 90-day and inactive fixture; duplicate/invalid/expiry behavior verified |
| 21 | Cancellation / expiry | PASS | Period-end and immediate cancellation, webhook downgrade and data preservation verified |
| 22 | VAT / Stripe Tax verified state | BLOCKED | `BLOCKED_FOUNDER_INPUT`: Stripe Tax pending, head office absent and price tax behaviour unspecified |
| 23 | GA4 | BLOCKED | DebugView delivery PASS; Enhanced Measurement/query masking/retention-sharing review remains |
| 24 | Sentry payload | BLOCKED | Candidate scrub receipt PASS; older production payload remains excessive; provider settings/deployment pending |
| 25 | Deletion | PASS | Auth/Functions/Firestore/Storage emulator account-deletion flow |
| 26 | Partnership | PASS | Server join/leave, access removal, remaining-member retention and last-member deletion |
| 27 | Security | PASS | Secret/private-data scans pass; production dependency audit has no high/critical findings |
| 28 | Privacy | PASS | Legal/runtime alignment and public-source scan pass |
| 29 | CSP | PASS | Enforcing headers; exact Sentry SDK/ingest hosts added; no broad script escape hatch |
| 30 | PWA | PASS | Current build cache installs, activates and relaunches offline with exact build identity |
| 31 | Full test totals | PASS | Repository gate 95/95 plus external Stripe sandbox integration 1/1 |
| 32 | Known limitations | PASS | `KNOWN_LIMITATIONS.md` updated |
| 33 | Remaining blockers | BLOCKED | ICO propagation; undeployed Firebase Functions; telemetry provider settings; Founder VAT/refund decisions |
| 34 | Rollback plan | PASS | `ROLLBACK.md` updated; production remains unchanged |
| 35 | Final preview URL | PASS | `http://127.0.0.1:4173/?external-services-rc=3` |
| 36 | Production readiness verdict | BLOCKED | `PRODUCTION_BLOCKED` |

## True blocking items

1. ICO public register propagation.
2. Approved non-production Firebase deployment and disposable Google Auth/App Check account; existing production Functions are absent and were not created.
3. Founder/accountant VAT/Stripe Tax decision and Founder refund-entitlement decision.
4. Browser action-time approval to complete a hosted Stripe TEST card payment.
5. Review/fix GA4 Enhanced Measurement, query masking, retention/sharing and Sentry retention/IP-geolocation processing settings.

## Verdict

`PRODUCTION_BLOCKED`

No push, merge, production deployment, production rules deployment, Stripe LIVE switch, migration, DNS change or force-push is authorised.
