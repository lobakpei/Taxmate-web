# Final Founder Preview / Release Approval Gate

Branch: `codex/taxmate-modernisation-20260817`.

Runtime identity: app `2.0.0-rc.1`, build `2026-08-20.live-auth-restored-rc.12`, PWA cache `taxmate-v2-rc-1-live-auth-restored-rc-12`.

Run from the repository root:

```powershell
node scripts/preview-server.js
```

Open `http://127.0.0.1:4173/?auth-restored=rc12`. Local preview intentionally disables Firebase and must never opt into cloud services. Do not invoke Google OAuth from the local preview.

The full repository gate is 127/127 and the current local browser audit is 29/29 with zero fail/warn and no console errors. The browser surface contains exactly one Google sign-in control and zero Apple controls/runtime paths. Production Firebase is `taxmate-uk-2`; the production artifact contains no staging, localhost, temporary Auth diagnostic, TEST Stripe or secret-value references. Correct-account Stripe Sandbox and isolated staging evidence remain frozen and were not recreated.

Founder has authorised the controlled production release. The deployed release must bind only the existing production Stripe secrets and four canonical LIVE Price IDs, then pass the production smoke checks recorded in the release closeout.
