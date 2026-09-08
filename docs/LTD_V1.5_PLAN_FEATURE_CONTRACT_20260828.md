# TaxMate Ltd V1.5 Plan Feature Contract

Status: Founder approved and pricing-corrected for the isolated production-integration candidate on 29 August 2026.

## Commercial identity

- Minimum tier for every active Ltd function: Pro.
- Included active limited companies: one per TaxMate account / Pro subscription.
- Additional Ltd add-on: absent.
- Multi-Ltd and associated-company workflows: absent.
- Pro monthly launch price: £9.99/month.
- Pro monthly standard price: £11.99/month.
- Pro annual price: £99.99/year (`amountMinor: 9999`), Founder approved.
- Existing-user migration, grandfathering or legacy pricing: none.
- Approved display: standard £11.99/month struck through beside launch £9.99/month. Do not describe £11.99 as a price previously charged to customers or add an unapproved savings or free-month claim.

## Exact semantic action matrix

| Facade/domain action | Free | Plus | Pro | Non-Pro result |
|---|---:|---:|---:|---|
| Create company | Block | Block | Allow | `pro_required` |
| Resume/save onboarding draft | Block | Block | Allow | `pro_required` |
| Read/open an existing Ltd workspace or record | Retained to tax-year end | Retained to tax-year end | Allow | Read-only through 5 April; unavailable from 6 April |
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
| Ltd cloud inbound hydration | Retained to tax-year end | Retained while Plus is effective | Allow | Outbound writes remain blocked; unknown retention date fails closed |
| Ltd cloud outbound sync | Block | Block | Allow | `pro_required` |
| Ltd Data-only / Full Backup export | Retained to tax-year end | Retained to tax-year end | Allow | Existing data only through 5 April; unavailable from 6 April |
| Ltd restore/import | Block | Block | Allow | `pro_required` |
| Download existing owned evidence | Retained to tax-year end | Retained to tax-year end | Allow | Existing owner evidence only through 5 April |
| Remove company | Block | Block | Allow | `pro_required`; destructive confirmation still required |
| Delete account | Allow | Allow | Allow | authenticated deletion contract applies |
| Read archived-access status | Allow | Allow | Allow | read-only |

Free retains eligible LTD history to the end of the UK tax year of the actual paid-access end; effective Plus retains LTD history without a time limit while paid access continues. Both can read and export eligible retained records, without Pro-only operations or new LTD cloud writes. Whole-account retention also covers ordinary and partnership history. Basic explicit JSON/ZIP restore is distinct from active LTD operations; unavailable LTD records cannot block ordinary backup/restore. Unknown trusted access-end dates require verification. See the Founder-confirmed completion contract and retention matrix for deletion epochs and production activation boundaries.

## Enforcement boundary

`src/core/company-access.js` owns the canonical mapping. It returns `retained_read_export` for the narrow retained-data actions only before the tax-year boundary, `tax_year_retention_ended` from 6 April and `tax_year_retention_date_required` when the access-end date is unavailable. It returns `pro_required` for active Free/Plus actions. `CanonicalCompanyDriver` applies the guard before state-changing and calculation actions. The facade only routes semantic success/failure and does not derive entitlement. Ltd Firestore/backup enforcement remains independently tested and must use the effective server entitlement before production release.

The Founder Preview defaults to a verified active Pro fixture. Explicit local-only `tier=free` and `tier=plus` modes exist to verify that the same retained Ltd Home row is locked and active callbacks fail closed. No preview entitlement is sent to Firebase or production providers.

## Production release boundary

No production Stripe price, price ID, subscription, billing portal, callable or checkout configuration is changed by this candidate. The candidate shows the approved £9.99 monthly launch / £11.99 monthly standard / £99.99 annual pricing but keeps new Pro checkout disabled until production billing is explicitly aligned. The annual pricing decision is resolved; production billing alignment remains a separate release gate.
