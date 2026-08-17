# Rollback Instructions

No production deployment or data migration occurred, so production rollback is not required.

Source rollback options:

1. return to the pre-UI engineering candidate `94b0dcbe8b55db03a94bddffbbd9db3c13522c3d`;
2. switch back to `main` at `745f7497d374f000870c4a7a111130008f8945a7`;
3. clone or fetch that exact production commit from `origin`;
4. use `evidence/w0/taxmate-baseline-745f7497.bundle` (verified complete); or
5. restore `evidence/w0/taxmate-baseline-source.tar`.

User-data rollback: import a valid schema-2 JSON backup, import a validated portable ZIP, or restore `taxmateuk_preimport_backup` locally. Portable restore first downloads a complete pre-restore ZIP; keep that file until the restored data and receipts are verified. A failed receipt restore leaves bookkeeping state untouched and attempts to delete only newly uploaded receipt objects. Tombstones prevent older cloud records from reappearing. Keep the immediately previous PWA cache during rollout so a controlled Hosting rollback can reactivate the previous shell.

CSP rollback must revert the client assets and Hosting header together. Do not weaken the enforcing policy in place while retaining blocked inline architecture; switch back to the prior complete candidate commit if emergency preview rollback is needed.

Future deployment rollback must treat Hosting, Functions, Firestore rules, Storage rules and Stripe webhook configuration as separate versioned operations. Never roll the client forward to schema 5 against untested production rules, and never deploy Functions/Stripe configuration without sandbox evidence.
