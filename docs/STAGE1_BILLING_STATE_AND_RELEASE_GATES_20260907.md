# Stage 1 Web billing: state contract and remaining gates

Engineering candidate only. Status: 待一般獨立核對. No Founder acceptance or
release authority. This document does not override the dated Founder decisions.

B01–B04 update: the first billing candidate was independently rejected. Its
same-scope repair is now **待一般獨立再核對**, not accepted. The repair report
`STAGE1_BILLING_B01_B04_REPAIR_20260907.md` documents staff review context, shared
conditional projection, displayed-version checks and focused UI corrections.

## Normal state mapping

B03.1 follow-up: customer refund details now use case-specific conditional
retention, and a separately verified, dated result after provider success.
Missing outcome facts remain checking. See `STAGE1_BILLING_B031_REPAIR_20260907.md`.
The earlier B01–B04 result is historical; this follow-up awaits re-review.

| User action or provider fact | App / service result | Access or money consequence |
| --- | --- | --- |
| Free selects Plus or Pro | Trusted server offer, price, interval, terms; unchecked acceptance and early-start choices | No charge or grant |
| Accept offer | Personally addressed immutable terms/request record, one resumable hosted Checkout | Record explicitly does not confirm payment |
| Provider confirms paid invoice | Reconcile invoices, refunds, all subscriptions and grants | Corresponding funded tier becomes available |
| Return from unfinished checkout | Resume the same offer/session | No overlapping checkout or subscription |
| Paid Plus requests Pro | Actual provider preview, paid unused credit, difference, next payment | No change until confirmation and successful difference payment |
| Upgrade payment pending | `pending_payment`, hosted invoice continuation | Funded Plus remains; no unpaid Pro |
| Pro requests Plus | `scheduled`, same subscription, paid-end boundary | Pro remains until paid end; next base renewal is Plus |
| Paid boundary / failed renewal | Funded-period projection, payment attention | No new free grace; preserve other still-funded grants |
| Stop renewal | Provider `cancel_at_period_end`; release scheduled change first | Paid period remains; no automatic refund |
| Submit refund request | `submitted`, immutable receipt acknowledgement | Not approval, submission to provider or completed refund |
| CS needs information | `needs_information`, customer reply returns `submitted` | Original acknowledgement remains unchanged |
| Reviewer approves / declines | `approved` or `declined`, basis/reference/calculation and separate renewal decision | No money request just from review |
| Authorised operator confirms approved refund | `refund_submitting` then provider status | Stable operation identity; uncertain operations require reconciliation |
| Provider pending / success / failed / canceled | `refund_pending` / `refunded` / `refund_failed` / `refund_canceled` | Only confirmed success contributes refunded amount |
| Partial refund | Payment shows partial total, case shows approved amount | Does not automatically revoke access |
| Full refund of a funded period | Remove that funded period | Other valid Plus/Pro/promotion grants and later paid periods remain |

Prices are base GBP prices from the approved configured provider prices, not new
prices created by this candidate. Scheduled renewal displays the target price;
discounts/taxes are not guessed. Exact hosted final totals still require provider
verification. Same-interval single-item changes are automated; multiple items,
existing schedules/pending changes, discounts, automatic tax, manually invoiced
subscriptions, refunded/credited upgrade time and unrecognized prices require
individual review. These are explicit limitations, not silent provider defaults.

## Staff and data boundary

- `billingSupport`: customer-safe case list/read, request more information and
  reconcile provider status. Long histories have pagination.
- `billingApprover`: approved human reviewer. Goodwill approval belongs to the
  Founder; the specific case reference is recorded. Do not give this claim to
  ordinary CS staff merely because they can read cases.
- `billingRefundOperator`: separate approved money/renewal execution. A claim is
  not a substitute for case-specific authority. No production claims provisioned.
- Both money operations and new-checkout consumer-disclosure readiness default
  to false. This draft's supplier-address verification is also false; production
  checkout cannot be enabled by the readiness flag alone. Only an isolated
  demo emulator may exercise the unfinished-disclosure candidate.
- Billing collections are server-owned, outside personal bookkeeping backups,
  portable restore and bookkeeping retention cleanup. No new retention period
  or purge is invented for billing/legal records. Their access/retention review
  remains a release gate.
- Contract confirmation content is immutable; current provider outcome is a
  separate record. Refund requests preserve an immutable original acknowledgement
  even after a reply. Customers can download records; no email is sent.
- Legacy promotion/retention behaviour is retained. No new payment-failure grace
  is added. Existing-data repair is not claimed on the strength of a clean fixture.

## Verification limits and remaining work

1. **Stripe TEST — NOT RUN.** No authorised usable TEST credentials were found.
   The loopback protocol double exercises the real SDK and Firebase callables;
   it does not prove hosted Checkout, payment-method portal, invoice semantics,
   actual schedule transitions, provider permissions or real webhook delivery.
   The installed SDK is Stripe 18.5.0 / API 2025-08-27.basil. Its supported schedule
   `iterations` parameter is used; this is not evidence against a newer API.
2. **Exact 2.1.18 → candidate split-cloud repair — NOT RUN this round.** The existing
   focused script calls `install218ProfileWriteFailure` to create its scenario.
   That is fault injection and expressly outside this round's authority. It was
   inspected, not executed or weakened. Fresh emulator fixtures and clocked unit
   lifecycle examples must not replace same-persistent-state red/green evidence.
3. **Legal / consumer release — NOT CLEARED.** The approved public PO Box is only a
   correspondence address. Verified geographical establishment address is still
   requested; do not substitute a private home address or relabel the PO Box.
   The contract currently contains a clearly marked working cancellation template,
   a link to the official Schedule 3 model form, and a pending-verification notice.
   It is not a completed sales-ready statutory model form. Confirm classification,
   pre-contract disclosures, actual contract formation and durable record delivery
   and availability before new consumer sales. Six operational languages do not
   mean the English legal contract has received six-language legal review.
4. **Independent review — PENDING.** Original engineering self-checks do not fill
   the coordinator's independent review or Founder acceptance.
5. **Adversarial / destructive / old mixed aggregate suites — NOT RUN.** No attacks,
   bypass, fuzz, races, fault injection, stress/soak, cleanup deletion or all-suite
   dispatch. Essential authorisation/idempotency guards remain implemented.
6. **Production and later phases — NOT AUTHORISED.** No live charge/refund/cancel,
   price update, customer email, push, PR, merge, deployment, scheduler or mobile
   engineering. No new task or agent was created.

At an explicitly authorised later release-preparation step, remind the Founder
to open `TaxMate Refund & Subscription CS Desk`; do not create it now.

## Technical references checked

[Checkout session parameters](https://docs.stripe.com/api/checkout/sessions/create),
[subscription schedules](https://docs.stripe.com/billing/subscriptions/subscription-schedules),
[pending updates](https://docs.stripe.com/billing/subscriptions/pending-updates),
[prorations](https://docs.stripe.com/billing/subscriptions/prorations).
Legal sources and CS reply drafts are in `STAGE1_BILLING_LEGAL_CS_DRAFT_20260907.md`.
