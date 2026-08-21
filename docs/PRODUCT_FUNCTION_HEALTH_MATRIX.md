# TaxMate Product Function Health Matrix

Release contract: TaxMate 2.0.0 healthy production, 20 August 2026.

Classification keys: `REAL_DURABLE` is a visible journey whose result is real and survives the relevant reload or cloud round trip. `INTENTIONALLY_HIDDEN` is a removed or non-advertised journey retained only as a documented product boundary. Any visible `BROKEN`, `SHELL`, `DEAD`, `DUPLICATE`, `MISPLACED` or `MISLABELLED` item blocks release.

| Status | Screen | Visible control | Handler | Backend or local engine | Durable result | Tier | Reload behaviour | Error behaviour | Final action |
|---|---|---|---|---|---|---|---|---|---|
| REAL_DURABLE | First run | Language | `setLanguage` | local state | language preference and matching direction | Free | restored from local state | current language remains usable | Keep |
| REAL_DURABLE | First run | Add first business | `addFirstBusiness` | state migration and cloud sync | business profile | Free | restored locally and, when signed in, from cloud | inline validation | Keep |
| REAL_DURABLE | First run | Business structure | onboarding form | state engine | sole trader or partnership structure | Free | restored | inline validation | Keep |
| REAL_DURABLE | First run | Starting records | onboarding completion | local state and sync | usable initial ledger | Free | restored | in-app notice | Keep |
| REAL_DURABLE | App shell | Home tab | `go('home')` | render engine | current dashboard | Free | recalculated from records | safe empty state | Keep |
| REAL_DURABLE | App shell | Income tab | `go('income')` | render engine | current income ledger | Free | records restored | safe empty state | Keep |
| REAL_DURABLE | App shell | Expenses tab | `go('expenses')` | render engine | current expense ledger | Free | records restored | safe empty state | Keep |
| REAL_DURABLE | App shell | Tax tab | `go('tax')` | tax engine | current estimate | Free | recalculated | unsupported year is explained | Keep |
| REAL_DURABLE | App shell | Settings tab | `go('settings')` | render engine | settings and account state | Free | preferences restored | unavailable services use in-app notice | Keep |
| REAL_DURABLE | App shell | Tax-year selector | year change handler | tax and state engines | selected year | Free | restored | only supported/known years shown | Keep |
| REAL_DURABLE | Home | Dashboard totals | `pageHome` | ledger and tax engines | income, expense and estimate summary | Free | recalculated | empty values are valid zeroes | Keep |
| REAL_DURABLE | Home | Add income | `openEntry('income')` | entry sheet and sync | income record | Free | restored and recalculated | inline validation | Keep |
| REAL_DURABLE | Home | Add expense | `openEntry('expense')` | entry sheet and sync | expense record | Free | restored and recalculated | inline validation | Keep |
| REAL_DURABLE | Home | Business card edit | `openBiz` | business sheet and sync | updated profile | Free first business; Plus additional | restored | locked/read-only state after downgrade | Keep |
| REAL_DURABLE | Home | Receipt reminder | carousel handler | receipt engine | opens actionable missing-receipt list or tier sheet | Free entry; Plus action | dismissed only for session; records persist | tier sheet, not dead CTA | Keep |
| REAL_DURABLE | Home | Context tax tip | carousel handler | rules-based helper | opens relevant tax view | Free | derived after reload | omitted when not relevant | Keep |
| REAL_DURABLE | Income | Add income | `openEntry('income')` | entry engine | new income record | Free | local/cloud durable | inline validation | Keep |
| REAL_DURABLE | Income | Edit income | `openEntry` | entry engine | amended record | Free | local/cloud durable | in-app notice on sync failure | Keep |
| REAL_DURABLE | Income | Delete income | `confirmAction` and tombstone | state/sync tombstone | removed visible record without unsafe cloud delete | Free | deletion remains after reload | in-app confirmation and failure state | Keep |
| REAL_DURABLE | Income | Search/filter | list handlers | local query | filtered view | Free | source records persist | empty result state | Keep |
| REAL_DURABLE | Income | Category/folder | entry and category handlers | state engine | classification | Free | restored | inline validation | Keep |
| REAL_DURABLE | Income | Catch up earlier months | catch-up flow | entry engine | dated historical records | Free | restored | inline validation | Keep |
| REAL_DURABLE | Income | Business filter | list filter | local query | selected business view | Free | source records persist | valid empty state | Keep |
| REAL_DURABLE | Expenses | Add expense | `openEntry('expense')` | entry engine | new expense record | Free | local/cloud durable | inline validation | Keep |
| REAL_DURABLE | Expenses | Edit expense | `openEntry` | entry engine | amended record | Free | local/cloud durable | in-app notice on sync failure | Keep |
| REAL_DURABLE | Expenses | Delete expense | `confirmAction` and tombstone | state/sync tombstone | removed visible record | Free | deletion remains after reload | in-app confirmation | Keep |
| REAL_DURABLE | Expenses | Business-use percentage | entry sheet | expense engine | allowable amount input | Free | restored and recalculated | bounded validation | Keep |
| REAL_DURABLE | Expenses | Category/folder | entry and category handlers | state engine | classification | Free | restored | inline validation | Keep |
| REAL_DURABLE | Expenses | Search/filter | list handlers | local query | filtered view | Free | source records persist | empty result state | Keep |
| REAL_DURABLE | Expenses | Add receipt photo | `receiptInput` | Cloud Storage with entitlement rules | linked image | Plus | link and object survive reload | safe product error; Free is locked | Keep |
| REAL_DURABLE | Expenses | View receipt | receipt viewer | Cloud Storage owner read | existing image | Plus to create; owner read retained | available after reload and downgrade | missing object is explained | Keep |
| REAL_DURABLE | Expenses | Delete receipt | `deleteReceipt` | Cloud Storage owner delete | image removed; expense retained | Owner | deletion survives reload | in-app result | Keep |
| REAL_DURABLE | Receipts | Missing receipt list | `pageReceipts` | ledger query | actionable missing-image set | Plus | recalculated after reload | locked card on Free | Keep |
| REAL_DURABLE | Receipts | Batch choose photos | batch input handler | Cloud Storage rules | images linked to selected expenses | Plus | survive reload | per-item safe failure state | Keep |
| REAL_DURABLE | Receipts | Receipt Pack PDF | receipt pack renderer | local PDF engine over durable records | organised PDF download | Pro | source data survives reload | locked card or safe no-receipts state | Keep |
| REAL_DURABLE | Tax | Tax estimate | `calcTax` | versioned tax engine | planning estimate | Free | deterministic recalculation | unsupported/incomplete state explained | Keep |
| REAL_DURABLE | Tax | Trading allowance comparison | tax view | tax engine | lower-method comparison | Free | deterministic | shown only when applicable | Keep |
| REAL_DURABLE | Tax | Mileage annual total | mileage control | state and tax engines | annual mileage input | Free | restored | numeric validation | Keep |
| REAL_DURABLE | Tax | Mileage versus actual costs | mileage comparison | tax engine | method comparison | Plus | deterministic | locked on Free | Keep |
| REAL_DURABLE | Tax | Payments on account inputs | tax adjustments | state and tax engines | estimate adjustments | Free | restored | numeric validation | Keep |
| REAL_DURABLE | Tax | SA103 box/reference mapping | SA reference view | deterministic mapping engine | reference/working aid | Free | recalculated | future unsupported mapping is explained | Keep |
| REAL_DURABLE | Tax | SA104 partnership working paper | `openSA104` | local PDF/working-paper engine | SA104 partnership aid | Pro | source records retained | locked on lower tiers | Keep |
| REAL_DURABLE | Tax | Quarterly record summary | quarterly summary handler | local export engine | quarter record summary; no HMRC submission | Pro | source records retained | locked on lower tiers | Keep |
| REAL_DURABLE | Tax | MTD eligibility guidance | MTD view | versioned threshold engine | guidance state | Free | recalculated | incomplete and unsupported states explicit | Keep |
| REAL_DURABLE | Tax | PDF tax report | report renderer | local PDF engine | general tax report download | Plus | source records retained | locked or safe generation error | Keep |
| REAL_DURABLE | Tax | JSON export | export handler | state serializer | data-only backup download | Free | importable later | safe generation error | Keep |
| REAL_DURABLE | Tax | Full ZIP backup | full backup handler | archive engine and Storage reads | records plus available receipt binaries | Free; receipt binaries retained for owner | hash-verifiable and restorable | aborts safely on incomplete archive | Keep |
| REAL_DURABLE | Tax | Restore backup | restore handler and `replaceStateSafely` | archive/state engine and Storage upload rules | restored records and eligible receipt binaries | Free; new receipt writes need Plus | restored state survives reload | pre-backup, validation and rollback on failure | Keep |
| REAL_DURABLE | Businesses | Add business | `openBiz('new')` | state and sync engines | additional business | Plus | restored | tier sheet on Free | Keep |
| REAL_DURABLE | Businesses | Edit primary business | `openBiz` | state and sync engines | profile changes | Free | restored | inline validation | Keep |
| REAL_DURABLE | Businesses | Edit secondary business | `openBiz` | state and sync engines | profile changes | Plus | restored | read-only after downgrade, data preserved | Keep |
| REAL_DURABLE | Businesses | Delete business | business delete confirmation | state engine | selected business and owned entries removed only after confirmation | Plus for additional business | deletion persists | explicit in-app destructive confirmation | Keep |
| REAL_DURABLE | Businesses | Create Partner Sync | `enableSync` | `createPartnership` callable and Firestore transaction | partnership plus owner membership | Pro | available across authorised reload/account | safe tier/auth/network errors | Keep |
| REAL_DURABLE | Businesses | Join partnership | `openJoinPartnership` and `joinPartnership` | `joinPartnership` callable | durable membership and shared business | Pro | membership restored | validation/tier/not-found mapped in-app | Keep |
| REAL_DURABLE | Businesses | Share partnership code | `sharePartnerCode` | OS share or clipboard | intended code shared | Pro member | underlying membership persists | copy fallback uses TaxMate notice | Keep |
| REAL_DURABLE | Businesses | Shared entries | entry handlers | Firestore membership plus Pro write rules | shared ledger changes | Pro write | history readable after reload and downgrade | server denial becomes product state | Keep |
| REAL_DURABLE | Businesses | Leave partnership | `leavePartnership` | callable membership lifecycle | membership removed; last member deletes partnership | Member | access changes immediately and after reload | in-app confirmation and safe error | Keep |
| REAL_DURABLE | Settings / Plans | Free plan card | `planBlock('free')` | canonical contract | truthful current/core feature list | Free | current entitlement re-resolved | no fake unlock | Keep |
| REAL_DURABLE | Settings / Plans | Plus monthly | `startBillingAction` | LIVE Stripe Checkout callable | server-verified recurring subscription | Free/eligible | entitlement restored from server | safe billing unavailable state | Keep |
| REAL_DURABLE | Settings / Plans | Plus yearly | `startBillingAction` | LIVE Stripe Checkout callable | server-verified recurring subscription | Free/eligible | entitlement restored from server | safe billing unavailable state | Keep |
| REAL_DURABLE | Settings / Plans | Pro monthly | `startBillingAction` | LIVE Stripe Checkout callable | server-verified recurring subscription | Free/Plus eligible | entitlement restored from server | safe billing unavailable state | Keep |
| REAL_DURABLE | Settings / Plans | Pro yearly | `startBillingAction` | LIVE Stripe Checkout callable | server-verified recurring subscription | Free/Plus eligible | entitlement restored from server | safe billing unavailable state | Keep |
| REAL_DURABLE | Settings / Plans | Manage subscription | `startBillingAction` portal route | Stripe Billing Portal callable | cancellation/payment management | Paid | updated webhook state restored | safe billing unavailable state | Keep |
| REAL_DURABLE | Settings / Plans | Redeem promotion code | `openPromotionSheet` and `redeemPromotionCode` | transactional callable | fixed or permanent entitlement, no subscription | Signed-in Free/Plus | entitlement immediately refreshed and restored | invalid/not-started/expired/full/duplicate/network taxonomy | Keep |
| REAL_DURABLE | Settings / Plans | Current plan status | `TaxMateEntitlement.resolve` | server entitlement snapshot | accurate paid/promo/permanent status | All | restored online; cached read-only offline | loading/offline state does not unlock | Keep |
| REAL_DURABLE | Settings / Cloud | Google Sign-In | frozen existing Google handler | Firebase Authentication | authenticated account | Free | auth session restored | existing safe in-app error | Keep frozen |
| REAL_DURABLE | Settings / Cloud | Cloud sync | sync toggle/account state | Firestore UID-isolated records | synced personal ledger | Free signed-in | durable cross reload/device | offline queue and safe error | Keep |
| REAL_DURABLE | Settings / Cloud | Sign out | sign-out handler | Firebase Authentication | local app remains usable; session ends | Signed-in | signed-out after reload | in-app failure state | Keep |
| REAL_DURABLE | Settings / Preferences | Language | `setLanguage` | local state | one of six supported languages and RTL | Free | restored | valid values only | Keep |
| REAL_DURABLE | Settings / Preferences | Light/dark/system theme | theme handler | local preference and CSS tokens | coherent app/public-page theme | Free | restored; standalone follows OS | valid fallback to system | Keep |
| REAL_DURABLE | Settings / Preferences | Analytics consent | `setAnalyticsConsent` | local consent gate | optional approved GA4 events only | Free | restored | analytics remains off on failure | Keep |
| REAL_DURABLE | Settings / Preferences | Install TaxMate | `installApp` | browser PWA install API | installed PWA where supported | Free | installed app remains | device-specific guidance | Keep |
| REAL_DURABLE | Settings / Data | Full backup | full backup handler | archive engine | portable ZIP | Free | independently restorable | safe abort | Keep |
| REAL_DURABLE | Settings / Data | Restore | restore handler | archive/state engine | validated replacement | Free | survives reload | pre-backup and rollback | Keep |
| REAL_DURABLE | Settings / Data | Delete all my data | deletion sheet and callable | authenticated recursive server lifecycle | personal cloud, receipts, auth and applicable memberships removed | Signed-in | deletion remains after reload | only reports success after server completion | Keep |
| REAL_DURABLE | Help & support | Open Help | `openLegal('help')` | canonical product content | task-based answers | Free | same content after reload | in-app fallback notice | Keep |
| REAL_DURABLE | Help & support | Help accordions | native details controls | canonical content renderer | readable grouped guidance | Free | deterministic | content remains accessible without JavaScript on public page | Keep |
| REAL_DURABLE | About & legal | About TaxMate | settings accordion | product copy | current product identity | Free | deterministic | none required | Keep |
| REAL_DURABLE | About & legal | Privacy policy | `openLegal('privacy')` | canonical content renderer | complete current privacy notice | Free | same in app/direct URL | in-app fallback notice | Keep |
| REAL_DURABLE | About & legal | Terms of use | `openLegal('terms')` | canonical content renderer | complete current terms | Free | same in app/direct URL | in-app fallback notice | Keep |
| REAL_DURABLE | About & legal | Tax disclaimer | collapsed details | canonical product copy | planning limitation understood | Free | deterministic | none required | Keep |
| REAL_DURABLE | About & legal | App information | collapsed details | version constants | TaxMate 2.0.0; support build detail on demand | Free | deterministic | no raw candidate state | Keep |
| REAL_DURABLE | Public pages | Help direct URL | `/help.html` | generated canonical content | indexed support page | Free | durable static URL | content works without app state | Keep |
| REAL_DURABLE | Public pages | Privacy direct URL | `/privacy.html` | generated canonical content | current notice | Free | durable static URL | content works without app state | Keep |
| REAL_DURABLE | Public pages | Terms direct URL | `/terms.html` | generated canonical content | pre-contract terms | Free | durable static URL | content works without app state | Keep |
| INTENTIONALLY_HIDDEN | Authentication | Apple Sign-In | none | none | absent by product decision | N/A | remains absent | N/A | Keep absent |
| INTENTIONALLY_HIDDEN | Plans | SA103 PDF export | none | no independent durable engine | not advertised | N/A | remains absent | N/A | Removed shell and contract entry |
| INTENTIONALLY_HIDDEN | Onboarding | Partner native prompt | none | Partner join lives under Your businesses | no duplicate journey | N/A | remains absent | N/A | Removed duplicate/misplaced flow |
| INTENTIONALLY_HIDDEN | Settings | Global Partner Sync form | none | business-scoped controls only | no misleading global action | N/A | remains absent | N/A | Removed misplaced flow |
| INTENTIONALLY_HIDDEN | Plans | Trial activation | none | real paid/promotion entitlements only | no fake unlock | N/A | remains absent | N/A | Removed legacy flow |
| INTENTIONALLY_HIDDEN | Normal UI | Release candidate/debug status | build detail collapsed for support only | version constants | stable product presentation | N/A | remains absent | N/A | Removed public release wording |

## Release totals

The automated `PRODUCT_FUNCTION_HEALTH_GATE` derives the totals from this table and fails on any visible unhealthy classification. The release report must quote its exact output; handwritten totals are deliberately not trusted.

Acceptance: `BROKEN = 0`, `SHELL = 0`, `DEAD_VISIBLE = 0`, `MISPLACED = 0`, `MISLABELLED = 0`, `DUPLICATE_VISIBLE = 0`.
