'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('src/app/app.js','utf8');
const actions=fs.readFileSync('src/app/action-dispatch.js','utf8');
const environment=fs.readFileSync('firebase-environment.js','utf8');
const functions=fs.readFileSync('functions/index.js','utf8');

test('official production hosts alone expose the production Pro checkout mode',()=>{
  assert.match(environment,/hosts: Object\.freeze\(\['taxmate\.uk', 'www\.taxmate\.uk', 'taxmate-uk-2\.web\.app', 'taxmate-uk-2\.firebaseapp\.com'\]\)/);
  assert.match(app,/const productionHosts=Array\.isArray\(FIREBASE_ENVIRONMENT\.hosts\)\?FIREBASE_ENVIRONMENT\.hosts:\[\]/);
  assert.match(app,/location\.protocol==='https:'&&productionHosts\.includes\(location\.hostname\)/);
  assert.match(app,/mode:'production',purchaseEnabled:true/);
  assert.match(app,/return Object\.freeze\(\{mode:'unavailable',purchaseEnabled:false\}\)/);
});

test('production purchase delegates to the existing App Check and Auth protected checkout callable',()=>{
  assert.match(actions,/['"]startProPurchase['"]/);
  assert.match(app,/if\(availability\.mode==='production'\)\{[\s\S]*if\(!requireLoginForTier\(\)\)return\{status:'auth-required'\};[\s\S]*startBillingAction\('createCheckoutSession',\{tier:'pro',cadence:BILLING_CADENCE\}\)/);
  assert.match(app,/const u=cloudUser\(\); if\(!u\) throw secureFunctionError\('auth-required'/);
  assert.match(app,/firebase\.appCheck\(\)\.getToken\(false\)/);
  assert.match(functions,/exports\.createCheckoutSession=onCall\(opts/);
  assert.match(functions,/success_url:`\$\{APP_URL\.value\(\)\}\?billing=success`/);
  assert.match(functions,/cancel_url:`\$\{APP_URL\.value\(\)\}\?billing=cancelled`/);
});

test('localhost review remains isolated from Stripe and production copy is not labelled local review',()=>{
  assert.match(app,/local&&provider&&provider\.enabled===true&&typeof provider\.purchasePro==='function'/);
  assert.match(app,/availability\.mode==='local_review'/);
  assert.match(app,/window\.TaxMateLocalBillingReview\.purchasePro/);
  assert.match(app,/availability\.mode==='local_review'\?t\('billing\.reviewPurchase'\):availability\.purchaseEnabled\?t\('tier\.choose'/);
});

test('checkout return preserves and resumes the exact onboarding pending intent',()=>{
  assert.match(app,/function consumeBillingReturn\(\)/);
  assert.match(app,/if\(value!=='success'&&value!=='cancelled'\)return null/);
  assert.match(app,/const draft=obRestoreDraft\(\)/);
  assert.match(app,/if\(!draft\|\|!draft\.pendingIntent\)return state/);
  assert.match(app,/OB=draft/);
  assert.match(app,/OB\.screen=state==='success'\?'intent-loading':'pro-gate'/);
  assert.match(app,/if\(OB&&OB\.pendingIntent\)\{TaxMateOnboardingRoot\.open\(document\);OB\._signingInFlow=false;OB\.loggedIn=true;obResumePendingIntentAfterHydration\(result\)/);
});

test('checkout double click is idempotently collapsed and pricing remains the approved contract',()=>{
  assert.match(app,/if\(BILLING_ACTION_PENDING\)return\{status:'busy'\}/);
  assert.match(app,/const PRO_PRICE_CONTRACT = Object\.freeze\(\{currency:'GBP',monthly:Object\.freeze\(\{launchMinor:999,standardMinor:1199\}\),annual:Object\.freeze\(\{amountMinor:9999\}\)\}\)/);
  assert.doesNotMatch(app,/£7\.99|£59\.99|grandfather|previous[- ]price|free month/i);
});
