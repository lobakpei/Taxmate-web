# Privacy, Analytics and Error Monitoring Report

Runtime inventory: local storage; Firebase Auth/Firestore/Storage/App Check; Google/Apple authentication; Stripe billing candidate; GA4; Sentry; Google Fonts; jsPDF CDN dependencies.

GA4 uses a fixed, small event taxonomy and no financial values, descriptions, IDs or receipt data. The telemetry module rejects unknown events. Sentry removes user identity, request bodies/headers/cookies, query strings, input breadcrumbs, Firebase/Storage breadcrumbs and application contexts before transmission. Unit tests cover both controls.

The in-app and crawlable privacy copy is versioned 17 August 2026 and now states the actual split Firebase regions, Stripe role, GA4/Sentry behavior, JSON receipt limitation, account deletion scope, shared partnership retention and provider recovery retention. A production legal review, actual GA4 DebugView check and Sentry-project synthetic-event inspection remain release prerequisites; no synthetic event was sent from this local programme.
