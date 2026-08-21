'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Ent=require('../../src/core/entitlement');
const State=require('../../src/core/state-schema');
const now=2_000_000_000_000;
const activePaid=(tier,cadence)=>({subscriptionStatus:'active',paidTier:tier,billingCadence:cadence,currentPeriodEnd:now+30*86400000,serverVerifiedAt:now});
const promo=(tier,expiresAt,permanent=false)=>({subscriptionStatus:'inactive',paidTier:'free',serverVerifiedAt:now,promotions:{TEST:{status:'active',tier,startsAt:now-1000,expiresAt,permanent}}});
const baseState={v:5,businesses:[{id:'b1',name:'Main trade',structure:'sole'}],entries:[{id:'e1',bizId:'b1',kind:'expense',date:'2026-06-01',amount:20,receiptUrl:'https://example.invalid/retained.jpg'}],folders:[],tombstones:[],yearData:{},customCats:{},activeCats:{},catRenames:{},settings:{lang:'en'}};
const retained={...baseState,businesses:[...baseState.businesses,{id:'b2',name:'Retained second business',structure:'sole'}]};
const partnership={...baseState,businesses:[{id:'p1',name:'Shared partnership',structure:'partnership'}],entries:[{...baseState.entries[0],bizId:'p1',businessId:'p1'}]};
const personas=[
  ['Fresh Free user',null,false,'free',baseState],
  ['Plus monthly',activePaid('plus','monthly'),false,'plus',baseState],
  ['Plus yearly',activePaid('plus','yearly'),false,'plus',baseState],
  ['Pro monthly',activePaid('pro','monthly'),false,'pro',partnership],
  ['Pro yearly',activePaid('pro','yearly'),false,'pro',partnership],
  ['Fixed Plus promo',promo('plus',now+90*86400000),false,'plus',baseState],
  ['Fixed Pro promo',promo('pro',now+90*86400000),false,'pro',partnership],
  ['Permanent Pro promo',promo('pro',null,true),false,'pro',partnership],
  ['Former paid user after cancellation/period end',{subscriptionStatus:'canceled',paidTier:'free',lastPaidTier:'pro',currentPeriodEnd:now-1,serverVerifiedAt:now},false,'free',retained],
  ['User downgraded with multiple businesses and existing receipts',{subscriptionStatus:'expired',paidTier:'free',lastPaidTier:'plus',serverVerifiedAt:now},false,'free',retained],
  ['Partnership Pro user',activePaid('pro','monthly'),false,'pro',partnership],
  ['Partnership user after downgrade',{subscriptionStatus:'canceled',paidTier:'free',lastPaidTier:'pro',serverVerifiedAt:now},false,'free',partnership],
  ['Offline/local-only Free user',null,true,'free',baseState]
];
test('all 13 Master Pack personas have truthful tier controls and durable retained data',()=>{
  assert.equal(personas.length,13);
  for(const [name,snapshot,offline,expectedTier,input] of personas){
    const access=Ent.resolve(snapshot,now,offline);
    assert.equal(access.tier,expectedTier,`${name}: tier`);
    assert.equal(Ent.canUse(access.tier,'plus'),['plus','pro'].includes(expectedTier),`${name}: Plus controls`);
    assert.equal(Ent.canUse(access.tier,'pro'),expectedTier==='pro',`${name}: Pro controls`);
    const migrated=State.migrate(input,now,'persona-device');
    const backup=State.createExport(migrated,{appVersion:'2.0.0',buildId:'persona',deviceId:'persona-device'},[]);
    const restored=State.importBackup(backup,now+1,'reloaded-device');
    assert.equal(restored.businesses.length,input.businesses.length,`${name}: businesses retained`);
    assert.equal(restored.entries.length,input.entries.length,`${name}: entries retained`);
    assert.equal(restored.entries[0].receiptUrl,input.entries[0].receiptUrl,`${name}: existing receipt reference retained`);
  }
});
test('downgrade personas preserve data while premium create/write capability closes',()=>{
  for(const name of ['Former paid user after cancellation/period end','User downgraded with multiple businesses and existing receipts','Partnership user after downgrade']){
    const [,snapshot,,expectedTier,state]=personas.find(persona=>persona[0]===name);
    assert.equal(expectedTier,'free');
    assert.equal(Ent.canUse(Ent.resolve(snapshot,now,false).tier,'plus'),false);
    assert.ok(state.businesses.length>=1);
    assert.ok(state.entries[0].receiptUrl);
  }
});
