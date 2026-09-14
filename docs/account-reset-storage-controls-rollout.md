# Account reset and receipt metadata backfill

The new Storage rules deliberately deny legacy receipt access until the server-owned entitlement mirror and each receipt object's custom metadata contain matching reset and retention epochs. Do not deploy `storage.rules` before this migration reports a clean verification pass.

The migration tool is `scripts/backfill-account-reset-storage-controls.js`. It reads only the control fields needed to build the migration. Its output contains aggregate counts and a SHA-256 plan digest; it does not print UIDs, receipt names, billing data, bookkeeping data, or receipt contents. Dry-run is the default and cannot write.

## Required rollout order

1. Deploy the updated server writers first, while the previous Storage rules remain active. This ensures new entitlement projections and receipt uploads carry the control fields.
2. Sign in to the Firebase CLI with an authorised production operator. Ensure neither `FIRESTORE_EMULATOR_HOST` nor `FIREBASE_STORAGE_EMULATOR_HOST` is set.
3. Run the mandatory dry-run:

   `node scripts/backfill-account-reset-storage-controls.js --dry-run`

4. Record the returned `planDigest`, `entitlementUpdates`, and `receiptMetadataUpdates`. A non-zero `blockers` count stops the rollout. For a receipt owner whose Firebase Auth account still exists, the plan may create one minimal Free entitlement using an exists-false precondition; it never infers paid access. Deleted or unknown Auth owners remain blockers. Resolve any reset or retention work in progress, unknown receipt owners, unsupported receipt paths, or missing write preconditions, then repeat the dry-run.
5. Apply exactly that reviewed plan. The confirmation value, digest, and both counts are all mandatory:

   `$env:TAXMATE_BACKFILL_CONFIRM='taxmate-uk-2/account-reset-storage-controls-v1'`

   `node scripts/backfill-account-reset-storage-controls.js --apply --expected-plan-digest=<64-hex-digest> --expected-entitlement-updates=<count> --expected-receipt-updates=<count>`

   Firestore writes use document update-time preconditions. Storage metadata writes use metageneration preconditions. Any concurrent change fails the run without relaxing a fence; rerunning dry-run produces a new reviewable plan. The operation is idempotent and preserves unrelated entitlement, retention, and custom metadata fields.
6. Run dry-run again. It must report `DRY_RUN_READY`, zero blockers, zero entitlement updates, and zero receipt metadata updates. Keep this aggregate receipt with the release evidence.
7. Only after that verified zero-delta result, deploy the Firestore and Storage rules. Run the rules emulator suite and a signed-in receipt read/upload smoke test against the intended environment before widening the release.

The tool never deletes data, reads receipt bytes, changes billing status, advances reset or retention epochs, or treats an in-progress/failed control as complete.
