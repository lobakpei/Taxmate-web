# TaxMate Ltd V1.5 pricing-contract correction

Date: 29 August 2026

## Current Founder-approved contract

- Pro launch monthly: £9.99/month.
- Pro standard monthly: £11.99/month.
- Pro annual: £99.99/year.
- Pro annual minor units: 9999.
- Legacy/grandfathered pricing: none; TaxMate has not launched and has no paid users.
- Unapproved previous-price, savings or free-month promotion copy: absent.
- Plus remains £3.99/month or £29.99/year.

The annual pricing decision is resolved. Current runtime, Plans UI, entitlement notifications, Help, Terms, plan contracts and deterministic billing helpers use the approved figures. Historical £7.99/month and £59.99/year evidence is retained unchanged only in reports carrying an explicit superseded-history banner; it is not accepted by current contract gates.

## Checkout and external-service boundary

Pro production checkout remains disabled/fail-closed. Production billing alignment is a separate release gate and was not attempted. This correction performed zero Stripe LIVE operations and zero Stripe TEST network operations: it created or changed no Price, customer, subscription or Checkout Session. The £99.99 evidence is deterministic local contract evidence; no old £59.99 receipt is presented as current proof.

Companies House evidence uses the rendered actual-app Yes control, number field and real Check Companies House button with local providers. Found, not-found and unavailable paths are covered. A found record autofills official name and incorporation date; repaint durability, user editing, rendered Continue, registry provenance and Check again are covered. Edited official facts remain `needs_checking`, retain the official snapshot and cannot be falsely re-verified while they still differ.

## Current release gates

- Pro annual pricing decision: RESOLVED — £99.99/year.
- Production billing alignment: STILL OPEN.
- Founder acceptance: STILL OPEN.
- Live Companies House credential smoke: STILL OPEN.
- Release drift/migration/rollback preflight: STILL OPEN.
- Explicit production release authority: STILL OPEN.

## Authority and impact

- Push / PR / merge / deploy: NO.
- Production Firebase mutation: NO.
- Production Stripe mutation: NO.
- Production Companies House operation: NO.
- Native / SEO / P10: NO.
- Production TaxMate 2.0.6 modified: NO.
- Actual incremental cost: £0.

This document records a local independent-audit candidate only. It is not Founder acceptance or production release authority.
