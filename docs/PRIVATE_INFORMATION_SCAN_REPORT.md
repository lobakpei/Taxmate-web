# Private-Information and Public-Source Scan

## Scope and method — 19 August 2026

- Current tracked source and generated/public HTML.
- Hosting-included runtime files, configuration and reports.
- Known residential-address/postcode indicators without copying them into fixtures or reports.
- Email, phone, UK postcode, credential/secret and private-key patterns.
- Git author/committer metadata across all local refs.
- W0 captured live-production source and a current read-only public-site check.

## Results

- No residential street address or postcode was found in the current TaxMate runtime pages, generated pages, current tracked candidate content or tests.
- The required controller name, ICO reference and business support mailbox appear intentionally in Privacy/Terms/help surfaces.
- No Founder phone number was found.
- No Stripe secret, webhook secret, private key, password or comparable credential was found in public runtime source.
- The Firebase web API key is present. Firebase web API keys are configuration identifiers rather than server secrets, but production must verify API restrictions, App Check and rules before release.
- Historical/baseline Git commit metadata contains a personal Gmail author address, including commits already on the public history and the unpushed candidate commits. It is redacted here. Rewriting published history is not recommended without a separate risk/coordination decision. Before pushing this candidate, the Founder must decide whether the address is intentionally public and configure a GitHub no-reply/business author address for future commits.
- Dependency lock metadata contains upstream package-author contact data; it is not Founder information and is excluded from the public-page contact allow-list.
- W0 evidence intentionally preserves an immutable historical production snapshot; it contains the business support mailbox and prior legal copy, but no residential address identified by this scan. Evidence is excluded from Firebase Hosting.

## Release status

Public-page private-information scan: **PASS WITH IDENTIFIED GIT-METADATA FOLLOW-UP**.

Production publication remains separately blocked by the ICO propagation gate and the verified new correspondence address requirement. No old residential address was encoded during this work.
