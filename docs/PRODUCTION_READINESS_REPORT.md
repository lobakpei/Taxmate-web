# TaxMate Production Readiness Report

Founder-facing status — 19 August 2026. `PASS`, `FAIL`, `BLOCKED` and `NOT_TESTED` are the only item statuses. This is engineering evidence, not a claim of full legal compliance.

| # | Item | Status | Evidence / blocker |
|---:|---|---|---|
| 1 | Final branch | PASS | `codex/taxmate-modernisation-20260817` |
| 2 | Final candidate commit | PASS | Exact SHA is recorded in the final handoff because a commit cannot contain its own SHA |
| 3 | Tree SHA | PASS | Exact tree is recorded in the final handoff |
| 4 | Build ID | PASS | `2026-08-19.seo-implementation-rc.5` |
| 5 | Working tree clean | PASS | Final freeze commit and clean status are recorded in the handoff |
| 6 | Legal Gate | PASS | Privacy, Terms, matrices, runtime alignment and regression tests complete |
| 7 | ICO Gate | BLOCKED | `ZC174150` identity, Tier 1, expiry and Taxmate/AcreMiles names pass; public correspondence address still appears residential |
| 8 | Google Auth | BLOCKED | Google-only provider is enabled in `taxmate-staging`; the in-app-browser popup returned `auth/internal-error`, so a successful staged account receipt is still absent |
| 9 | Firebase | BLOCKED | `taxmate-staging` has isolated Firestore, rules, Auth, App Check and candidate Hosting; Functions and Storage require a Founder-authorised Blaze billing link |
| 10 | App Check | BLOCKED | Staging Web app and staging-only reCAPTCHA Enterprise key are registered; deployed callable enforcement cannot run until Functions can deploy |
| 11 | Firestore / Storage rules | PASS | Real Emulator Suite rules and denial tests |
| 12 | Two-client sync | PASS | Two separate same-account emulator clients converge after concurrent edits |
| 13 | Offline sync | PASS | Real disable-network → queued edit → reconnect path |
| 14 | Tombstones | PASS | Offline tombstone wins and record does not resurrect |
| 15 | Receipts | BLOCKED | Storage Emulator lifecycle PASS; real staged receipt/full-ZIP validation cannot run because Cloud Storage creation requires Blaze |
| 16 | Backup / restore | PASS | JSON and ZIP, manifest, SHA-256, linked/orphan binaries, corrupt rejection and rollback tests |
| 17 | Stripe TEST | BLOCKED | Fresh Dashboard context still resolved to the wrong parent account; no mutation performed and earlier receipts invalidated |
| 18 | Plus £3.99 | BLOCKED | Source price policy passes; correct-account Product/Price and hosted Checkout not created |
| 19 | Pro £8.49 | BLOCKED | Source price policy passes; correct-account Product/Price and hosted Checkout not created |
| 20 | Promotion | BLOCKED | Emulator logic passes; correct-account TEST promotion fixtures not created |
| 21 | Cancellation / refund / expiry | BLOCKED | Source/emulator policy passes; correct-account external webhook lifecycle not run |
| 22 | VAT / Stripe Tax verified state | BLOCKED | Code sets Stripe Tax off; correct-account Checkout tax receipt is absent |
| 23 | GA4 | PASS | Fresh `upgrade_viewed` received in Realtime; drill-down showed the allow-listed event and `client_storage=none` |
| 24 | Sentry payload | PASS | Fresh `TAXMATE-9` is scrubbed; provider controls configured; trace/coarse geography documented; candidate remains undeployed to production |
| 25 | Deletion | PASS | Auth/Functions/Firestore/Storage emulator account-deletion flow |
| 26 | Partnership | PASS | Server join/leave, access removal, remaining-member retention and last-member deletion |
| 27 | Security | PASS | Secret/private-data scans pass; production dependency audit has no high/critical findings |
| 28 | Privacy | PASS | Legal/runtime alignment and public-source scan pass |
| 29 | CSP | PASS | Enforcing headers; exact Sentry SDK/ingest hosts added; no broad script escape hatch |
| 30 | PWA | PASS | Current build cache installs, activates and relaunches offline with exact build identity |
| 31 | Full test totals | PASS | Repository 106/106; SEO targeted 13/13; preview HTTP 1/1; staging browser audit 29/29; external Stripe intentionally not run |
| 32 | Known limitations | PASS | `KNOWN_LIMITATIONS.md` updated |
| 33 | Remaining blockers | BLOCKED | Independent TaxMate Stripe account session; ICO propagation; staging Blaze for Functions/Storage/Google/App Check/receipts |
| 34 | Rollback plan | PASS | `ROLLBACK.md` updated; production remains unchanged |
| 35 | Final preview URL | PASS | Local `http://127.0.0.1:4173/?seo-rc=5`; isolated staging `https://taxmate-staging.web.app/?seo-rc=5` with header-level noindex |
| 36 | Production readiness verdict | BLOCKED | `PRODUCTION_BLOCKED` |

## True blocking items

1. Stripe account context: the refreshed switcher still identified the sandbox under the wrong parent account. Sign in to the genuinely independent TaxMate Stripe account, then create canonical TEST objects and rerun every external Stripe receipt. No earlier evidence is accepted.
2. ICO public register propagation: the final read-only check still showed the previous residential correspondence address. It is not reproduced here.
3. Explicit Founder billing authority for `taxmate-staging`: Firebase requires Blaze before Cloud Functions APIs and Cloud Storage can be enabled. No billing account was linked automatically.
4. After Blaze is authorised, rerun staged Google sign-in, App Check callable enforcement, real receipt upload/download/delete and full ZIP receipt restore. Production must not substitute.

## Verdict

`PRODUCTION_BLOCKED`

No push, merge, production deployment, production rules deployment, Stripe LIVE switch, migration, DNS change or force-push is authorised.
