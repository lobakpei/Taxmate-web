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
  const duration={active:true,tier:'plus',startsAt:now-1,durationDays:90,maxRedemptions:20,redemptionCount:0};
  const fixed={active:true,tier:'pro',startsAt:now-1,expiresAt:now+1000,maxRedemptions:1,redemptionCount:0};
  const permanent={active:true,tier:'pro',startsAt:now-1,permanent:true,maxRedemptions:3,redemptionCount:0};
  assert.equal(Promotions.validateConfiguration(duration,now).ok,true);
  assert.equal(Promotions.entitlementExpiry(Promotions.validateConfiguration(duration,now),now),now+90*86400000);
  assert.equal(Promotions.validateConfiguration(fixed,now).ok,true);
  assert.equal(Promotions.validateConfiguration(permanent,now).ok,true);
  assert.equal(Promotions.entitlementExpiry(Promotions.validateConfiguration(permanent,now),now),null);
  assert.equal(Promotions.validateConfiguration({...fixed,startsAt:now+1},now).reason,'not-started');
  assert.equal(Promotions.validateConfiguration({...fixed,expiresAt:now-1},now).reason,'expired');
  assert.equal(Promotions.validateConfiguration({...duration,expiresAt:now+1000},now).reason,'invalid-expiry-configuration');
  assert.equal(Promotions.validateConfiguration({...duration,redemptionCount:20},now).reason,'redemption-limit-reached');
});

test('highest active Founder promotion wins and lower promotion remains as fallback',()=>{
  const promotions={PLUS90:{status:'active',tier:'plus',expiresAt:now+5000},PRO1:{status:'active',tier:'pro',expiresAt:now+1000}};
  assert.equal(Promotions.selectEffective(promotions,now).tier,'pro');
  assert.equal(Promotions.selectEffective(promotions,now+2000).tier,'plus');
});

test('permanent Pro never expires, blocks paid checkout and has exact success copy',()=>{
  const permanent={status:'active',tier:'pro',startsAt:now-1,expiresAt:null,permanent:true};
  assert.equal(Promotions.selectEffective({PERMANENT:permanent},now+10_000).tier,'pro');
  assert.equal(Promotions.hasPermanentPro({PERMANENT:permanent},now),true);
  assert.equal(Promotions.successMessage({tier:'pro',permanent:true}),'Permanent Pro access unlocked.');
});

test('promotion access projection preserves lower-tier fallback after Pro expiry',()=>{
  const projection=Promotions.accessProjection({PLUS:{status:'active',tier:'plus',startsAt:0,expiresAt:now+20_000},PRO:{status:'active',tier:'pro',startsAt:0,expiresAt:now+10_000}},now);
  assert.deepEqual(projection,{plusPermanent:false,proPermanent:false,plusExpiresAt:now+20_000,proExpiresAt:now+10_000});
  assert.deepEqual(Promotions.accessProjection({PERMANENT:{status:'active',tier:'pro',startsAt:0,expiresAt:null,permanent:true}},now),{plusPermanent:true,proPermanent:true,plusExpiresAt:0,proExpiresAt:0});
});
