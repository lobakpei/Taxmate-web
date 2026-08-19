'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const source=fs.readFileSync('functions/index.js','utf8');

test('candidate contains only canonical TaxMate Sandbox Stripe object identities',()=>{
  const files=['functions/index.js','scripts/run-stripe-sandbox-emulator.js','scripts/configure-taxmate-stripe-sandbox.js','scripts/create-stripe-hosted-test-checkout.js','tests/integration/stripe-sandbox.test.js','tests/integration/stripe-hosted-receipt.test.js','tests/integration/stripe-hosted-lifecycle.test.js',...fs.readdirSync('docs').filter(name=>name.endsWith('.md')).map(name=>'docs/'+name)];
  const candidate=files.map(file=>fs.readFileSync(file,'utf8')).join('\n');
  const canonical=new Set(['acct_1U6Gd2Q2jZLVx6pg','acct_1U6GdCL0bYJwhRlm','prod_V6UNrw0u1CiCQh','prod_V6UOvRXvg4ALAg','prod_V6UPAGq9Yx0e2f','price_1U6HOPL0bYJwhRlmvWSGdPhW','price_1U6HQBL0bYJwhRlmpOkns65Z','price_1U6HQZL0bYJwhRlm1u5hbB7w','promo_1U6HY7L0bYJwhRlmfah2RkaX','promo_1U6HY8L0bYJwhRlmdpnsEH9C','promo_1U6HY8L0bYJwhRlmaStJVQ8A']);
  const matches=candidate.match(/(?:acct|prod|price|promo)_[A-Za-z0-9]{10,}/g)||[];
  assert.ok(matches.length>0);
  for(const id of matches)assert.ok(canonical.has(id),`obsolete or foreign Stripe identity: ${id}`);
});

test('Checkout is server-priced, requires Terms and blocks a second live subscription',()=>{
  assert.match(source,/tier==='plus'\?PLUS_PRICE\.value\(\):PRO_PRICE\.value\(\)/);
  assert.match(source,/subscriptions\.list\(\{customer,status:'all'/);
  assert.match(source,/existing subscription must be managed in the billing portal/i);
  assert.match(source,/consent_collection:\{terms_of_service:'required'\}/);
  assert.match(source,/automatic_tax:\{enabled:false\}/);
  assert.doesNotMatch(source,/price_data|unit_amount/);
});

test('refund policy is server-projected without client fake unlocks',()=>{
  assert.match(source,/event\.type==='charge\.refunded'/);
  assert.match(source,/invoicePayments\.list/);
  assert.match(source,/refundReviewState:'full-refund-applied'/);
  assert.match(source,/refundReviewState:'manual-review'/);
  assert.match(source,/refundedSamePeriod/);
  assert.match(source,/paidTier:'free'/);
});

test('Stripe webhook verifies signatures and projects ordered server entitlement truth',()=>{
  assert.match(source,/webhooks\.constructEvent\(req\.rawBody/);
  assert.match(source,/stripeWebhookEvents\/\$\{event\.id\}/);
  assert.match(source,/lastStripeEventCreated/);
  assert.match(source,/paidTier:active&&!refundedSamePeriod\?tier:'free'/);
  assert.match(source,/res\.sendStatus\(500\)/);
});

test('direct promotions require active server metadata and one transactional UID redemption',()=>{
  assert.match(source,/promotionCodes\.list\(\{code,active:true,limit:1\}/);
  assert.match(source,/taxmate_tier/);
  assert.match(source,/taxmate_free_days/);
  assert.match(source,/promotionRedemptions\/\$\{promotion\.id\}_\$\{user\.uid\}/);
  assert.match(source,/db\.runTransaction/);
});
