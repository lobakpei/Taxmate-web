# Known Limitations at Founder Preview

- The candidate is not deployed. The Founder Preview is local and no production data/rules were changed.
- Stripe prices, secrets, webhook and Firebase Functions are intentionally unconfigured; paid checkout and promotion redemption fail closed.
- Candidate Firebase rules are not deployed, so real-account cloud testing is deliberately deferred to an isolated staging project.
- Storage emulator, App Check preview-domain, Google/Apple sign-in, live receipt lifecycle and real two-device tests require staging credentials/external state.
- Scottish income tax, VAT, companies, landlord bookkeeping and HMRC MTD submission are out of scope.
- Only published 2025-26 SA103S/SA104S mappings are bundled. Future forms are not guessed.
- JSON backup contains a receipt manifest, not receipt binaries; a full ZIP backup remains a later enhancement.
- Existing CDN dependencies and inline event handlers prevent an enforcing CSP today; the candidate uses report-only CSP and pinned URLs as an intermediate hardening step.
- NPM dependency scans report moderate advisories requiring deliberate dependency review before release.
