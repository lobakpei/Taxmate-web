# Confirmed implementation checkpoint — not a Fable handoff

Founder approval is recorded in TAXMATE_FOUNDER_CONFIRMED_COMPLETION_20260905.md.
No further approval is needed for those confirmed requirements. They are not
implemented in full yet. The two-step Codex -> Fable workflow is unchanged.

## Implemented and covered by targeted regression tests

- B1: onUpdatePayrollReporting records separate, revisioned RTI evidence against
  the existing canonical salary event. It preserves financial postings and
  personal-income links, handles idempotent retries and stale/conflicting writes,
  survives backup and sync projection, and updates the statutory checklist.
- B8: the four filing confirmations can be saved in the evidenced statutory
  review. Packs use the saved values after reload; source changes invalidate them.
- B4: verification timestamps no longer manufacture a retention end. A later
  Plus expiry overrides an older Pro archive date. Active Plus keeps LTD history.
- B3, LTD snapshot boundary only: expired/unknown retention no longer exposes
  company profile, figures, events or LTD Home summaries through readSnapshot.
- B6: PDF and Plus Receipt Pack handlers check access both at entry and at save.
  A runtime test expires access during asynchronous receipt rendering and proves
  that no PDF is saved.
- B7/C1: Manage subscription is allow-listed and shows the export/date reminder
  before opening billing. Annual cancellation appears even more than 30 days out;
  a continuing paid grant is not falsely presented as expiring storage.
- C2: new LTD preparation/working packs require Pro. Retained read/evidence access
  does not authorize generating a new pack.
- VAT engine: automatic, entity-scoped confirmed sales, explicit classifications
  and tax points, outside-book additions, rolling months across April, strict
  threshold, separate future test and preserved historical crossing facts.
  Invoice payments and funding are not extra sales. Deleted-history input cannot
  certify completeness. The lifecycle input still needs wiring from retention.
- Full Backup receipt association discovery now includes statutory review and RTI
  evidence, including old reporting revisions, instead of silently omitting them.

## Still required before Fable

1. Connect the whole-account policy to actual account loading, reads, local
   persistence, cloud records and server/security-rule enforcement.
2. Finish the physical-deletion lifecycle, including consistent paid/expired
   snapshots, same-year resumption, post-deletion reactivation, stale-device
   re-upload protection and explicit backup restoration.
3. Handle LTD cross-year references without deleting new-year records or leaving
   a broken canonical graph. The pure planner currently returns an explicit
   blocker for such a graph; this is not a completed deletion implementation.
4. Protect other members' shared partnership data and shared receipt references.
   The draft worker does not yet provide those complete fences, orphan handling,
   concurrency/retry guarantees or complete backend tests.
5. Fix Free mixed-account backup/restore. The app still calls the old whole-account
   LTD backup gate. Expired LTD must not block otherwise available ordinary data.
6. Wire the history-gap state into VAT. Verify receipt relocation/source-review
   continuity during a real ZIP restore, not merely JSON round-trip.
7. Reconcile public/legal/help copy with actual completed retention behaviour;
   add real browser/emulator lifecycle tests; freeze the final source; then
   produce new hashes and the complete Fable source package.

## Safety and evidence scope

Latest full npm regression: PASS, 391 tests (4 characterization, 292 unit,
13 integration, 8 rules-source, 74 LTD), plus product-health and plan-contract
gates. Log: .ltd-statutory-evidence-confirmed-20260905/regression-checkpoint.log.
These passing tests do not close the remaining implementation items above.
git diff --check passed; the retention-worker syntax check passed, but its
deletion algorithm has not passed a backend lifecycle acceptance suite.

FOUNDER_COMPLETION_GATE.json is NEEDS_IMPLEMENTATION, with UI permission false.
The packaging helper refuses to create a Fable-ready package while that gate is
open. The original ZIPs have not been replaced.

functions/retention-worker.js is an unfinished injected-dependency draft, not a
registered Cloud Function or scheduled job. An explicit environment guard makes
it refuse production before accessing any data. Do not enable it until the
remaining fences and emulator tests above are complete.

The existing actual-app demo/emulator suite passed 1,468 assertions in
.ltd-statutory-evidence-confirmed-20260905, with no external or Sentry requests.
That built artifact preceded the last company-access expiry-priority amendment;
its result is regression evidence for that earlier runtime snapshot, NOT final
same-source acceptance of all current changes. A final frozen-source rerun is
still required. No real account, deployment, live purge, commit, push or Fable UI
operation was performed.
