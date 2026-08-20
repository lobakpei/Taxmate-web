const test=require('node:test'); const assert=require('node:assert/strict');
const E=require('../../src/core/entitlement'); const now=2_000_000;
test('Stripe-verified active subscription is canonical',()=>assert.deepEqual(E.resolve({subscriptionStatus:'active',paidTier:'pro',serverVerifiedAt:now,currentPeriodEnd:now+1000},now,false),{tier:'pro',source:'stripe',reason:'active'}));
test('promotion expiry falls back to Free and retains no fake client unlock',()=>{ const s={promotion:{status:'active',tier:'plus',expiresAt:now-1},serverVerifiedAt:now}; assert.equal(E.resolve(s,now,false).tier,'free'); });
test('valid promotion and grace state are distinct from paid state',()=>{ assert.equal(E.resolve({promotion:{status:'active',tier:'plus',expiresAt:now+1},serverVerifiedAt:now},now,false).source,'promotion'); assert.equal(E.resolve({subscriptionStatus:'past_due',lastPaidTier:'pro',graceUntil:now+1,serverVerifiedAt:now},now,false).source,'grace'); });
test('stale offline verification fails closed',()=>assert.equal(E.resolve({subscriptionStatus:'active',paidTier:'pro',serverVerifiedAt:1},now+73*3600*1000,true).tier,'free'));
test('promotion codes are constrained',()=>{ assert.equal(E.validatePromotionCode('FOUNDER_2026'),true); assert.equal(E.validatePromotionCode('<script>'),false); });
