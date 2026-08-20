# UK Online/Distance-Selling Pre-contract Review

Official baseline: <https://www.gov.uk/online-and-distance-selling-for-businesses/distance-selling> and CMA fair-terms guidance at <https://www.gov.uk/guidance/how-to-write-fair-contracts>.

## Implemented in candidate

- Free is described as having no subscription charge.
- Prices are stated as Free £0; Plus £3.99/month or £29.99/year; and Pro £7.99/month or £59.99/year.
- Plus and Pro are recurring subscriptions at the selected monthly or yearly cadence.
- Plan copy says Stripe Checkout must show total price, tax if applicable, billing interval, renewal, plan and discount before payment.
- Stripe Checkout requires acceptance of the configured Terms URL.
- Terms explain renewal, Billing Portal cancellation, end-of-period access, promotion expiry, record preservation, cooling-off rights, immediate service request, statutory rights, fair changes and non-excludable liability.
- Direct promotion access is contractually distinguished from a paid Checkout discount.

## Production blockers

| Requirement | Status |
|---|---|
| Legal/trading identity and email | Present |
| Geographical/correspondence address | **BLOCKED_PENDING_ICO_PROPAGATION**; do not publish the residential-looking address. Insert the verified new business address once live/provided. |
| Service description | Present, including tax/HMRC limitations |
| Exact price, currency and billing period | Founder-approved: Free £0; Plus £3.99/month or £29.99/year; Pro £7.99/month or £59.99/year. Must match Stripe TEST and LIVE price objects exactly. |
| VAT/tax treatment | Launch configuration verified: Stripe Tax off; no VAT added or VAT invoice/amount; do not claim “includes VAT”; future registration threshold remains operational monitoring |
| Auto-renewal and minimum term | Terms present; exact Checkout display must be verified |
| Cancellation method | Billing Portal/support described; portal configuration and end-to-end cancellation must pass staging |
| Cooling-off information and model form | Rights described; Founder/legal adviser must approve classification, deduction/immediate-performance mechanism and provide durable model form |
| Durable contract confirmation | Not verified; configure/test Stripe email/receipt or equivalent durable confirmation |
| Terms checkbox | Implemented in Checkout Session; requires valid Dashboard Terms URL |
| Price/service-change notice | Fair-notice wording present; operational notice process not yet implemented |
| Consumer/business-user classification | Legal judgement required because TaxMate targets self-employed users |
| DMCC subscription regime | Obtain current UK advice before launch; do not assume uncommenced/secondary provisions from statute alone |

This engineering review does not determine legal compliance. Paid activation remains blocked until the checkout evidence and legal decisions above are complete.
