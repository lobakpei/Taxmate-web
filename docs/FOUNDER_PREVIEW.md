# Final Founder Preview / Release Approval Gate

Branch: `codex/taxmate-modernisation-20260817`.

Runtime identity: app `2.0.0-rc.1`, build `2026-08-19.production-readiness-rc.4`, PWA cache `taxmate-v2-rc-1-production-readiness-rc-4`.

Run from the repository root:

```powershell
node scripts/preview-server.js
```

Open `http://127.0.0.1:4173/?production-readiness-rc=4`. Local preview intentionally disables Firebase unless the explicit `?firebase=staging` diagnostic is used; never opt a local preview into production services. This preview is the playable final-freeze candidate for local review only.

The full repository gate is 96/96, plus separate Stripe TEST sandbox and hosted-receipt gates at 1/1 each, and the browser/visual/PWA matrix documented in `FINAL_INTEGRATED_TEST_REPORT.md`. Review the current in-app Privacy Policy, Terms and analytics control under Settings → Introduction and legal; standalone copies are available at `/privacy.html` and `/terms.html`. Deployed staging Functions/Storage and their Google/App Check/receipt paths remain blocked until the Founder explicitly links billing to the staging-only Firebase project. Production publication also remains blocked until the live ICO register shows the confirmed correspondence-address update.

STOP at Founder release approval. Do not push, merge, deploy, configure production services or run a production migration without explicit Founder approval.
