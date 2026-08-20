# Legal & Privacy Release Gate Report

## Status — 19 August 2026

Engineering gate: **COMPLETE, SUBJECT TO THE BLOCKERS BELOW**.

Production publication gate: **BLOCKED_PENDING_ICO_PROPAGATION**. The Founder has supplied formal confirmation that the ICO correspondence-address change was actioned. The live entry for `ZC174150` still displays a residential-looking address at the time of the final check, so no address was copied into source, tests or reports. This is classified `FOUNDER_INPUT / ICO_UPDATE_CONFIRMED_PENDING_PUBLIC_PROPAGATION`; the Founder must not be asked to resubmit it. `AcreMiles` and the clearly intended `Taxmate` trading name are present. Exact `TaxMate` casing is a minor administrative follow-up, not a release blocker.

This report describes engineering evidence, not a statement that TaxMate is fully compliant or GDPR compliant.

## Implemented alignment

- Replaced the compressed Privacy Policy and Terms with version `2026-08-19` standalone and in-app content.
- Added explicit controller, categories, purposes, lawful bases, recipients, transfers, retention, rights, objection, automated-calculation and complaint information.
- Added a standalone `terms.html` page and included it in the sitemap and offline shell.
- Made GA4 opt-in and off by default. The Google tag is not requested until the user enables optional analytics. Events remain restricted to a value-free allow-list.
- Reduced Sentry events to structural exception type and stack location; removed message content, user, request, breadcrumbs, contexts, extras and input values.
- Corrected account deletion to remove promotion redemptions and local hidden recovery/cache keys; last-member partnerships are deleted, while partnerships with another member retain shared records and remove the departing membership.
- Stopped swallowing receipt/Stripe cleanup errors so server deletion cannot be represented as complete when critical cleanup failed.
- Required Stripe Checkout terms consent. Paid access remains server-verified.
- Added pre-contract plan wording covering recurring billing, Checkout disclosure, cancellation and the distinction between a free-access promotion and a Checkout discount.
- Recorded Founder-approved pricing: Free £0; Plus £3.99/month or £29.99/year; Pro £7.99/month or £59.99/year. Monthly and yearly plans renew until cancelled.
- Recorded the support path as public `support@taxmate.uk`, routed by Namecheap email forwarding to a private Microsoft Outlook mailbox without publishing the destination address.
- Removed the Apple identity-provider CSP allowance. Google remains the sole authentication provider.
- Replaced unsupported “MTD-ready”, “for HMRC checks”, guaranteed-refund, blanket-security, blanket-deletion and blanket-liability wording.

## Official guidance used

- ICO required privacy information: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/>
- ICO lawful-basis guidance: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/>
- GOV.UK distance-selling information: <https://www.gov.uk/online-and-distance-selling-for-businesses/distance-selling>
- CMA fair-contract guidance: <https://www.gov.uk/guidance/how-to-write-fair-contracts>
- Firebase privacy and processing terms: <https://firebase.google.com/support/privacy> and <https://firebase.google.com/terms/data-processing-terms/20230601>
- Stripe privacy/transfer information: <https://stripe.com/gb/legal/privacy-center> and <https://stripe.com/gb/legal/dpa/faqs>
- Sentry transfer material: <https://sentry.io/astro-assets/trust/International-Data-Transfers-With-Sentry-2025-12-26.pdf>
- GA4 collection and retention: <https://support.google.com/analytics/answer/12017362> and <https://support.google.com/analytics/answer/7667196>

## Remaining release blockers and legal judgement

1. The ICO live register must display the non-residential/PO Box/alternative correspondence address. Only then may the verified address be inserted where the distance-selling rules require a geographical/contact address.
2. The Founder or UK adviser must approve the final Privacy Policy, Terms, lawful bases, legitimate-interest balancing and whether purchasers contract as consumers, business users, or both.
3. Before paid release, configure and verify Stripe price objects matching Plus £3.99/month or £29.99/year and Pro £7.99/month or £59.99/year, VAT/tax treatment, renewal disclosures, model cancellation form, immediate-performance wording, Stripe terms URL, Billing Portal cancellation and durable email confirmation.
4. Execute/confirm current provider DPAs/terms and transfer safeguards, including Namecheap forwarding and Microsoft Outlook; document mailbox access controls, forwarding-log/copy behaviour and retention.
5. Set and evidence GA4 user/event retention to two months and a fixed Sentry event-retention period. Verify data-sharing, Google Signals, granular location/device and ad-linking settings in isolated staging.
6. Decide how to handle the pre-existing personal Gmail address in Git author metadata before publishing this candidate. No history was rewritten here.
7. Complete isolated staging validation. Production was not used as a substitute.

No AcreMiles source, production service, remote branch or deployed configuration was changed.
