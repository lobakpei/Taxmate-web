# Browser E2E and Visual Preservation Report

## Programme evidence

The 17 August 2026 W0–W5.6 and final-integration passes remain valid for the committed RC lineage: dashboard/business/income/tax workflows, onboarding, English/Traditional Chinese/Urdu RTL, light/dark, focus/Escape, enforcing CSP, portable ZIP download, service-worker offline relaunch, and the full responsive matrix. Existing screenshots remain under `evidence/final/screenshots`; frozen production evidence remains under `evidence/w0/screenshots`.

## Founder final UI freeze rerun — 18 August 2026

The exact final-freeze working tree was rerun under the enforcing Hosting CSP with local Firebase intentionally disabled.

- In-page audit: 29 pass, 0 fail, 0 warn.
- Founder fixes: all five verified in the rendered DOM and computed layout.
- Account UI: exactly one `Continue with Google` button; no Apple button/text/provider path.
- Plan UI: exactly one independent `Redeem promotion code` control before Free/Plus/Pro, separated from the first plan by 14px.
- Home UI: add-business/catch-up separation measured 14px.
- Tax UI: approved green gradient in light mode; dark treatment retained by explicit theme rules.
- Floating add: horizontal delta below 0.01px and a deliberate −2px optical vertical correction.
- Languages/themes: 12 locale-theme cases and 60 page checks at 320px; no overflow; Urdu was RTL.
- Viewports: 360, 375, 390, 430, 1280×800, 1440×900 and 1920×1080 across five pages; 35 checks, no overflow. Together with the locale pass, 320px is also covered.
- Desktop entry dialog: 520px wide and centred at 1440×900; date field focused; Escape closed it.
- Fresh-origin onboarding: one root; open, progress and close behavior passed at 390×844.
- Console: no warning/error on either checked local origin.
- PWA: after the preview server stopped, the offline shell relaunched and Settings displayed `2.0.0-rc.1 · 2026-08-18.final-ui-freeze.1`.

No optional polish was implemented. External account, cloud, receipt, payment and telemetry checks remain staging-only and are not simulated by this report.
