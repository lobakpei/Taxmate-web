# Known Limitations at Final Release Candidate

- Production is unchanged. No production Hosting, Firebase, Stripe LIVE, data, DNS, merge or push occurred while preparing this candidate.
- Production Google Sign-In at `https://taxmate.uk` is the Founder-controlled known-good release invariant. Candidate production Auth keeps the established `taxmate-uk-2` configuration, Google-only provider and `signInWithPopup` path. Apple Sign-In remains intentionally absent.
- `taxmate-staging` Google OAuth has a staging-specific callback limitation. It is recorded as `STAGING_ONLY_OAUTH_LIMITATION`, is not a production release blocker and must not drive further production Auth changes.
- Valid isolated staging evidence remains accepted for deployed Functions, the persistent Stripe TEST webhook, Firestore and Storage rules, receipt lifecycle, receipt-binary ZIP restore, cross-user denial, App Check token infrastructure and IAM cleanup.
- Scottish income tax, VAT collection, companies, landlord bookkeeping and HMRC MTD submission are outside launch scope. Stripe Tax remains off and the app does not add VAT to the £3.99 Plus or £8.49 Pro monthly prices.
- Only published 2025-26 SA103S/SA104S mappings are bundled; future forms are not guessed.
- CSP remains enforcing. Inline styles are retained for the frozen UI; executable scripts and external hosts remain explicitly constrained without broad wildcards.
- Legal copy records verified engineering facts and is not a claim of full legal compliance or a replacement for legal advice.
- Sentry may derive coarse geography from network delivery despite raw-IP storage prevention. The candidate scrubber excludes bookkeeping data and identity fields.
- Functions dependencies retain moderate transitive advisories with no high/critical finding; incompatible major upgrades were not forced during release closeout.
- The final remaining action is explicit Founder release approval. After approval, release and immediate live smoke testing are one controlled operation; a failed live Google Sign-In requires immediate rollback rather than production debugging.
