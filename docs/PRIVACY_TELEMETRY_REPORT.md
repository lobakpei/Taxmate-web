# Privacy, Analytics and Error Monitoring Report — Legal Gate 2026-08-19

Runtime inventory: local storage; Firebase Auth/Firestore/Storage/App Check; Google authentication; Stripe billing candidate; GA4; Sentry; Namecheap email forwarding; Microsoft Outlook; Google Fonts; jsPDF CDN dependencies. Apple authentication is intentionally removed. The private Outlook destination is not present in public source.

GA4 uses a fixed, small event taxonomy and no financial values, descriptions, IDs or receipt data. It is now off by default: the Google tag is loaded only after the user opts in from Settings, and consent can be withdrawn there. The telemetry module rejects unknown events and does not send a page view automatically. Sentry removes user identity, messages, request data, breadcrumbs, contexts and extras; exception messages are replaced with `Application error`, leaving only structural exception type and a minimised stack location.

The in-app and standalone privacy copy now describes Google sign-in only and documents Firebase regions, Stripe role, GA4 consent, Sentry minimisation, lawful bases, transfers, deletion scope, partnership retention and provider recovery/legal retention.

No real staging GA4 event or Sentry synthetic error was transmitted because no isolated staging property/project credentials exist. The available Google session has no GA4 property and Sentry requires authentication. Actual consent behavior, delivery, provider settings and received-payload inspection remain release prerequisites; production endpoints were not used as a substitute. Set GA4 user/event retention to two months, disable unnecessary sharing/Signals/granular location-device collection, and select a fixed short Sentry retention before release.
