# TaxMate Final Founder Preview Package

Production remains at commit `745f7497d374f000870c4a7a111130008f8945a7`, tree `4726b48f89150782f50e6227226c227c13765212`. Candidate branch is `codex/taxmate-modernisation-20260817`.

Runtime identity is app `2.0.0-rc.1`, build `2026-08-20.billing-promo-rc.10`, state/sync schema 5, tax rules `2026-27.2026-08-17.1`, form map `2025-26.2026-04-06.1` and PWA cache `taxmate-v2-rc-1-billing-promo-rc-10`.

The candidate freezes the completed W0-W5 programme, Founder-approved UI, Google-only production Auth path, legal/privacy surfaces, telemetry minimisation, versioned tax/form truth, deterministic sync/tombstones, portable receipt-binary backup/restore, enforcing CSP, PWA hardening and server-authoritative entitlement behavior.

Pricing is Free £0; Plus £3.99/month or £29.99/year; Pro £7.99/month or £59.99/year. Stripe Tax is off. Four correct-account TaxMate Sandbox hosted Checkouts passed exact amount, GBP, cadence, zero-tax, subscription and entitlement checks. Annual cancellation retains access to paid period end and then recomputes paid/promo/Free priority. Shared webhook, promotion, cancellation, expiry, full/partial refund and bookkeeping-data preservation gates pass.

Isolated staging evidence passes for Functions, Firestore/Storage rules, receipt lifecycle, receipt-binary ZIP restore, cross-user denial, App Check token infrastructure and IAM cleanup. Staging Google OAuth is recorded only as `STAGING_ONLY_OAUTH_LIMITATION`; it does not alter the production Auth invariant and is not a release blocker.

Run `node scripts/preview-server.js`, then open `http://127.0.0.1:4173/?billing-promo-rc=10`. Exact final commit/tree and regression totals are supplied in the Founder handoff.

No production code deployment, push or merge occurred. Matching LIVE Price objects were created only after Sandbox validation; no real customer, card, payment or subscription was used. The next decision is Founder approval of the new candidate identity.
