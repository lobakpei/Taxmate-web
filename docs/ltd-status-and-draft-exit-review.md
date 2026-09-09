# LTD status messages and draft-exit review

This candidate changes presentation for the first two approved items. It does not change tax, dividend, eligibility, confirmation, entitlement, claim, release or deletion rules. It is based on released 2.1.27 and has not been published. The requested draft-exit replacement is not implemented in this candidate because the existing draft/slot lifecycle cannot safely provide its remove-and-start-again behavior.

## Implemented behavior

- Pay yourself distinguishes a known non-positive distributable position from an unknown amount. A known non-positive retained position is a neutral explanation. A cash constraint or another zero amount is not relabelled as a lack of profit. Unknown values remain unknown.
- Uncalculated, stale, incomplete and unavailable Corporation Tax states have different labels. Missing tax facts use the existing question labels and lead to the existing tax-review operation. An eligible dividend still uses the existing declaration and confirmation flow.
- Today shows actual current tasks with direct actions instead of the bare yellow “Please check” strip. The first three tasks are visible, with an entry to the remaining actual tasks. Bank matching opens the matching operation; tax work opens the calculation; statutory items open their corresponding checklist item.
- Tasks are derived from the current projection, current company-year reasons and current statutory blocking items. The renderer no longer manufactures director tasks from absent UI answers or reuses an earlier action result as current work. An empty current reason set has no warning strip.

## Local evidence

The isolated browser test builds the real application, uses synthetic local records, real company projections and the actual facade/renderer, blocks external requests, and checks that viewing and navigating do not change the records. It covers known zero profit, unknown amounts, stale calculations, a missing residence confirmation, the existing positive-dividend action, calculation and bank destinations, an empty current task set despite an old action result, and Traditional Chinese copy.

- 11 mobile-sized UI scenarios: PASS.
- 14 related localisation, UI contract and removed-slot/sync checks: PASS.
- Production deployment: NOT RUN.
- Real-phone or real-account acceptance: NOT RUN.
- Requested draft keep/resume/remove/restart experience: NOT IMPLEMENTED; current-model diagnostic results are not acceptance of that experience.

## Confirmed draft dependency

`chooseBusinessCategory` creates an in-memory pending company. Until the Step 1 claim succeeds, `persist` intentionally skips the canonical repository. `saveCompanyDraft` currently returns success while that pending company remains absent from the durable repository. Individual UI answers can be stored, but the canonical company/resume entry is missing after reinitialisation.

After Step 1, the server slot is already claimed and the canonical draft is stored. The existing draft store can recover Step 2 answers, as verified with an isolated shared storage instance. However, `removeCompany` uses the general company deletion path and explicitly retains the slot. Removing an unfinished draft and choosing LTD again therefore returns `company_slot_retained_after_removal`.

Simply relocating that removal button would repeat the previous blocker. Recreating its deleted identity would conflict with the deletion markers. Resetting the same company identity to different company facts would also risk associating surviving records with a different company. None of those shortcuts is implemented.

## Proposed narrow design for review — not authority to implement or deploy

### User interaction

Cancel or leaving setup opens one choice sheet: “Keep draft and exit”, “Remove this draft”, and a close/keep-editing action. Moving Back between setup steps remains ordinary navigation. Back from the first setup step, a brand/home exit, and Cancel use the same exit choice. Remove the shared Details → Remove company entry from onboarding only; completed-company removal remains separate.

Keeping stores the current form answers and resume position. Before Step 1 is claimed, it also needs a durable local pending-setup record with the same draft identity, rather than falsely reporting that the canonical company was saved. Restoring that pending setup must merge only its own setup fields into the latest account state, never replace the account with an old full-state snapshot. Whether pre-claim drafts also need cross-device recovery must be decided; current individual UI drafts are device-local.

Removing explicitly states that the unfinished setup and its answers will be discarded, with no bookkeeping deletion. Before any server claim, it can remove only the local pending setup and its onboarding answer keys. A claimed draft needs the server operation below. The UI clears local answers only after the operation succeeds; failure keeps the draft available.

### Server boundary needed for safe automatic release of an unfinished draft

The existing server-controlled slot records a claim and `founder_approval_required`, but does not record a trusted “never completed setup” state. A client-editable profile status alone cannot safely authorize an exception for unfinished drafts: it must not allow a previously completed company to become eligible for release by changing its profile status.

Recommended extension for new slots:

1. The trusted claim operation marks a new slot as `setup_pending`. This does not create a second slot or weaken Pro/owner checks.
2. Step 5 uses an idempotent trusted completion operation to mark that same slot `setup_completed` before the client can persist a confirmed company or bookkeeping entries. Rules enforce this boundary for the new slot format. A failed client save can retry confirmation on the same slot; completion cannot be downgraded by the client.
3. A dedicated unfinished-draft discard operation requires authenticated owner/Pro access, the exact expected company and document versions, a server-controlled pending stage, an unconfirmed current profile, and absence of bookkeeping/tax/remuneration/invoice/asset/bank records for that company. A transaction rechecks these conditions, writes deletion markers for only that unfinished setup's company/profile records, and removes only its matching slot control document.
4. The response lets the client apply those deletion markers, retire only the matching pending setup writes, refresh its trusted slot state, and clear only that setup's saved answers. Other records, historical company identities, receipts, personal records and deletion markers remain unchanged. The next normal Pro claim must use a new identity.
5. Existing slots without a trusted lifecycle marker remain under the existing release policy. Do not automatically classify old slots as never completed from their current client-editable profile. Any legacy migration or individual exception needs an explicit, separately reviewed scope.

This extension requires claim/completion/discard integration and associated Firestore write guards, not merely a new UI callback. It has not been added to this candidate. The deployment sequence, older-client behavior for new-format slots, and legacy-draft handling must be reviewed before implementation. No production account reset is part of this design review.

### Required acceptance after design approval

Use isolated records to verify pre-claim keep/restart with the same answers and identity, claimed-draft keep/resume, close-to-continue, ordinary step Back, discard/restart with a new identity, stale-device and changed-version rejection, retry after an interrupted response, and preserved history. Completed slots, previously completed companies, mismatched owners, non-Pro access and any bookkeeping-bearing draft must be rejected by the narrow release operation. Real-account evidence remains separate from these local tests.
