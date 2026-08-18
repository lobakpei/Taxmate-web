# Privacy, Analytics and Error Monitoring Report

Runtime inventory: local storage; Firebase Auth/Firestore/Storage/App Check; Google authentication; Stripe billing candidate; GA4; Sentry; Google Fonts; jsPDF CDN dependencies. Apple authentication is intentionally removed.

GA4 uses a fixed, small event taxonomy and no financial values, descriptions, IDs or receipt data. The telemetry module rejects unknown events. Sentry removes user identity, request bodies/headers/cookies, query strings, input breadcrumbs, Firebase/Storage breadcrumbs and application contexts before transmission. Unit tests cover both controls and passed in the 75/75 final gate.

The in-app privacy copy now describes Google sign-in only and retains the documented Firebase region, Stripe role, GA4/Sentry behavior, deletion scope, shared partnership retention and provider recovery retention.

No real staging GA4 event or Sentry synthetic error was transmitted because no isolated staging property/project credentials exist. Actual delivery and received-payload inspection remain release prerequisites; production endpoints were not used as a substitute.
