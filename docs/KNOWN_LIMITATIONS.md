# Known Limitations at Final Release Candidate

> **SUPERSEDED HISTORICAL EVIDENCE — NOT CURRENT CONTRACT TRUTH.** This report records the earlier release state and its then-valid £7.99/month / £59.99/year Pro evidence. Founder superseded that commercial contract on 29 August 2026 with launch £9.99/month, standard £11.99/month and £99.99/year. The historical evidence below is preserved unchanged and must not be used by a current pricing gate.

- Production is unchanged. No production Hosting, Firebase, Stripe LIVE, data, DNS, merge or push occurred while preparing this candidate.
- Production Google Sign-In at `https://taxmate.uk` is the Founder-controlled known-good release invariant. Candidate production Auth keeps the established `taxmate-uk-2` configuration, Google-only provider and `signInWithPopup` path. Apple Sign-In remains intentionally absent.
- `taxmate-staging` Google OAuth has a staging-specific callback limitation. It is recorded as `STAGING_ONLY_OAUTH_LIMITATION`, is not a production release blocker and must not drive further production Auth changes.
- Valid isolated staging evidence remains accepted for deployed Functions, the persistent Stripe TEST webhook, Firestore and Storage rules, receipt lifecycle, receipt-binary ZIP restore, cross-user denial, App Check token infrastructure and IAM cleanup.
- Scottish income tax, VAT collection, companies, landlord bookkeeping and HMRC MTD submission are outside launch scope. Stripe Tax remains off and the app does not add VAT to the Plus £3.99/month or £29.99/year and Pro £7.99/month or £59.99/year prices.
- Only published 2025-26 SA103S/SA104S mappings are bundled; future forms are not guessed.
- CSP remains enforcing. Inline styles are retained for the frozen UI; executable scripts and external hosts remain explicitly constrained without broad wildcards.
- Legal copy records verified engineering facts and is not a claim of full legal compliance or a replacement for legal advice.
- Sentry may derive coarse geography from network delivery despite raw-IP storage prevention. The candidate scrubber excludes bookkeeping data and identity fields.
- Functions dependencies retain moderate transitive advisories with no high/critical finding; incompatible major upgrades were not forced during release closeout.
- Stripe LIVE products, monthly/yearly prices and webhook exist; the restricted LIVE key was rotated and both Stripe secrets are enabled in `taxmate-uk-2`. No production Functions are currently deployed, so runtime secret binding and LIVE Checkout remain pending the separately approved production deployment.
- Four final Founder promotions are active in production Firestore with Founder-approved start, fixed/permanent expiry and capacity. Exact codes are intentionally absent from the public repository. Candidate Functions implementing their complete runtime lifecycle are not deployed until release approval.
- This promo change produces a new candidate SHA/tree and therefore requires fresh Founder approval before push, merge or production deployment. After approval, release and immediate live smoke testing remain one controlled operation; a failed live Google Sign-In requires immediate rollback rather than production debugging.
