# Ltd V1.5 hidden factual-default audit

Date: 2026-08-28

Scope: onboarding, company profile, ownership, registration verification, company bookkeeping inputs, tax/accounting treatment, evidence and confirmations in the actual TaxMate app integration.

## Removed or prohibited factual defaults

| Fact | Current source-truth behaviour |
|---|---|
| Trading status | No `values.tradingStatus || 'trading'`. Missing input returns stable `answer_required`; unregistered drafts keep the fact absent. |
| Corporation Tax status | Must be supplied explicitly. `Not sure` is persisted as the user's factual uncertainty and results in review-required/no calculation where relevant. |
| Director status | Must be `yes`, `no` or `not_sure`; never hard-coded `true`. `no` and `not_sure` remain resumable factual draft/review states. |
| Ownership | Shareholders and basis points must be supplied and total exactly 10,000. A sole shareholder may own 100%; no fake second shareholder is created. |
| Registration | `not_available` creates a real unregistered draft with no company number, incorporation date, trading status, period or Corporation Tax facts. |
| Companies House verification | Manual, not-found and unavailable data is never promoted to `verified`. Editing a verified name/date away from the official snapshot invalidates the verified status while retaining the official snapshot separately. |
| Tax/accounting treatment | Missing or ambiguous company-use/treatment facts remain unknown or review-required; no supported deduction or posting is inferred. |
| Evidence | An empty evidence list means no evidence was supplied. Engines block or return review-required wherever evidence is mandatory; they do not invent a reference. |
| Confirmations | A confirmation is true only when explicitly `=== true`. Missing/false remains unconfirmed and cannot be silently promoted. |

## Permitted non-factual defaults

These values carry no user/accounting fact and do not change tax truth:

- empty strings used only to render or validate an unanswered input;
- empty arrays/objects used as containers for absent answers, evidence or review flags;
- generated stable record/action identifiers at the canonical domain boundary;
- device identity used only for revision/sync metadata;
- the injected runtime clock for `currentDate`/`asOfDate` where a system observation date is required;
- UI route, theme, locale and presentation state;
- non-posting scenario row identifiers and display ordering.

Legacy sole-trader share presentation may retain the pre-existing canonical 100% representation. It is not reused as a Ltd ownership answer.

## Targeted evidence

- `tests/production-integration-candidate.test.js`: missing trading status, unregistered draft, sole 100% owner, director No/Not sure, verification provenance, granular field errors and correction fail-closed behaviour.
- `tests/browser/ltd-actual-app.e2e.js`: actual-app registered and unregistered journeys, explicit Step 2/3/4 facts, Companies House found/not-found/unavailable fixtures, ownership change and no hidden runtime date.
- `src/integration/ltd/CanonicalCompanyDriver.js`: factual validation and canonical action boundary.
- `src/integration/ltd/TaxMateLtdUIFacade.js`: stable semantic field-error/copy keys; no UI-side validator recreation.

Result: no audited Ltd factual input is silently converted into a tax/accounting fact. Unknown remains unknown, field error or review-required.
