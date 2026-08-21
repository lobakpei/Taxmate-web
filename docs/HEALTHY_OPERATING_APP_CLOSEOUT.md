# TaxMate Healthy Operating App Closeout Evidence

Date: 21 August 2026

Build: `2026-08-20.healthy-production.1`

Product version: `2.0.0`

The Master Pack implementation is complete. The Founder-approved UI language is preserved, Google Sign-In is frozen, Apple Sign-In is absent and no new product scope was added.

## Product outcome

- Product Function Health Matrix: 85 `REAL_DURABLE`, 6 `INTENTIONALLY_HIDDEN`, all unhealthy visible categories 0.
- Plan Feature Contract: 20 canonical features across Free, Plus and Pro, with receipt and partnership enforcement in client and server rules.
- Visible shell/trial/dead paths removed; native browser dialogs removed; SA103 PDF removed; Help, Privacy and Terms use one canonical source.
- Existing data, receipt images, secondary businesses and partnership history survive downgrade; premium create/write actions close at the correct tier boundary.
- Multiple promotion grants have a server-projected access window so an active Plus fallback remains enforceable after a higher Pro grant expires.

## Verification outcome

- Final regression passes 138/138 automated tests: 4 characterization, 101 unit, 7 integration, 5 source-rule, 15 Firestore/Storage emulator and 6 Functions emulator.
- Thirteen Master Pack personas pass truthful control, persistence, downgrade and billing/promotion-state assertions.
- App and public pages pass mobile/desktop, light/dark, overflow, content-count and native-dialog checks.
- Root and Functions production dependency audits report zero vulnerabilities.
- Firebase metadata confirms Firestore/Functions in London and receipt Storage in `US-CENTRAL1`.
- Four LIVE Stripe Checkout pages displayed exact Plus/Pro monthly/yearly prices and Terms consent. They remained unpaid and customerless and were expired after inspection.
- Production promo configuration matches the three public schedules. The private permanent Founder offer is effective from the Master Pack date, capacity three, with zero redemptions.

## Address release gate

ICO public-register propagation remains a separate, non-blocking follow-up. The Founder has authorised `Unit 170198, PO Box 7169, Poole, BH15 9EL` as TaxMate's public correspondence, contact and complaints address. Canonical Privacy and Terms content uses it only in those roles and does not represent it as an establishment or trading location.

The address gate is cleared. PR #8 merge and production deployment are Founder-authorised after the final regression passes.

Release state: `ADDRESS_GATE_CLEARED`
