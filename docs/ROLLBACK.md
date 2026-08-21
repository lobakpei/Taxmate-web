# TaxMate Release Rollback Instructions

The Healthy Operating App work started from `main@41252f319d6c695dcb96105f524282a4e916145c`, tree `b5a7d00f4333bd17ee3e41e592c4972a7d5a98a9`. Local annotated rollback tag `taxmate-pre-healthy-production-20260820` identifies that baseline.

## Current state

The Founder-authorised public correspondence address has cleared the release gate. PR #8 merge and production deployment are authorised after the final regression. The private Founder promo start correction is an intentional standalone production configuration change; rollback would disable future redemptions only if a separately authorised emergency required it and must not revoke an existing grant.

## Coherent rollback after any future deployment

- Restore Hosting client assets, build identity, service-worker cache and CSP headers together to the tagged baseline.
- Restore Functions, Firestore rules and Storage rules from the same tagged source revision.
- Verify server-written paid/promotion entitlement documents before reopening premium writes.
- Do not delete bookkeeping data during downgrade, cancellation, refund or source rollback.
- Stripe rollback must not create a charge, change prices or touch unrelated accounts or LIVE objects.
- If the Founder reports a live Google Sign-In regression, restore the tagged release immediately; do not debug OAuth in production.

All four LIVE smoke Checkout sessions created during this programme were expired and created no customer, payment or subscription.
