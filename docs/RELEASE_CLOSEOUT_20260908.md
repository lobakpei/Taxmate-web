# Local release closeout — pending independent review

This is an isolated local candidate, not a release or Founder acceptance.
The original corrected TEST refund and its customer UI verification are already
complete. Never repeat that refund, resend its processed notifications, or
restore a pre-refund snapshot. The existing runtime/export remains untouched.

## Scope and result

The starting reviewed tree was `bee3e7f907d263f1e2d1e9b3df7bb0dbae840955`,
on baseline commit `8ca588a54eb468cf2099be8026e47d954faccf45`.
The earlier three-file material-review correction is inherited unchanged.
This closeout adds tests and an isolated test runner, updates two obsolete
source assertions, and adds this note. No further production code, UI, prices,
policy, entitlement rules or provider settings are changed.

The two failures were stale assertions: old provider-specific call sites were
replaced by the central safe billing boundary; refund projection moved from
index.js into the billing webhook/entitlement modules. Behavioral checks execute
the actual boundary and actual handler/service/projector/review modules. They
retain redaction, strict staff grants, full/partial refund outcomes and
independent paid access. Redaction mutation checks demonstrate that returning
or logging the raw provider error is rejected.

Targeted local regression: **164/164 PASS**, no skipped/cancelled tests. This
includes 17 new behavior tests and all 10 source assertions (formerly 8/10).
The 12 retry/funding tests also pass against a **fresh isolated Firestore
emulator** with the real transaction implementation. These are repeated tests,
not 12 additional distinct requirements or provider acceptance.

## Retry diagnosis and boundary

The handler's event lease and the separate per-user projection lease both last
120 seconds. A projection collision returns 500 and releases the event receipt
for another delivery. An in-flight duplicate returns 503; a processed duplicate
returns 200 without repeating provider reads or case/projection work. The
application does not itself schedule the next HTTP delivery.

Stripe CLI 1.50.10 is independently identified by a credential-free version
call and binary hash in the closeout evidence. Its event processor acknowledges
the websocket message before local forwarding. The local endpoint makes one
HTTP POST and reports the response; this code path has no local non-2xx retry
loop. This source-based conclusion is not a claim about all server-side CLI
infrastructure. See [event processor](https://raw.githubusercontent.com/stripe/stripe-cli/v1.50.10/pkg/proxy/webhook_event_processor.go)
and [endpoint client](https://raw.githubusercontent.com/stripe/stripe-cli/v1.50.10/pkg/proxy/endpoint.go).

For registered destinations, Stripe documents sandbox retries over a few hours
and live retries for up to three days. Manual resend does not cancel automatic
retries. That is a platform contract, **not observed automatic delivery for this
account**. See [Stripe delivery behavior](https://docs.stripe.com/webhooks#automatic-retries).

The three actual refund notifications were previously recovered by sequential
manual official CLI resend. The new isolated test dispatcher retries failures
automatically and verifies completion, duplicate-event idempotence, independent
Pro access, stable case events and zero provider writes. It uses signed
synthetic signals and read-only provider doubles, not the existing TEST account.
Do not label it Stripe automatic-retry PASS.

## Reproduce only the safe isolated checks

From this candidate, with the existing dependencies available:

```powershell
node --test --test-concurrency=1 tests/unit/billing-error-boundary.test.js tests/unit/billing-webhook-retry.test.js tests/unit/stripe-functions-source.test.js
node scripts/run-billing-closeout-isolated.js --output=.hosting-build/closeout-proof-NEW
```

The latter refuses an existing output or occupied test ports, starts only its
own Firestore emulator on 38580, uses the fixed demo project, imports nothing,
and stops its own emulator after the tests. It neither starts Functions/Stripe
CLI nor reads payment credentials. Do not run it against existing runtime ports
or point any backend at completed-account exports. Source dependencies are not
bundled in the source archive; a junction/package identity check is not a full
dependency-file audit.

## Remaining gates

- **NEEDS_WORK:** unattended recovery of the local CLI transport is not supplied
  by these tests. No new queue/worker was added. Any transport change needs a
  separately reviewed scope.
- **BLOCKED:** actual registered-destination automatic retry evidence needs an
  approved reachable TEST endpoint and a new isolated event/failure/recovery
  experiment. No provider writes, event replay or deployment are allowed now.
- **BLOCKED:** exact prior-version existing-data upgrade still needs genuine
  2.1.18 UI persistence and same-state red-before/green-after proof. The existing
  focused script manufactures a profile-write interruption; it was not run.
- **BLOCKED:** genuine future paid-period end has not occurred in the preserved
  case. Virtual-clock tests and scheduled cancellation are not actual expiry.
- **BLOCKED:** production purchase disclosure release remains off; supplier
  establishment verification is false and the cancellation form/classification
  remain draft. The saved sandbox TEST Terms URL is not production clearance.
- **NEEDS_WORK:** six retained accounts do not satisfy a strict original-four
  inventory. Preserve all six; do not delete users or weaken the gate to pass.
- **BLOCKED:** independent review, Founder acceptance and release authorization
  are separate. No push, PR, merge, deployment, LIVE or mobile work took place.

Detailed evidence, exact final tree, raw-byte manifest, patches, source archive,
preservation checks and next executable steps are in the task-local
`.hosting-build/release-closeout-20260908` handoff directory in the root workspace.
Historical candidate docs remain historical: their older NOT RUN, price and
runtime statements do not override the later original-case closeout evidence.
