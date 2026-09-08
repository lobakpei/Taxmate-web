# TaxMate 2.1.21 production release

Build: `2026-09-08.production-release.1`. Cache: `taxmate-v2-production-20260908-1`.

This release carries the reviewed LTD bookkeeping, year-end preparation, receipt admission, account retention policy, and subscription/refund interface into production. Supplier disclosure verification and money-operation controls remain closed. It does not activate automatic retention deletion or receipt cleanup triggers/schedules.

## Source and validation

- Imported reviewed candidate HEAD `8ca588a54eb468cf2099be8026e47d954faccf45` plus reviewed tree `4e060c056918e328c752b8f92805476abb1de659`; all 391 raw source hashes matched the sealed manifest before edits.
- Based the release commit on current GitHub main `724657dcdcf20c61754833b28f9432088fbc610b`. The original candidate and dirty root remain untouched.
- Unified release identity, explicitly set both production billing controls to false, repaired task-button focus across same-route LTD redraws, and updated obsolete tests to the reviewed interface and billing module boundaries.
- Full npm suite: characterization 4, unit 508, integration 13, rules source 8, LTD 74; all passed. Product-health and plan-contract gates passed.
- Fresh isolated rules emulator: 18/18; functions emulator: 8/8. No historical runtime/export was restarted or imported.
- Personal UI: 377 checks, 46 screenshots; LTD year-end UI: 224 checks, 67 screenshots. Both passed across six languages, light/dark and phone/desktop. Final deployment evidence is recorded separately in the task-owned release evidence directory.
- Final source checks for LTD UI, visual contract and release identity: 21/21. Source credential-pattern scan and Git whitespace checks passed.

## Deployment boundaries and rollback

Deploy only the explicit 28 callables/webhook in the release selector, followed by Firestore rules/indexes, Storage rules and Hosting. Preserve all existing functions. Exclude all receipt cleanup/admission event triggers, `recoverReceiptCleanupJobs`, and emulator-only `runRetentionPurgeDemo`.

Project: `taxmate-uk-2`; region: `europe-west2`; Hosting site: `taxmate-uk-2`. GitHub Pages serves `main` at `/` for `www.taxmate.uk`; merging main triggers Pages. Deploy required backend endpoints before the frontend and verify both providers. Cached old clients may need their normal update before using the new receipt-admission write contract; pending writes remain queued.

Previous GitHub main above and Firebase Hosting version `sites/taxmate-uk-2/versions/a98958427fce118e` are rollback references. Previous provider function metadata and deployed rules are preserved in task-local evidence. Frontend, rules and backend must be considered together for any rollback.

## Known limits

- New consumer charging and money-changing operations remain controlled; deploying the UI is not authorization to enable them or alter subscriptions.
- No real payment/refund, provider retry experiment, user-data deletion, account login or staff-claim injection was performed for release validation.
- Genuine lost legacy browser-state recovery, natural paid-period expiry and automatic Stripe transport retry remain unproven. Existing accepted evidence limitations do not become a claim of PASS.
- Automatic data-cleanup workers are not activated. Local test success is separate from provider deployment, online smoke and Founder acceptance.
