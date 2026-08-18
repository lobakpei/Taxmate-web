# Firebase Security Report

W0 exported the deployed Firestore/Storage rules and metadata read-only. Firestore is `europe-west2`; Storage is `US-CENTRAL1` with seven-day soft delete. App Check was observed as enforced for Firestore and Storage and unenforced for Auth. The deployed partnership rule allowed any authenticated UID; production was not changed.

Candidate rules are tracked in `firestore.rules` and `storage.rules`:

- personal documents are UID isolated;
- financial records require sync-schema metadata and use tombstones instead of client physical deletes;
- partnership reads/writes require an explicit `/members/{uid}` document;
- app configuration is readable but not writable by normal clients;
- entitlement and billing truth is never client-writable;
- receipts are owner-only, image-only and below 10 MiB;
- unmatched paths deny access.

The real Firestore emulator suite passed 5/5 again in the 18 August 2026 final-freeze gate for cross-user denial, member/outsider behavior, immutable config/entitlements, tombstones and malformed records. Candidate rules were not deployed. The staging readiness audit found only the production Firebase alias/config, so production was not used. Storage enforcement is covered by static rule assertions; an isolated staging project must repeat deployed Firestore/Storage behavior and App Check domain tests before release.
