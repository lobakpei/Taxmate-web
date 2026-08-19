# Firebase Security Report

W0 exported the deployed Firestore/Storage rules and metadata read-only. Firestore is `europe-west2`; Storage is `US-CENTRAL1` with seven-day soft delete. App Check was observed as enforced for Firestore and Storage and unenforced for Auth. The deployed partnership rule allowed any authenticated UID; production was not changed.

Candidate rules are tracked in `firestore.rules` and `storage.rules`:

- personal documents are UID isolated;
- financial records require sync-schema metadata and use tombstones instead of client physical deletes;
- partnership reads/writes require an explicit `/members/{uid}` document; clients cannot self-grant membership, and callable join validates the partnership first;
- app configuration is readable but not writable by normal clients;
- entitlement and billing truth is never client-writable;
- receipts are owner-only, image-only and below 10 MiB;
- unmatched paths deny access.

The final real Firestore/Storage emulator suite passed 11/11 for cross-user denial, member/outsider behavior, self-membership denial, creator bootstrap, immutable config/entitlements, two-client convergence, offline tombstones, malformed records and receipt lifecycle. A further 3/3 Auth/Functions integration emulator tests passed server-authoritative join/leave, last-member deletion, remaining-member retention and authenticated account deletion across Firestore, Storage, promotions and Auth. Callable Functions enforce App Check outside Emulator Suite and the client supplies the App Check token header.

Candidate rules/Functions were not deployed. The isolated staging project remains blocked, so deployed Google Sign-In, App Check and rule behavior must still be repeated there before production.
