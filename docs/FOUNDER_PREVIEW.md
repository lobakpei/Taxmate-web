# Final Founder Preview / Release Approval Gate

Branch: `codex/taxmate-modernisation-20260817`.

Runtime identity: app `2.0.0-rc.1`, build `2026-08-18.final-ui-freeze.1`, PWA cache `taxmate-v2-rc-1-final-ui-freeze`.

Run from the repository root:

```powershell
node scripts/preview-server.js
```

Open `http://127.0.0.1:4173/`. Local preview intentionally disables Firebase; do not add `?firebase=1`, because the checked-in Firebase configuration points at production. This preview is the playable final-freeze candidate for local review only.

The full local gate is 75/75 plus the browser/visual matrix documented in `FINAL_INTEGRATED_TEST_REPORT.md`. Isolated external staging remains blocked pending the minimum configuration listed in `STAGING_EXTERNAL_SERVICE_REPORT.md`.

STOP at Founder release approval. Do not push, merge, deploy, configure production services or run a production migration without explicit Founder approval.
