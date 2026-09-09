# TaxMate 2.1.28: LTD status and unfinished setup

Local candidate only. Version `2.1.28`, build `2026-09-09.ltd-setup-exit.1`, cache `taxmate-v2-ltd-setup-exit-20260909-1`. Based on released 2.1.27 and the first two presentation changes in `adf68190a60e54cf70fdb94e1b3e085745033ad7`. The final commit and evidence hashes are recorded in the local release-readiness manifest. This document does not authorize publication, deployment or production account changes.

## Resulting behavior

Pay yourself distinguishes known non-positive distributable profit from unknown, stale or missing information. An eligible dividend keeps the existing calculation and declaration flow. Today lists actual current tasks and their actions instead of the empty yellow warning; absent draft answers and old action results cannot manufacture tasks.

Steps 1–5 no longer contain the shared Details → Remove company footer. Cancel, the first step's Back, and home exits offer Keep draft and exit, Remove this unfinished draft, and Keep editing. Back between numbered steps works after a reload as well as during the original visit. Keeping preserves current inputs and the resume step, including unfinished dates. The account home provides a resume entry even before a slot has been claimed.

A pre-claim draft is device-local in the account-scoped setup/answer store. Restoration merges only its profile and entity into the latest canonical account state; the stored draft contains no account snapshot. A draft that has never attempted a claim can be removed locally. Before sending a claim, its identity and attempted-claim state are persisted so a lost response cannot turn a server claim into an apparently local-only draft.

## Trusted setup lifecycle

New clients claim with `ltd-setup.1`. `claimActiveLtdCompany` creates a `setup_pending` slot together with two canonical seed documents in one transaction. The request remains owner/Pro gated. Seed identities, checksum, shape, draft status and absence of receipt references are checked. Reusing an existing or retired identity is rejected.

`manageLtdSetup` provides inspect, complete and discard actions. Inspection checks the owner, exact company, trusted stage, retention/reset state and all 17 LTD collections. It requires the canonical company/profile, rejects confirmed/deleted profiles and any bookkeeping, tax, payment-account, invoice, asset, bank or receipt-bearing records. Its version token covers the actual Firestore document update times and account-control versions. Mutations repeat the checks inside a transaction.

Step 5 marks the matching slot `setup_completed` before persisting the confirmed profile and payment accounts. This transition is idempotent and cannot be reversed by a client. Firestore Rules allow pending slots to write only setup metadata for the matching company; confirmed profiles and financial writes require completed stage. Rules retain the existing owner, Pro, active-slot, retention and receipt-admission checks.

A confirmed discard writes tombstones only to that unfinished company's profile and entity, releases only its matching slot and records an immutable outcome under `ltdSetupOutcomes`. Other companies, records, receipts and deletion markers remain unchanged. If a claim's response was lost before a slot existed, the transaction can retire that unused identity without deleting another slot; a later claim cannot revive it.

The client clears the draft only after a confirmed result. Uncertain results retain answers and the original operation ID/version; reopening the exit choice retries that same authorized operation. A stale-version rejection requires a new review and choice. Recovery also works if cloud sync delivered the tombstone before the callable response. Server-owned discarded outcomes retire only matching setup metadata from this owner's upload queue; financial and other-account operations are retained. The next ordinary Pro setup gets a fresh identity.

## Compatibility and limits

- Existing slots without the protocol marker remain legacy. The exit sheet explains that removal is unavailable; keeping and continuing remain available. No legacy slot is classified, migrated or released automatically.
- Existing completed-company removal keeps its general removal policy and retained slot. Tax/dividend calculations, eligibility decisions, older company data and receipt handling are unchanged.
- Pre-claim drafts and unsaved per-step answers are local to that device. Cross-device draft recovery is not included.
- Old clients can continue using legacy slots. An old client cannot persist confirmation or financial writes for a new pending slot; it needs the updated application to complete that setup. Keep the new Rules and Functions after any new-format slot exists; reverting those protections is not a safe rollback.
- Local synthetic evidence is not signed-in production, provider or real-phone acceptance. No production data was used in these tests.

## Verification

- 62 focused unit, facade, integration, localisation and release-identity checks: PASS.
- 8 Founder alias/version-gate checks: PASS. Only the supported version ceiling changes to 2.1.28; identity, provider, email and Pro guards remain.
- 9 real Firestore emulator test groups: PASS. These exercise transactions, denied and admitted client writes, a complete five-step driver round trip, immutable completion, version conflicts, legacy policy, financial/receipt guards, lost-response retries, fresh identities and preservation of historical data/document versions. Callable authentication is synthetic; no live provider is involved.
- 11 status-message mobile UI scenarios: PASS; viewing/navigation preserve the synthetic records.
- 13 setup-exit mobile UI scenarios: PASS, using a fresh isolated Chrome profile and real production adapter, driver, facade and renderer with synthetic RPC responses. External requests are blocked. Covers local resume entry, same answers/identity, focused date saving, step Back, remove/new identity, uncertain retry, completion/general removal, legacy limitation, Chinese and Urdu layout.
- Production push/PR/merge/deployment for 2.1.28: NOT RUN.
- Real account or phone acceptance for this candidate: NOT RUN.

Reproducible sources are `tests/unit/ltd-setup-exit.test.js`, `tests/rules/ltd-setup.test.js`, `tests/browser/ltd-setup-exit.e2e.js` and `tests/browser/ltd-status-messages.e2e.js`. Local evidence is under `.hosting-build/ltd-status-evidence/`, including the test logs, UI result JSON and screenshots. The Firestore suite asserts the isolated demo project and `127.0.0.1:48388` emulator before running.

## Exact future release scope and order

After review and direct approval of the final commit in this engineering task:

1. Push that commit to the public `lobakpei/Taxmate-web` repository, create and merge its PR, then verify the merged tree matches the approved candidate.
2. On `taxmate-uk-2`, deploy only `claimActiveLtdCompany`, the new `manageLtdSetup`, and `lookupCompaniesHouse`. The lookup change admits the new frontend version through the existing Founder gate. Use the established Functions discovery timeout of 60 seconds.
3. Deploy `firestore:rules` for the pending/completed guard and immutable outcome access.
4. Deploy Hosting last, from the locked merged artifact. Verify version/build/cache and deployed artifact hashes, then report production deployment separately from live account/phone acceptance.

No scheduled tasks, Storage Rules, billing Functions, account resets, legacy migrations or further one-time Founder slot removals are part of this release. The already-completed 2.1.27 publication and approved one-time slot removal are not repeated.
