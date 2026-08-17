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
