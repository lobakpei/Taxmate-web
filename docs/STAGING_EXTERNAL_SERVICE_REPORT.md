# Staging External-Service Report

## Final readiness audit — 19 August 2026

Production was not used as a staging substitute and no production data, Firebase configuration, Stripe LIVE object, deployment or migration was changed.

### Identity and access findings

- Firebase CLI authentication is available. The current repository default and web/App Check configuration point to production `taxmate-uk-2`.
- Other visible TaxMate-labelled Firebase projects have no registered web apps, but that is not sufficient evidence that they are disposable staging. They were not reused or modified.
- Creation of a clearly named new Firebase staging project requires explicit Founder approval because it creates an external organisational resource. No project was created.
- The available Stripe browser session is an isolated TEST sandbox belonging to another product, `toodaloop`, with zero products. It was inspected read-only and not used or modified for TaxMate.
- The available Google session has no GA4 account/property access. No measurement property was created.
- Sentry requires sign-in; no staging organisation/project or received-event access is available.
- No Stripe CLI/config, TaxMate TEST secret, webhook secret, Price ID, Firebase staging web config, Google staging account, GA4 staging ID or Sentry staging DSN is present in the repository/environment.

### Completed isolated emulator evidence

- Firestore and Storage rules: 11/11 real emulator tests.
- Two distinct same-account Firestore clients converge after concurrent edits.
- A genuine offline client queues a tombstone, reconnects and prevents resurrection over a later online edit.
- Cross-user personal reads are denied; client entitlement/config writes are denied.
- Receipt upload/read/delete, cross-user denial, MIME rejection and orphan cleanup pass against Storage Emulator.
- Partnership outsiders cannot self-grant membership. Creator bootstrap is restricted to the creator.
- Authenticated callable join validates the parent before membership creation.
- Callable leave removes the departing member immediately and recursively deletes a last-member partnership.
- Authenticated account deletion removes personal Firestore data, receipt objects, promotion redemption, Auth identity and membership while preserving shared records for another member.
- Callable production definitions enforce App Check; emulator tests intentionally disable enforcement because they use emulator-issued authentication rather than a real reCAPTCHA token.

### External staging status

| Surface | Status | Remaining minimum state |
|---|---|---|
| Google Sign-In lifecycle | BLOCKED | Explicitly approved isolated Firebase staging project, web app/OAuth setup and disposable Google test account |
| Deployed App Check | BLOCKED | Staging reCAPTCHA Enterprise site key, staging domain and enforcement metrics |
| Deployed Firestore/Storage/Functions | BLOCKED | Candidate deployed only to approved staging project |
| Real cloud receipt/full-ZIP restore | BLOCKED | Staging Auth/Firestore/Storage plus disposable receipt fixtures |
| Stripe TEST | BLOCKED | TaxMate-owned TEST/sandbox account, exact monthly Price objects, keys/webhook and promotion fixtures |
| GA4 delivery | BLOCKED | Staging property/measurement ID and DebugView access |
| Sentry received payload | BLOCKED | Staging DSN/project, authentication and event-inspection access |

Apple Sign-In is intentionally absent. Source/emulator evidence is not represented as external delivery evidence.
