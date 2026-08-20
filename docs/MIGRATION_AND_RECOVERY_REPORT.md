# Migration and Recovery Report

State schema 1–4 migrates to schema 5 without changing financial amounts. Businesses, entries and folders receive `createdAt`, `updatedAt`, `deletedAt`, `deviceId`, `schemaVersion` and `recordType`; entries also preserve `businessId`, `taxYear` and source provenance.

Cloud migration is non-destructive: legacy records are normalized on read, merged per item, then written in schema 5. Different IDs are retained; the greater `updatedAt` wins; an equal timestamp is resolved by device ID and then canonical JSON. Deletion tombstones remain in the record collection, so older offline copies cannot resurrect a record.

JSON export schema 2 includes app/build/schema identity, businesses, entries, folders/categories, year adjustments, restoration settings, tombstones and a receipt manifest. For backwards compatibility, receipt binaries are explicitly not embedded in JSON. Import rejects future schemas, duplicate IDs, malformed numbers and unsafe HTML/script content, shows counts, writes `taxmateuk_preimport_backup`, and restores the prior state if replacement fails.

Portable backup schema 1 wraps the same validated export in `taxmate-backup.json`, adds `receipt-manifest.json`, and stores each receipt under a base64url-derived safe archive path. SHA-256, byte size, MIME type, entry association, backup identity and linked/orphan status are validated before restore. Limits are 2,000 receipts, 10 MiB each and 250 MiB total. Missing references, duplicate entry associations, undeclared orphan files, path traversal, corrupt ZIP/JSON and future schemas fail closed. A restore downloads a full pre-restore ZIP and uploads all validated receipt files before replacing local bookkeeping state.

Rollback: restore the pre-import local backup, import an earlier valid JSON backup, or restore the W0 source archive/bundle described in `ROLLBACK.md`. Production data was not migrated.
