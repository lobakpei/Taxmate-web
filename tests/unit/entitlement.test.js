const test=require('node:test'); const assert=require('node:assert/strict');
const E=require('../../src/core/entitlement'); const now=2_000_000;
test('Stripe-verified active subscription is canonical',()=>assert.deepEqual(E.resolve({subscriptionStatus:'active',paidTier:'pro',serverVerifiedAt:now,currentPeriodEnd:now+1000},now,false),{tier:'pro',source:'stripe',reason:'active'}));
test('server-verified Google Play access is canonical and merges with Stripe and promotions',()=>{
  const play={active:true,tier:'plus',status:'active',expiresAt:now+2000,autoRenewEnabled:true};
  assert.deepEqual(E.resolve({googlePlayAccess:play,serverVerifiedAt:now},now,false),{tier:'plus',source:'google_play',reason:'active',expiresAt:now+2000,autoRenewEnabled:true});
  assert.equal(E.resolve({googlePlayAccess:play,subscriptionStatus:'active',paidTier:'pro',currentPeriodEnd:now+1000,serverVerifiedAt:now},now,false).source,'stripe');
  assert.equal(E.resolve({googlePlayAccess:play,promotions:{PRO:{status:'active',tier:'pro',startsAt:now-1,expiresAt:now+1000}},serverVerifiedAt:now},now,false).source,'promotion');
  assert.deepEqual(E.paidAccessEnd({googlePlayAccess:play},now),{status:'known',at:now+2000});
});
test('server-verified App Store access joins the strongest cross-provider merge and retention end',()=>{
  const apple={active:true,tier:'pro',purchasedTier:'pro',cadence:'yearly',status:'active',expiresAt:now+3000,autoRenewEnabled:true};
  const play={active:true,tier:'plus',status:'active',expiresAt:now+5000,autoRenewEnabled:true};
  assert.deepEqual(E.resolve({appStoreAccess:apple,serverVerifiedAt:now},now,false),{tier:'pro',source:'app_store',reason:'active',expiresAt:now+3000,autoRenewEnabled:true});
  assert.equal(E.resolve({appStoreAccess:apple,googlePlayAccess:play,subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:now+9000,serverVerifiedAt:now},now,false).source,'app_store');
  const equalApple={...apple,tier:'plus',purchasedTier:'plus',expiresAt:now+10000};
  assert.equal(E.resolve({appStoreAccess:equalApple,googlePlayAccess:play,serverVerifiedAt:now},now,false).source,'app_store','equal tiers choose the longer provider-verified access');
  assert.deepEqual(E.paidAccessEnd({appStoreAccess:apple},now),{status:'known',at:now+3000});
});
test('promotion expiry falls back to Free and retains no fake client unlock',()=>{ const s={promotion:{status:'active',tier:'plus',expiresAt:now-1},serverVerifiedAt:now}; assert.equal(E.resolve(s,now,false).tier,'free'); });
test('valid promotion and grace state are distinct from paid state',()=>{ assert.equal(E.resolve({promotion:{status:'active',tier:'plus',expiresAt:now+1},serverVerifiedAt:now},now,false).source,'promotion'); assert.equal(E.resolve({subscriptionStatus:'past_due',lastPaidTier:'pro',graceUntil:now+1,serverVerifiedAt:now},now,false).source,'grace'); });
test('multiple Founder promotions choose highest tier then fall back after expiry',()=>{const snapshot={promotions:{PLUS:{status:'active',tier:'plus',expiresAt:now+1000},PRO:{status:'active',tier:'pro',expiresAt:now+10}},serverVerifiedAt:now};assert.equal(E.resolve(snapshot,now,false).tier,'pro');assert.equal(E.resolve(snapshot,now+20,false).tier,'plus');});
test('stale offline paid verification fails closed but a permanent Pro grant remains available',()=>{
  const staleNow=now+73*3600*1000;
  assert.equal(E.resolve({subscriptionStatus:'active',paidTier:'pro',serverVerifiedAt:1},staleNow,true).tier,'free');
  const permanent={promotions:{FOUNDER:{status:'active',tier:'pro',startsAt:1,expiresAt:null,permanent:true}},serverVerifiedAt:1};
  assert.deepEqual(E.resolve(permanent,staleNow,true),{tier:'pro',source:'promotion',reason:'offline-permanent',expiresAt:null,permanent:true,promoCode:'FOUNDER'});
  assert.equal(E.hasPermanentPro(permanent,staleNow),true);
  assert.equal(E.resolve({promotions:permanent.promotions},staleNow,true).tier,'free');
});
test('promotion codes are constrained',()=>{ assert.equal(E.validatePromotionCode('FOUNDER_2026'),true); assert.equal(E.validatePromotionCode('<script>'),false); });
test('effective tier is the highest of paid and Founder promo sources',()=>{
  const proPromo={status:'active',tier:'pro',startsAt:now-1,expiresAt:now+1000};
  const plusPromo={status:'active',tier:'plus',startsAt:now-1,expiresAt:now+1000};
  assert.equal(E.resolve({subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:now+1000,promotions:{PROMO:proPromo},serverVerifiedAt:now},now,false).tier,'pro');
  assert.equal(E.resolve({subscriptionStatus:'active',paidTier:'pro',currentPeriodEnd:now+1000,promotions:{PROMO:plusPromo},serverVerifiedAt:now},now,false).source,'stripe');
});
test('fixed promo and annual paid notifications use exact lifecycle copy',()=>{
  const expiry=now+30*86400000;
  assert.match(E.notification({promotions:{PROMO:{status:'active',tier:'pro',startsAt:now-1,expiresAt:expiry}},serverVerifiedAt:now},now).message,/free Pro access ends/);
  assert.match(E.notification({promotions:{PROMO:{status:'active',tier:'pro',startsAt:now-1,expiresAt:now+7*86400000}},serverVerifiedAt:now},now).message,/7 days of Pro left.*paid reports.*backup/);
  assert.match(E.notification({promotions:{PROMO:{status:'active',tier:'plus',startsAt:now-1,expiresAt:now+86400000}},serverVerifiedAt:now},now).message,/Plus access ends tomorrow.*paid reports.*backup/);
  assert.match(E.notification({promotions:{PROMO:{status:'active',tier:'pro',startsAt:now-1000,expiresAt:now-1}},serverVerifiedAt:now},now).message,/now on Free/);
  assert.equal(E.notification({promotions:{PERM:{status:'active',tier:'pro',startsAt:now-1,expiresAt:null,permanent:true}},serverVerifiedAt:now},now),null);
  for(const paidTier of ['pro','plus']){
    const message=E.notification({subscriptionStatus:'active',paidTier,billingCadence:'yearly',currentPeriodEnd:now+30*86400000,cancelAtPeriodEnd:false,serverVerifiedAt:now},now).message;
    assert.match(message,/renewal is due.*Manage subscription.*current plan and price/);
    assert.doesNotMatch(message,/£/,'unverified legacy renewal prices must not be guessed');
  }
  assert.match(E.notification({subscriptionStatus:'active',paidTier:'plus',billingCadence:'yearly',currentPeriodEnd:now+30*86400000,cancelAtPeriodEnd:true,serverVerifiedAt:now},now).message,/Paid access ends.*paid PDF.*Full Backup/);
  assert.match(E.notification({subscriptionStatus:'active',paidTier:'pro',billingCadence:'monthly',currentPeriodEnd:now+10*86400000,cancelAtPeriodEnd:true,serverVerifiedAt:now},now).message,/Paid access ends.*paid PDF.*Full Backup/);
});
test('former paid users see the exact tax-year retention boundary after access ends',()=>{
  const endedAt=Date.UTC(2026,8,5,12),snapshot={subscriptionStatus:'canceled',paidTier:'free',lastPaidTier:'pro',currentPeriodEnd:endedAt,serverVerifiedAt:endedAt};
  assert.equal(E.taxYearRetentionBoundary(endedAt).retainThroughDate,'2027-04-05');
  assert.match(E.notification(snapshot,Date.UTC(2026,8,6,12)).message,/Paid report exports are locked.*5 April 2027.*backup/);
  assert.match(E.notification(snapshot,Date.UTC(2027,3,6,12)).message,/retention period has ended/);
});
test('expired Pro promo copy reflects paid Plus fallback',()=>{
  const snapshot={subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:now+1000,promotions:{OLD:{status:'active',tier:'pro',startsAt:now-1000,expiresAt:now-1}},serverVerifiedAt:now};
  assert.match(E.notification(snapshot,now).message,/still have Plus access/);
});

test('all chargeable billing providers stay visible during an overlap',()=>{
  const snapshot={
    subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:now+60_000,paidAccess:{plusExpiresAt:now+60_000,proExpiresAt:0},
    googlePlayAccess:{active:true,tier:'pro',purchasedTier:'pro',status:'active',expiresAt:now+90_000},
    appStoreAccess:{active:false,tier:'free',purchasedTier:'plus',status:'billing_retry',expiresAt:now-1}
  };
  assert.deepEqual(E.chargeableProviders(snapshot,now).map(item=>item.provider),['stripe','google_play','app_store']);
  assert.equal(E.resolve(snapshot,now,false).source,'google_play','the strongest access may still be the single feature winner');
  assert.deepEqual(E.chargeableProviders({googlePlayAccess:{status:'expired',expiresAt:now-1},appStoreAccess:{status:'revoked',expiresAt:now-1}},now),[],'historical stores are not presented as renewing providers');
});

test('stored provider-overlap evidence does not outlive the current chargeable overlap',()=>{
  const evidence={provider:'app_store',reason:'provider_overlap',detectedAt:now-1000};
  const one=E.billingProviderConflict({billingConflict:evidence,googlePlayAccess:{active:true,tier:'plus',status:'active',expiresAt:now+10_000}},now);
  assert.equal(one.active,false);assert.deepEqual(one.providers.map(item=>item.provider),['google_play']);assert.deepEqual(one.evidence,evidence);
  const none=E.billingProviderConflict({billingConflict:evidence,googlePlayAccess:{status:'expired',expiresAt:now-1}},now);
  assert.equal(none.active,false);assert.deepEqual(none.providers,[]);assert.deepEqual(none.evidence,evidence);
  assert.equal(E.billingProviderConflict({subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:now+10_000,googlePlayAccess:{active:true,tier:'pro',status:'active',expiresAt:now+20_000}},now).active,true);
});
