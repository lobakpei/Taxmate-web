# TaxMate Ltd V1.5 Plan Feature Contract

Status: Founder approved for the isolated production-integration candidate on 28 August 2026.

## Commercial identity

- Minimum tier for every active Ltd function: Pro.
- Included active limited companies: one per TaxMate account / Pro subscription.
- Additional Ltd add-on: absent.
- Multi-Ltd and associated-company workflows: absent.
- Pro monthly launch price: £9.99/month.
- Pro monthly standard price: £11.99/month.
- Pro annual price: Founder decision pending; no amount may be inferred or displayed.
- Existing-user migration, grandfathering or legacy pricing: none.
- Forbidden copy: previous-price or struck-through-price wording, and any claim that the launch price is a legacy price.

## Exact semantic action matrix

| Facade/domain action | Free | Plus | Pro | Non-Pro result |
|---|---:|---:|---:|---|
| Create company | Block | Block | Allow | `pro_required` |
| Resume/save onboarding draft | Block | Block | Allow | `pro_required` |
| Read/open an existing Ltd workspace or record | Retained read-only | Retained read-only | Allow | No write or calculation side effect |
| Create income, expense, shared/personally-paid expense, loan or share record | Block | Block | Allow | `pro_required` |
| Edit/delete a draft; correct/reverse a committed record | Block | Block | Allow | `pro_required` |
| Plan or calculate company/Corporation Tax periods | Block | Block | Allow | `pro_required` |
| Run salary/dividend/retained-profit scenario | Block | Block | Allow | `pro_required` |
| Record actual salary | Block | Block | Allow | `pro_required` |
| Declare or pay dividend | Block | Block | Allow | `pro_required` |
| Add Ltd evidence | Block | Block | Allow | `pro_required` |
| Edit company facts | Block | Block | Allow | `pro_required` |
| Record effective-dated ownership change | Block | Block | Allow | `pro_required` |
| Companies House lookup/recheck | Block | Block | Allow | `pro_required` |
| Generate a new working pack | Block | Block | Allow | `pro_required` |
| Ltd cloud inbound hydration | Retained read-only | Retained read-only | Allow | Outbound writes remain blocked |
| Ltd cloud outbound sync | Block | Block | Allow | `pro_required` |
| Ltd Data-only / Full Backup export | Retained export | Retained export | Allow | Existing data only; no mutation |
| Ltd restore/import | Block | Block | Allow | `pro_required` |
| Download existing owned evidence | Retained read | Retained read | Allow | Existing owner evidence only |
| Remove company | Block | Block | Allow | `pro_required`; destructive confirmation still required |
| Delete account | Allow | Allow | Allow | authenticated deletion contract applies |
| Read archived-access status | Allow | Allow | Allow | read-only |

Free and Plus may receive the semantic Home row and may open an existing retained Ltd workspace in read-only mode. They may hydrate and export their existing company data and download existing owned evidence, but cannot invoke an active action, calculate, restore, write, correct or enrich Ltd records.

## Enforcement boundary

`src/core/company-access.js` owns the canonical mapping. It returns `retained_read_export` for the narrow retained-data actions when existing Ltd data is present and `pro_required` for active Free/Plus actions. `CanonicalCompanyDriver` applies the guard before state-changing and calculation actions. The facade only routes semantic success/failure and does not derive entitlement. Ltd Firestore/backup enforcement remains independently tested and must use the effective server entitlement before production release.

The Founder Preview defaults to a verified active Pro fixture. Explicit local-only `tier=free` and `tier=plus` modes exist to verify that the same retained Ltd Home row is locked and active callbacks fail closed. No preview entitlement is sent to Firebase or production providers.

## Production release boundary

No production Stripe price, price ID, subscription, billing portal, callable or checkout configuration is changed by this candidate. The candidate shows the approved £9.99 monthly launch / £11.99 monthly standard positioning but keeps new Pro checkout disabled until production billing is explicitly aligned. Annual Pro pricing remains a Founder pre-release decision and no annual Pro offer is exposed.
