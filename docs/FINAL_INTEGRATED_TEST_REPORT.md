# Final Integrated Test Report

## Final UI freeze identity

Validated 18 August 2026 on branch `codex/taxmate-modernisation-20260817`, starting from committed RC `138efa4c891af30f9581e4e3488e4f5c1b5481e4`. Runtime identity is app `2.0.0-rc.1`, build `2026-08-18.final-ui-freeze.1`, PWA cache `taxmate-v2-rc-1-final-ui-freeze`. The final commit and tree are recorded at handoff because a commit cannot contain its own hash.

The working-tree audit found only the five Founder-approved changes: Home add-business/catch-up spacing; complete removal of Apple Sign-In in favour of Google only; approved green Tax hero in light mode while retaining the dark treatment; floating-add optical centring; and one independent promotion-code entry above all plan cards. A dedicated regression file protects all five decisions.

## Automated gate

`npm run test:all` passed 75/75: characterization 4, unit 58, integration 4, static Firebase rules 4 and real Firestore-emulator tests 5. `git diff --check` passed. The first identity run correctly failed after the build constant changed but before the HTML build marker changed; the marker was synchronized and the entire gate was rerun from the start without weakening a test.

## Browser and visual gate

The exact repository was served with the enforcing Hosting CSP at `http://127.0.0.1:4173/`, with Firebase disabled locally. The in-page audit passed 29/29 with zero warnings. Founder-fix measurements confirmed a 14px Home gap, Google as the sole account button, no Apple UI text, one promotion entry 14px above the first plan card, the approved green light-mode Tax gradient, and a horizontally centred floating plus with the approved 2px optical correction.

Responsive checks covered 320, 360, 375, 390 and 430 mobile widths plus 1280×800, 1440×900 and 1920×1080. All six languages were exercised at 320px in light and dark across Home, Income, Expenses, Tax and Settings: 60 language/theme/page checks with no document or visible-button overflow; Urdu remained RTL. A further 35 viewport/page checks found no overflow. At 1440×900 the entry dialog was 520px, centred, focused the date field and closed with Escape. Fresh-origin onboarding had exactly one root, opened, progressed and closed deliberately. Both browser origins had zero app-origin warning/error. After the preview server stopped, the final-freeze service worker relaunched the app and displayed the new build identity offline.

External Firebase, Stripe TEST, GA4 and Sentry validation is not represented as passed; the isolated-staging blocker is recorded in `STAGING_EXTERNAL_SERVICE_REPORT.md`.

## Legal & Privacy Gate addendum — 19 August 2026

Build `2026-08-19.legal-privacy-gate.1` passed the complete `npm run test:all` command: characterization 4/4, unit 65/65, integration 4/4, static Firebase rules 4/4 and Firestore-emulator rules 5/5, for 82/82 total. The seven additional unit checks protect the current Privacy/Terms identity, optional GA4 default, minimised Sentry payload, server deletion and Checkout terms collection, Google-only authentication, removal of stale claims, and absence of private contact details or credentials in the public runtime.

Founder pricing and support-routing input produced build `2026-08-19.legal-privacy-gate.2`: Free £0, Plus £3.99/month, Pro £8.49/month, monthly-only launch billing, and public support routed through Namecheap to a private Microsoft Outlook destination. The destination address is not present in public source or reports. The complete gate was rerun after these changes; see `AUTOMATED_TEST_REPORT.md` for the latest result.

Browser checks passed for the in-app and standalone Privacy Policy and Terms, the analytics control remained unchecked, no Google Analytics script was loaded before consent, Google remained the only sign-in provider, and all checked pages had zero console warning/error. External service receipt, sync, Stripe, GA4 delivery and Sentry-receipt testing remains isolated-staging work and is not represented as passed.

## Production-readiness addendum — 19 August 2026

Build `2026-08-19.production-readiness-rc.1` adds 11 real Firestore/Storage emulator tests and three Auth/Functions integration tests. Evidence covers cross-user denial, owner-only receipts, two same-account clients, concurrent convergence, actual offline reconnect, tombstone non-resurrection, server-authoritative partnership join/leave, departing-member access removal, last-member partnership deletion and authenticated account deletion across Firestore, Storage, promotions and Auth.

The service worker was tested by installing the current shell, stopping the preview server, closing the active client and reopening the app. An initial run exposed fallback into an older retained cache; activation and current-cache lookup were corrected, after which the offline app displayed the exact production-readiness build identity. External Firebase/Google, TaxMate Stripe TEST, GA4 received delivery and Sentry received payload remain BLOCKED rather than simulated.
