const test=require('node:test'); const assert=require('node:assert/strict');
const E=require('../../src/core/entitlement'); const now=2_000_000;
test('Stripe-verified active subscription is canonical',()=>assert.deepEqual(E.resolve({subscriptionStatus:'active',paidTier:'pro',serverVerifiedAt:now,currentPeriodEnd:now+1000},now,false),{tier:'pro',source:'stripe',reason:'active'}));
test('promotion expiry falls back to Free and retains no fake client unlock',()=>{ const s={promotion:{status:'active',tier:'plus',expiresAt:now-1},serverVerifiedAt:now}; assert.equal(E.resolve(s,now,false).tier,'free'); });
test('valid promotion and grace state are distinct from paid state',()=>{ assert.equal(E.resolve({promotion:{status:'active',tier:'plus',expiresAt:now+1},serverVerifiedAt:now},now,false).source,'promotion'); assert.equal(E.resolve({subscriptionStatus:'past_due',lastPaidTier:'pro',graceUntil:now+1,serverVerifiedAt:now},now,false).source,'grace'); });
test('multiple Founder promotions choose highest tier then fall back after expiry',()=>{const snapshot={promotions:{PLUS:{status:'active',tier:'plus',expiresAt:now+1000},PRO:{status:'active',tier:'pro',expiresAt:now+10}},serverVerifiedAt:now};assert.equal(E.resolve(snapshot,now,false).tier,'pro');assert.equal(E.resolve(snapshot,now+20,false).tier,'plus');});
test('stale offline verification fails closed',()=>assert.equal(E.resolve({subscriptionStatus:'active',paidTier:'pro',serverVerifiedAt:1},now+73*3600*1000,true).tier,'free'));
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
