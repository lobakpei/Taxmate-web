'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const Play=require('../../functions/google-play-billing');

const IDS={
  GOOGLE_PLAY_PROVIDER_READY:'true',
  GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID:'taxmate_plus',
  GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN_ID:'monthly',
  GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN_ID:'yearly',
  GOOGLE_PLAY_PRO_SUBSCRIPTION_ID:'taxmate_pro',
  GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN_ID:'monthly',
  GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN_ID:'yearly'
};
const config=Play.configuration(IDS),uid='firebase-user-1',token='play-token-abcdefghijklmnopqrstuvwxyz',now=Date.UTC(2026,8,13);
function subscription({state='SUBSCRIPTION_STATE_ACTIVE',tier='pro',cadence='monthly',expiresAt=now+86400000,account=Play.hashAccount(uid),acknowledged=false}={}){
  const row=config.products.find(item=>item.tier===tier&&item.cadence===cadence);
  return{subscriptionState:state,startTime:new Date(now-1000).toISOString(),acknowledgementState:acknowledged?'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED':'ACKNOWLEDGEMENT_STATE_PENDING',externalAccountIdentifiers:{obfuscatedExternalAccountId:account},lineItems:[{productId:row.productId,expiryTime:new Date(expiresAt).toISOString(),offerDetails:{basePlanId:row.basePlanId},autoRenewingPlan:{autoRenewEnabled:true}}]};
}
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
class FakeSnapshot{
  constructor(ref,value){this.ref=ref;this.exists=value!==undefined;this.value=clone(value);}
  data(){return clone(this.value);}
}
class FakeRef{
  constructor(db,path){this.db=db;this.path=path;}
  get(){return Promise.resolve(new FakeSnapshot(this,this.db.rows.get(this.path)));}
  async set(value,options){const prior=this.db.rows.get(this.path),next=options&&options.merge?{...(prior||{}),...clone(value)}:clone(value);this.db.rows.set(this.path,next);this.db.events.push(`set:${this.path}`);}
}
function fieldValue(value,path){return String(path).split('.').reduce((row,key)=>row==null?undefined:row[key],value);}
class FakeQuery{
  constructor(db,name,filters=[],orders=[],cap=null){this.db=db;this.name=name;this.filters=filters;this.orders=orders;this.cap=cap;}
  where(field,op,value){return new FakeQuery(this.db,this.name,[...this.filters,{field,op,value}],this.orders,this.cap);}
  orderBy(field,direction='asc'){return new FakeQuery(this.db,this.name,this.filters,[...this.orders,{field,direction}],this.cap);}
  limit(cap){return new FakeQuery(this.db,this.name,this.filters,this.orders,Number(cap));}
  async get(){
    const prefix=`${this.name}/`;let docs=[];
    for(const [path,value] of this.db.rows){
      if(!path.startsWith(prefix)||path.slice(prefix.length).includes('/'))continue;
      const matches=this.filters.every(filter=>{const actual=fieldValue(value,filter.field);if(filter.op==='==')return actual===filter.value;if(filter.op==='<=')return actual<=filter.value;if(filter.op==='in')return Array.isArray(filter.value)&&filter.value.includes(actual);throw new Error(`Unsupported FakeDb query ${filter.op}`);});
      if(matches)docs.push(new FakeSnapshot(new FakeRef(this.db,path),value));
    }
    for(const order of this.orders.slice().reverse())docs.sort((a,b)=>((Number(fieldValue(a.data(),order.field))||0)-(Number(fieldValue(b.data(),order.field))||0))*(order.direction==='desc'?-1:1));
    if(Number.isSafeInteger(this.cap))docs=docs.slice(0,this.cap);
    return{docs,empty:docs.length===0,size:docs.length};
  }
}
class FakeDb{
  constructor(seed={}){this.rows=new Map(Object.entries(clone(seed)));this.events=[];}
  doc(path){return new FakeRef(this,path);}
  collection(name){return new FakeQuery(this,name);}
  batch(){const deletes=[];return{delete:ref=>deletes.push(ref),commit:async()=>{for(const ref of deletes){this.rows.delete(ref.path);this.events.push(`batch-delete:${ref.path}`);}}};}
  async runTransaction(work){
    if(typeof this.beforeTransaction==='function')await this.beforeTransaction(this);
    const tx={
      get:ref=>ref instanceof FakeQuery?ref.get():Promise.resolve(new FakeSnapshot(ref,this.rows.get(ref.path))),
      set:(ref,value,options)=>{const prior=this.rows.get(ref.path),next=options&&options.merge?{...(prior||{}),...clone(value)}:clone(value);this.rows.set(ref.path,next);this.events.push(`tx-set:${ref.path}`);},
      delete:ref=>{this.rows.delete(ref.path);this.events.push(`tx-delete:${ref.path}`);}
    };
    return work(tx);
  }
}

test('configuration fails closed until all permanent product and base-plan IDs are supplied',()=>{
  assert.throws(()=>Play.configuration({}),error=>error.reason==='configuration');
  assert.throws(()=>Play.configuration({...IDS,GOOGLE_PLAY_PRO_SUBSCRIPTION_ID:'taxmate_plus'}),error=>error.reason==='configuration');
  assert.throws(()=>Play.configuration({...IDS,GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN_ID:'Monthly'}),error=>error.reason==='configuration');
  assert.throws(()=>Play.configuration({...IDS,GOOGLE_PLAY_PROVIDER_READY:'false'}),error=>error.reason==='configuration');
  assert.deepEqual(config.products.map(row=>`${row.tier}:${row.cadence}`),['plus:monthly','plus:yearly','pro:monthly','pro:yearly']);
});

test('completed deletion creates a fresh epoch-bound Play identity and rejects the old account binding',async()=>{
  const oldHash=Play.hashAccount(uid,0),resetEpoch=7,newHash=Play.hashAccount(uid,resetEpoch),db=new FakeDb({
    [`accountResets/${uid}`]:{status:'complete',resetEpoch},
    [`googlePlayAccounts/${oldHash}`]:{schemaVersion:1,uid,accountHash:oldHash,resetEpoch:0,accountDeleted:true,rebindAllowedAfterEpoch:true}
  }),responses=[];
  const provider={getSubscription:async()=>responses.shift(),acknowledge:async()=>{}};
  const service=Play.createService({db,configuration:IDS,provider,now:()=>now}),binding=await service.registerAccount(uid);
  assert.equal(binding.accountHash,newHash);assert.equal(binding.resetEpoch,resetEpoch);assert.notEqual(newHash,oldHash);
  assert.equal(db.rows.get(`googlePlayAccounts/${oldHash}`).accountDeleted,true,'old epoch tombstone remains immutable');
  responses.push(subscription({account:oldHash}));await assert.rejects(()=>service.verifyForUser(uid,'play-token-old-abcdefghijklmnopqrstuvwxyz'),error=>error.reason==='ownership');
  responses.push(subscription({account:newHash}));assert.equal((await service.verifyForUser(uid,'play-token-new-abcdefghijklmnopqrstuvwxyz')).verified,true);
});

test('post-deletion refresh verifies only current-epoch Play tokens and ignores retained tombstones',async()=>{
  const resetEpoch=7,oldHash=Play.hashAccount(uid,0),currentHash=Play.hashAccount(uid,resetEpoch),oldToken='play-token-old-refresh-abcdefghijklmnopqrstuvwxyz',currentToken='play-token-current-refresh-abcdefghijklmnopqrstuvwxyz',calls=[],db=new FakeDb({
    [`accountResets/${uid}`]:{status:'complete',resetEpoch},
    [`googlePlayAccounts/${oldHash}`]:{schemaVersion:1,uid,accountHash:oldHash,resetEpoch:0,accountDeleted:true,rebindAllowedAfterEpoch:true},
    [`googlePlayAccounts/${currentHash}`]:{schemaVersion:1,uid,accountHash:currentHash,resetEpoch},
    [`googlePlayPurchaseTokens/${Play.hashToken(oldToken)}`]:{uid,accountHash:oldHash,resetEpoch:0,accountDeleted:true,purchaseToken:oldToken},
    [`googlePlayPurchaseTokens/${Play.hashToken(currentToken)}`]:{uid,accountHash:currentHash,resetEpoch,purchaseToken:currentToken}
  }),provider={getSubscription:async({token:seen})=>{calls.push(seen);return subscription({account:currentHash,acknowledged:true});},acknowledge:async()=>{}},service=Play.createService({db,configuration:IDS,provider,now:()=>now});
  const result=await service.refreshForUser(uid,{expectedResetEpoch:resetEpoch});
  assert.equal(result.count,1);assert.deepEqual(calls,[currentToken]);assert.equal(db.rows.get(`googlePlayPurchaseTokens/${Play.hashToken(oldToken)}`).accountDeleted,true);
});

test('verified projection requires the Firebase account hash and exact configured product/base plan',()=>{
  const result=Play.verifyProviderPurchase({uid,token,subscription:subscription(),config,now});
  assert.equal(result.tier,'pro');assert.equal(result.accessActive,true);assert.equal(result.acknowledged,false);
  assert.equal(result.tokenHash,Play.hashToken(token));assert.equal(JSON.stringify(result).includes(token),false);
  assert.throws(()=>Play.verifyProviderPurchase({uid,token,subscription:subscription({account:Play.hashAccount('another-user')}),config,now}),error=>error.reason==='ownership');
  const wrong=subscription();wrong.lineItems[0].offerDetails.basePlanId='unconfigured';
  assert.throws(()=>Play.verifyProviderPurchase({uid,token,subscription:wrong,config,now}),error=>error.reason==='product');
});

test('only active, grace, or cancelled-before-expiry provider states keep access',()=>{
  for(const state of ['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED'])assert.equal(Play.verifyProviderPurchase({uid,token,subscription:subscription({state}),config,now}).tier,'pro',state);
  for(const state of ['SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_PAUSED','SUBSCRIPTION_STATE_EXPIRED','SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED','SUBSCRIPTION_STATE_UNSPECIFIED']){
    const result=Play.verifyProviderPurchase({uid,token,subscription:subscription({state}),config,now});assert.equal(result.tier,'free',state);assert.equal(result.purchasedTier,'pro',state);
  }
  assert.equal(Play.verifyProviderPurchase({uid,token,subscription:subscription({expiresAt:now}),config,now}).tier,'free');
});

test('Google Play access merges multiple tokens and preserves the strongest live tier',()=>{
  const plus=Play.verifyProviderPurchase({uid,token,subscription:subscription({tier:'plus',expiresAt:now+10_000}),config,now}),proToken='play-token-pro-abcdefghijklmnopqrstuvwxyz',pro=Play.verifyProviderPurchase({uid,token:proToken,subscription:subscription({tier:'pro',expiresAt:now+5_000}),config,now});
  const merged=Play.accessProjection({[plus.tokenHash]:plus,[pro.tokenHash]:pro},now);
  assert.equal(merged.tier,'pro');assert.equal(merged.expiresAt,now+5_000);
  assert.equal(Play.accessProjection({[plus.tokenHash]:plus,[pro.tokenHash]:pro},now+6_000).tier,'plus');
});

test('service commits entitlement before acknowledgement and never exposes the raw token to the user document',async()=>{
  const db=new FakeDb(),order=[];
  const provider={
    async getSubscription(){order.push('provider-get');return subscription();},
    async acknowledge(){
      order.push('provider-ack');
      const entitlement=db.rows.get(`users/${uid}/entitlements/current`);
      assert.equal(entitlement.googlePlayAccess.tier,'pro','durable grant must exist before acknowledgement');
    }
  };
  const service=Play.createService({db,configuration:IDS,provider,now:()=>now,retentionLifecycle:()=>({marker:'retention-merged'})});
  const result=await service.verifyForUser(uid,token),entitlement=db.rows.get(`users/${uid}/entitlements/current`),mapping=db.rows.get(`googlePlayPurchaseTokens/${Play.hashToken(token)}`);
  assert.deepEqual(order,['provider-get','provider-ack']);assert.equal(result.tier,'pro');assert.equal(result.acknowledged,true);
  assert.equal(entitlement.googlePlayAccess.acknowledged,true);assert.equal(entitlement.accountRetention.marker,'retention-merged');
  assert.equal(entitlement.accountResetStatus,'complete');assert.equal(entitlement.accountResetEpoch,0);assert.equal(entitlement.accountResetEpochString,'0');
  assert.equal(entitlement.accountRetention.controlStatus,'complete');assert.equal(entitlement.accountRetention.lastRetentionEpoch,0);assert.equal(entitlement.accountRetention.lastRetentionEpochString,'0');
  assert.equal(JSON.stringify(entitlement).includes(token),false);assert.equal(mapping.purchaseToken,token);assert.equal(mapping.uid,uid);
  assert.equal(db.rows.get(`googlePlayAccounts/${Play.hashAccount(uid)}`).uid,uid);
});

test('token ownership is immutable and an acknowledgement failure leaves a retryable durable grant',async()=>{
  const tokenHash=Play.hashToken(token),db=new FakeDb({[`googlePlayPurchaseTokens/${tokenHash}`]:{uid:'other-user'}}),provider={getSubscription:async()=>subscription(),acknowledge:async()=>{throw Error('provider detail must not escape');}};
  const service=Play.createService({db,configuration:IDS,provider,now:()=>now});
  await assert.rejects(()=>service.verifyForUser(uid,token),error=>error.reason==='ownership');
  const retryDb=new FakeDb(),retry=Play.createService({db:retryDb,configuration:IDS,provider,now:()=>now});
  await assert.rejects(()=>retry.verifyForUser(uid,token),error=>error.reason==='acknowledgement'&&!error.message.includes('provider detail'));
  assert.equal(retryDb.rows.get(`users/${uid}/entitlements/current`).googlePlayAccess.tier,'pro');
});

test('RTDN accepts Pub/Sub JSON or base64 and omits raw purchase tokens from orphan records',async()=>{
  const payload={version:'1.0',packageName:Play.PACKAGE_NAME,eventTimeMillis:String(now),subscriptionNotification:{version:'1.0',notificationType:2,purchaseToken:token,subscriptionId:'taxmate_pro'}};
  assert.equal(Play.parseNotification({data:{message:{json:payload}}}).purchaseToken,token);
  assert.equal(Play.parseNotification({message:{data:Buffer.from(JSON.stringify(payload)).toString('base64')}}).notificationType,2);
  const db=new FakeDb(),provider={getSubscription:async()=>subscription({account:'a'.repeat(64)}),acknowledge:async()=>{throw Error('not expected');}},service=Play.createService({db,configuration:IDS,provider,now:()=>now});
  const result=await service.handleNotification({data:{message:{json:payload}}}),orphan=db.rows.get(`googlePlayOrphans/${Play.hashToken(token)}`);
  assert.equal(result.status,'unlinked');assert.equal(JSON.stringify(orphan).includes(token),false);assert.equal(orphan.tokenHash,Play.hashToken(token));
});

test('RTDN acknowledges Google Play test notifications without treating them as purchases',async()=>{
  const payload={version:'1.0',packageName:Play.PACKAGE_NAME,eventTimeMillis:String(now),testNotification:{version:'1.0'}};
  assert.equal(Play.parseNotification({data:{message:{json:payload}}}).testNotification,true);
  assert.equal(Play.parseNotification({message:{data:Buffer.from(JSON.stringify(payload)).toString('base64')}}).testNotification,true);
  const db=new FakeDb(),provider={getSubscription:async()=>{throw Error('test notification must not reach provider');}};
  const service=Play.createService({db,configuration:IDS,provider,now:()=>now});
  assert.deepEqual(await service.handleNotification({data:{message:{json:payload}}}),{verified:false,status:'test_notification'});
  assert.equal(db.rows.size,0);
  await assert.rejects(()=>service.handleNotification({data:{message:{json:{...payload,packageName:'other.app'}}}}),error=>error.reason==='package');
});

test('authenticated pre-binding lets an out-of-app RTDN recover, grant and acknowledge after process loss',async()=>{
  const payload={version:'1.0',packageName:Play.PACKAGE_NAME,eventTimeMillis:String(now),subscriptionNotification:{version:'1.0',notificationType:2,purchaseToken:token,subscriptionId:'taxmate_pro'}},response=subscription({acknowledged:false});
  delete response.externalAccountIdentifiers;response.outOfAppPurchaseContext={expiredExternalAccountIdentifiers:{obfuscatedExternalAccountId:Play.hashAccount(uid)}};
  let acknowledgements=0;const db=new FakeDb(),service=Play.createService({db,configuration:IDS,provider:{getSubscription:async()=>response,acknowledge:async()=>{acknowledgements++;}},now:()=>now});
  await service.registerAccount(uid);
  const result=await service.handleNotification({data:{message:{json:payload}}});
  assert.equal(result.verified,true);assert.equal(result.tier,'pro');assert.equal(acknowledgements,1);
  assert.equal(db.rows.get(`users/${uid}/entitlements/current`).googlePlayAccess.active,true);
});

test('RTDN fences an in-progress deletion and quarantines deleted-account billing identities',async()=>{
  const payload={version:'1.0',packageName:Play.PACKAGE_NAME,eventTimeMillis:String(now),subscriptionNotification:{version:'1.0',notificationType:2,purchaseToken:token,subscriptionId:'taxmate_pro'}},tokenHash=Play.hashToken(token),provider={getSubscription:async()=>subscription({acknowledged:true}),acknowledge:async()=>{}},db=new FakeDb(),service=Play.createService({db,configuration:IDS,provider,now:()=>now});
  await service.registerAccount(uid);await service.verifyForUser(uid,token);db.rows.set(`accountResets/${uid}`,{status:'deleting',resetEpoch:0,correlationId:'delete-play'});
  await service.refreshForUser(uid,{expectedResetEpoch:0,allowDeletingReset:true});assert.equal(db.rows.get(`users/${uid}/entitlements/current`).accountResetStatus,'deleting','server-only deletion refresh must keep Storage fenced');
  await assert.rejects(()=>service.handleNotification({data:{message:{json:payload}}}),error=>error.reason==='account-reset');
  let signal=db.rows.get(`billingDeletionSignals/${uid}`),reset=db.rows.get(`accountResets/${uid}`);assert.equal(signal.provider,'google_play');assert.equal(signal.deletionId,'delete-play');assert.equal(signal.accountDeleted,false);assert.equal(reset.billingEventProvider,'google_play');assert.equal(reset.billingEventWatermark,now);
  const mapping=db.rows.get(`googlePlayPurchaseTokens/${tokenHash}`);db.rows.set(`googlePlayPurchaseTokens/${tokenHash}`,{...mapping,accountDeleted:true,deletionId:'delete-play'});db.rows.set(`accountResets/${uid}`,{status:'complete',resetEpoch:1,correlationId:'delete-play'});
  const result=await service.handleNotification({data:{message:{json:payload}}});assert.equal(result.status,'account_deleted');signal=db.rows.get(`billingDeletionSignals/${uid}`);assert.equal(signal.accountDeleted,true);
});

test('matching reservation clears after verification while missing or mismatched reservation records a conflict',async()=>{
  const reservationId='01890f47-7344-7cc1-9f87-1234567890aa',db=new FakeDb(),provider={getSubscription:async()=>subscription({acknowledged:true}),acknowledge:async()=>{}},service=Play.createService({db,configuration:IDS,provider,now:()=>now});
  await service.registerAccount(uid);
  db.rows.set(`billingPurchaseReservations/${uid}`,{status:'provider_pending',provider:'google_play',tier:'pro',cadence:'monthly',reservationId,resetEpoch:0,startedAt:now-2000});
  await service.verifyForUser(uid,token,{reservationId:'wrong'});
  assert.equal(db.rows.has(`billingPurchaseReservations/${uid}`),true);assert.equal(db.rows.get(`users/${uid}/entitlements/current`).billingConflict.reason,'reservation_missing_or_mismatch');
  await service.verifyForUser(uid,token,{reservationId});assert.equal(db.rows.has(`billingPurchaseReservations/${uid}`),false);
});

test('account reset fence blocks deletion states, epoch races, and mappings from an earlier reset',async()=>{
  let providerReads=0;
  const provider={getSubscription:async()=>{providerReads++;return subscription({acknowledged:true});},acknowledge:async()=>{throw Error('acknowledgement must not run');}};
  for(const status of ['deleting','failed']){
    const db=new FakeDb({[`accountResets/${uid}`]:{status,resetEpoch:2}}),service=Play.createService({db,configuration:IDS,provider,now:()=>now});
    await assert.rejects(()=>service.verifyForUser(uid,token),error=>error.reason==='account-reset');
    assert.equal(db.rows.has(`users/${uid}/entitlements/current`),false,status);
  }
  assert.equal(providerReads,0,'reset in progress is rejected before a provider read');
  for(const reset of [{status:'unknown',resetEpoch:0},{status:'complete',resetEpoch:-1},{status:'complete',resetEpoch:1.5}]){
    const invalid=new FakeDb({[`accountResets/${uid}`]:reset});
    await assert.rejects(()=>Play.createService({db:invalid,configuration:IDS,provider,now:()=>now}).verifyForUser(uid,token),error=>error.reason==='account-reset');
  }
  const expected=new FakeDb({[`accountResets/${uid}`]:{status:'complete',resetEpoch:2}});
  await assert.rejects(()=>Play.createService({db:expected,configuration:IDS,provider,now:()=>now}).verifyForUser(uid,token,{expectedResetEpoch:1}),error=>error.reason==='account-reset');
  assert.equal(providerReads,0,'invalid or unexpected reset epochs are rejected before a provider read');

  const raced=new FakeDb({[`accountResets/${uid}`]:{status:'complete',resetEpoch:1}});
  raced.beforeTransaction=async db=>{db.beforeTransaction=null;db.rows.set(`accountResets/${uid}`,{status:'deleting',resetEpoch:2});};
  const raceProvider={getSubscription:async()=>subscription({account:Play.hashAccount(uid,1),acknowledged:true}),acknowledge:async()=>{throw Error('acknowledgement must not run');}};
  await assert.rejects(()=>Play.createService({db:raced,configuration:IDS,provider:raceProvider,now:()=>now}).verifyForUser(uid,token),error=>error.reason==='account-reset');
  assert.equal(raced.rows.has(`users/${uid}/entitlements/current`),false,'reset race cannot commit an entitlement');

  const tokenHash=Play.hashToken(token),stale=new FakeDb({
    [`accountResets/${uid}`]:{status:'complete',resetEpoch:2},
    [`googlePlayPurchaseTokens/${tokenHash}`]:{uid,resetEpoch:1,purchaseToken:token}
  });
  const epochTwoProvider={getSubscription:async()=>subscription({account:Play.hashAccount(uid,2),acknowledged:true}),acknowledge:async()=>{}};
  await assert.rejects(()=>Play.createService({db:stale,configuration:IDS,provider:epochTwoProvider,now:()=>now}).verifyForUser(uid,token),error=>error.reason==='account-reset');
  assert.equal(stale.rows.has(`users/${uid}/entitlements/current`),false,'an earlier-reset token cannot recreate access');
  const staleAccount=new FakeDb({
    [`accountResets/${uid}`]:{status:'complete',resetEpoch:2},
    [`googlePlayAccounts/${Play.hashAccount(uid)}`]:{uid,resetEpoch:1}
  });
  assert.equal((await Play.createService({db:staleAccount,configuration:IDS,provider:epochTwoProvider,now:()=>now}).verifyForUser(uid,token)).verified,true);
  assert.equal(staleAccount.rows.get(`googlePlayAccounts/${Play.hashAccount(uid)}`).resetEpoch,1,'an earlier epoch account mapping remains immutable');
  assert.equal(staleAccount.rows.get(`googlePlayAccounts/${Play.hashAccount(uid,2)}`).resetEpoch,2,'the current epoch receives a distinct binding');
});

test('orphan notifications receive a bounded TTL and purge deletes only due records up to the requested cap',async()=>{
  const payload={version:'1.0',packageName:Play.PACKAGE_NAME,eventTimeMillis:String(now),subscriptionNotification:{version:'1.0',notificationType:2,purchaseToken:token,subscriptionId:'taxmate_pro'}};
  const db=new FakeDb(),provider={getSubscription:async()=>subscription({account:'a'.repeat(64)}),acknowledge:async()=>{throw Error('not expected');}},service=Play.createService({db,configuration:IDS,provider,now:()=>now});
  await service.handleNotification({data:{message:{json:payload}}});
  const tokenHash=Play.hashToken(token),saved=db.rows.get(`googlePlayOrphans/${tokenHash}`);
  assert.equal(saved.deleteAfterAt,now+Play.ORPHAN_RETENTION_MS);assert.equal(saved.detectedAt,now);
  db.rows.set('googlePlayOrphans/due-a',{deleteAfterAt:now-2});db.rows.set('googlePlayOrphans/due-b',{deleteAfterAt:now});db.rows.set('googlePlayOrphans/future',{deleteAfterAt:now+1});
  assert.deepEqual(await service.purgeOrphans(1),{deleted:1});
  assert.equal(['due-a','due-b'].filter(id=>db.rows.has(`googlePlayOrphans/${id}`)).length,1,'limit removes exactly one due orphan');
  assert.equal(db.rows.has(`googlePlayOrphans/${tokenHash}`),true,'normal TTL orphan remains before expiry');
  assert.equal(db.rows.has('googlePlayOrphans/future'),true,'future orphan remains');
  assert.deepEqual(await service.purgeOrphans(),{deleted:1});
  assert.deepEqual(await service.purgeOrphans(),{deleted:0},'empty due set is a no-op');

  const linkedDb=new FakeDb({
    [`googlePlayAccounts/${Play.hashAccount(uid)}`]:{uid,resetEpoch:0},
    [`googlePlayOrphans/${tokenHash}`]:{tokenHash,deleteAfterAt:now+Play.ORPHAN_RETENTION_MS}
  }),linked=Play.createService({db:linkedDb,configuration:IDS,provider:{getSubscription:async()=>subscription({acknowledged:true}),acknowledge:async()=>{throw Error('not expected');}},now:()=>now});
  const linkedResult=await linked.handleNotification({data:{message:{json:payload}}});
  assert.equal(linkedResult.verified,true);assert.equal(linkedDb.rows.has(`googlePlayOrphans/${tokenHash}`),false,'successful mapping removes the prior orphan');
});

test('acknowledgement retry outbox honours backoff and completes the durable grant on the due retry',async()=>{
  let clock=now,providerReads=0,acknowledgements=0;
  const db=new FakeDb(),provider={
    getSubscription:async()=>{providerReads++;return subscription();},
    acknowledge:async()=>{acknowledgements++;if(acknowledgements===1)throw Error('temporary provider failure');}
  };
  const service=Play.createService({db,configuration:IDS,provider,now:()=>clock}),tokenHash=Play.hashToken(token),tokenPath=`googlePlayPurchaseTokens/${tokenHash}`;
  await assert.rejects(()=>service.verifyForUser(uid,token),error=>error.reason==='acknowledgement');
  let mapping=db.rows.get(tokenPath);
  assert.deepEqual(mapping.acknowledgement,{status:'pending',attempts:1,leaseUntil:null,retryAfterAt:now+5*60*1000,dueAt:now+5*60*1000,updatedAt:now});
  assert.equal(db.rows.get(`users/${uid}/entitlements/current`).googlePlayAccess.tier,'pro','access remains durable while acknowledgement is queued');

  clock=mapping.acknowledgement.retryAfterAt-1;
  assert.deepEqual(await service.retryAcknowledgements(),{checked:0,retried:0,failures:0,accountResetSkipped:0});
  assert.equal(providerReads,1);assert.equal(acknowledgements,1,'retry is not attempted before backoff expires');

  clock++;
  assert.deepEqual(await service.retryAcknowledgements(),{checked:1,retried:1,failures:0,accountResetSkipped:0});
  mapping=db.rows.get(tokenPath);
  assert.equal(providerReads,2);assert.equal(acknowledgements,2);
  assert.equal(mapping.acknowledgement.status,'complete');assert.equal(mapping.acknowledgement.attempts,2);
  assert.equal(mapping.projection.acknowledged,true);assert.equal(db.rows.get(`users/${uid}/entitlements/current`).googlePlayAccess.acknowledged,true);
});

test('acknowledgement scheduler skips live leases and mappings fenced by a newer reset',async()=>{
  const leasedToken='play-token-leased-abcdefghijklmnopqrstuvwxyz',staleToken='play-token-stale-abcdefghijklmnopqrstuvwxyz',db=new FakeDb({
    [`googlePlayPurchaseTokens/${Play.hashToken(leasedToken)}`]:{uid,purchaseToken:leasedToken,resetEpoch:0,acknowledgement:{status:'processing',leaseUntil:now+1,dueAt:now+1}},
    [`googlePlayPurchaseTokens/${Play.hashToken(staleToken)}`]:{uid,purchaseToken:staleToken,resetEpoch:1,acknowledgement:{status:'pending',retryAfterAt:now,dueAt:now}},
    [`accountResets/${uid}`]:{status:'complete',resetEpoch:2}
  });
  let providerReads=0;const service=Play.createService({db,configuration:IDS,provider:{getSubscription:async()=>{providerReads++;return subscription();},acknowledge:async()=>{}},now:()=>now});
  assert.deepEqual(await service.retryAcknowledgements(),{checked:1,retried:0,failures:0,accountResetSkipped:1});
  assert.equal(providerReads,0,'neither a live lease nor an earlier-reset mapping reaches the provider');
});

test('acknowledgement scheduler reports failures without provider details and reaches the 24-hour backoff cap',async()=>{
  const tokenHash=Play.hashToken(token),tokenPath=`googlePlayPurchaseTokens/${tokenHash}`,db=new FakeDb({
    [tokenPath]:{uid,accountHash:Play.hashAccount(uid),purchaseToken:token,resetEpoch:0,acknowledgement:{status:'pending',attempts:9,retryAfterAt:now,dueAt:now}}
  });
  const provider={getSubscription:async()=>subscription(),acknowledge:async()=>{throw Error('private provider failure details');}},service=Play.createService({db,configuration:IDS,provider,now:()=>now});
  const result=await service.retryAcknowledgements(),mapping=db.rows.get(tokenPath);
  assert.deepEqual(result,{checked:1,retried:0,failures:1,accountResetSkipped:0});
  assert.equal(JSON.stringify(result).includes('provider'),false,'scheduler result exposes counts only');
  assert.equal(mapping.acknowledgement.attempts,10);
  assert.equal(mapping.acknowledgement.retryAfterAt,now+24*60*60*1000,'the exponential retry reaches the declared 24-hour cap');
});

test('acknowledgement query selects due work before its 100-row cap',async()=>{
  const db=new FakeDb(),dueToken='play-token-due-work-abcdefghijklmnopqrstuvwxyz';
  for(let i=0;i<100;i++)db.rows.set(`googlePlayPurchaseTokens/future-${String(i).padStart(3,'0')}`,{uid,purchaseToken:`play-token-future-${String(i).padStart(3,'0')}-abcdefghijklmnop`,resetEpoch:0,acknowledgement:{status:'pending',dueAt:now+1000+i}});
  db.rows.set(`googlePlayPurchaseTokens/${Play.hashToken(dueToken)}`,{uid,purchaseToken:dueToken,resetEpoch:0,acknowledgement:{status:'pending',dueAt:now}});
  const service=Play.createService({db,configuration:IDS,provider:{getSubscription:async()=>subscription({acknowledged:true}),acknowledge:async()=>{}},now:()=>now}),result=await service.retryAcknowledgements(100);
  assert.deepEqual(result,{checked:1,retried:1,failures:0,accountResetSkipped:0});
});

test('scheduled provider refresh revokes stale access and server-only deletion refresh can recover a failed fence',async()=>{
  let current=subscription({acknowledged:true}),clock=now;const db=new FakeDb(),provider={getSubscription:async()=>current,acknowledge:async()=>{}},service=Play.createService({db,configuration:IDS,provider,now:()=>clock});
  await service.registerAccount(uid);await service.verifyForUser(uid,token);
  const path=`googlePlayPurchaseTokens/${Play.hashToken(token)}`,mapping=db.rows.get(path);mapping.providerRefreshDueAt=clock;db.rows.set(path,mapping);
  current=subscription({state:'SUBSCRIPTION_STATE_EXPIRED',expiresAt:clock-1,acknowledged:true});
  assert.equal((await service.refreshTrackedPurchases()).refreshed,1);assert.equal(db.rows.get(`users/${uid}/entitlements/current`).googlePlayAccess.active,false);
  db.rows.set(`accountResets/${uid}`,{status:'failed',resetEpoch:0});
  await assert.rejects(()=>service.verifyForUser(uid,token),error=>error.reason==='account-reset');
  assert.equal((await service.refreshForUser(uid,{expectedResetEpoch:0,allowFailedReset:true})).count,1);
});

test('terminal token purge preserves the reverse account binding for later out-of-app resubscribe',async()=>{
  const accountHash=Play.hashAccount(uid),dueToken='play-token-due-abcdefghijklmnopqrstuvwxyz',futureToken='play-token-future-abcdefghijklmnopqrstuvwxyz',accountPath=`googlePlayAccounts/${accountHash}`;
  const onlyDb=new FakeDb({
    [accountPath]:{schemaVersion:1,uid,accountHash,resetEpoch:0},
    [`googlePlayPurchaseTokens/${Play.hashToken(dueToken)}`]:{uid,accountHash,resetEpoch:0,deleteAfterAt:now}
  }),onlyService=Play.createService({db:onlyDb,configuration:IDS,provider:{},now:()=>now});
  assert.deepEqual(await onlyService.purgeTerminalTokens(),{deleted:1,accountsDeleted:0});
  assert.equal(onlyDb.rows.has(accountPath),true,'the reverse account binding remains until explicit TaxMate account deletion');

  const remainingDb=new FakeDb({
    [accountPath]:{schemaVersion:1,uid,accountHash,resetEpoch:0},
    [`googlePlayPurchaseTokens/${Play.hashToken(dueToken)}`]:{uid,accountHash,resetEpoch:0,deleteAfterAt:now},
    [`googlePlayPurchaseTokens/${Play.hashToken(futureToken)}`]:{uid,accountHash,resetEpoch:0,deleteAfterAt:now+1}
  }),remainingService=Play.createService({db:remainingDb,configuration:IDS,provider:{},now:()=>now});
  assert.deepEqual(await remainingService.purgeTerminalTokens(),{deleted:1,accountsDeleted:0});
  assert.equal(remainingDb.rows.has(accountPath),true,'an account mapping remains while any token still belongs to it');
  assert.equal(remainingDb.rows.has(`googlePlayPurchaseTokens/${Play.hashToken(futureToken)}`),true);
});
