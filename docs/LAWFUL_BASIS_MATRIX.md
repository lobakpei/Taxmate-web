# TaxMate Lawful-Basis Matrix

This is an engineering record for TaxMate only. It requires Founder/legal approval before production.

| Processing | Information | Purpose | Proposed UK GDPR basis | Rights/notes |
|---|---|---|---|---|
| Local app records | Business and bookkeeping records, settings, local receipts | Provide requested local functionality | Article 6(1)(b), contract/pre-contract steps | Local-only information is not sent to TaxMate unless the user signs in, contacts support or enables telemetry. Export, correction and erasure controls exist. |
| Google authentication | UID, email, name/profile fields, tokens | Create/authenticate cloud account | Article 6(1)(b) | Google is the only provider. No Apple path remains. |
| Personal cloud sync/backups | Businesses, entries, tombstones, preferences, receipt objects | Cross-device continuity and recovery | Article 6(1)(b) | Portability/export and authenticated deletion supported. |
| Partnership sync | Membership, shared business records | Share records with authorised partners | Article 6(1)(b); Article 6(1)(f) for continuing availability to remaining authorised members | Members are recipients. Objection/erasure must account for other members’ rights and records. Last-member deletion is implemented. |
| Tax calculations/exports | User-entered financial records and derived estimates | Provide app calculations and working papers | Article 6(1)(b) | Rules-based aids; no legal/significant automated decision and no HMRC submission. |
| Paid subscriptions | Account email/UID, Stripe customer and subscription metadata | Checkout, entitlement, invoicing, cancellation | Article 6(1)(b); Article 6(1)(c) for records required by tax/accounting law | Stripe also processes payment/fraud information under its own roles. Exact statutory retention requires adviser confirmation. |
| Direct promotion redemption | UID, promotion identifier, tier, duration, timestamps | Grant offer and prevent duplicate use | Article 6(1)(b); Article 6(1)(f) for offer integrity/abuse prevention | Record now deleted with the TaxMate account; Stripe may retain independent records. |
| Security and App Check | UID/token/device and connection metadata | Prevent unauthorised access/abuse | Article 6(1)(f) | Legitimate-interest assessment must be approved; right to object disclosed. |
| Sentry diagnostics | Structural exception type/stack plus provider connection metadata | Detect and repair failures | Article 6(1)(f) | Payload minimised; no messages, inputs, account identity or breadcrumbs. Retention and received payload require staging verification. |
| Optional GA4 | Approved event name, app surface, ordinary connection/device metadata | Understand feature use and reliability | Article 6(1)(a), consent | Off by default; withdraw in Settings. No User-ID, financial values, business names, notes or receipts. |
| Support and rights requests | Email address and message content | Respond, administer rights and complaints | Article 6(1)(b), 6(1)(c), or 6(1)(f), depending on request | Support-mail provider and retention require Founder input. |
| Legal claims/disputes | Relevant account, billing, support and security records | Establish, exercise or defend legal claims | Article 6(1)(f), and 6(1)(c) where applicable | Apply necessity, access restriction and claim-limitation criteria. |

TaxMate does not intentionally solicit special-category or criminal-offence data. Free-text and receipts could nevertheless contain it; the policy tells users not to add such material unless necessary and authorised. A legal adviser must decide whether further controls or an Article 9 condition are required for foreseeable use.
