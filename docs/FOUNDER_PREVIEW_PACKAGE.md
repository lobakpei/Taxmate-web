# Final Integrated Founder Preview Package

Production baseline remains commit `745f7497d374f000870c4a7a111130008f8945a7`, tree `4726b48f89150782f50e6227226c227c13765212`. A read-only GitHub check on 19 August 2026 confirmed `refs/heads/main` still points to that commit.

Candidate branch is `codex/taxmate-modernisation-20260817`. Runtime identity is app `2.0.0-rc.1`, build `2026-08-19.production-readiness-rc.1`, state/sync schema 5, tax rules `2026-27.2026-08-17.1`, form map `2025-26.2026-04-06.1`, PWA cache `taxmate-v2-rc-1-production-readiness-rc-1`.

The package retains the completed W0–W5.6 engineering programme: versioned tax/form truth, deterministic migration/sync/tombstones, server entitlement architecture, portable receipt-binary ZIP restore, enforcing CSP with external executable scripts, PWA hardening and the Founder-approved UI integration.

Final UI freeze adds only the approved fixes: Home spacing, Google-only authentication UI/provider, green light-mode Tax hero, floating-plus centring, and one independent promotion-code entry above every plan. Apple Sign-In is intentionally removed and is not a release requirement.

Run `node scripts/preview-server.js`, then open `http://127.0.0.1:4173/?production-readiness-rc=1`. The integrated local gate is 91/91 and the final browser/PWA matrix passed. External staging remains a release blocker as detailed in `STAGING_EXTERNAL_SERVICE_REPORT.md`. No production merge, rule/Functions deployment, Stripe configuration, migration or production deployment occurred.

## Legal & Privacy Preview additions

Open Settings → Introduction and legal to review the in-app Privacy Policy, Terms and analytics consent control. Standalone pages are `/privacy.html` and `/terms.html`. GA4 is off by default; Sentry diagnostics are structurally minimised; Google is the only sign-in provider; direct promotions are distinguished from recurring paid Checkout subscriptions; and account deletion covers promotion records and explicit partnership retention.

Founder-approved launch pricing is shown as Free £0, Plus £3.99/month and Pro £8.49/month. Paid launch billing is monthly only; no annual plan is required. Public support remains `support@taxmate.uk`; Namecheap forwarding routes it to a private Microsoft Outlook destination that must not be disclosed.

Production remains blocked pending live ICO propagation, the verified correspondence address, Founder/legal approval, provider/retention configuration and isolated staging. See `LEGAL_PRIVACY_RELEASE_GATE_REPORT.md` and `KNOWN_LIMITATIONS.md`.
