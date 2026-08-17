# Browser E2E and Visual Preservation Report

Executed 17 August 2026 against `http://127.0.0.1:5002/` in the Codex in-app browser.

Passed:

- fresh local user, dashboard, business creation and £60,000 income workflow;
- 2026-27 tax estimate, official Class 2 values, gross-income MTD assessment and safe non-submission copy;
- future SA form mapping refused rather than guessed;
- mobile 390×844 and desktop 1280×800;
- English, Traditional Chinese and Urdu RTL; light and dark;
- dialog focus entry, Escape/focus-trap implementation and restored zoom policy;
- no new app-origin warning/error after local Firebase isolation;
- true offline relaunch after the server process was stopped;
- build identity visible in Settings.

Visual evidence is in `evidence/final/screenshots`. W0 frozen screenshots remain in `evidence/w0/screenshots`. The existing cards, navigation, typography, spacing, colors, light/dark styling and onboarding were preserved. Intended visible changes only: corrected MTD/SA/POA fields and copy, optional property-income inputs, secure billing/promotion controls, build identity, and required public legal/SEO pages. No optional polish was implemented; candidates remain in `UI_POLISH_CANDIDATES.md`.

Not executed against external accounts: Google/Apple sign-in, live Stripe sandbox, live two-device cloud sync, App Check on a preview hostname and live receipt upload. These require configured non-production services.

## W5.5/W5.6 rerun

Rerun 17 August 2026 against `http://127.0.0.1:4173/` with the exact enforcing Hosting CSP served locally. The in-page audit passed 29/29 with no new CSP/app-origin console error. Onboarding, start-without-account, business creation, navigation, Settings disclosure and the full ZIP export control worked through the external declarative-action dispatcher. The ZIP generated a browser download and showed completion feedback. The service worker then relaunched the same app successfully after the preview server was stopped. A mobile-width dark Settings inspection showed no unintended layout, colour, typography or navigation drift.

Receipt upload/restore, Firebase/Auth, GA4 delivery, Sentry ingestion and billing remain staging-only checks: no credential or production service was simulated.

## Final integrated UI rerun

The `2.0.0-rc.1` candidate was rerun under enforcing CSP at the full requested viewport set: 320, 360, 375, 390, 430, 1280×800, 1440×900 and 1920×1080. All six languages were exercised at the worst-case mobile widths in light/dark, including Urdu RTL. No document/button overflow, duplicate onboarding root, visible Urdu/Spanish leak, or app-origin warning/error was observed. The 1440px entry sheet was a centred 520px dialog with focus on the date field and Escape close. Fresh-origin onboarding opened, progressed and closed with one root. The updated service worker relaunched the RC offline after the server stopped.

The Founder-approved touch/pointer receipt component is additionally protected by source/unit tests. A live unlocked receipt-browser pass remains staging-only because the production-like app correctly requires a verified paid entitlement; no debug unlock was introduced.
