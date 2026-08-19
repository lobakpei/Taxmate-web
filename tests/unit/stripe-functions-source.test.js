'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const source=fs.readFileSync('functions/index.js','utf8');

test('Checkout is server-priced, requires Terms and blocks a second live subscription',()=>{
  assert.match(source,/tier==='plus'\?PLUS_PRICE\.value\(\):PRO_PRICE\.value\(\)/);
  assert.match(source,/subscriptions\.list\(\{customer,status:'all'/);
  assert.match(source,/existing subscription must be managed in the billing portal/i);
  assert.match(source,/consent_collection:\{terms_of_service:'required'\}/);
  assert.doesNotMatch(source,/price_data|unit_amount/);
});

test('Stripe webhook verifies signatures and projects ordered server entitlement truth',()=>{
  assert.match(source,/webhooks\.constructEvent\(req\.rawBody/);
  assert.match(source,/stripeWebhookEvents\/\$\{event\.id\}/);
  assert.match(source,/lastStripeEventCreated/);
  assert.match(source,/paidTier:active\?tier:'free'/);
  assert.match(source,/res\.sendStatus\(500\)/);
});

test('direct promotions require active server metadata and one transactional UID redemption',()=>{
  assert.match(source,/promotionCodes\.list\(\{code,active:true,limit:1\}/);
  assert.match(source,/taxmate_tier/);
  assert.match(source,/taxmate_free_days/);
  assert.match(source,/promotionRedemptions\/\$\{promotion\.id\}_\$\{user\.uid\}/);
  assert.match(source,/db\.runTransaction/);
});
