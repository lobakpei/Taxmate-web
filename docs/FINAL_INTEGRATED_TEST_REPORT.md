# Final Integrated Test Report

## Automated gate

`npm run test:all` passed 70/70: characterization 4, unit 53, integration 4, static Firebase rules 4 and real Firestore-emulator tests 5. New checks cover 572-key parity across all six locales, placeholders, Urdu/Spanish leakage, corrected MTD/SA/promotion localisation, one deterministic onboarding root, open/progress/close, receipt-device controls and coherent RC/PWA identity.

## Browser and visual gate

The enforcing-CSP local preview passed its legacy audit 29/29 with no app-origin warning/error. Interactive checks covered onboarding open/progress/close, Settings and navigation, desktop entry dialog focus and Escape close, and retained backup/CSP behavior.

Responsive checks covered 320, 360, 375, 390 and 430 mobile widths plus 1280×800, 1440×900 and 1920×1080 desktop. All six languages were exercised at the smallest/typical mobile widths in light and dark; Urdu rendered RTL with no detected Spanish UI text. No tested button overflow or document-width overflow was found. At desktop width the entry sheet measured 520px and was vertically centred. The viewport policy permits zoom and large text (`initial-scale=1.0`, with no maximum-scale/user-scalable lock).

The final UI files matched the accepted Claude artifact hashes before the required engineering/i18n changes. UI-01–UI-09 remained present. Receipt source/unit checks prove one captured-image input and one non-capture image picker share `onReceiptFile`, mobile exposes exactly the two accepted actions, desktop advertises upload only, and batch capture is conditional on touch capability.

PWA checks covered a fresh origin, changed release/cache identity, service-worker update and successful offline relaunch at `2.0.0-rc.1`. The offline page retained one onboarding root and produced no app-origin error.
