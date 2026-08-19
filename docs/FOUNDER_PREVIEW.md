# Final Founder Preview / Release Approval Gate

Branch: `codex/taxmate-modernisation-20260817`.

Runtime identity: app `2.0.0-rc.1`, build `2026-08-19.seo-implementation-rc.5`, PWA cache `taxmate-v2-rc-1-seo-implementation-rc-5`.

Run from the repository root:

```powershell
node scripts/preview-server.js
```

Open `http://127.0.0.1:4173/?seo-rc=5`. Local preview intentionally disables Firebase unless the explicit `?firebase=staging` diagnostic is used; never opt a local preview into production services. This preview is the playable final-freeze candidate for local review only.

The full repository gate is 106/106 and the staging browser audit is 29/29. The SEO RC exposes the Founder-approved title, meta description and H1, an indexable Help page, crawlable Privacy/Terms pages, production-only sitemap URLs and header-level staging noindex. Correct-account external Stripe validation is blocked because the refreshed Dashboard still resolved to the wrong parent account; earlier IDs and receipts are not accepted. Deployed staging Functions/Storage and their Google/App Check/receipt paths also remain blocked until the Founder explicitly links billing to the staging-only Firebase project. Production publication remains blocked until the live ICO register shows the confirmed correspondence-address update.

STOP at Founder release approval. Do not push, merge, deploy, configure production services or run a production migration without explicit Founder approval.
