'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const GooglePlayBilling=require('../../functions/google-play-billing');
const FounderPromotions=require('../../functions/founder-promotions');

const source=fs.readFileSync('functions/index.js','utf8');
const service=fs.readFileSync('functions/google-play-billing.js','utf8');
const pkg=require('../../functions/package.json');
const PLAY_IDS={
  GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID:'taxmate_plus',GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN_ID:'monthly',GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN_ID:'yearly',
  GOOGLE_PLAY_PRO_SUBSCRIPTION_ID:'taxmate_pro',GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN_ID:'monthly',GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN_ID:'yearly'
};
function serverPlayHelpers(values){
  const parameter=name=>({value:()=>values&&values[name]||''}),context=vm.createContext({GooglePlayBilling,FounderPromotions});
  context.GOOGLE_PLAY_PROVIDER_READY=parameter('GOOGLE_PLAY_PROVIDER_READY');
  for(const name of Object.keys(PLAY_IDS))context[{
    GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID:'GOOGLE_PLAY_PLUS_SUBSCRIPTION',GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN_ID:'GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN',GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN_ID:'GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN',
    GOOGLE_PLAY_PRO_SUBSCRIPTION_ID:'GOOGLE_PLAY_PRO_SUBSCRIPTION',GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN_ID:'GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN',GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN_ID:'GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN'
  }[name]]=parameter(name);
  const start=source.indexOf('const TIER_WEIGHT=Object.freeze'),end=source.indexOf('async function deleteGooglePlayQuery');
  assert.ok(start>=0&&end>start,'server Play helpers must remain available');
  vm.runInContext(`${source.slice(start,end)}\nthis.playHelpers={googlePlayClientConfiguration,googlePlayPurchaseEligibility};`,context);
  return context.playHelpers;
}

test('Google Play callable and RTDN use server verification without Stripe secrets or client grants',()=>{
  assert.match(source,/exports\.verifyGooglePlayPurchase=onCall\(baseOpts/);
  assert.match(source,/exports\.reserveNativeBillingPurchase=onCall\(opts/);
  assert.doesNotMatch(source,/exports\.reserveNativeBillingPurchase=onCall\(appStorePurchaseOpts/,'Play reservation must not require Apple secrets');
  assert.match(source,/exports\.googlePlayBillingNotification=onMessagePublished/);
  assert.match(source,/topic:'taxmate-google-play-billing'/);
  assert.match(source,/GooglePlayBilling\.createService\(\{db,configuration:googlePlayConfiguration,retentionLifecycle,FieldValue,purchaseGuard:/);
  assert.match(service,/purchases\/subscriptionsv2\/tokens/);
  assert.match(service,/:acknowledge/);
  assert.ok(service.indexOf('tx.set(entitlementRef')<service.indexOf('provider.acknowledge'),'entitlement must commit before provider acknowledgement');
  assert.doesNotMatch(source,/verifyGooglePlayPurchase=onCall\(opts/,'Play verification must not require the Stripe secret');
});

test('Google Play configuration and reservation share the Web checkout legal purchase gates',()=>{
  assert.match(source,/eligibility=nativePurchaseEligibility\(googlePlayPurchaseEligibility/);
  assert.match(source,/if\(provider!=='stripe'\)assertBillingPurchaseReady\(\)/);
  assert.match(source,/exports\.verifyGooglePlayPurchase=onCall\(baseOpts/,'post-purchase verification remains available so an existing charge can be reconciled');
});

test('all Play identifiers are deployment parameters and fail closed as one exact contract',()=>{
  for(const name of [
    'GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID','GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN_ID','GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN_ID',
    'GOOGLE_PLAY_PRO_SUBSCRIPTION_ID','GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN_ID','GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN_ID'
  ])assert.match(source,new RegExp(`defineString\\('${name}'`));
  assert.match(service,/Google Play billing configuration is unavailable/);
  assert.equal(pkg.dependencies['google-auth-library'],'11.0.2');
});

test('raw purchase tokens remain only in server-owned token mappings and are never logged or projected to user entitlements',()=>{
  assert.match(service,/googlePlayPurchaseTokens\/\$\{tokenHash\}/);
  assert.match(service,/purchaseToken:token,projection:publicProjection\(projection\)/);
  assert.doesNotMatch(service,/console\.(?:log|warn|error)\([^\n]*(?:purchaseToken|rawToken|token\b)/);
  const projectionSource=service.slice(service.indexOf('function publicProjection'),service.indexOf('function activeProjection'));
  assert.doesNotMatch(projectionSource,/purchaseToken/);
  assert.match(source,/googlePlayAccess/);
});

test('server client configuration reports only complete product contracts',()=>{
  const configured=JSON.parse(JSON.stringify(serverPlayHelpers({...PLAY_IDS,GOOGLE_PLAY_PROVIDER_READY:'true'}).googlePlayClientConfiguration()));
  assert.equal(configured.configured,true);assert.equal(configured.packageName,GooglePlayBilling.PACKAGE_NAME);
  assert.deepEqual(configured.products.map(row=>`${row.tier}:${row.cadence}:${row.productId}:${row.basePlanId}`),[
    'plus:monthly:taxmate_plus:monthly','plus:yearly:taxmate_plus:yearly','pro:monthly:taxmate_pro:monthly','pro:yearly:taxmate_pro:yearly'
  ]);
  const unavailable=JSON.parse(JSON.stringify(serverPlayHelpers({...PLAY_IDS,GOOGLE_PLAY_PROVIDER_READY:'true',GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN_ID:''}).googlePlayClientConfiguration()));
  assert.deepEqual(unavailable,{schemaVersion:1,configured:false,packageName:GooglePlayBilling.PACKAGE_NAME,products:[]});
});

test('server purchase eligibility blocks overlapping permanent, Stripe, and unsettled Play access',()=>{
  const eligibility=serverPlayHelpers(PLAY_IDS).googlePlayPurchaseEligibility,stamp=Date.UTC(2026,8,13);
  assert.deepEqual(JSON.parse(JSON.stringify(eligibility(null,stamp))),{eligible:true,reason:null});
  assert.deepEqual(JSON.parse(JSON.stringify(eligibility({promotionAccess:{proPermanent:true}},stamp))),{eligible:false,reason:'permanent_pro'});
  assert.deepEqual(JSON.parse(JSON.stringify(eligibility({subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:stamp+1},stamp))),{eligible:false,reason:'stripe_active'});
  assert.deepEqual(JSON.parse(JSON.stringify(eligibility({paidAccess:{proExpiresAt:stamp+1}},stamp))),{eligible:false,reason:'stripe_active'});
  assert.deepEqual(JSON.parse(JSON.stringify(eligibility({googlePlayAccess:{active:true,tier:'pro',expiresAt:stamp+1,status:'active'}},stamp))),{eligible:false,reason:'google_play_active'});
  for(const status of ['pending','on_hold','paused','in_grace_period'])assert.deepEqual(JSON.parse(JSON.stringify(eligibility({googlePlayAccess:{active:false,tier:'free',expiresAt:stamp-1,status}},stamp))),{eligible:false,reason:'google_play_active'},status);
  for(const status of ['active','billing_retry','billing_grace_period'])assert.deepEqual(JSON.parse(JSON.stringify(eligibility({appStoreAccess:{active:status==='active',tier:'plus',expiresAt:stamp+(status==='active'?1:-1),status}},stamp))),{eligible:false,reason:'app_store_active'},status);
  assert.deepEqual(JSON.parse(JSON.stringify(eligibility({appStoreAccess:{active:false,tier:'free',expiresAt:stamp-1,status:'expired'}},stamp))),{eligible:true,reason:null});
  assert.deepEqual(JSON.parse(JSON.stringify(eligibility({subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:stamp,googlePlayAccess:{active:false,status:'expired',expiresAt:stamp}},stamp))),{eligible:true,reason:null});
});
