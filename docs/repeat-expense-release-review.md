# Repeat expense checkbox release preparation

Candidate: **2.1.32** / build `2026-09-10.repeat-expense-checkbox.1` / cache `taxmate-v2-repeat-expense-checkbox-20260910-1`. State and sync schemas remain 5.

Work accepted the focused local correction at `b985c628bc01b6b984f7ea27225963052981feb5`, based on accepted Web merge `e4cef95ea7cadd3138af812dcc3cc39562285c51`. This follow-up changes only release markers, the corresponding release-identity expectation, the existing Founder lookup client-version ceiling, and this review document.

## Behavior included

Repeat expenses start with empty checkboxes; checked months are included. The selected count and month/year preview explain the batch. Empty selection prompts without creating a record. Twelve selected valid months create twelve rows; the original month counts once and is included only when checked. Business/category/percentage repaint preserves repeat selection, and a receipt-reserved ID still follows the new-record batch path. Short months clamp to month end; early-April dates remain within the selected tax year. Existing repeated-row edits and ordinary entries retain their established paths.

The prior one-row failures were reproduced with synthetic data: clicking all initially selected buttons emptied the selection and triggered a single-row fallback; repaint also disabled repeat. Founder's exact device sequence was not inspected. No old companies, accounts, receipts, tombstones or historical records were inspected, removed or backfilled.

## Validation

- Accepted correction evidence: 12/12 focused browser scenarios PASS_LOCAL_SYNTHETIC with zero uncaught page errors; English/Chinese screenshots inspected by implementation, with Work directly reviewing the Chinese screenshot. Six-language coverage is local evidence.
- Release preparation: existing `release-identity.test.js` and `founder-production-alias.test.js`, **9/9 PASS**. These validate the coherent 2.1.32 markers and the unchanged identity/provider/Pro controls with synthetic dependencies.
- Isolated production Hosting artifact built locally. Release evidence checks source/artifact identity and confirms the accepted app logic and browser-test source remain unchanged; the accepted index differs only in its build comment. No repeat browser rerun or historical full suite was needed for marker-only preparation.
- No checked-in GitHub Actions workflow exists in this Web checkout. Remote required-check configuration was not queried and must be read during the authorized release preflight; no checks may be bypassed based on this local report.

Detailed local evidence is in `.hosting-build/repeat-expense-review/`: the original `REVIEW_FOR_WORK.md`, `baseline.json`, `result.json`, screenshots and `checksums.json` remain the accepted correction evidence. `release-checks.log` and `release-readiness.json` identify this preparation separately. The isolated artifact is `.hosting-build/repeat-expense-release-2-1-32/`.

## Release scope awaiting Founder approval

After approval of the final exact commit: push the candidate, create and merge its PR into public `lobakpei/Taxmate-web`, then deploy only `lookupCompaniesHouse` to `taxmate-uk-2`, followed by Hosting. The sole Function change raises its existing supported client ceiling from 2.1.31 to 2.1.32 so the new frontend stays compatible. Other Functions and Firestore/Storage Rules have no changes.

This preparation performs no push, PR, merge, deployment, Actions run or Mobile build. Real-device, provider and signed-in production acceptance remain NOT RUN. Existing Android APK 2.1.31/build3, run `34487354229`, does not include the repeat correction; Mobile integration/build requires separate authorization.
