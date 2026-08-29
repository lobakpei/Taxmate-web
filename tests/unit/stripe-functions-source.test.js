'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const source=fs.readFileSync('functions/index.js','utf8');

test('candidate reports contain only canonical TaxMate Stripe identities',()=>{
  const files=['functions/index.js','scripts/run-stripe-sandbox-emulator.js','scripts/configure-stripe-billing-delta.js','scripts/create-stripe-hosted-test-checkout.js','tests/integration/stripe-sandbox.test.js','tests/integration/stripe-billing-delta.test.js','tests/integration/stripe-hosted-receipt.test.js','tests/integration/stripe-hosted-lifecycle.test.js',...fs.readdirSync('docs').filter(name=>name.endsWith('.md')).map(name=>'docs/'+name)];
  const candidate=files.map(file=>fs.readFileSync(file,'utf8')).join('\n');
  const canonical=new Set(['acct_1U6Gd2Q2jZLVx6pg','acct_1U6GdCL0bYJwhRlm','prod_V6UNrw0u1CiCQh','prod_V6UOvRXvg4ALAg','prod_V6UPAGq9Yx0e2f','price_1U6HOPL0bYJwhRlmvWSGdPhW','price_1U6HQBL0bYJwhRlmpOkns65Z','price_1U6HQZL0bYJwhRlm1u5hbB7w','price_1U6ZEqL0bYJwhRlmu3DBbLiG','price_1U6ZErL0bYJwhRlm4P8aOWzy','price_1U6ZErL0bYJwhRlmEjbDgo3i','promo_1U6HY7L0bYJwhRlmfah2RkaX','promo_1U6HY8L0bYJwhRlmdpnsEH9C','promo_1U6HY8L0bYJwhRlmaStJVQ8A','prod_V6kCtAzaQBbRyB','prod_V6kCnxpbHlunTE','prod_V6kCPUudWfPLi8','price_1U6Wi4Q2jZLVx6pgFbTCmjV3','price_1U6WiHQ2jZLVx6pgJWYXlwHv','price_1U6ZfnQ2jZLVx6pgNCCfs5Cg','price_1U6ZgaQ2jZLVx6pgi7dHPBeO','price_1U6ZgtQ2jZLVx6pgOeS7cRYl']);
  const matches=candidate.match(/(?:acct|prod|price|promo)_[A-Za-z0-9]{10,}/g)||[];
  assert.ok(matches.length>0);
  for(const id of matches)assert.ok(canonical.has(id),`obsolete or foreign Stripe identity: ${id}`);
});

test('Checkout is server-priced, requires Terms and blocks a second live subscription',()=>{
  for(const name of ['PLUS_MONTHLY_PRICE','PLUS_ANNUAL_PRICE','PRO_MONTHLY_PRICE','PRO_ANNUAL_PRICE'])assert.match(source,new RegExp(name+'\\.value\\(\\)'));
  assert.match(source,/\['monthly','yearly'\]\.includes\(cadence\)/);
  assert.match(source,/billingCadence:cadence/);
  assert.match(source,/subscriptions\.list\(\{customer,status:'all'/);
  assert.match(source,/existing subscription must be managed in the billing portal/i);
  assert.match(source,/checkout\.consent_collection=\{terms_of_service:'required'\}/);
  assert.match(source,/FUNCTIONS_EMULATOR!=='true'/);
  assert.match(source,/automatic_tax:\{enabled:false\}/);
  assert.doesNotMatch(source,/price_data|unit_amount/);
});

test('synthetic customerless smoke is cleanup-only and is not production UI acceptance',()=>{
  const smoke=fs.readFileSync('scripts/smoke-live-checkout-sessions.js','utf8');
  for(const amount of [399,2999,999,9999])assert.match(smoke,new RegExp(`amount:${amount}`));
  assert.match(smoke,/\^rk_live_/);
  assert.match(smoke,/consent_collection:\{terms_of_service:'required'\}/);
  assert.match(smoke,/assert\.equal\(session\.customer,null\)/);
  assert.match(smoke,/assert\.equal\(session\.subscription,null\)/);
  assert.match(smoke,/assert\.equal\(session\.payment_status,'unpaid'\)/);
  assert.match(smoke,/checkout\.sessions\.expire/);
  assert.doesNotMatch(smoke,/customers\.create|payment_methods|card/);
  const scripts=require('../../package.json').scripts;
  assert.doesNotMatch(scripts['test:all'],/stripe:smoke:live/);
});

test('candidate Stripe fixture helpers fail closed before any operation unless TEST mode is explicit',()=>{
  const configure=fs.readFileSync('scripts/configure-stripe-billing-delta.js','utf8');
  const hosted=fs.readFileSync('scripts/create-stripe-hosted-test-checkout.js','utf8');
  for(const source of [configure,hosted]){assert.match(source,/EXPECTED_STRIPE_MODE/);assert.match(source,/\(\?:sk\|rk\)_test_/);}
  assert.doesNotMatch(configure,/\['test','live'\]/);
});

test('visible Plans UI uses the production Auth and App Check secured Checkout path',()=>{
  const app=fs.readFileSync('src/app/app.js','utf8');
  assert.match(app,/data-tm-click="setTier\('\$\{tier\}'\)"/);
  assert.match(app,/startBillingAction\('createCheckoutSession',\{tier,cadence:BILLING_CADENCE\}\)/);
  assert.match(app,/u\.getIdToken\(\)/);
  assert.match(app,/firebase\.appCheck\(\)\.getToken\(false\)/);
  assert.match(app,/'authorization':'Bearer '\+token/);
  assert.match(app,/'X-Firebase-AppCheck':appCheck\.token/);
  assert.ok(app.includes("'https://europe-west2-'+FIREBASE_CONFIG.projectId+'.cloudfunctions.net/'+name"));
  assert.match(app,/location\.assign\(result\.url\)/);
  assert.doesNotMatch(app,/smoke-live-checkout-sessions/);
});

test('rapid Plans activation cannot split one user across Stripe customers',()=>{
  const app=fs.readFileSync('src/app/app.js','utf8');
  assert.match(source,/idempotencyKey:`taxmate-customer-\$\{user\.uid\}`/);
  assert.match(app,/let BILLING_ACTION_PENDING=false/);
  assert.match(app,/if\(BILLING_ACTION_PENDING\)return/);
  assert.match(app,/BILLING_ACTION_PENDING=true/);
  assert.match(app,/finally\{\s*BILLING_ACTION_PENDING=false/);
});

test('billing failures have safe client and server classifications',()=>{
  const app=fs.readFileSync('src/app/app.js','utf8');
  for(const category of ['app-check-unavailable','app-check-rejected','auth-required','billing-config','stripe-customer','stripe-checkout','network']){
    assert.match(app,new RegExp(category));
  }
  assert.match(app,/console\.warn\('billing-failure',\{category\}\)/);
  assert.match(source,/key!==key\.trim\(\)\|\|\/\[\\r\\n\]\//);
  assert.match(source,/console\.error\('billing-failure',\{category\}\)/);
  assert.match(source,/billingFailure\('stripe-customer'\)/);
  assert.match(source,/billingFailure\('stripe-checkout'\)/);
  assert.doesNotMatch(source,/billingFailure\([^)]*,\s*(?:error|e)\b/);
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
  assert.match(source,/priceDescriptor\(price\)/);
  assert.match(source,/billingCadence/);
  assert.match(source,/function subscriptionPeriodEnd\(subscription\)/);
  assert.match(source,/item\.current_period_end/);
  assert.match(source,/STRIPE_PRO_LEGACY_PRICE_IDS/);
  assert.match(source,/res\.sendStatus\(500\)/);
});

test('Founder promotions use canonical Firestore truth and one transactional UID redemption',()=>{
  assert.match(source,/exports\.redeemPromotion=onCall\(baseOpts/);
  assert.match(source,/founderPromotions\/\$\{code\}/);
  assert.match(source,/FounderPromotions\.validateConfiguration/);
  assert.match(source,/promotionRedemptions\/\$\{FounderPromotions\.redemptionId\(code,user\.uid\)\}/);
  assert.doesNotMatch(source,/promotionCodes\.list/);
  assert.match(source,/db\.runTransaction/);
  assert.match(source,/startsAt:configuration\.startsAt/);
  assert.match(source,/source:'founder_promo'/);
  assert.match(source,/hasPermanentPro/);
  assert.match(source,/accessProjection/);
  assert.match(source,/promotionAccess/);
  assert.match(source,/You already have permanent Pro access\./);
});
