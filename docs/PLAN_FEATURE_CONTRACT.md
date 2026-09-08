# TaxMate Plan Feature Contract

Canonical product contract for TaxMate 2.0.0. Plus includes every Free feature. Pro includes every Plus and Free feature. When paid or promotional access ends, paid features lock and core Free records remain available under the Free plan. Retained Limited Company data remains available through 5 April at the end of the UK tax year in which Pro access ended and becomes unavailable from 6 April; the customer must download paid reports before access ends and retain their own backup and statutory records.

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
| `receiptPack` | Receipt Pack PDF | Plus | Receipts and Tax | Free sees Plus lock | Client feature gate; local PDF renderer over authorised receipts | Plans & billing: Plus; Receipts | receipt-pack tests |
| `mtdReady` | MTD quarterly record preparation | Pro | Tax | Free/Plus see Pro lock | Client feature gate; local summary engine and HMRC-compatible route guidance | Tax & estimates: MTD | MTD and healthy product contract tests |
| `ltd` | One active Limited Company | Pro | Add a business → Limited company | Free/Plus cannot create or use active Ltd actions; former Pro owners retain read/export only until the 5 April tax-year boundary | Trusted `users/{uid}/ltdControl/activeCompany` claim plus Pro-gated callables and Firestore writes | Limited companies | Ltd actual-app, facade, Functions and Firestore emulator tests |
| `mtdGuidance` | MTD eligibility and record guidance | Free | Tax | None | Versioned local threshold engine | Tax & estimates: MTD | MTD tests |
| `promotion` | Redeem promotion code | Free signed-in | Settings → Plans | Sign-in required; no card or fake client unlock | Transactional callable, private promo collection and canonical entitlement | Plans & billing: promotions | Founder promo unit/functions emulator |
| `billing` | Monthly/yearly Plus or Pro subscription | Free signed-in | Settings → Plans | Existing subscriber routes to Manage subscription; permanent Pro has no checkout CTA | Stripe LIVE Checkout plus webhook/server entitlement truth | Plans & billing: monthly/yearly/cancel | Stripe integration and live four-path acceptance |

## Exact plan-card contract

- Free — £0: income and expenses; tax estimate; one business; annual mileage total; SA103 box/reference mapping; cloud sync; full backup and restore.
- Plus — £3.99/month or £29.99/year: includes Free; multiple businesses; receipt photos; Receipt Pack PDF; mileage comparison; PDF tax report.
- Pro — launch £9.99/month, standard £11.99/month, or £99.99/year: includes Plus; Partner Sync; SA104 partnership working paper; MTD quarterly record preparation; one active Limited Company.
- MTD guidance remains Free. `SA103 PDF export` is absent until a real independent feature exists.

`PLAN_FEATURE_CONTRACT_GATE` checks this document against `FEATURE_TIER`, plan-card arrays, Help content, Storage/Firestore rules and callable enforcement.

## Ltd V1.5 candidate contract (Founder decision, 28 August 2026)

The Ltd V1.5 actual-app candidate requires effective Pro for new company operations and outbound LTD sync. Plus retains historical LTD records without granting Pro operations. Effective Plus or Pro retains whole-account ordinary, self-employed, partnership and LTD history. If effective paid access ends and the account remains Free, historical data is retained through 5 April at the end of that UK tax year, then deleted from 6 April London time. New-year Free records, authentication/billing and other members' shared records are protected. Basic JSON/ZIP export and explicit restore of eligible records remain Free; unavailable LTD data does not block ordinary backup. Free ZIP restore keeps receipt binaries in the account's device store. Restoring data does not grant paid PDFs, new receipt uploads or Pro operations. Unknown paid-end dates fail closed for retained LTD access rather than inventing an expiry. Account deletion remains available; removing a company never frees the trusted one-company anchor automatically. Production deletion activation remains separately unauthorised; the worker is demo-emulator guarded.

Pro includes one active limited company per account/subscription. There is no additional-company add-on, no multi-Ltd mode and no associated-company workflow. The approved pricing is **Launch price £9.99/month**, **Standard price £11.99/month**, and **£99.99/year** (`amountMinor: 9999`). During launch, the UI displays the standard £11.99 price struck through beside the £9.99 launch price. This is a standard-versus-launch comparison, not a claim that any customer previously paid £11.99, and it must not add an unapproved savings/free-month claim.

This candidate does not mutate production Stripe price IDs, current subscriptions, checkout configuration or live TaxMate 2.0.6. Production Stripe price/configuration alignment to the Founder-approved Pro contract remains a separately authorised pre-release gate; until then, new Pro checkout is disabled/fail-closed in this candidate. See `docs/LTD_V1.5_PLAN_FEATURE_CONTRACT_20260828.md` for the exact action matrix.
