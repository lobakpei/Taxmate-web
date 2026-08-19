# Known Limitations at Final Founder Preview

- The candidate is not deployed. No production data, rules, Functions, Stripe configuration or Hosting state changed.
- No approved isolated TaxMate Firebase/Stripe/GA4/Sentry configuration is available. The visible Stripe TEST sandbox belongs to `toodaloop` and was not modified. External validation is blocked as itemized in `STAGING_EXTERNAL_SERVICE_REPORT.md`.
- Apple Sign-In is intentionally removed and out of scope; Google is the sole authentication provider in the candidate.
- Google staging sign-in, real cloud receipt/full-ZIP restore, deployed App Check, GA4 delivery, Sentry received-payload inspection and Stripe TEST lifecycle remain release-blocking. Genuine two-client, offline, receipt, partnership and deletion behavior now pass against the isolated Emulator Suite.
- Scottish income tax, VAT, companies, landlord bookkeeping and HMRC MTD submission are out of scope.
- Only published 2025-26 SA103S/SA104S mappings are bundled; future forms are not guessed.
- CSP is enforcing. Inline styles remain permitted to preserve the frozen UI; any staging endpoint must be allow-listed explicitly rather than by widening policy.
- GitHub CLI authentication for `lobakpei` is currently invalid. Read-only public Git verification works, but authentication must be repaired before any approved push/PR action.
- Root production dependency audit reports 0 vulnerabilities. Functions production dependencies report 8 moderate transitive advisories and 0 high/critical; npm's suggested complete fixes require incompatible major upgrades, so no forced rewrite was applied. Review again before deployment.
- Legal copy is engineering-reviewed, not legal advice or a statement of compliance. Founder/UK-adviser approval remains required for lawful bases, legitimate interests, consumer/business classification, cooling-off/refund wording and retention.
- ICO correspondence-address change is `ICO_UPDATE_CONFIRMED_PENDING_PUBLIC_PROPAGATION`. Production publication stays blocked until reference `ZC174150` shows the new non-residential/PO Box/alternative address. Exact `TaxMate` register casing is a minor administrative follow-up.
- The verified new correspondence address is not yet in the candidate because it is not public/provided; distance-selling identity/address information must be completed before paid production release.
- Support email is routed from public `support@taxmate.uk` through Namecheap forwarding to a private Microsoft Outlook mailbox. Forwarding logs/copies, Outlook retention/account type, access controls, provider terms/transfers, GA4 two-month retention/settings, Sentry retention/region and actual received telemetry payloads remain unverified. The private destination address must not be published.
- Historical Git author metadata contains a personal Gmail address. Decide the future no-reply/business author identity and any history treatment before pushing; no history was rewritten here.
- Stripe TEST must prove Plus £3.99/month and Pro £8.49/month with monthly-only launch billing, VAT/tax treatment, renewal presentation, Terms consent, durable contract confirmation, cooling-off/cancellation/refund operation and Billing Portal configuration.
- Refund-to-entitlement behavior and VAT/Stripe Tax treatment remain `BLOCKED_FOUNDER_INPUT`; source code does not invent those commercial/accounting policies.
