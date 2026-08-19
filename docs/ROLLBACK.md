# Rollback Instructions

No production deployment, service configuration or data migration occurred, so production rollback is not required. GitHub production `main` remains anchored at `745f7497d374f000870c4a7a111130008f8945a7`; the final read-only remote recheck is recorded in the Founder handoff.

Source rollback options:

1. return to the pre-external-services candidate `71083c6765cf8d624b30ead3ddca69b7b046c3c4`;
2. return to the Legal & Privacy Gate commit `ceb1bb759cb78228ebcae5625a63a19978f22895`;
3. return to committed Founder UI freeze `35d4ad974cbc7c71be16332a41204b3647ed52a9`;
4. return to the pre-freeze RC `138efa4c891af30f9581e4e3488e4f5c1b5481e4`;
5. switch to production `main` at `745f7497d374f000870c4a7a111130008f8945a7`;
6. use `evidence/w0/taxmate-baseline-745f7497.bundle` (verified complete); or
7. restore `evidence/w0/taxmate-baseline-source.tar`.

User-data rollback: import a valid schema-2 JSON backup, import a validated portable ZIP, or restore `taxmateuk_preimport_backup` locally. Portable restore first downloads a complete pre-restore ZIP. A failed receipt restore leaves bookkeeping state untouched and attempts to delete only newly uploaded receipt objects. Tombstones prevent older cloud records from reappearing.

PWA rollback must restore a coherent client/cache identity. The current cache is `taxmate-v2-rc-1-seo-implementation-rc-5`; the service worker retains one prior TaxMate shell for controlled rollback but reads offline fallbacks only from the current cache. CSP rollback must revert client assets and Hosting headers together; the exact inline JSON-LD hash, Sentry SDK, EU ingestion and staging Functions hosts are required and must not be replaced with broad wildcards. Staging Hosting must continue using `firebase.staging.json` so its `X-Robots-Tag` noindex header cannot be lost.

Stripe rollback is TEST-only. The candidate contains no account-specific Stripe IDs and the latest account refresh created or changed no Stripe object. Any artifacts in the wrong parent account are outside this repository and must not be altered from the TaxMate programme. No Stripe LIVE rollback is required because LIVE was untouched.

The non-production `taxmate-staging` project is persistent release infrastructure. Its Hosting site, Firestore rules/indexes, Google-only Auth and App Check registration may be rolled back independently; Functions and Storage were not deployed because the project is not linked to Blaze. Do not delete or repurpose this project, and never copy production user data into it.

Any future release rollback must treat Hosting, Functions, Firestore rules, Storage rules, App Check and Stripe webhook configuration as separate versioned operations. Never roll schema 5 clients forward against unvalidated production services.
