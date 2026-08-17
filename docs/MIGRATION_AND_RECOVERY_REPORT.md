# Migration and Recovery Report

State schema 1–4 migrates to schema 5 without changing financial amounts. Businesses, entries and folders receive `createdAt`, `updatedAt`, `deletedAt`, `deviceId`, `schemaVersion` and `recordType`; entries also preserve `businessId`, `taxYear` and source provenance.

Cloud migration is non-destructive: legacy records are normalized on read, merged per item, then written in schema 5. Different IDs are retained; the greater `updatedAt` wins; an equal timestamp is resolved by device ID and then canonical JSON. Deletion tombstones remain in the record collection, so older offline copies cannot resurrect a record.

JSON export schema 2 includes app/build/schema identity, businesses, entries, folders/categories, year adjustments, restoration settings, tombstones and a receipt manifest. Receipt binaries are explicitly not embedded. Import rejects future schemas, duplicate IDs, malformed numbers and unsafe HTML/script content, shows counts, writes `taxmateuk_preimport_backup`, and restores the prior state if replacement fails.

Rollback: restore the pre-import local backup, import an earlier valid JSON backup, or restore the W0 source archive/bundle described in `ROLLBACK.md`. Production data was not migrated.
