# Final Integrated Founder Preview Package

Production baseline remains commit `745f7497d374f000870c4a7a111130008f8945a7`, tree `4726b48f89150782f50e6227226c227c13765212`. A read-only GitHub check on 18 August 2026 confirmed `refs/heads/main` still points to that commit.

Candidate branch is `codex/taxmate-modernisation-20260817`. Runtime identity is app `2.0.0-rc.1`, build `2026-08-18.final-ui-freeze.1`, state/sync schema 5, tax rules `2026-27.2026-08-17.1`, form map `2025-26.2026-04-06.1`, PWA cache `taxmate-v2-rc-1-final-ui-freeze`. The final Git commit/tree are reported at handoff because a commit cannot contain its own hash.

The package retains the completed W0–W5.6 engineering programme: versioned tax/form truth, deterministic migration/sync/tombstones, server entitlement architecture, portable receipt-binary ZIP restore, enforcing CSP with external executable scripts, PWA hardening and the Founder-approved UI integration.

Final UI freeze adds only the approved fixes: Home spacing, Google-only authentication UI/provider, green light-mode Tax hero, floating-plus centring, and one independent promotion-code entry above every plan. Apple Sign-In is intentionally removed and is not a release requirement.

Run `node scripts/preview-server.js`, then open `http://127.0.0.1:4173/`. The integrated local gate is 75/75 and the final browser matrix passed. External staging remains a release blocker as detailed in `STAGING_EXTERNAL_SERVICE_REPORT.md`. No production merge, rule/Functions deployment, Stripe configuration, migration or production deployment occurred.
