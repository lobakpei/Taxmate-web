# W0–W5 Founder Preview Package

Baseline identity is documented in `W0_BASELINE_IDENTITY.md`: commit `745f7497d374f000870c4a7a111130008f8945a7`, tree `4726b48f89150782f50e6227226c227c13765212`, with exact live/Git asset reconciliation.

Candidate branch is `codex/taxmate-modernisation-20260817`. Runtime identity is app `2.0.0-preview.2`, build `2026-08-17.w0-w5.2`, state/sync schema 5, tax rules `2026-27.2026-08-17.1`, form map `2025-26.2026-04-06.1`, PWA cache `taxmate-v2-preview-2`. The final Git commit/tree are reported at handoff because a commit cannot contain its own hash.

W1 replaces tax/MTD/POA/form truth with sourced, versioned modules and strict remote validation. W2 adds schema migration, portable restore validation, deterministic item sync, tombstones and auditable Firebase rules. W3 replaces fake client unlocks with Stripe/server entitlement architecture and aligns privacy/telemetry. W4 extracts only changed cores. W5 restores zoom/focus, hardens the PWA and headers, and adds the SEO/legal foundation.

W5.5 adds a versioned portable ZIP containing validated TaxMate JSON, a SHA-256 receipt manifest and the actual linked/orphan receipt binaries. Restore validates the complete archive before mutation, previews counts, downloads a full pre-restore ZIP, uploads every receipt before replacing state and removes only newly uploaded files on failure. Existing JSON backups remain supported.

W5.6 externalizes executable scripts, replaces executable HTML event attributes with inert declarative actions handled by an allow-listed external dispatcher, vendors JSZip, and moves Hosting to an enforcing CSP. `script-src` has no wildcard, `unsafe-inline` or `unsafe-eval`; `script-src-attr 'none'` is enforced. Inline styles remain allowed to preserve the frozen UI. External account and telemetry endpoints still require isolated staging verification before release.

The supporting reports in this directory, evidence trees, full automated suite and `UI_POLISH_CANDIDATES.md` are the coherent candidate package. No production merge, rule deployment or production deployment occurred. Stop remains the Founder / UI Review Gate.
