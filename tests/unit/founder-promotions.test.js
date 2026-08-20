'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const Promotions=require('../../functions/founder-promotions');
const now=2_000_000;

test('Founder codes normalize safely without inventing entitlement values',()=>{
  assert.equal(Promotions.normalizeCode(' hkger '),'HKGER');
  assert.equal(Promotions.normalizeCode('../HKGER'),null);
  assert.equal(Promotions.validateConfiguration({code:'HKGER',active:false,redemptionCount:0},now).reason,'inactive');
});

test('configured Founder promotions require one bounded expiry model and a redemption limit',()=>{
  const duration={active:true,tier:'plus',durationDays:90,maxRedemptions:20,redemptionCount:0};
  const fixed={active:true,tier:'pro',expiresAt:now+1000,maxRedemptions:1,redemptionCount:0};
  assert.equal(Promotions.validateConfiguration(duration,now).ok,true);
  assert.equal(Promotions.entitlementExpiry(Promotions.validateConfiguration(duration,now),now),now+90*86400000);
  assert.equal(Promotions.validateConfiguration(fixed,now).ok,true);
  assert.equal(Promotions.validateConfiguration({...duration,expiresAt:now+1000},now).reason,'invalid-expiry-configuration');
  assert.equal(Promotions.validateConfiguration({...duration,redemptionCount:20},now).reason,'redemption-limit-reached');
});

test('highest active Founder promotion wins and lower promotion remains as fallback',()=>{
  const promotions={PLUS90:{status:'active',tier:'plus',expiresAt:now+5000},PRO1:{status:'active',tier:'pro',expiresAt:now+1000}};
  assert.equal(Promotions.selectEffective(promotions,now).tier,'pro');
  assert.equal(Promotions.selectEffective(promotions,now+2000).tier,'plus');
});
