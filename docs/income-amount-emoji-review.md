# Income amount and category icon correction

Local candidate: 2.1.30 / `2026-09-09.income-amount-emoji.1`. Baseline: released 2.1.29, merge `0f1656091e0f6e43ddfe9543a42547c8d4a2db31`.

The Founder has accepted the 2.1.29 startup/background-sync correction and the earlier checklist. This candidate addresses only the three subsequent income/category presentation issues.

## Changes

- Income totals explain full business receipts before ownership allocation. All-business totals describe combined full receipts without implying one shared percentage. Add and Edit income show the full-amount reminder beside Amount, and switching businesses refreshes the actual configured partnership share. Existing `user_share` and unconfirmed legacy bases get accurate alternative reminders; neither is silently converted. Stored amounts, shares, tax calculations and schema versions remain unchanged.
- The shared personal income/expense Amount wrapper places the pound sign and input in separate grid columns. They cannot overlap, including focused long values, RTL language settings and enlarged text. At a narrow viewport with 200% text, long values can scroll within the native input while the pound sign stays outside it.
- Income/Expense filters, entry rows and entry category selectors display saved category emoji. Custom records retain their existing `e`, names, IDs and business/entry associations. Built-in icon edits persist as optional `settings.categoryEmojis` overrides through the existing versioned account-settings metadata transport. Built-in definitions are not modified or recreated. Cancelling a category edit does not persist it.
- The category creation field restores the pre-2.1.26 native text/emoji input on touch devices. The 31-icon grid is limited to a fine pointer with hover. Desktop defaults to the folder icon; mobile starts with the original empty native field and an omitted icon still saves the established folder default. Income and expense categories support both selected and default icons.
- Release identity advances to 2.1.30. The sole Function change advances the existing Founder client-version ceiling; signed identity, provider and Pro checks are unchanged.

## Focused validation

`node tests/browser/income-amount-emoji.e2e.js`: 137 assertions PASS; 21 geometry records; 13 viewport screenshots inspected. Synthetic records cover 50% and 25% partnerships plus a sole trader, distinct saved custom icons, built-in categories, saved category names and an existing deletion marker. Checks cover All/single-business labels, Add/Edit and business changes, preservation on view/cancel, full 1000 becoming personal 500 at 50%, desktop selection/default folder paths, mobile native input, custom and built-in rename/save/reload, stale metadata and fresh-device metadata merge, six language reminders, legacy amount bases and a 320-pixel/200%-text amount field.

Direct dependency checks: 23 PASS across partnership personal share, sync reliability, state schema and release identity; 8 PASS for the existing Founder lookup/version gate. No accepted whole-checklist rerun.

All browser records are synthetic and all external requests are intercepted; SDK files are supplied locally and other requests are blocked. Actual app rendering, local persistence, metadata projection and metadata merge are exercised. This is not a live provider, payment or real-phone acceptance result.

The installed Playwright screenshot wrapper reset touch emulation. The focused test uses native CDP viewport screenshots and asserts that pointer/touch settings are unchanged before and after capture. An 80 ms test-only wait allows the existing sheet's 50 ms initial-focus callback to finish before focus geometry is measured; production startup timing is unchanged.

## Boundaries and limitations

No production account/receipt inspection or mutation, backup restoration, category migration, Rules deployment or public release was performed. Previously selected built-in emoji that the old code never saved cannot be recovered from absent data. This correction displays existing saved values and makes future edits durable; it does not claim to reconstruct unsaved private choices. Built-in overrides retain the current account-settings last-writer versioning contract.

The exact commit, reviewed artifact hashes and screenshot paths are recorded in `.hosting-build/ltd-status-evidence/income-amount-emoji-readiness.json` and `income-amount-emoji-review-for-work.md`. Work review and direct release authorization are pending.
