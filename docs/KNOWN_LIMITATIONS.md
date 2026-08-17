# Known Limitations at Founder Preview

- The candidate is not deployed. The Founder Preview is local and no production data/rules were changed.
- Stripe prices, secrets, webhook and Firebase Functions are intentionally unconfigured; paid checkout and promotion redemption fail closed.
- Candidate Firebase rules are not deployed, so real-account cloud testing is deliberately deferred to an isolated staging project.
- Storage emulator, App Check preview-domain, Google/Apple sign-in, live receipt lifecycle and real two-device tests require staging credentials/external state.
- Scottish income tax, VAT, companies, landlord bookkeeping and HMRC MTD submission are out of scope.
- Only published 2025-26 SA103S/SA104S mappings are bundled. Future forms are not guessed.
- Full ZIP export/restore includes receipt binaries, but live receipt enumeration, upload and rollback deletion still require a signed-in isolated staging account for browser E2E. JSON-only backups remain supported and intentionally do not contain binaries.
- CSP is enforcing with external executable scripts and `script-src-attr 'none'`. Inline styles remain permitted to preserve the Founder-approved single-file visual system. Firebase/Auth, GA4, Sentry and billing network allowlists require staging verification; blocked integration endpoints must be added explicitly rather than widened.
- The action dispatcher intentionally accepts only the existing TaxMate declarative action grammar. Any future UI action must be added explicitly and covered by CSP/browser tests.
- NPM dependency scans report moderate advisories requiring deliberate dependency review before release.
