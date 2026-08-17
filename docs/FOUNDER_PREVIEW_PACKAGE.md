# W0–W5 Founder Preview Package

Baseline identity is documented in `W0_BASELINE_IDENTITY.md`: commit `745f7497d374f000870c4a7a111130008f8945a7`, tree `4726b48f89150782f50e6227226c227c13765212`, with exact live/Git asset reconciliation.

Candidate branch is `codex/taxmate-modernisation-20260817`. Runtime identity is app `2.0.0-preview.2`, build `2026-08-17.w0-w5.2`, state/sync schema 5, tax rules `2026-27.2026-08-17.1`, form map `2025-26.2026-04-06.1`, PWA cache `taxmate-v2-preview-2`. The final Git commit/tree are reported at handoff because a commit cannot contain its own hash.

W1 replaces tax/MTD/POA/form truth with sourced, versioned modules and strict remote validation. W2 adds schema migration, portable restore validation, deterministic item sync, tombstones and auditable Firebase rules. W3 replaces fake client unlocks with Stripe/server entitlement architecture and aligns privacy/telemetry. W4 extracts only changed cores. W5 restores zoom/focus, hardens the PWA and headers, and adds the SEO/legal foundation.

The supporting reports in this directory, evidence trees, full automated suite and `UI_POLISH_CANDIDATES.md` are the coherent candidate package. No production merge or deployment occurred.
