# B03.1 — refund-specific customer retention details

Status: **待一般獨立再核對**. Engineering self-checks are not independent or
Founder acceptance. Same approved Stage 1 steps 2 + 3; no new policy or design.

Repair baseline: `caf77db0fcdb59c89a80469c8825c40b8f06d6b8`, tree
`01cee47257c261fc210c765eab9fafcfe834a432`. The R2 independent report accepted
the B01/B02/B04 corrections but reproduced B03.1. Earlier packages remain intact.

## Narrow correction

- The customer refund section no longer calls the current-account retention
  card. Its collapsed details read only the case-specific `refundImpact`.
- Approved, submitting and pending cases use the reviewed **conditional**
  forecast, with the review observation time. This is not a completed refund,
  access removal or data deletion.
- Provider-confirmed success is reconciled against actual funded periods and
  grants. A separate `confirmedRefundImpact` stores the first verified result
  and observation time. Later changes to the account do not rewrite that dated
  case result. No new eligibility, financial or retention rule is introduced.
- A successful case without verified result facts shows a checking message,
  never the old forecast or the current account card as a substitute. A normal
  authorized reconciliation can populate the result once facts are available.
- Ordinary cancellation continues to use the current paid period and existing
  account retention card. Consumed upgrade credit and independent grants are
  unchanged. The primary refund view stays short; details start collapsed.
- Two new result/checking strings are supplied in EN / zh / PL / RO / ES / UR.
  Billing amount colors and Direction A styles are unchanged.

## Ordinary verification included in the final package

The normal browser suite now includes a £29.99 annual Plus payment funded for
365 days from the actual test time, without changing any clock. It checks
approved / provider-pending / provider-confirmed-success customer states:

1. Annual-only full refund: the forecast retention boundary is the current UK
   tax year, not the following-year boundary of the funded annual period.
2. Another independently funded Pro plan already exists: that grant remains.
3. Another independently funded Pro plan is acquired while the refund is
   pending: the confirmed result includes it even though the review forecast
   was Free. This checks actual-result wiring, not only identical before/after
   fixtures.

Expanded customer text is checked against the same case's backend retention;
the confirmed result is also compared with reconciled funding. Six languages
and light/dark are captured for the first two routes at 390px, plus 1440px
approved views. Nine Chinese state screenshots and nine raw impact regions
are included. Existing billing and R01–R05 normal checks remain in the suite.
The packaged `MANIFEST.json` and raw NORMAL outputs contain actual final run
counts and identities, not predicted counts. HISTORY is not final evidence.

Focused unit checks cover conditional/submitting/pending projection, a
historical successful case with unavailable result facts, the dated confirmed
record, independent funding, and the ordinary annual boundary calculation.
An initial unit assertion wrongly expected a paid `Retention.decide()` result
to expose future deletion dates; corrected to read the funded expiry boundary.
Paid status itself correctly has no deletion date. No policy changed for this.

## Unchanged boundaries

Local Firebase emulators and a loopback provider protocol double only; this is
**not Stripe TEST**. Real provider TEST, exact 2.1.18 persistent-data split-cloud
regression, legal release verification, independent review and Founder
acceptance remain open. PWA/offline, adversarial, fault-injection, load/stress
and destructive cleanup were not run. Cache identity was bumped only.

No live payments/refunds/cancellations, production data, email, push, PR, merge,
deployment, scheduler, mobile work, new task or sub-agent. The original dirty
checkout and all earlier handoffs are preserved. Stop at 待一般獨立再核對.
