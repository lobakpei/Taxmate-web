# Reproduce the ordinary local candidate checks

Use an isolated checkout of the delivered commit. Node 22, Java 21, installed
project/function dependencies and Chrome are required. Do not point these runners
at production or replace the protocol placeholders with live secrets.

1. Run `node --test tests/unit/billing-funded-normal.test.js` for ordinary funded
   access, paid-boundary and contract/copy alignment examples.
2. Run `node scripts/run-billing-normal.js`. It starts only Firebase demo emulators
   and the loopback Stripe-protocol double. The runner creates known local-only
   parameter/placeholder files if absent, refuses to overwrite different existing
   settings, and removes only files it created. It does not obtain TEST credentials
   or contact real Stripe for this lane.
3. Results, original screenshots, local protocol requests, logs and before/after
   source hashes are written into a new `.hosting-build/billing-normal-runs` folder.
   Onboarding's normal cancel/return preserves the pending company intent; after
   provider confirmation, its refresh action resumes the same company flow.
4. The existing R01–R05 ordinary UI runner additionally requires its exact old
   reference SOURCE.zip at `.hosting-build/review01-handoff/SOURCE.zip`, hash
   `6871d7d8817d8a6a05afd9e8eefb83b5697e51bd3a4e3b258ad1415d2ff88c2a`.
   That is an old visual comparison input, not the new billing source or legacy
   split-cloud upgrade evidence. Run `node scripts/run-review01-normal.js` only
   after reading its normal-use scope; never dispatch the mixed aggregate suites.

The billing runner uses ports 33399 (Auth), 33501 (Functions), 33880 (Firestore),
33999 (Storage), 41895 (App) and 32777 (provider double). The normal UI runner has
its own ports, but run sequentially because emulator discovery is shared. They
use ordinary synthetic demo accounts, not Founder or customer accounts. Browser
requests outside local endpoints are blocked, external SDK assets use local
copies, and service workers are disabled in these runs. Offline/PWA update proof
is therefore NOT RUN, even though the source's version/cache list is updated.

Current Stripe SDK dependency is 18.5.0 (API 2025-08-27.basil). Newer documentation
is cross-checked with the installed SDK types; provider TEST remains a separate
gate. The local fake exercises protocol shapes, not provider truth.

Do not confuse generated placeholder `.secret.local` with actual credentials.
For the B01–B04 repair, the same normal runner additionally checks the true
refund/plan/reminder state matrix and CS impact preview. The original 13 unit
examples remain, plus dictionary/structured-reminder and CS-context examples.
The package helper renders 12 PNG overview pages from actual captured images.
See the repair report for region captures and one-time notice language setup.

Local `.env.local`, `.secret.local`, node_modules, browser profiles and emulator
database state are excluded from the source archive. Public production Firebase
configuration and configured Stripe price IDs already tracked in the base are
not secrets and are retained as source; nothing is deployed.
