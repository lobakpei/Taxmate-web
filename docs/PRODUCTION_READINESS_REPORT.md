# TaxMate Healthy Operating App Production Readiness

Founder-facing release gate — 21 August 2026. This report supersedes earlier candidate-readiness verdicts.

| Item | Status | Current evidence |
|---|---|---|
| Branch | PASS | `codex/taxmate-healthy-production-20260820`, isolated from the preserved owner checkout |
| Authorized baseline | PASS | `main@41252f319d6c695dcb96105f524282a4e916145c`, tree `b5a7d00f4333bd17ee3e41e592c4972a7d5a98a9` |
| Build | PASS | App `2.0.0`, build `2026-08-20.healthy-production.1` |
| Product health | PASS | 85 real/durable; 6 intentionally hidden; every unhealthy visible classification is 0 |
| Plan contract | PASS | 20 canonical features; exact Free/Plus/Pro UI and server enforcement |
| Durability | PASS | 13 Master Pack personas, reload/backup/restore, sync/tombstone and downgrade-retention coverage |
| Security rules | PASS | Receipts require Plus/Pro to create; partnership create is server-only; Pro is required to collaborate; historical reads and owner cleanup survive downgrade |
| Founder promotions | PASS | Exact four backend-only configurations; private permanent offer is effective immediately; public schedules/capacities unchanged; zero real slots consumed during testing |
| Stripe LIVE | PASS | Four LIVE unpaid/customerless hosted sessions verified exact GBP amount, month/year interval and Terms consent, then expired |
| Provider facts | PASS | Firestore and Functions `europe-west2`; receipt bucket `US-CENTRAL1`; public Privacy copy matches |
| Dependency audit | PASS | Root and Functions production audits both report 0 vulnerabilities |
| Google / Apple invariant | PASS | Frozen production-confirmed Google path is unchanged; Apple is absent; no OAuth investigation was reopened |
| Browser QA | PASS | Founder-approved app UI, Plans, promotion sheet, Help, Privacy, Terms, light/dark, desktop/mobile and no native dialog regressions |
| Pre-contract geographic address | BLOCKED | No verifiable artifact containing the Founder-approved non-residential geographic business address is available in the release workspace. It therefore cannot safely be inserted into Privacy/Terms or confirmed as the trader establishment/complaints address. No residential or invented address may be used. |
| ICO register propagation | NON-BLOCKING | The Founder has submitted a new non-residential correspondence address and ICO processing is confirmed; public-register propagation is tracked separately. |

## Release gate

Engineering, product health, tests, LIVE billing and promotion configuration are complete. Commit, push and PR preparation may proceed. Merge and production deployment must not proceed until the approved non-residential address itself and evidence that it is usable as TaxMate's geographic business/complaints address are available, after which the same address must be added to the canonical legal content and the final gates rerun.

## Verdict

`PRODUCTION_BLOCKED`
