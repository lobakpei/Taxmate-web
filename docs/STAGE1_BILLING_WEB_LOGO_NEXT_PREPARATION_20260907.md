# Web Logo Home and next-step preparation

Status: **待一般獨立再核對**. This supplements B03.1 in the same authorized
Stage 1 steps 2 + 3. The 7 September Web Logo authorization is in AUTHORITY.

## Implemented Web-only addition

The existing main header brand and LTD brand/header/desktop-rail logos are
semantic buttons. Assets, size, position, colors and Direction A hierarchy are
unchanged; only reset button styling, pointer cursor and a visible yellow
keyboard-focus outline are added. Main header naming reuses `nav.home`; LTD
uses six localized `web.logo_home` labels from its canonical presentation copy.

The main Web button calls the existing `go('home')`. LTD calls the existing
`onOpenHome` facade and production bridge, returning to App Home, not a separate
company dashboard or public website. No document navigation/reload or sign-out.

The background brand does not dismiss open forms, account transitions,
retention gates or required onboarding. Existing Back/Cancel and unsaved-change
prompts remain in control. No logo is added to setup screens without one.
The LTD renderer's existing inert overlay container and pending/busy checks
remain effective.

This checkout is the Web entry point. It has no Capacitor/Cordova/native bridge
or executable iOS/Android project. No native code is changed or created, and
no user-agent / standalone / PWA heuristic is introduced. **Native iOS and
Android are NOT RUN**, not PASS. The normal browser tests include desktop
Chrome and a mobile Chrome/Pixel viewport and touch/UA emulation; this is not
physical-device/native/Safari acceptance. PWA service workers remain blocked.

Normal checks cover Home/income/expenses/tax/settings, billing overview/payment
history/refund cases/plans, LTD Money and both desktop logo positions. Enter and
Space, six languages, both themes, the existing unsaved Back/Cancel prompt,
same account, preserved saved records and unchanged document time origin are
checked. Raw screenshots and final source identities are in NORMAL/MANIFEST.
The B03.1-only run `mtr5ctgj` (3,092 checks, 477 captures) is historical once the
combined source is frozen. It must not be substituted for final combined runs.

The first combined UI trial `mtr5u1kv` stopped at a test-helper closure parameter
that was not passed into the browser evaluator; the App navigation had not
failed. After correcting that parameter, the logo-only normal run `mtr5yfpe`
completed 449 checks / 74 captures with unchanged source and no page errors.
Both remain HISTORY. The package requires a separate `FULL_NORMAL` UI result;
the targeted result cannot satisfy the final integrated-package gate.

The later full trial `mtr630kx` stopped on the existing 1440px long-list button
measurement after a fixed 120ms delay. The subsequent failure screenshot shows
the action at the top, fully visible. The normal test now waits up to 5 seconds
for the same on-screen geometry condition, records initial/final boxes, then
retains the original assertion and actual click. App layout is not changed,
and the failure image/result remain in HISTORY rather than being called PASS.

The next full trial `mtr69kao` reached the Logo matrix but lost keyboard focus
at a LTD repaint. The existing renderer replaces its DOM on facade updates.
The Web brand now preserves its own focused location on the same route only;
it never carries focus across navigation, into an inert subtree or away from
a modal. Normal tests wait for the navigation action to finish and explicitly
read/refresh canonical state while the Logo has focus, then press Space. This
is a focused Web accessibility correction, not a change to route/data policy.

The source audit also found inline LTD company/draft/ownership forms inside
the same branded shell. Logo Home now compares their current values with the
route's form baseline and reuses the existing localized discard dialog. Keep
editing preserves the values; explicit Discard invokes the existing Home
callback. Successful saves reset that UI-only baseline. This changes no
canonical data or tax logic. Ordinary company-edit and ownership-edit discard
journeys run in both browser contexts, with screenshots and saved-record checks.
The prior successful combined runs `mtr6i9bb` (UI) and `mtr6p261` (billing) are
retained as HISTORY; final results must match this additional form guard.

## Next-step preparation only

1. Freeze and hash this combined candidate; hand off final normal evidence to
   the existing independent reviewer. Resolve only findings within authority.
2. Founder preview checklist: follow a real annual refund case's expanded
   conditional/confirmed details; navigate from account and LTD screens with
   Logo; confirm ordinary saved and unsaved workflows in light/dark. Engineering
   evidence does not constitute Founder acceptance.
3. Keep separate open gates: actual Stripe TEST provider journey (credentials
   and availability), exact authorized 2.1.18 persisted-state split-cloud
   regression without prohibited fault injection, merchant establishment
   address/model form/durable confirmation and legal release verification.
   Do not replace them with local doubles, new clean data or old PASS claims.
4. Release plan, not execution: after explicit release authority, independently
   revalidate production commit/tree, candidate diff and deployment targets;
   verify gates and disabled money switches before any separately authorized
   activation. Remind Founder to open **TaxMate Refund & Subscription CS Desk**
   at that stage; no task is created now. No new commercial decision requested.
5. Recovery plan, not execution: retain the current deployed artifact/identity,
   this source and all older packages. Record the provider case/idempotency and
   reconciliation state before any future release. A UI/build rollback cannot
   undo a real refund, restore consumed credit or rewrite provider facts. Any
   future rollback, money-switch change or account recovery needs its own
   scoped authority and current-state checks; never reset user work or data.

Stage 1 is not complete. No push/PR/merge/deploy, live money/account changes,
CS email, schedule, new task, native work or next-stage implementation occurs.
