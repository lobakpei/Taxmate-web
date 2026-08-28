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
- Forbidden copy: “Was £11.99” and any claim that the launch price is a legacy price.

## Exact semantic action matrix

| Facade/domain action | Free | Plus | Pro | Non-Pro result |
|---|---:|---:|---:|---|
| Create company | Block | Block | Allow | `pro_required` |
| Resume/save onboarding draft | Block | Block | Allow | `pro_required` |
| Read/open Ltd workspace or record | Block | Block | Allow | `pro_required` |
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
| Generate working pack | Block | Block | Allow | `pro_required` |
| Ltd cloud sync | Block | Block | Allow | `pro_required` |
| Ltd Data-only backup, Full Backup or restore | Block | Block | Allow | `pro_required` |
| Remove company | Allow | Allow | Allow | destructive confirmation still required |
| Delete account | Allow | Allow | Allow | authenticated deletion contract applies |
| Read archived-access status | Allow | Allow | Allow | read-only |

Free and Plus may receive the semantic Home row needed to explain that a retained Ltd record exists and requires Pro, but cannot enter the workspace or invoke an active Ltd action. No downgrade path may silently write, correct or enrich Ltd records.

## Enforcement boundary

`src/core/company-access.js` owns the canonical mapping and returns `pro_required` for all mapped Free/Plus actions. `CanonicalCompanyDriver` applies the guard before each state-changing or active-read action. The facade only routes semantic success/failure and does not derive entitlement. Ltd Firestore/backup enforcement remains independently tested and must use the effective server entitlement before production release.

The Founder Preview defaults to a verified active Pro fixture. Explicit local-only `tier=free` and `tier=plus` modes exist to verify that the same retained Ltd Home row is locked and active callbacks fail closed. No preview entitlement is sent to Firebase or production providers.

## Production release boundary

No production Stripe price, price ID, subscription, billing portal, callable or checkout configuration is changed by this candidate. The existing live TaxMate 2.0.6 Pro pricing is historical production truth, not the approved Ltd V1.5 launch contract. Aligning all live billing surfaces with the approved £9.99 monthly launch / £11.99 monthly standard contract is a separate release gate requiring explicit production-billing authority. Annual Pro pricing remains pending and does not block independent technical audit of this candidate.
