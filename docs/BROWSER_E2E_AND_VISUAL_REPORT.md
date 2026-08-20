# Browser E2E and Visual Preservation Report

## Billing and Founder promo RC.10 addendum — 20 August 2026

The local enforcing preview rendered build `2026-08-20.billing-promo-rc.10` and passed the in-page audit at 29/29 with zero fail/warn. Settings retained the approved Monthly/Yearly plan layout, one independent promotion-code entry, Google-only sign-in, exact current prices and the existing notice design language. No UI redesign was introduced. Notification copy and CTA branching are covered by deterministic unit tests because production entitlements were not mutated for visual testing.

## Annual billing RC.9 addendum — 20 August 2026

The approved Plans UI now reuses its existing segmented-control language for `Monthly | Yearly`; the Free/Plus/Pro cards, promotion entry, spacing, typography, colours and hierarchy remain unchanged. Mobile 390×844 and desktop 1280×720 were inspected in light and dark modes. Monthly rendered £0 / £3.99 / £7.99; yearly rendered £0 / £29.99 / £59.99 plus exactly one `Billed yearly` note. No element overflowed horizontally, the cadence controls exposed the correct pressed state, and a reserved note row kept the Plans document height identical across cadence changes. The in-page browser audit passed 29/29 with zero fail/warn on build `2026-08-20.annual-billing-rc.9`.

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

## Legal & Privacy browser addendum — 19 August 2026

The legal-gate build was inspected in the local Founder Preview. Settings rendered Google-only authentication, corrected plan wording and an unchecked optional-analytics control. The in-app Privacy Policy and Terms showed version 19 August 2026 and the standalone `/privacy.html` and `/terms.html` pages rendered their matching documents. No Google Analytics script existed before consent and the inspected app/legal pages produced no console warning or error. The approved UI freeze was not redesigned.

Founder commercial/support input was then verified in build `2026-08-19.legal-privacy-gate.2`: Settings rendered Free £0, Plus £3.99/month and Pro £8.49/month plus the monthly-only/no-annual launch disclosure. Standalone Terms matched those prices. Privacy identified Namecheap forwarding and Microsoft Outlook without exposing any destination mailbox; `support@taxmate.uk` was the only email address in the inspected public pages.

## Production-readiness browser addendum — 19 August 2026

The current build preserves the frozen layout; changes after the prior responsive/language matrix are legal wording, partnership behavior, App Check transport, PWA cache correctness and server-side Stripe hardening rather than a redesign. Current browser checks reconfirm Google-only UI, exact pricing, monthly-only launch wording, analytics off/no GA loader before consent, matching Terms/Privacy, public-email allow-list and all five primary pages. The existing 320–1920 responsive, six-language, RTL, light/dark and dialog evidence remains applicable.

## External-services RC addendum — 19 August 2026

Build `2026-08-19.external-services-rc.3` retains the same Founder-approved layout. A fresh local browser pass returned in-page audit 29/29 with zero fail/warn and no console warning/error; Sentry also loaded under the enforcing preview CSP. The frozen UI evidence remains exactly one Google button, zero Apple text, one independent promotion entry, a 14px Home control gap, the approved green Tax gradient, a floating-plus horizontal delta below 0.01px with the −2px optical correction, exact Free/Plus/Pro prices and monthly-only disclosure. The RC.3 change is limited to exact Sentry CSP hosts, their regression test, evidence reports and release identity; it does not redesign the UI.

## Production-readiness RC.4 addendum — 19 August 2026

Build `2026-08-19.production-readiness-rc.4` preserves the same frozen UI. The freshly deployed staging Hosting candidate reported in-page audit 29/29 with zero fail/warn and exposed the exact RC.4 build/cache identity. Browser validation found and corrected one non-visual consent-dispatch defect: the existing analytics checkbox could not previously pass `this.checked` through the CSP-safe action dispatcher. After the fix, analytics remained absent before opt-in, loaded only after opt-in, and a fresh real UI `upgrade_viewed` reached GA4 Realtime with `client_storage=none`. No approved layout, styling or UI content was redesigned.

## SEO implementation RC.5 addendum — 19 August 2026

The isolated staging build rendered the exact approved browser title and onboarding H1/supporting line, while preserving the existing onboarding structure and Founder-approved app layout. The public Help page rendered its functional guidance and genuine Home/Privacy/Terms anchors. An unknown staging URL rendered the non-indexable 404 page and returned HTTP 404. The in-page audit remained 29/29 with zero fail/warn. Header inspection confirmed staging noindex on Home, Help and 404 responses; production configuration contains no noindex header.
