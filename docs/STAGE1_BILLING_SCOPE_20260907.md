# Stage 1 steps 2 + 3 — execution scope

Authority: Founder `go`, delegated on 7 September 2026 through task
01a077be-00b7-7e43-a853-3102e90037e2. Full authority is retained at the workspace
`.hosting-build/founder-launch-plan-20260906/STAGE1_STEPS2_3_AUTHORISATION_20260907.md`.

Base: 89cabd69b9e119b544ec6acbe033bc5cead2a515 / tree
668157a5faab83b7fe038643d7339347cb9b86b3. Independent source checkout:
`.hosting-build/candidates/taxmate-stage1-billing-20260907`.
Approved Direction A review 01 and R01–R05 remain intact. No changes to the old
candidate, its packages, independent reports, or the primary checkout.

## Confirmed / pending

| Rule | Source / status |
| --- | --- |
| Platform price parity | Founder original message in coordinating task; confirmed again in current authority. Mobile billing is not in scope. |
| Plus £3.99/month or £29.99/year; Pro launch £9.99/month, standard £11.99/month, £99.99/year | Current PLAN_FEATURE_CONTRACT and 29 August pricing correction. No live price operations authorised. |
| Cancel renewal, retain the already paid period | Current product-content terms and existing subscription contract. |
| Successful full refund ends its corresponding paid entitlement; partial refund requires manual review and does not itself change access | Current product-content terms; historical reports corroborate, but their old prices are superseded. Other genuine grants still count. |
| Plus retains history after Pro; Free whole-account UK tax-year retention and basic backup/restore | FOUNDER_CONFIRMED_COMPLETION, 5 September. No new purge or scheduler activation. |
| Upgrade proration, downgrade timing | Founder confirmed 7 September: quote actual unused-paid-time credit, effective time and next bill; upgrade only after successful difference payment. Downgrade at paid-period end on the same subscription. |
| Non-statutory refund eligibility/amount | Founder confirmed 7 September: no extra automatic promise; CS presents evidence/calculation/access/retention consequences, Founder decides each discretionary case. Mandatory rights and existing promises are not discretionary. |
| Payment-failure grace | Founder confirmed 7 September: no additional free grace; preserve the unexpired funded period and other real grants. |

All three answers are in BILLING_THREE_DECISIONS_APPROVED_20260907.md alongside
the execution authority. They are resolved, not questions for the Founder again.

The existing Web terms identify a UK sole-trader supplier and England/Wales law,
with mandatory local consumer protections preserved. A user's business records
do not by themselves determine whether that purchase is a consumer contract.
Legal research and draft CS guidance must distinguish facts, applicable law,
commercial choices and case-specific judgement. No blanket legal compliance claim.

## Normal-use verification only

Review every new runner before execution. Scope: normal authenticated demo
history, request persistence, CS review and provider status mapping; normal plan
changes/cancellation and independent-grant fallback; paid-period expiry; normal
existing-data upgrade/restore; six languages, both themes, mobile and desktop.
Use real app callables and local Firestore/Auth in the integration lane. A local
Stripe-compatible test double is explicitly not Stripe provider evidence.

No attacks, permission-bypass attempts, malformed input, fuzz, races, stress,
soak, fault injection, destructive cleanup or legacy mixed `--all` suites.
Do not weaken or edit old tests. Essential backend authorisation, idempotency and
validation remain implemented even though adversarial tests are not authorised.

No test credentials are present in the current task environment. Do not retrieve
production secrets or use live Stripe as a substitute. Provider verification
stays NOT RUN unless a suitable explicitly authorised no-real-money test setup
is available. No purchases, real charge/refund/cancellation, customer email,
push/PR/merge/deploy, new task, mobile engineering or production scheduler.

Engineering delivery: pending general independent review. Founder acceptance
and release authority remain separate.
