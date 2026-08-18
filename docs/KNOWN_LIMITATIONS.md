# Known Limitations at Final Founder Preview

- The candidate is not deployed. No production data, rules, Functions, Stripe configuration or Hosting state changed.
- No isolated staging Firebase/Stripe/GA4/Sentry configuration is available. External validation is blocked as itemized in `STAGING_EXTERNAL_SERVICE_REPORT.md`.
- Apple Sign-In is intentionally removed and out of scope; Google is the sole authentication provider in the candidate.
- Google staging sign-in, cloud receipt lifecycle/full-ZIP restore, App Check, GA4 delivery, Sentry payload inspection, Stripe TEST lifecycle and genuine two-client sync remain release-blocking staging checks.
- Scottish income tax, VAT, companies, landlord bookkeeping and HMRC MTD submission are out of scope.
- Only published 2025-26 SA103S/SA104S mappings are bundled; future forms are not guessed.
- CSP is enforcing. Inline styles remain permitted to preserve the frozen UI; any staging endpoint must be allow-listed explicitly rather than by widening policy.
- GitHub CLI authentication for `lobakpei` is currently invalid. Read-only public Git verification works, but authentication must be repaired before any approved push/PR action.
- NPM dependency scans previously reported moderate advisories requiring deliberate dependency review before release.
