# TaxMate 2.1.29: preserve the foreground during background sync

Local review candidate. App `2.1.29`, build `2026-09-09.startup-sync.1`, cache `taxmate-v2-startup-sync-20260909-1`. Based on released and Founder-accepted 2.1.28, merge `6450a4fdb7bf66642edd3a27cf7444951302cb09`. The previous acceptance checklist remains accepted; it is not repeated by this correction. Publication and production account changes are not part of this work.

## Cause and resulting behavior

The released code conflated account activation with refreshing an already active account. It forced activation around asynchronous control reads, disposed the LTD adapter and closed surfaces. Hydration presentation also resumed persisted onboarding intents, while snapshot callbacks replaced page and LTD DOM trees. Separately, a `billing=success` or `billing=cancelled` query created an unowned return flag that opened Change Plan after hydration; it did not require a checkout started by the current account. A persisted tab could also override ordinary Home entry.

Controlled reproduction against the locked 2.1.28 artifact demonstrates all five effects. Each scenario requests the document once; the apparent refresh in this reproduction is DOM replacement, not a document reload. No private account, browser storage, payment or Founder URL was inspected, so the reproduction does not assert which return marker or saved intent was present in the Founder's session.

Ordinary account entry now chooses Home once. Later same-account control checks, hydration and personal/LTD/partnership snapshots update the visible route in place. The current DOM controls, typed values, selection, focus, scroll and open sheets remain. Native LTD event handlers receive the new snapshot without replacing the focused control. Actual user navigation continues to use its normal render path. The initial safety read still picks up newer account bytes saved by another tab, without a second UI activation.

A persisted onboarding draft remains stored but cannot by itself launch a flow on ordinary entry. An active user-requested continuation or valid checkout return can resume it. Intervening foreground interaction cancels an old automatic continuation. An already-open onboarding form also survives hydration of an otherwise empty account.

Opening Checkout records a return marker in the current account's tab/session scope. A return must match that owner, be no older than 24 hours and be consumed once. An unowned, expired or already-used marker cannot open plans. If the user navigates or edits while the return is hydrating, their current operation wins. An owned return remains usable after a failed first hydration; an onboarding return resumes its intended setup without subsequently opening plans. Entitlement still comes from the existing trusted backend.

## Boundaries

Account switching, server reset epochs, deletion locks and retention controls keep their existing isolation and write restrictions. A real safety-boundary change can still close an obsolete account surface. Ordinary reconnect checks do not perform an account transition. Sync failures remain failures and retain their retry/error status. No startup sleep, reload, sync suppression, new data schema or bookkeeping calculation is introduced.

The sole backend source change is the existing `lookupCompaniesHouse` Founder client-version ceiling, from 2.1.28 to 2.1.29. UID, email, provider and Pro guards are unchanged. No Firestore Rules, Storage Rules, LTD setup transactions, billing backend, account reset, receipt handling or legacy migration changes are included.

## Focused evidence

- Five before-correction browser scenarios fail against the retained 2.1.28 artifact, with one document request each.
- The focused browser suite covers ordinary Home entry; stale tab/intent/return state; delayed hydration; displayed data and local persistence; navigation, scroll, focus and typed inputs; partial dates and open setup sheets; reconnect failure and recovery; valid checkout success/cancellation and onboarding returns; return after failed hydration; intervening user navigation; account switching; reset/deletion controls; empty-account onboarding; and newer local bytes from another tab.
- Related account-storage, onboarding contract, sync-runtime, release-identity and Founder alias checks run as one bounded dependency set. Stale source-shape and historical release-identity assertions were updated to the current contract.

Exact results, candidate commit/tree, source and artifact hashes are recorded in `.hosting-build/ltd-status-evidence/startup-sync-readiness.json` and `startup-sync-review-for-work.md`. Reproduction sources are `tests/browser/startup-sync.e2e.js` and the five named unit test files. Browser evidence uses an isolated local Chrome profile, controlled synthetic provider reads and synthetic outbound transport; inbound merge, account controls, local persistence and UI code are actual application code. External requests are blocked. This is not provider or real-phone acceptance.

## Future release scope

After Work review and direct approval of the final commit: push and merge that exact candidate, verify its merged tree, deploy only `lookupCompaniesHouse` to `taxmate-uk-2`, then Hosting from the locked artifact. Firestore and Storage Rules and all other Functions remain outside this candidate's release scope. Verify the deployed build/cache and file fingerprints separately from Founder live acceptance.
