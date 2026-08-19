# Retention and Deletion Matrix

| Record | Operational retention | Deletion behavior | Remaining decision/evidence |
|---|---|---|---|
| Browser app state | Until reset, browser clearing or Delete all data | All known TaxMate local state, device ID, onboarding/sign-in markers, entitlement cache, import rollback and analytics preference are removed | Browser caches/service-worker shell contain no bookkeeping payload by design; verify on devices |
| Pre-import rollback copy | From import until next import/reset/delete | Removed by reset/delete | Founder decision whether to expose/manual-clear or add time-based expiry |
| Personal Firestore tree | Active account lifetime | Server recursive delete before Auth deletion | Staging proof, provider backup/log lifecycle |
| Sync tombstones | Account lifetime | Removed with personal tree or partnership deletion | No automatic compaction yet; decide maximum operational tombstone age |
| Receipt objects | Active account/entry lifetime | Individual delete or server prefix delete; failures now prevent a success claim | Storage soft-delete was observed as seven days in W0; reconfirm in staging |
| Promotion redemption | Account lifetime | UID-linked records deleted with account | Stripe’s independent offer/fraud records may remain |
| Billing customer object | Paid/account lifetime | TaxMate requests Stripe customer deletion before removing local reference | Stripe transaction/tax/fraud retention follows Stripe/legal requirements; document exact result |
| Partnership records | While at least one authorised member remains | Departing membership removed; shared records retained for remaining members; whole partnership deleted when last member leaves | Confirm how to handle disputes/legal holds and owner departure |
| Firebase Auth identity | Account lifetime | Deleted last, after critical service cleanup | Reauthentication and failure/retry UX require staging test |
| GA4 user/event data | **Required production setting: two months** | Consent withdrawal stops new TaxMate events; provider retention/deletion tools handle existing events | Standard aggregated reports are outside user/event retention; approve aggregate retention |
| Sentry events | Fixed short period not yet selected | Provider project deletion/expiry | **FOUNDER_INPUT:** select and configure retention; staging payload inspection |
| Provider security/access logs and backups | Provider-defined | Provider lifecycle | Obtain contractual/config evidence |
| Support/rights email | Not yet defined | Namecheap forwards `support@taxmate.uk` to a private Microsoft Outlook destination; deletion is a controlled mailbox workflow | **FOUNDER_INPUT:** approve a proposed 24-month case retention, with longer legal-hold exception if justified; verify forwarding logs/copies and Outlook retention |
| Accounting/tax invoices | Statutory/claims period | Restricted archive rather than ordinary account deletion where law requires | UK adviser/accountant to specify period and record categories |

The app no longer claims that every copy disappears immediately. Account deletion is reported complete only after the authenticated server workflow succeeds. Provider backups, compulsory financial records and justified legal holds are separately disclosed.
