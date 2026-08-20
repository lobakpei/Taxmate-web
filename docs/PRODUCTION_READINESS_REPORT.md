# TaxMate Final Production Readiness Report

Founder-facing closeout — 20 August 2026. This records engineering evidence and does not claim full legal compliance.

| Item | Status | Final evidence |
|---|---|---|
| Branch | PASS | `codex/taxmate-modernisation-20260817` |
| Commit / tree | PASS | Exact identities are recorded in the final Founder handoff |
| Build | PASS | `2026-08-20.live-auth-restored-rc.12` |
| Working tree | PASS | Clean after the final coherent candidate commit |
| Production Google Auth invariant | PASS | Google provider/popup/persistence/callback/logout path remains behavior-equivalent to Founder-confirmed live production; service-worker Auth-relevant behavior is restored to live; Apple is absent |
| Stripe TEST | PASS | Independent TaxMate Sandbox, Plus £3.99/month and £29.99/year, Pro £7.99/month and £59.99/year, four hosted Checkouts, signed webhook, annual period end, promotions, cancellation, expiry and refund entitlement |
| Stripe LIVE wiring | PASS WITH RELEASE-TIME CHECK | Canonical four LIVE Price IDs are isolated in the production Functions environment; the replacement restricted LIVE key and unchanged webhook secret are enabled in `taxmate-uk-2` Secret Manager. No production Functions are currently deployed, so runtime binding is verified immediately after an approved deployment. |
| Founder promotions | PASS | Four backend-only fixed/permanent configurations are active with exact start, expiry and capacity; client source contains none of the codes. Transactional redemption, priority, notices, disable/revoke and data-retention behavior are covered by regression. |
| SEO | PASS | Approved title, description, H1, canonical, robots, sitemap, structured data and staging noindex regression |
| Legal / Privacy | PASS | Privacy, Terms, lawful-basis, processor, transfer, retention and deletion consistency engineering gate |
| GA4 | PASS | Fresh allow-listed staging event receipt with privacy controls and no bookkeeping payload |
| Sentry | PASS | Synthetic receipt and scrubbed payload inspection; documented provider-derived metadata limitation |
| Firebase data / security | PASS | Functions, Firestore/Storage rules, receipt lifecycle, ZIP receipt restore, cross-user denial, App Check token infrastructure and IAM cleanup |
| Backup / restore | PASS | Deterministic JSON and receipt-binary ZIP round trip, validation and rollback behavior |
| UI / tax logic | PASS | Founder-approved UI freeze and versioned tax/form regressions preserved |
| Staging Google OAuth | LIMITATION | `STAGING_ONLY_OAUTH_LIMITATION`; not a production release blocker and no longer under investigation |
| Rollback | PASS | Pre-release production commit `745f7497d374f000870c4a7a111130008f8945a7`; live Google Auth failure triggers immediate rollback |
| Remaining blocker | NONE BEFORE CONTROLLED RELEASE | Founder has authorised release of the exact frozen candidate. Deployment must still verify Functions secret binding and LIVE Checkout creation before closeout. |

## Verdict

`APPROVED_FOR_CONTROLLED_PRODUCTION_RELEASE`

The Founder has given exact release approval. Any candidate SHA/tree drift invalidates that approval.
