# B01–B04: same-scope repair for general independent re-review

Status: 待一般獨立再核對. No independent or Founder PASS is claimed.

The coordinator's 7 September independent review rejected commit
`fca77419b5bdc06a6c2bbc0150e6dbccc45dc1c1` despite its passing normal suite.
This is a repair within approved Stage 1 steps 2 + 3, not a new wave or design.
The previous ZIP, all failed/prior runs and the dirty primary checkout remain.

## Corrections

| Finding | Implemented correction | Normal evidence |
| --- | --- | --- |
| B01 | Billing money spans use the existing `moneyCls` / Direction A tokens: payments and fees out/red; refunds and paid-time credits in/green. Dates, state labels and explanatory prose remain neutral. The native payment selector uses date/reference; the selected payment amount is a separate semantic value. | Computed-colour checks on visible nonzero values, light/dark six-language phone/desktop flows, raw screenshots. Zero refunds are neutral rather than implying a received refund. |
| B02 | The engine supplies structured message keys, action and dates. Home never renders its legacy English `message` or `cta`. Cancellation, annual renewal, payment attention, promotion expiry and retention states have translated keys. The English-contract label is localized; the legal text remains explicitly English. | Six-language normal cancellation-to-Home, plan pending/scheduled/payment issue and refund statuses; dictionary/variable parity and non-destructive pure expiry/retention examples. |
| B03 | Staff reads actual customer-filtered charges, successful/pending refunds, invoices/line periods, subscriptions and existing entitlement/grant facts. Displays exact remaining amount, before/conditional-after access, other grants, retention consequence and source/version. Missing facts are marked for checking, not guessed. | Partial and remaining-balance refund; credited Plus-to-Pro full refund with Free result, then separate independent Plus with Plus result; ordinary changed-data version and unchanged status-refresh examples. |
| B04 | Upgrade removes the unrelated PDF/ZIP/Free paragraph. Cancellation keeps paid-until, the action and only a relevant short report reminder, with one collapsed data/backup section. Partial refunds with no access change have no end-of-access warning. | Real normal quote/cancel/refund screens in six languages, both themes and screen sizes; 12 PNG overview pages plus full original captures. |

## Review and submission contract

CS enters the individual human decision, legal/approval reference, calculation,
customer reply and separate renewal choice. `Check refund impact` is read-only:
it does not select eligibility or amount. Full means the current *remaining*
refundable balance, after successful and pending refunds, not the original sum.
Saving an approval requires the displayed amount and current data version.
The approval records the observed context and conditional outcome. Before first
submission, both the operator's displayed version and the approved version must
still match current facts. If facts changed, the approved case can be reviewed
again before money submission. Status-only refresh timestamps do not invalidate
an unchanged review. In-flight operations keep their original idempotent identity.

The after-refund forecast and actual reconciliation share `fundedSnapshot()`.
The existing calculation consumes paid negative proration credit. A full refund
of that upgrade's invoice can therefore leave **Free**, not automatically restore
the old Plus credit. A genuinely independent funded Plus or promotion remains.
This is a disclosed existing engine consequence, not approval of a new monetary
policy or a substitute for applicable rights and individual Founder decisions.
No credit is resurrected and no new grace, refund eligibility or retention rule
is introduced. Completed cases show current facts, not a second refund forecast.

The new staff source context is collapsed and is not sent to customer case
responses. Existing public payment/case/refund references remain available. Only a compact conditional impact summary is
included in the public case. Billing records remain outside bookkeeping backups.

## Evidence interpretation and limits

- MANIFEST identifies final source and runs. Counts are assertions, not distinct
  customer journeys. HISTORY contains earlier results and must not replace final
  evidence. The original independent rejection report is included separately.
- The original normal assertions remain; normal CS interactions now include the
  required impact-preview step. No legacy mixed/security suite was weakened or run.
- Home language captures reopen only the isolated fixture's one-time notice flag
  to view the same true cancellation state in each language; no billing state,
  account entitlement or displayed text is fabricated. The first ordinary return
  to Home is captured separately without reopening that flag.
- Expiry/retention-ended branches are checked with pure functions, not destructive
  emulator cleanup or a production clock change. No claim of real deletion testing.
- The PNG overview is rendered from actual captured App images, not AI redrawing.
  Element-region images of the CS impact are labeled and retain corresponding full
  page captures. All originals remain available. HTML is an additional index only.
- Six operational-language coverage is not six-language legal clearance. The
  English terms, geographical establishment address, statutory form and durable
  delivery evidence still need the separate legal release review.
- Stripe TEST remains NOT RUN; this is local protocol simulation with the real
  SDK and Firebase emulators. Exact 2.1.18 persistent-state split-cloud regression
  remains NOT RUN because its specified script requires excluded fault injection.
- PWA/offline, adversarial/permission/race/fuzz/fault/stress/soak/destructive tests,
  real money/accounts/subscriptions, release and deployment remain NOT RUN or
  NOT AUTHORISED as applicable. No sub-agent, new task or Fable handoff.

See the unchanged legal/CS draft and remaining release gates. The three approved
commercial decisions are not being asked again. General independent re-review,
Founder acceptance and any later release authority remain separate.
