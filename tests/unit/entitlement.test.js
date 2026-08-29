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
  assert.equal(E.notification({promotions:{PROMO:{status:'active',tier:'pro',startsAt:now-1,expiresAt:now+7*86400000}},serverVerifiedAt:now},now).message,'7 days of Pro left.');
  assert.equal(E.notification({promotions:{PROMO:{status:'active',tier:'plus',startsAt:now-1,expiresAt:now+86400000}},serverVerifiedAt:now},now).message,'Your Plus access ends tomorrow.');
  assert.match(E.notification({promotions:{PROMO:{status:'active',tier:'pro',startsAt:now-1000,expiresAt:now-1}},serverVerifiedAt:now},now).message,/now on Free/);
  assert.equal(E.notification({promotions:{PERM:{status:'active',tier:'pro',startsAt:now-1,expiresAt:null,permanent:true}},serverVerifiedAt:now},now),null);
  assert.match(E.notification({subscriptionStatus:'active',paidTier:'pro',billingCadence:'yearly',currentPeriodEnd:now+30*86400000,cancelAtPeriodEnd:false,serverVerifiedAt:now},now).message,/renews.*£99\.99/);
  assert.match(E.notification({subscriptionStatus:'active',paidTier:'plus',billingCadence:'yearly',currentPeriodEnd:now+30*86400000,cancelAtPeriodEnd:false,serverVerifiedAt:now},now).message,/renews.*£29\.99/);
  assert.match(E.notification({subscriptionStatus:'active',paidTier:'plus',billingCadence:'yearly',currentPeriodEnd:now+30*86400000,cancelAtPeriodEnd:true,serverVerifiedAt:now},now).message,/plan ends/);
});
test('expired Pro promo copy reflects paid Plus fallback',()=>{
  const snapshot={subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:now+1000,promotions:{OLD:{status:'active',tier:'pro',startsAt:now-1000,expiresAt:now-1}},serverVerifiedAt:now};
  assert.match(E.notification(snapshot,now).message,/still have Plus access/);
});
