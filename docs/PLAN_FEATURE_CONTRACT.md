# TaxMate Plan Feature Contract

Canonical product contract for TaxMate 2.0.0. Plus includes every Free feature. Pro includes every Plus and Free feature. Losing paid or promotional access never deletes bookkeeping records, additional businesses, existing receipt images or partnership history.

| Feature ID | User label | Minimum tier | Visible entry point | Lock behaviour | Server enforcement | Help entry | Regression test |
|---|---|---|---|---|---|---|---|
| `records` | Income and expenses | Free | Home, Income, Expenses | None | UID-isolated Firestore rules when signed in | Getting started: add income/expense | characterization, programme, rules emulator |
| `taxcalc` | Tax estimate | Free | Home and Tax | None; unsupported years are explained | Versioned local tax config; app config client read-only | Tax & estimates: calculation | tax-config, programme |
| `onebiz` | One business | Free | First run and Your businesses | Second business opens Plus sheet | Client gate; personal records UID-isolated | Getting started: first business | healthy product contract, programme |
| `mileageBasic` | Annual mileage total | Free | Tax | None | Local durable state and cloud sync | Tax & estimates: mileage | programme, state-model |
| `sa103view` | SA103 box/reference mapping | Free | Tax | None; unsupported future mapping explained | Deterministic local mapping | Tax & estimates: Self Assessment | SA mapping tests |
| `sync` | Cloud sync | Free | Settings / Cloud | Requires Google sign-in, not a paid tier | Firebase Auth plus UID-isolated Firestore rules | Cloud & backup: sync | functions/rules emulator, sync tests |
| `backup` | Full backup and restore | Free | Tax and Settings / Data | Receipt binary re-upload still obeys current receipt tier | Local ZIP engine; Cloud Storage upload rules | Cloud & backup: backup/restore | portable-backup tests |
| `aiTips` | Helper tips and reminders | Free | Home and Tax | Intentionally ungated | Rules-based local engine | Tax & estimates topics | healthy product contract |
| `multiBiz` | Multiple businesses | Plus | Your businesses | Free can read retained secondary businesses but cannot create/edit them | Client gate; durable personal cloud remains owner-only | Plans & billing: Plus; Getting started | entitlement and downgrade tests |
| `receiptPhoto` | Receipt photos | Plus | Expense and Receipts | Free can read/delete existing own images; new create/update is locked | Storage rules require effective Plus/Pro, owner UID, image type and size | Receipts: add/downgrade/delete | Storage rules emulator |
| `mileageCompare` | Mileage comparison | Plus | Tax | Free sees Plus lock | Client feature gate | Tax & estimates: mileage | healthy product contract, programme |
| `pdfReport` | PDF tax report | Plus | Tax | Free sees Plus lock | Client feature gate; local PDF renderer | Plans & billing: Plus | export tests, healthy product contract |
| `partnerSync` | Partner Sync | Pro | Your businesses: create/join/share/leave | Historical authorised reads remain after downgrade; new collaboration writes stop | `createPartnership` and `joinPartnership` callables require Pro; Firestore entry/update rules require Pro | Partnerships | Functions and Firestore emulator |
| `sa104` | SA104 partnership working paper | Pro | Tax | Free/Plus see Pro lock | Client feature gate; real working-paper renderer | Plans & billing: Pro; Tax & estimates | SA104 gate and export tests |
| `receiptPack` | Receipt Pack PDF | Pro | Receipts and Tax | Free/Plus see Pro lock | Client feature gate; local PDF renderer over authorised receipts | Plans & billing: Pro; Receipts | receipt-pack tests |
| `mtdReady` | Quarterly record summary (no HMRC submission) | Pro | Tax | Free/Plus see Pro lock | Client feature gate; local summary engine | Tax & estimates: MTD | MTD and healthy product contract tests |
| `mtdGuidance` | MTD eligibility and record guidance | Free | Tax | None | Versioned local threshold engine | Tax & estimates: MTD | MTD tests |
| `promotion` | Redeem promotion code | Free signed-in | Settings → Plans | Sign-in required; no card or fake client unlock | Transactional callable, private promo collection and canonical entitlement | Plans & billing: promotions | Founder promo unit/functions emulator |
| `billing` | Monthly/yearly Plus or Pro subscription | Free signed-in | Settings → Plans | Existing subscriber routes to Manage subscription; permanent Pro has no checkout CTA | Stripe LIVE Checkout plus webhook/server entitlement truth | Plans & billing: monthly/yearly/cancel | Stripe integration and live four-path acceptance |

## Exact plan-card contract

- Free — £0: income and expenses; tax estimate; one business; annual mileage total; SA103 box/reference mapping; cloud sync; full backup and restore.
- Plus — £3.99/month or £29.99/year: includes Free; multiple businesses; receipt photos; mileage comparison; PDF tax report.
- Pro — £7.99/month or £59.99/year: includes Plus; Partner Sync; SA104 partnership working paper; Receipt Pack PDF; quarterly record summary with no HMRC submission.
- MTD guidance remains Free. `SA103 PDF export` is absent until a real independent feature exists.

`PLAN_FEATURE_CONTRACT_GATE` checks this document against `FEATURE_TIER`, plan-card arrays, Help content, Storage/Firestore rules and callable enforcement.
