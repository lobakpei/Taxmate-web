# TaxMate Ltd V1.5 actual-app integration closeout

Date: 2026-08-28

Status: local candidate complete and awaiting independent source audit. This is not a production release approval.

## Identity boundary

- Frozen audited parent: commit `6edbec41af9ffac4a533c972ab131e22ee65fd88`, tree `9be0d17f7c0a05672ee0729b885a71fd671300aa`.
- Original production base: `da7092c15ff4eb565c46d0153f2a9e08cadc8079`.
- Current branch: `codex/taxmate-ltd-v1-5-actual-app-integration-20260828`.
- Exact frozen current commit/tree are generated after the local freeze and recorded in the outer audit pack, avoiding a self-referential commit hash inside its own tree.

## Actual TaxMate app integration

The approved Fable renderer and tokens are mounted by the real `index.html` application. `src/integration/ltd/TaxMateLtdProductionAdapter.js` binds the UI to the real TaxMate account/state lifecycle and `TaxMateLtdUIFacade`; production flow does not use `?mode=`, `?tier=`, `/api/snapshot`, `/api/action` or the localhost facade client.

The existing Home remains canonical. `+ Add a business` opens the two-stage chooser; Limited Company performs entitlement and one-company checks. Draft and completed Ltd rows appear inside `Your businesses`, then open the canonical onboarding resume point or Company Workspace. The renderer receives semantic state and triggers callbacks; it does not calculate ledger or tax truth.

## Trusted one-active-Ltd model

- Anchor path: `users/{uid}/ltdControl/activeCompany`.
- Trusted callable: `claimActiveLtdCompany`.
- Authentication, App Check outside Emulator Suite and effective Pro entitlement are required.
- The callable transaction atomically creates the anchor, resumes the same company id idempotently, and rejects a different company id.
- Firestore Rules require the trusted anchor before normal owner records can be written and prevent a client from creating/changing the anchor.
- Downgrade retains the anchor and data. Remove does not silently free the slot.
- Two clean same-account clients racing different ids produce one success, one safe failure, one anchor and no orphan active profile.

## Entitlement and downgrade truth

Every create, activate, edit, reverse, calculate, remuneration, scenario, ownership/company change, restore/import or outbound Ltd sync action is Pro-only. After downgrade the authenticated owner may still hydrate and open existing data read-only, export Data-only/Full Backup and download existing owned evidence. They cannot write, calculate, restore or enrich records. No company is deleted automatically.

The existing 24-month archive helper is a policy/timestamp/reminder calculation only. This candidate does not introduce a scheduled deletion lifecycle or claim that one exists.

## Canonical data and accounting boundary

- Integer-pence ledger events, balanced postings, exact-sum allocations, revisions, idempotency, reversal and record drill-down remain canonical domain concerns.
- Company income, company-paid and personally-paid expenses, shared allocation, founder/director loan movements and share capital all produce their specific canonical event types.
- Salary writes one linked company remuneration record and one personal-tax link; dividend declaration and payment are separate, with personal income linked only on the supported payment path.
- Ownership percentages do not become personal income. Company profit does not become personal income. Scenario comparisons are non-posting.
- Company corrections validate cross-field chronology. A dependent change returns review-required without silently replacing active facts.

## Companies House provenance

The API credential is declared and consumed only in the server callable. No credential is bundled in HTML, Firebase public configuration, the facade or preview fixtures. Found results retain the official name/date/status/type/public URL and timestamps separately from editable user facts. Not found/unavailable allows manual continuation without claiming verification. Editing verified name/date invalidates verified status and retains the previous official snapshot for checking again. Unsupported/dissolved/liquidated states are not treated as a supported active private company.

## Migration, sync and backup

- TaxMate 2.0.6 state migrates atomically and idempotently; legacy businesses/entries remain semantically unchanged; future schema fails closed; rollback snapshot/provenance is retained.
- Ltd sync uses owner-scoped, per-record versioned envelopes with deterministic conflict/revision semantics, authoritative tombstones, durable offline outbox and ACK before Synced.
- Clean-device inbound hydration works after downgrade, while outbound writes remain locked.
- Data-only and Full Backup round-trip Ltd relationships. Full Backup verifies manifest/hash integrity and required evidence binaries. Restore is isolated in acceptance tests and remains Pro-only.
- Partnership Partner Sync is not reused for Ltd.

## Hidden factual defaults

The complete result is in `docs/LTD_V1.5_HIDDEN_FACTUAL_DEFAULT_AUDIT_20260828.md`. Trading/CT/director/ownership/registration/treatment/evidence/confirmation facts are explicit or remain unknown/review-required. The actual app date comes from an injected runtime clock, not a preview date.

## Candidate identity

- Proposed app version: `2.1.0`.
- Build ID: `2026-08-28.ltd-v1-5-actual-app.1`.
- PWA cache: `taxmate-v2-ltd-v1-5-actual-app-1`.
- The production Hosting build includes every actual-app Ltd asset and is checked for consistent version/build/cache identity.

## Sentry incident and isolation

The 19:54:17 BST alerts were genuine localhost candidate module-load errors caused by `revision-sync.js` loading after its dependants. Script order is corrected and guarded. Production Sentry now loads only on the allowlisted production host/configuration; localhost, `127.0.0.1`, emulators, automated browsers and Founder local preview request no production Sentry transport. Privacy scrubbing remains fail-closed. Full evidence is in `docs/SENTRY_LOCAL_TEST_ISOLATION_AND_195417_DIAGNOSIS_20260828.md`.

## Mandatory 40-journey evidence map

1. Legacy Home: four existing businesses and 79 entries preserved.
2. Add Business → Limited Company: actual Home button and approved UI mount.
3. Registered journey: Steps 1–5 through canonical create.
4. Not-yet-registered: durable draft with no invented official facts.
5. Save/resume: Home row returns to exact saved route.
6. One-active-Ltd: existing anchor opens existing company; second claim blocked.
7. Cross-device race: one success, one safe failure, no orphan.
8. Companies House found: verified official fixture/provenance.
9. Not found: manual unverified continuation.
10. Unavailable: retryable/manual unverified continuation.
11. Verified fact edit: verification removed and official snapshot retained.
12. Income: canonical company-income event.
13. Company-paid expense: canonical event.
14. Personally-paid expense: canonical loan/evidence treatment.
15. Shared expense: exact-penny allocation and only Ltd share posted.
16. Director/founder loan: funding and repayment events.
17. Share funding: share-capital event with evidence.
18. Salary: linked company and personal records exactly once.
19. Dividend: distinct declaration and payment.
20. Scenario: semantic comparison with no actual-book mutation.
21. Corporation Tax: canonical period/record estimate.
22. Ownership correction: effective-dated history.
23. Record detail/correction: exact event, reversal/replacement semantics.
24. Reload: profile/ledger/convergence persist.
25. Clean device: profile and records hydrate.
26. Offline/outbox: local write survives, reconnect retries, ACK before Synced.
27. Data-only backup: isolated identical relationship restore.
28. Full Backup: manifest/hash and isolated relationship restore.
29. Pro: full active actions.
30. Free/Plus: create/active actions blocked with no anchor.
31. Expired Pro: read/hydrate/export allowed; write/restore blocked.
32. Six locales: en, zh-HK, pl, ro, es, ur.
33. Urdu RTL: direction and layout asserted.
34. Mobile: 390×844.
35. Desktop: 1440×1000.
36. Light/dark: workspace remains visible.
37. Overflow: no unexpected horizontal overflow on mobile/desktop.
38. Runtime health: zero fatal page/console errors.
39. Isolation: zero production/third-party/Sentry request.
40. Existing Web regression: characterization, unit, integration, source rules, emulators, Paid Sync, health and plan gates all green.

## Verification summary

- `npm test`: characterization 4/4; unit 132/132; integration 7/7; rules-source 6/6; Ltd 58/58; Product Health PASS; Plan Contract PASS.
- Functions emulator: 8/8 PASS.
- Firestore/Storage emulator: 16/16 PASS.
- Actual-app browser: 95 assertions PASS.
- Paid Cloud/Partner Sync browser: 90 assertions PASS.
- Isolated Founder Preview browser: 35 assertions PASS.
- Product Health: REAL_DURABLE 85, INTENTIONALLY_HIDDEN 6, all defect counters zero.
- Plan Contract: features 21, plan tiers 3, receipt locales 6, server-enforced 2, Ltd Pro-only 1.

## Remaining genuine pre-release gates

1. Independent source/audit-pack review and Founder acceptance.
2. Founder decision for Pro annual pricing; no annual offer is exposed or inferred meanwhile.
3. Separately authorised production billing alignment for the approved Ltd Pro launch/standard monthly position; no Stripe price id was changed here.
4. Live Companies House credential/configuration and smoke verification under a separately authorised release gate.
5. Release-time identity/drift check, production migration/rollback preflight, authorised Functions/Rules/Hosting deployment and post-deploy fresh/upgrade/offline verification.

No other local implementation blocker is known.

## Founder actual-app review

From the frozen candidate source:

```powershell
npm ci
npm run preview:ltd:actual-app
```

The command starts Firebase emulators and the real `index.html` app on `http://127.0.0.1:4177/`, runs the production-shaped setup, opens Chrome for review and stops with Ctrl+C. It uses no production provider or production Sentry transport.

## Authority and cost

- source work: current local candidate only
- local commit: authorised for candidate freeze
- push / PR / merge / deploy: NO
- production Firebase or bookkeeping mutation: NO
- production TaxMate 2.0.6 modification: NO
- Native / Mobile PR #2 / SEO / P10: NO
- live Companies House or Stripe operation: NO
- actual incremental cost: GBP 0
