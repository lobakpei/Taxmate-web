# Rollback Instructions

No production deployment or data migration occurred, so production rollback is not required.

Source rollback options:

1. switch back to `main` at `745f7497d374f000870c4a7a111130008f8945a7`;
2. clone or fetch that exact commit from `origin`;
3. use `evidence/w0/taxmate-baseline-745f7497.bundle` (verified complete); or
4. restore `evidence/w0/taxmate-baseline-source.tar`.

User-data rollback: import a valid schema-2 JSON backup or restore `taxmateuk_preimport_backup` locally. Tombstones prevent older cloud records from reappearing. Keep the immediately previous PWA cache during rollout so a controlled Hosting rollback can reactivate the previous shell.

Future deployment rollback must treat Hosting, Functions, Firestore rules, Storage rules and Stripe webhook configuration as separate versioned operations. Never roll the client forward to schema 5 against untested production rules, and never deploy Functions/Stripe configuration without sandbox evidence.
