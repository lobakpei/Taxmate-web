# W0 Baseline Identity

Verified: 2026-08-17 (Europe/London)

## Repository and source

- Repository: `lobakpei/Taxmate-web`
- Remote: `https://github.com/lobakpei/Taxmate-web.git`
- Production branch: `main`
- Authorized and current GitHub `main`: `745f7497d374f000870c4a7a111130008f8945a7`
- Tree: `4726b48f89150782f50e6227226c227c13765212`
- Build marker: `2026-07-19T15:59 UK`
- Production CNAME: `www.taxmate.uk`

The remote branch, local `main`, audited commit, Git tree, tracked file list, Git blob IDs, public production bytes, and audited SHA-256 values all reconcile exactly.

## Byte identity

| Asset | Git blob | Git/live bytes | SHA-256 |
|---|---|---:|---|
| `index.html` | `bc30802bb37d23f6c9b926f8c58a078ec1b7f906` | 438,753 | `73d6b65db4f12b8f7f3edf99a953db8087f9c797415eda0a888352a4ddd12642` |
| `manifest.json` | `8590e551c3044249bab8e4f418bb491f7cc90dba` | 835 | `ac80212cf9c2b9f9d0b9cfcb87b8ef5462770b4d8256361d542aff46c1e74e89` |
| `sw.js` | `b2cf942dce67225887308ec45551529ebb5b31a1` | 1,441 | `53a6cb17af99c4606ed423730fc4c2bc710e461851cdc06a4729629b271025ce` |

The Windows checkout uses CRLF conversion for tracked text. Worktree byte sizes and SHA-256 values therefore differ from Git blobs without indicating source drift. All baseline comparisons use Git blobs and downloaded production bytes.

## Production reconciliation

- `https://www.taxmate.uk/`, `/manifest.json`, and `/sw.js` return the exact Git blob bytes.
- GitHub Pages response `Last-Modified`: `Sun, 19 Jul 2026 15:06:01 GMT`.
- `robots.txt`: HTTP 404.
- `sitemap.xml`: HTTP 404.
- No canonical link or meta description is present.
- Viewport blocks zoom and runtime gesture handlers reinforce the block.
- `?audit=1` reports `PASS: 29 | FAIL: 0 | WARN: 0`; this is frozen as characterization evidence, not accepted as proof of P0 correctness.

## Rollback artifacts

- `evidence/w0/taxmate-baseline-745f7497.bundle` is a verified complete Git bundle containing `refs/heads/main` at the authorized commit.
- `evidence/w0/taxmate-baseline-source.tar` is a Git-archive source snapshot.
- Public production responses, headers, DOM audit output, and screenshots are under `evidence/w0/`.

## UI baseline captures

- `evidence/w0/screenshots/live-onboarding-desktop-dark.png`
- `evidence/w0/screenshots/live-onboarding-mobile-dark.png`
- `evidence/w0/screenshots/live-settings-mobile-dark.png`
- `evidence/w0/screenshots/live-settings-mobile-light.png`
- `evidence/w0/screenshots/live-settings-desktop-light.png`
- `evidence/w0/screenshots/live-audit-desktop-light.png`

## Firebase production metadata (read-only inspection)

- Project: `taxmate-uk-2` (`995936701479`)
- Firestore: `europe-west2`, native mode, point-in-time recovery disabled, delete protection disabled.
- Storage: `US-CENTRAL1`, regional, seven-day soft delete.
- App Check: Firestore `ENFORCED`; Storage `ENFORCED`; Authentication `UNENFORCED`.
- Deployed Firestore ruleset: `55fc462b-8f93-4022-a817-14424291b84e`.
- Deployed Storage ruleset: `87699846-6d45-4b7b-9f14-c13324b389ae`.
- Personal user paths are UID-isolated and app config is public-read/deny-write.
- Partnership documents and entries currently allow every authenticated UID; a share code is effectively the only partition key and there is no durable membership ACL.
- Receipt paths are owner-only with a 10 MiB image constraint.
- Full exported rules and metadata are under `evidence/w0/firebase/`.

No Firebase enforcement, rule, data, or authentication setting was changed during W0.

## External-state notes

- The execution pack references `TAXMATE_MODERNISATION_AUDIT_HANDOFF_20260817.md`, but that file was not present in the repository or Downloads folder under the specified name.
- The source comment describes App Check as monitoring-only, but the production service metadata proves Firestore and Storage enforcement is already active. This drift is recorded for staged rollback planning; enforcement remains untouched.
