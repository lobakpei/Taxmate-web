# Expense amount basis and entry title emoji

Local candidate: 2.1.31 / `2026-09-10.expense-basis-row-emoji.1`. Baseline: released 2.1.30, merge `d2837ee9520994c23b5379a40c3147b8ce3096ac`.

This candidate addresses two presentation corrections: expense amount-basis wording and the position of saved category emoji on income and expense rows.

## Changes

- Expense totals explain that business-use percentages have already been applied, while whole-business amounts remain before ownership allocation. Add and Edit request the raw expense before percentages and display business use separately from the configured ownership share. Switching businesses or business-use percentage refreshes the reminder. Existing `user_share`, `legacy_unconfirmed`, and mixed All-business views retain their own accurate wording. All six supported languages include these reminders.
- Income and expense rows place the saved built-in or custom category emoji beside the primary description, or beside the category name when no description exists. The subtitle retains date, category, business and business-use details without repeating the emoji. Existing category names, IDs, overrides and associations are preserved.
- Native phone emoji input, the desktop picker, the separate currency/input columns and accepted startup/background-sync behavior are unchanged.
- Release identity advances to 2.1.31. The only Function change advances the existing Founder client-version ceiling from 2.1.30 to 2.1.31; identity, provider and Pro checks are unchanged.

Amounts, business-use calculation, ownership allocation, tax calculations, persistence, deletion markers and state/sync schema versions are unchanged. For example, raw expense 1000 at 25% business use remains 250 in the expense list; 50% ownership subsequently produces personal expense 125.

## Focused validation

`node tests/browser/expense-basis-row-emoji.e2e.js`: 149 assertions PASS, two amount geometry records, eight phone/desktop viewport screenshots inspected, and zero uncaught browser errors. Synthetic fixtures cover built-in/custom and described/undescribed entries in both lists; saved icon overrides and names; whole partnerships at 50% and 25%, sole trade, user-share, unconfirmed legacy and mixed All-business bases; Add/Edit at 25%, 50% and 100% business use; six languages; native touch input versus desktop selection; and unchanged stored data after viewing, cancelling and reloading.

`node --test tests/unit/release-identity.test.js tests/unit/founder-production-alias.test.js`: 9 tests PASS. Syntax and whitespace checks PASS. The older income browser test's obsolete hidden-expense-hint expectation is aligned with the new visible reminder; that broader suite and the accepted whole checklist were not rerun.

All browser data is synthetic. External requests are intercepted, Firebase SDK files are supplied locally, and other external requests are blocked. This validates actual app rendering and local persistence, not real-phone, signed-in production or provider acceptance. Native CDP viewport screenshots preserve touch emulation; the test asserts unchanged pointer mode around capture. The test-only 80 ms wait permits the existing 50 ms sheet-focus callback to finish; production timing is unchanged.

## Review and release boundary

This is a local candidate pending Work review and direct Founder release authorization. No push, PR, merge, deployment or production account/receipt inspection or mutation is part of this correction. Other Functions and Firestore/Storage Rules are unchanged. After separate release approval, the required deployment order is `lookupCompaniesHouse` on `taxmate-uk-2`, then Hosting.

Exact commit/tree identity, source and tested artifact hashes, logs, screenshots and limitations are recorded in `.hosting-build/ltd-status-evidence/expense-basis-row-emoji-readiness.json` and `expense-basis-row-emoji-review-for-work.md`.
