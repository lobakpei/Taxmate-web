# Known Limitations at Final Founder Preview

- The candidate is not deployed. No production data, rules, Functions, Stripe configuration or Hosting state changed.
- Existing TaxMate Firebase configuration is verified, but candidate Functions are not deployed and production was not used as staging. An isolated TaxMate Stripe sandbox was created without modifying the pre-existing `toodaloop` sandbox. GA4 received-event and Sentry received-payload access remain unavailable.
- Apple Sign-In is intentionally removed and out of scope; Google is the sole authentication provider in the candidate.
- Google browser sign-in, real cloud receipt/full-ZIP restore, deployed candidate App Check/Functions, GA4 delivery and Sentry received-payload inspection remain release-blocking. Stripe TEST server lifecycle now passes. Genuine two-client, offline, receipt, partnership and deletion behavior pass against the isolated Emulator Suite.
- Scottish income tax, VAT, companies, landlord bookkeeping and HMRC MTD submission are out of scope.
- Only published 2025-26 SA103S/SA104S mappings are bundled; future forms are not guessed.
- CSP is enforcing. Inline styles remain permitted to preserve the frozen UI; any staging endpoint must be allow-listed explicitly rather than by widening policy.
- GitHub CLI is authenticated as `lobakpei` over HTTPS. Push/PR remains prohibited until explicit Founder approval.
- Root production dependency audit reports 0 vulnerabilities. Functions production dependencies report 8 moderate transitive advisories and 0 high/critical; npm's suggested complete fixes require incompatible major upgrades, so no forced rewrite was applied. Review again before deployment.
- Legal copy is engineering-reviewed, not legal advice or a statement of compliance. Founder/UK-adviser approval remains required for lawful bases, legitimate interests, consumer/business classification, cooling-off/refund wording and retention.
- ICO correspondence-address change is `ICO_UPDATE_CONFIRMED_PENDING_PUBLIC_PROPAGATION`. Production publication stays blocked until reference `ZC174150` shows the new non-residential/PO Box/alternative address. Exact `TaxMate` register casing is a minor administrative follow-up.
- The verified new correspondence address is not yet in the candidate because it is not public/provided; distance-selling identity/address information must be completed before paid production release.
- Support email is routed from public `support@taxmate.uk` through Namecheap forwarding to a private Microsoft Outlook mailbox. Forwarding logs/copies, Outlook retention/account type, access controls, provider terms/transfers, GA4 two-month retention/settings, Sentry retention/region and actual received telemetry payloads remain unverified. The private destination address must not be published.
- Historical Git author metadata contains a personal Gmail address. Decide the future no-reply/business author identity and any history treatment before pushing; no history was rewritten here.
- Stripe TEST proves exact Plus/Pro monthly prices, server checkout, Terms consent, promotions, refusal, cancellation and webhook entitlement. Hosted card completion, Billing Portal browser UX, durable confirmation, VAT/tax treatment and refund operation remain outstanding.
- Refund-to-entitlement behavior and VAT/Stripe Tax treatment remain `BLOCKED_FOUNDER_INPUT`; source code does not invent those commercial/accounting policies.
