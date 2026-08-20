# TaxMate Final Founder Preview Package

Production remains at commit `745f7497d374f000870c4a7a111130008f8945a7`, tree `4726b48f89150782f50e6227226c227c13765212`. Candidate branch is `codex/taxmate-modernisation-20260817`.

Runtime identity is app `2.0.0-rc.1`, build `2026-08-19.stripe-sandbox-rc.6`, state/sync schema 5, tax rules `2026-27.2026-08-17.1`, form map `2025-26.2026-04-06.1` and PWA cache `taxmate-v2-rc-1-stripe-sandbox-rc-6`.

The candidate freezes the completed W0-W5 programme, Founder-approved UI, Google-only production Auth path, legal/privacy surfaces, telemetry minimisation, versioned tax/form truth, deterministic sync/tombstones, portable receipt-binary backup/restore, enforcing CSP, PWA hardening and server-authoritative entitlement behavior.

Launch pricing is Free £0, Plus £3.99/month and Pro £8.49/month. Paid launch billing is monthly only. Stripe Tax is off. Correct-account TaxMate Sandbox hosted Checkout, webhook, promotion, cancellation, expiry, full/partial refund and bookkeeping-data preservation gates pass.

Isolated staging evidence passes for Functions, Firestore/Storage rules, receipt lifecycle, receipt-binary ZIP restore, cross-user denial, App Check token infrastructure and IAM cleanup. Staging Google OAuth is recorded only as `STAGING_ONLY_OAUTH_LIMITATION`; it does not alter the production Auth invariant and is not a release blocker.

Run `node scripts/preview-server.js`, then open `http://127.0.0.1:4173/?stripe-rc=6`. Exact final commit/tree and regression totals are supplied in the Founder handoff.

No production deployment, Stripe LIVE change, push or merge occurred. The next decision is Founder release approval only.
