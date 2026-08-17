# Known Limitations at Founder Preview

- The candidate is not deployed. The Founder Preview is local and no production data/rules were changed.
- No isolated staging Firebase project, staging Auth providers, App Check preview domain, or staging user credentials are configured. The only repository Firebase alias points at production and was deliberately not used.
- Stripe test prices/secrets/webhook configuration are unavailable; paid checkout and promotion redemption therefore remain unverified and fail closed.
- Real Google/Apple sign-in, cloud receipt lifecycle/full-ZIP restore, App Check, GA4 delivery, Sentry payload inspection and genuine two-client sync remain release-blocking staging checks. See `STAGING_EXTERNAL_SERVICE_REPORT.md`.
- Scottish income tax, VAT, companies, landlord bookkeeping and HMRC MTD submission are out of scope.
- Only published 2025-26 SA103S/SA104S mappings are bundled. Future forms are not guessed.
- Full ZIP export/restore includes receipt binaries, but live receipt enumeration, upload and rollback deletion still require a signed-in isolated staging account for browser E2E. JSON-only backups remain supported and intentionally do not contain binaries.
- CSP is enforcing with external executable scripts and `script-src-attr 'none'`. Inline styles remain permitted to preserve the Founder-approved single-file visual system. Firebase/Auth, GA4, Sentry and billing network allowlists require staging verification; blocked integration endpoints must be added explicitly rather than widened.
- The action dispatcher intentionally accepts only the existing TaxMate declarative action grammar. Any future UI action must be added explicitly and covered by CSP/browser tests.
- The final unlocked touch/pointer receipt layouts are source- and unit-verified and match the accepted Claude evidence. A fresh live unlocked browser run requires a staging-verified Plus/Pro entitlement and is included in the staging blocker.
- GitHub CLI authentication is currently invalid for `lobakpei`; this does not affect the local Founder Preview but must be repaired before push/PR work.
- NPM dependency scans report moderate advisories requiring deliberate dependency review before release.
