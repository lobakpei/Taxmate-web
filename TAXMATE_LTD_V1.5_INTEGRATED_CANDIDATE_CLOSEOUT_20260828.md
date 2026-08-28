# TaxMate Ltd V1.5 Integrated Candidate Closeout — 2026-08-28

## Outcome

`TAXMATE_LTD_V1.5_INTEGRATED_CANDIDATE_READY_FOR_FOUNDER_PREVIEW`

This is a localhost-only integrated candidate. It has not been pushed, opened as a PR, merged, deployed, or connected to production Firebase. Native, SEO, P10 and the production TaxMate 2.0.6 runtime are unchanged.

## Input and baseline identity

- Fable handoff: `TAXMATE_LTD_V1.5_FABLE_100_PERCENT_HANDOFF_TO_CODEX_20260826_4.zip`
- Handoff bytes: `190174`
- Handoff SHA-256: `89C0980F150087AD142490B0748175DFF488703C8D7266983F348DC7CFE761CA`
- Handoff archive safety: `35` entries, `0` unsafe paths, internal manifest `24/24` exact
- Canonical Web base: `origin/main` commit `da7092c15ff4eb565c46d0153f2a9e08cadc8079`, tree `0d72fd6d52d6206c62179a66f44b215934154415`
- Isolated branch: `codex/taxmate-ltd-v1-5-integrated-founder-preview-20260828`
- P9.5 structural/domain reference: commit `d3a6b28c36c2d18de335aa154885603cfdeeebf0`, tree `ac6fad28659731b2421c99fdaf0e4d8d86e07516`
- Facade contract: `taxmate-ltd-ui-facade.3`
- Candidate state: `INTEGRATED_CANDIDATE`

The exact final candidate commit and tree are reported alongside this file after the local freeze commit.

## Integrated behaviour

- Preserved the Founder-approved Fable layout, component language, typography, colour tokens, hierarchy, navigation, responsive behaviour, light/dark modes, six-locale layout and Urdu RTL.
- Replaced the old preview driver with `CanonicalCompanyDriver` and a validated, atomic company-state repository over the isolated canonical company schema.
- Kept all accounting, tax, ledger, ownership, validation, persistence, route and busy/error/review state behind `TaxMateLtdUIFacade`; the UI receives semantic data only.
- Implemented the registered Step 1 order and an optional real Companies House API provider. A successful lookup fills editable fields and exposes the public register URL; unavailable/not-found states fail safely without inventing facts.
- Implemented the explicit unregistered Step 2 path, canonical period planning, official-date override, director and ownership facts, Step 4 factual review and direct Step 5 correction routes.
- CT review is progressive and factual. Unanswered questions block calculation; `Not sure` returns `Needs checking` with no calculation. Confirmed facts use canonical company-tax rules.
- Shared expenses preserve gross value and every allocation leg, require an exact sum, and post only the Ltd share. Unsupported company-paid cross-business cases are stored as review drafts with no journal.
- Salary requires exact payroll results and explicit factual confirmations. Dividend declaration and payment are separate actual-book actions. Scenario comparisons are non-posting and require explicit facts, evidence and an exact user-supplied mix.
- Company correction validates chronology and dependent records fail closed. Ownership changes are effective-dated. Record correction is atomic, reversible and same-identity for draft edits.
- Unknown Ltd routes show a safe recovery state with Back and All businesses; they never silently fall through to Home.
- All identifiers used for persisted company actions are stable/deterministic or generated at the canonical action boundary; no UI-generated accounting truth is accepted.

## Verification

- Ltd facade/domain/i18n/security boundary: `38/38 PASS`
- Complete existing Web gate: `165/165 PASS`
  - characterization `4/4`
  - unit `128/128`
  - integration `7/7`
  - Firestore/Storage rules emulator `15/15`
  - Functions emulator `6/6`
  - rules source `5/5`
- Product Function Health: `PASS` — `REAL_DURABLE=85`, `INTENTIONALLY_HIDDEN=6`, all broken/shell/dead/duplicate/misplaced/mislabelled counts `0`
- Plan Feature Contract: `PASS` — `features=20`, `plan_tiers=3`, `receipt_locales=6`, `server_enforced=2`
- Ltd locale dictionaries: English, Hong Kong Chinese, Polish, Romanian, Spanish and Urdu each contain `447` canonical + `46` design keys; exact key parity and zero fallback confirmed.
- Real-browser Founder Preview:
  - Fresh registered Ltd Step 1–5 through canonical company creation
  - info overlay/back draft preservation and custom calendar
  - Step 4 `Not sure` still permits bookkeeping while preserving review state
  - Home with four legacy partnerships plus ToodaLoop Ltd
  - Overview, Money, Tax and Records
  - record detail/correction, company correction and effective-dated ownership
  - shared expense `£100` allocated Ltd `£60`, Evri `£30`, private `£10`, with only `£60` posted to Ltd
  - canonical CT result and truthful CT `Not sure` no-calculation state
  - explicit salary/dividend/mix/retained-profit comparison without changing actual books
  - actual salary, dividend declaration, dividend payment and working-pack download
  - mobile `390×844`, desktop `1280×720`, light/dark and Urdu RTL with no horizontal overflow, missing-copy sentinel, fatal error or Home bounce

## Founder Preview

From the isolated worktree:

```powershell
npm run preview:ltd
```

- Fresh Ltd Review: `http://127.0.0.1:41742/?mode=fresh&reset=1&locale=en&theme=light`
- Existing Ltd Review: `http://127.0.0.1:41742/?mode=existing&reset=1&locale=en&theme=light`
- Reset: use the visible `Reset` control or reload the relevant URL with `reset=1`.

The harness binds only to `127.0.0.1`, applies a deny-by-default CSP, uses sanitised deterministic fixtures and has no Firebase, Sentry, Google Sign-In, billing, analytics, service worker or production-provider connection. Receipt evidence is reference-only; no production receipt URL or token is present.

For a real Companies House lookup during local review only, set `COMPANIES_HOUSE_API_KEY` in the launching shell. No API key is bundled or logged. Without it, the UI truthfully permits manual entry and shows the provider-unavailable state.

## Production and authority proof

- production runtime protected diff (`public/`, `functions/`, Firestore/Storage rules, Firebase config): `0`
- production data write: `NO`
- production Firebase change: `NO`
- production TaxMate 2.0.6 sync/storage/backup/entitlement/rules change: `NO`
- Native change: `NO`
- SEO change: `NO`
- P10: `NOT AUTHORISED`
- push: `NO`
- PR: `NO`
- merge: `NO`
- deploy: `NO`
- incremental billable cost: `£0`

Stop after the local freeze and Founder Preview handoff.
