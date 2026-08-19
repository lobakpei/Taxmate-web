# Final Founder Preview / Release Approval Gate

Branch: `codex/taxmate-modernisation-20260817`.

Runtime identity: app `2.0.0-rc.1`, build `2026-08-19.legal-privacy-gate.2`, PWA cache `taxmate-v2-rc-1-legal-privacy-gate-2`.

Run from the repository root:

```powershell
node scripts/preview-server.js
```

Open `http://127.0.0.1:4173/`. Local preview intentionally disables Firebase; do not add `?firebase=1`, because the checked-in Firebase configuration points at production. This preview is the playable final-freeze candidate for local review only.

The full local gate is 82/82 plus the browser/visual matrix documented in `FINAL_INTEGRATED_TEST_REPORT.md`. Review the current in-app Privacy Policy, Terms and analytics control under Settings → Introduction and legal; standalone copies are available at `/privacy.html` and `/terms.html`. Isolated external staging remains blocked pending the minimum configuration listed in `STAGING_EXTERNAL_SERVICE_REPORT.md`, and production publication remains blocked until the live ICO register shows the confirmed correspondence-address update.

STOP at Founder release approval. Do not push, merge, deploy, configure production services or run a production migration without explicit Founder approval.
