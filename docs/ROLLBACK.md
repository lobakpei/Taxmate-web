# Rollback Instructions

No production deployment, service configuration or data migration occurred, so production rollback is not required. GitHub production `main` was verified unchanged at `745f7497d374f000870c4a7a111130008f8945a7` on 18 August 2026.

Source rollback options:

1. return to the committed pre-freeze RC `138efa4c891af30f9581e4e3488e4f5c1b5481e4`;
2. return to the pre-final-UI engineering candidate `94b0dcbe8b55db03a94bddffbbd9db3c13522c3d`;
3. switch to production `main` at `745f7497d374f000870c4a7a111130008f8945a7`;
4. use `evidence/w0/taxmate-baseline-745f7497.bundle` (verified complete); or
5. restore `evidence/w0/taxmate-baseline-source.tar`.

User-data rollback: import a valid schema-2 JSON backup, import a validated portable ZIP, or restore `taxmateuk_preimport_backup` locally. Portable restore first downloads a complete pre-restore ZIP. A failed receipt restore leaves bookkeeping state untouched and attempts to delete only newly uploaded receipt objects. Tombstones prevent older cloud records from reappearing.

PWA rollback must restore a coherent client/cache identity. The final-freeze cache is `taxmate-v2-rc-1-final-ui-freeze`; the service worker retains one prior TaxMate shell for controlled rollback. CSP rollback must revert client assets and Hosting headers together rather than weaken the enforcing policy around the external-script architecture.

Any future release rollback must treat Hosting, Functions, Firestore rules, Storage rules, App Check and Stripe webhook configuration as separate versioned operations. Never roll schema 5 clients forward against unvalidated production services.
