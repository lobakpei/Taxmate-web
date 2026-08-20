# Product & Rule Coverage Matrix

W0 status vocabulary follows the execution pack. Line references are to the frozen baseline in `evidence/w0/live-index.html`.

| ID | Audited finding | GitHub-main evidence | Live-runtime evidence | W0 status | Exact evidence | Risk | Target | Functional change made | Test coverage | Final status |
|---|---|---|---|---|---|---|---|---|---|---|
| TM-P0-01 | 2026-27 Class 2 stale | Lines 3913-3917 | Exact Git blob live | CONFIRMED | 2026-27 SPT 6845, weekly 3.50 | Wrong NI guidance | W1 | Pending | Characterized | OPEN |
| TM-P0-02 | MTD uses profit | Lines 6315-6322 | Exact Git blob live | CONFIRMED | `calcTax(yr).myProfit` drives thresholds | Wrong eligibility | W1 | Pending | Characterized | OPEN |
| TM-P0-03 | MTD claims/quarters overstated | I18N `mtd.what`, `feat.mtdReady`; lines 6258+ | Visible plan says MTD-ready | CONFIRMED | Claims approved-software replacement and MTD-ready export | Regulatory/product misstatement | W1 | Pending | Browser baseline | OPEN |
| TM-P0-04 | SA103S mapping wrong | Lines 6141-6227 | Exact Git blob live | CONFIRMED | Turnover mapped to box 7 rather than 2025-26 box 9 | Filing error | W1 | Pending | Characterized | OPEN |
| TM-P0-05 | SA104S mapping wrong | Lines 6230-6255 | Exact Git blob live | CONFIRMED | Partnership accounts mapped to boxes 11-16 rather than partner Statement flow | Filing error | W1 | Pending | Characterized | OPEN |
| TM-P0-06 | POA boundary/80% gap | Lines 4076-4082 | Exact Git blob live | CONFIRMED | Uses `liability > 1000`; no collected-at-source input | Incorrect POA guidance | W1 | Pending | Characterized | OPEN |
| TM-P0-07 | Remote rates unvalidated | Lines 6018-6038 | Runtime fetch path present | CONFIRMED | Blind `Object.assign(TAXCFG, years)` and cache | Remote corruption of tax truth | W1/W2 | Pending | Characterized | OPEN |
| TM-P0-08 | Deletion incomplete | Lines 5566-5609 | UI overclaims all deletion | CONFIRMED | Misses trial doc, Auth account, partnership records, unknown receipt orphans | Data/privacy failure | W2 | Pending | Characterized | OPEN |
| TM-P0-09 | Sync nondeterministic | Lines 5911-6015 | Runtime listeners present | CONFIRMED | Whole snapshots plus 15-second suppression; hard deletes | Loss/resurrection | W2 | Pending | Characterized | OPEN |
| TM-P0-10 | Paid entitlement placeholder | Lines 3697-3885 | Visible free Plus/Pro buttons | CONFIRMED | Local tier/pro flags and `setTier` | Revenue/security failure | W3 | Pending | Characterized | OPEN |
| TM-P0-11 | Import validation weak | Lines 5665-5707 | Runtime import path present | CONFIRMED | Only checks `businesses` array before replacement | Corruption/XSS/data loss | W2 | Pending | Characterized | OPEN |
| TM-P0-12 | Firebase rules not auditable | No rules/config tracked | Deployed rules exported read-only | CONFIRMED | Any authenticated UID can read/write any partnership path; personal and receipt paths are UID-isolated | Cross-user/data exposure | W2 | Pending | Export evidence + planned emulator tests | OPEN |
| TM-P0-13 | No regression suite | Nine tracked files only | In-page audit only | CONFIRMED | No package/test/CI baseline | Undetected regressions | W0-W5 | Characterization harness added | Node test | IN PROGRESS |
| TM-P1-01 | Architecture concentration | 438,753-byte single HTML blob | Same asset live | CONFIRMED | 7,801-line baseline | Change risk | W4 | Pending | Baseline hash | OPEN |
| TM-P1-02 | Privacy/runtime inconsistency | Lines 1-30, 4898+ | GA4/Sentry loaded; Firestore EU, Storage US | CONFIRMED | Absolute cookie/deletion claims exceed proof; data regions split; App Check comment differs from enforcement | UK GDPR/trust | W3 | Pending | Browser/source/Firebase inventory | OPEN |
| TM-P1-03 | Accessibility/zoom | Lines 32, 7552-7565 | Viewport confirms block | CONFIRMED | `user-scalable=no` plus gesture prevention | Accessibility failure | W5 | Pending | Browser viewport evidence | OPEN |
| TM-P1-04 | PWA identity/cache | `manifest.json`, `sw.js` | Same assets live | CONFIRMED | No stable manifest `id`; static cache identity | Stale/offline failure | W5 | Pending | Asset hash baseline | OPEN |
| TM-P1-05 | SEO foundation absent | No robots/sitemap; head lacks canonical/description | Both endpoints 404 | CONFIRMED | Public checks and response evidence | Acquisition/discovery | W5 | Pending | HTTP evidence | OPEN |
| TM-P1-06 | Browser/supply-chain security | CDN scripts lines 5, 27, 653-659 | No security headers in Pages response | CONFIRMED | Unbundled dependencies, inline handlers, no CSP | XSS/supply-chain | W5 | Pending | Header/source evidence | OPEN |
| TM-P1-07 | Record-retention UX absent | No retention/archive model | No relevant visible control | CONFIRMED | Delete/export copy has no filing-retention context | Record loss | W2/W5 | Pending | Source audit | OPEN |
| TM-P1-08 | Version fragmentation | Build comment, state v3, version 1.0, static SW cache | Same runtime | CONFIRMED | No distinct version constants | Support/rollback ambiguity | W4/W5 | Pending | Source audit | OPEN |
