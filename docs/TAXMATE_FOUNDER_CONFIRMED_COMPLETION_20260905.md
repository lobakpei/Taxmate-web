# Founder-confirmed completion contract — 5 September 2026

Status: implementation in progress; not a release or Fable UI approval.

The Founder confirmed the four clarified decisions with “ok 確認”.
This contract supersedes the unresolved questions in the independent acceptance
report, not its independently observed defects.

## Confirmed requirements

- UK tax-year retention covers the whole account: ordinary/self-employed,
  partnership history, LTD and associated receipts.
- Effective Plus or Pro keeps historical records. Pro to Plus is still paid:
  retain LTD history without granting Plus Pro-only LTD actions.
- Paid features end when paid entitlement actually ends. Existing bookkeeping
  data is retained until that UK tax year's 5 April; if still Free on 6 April,
  expired history is deleted, not merely hidden. New-year Free records,
  authentication/billing records and other members' shared records are protected.
- Ending paid access in June 2026 gives a 5 April 2027 retention end. Resuming
  in December 2026 preserves the data. Paying in June 2027 cannot resurrect
  deleted history; a user-held backup is required.
- Free basic backup/restore remains available. Full Backup ZIP contains receipt
  binaries; data-only JSON and reference PDF are different outputs. Restoring a
  backup does not grant a paid feature. Receipt Pack PDF is Plus, inherited by Pro.
- Before cancellation show the paid-feature end and the data-deletion date,
  explain Full Backup versus PDF, and give an opportunity to export first.
- VAT: automatically total confirmed taxable sales for rolling 12-month windows
  per taxable entity, plus evidenced confirmations for missing/outside-book data
  and the separate next-30-day test. £80,000 is a product early warning, not law.
  The registration threshold is strictly over £90,000. Unknown/missing/deleted
  history must never produce a false safe result. Preserve unresolved crossings.
- Retain official names MTD and SA104; describe preparation positively without
  implying TaxMate is an official submission platform.
- Pro standard monthly price £11.99; launch monthly price £9.99.

Correction: the original numbered confirmation list contained five items, not
six. Item 4 (Free basic backup/restore) was already confirmed unchanged. There
is no missing sixth Founder decision.

## One Codex completion, then one Fable UI integration

Complete B1–B8 and C1–C2 from the independent report with regression evidence:
RTI evidence transition; VAT automation and unresolved crossing; retention read
boundary; trusted expiry dates; mixed-account backup; paid export execution
guards; billing action dispatch; persistent filing facts; cancellation notice;
and report-generation entitlement.

Deliver complete editable source, changed-file mapping, tests and hashes.
Fable may then integrate the presentation against genuine engine state, followed
by one integration verification and narrow repairs. Do not reopen a full
architecture audit without a concrete new defect.

No deployment, production purge, real account mutation, push, merge or Fable UI
work is authorized by this implementation confirmation.

Baseline: branch codex/taxmate-ltd-self-filing-completion,
HEAD 3baa83391482e61a9e84e0e8def8401a075775d5, tree
db8ccc5720bde4133b7790d6bdc9e28207aa53f9 plus preserved candidate changes.
Original candidate ZIP SHA-256:
b64951924f93c79249ce1d570f53533e29174f95c2922e0e40fcbc33e88d86be.
