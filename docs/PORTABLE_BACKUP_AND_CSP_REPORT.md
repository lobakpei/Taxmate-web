# Portable Backup and CSP Report

## Portable backup

Schema 1 is a ZIP with `taxmate-backup.json`, `receipt-manifest.json`, and actual binaries under safe `receipts/entries/` or `receipts/orphans/` paths. Manifest records include entry ID, original path, MIME type, byte size, SHA-256 and status. Export fails on missing references, duplicates or limits; import rejects corrupt, hostile, incomplete or future archives before mutation. Restore previews counts, downloads a complete pre-restore ZIP, uploads validated receipts first and only then replaces state. JSON schema 2 import/export remains supported.

Unit coverage includes zero/one/multiple receipts, declared and undeclared orphans, missing references, duplicate IDs/associations, corrupt ZIP/JSON, future schema, missing manifest binaries, round-trip integrity and a 120-file realistic set.

## CSP

Blockers inventoried: two large inline executable blocks, analytics/Sentry bootstraps, HTML and dynamically generated event attributes, inline visual styles, Firebase/Auth/Storage/App Check, GA4, Sentry, jsPDF/CDN, fonts, images, service worker and external auth frames.

Executable scripts were extracted to `src/app/`; event attributes became inert `data-tm-*` declarations executed only by an external allow-listed parser; JSZip is pinned and vendored. Final Hosting CSP is enforcing. It has `script-src-attr 'none'`, exact external origins, an exact JSON-LD hash, and no broad wildcard, script `unsafe-inline`, or `unsafe-eval`. Inline style permission is retained solely for the frozen UI. Local report-only investigation found the uninitialised Firebase backup check, which was corrected before enforcement evidence was accepted.

Staging-only: signed-in receipt enumeration/upload/restore, Google/Apple Auth, Firebase/App Check, GA4 delivery, Sentry ingestion and Stripe entry points. These were not faked and must be checked against isolated non-production credentials before release.
