'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const AppStore=require('../../functions/app-store-billing');

const now=Date.UTC(2026,8,13),uid='firebase-user-apple-1',accountToken='01890f47-7344-7cc1-9f87-1234567890ab';
const IDS={
  APP_STORE_PROVIDER_READY:'true',
  APP_STORE_BUNDLE_ID:'uk.taxmate.app',APP_STORE_APPLE_ID:'1234567890',APP_STORE_ENVIRONMENT:'Sandbox',
  APP_STORE_ISSUER_ID:'01890f47-7344-7cc1-9f87-1234567890aa',APP_STORE_KEY_ID:'ABCDEFGHIJ',APP_STORE_PRIVATE_KEY:`-----BEGIN PRIVATE KEY-----\n${'A'.repeat(180)}\n-----END PRIVATE KEY-----`,
  APP_STORE_ROOT_CA_BASE64:[Buffer.alloc(512,1)],
  APP_STORE_PLUS_MONTHLY_PRODUCT_ID:'configured.plus.monthly',APP_STORE_PLUS_YEARLY_PRODUCT_ID:'configured.plus.yearly',
  APP_STORE_PRO_MONTHLY_PRODUCT_ID:'configured.pro.monthly',APP_STORE_PRO_YEARLY_PRODUCT_ID:'configured.pro.yearly'
};
const config=AppStore.configuration(IDS),signedTransaction=`${'a'.repeat(32)}.${'b'.repeat(64)}.${'c'.repeat(64)}`,signedNotification=`${'d'.repeat(32)}.${'e'.repeat(64)}.${'f'.repeat(64)}`;

function decoded({tier='pro',cadence='monthly',token=accountToken,expiresAt=now+86400000,transactionId='200000000000001',originalTransactionId='100000000000001',bundleId=config.bundleId,environment=config.environment,type=AppStore.AUTO_RENEWABLE,revocationDate=null,purchaseDate=now-1000,signedDate=now}={}){
  const product=config.products.find(row=>row.tier===tier&&row.cadence===cadence).productId;
  return{bundleId,environment,type,productId:product,appAccountToken:token,transactionId,originalTransactionId,purchaseDate,signedDate,expiresDate:expiresAt,...(revocationDate==null?{}:{revocationDate})};
}
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
class FakeSnapshot{constructor(ref,value){this.ref=ref;this.exists=value!==undefined;this.value=clone(value);}data(){return clone(this.value);}}
class FakeRef{
  constructor(db,path){this.db=db;this.path=path;}
  get(){return Promise.resolve(new FakeSnapshot(this,this.db.rows.get(this.path)));}
  async set(value,options){const prior=this.db.rows.get(this.path),next=options&&options.merge?{...(prior||{}),...clone(value)}:clone(value);this.db.rows.set(this.path,next);}
  async delete(){this.db.rows.delete(this.path);}
}
class FakeQuery{
  constructor(db,collection,filters=[],orders=[],cap=Infinity,cursor=null){this.db=db;this.collection=collection;this.filters=filters;this.orders=orders;this.cap=cap;this.cursor=cursor;}
  where(field,operator,value){return new FakeQuery(this.db,this.collection,[...this.filters,[field,operator,value]],this.orders,this.cap,this.cursor);}
  orderBy(field,direction='asc'){return new FakeQuery(this.db,this.collection,this.filters,[...this.orders,[field,direction]],this.cap,this.cursor);}
  limit(value){return new FakeQuery(this.db,this.collection,this.filters,this.orders,value,this.cursor);}
  startAfter(snapshot){return new FakeQuery(this.db,this.collection,this.filters,this.orders,this.cap,snapshot&&snapshot.ref&&snapshot.ref.path||null);}
  async get(){const prefix=`${this.collection}/`;let docs=[...this.db.rows.entries()].filter(([key])=>key.startsWith(prefix)&&!key.slice(prefix.length).includes('/')).map(([key])=>new FakeSnapshot(new FakeRef(this.db,key),this.db.rows.get(key)));const field=(row,path)=>typeof path==='string'?path.split('.').reduce((value,key)=>value&&value[key],row.data()):row.ref.path;for(const [path,operator,expected] of this.filters)docs=docs.filter(row=>{const actual=field(row,path);return operator==='=='?actual===expected:operator==='<='&&actual<=expected;});for(const [path,direction] of this.orders.slice().reverse())docs.sort((a,b)=>String(field(a,path)).localeCompare(String(field(b,path)))*(direction==='desc'?-1:1));if(this.cursor)docs=docs.filter(row=>row.ref.path>this.cursor);docs=docs.slice(0,this.cap);return{docs,empty:docs.length===0,size:docs.length};}
}
class FakeDb{
  constructor(seed={}){this.rows=new Map(Object.entries(clone(seed)));}
  doc(path){return new FakeRef(this,path);}
  collection(path){return new FakeQuery(this,path);}
  async runTransaction(work){
    if(this.beforeTransaction){const callback=this.beforeTransaction;this.beforeTransaction=null;await callback(this);}
    return work({get:ref=>ref.get(),set:(ref,value,options)=>{const prior=this.rows.get(ref.path),next=options&&options.merge?{...(prior||{}),...clone(value)}:clone(value);this.rows.set(ref.path,next);},delete:ref=>this.rows.delete(ref.path)});
  }
}
function readyVerifier(overrides={}){return{verifyAndDecodeTransaction:async()=>decoded(),verifyAndDecodeNotification:async()=>({}),verifyAndDecodeRenewalInfo:async()=>({}),...overrides};}
function readyApi(response={data:[{lastTransactions:[{status:1,signedTransactionInfo:signedTransaction}]}]}){return{getAllSubscriptionStatuses:async()=>clone(response)};}
function serviceOptions(overrides={}){return{configuration:IDS,verifierFactory:()=>readyVerifier(),apiClientFactory:()=>readyApi(),now:()=>now,randomUUID:()=>accountToken,...overrides};}

test('App Store configuration fails closed until four exact products and verifier identity are supplied',()=>{
  assert.throws(()=>AppStore.configuration({}),error=>error.reason==='configuration');
  assert.doesNotThrow(()=>AppStore.configuration({...IDS,APP_STORE_APPLE_ID:''}));
  assert.throws(()=>AppStore.configuration({...IDS,APP_STORE_ENVIRONMENT:'Production',APP_STORE_APPLE_ID:''}),error=>error.reason==='configuration');
  assert.throws(()=>AppStore.configuration({...IDS,APP_STORE_BUNDLE_ID:'uk.taxmate.wrong'}),error=>error.reason==='configuration');
  assert.throws(()=>AppStore.configuration({...IDS,APP_STORE_ENVIRONMENT:'Xcode'}),error=>error.reason==='configuration');
  assert.throws(()=>AppStore.configuration({...IDS,APP_STORE_ROOT_CA_BASE64:[]}),error=>error.reason==='configuration');
  assert.throws(()=>AppStore.configuration({...IDS,APP_STORE_PRO_YEARLY_PRODUCT_ID:IDS.APP_STORE_PRO_MONTHLY_PRODUCT_ID}),error=>error.reason==='configuration');
  assert.throws(()=>AppStore.configuration({...IDS,APP_STORE_PROVIDER_READY:'false'}),error=>error.reason==='configuration');
  assert.throws(()=>AppStore.configuration({...IDS,APP_STORE_PRIVATE_KEY:''}),error=>error.reason==='configuration');
  assert.deepEqual(config.products.map(row=>`${row.tier}:${row.cadence}`),['plus:monthly','plus:yearly','pro:monthly','pro:yearly']);
  assert.deepEqual(Object.keys(AppStore.clientConfiguration(config)).sort(),['bundleId','configured','environment','products','schemaVersion']);
});

test('production verifier accepts Production only and never projects Sandbox purchases',async()=>{
  const productionIds={...IDS,APP_STORE_ENVIRONMENT:'Production'},production=AppStore.configuration(productionIds),db=new FakeDb(),verifier=readyVerifier({verifyAndDecodeTransaction:async()=>decoded({environment:'Sandbox'})}),service=AppStore.createService({db,...serviceOptions({configuration:productionIds,verifierFactory:(value,environment)=>{assert.equal(environment,'Production');return verifier;}})});
  await service.configurationForUser(uid);
  await assert.rejects(()=>service.verifyForUser(uid,signedTransaction),error=>error.reason==='environment');
  assert.equal(db.rows.has(`users/${uid}/entitlements/current`),false);
  assert.deepEqual(production.environments,['Production']);
});

test('transaction projection requires Apple signature output to match bundle, environment, product, type and account token',()=>{
  const value=AppStore.transactionProjection({decoded:decoded(),config,expectedAccountToken:accountToken,now});
  assert.equal(value.tier,'pro');assert.equal(value.accessActive,true);assert.equal(value.appAccountTokenHash,AppStore.hashAccountToken(accountToken));
  assert.throws(()=>AppStore.transactionProjection({decoded:decoded({token:'01890f47-7344-7cc1-9f87-1234567890ac'}),config,expectedAccountToken:accountToken,now}),error=>error.reason==='ownership');
  assert.throws(()=>AppStore.transactionProjection({decoded:decoded({bundleId:'uk.taxmate.other'}),config,expectedAccountToken:accountToken,now}),error=>error.reason==='bundle');
  assert.throws(()=>AppStore.transactionProjection({decoded:decoded({environment:'Production'}),config,expectedAccountToken:accountToken,now}),error=>error.reason==='environment');
  assert.throws(()=>AppStore.transactionProjection({decoded:decoded({type:'Consumable'}),config,expectedAccountToken:accountToken,now}),error=>error.reason==='product');
  const revoked=AppStore.transactionProjection({decoded:decoded({revocationDate:now-1}),config,expectedAccountToken:accountToken,now});assert.equal(revoked.tier,'free');assert.equal(revoked.status,'revoked');
});

test('App Store access keeps the strongest live tier and longest matching expiry without trusting a client tier',()=>{
  const plus=AppStore.transactionProjection({decoded:decoded({tier:'plus',expiresAt:now+20_000,originalTransactionId:'100000000000010',transactionId:'200000000000010'}),config,expectedAccountToken:accountToken,now});
  const pro=AppStore.transactionProjection({decoded:decoded({tier:'pro',expiresAt:now+10_000,originalTransactionId:'100000000000011',transactionId:'200000000000011'}),config,expectedAccountToken:accountToken,now});
  const access=AppStore.accessProjection({[plus.transactionHash]:plus,[pro.transactionHash]:pro},now);assert.equal(access.tier,'pro');assert.equal(access.expiresAt,now+10_000);
  assert.equal(AppStore.accessProjection({[plus.transactionHash]:plus,[pro.transactionHash]:pro},now+11_000).tier,'plus');
});

test('server creates one stable account token, verifies signed JWS, and stores no raw JWS or client-selected tier',async()=>{
  const db=new FakeDb(),verifier=readyVerifier({verifyAndDecodeTransaction:async value=>{assert.equal(value,signedTransaction);return decoded();}}),service=AppStore.createService({db,...serviceOptions({verifierFactory:()=>verifier,retentionLifecycle:()=>({merged:true})})});
  const first=await service.configurationForUser(uid),second=await service.configurationForUser(uid);assert.equal(first.appAccountToken,accountToken);assert.equal(second.appAccountToken,accountToken);
  assert.equal(db.rows.get(`appStoreAccounts/${uid}`).transactionHistoryState,'empty');
  const result=await service.verifyForUser(uid,signedTransaction),entitlement=db.rows.get(`users/${uid}/entitlements/current`),mapping=db.rows.get(`appStoreTransactions/${AppStore.hashTransactionId('100000000000001')}`);
  assert.equal(result.verified,true);assert.equal(result.transactionHash,AppStore.hashTransactionId('100000000000001'));assert.equal(result.verificationHash,AppStore.hashVerifiedTransactionId('200000000000001'));assert.equal(result.transactionId,undefined);assert.equal(entitlement.appStoreAccess.tier,'pro');assert.equal(entitlement.accountRetention.merged,true);assert.equal(mapping.uid,uid);
  assert.equal(entitlement.accountResetStatus,'complete');assert.equal(entitlement.accountResetEpoch,0);assert.equal(entitlement.accountResetEpochString,'0');
  assert.equal(entitlement.accountRetention.controlStatus,'complete');assert.equal(entitlement.accountRetention.lastRetentionEpoch,0);assert.equal(entitlement.accountRetention.lastRetentionEpochString,'0');
  assert.equal(JSON.stringify([...db.rows.values()]).includes(signedTransaction),false,'signed JWS is verified but not retained in Firestore');
  assert.equal(JSON.stringify(entitlement).includes('200000000000001'),false,'user-readable entitlement omits raw transaction IDs');
  assert.equal(JSON.stringify(entitlement).includes('100000000000001'),false,'user-readable entitlement omits raw original transaction IDs');
  assert.equal(mapping.transactionId,'200000000000001');assert.equal(mapping.originalTransactionId,'100000000000001');
  assert.equal(db.rows.get(`appStoreAccounts/${uid}`).transactionHistoryState,'verified');
  assert.equal(JSON.stringify(entitlement).includes('clientTier'),false);
});

test('server-only deletion refresh keeps the App Store Storage projection fenced',async()=>{
  const db=new FakeDb(),service=AppStore.createService({db,...serviceOptions()});await service.configurationForUser(uid);await service.verifyForUser(uid,signedTransaction);
  db.rows.set(`accountResets/${uid}`,{status:'deleting',resetEpoch:0,correlationId:'delete-apple-preflight'});
  await service.refreshForUser(uid,{expectedResetEpoch:0,allowDeletingReset:true});
  const entitlement=db.rows.get(`users/${uid}/entitlements/current`);assert.equal(entitlement.accountResetStatus,'deleting');assert.equal(entitlement.accountResetEpochString,'0');
});

test('completed deletion rotates the App Store account token and old signed transactions stay rejected',async()=>{
  const resetEpoch=9,newToken='01890f47-7344-7cc1-9f87-1234567890ac',oldHash=AppStore.hashAccountToken(accountToken),db=new FakeDb({
    [`accountResets/${uid}`]:{status:'complete',resetEpoch},
    [`appStoreAccounts/${uid}`]:{schemaVersion:1,uid,appAccountToken:accountToken,appAccountTokenHash:oldHash,resetEpoch:0,accountDeleted:true,rebindAllowedAfterEpoch:true},
    [`appStoreAccountTokens/${oldHash}`]:{schemaVersion:1,uid,appAccountTokenHash:oldHash,resetEpoch:0,accountDeleted:true,rebindAllowedAfterEpoch:true}
  });
  let providerToken=accountToken;
  const verifier=readyVerifier({verifyAndDecodeTransaction:async()=>decoded({token:providerToken})}),service=AppStore.createService({db,...serviceOptions({randomUUID:()=>newToken,verifierFactory:()=>verifier})}),binding=await service.configurationForUser(uid);
  assert.equal(binding.appAccountToken,newToken);assert.equal(db.rows.get(`appStoreAccountTokens/${oldHash}`).accountDeleted,true);
  await assert.rejects(()=>service.verifyForUser(uid,signedTransaction),error=>error.reason==='ownership');
  providerToken=newToken;assert.equal((await service.verifyForUser(uid,signedTransaction)).verified,true);
});

test('post-deletion resubscribe recovers after process loss through its exact server reservation',async()=>{
  const resetEpoch=9,newToken='01890f47-7344-7cc1-9f87-1234567890ac',oldHash=AppStore.hashAccountToken(accountToken),transactionHash=AppStore.hashTransactionId('100000000000001'),transactionPath=`appStoreTransactions/${transactionHash}`,db=new FakeDb({
    [`accountResets/${uid}`]:{status:'complete',resetEpoch},
    [`appStoreAccounts/${uid}`]:{schemaVersion:1,uid,appAccountToken:accountToken,appAccountTokenHash:oldHash,resetEpoch:0,accountDeleted:true,rebindAllowedAfterEpoch:true},
    [`appStoreAccountTokens/${oldHash}`]:{schemaVersion:1,uid,appAccountTokenHash:oldHash,resetEpoch:0,accountDeleted:true,rebindAllowedAfterEpoch:true},
    [transactionPath]:{schemaVersion:1,uid,resetEpoch:0,appAccountTokenHash:oldHash,transactionId:'200000000000001',originalTransactionId:'100000000000001',accountDeleted:true,rebindAllowedAfterEpoch:true,deletionId:'delete-old-epoch',projection:{status:'expired'}}
  });
  let providerToken=newToken,providerPurchaseDate=now-1000;
  const notificationUUID='01890f47-7344-7cc1-9f87-1234567890fe',notification={notificationUUID,notificationType:'DID_RENEW',data:{bundleId:config.bundleId,appAppleId:config.appAppleId,environment:config.environment,status:1,signedTransactionInfo:signedTransaction}},verifier=readyVerifier({verifyAndDecodeTransaction:async()=>decoded({token:providerToken,purchaseDate:providerPurchaseDate}),verifyAndDecodeNotification:async()=>clone(notification)}),service=AppStore.createService({db,...serviceOptions({randomUUID:()=>newToken,verifierFactory:()=>verifier})});
  const binding=await service.configurationForUser(uid);assert.equal(binding.appAccountToken,newToken);assert.equal(db.rows.get(`appStoreAccounts/${uid}`).transactionHistoryState,'empty');
  await assert.rejects(()=>service.verifyForUser(uid,signedTransaction),error=>error.reason==='ownership');
  await assert.rejects(()=>service.handleNotification(signedNotification),error=>error.reason==='ownership');
  db.rows.set(`billingPurchaseReservations/${uid}`,{schemaVersion:1,uid,provider:'app_store',tier:'pro',cadence:'monthly',status:'provider_pending',resetEpoch,reservationId:'reservation-new-epoch',startedAt:now-2000});
  await assert.rejects(()=>service.verifyForUser(uid,signedTransaction,{reservationId:'wrong-reservation'}),error=>error.reason==='ownership');
  providerPurchaseDate=now-3000;await assert.rejects(()=>service.verifyForUser(uid,signedTransaction),error=>error.reason==='ownership');
  providerPurchaseDate=now-1000;const result=await service.verifyForUser(uid,signedTransaction);assert.equal(result.verified,true);
  const rebound=db.rows.get(transactionPath),archive=db.rows.get(`appStoreTransactionTombstones/${AppStore.transactionTombstoneId(uid,0,transactionHash)}`);
  assert.equal(rebound.resetEpoch,resetEpoch);assert.equal(rebound.appAccountTokenHash,AppStore.hashAccountToken(newToken));assert.equal(rebound.accountDeleted,undefined);assert.equal(db.rows.has(`billingPurchaseReservations/${uid}`),false);
  assert.equal(archive.resetEpoch,0);assert.equal(archive.accountDeleted,true);assert.equal(archive.mapping.accountDeleted,true);assert.equal(archive.mapping.appAccountTokenHash,oldHash);
  providerToken=accountToken;await assert.rejects(()=>service.verifyForUser(uid,signedTransaction),error=>error.reason==='ownership');
  const unsolicited=await service.handleNotification(signedNotification);assert.equal(unsolicited.verified,false);assert.equal(unsolicited.status,'account_deleted');assert.equal(db.rows.get(transactionPath).resetEpoch,resetEpoch);
});

test('post-deletion refresh uses only the current App Store token and epoch',async()=>{
  const resetEpoch=9,currentToken='01890f47-7344-7cc1-9f87-1234567890ac',oldHash=AppStore.hashAccountToken(accountToken),currentHash=AppStore.hashAccountToken(currentToken),oldOriginal='100000000000090',currentOriginal='100000000000091',apiCalls=[],db=new FakeDb({
    [`accountResets/${uid}`]:{status:'complete',resetEpoch},
    [`appStoreAccounts/${uid}`]:{schemaVersion:1,uid,appAccountToken:currentToken,appAccountTokenHash:currentHash,resetEpoch},
    [`appStoreAccountTokens/${oldHash}`]:{schemaVersion:1,uid,appAccountTokenHash:oldHash,resetEpoch:0,accountDeleted:true,rebindAllowedAfterEpoch:true},
    [`appStoreAccountTokens/${currentHash}`]:{schemaVersion:1,uid,appAccountTokenHash:currentHash,resetEpoch},
    [`appStoreTransactions/${AppStore.hashTransactionId(oldOriginal)}`]:{schemaVersion:1,uid,resetEpoch:0,appAccountTokenHash:oldHash,originalTransactionId:oldOriginal,accountDeleted:true,projection:{environment:config.environment}},
    [`appStoreTransactions/${AppStore.hashTransactionId(currentOriginal)}`]:{schemaVersion:1,uid,resetEpoch,appAccountTokenHash:currentHash,originalTransactionId:currentOriginal,projection:{environment:config.environment}}
  }),verifier=readyVerifier({verifyAndDecodeTransaction:async()=>decoded({token:currentToken,originalTransactionId:currentOriginal,transactionId:'200000000000091'})}),apiClient=readyApi();apiClient.getAllSubscriptionStatuses=async original=>{apiCalls.push(original);return{data:[{lastTransactions:[{status:1,signedTransactionInfo:signedTransaction}]}]};};
  const service=AppStore.createService({db,...serviceOptions({verifierFactory:()=>verifier,apiClientFactory:()=>apiClient})}),result=await service.refreshForUser(uid,{expectedResetEpoch:resetEpoch});
  assert.equal(result.subscriptions,1);assert.deepEqual(apiCalls,[currentOriginal]);assert.equal(db.rows.get(`appStoreTransactions/${AppStore.hashTransactionId(oldOriginal)}`).accountDeleted,true);
});

test('deletion refresh paginates every current App Store mapping and finds an active subscription after the first 24',async()=>{
  const currentHash=AppStore.hashAccountToken(accountToken),seed={
    [`appStoreAccounts/${uid}`]:{schemaVersion:1,uid,appAccountToken:accountToken,appAccountTokenHash:currentHash,resetEpoch:0},
    [`appStoreAccountTokens/${currentHash}`]:{schemaVersion:1,uid,appAccountTokenHash:currentHash,resetEpoch:0}
  },originals=[];
  for(let index=0;index<125;index++){
    const original=`1${String(index).padStart(14,'0')}`;originals.push(original);
    seed[`appStoreTransactions/${AppStore.hashTransactionId(original)}`]={schemaVersion:1,uid,resetEpoch:0,appAccountTokenHash:currentHash,originalTransactionId:original,projection:{environment:config.environment}};
  }
  let calls=0,providerOriginal='';
  const verifier=readyVerifier({verifyAndDecodeTransaction:async()=>decoded({originalTransactionId:providerOriginal,transactionId:`2${providerOriginal.slice(1)}`,expiresAt:providerOriginal===originals[124]?now+86400000:now-1})}),apiClient=readyApi();
  apiClient.getAllSubscriptionStatuses=async original=>{calls++;providerOriginal=original;return{data:[{lastTransactions:[{status:1,signedTransactionInfo:signedTransaction}]}]};};
  const db=new FakeDb(seed),service=AppStore.createService({db,...serviceOptions({verifierFactory:()=>verifier,apiClientFactory:()=>apiClient})}),result=await service.refreshForUser(uid,{expectedResetEpoch:0,allowDeletingReset:true});
  assert.equal(calls,125);assert.equal(result.subscriptions,125);assert.equal(result.access.active,true);assert.equal(result.access.expiresAt,now+86400000);
});

test('valid post-charge verification grants access and records overlap while account-reset races still fail closed',async()=>{
  const seed={[`users/${uid}/entitlements/current`]:{googlePlayAccess:{active:true,tier:'plus',expiresAt:now+10000}}},db=new FakeDb(seed),verifier=readyVerifier(),service=AppStore.createService({db,...serviceOptions({verifierFactory:()=>verifier,purchaseGuard:data=>data.googlePlayAccess&&data.googlePlayAccess.active?'google_play_active':null})});
  await service.configurationForUser(uid);
  await service.verifyForUser(uid,signedTransaction);
  assert.equal(db.rows.get(`users/${uid}/entitlements/current`).appStoreAccess.active,true);
  assert.equal(db.rows.get(`users/${uid}/entitlements/current`).billingConflict.reason,'provider_overlap');

  const raced=new FakeDb(),racedService=AppStore.createService({db:raced,...serviceOptions({verifierFactory:()=>verifier})});
  await racedService.configurationForUser(uid);raced.beforeTransaction=async store=>store.rows.set(`accountResets/${uid}`,{status:'deleting',resetEpoch:1});
  await assert.rejects(()=>racedService.verifyForUser(uid,signedTransaction),error=>error.reason==='account-reset');
  assert.equal(raced.rows.has(`users/${uid}/entitlements/current`),false);
});

test('verified Notification V2 is idempotent, validates app identity, and applies renewal/grace information',async()=>{
  const notificationUUID='01890f47-7344-7cc1-9f87-1234567890ff',notification={notificationUUID,notificationType:'DID_FAIL_TO_RENEW',subtype:'GRACE_PERIOD',data:{bundleId:config.bundleId,appAppleId:config.appAppleId,environment:config.environment,status:4,signedTransactionInfo:signedTransaction,signedRenewalInfo:signedTransaction}},calls={notification:0,transaction:0,renewal:0};
  const verifier={
    async verifyAndDecodeNotification(value){calls.notification++;assert.equal(value,signedNotification);return clone(notification);},
    async verifyAndDecodeTransaction(){calls.transaction++;return decoded({expiresAt:now-1000});},
    async verifyAndDecodeRenewalInfo(){calls.renewal++;return{originalTransactionId:'100000000000001',environment:config.environment,appAccountToken:accountToken,autoRenewStatus:1,isInBillingRetryPeriod:true,gracePeriodExpiresDate:now+50000};}
  };
  const db=new FakeDb(),service=AppStore.createService({db,...serviceOptions({verifierFactory:()=>verifier})});await service.configurationForUser(uid);
  const first=await service.handleNotification({signedPayload:signedNotification}),second=await service.handleNotification(signedNotification);
  assert.equal(first.active,true);assert.equal(first.tier,'pro');assert.equal(second.duplicate,true);assert.equal(db.rows.get(`users/${uid}/entitlements/current`).appStoreAccess.expiresAt,now+50000);assert.equal(db.rows.get(`appStoreNotifications/${notificationUUID}`).status,'complete');

  notification.data.appAppleId=config.appAppleId+1;
  await assert.rejects(()=>service.handleNotification(signedNotification),error=>error.reason==='app-identity');
});

test('Notification V2 refuses an unlinked appAccountToken instead of assigning it by product or transaction ID',async()=>{
  const notificationUUID='01890f47-7344-7cc1-9f87-1234567890ee',verifier={verifyAndDecodeNotification:async()=>({notificationUUID,notificationType:'SUBSCRIBED',data:{bundleId:config.bundleId,appAppleId:config.appAppleId,environment:config.environment,status:1,signedTransactionInfo:signedTransaction}}),verifyAndDecodeTransaction:async()=>decoded()};
  const db=new FakeDb(),service=AppStore.createService({db,...serviceOptions({verifierFactory:()=>readyVerifier(verifier)})});
  await assert.rejects(()=>service.handleNotification(signedNotification),error=>error.reason==='unlinked');
  assert.equal(db.rows.has(`users/${uid}/entitlements/current`),false);
});

test('App Store notifications fence an in-progress deletion and quarantine a completed deletion tombstone',async()=>{
  const notificationUUID='01890f47-7344-7cc1-9f87-1234567890ed',notification={notificationUUID,notificationType:'DID_RENEW',data:{bundleId:config.bundleId,appAppleId:config.appAppleId,environment:config.environment,status:1,signedTransactionInfo:signedTransaction}},verifier=readyVerifier({verifyAndDecodeNotification:async()=>notification,verifyAndDecodeTransaction:async()=>decoded()});
  const db=new FakeDb(),service=AppStore.createService({db,...serviceOptions({verifierFactory:()=>verifier})});await service.configurationForUser(uid);
  db.rows.set(`accountResets/${uid}`,{status:'deleting',resetEpoch:0,correlationId:'delete-apple'});
  await assert.rejects(()=>service.handleNotification(signedNotification),error=>error.reason==='account-reset');
  let signal=db.rows.get(`billingDeletionSignals/${uid}`),reset=db.rows.get(`accountResets/${uid}`);assert.equal(signal.provider,'app_store');assert.equal(signal.deletionId,'delete-apple');assert.equal(signal.accountDeleted,false);assert.equal(reset.billingEventProvider,'app_store');assert.equal(reset.billingEventWatermark,now);assert.equal(db.rows.has(`users/${uid}/entitlements/current`),false);
  const tokenHash=AppStore.hashAccountToken(accountToken),mapping=db.rows.get(`appStoreAccountTokens/${tokenHash}`);db.rows.set(`appStoreAccountTokens/${tokenHash}`,{...mapping,accountDeleted:true,deletionId:'delete-apple',resetEpoch:0});db.rows.set(`accountResets/${uid}`,{status:'complete',resetEpoch:1,correlationId:'delete-apple'});
  const result=await service.handleNotification(signedNotification);assert.equal(result.status,'account_deleted');signal=db.rows.get(`billingDeletionSignals/${uid}`);assert.equal(signal.accountDeleted,true);assert.equal(db.rows.has(`users/${uid}/entitlements/current`),false);
});

test('purchase reservation is exact and only the matching verified transaction clears it',async()=>{
  const reservationId='01890f47-7344-7cc1-9f87-1234567890dd',db=new FakeDb(),service=AppStore.createService({db,...serviceOptions()});
  await service.configurationForUser(uid);
  db.rows.set(`billingPurchaseReservations/${uid}`,{status:'provider_pending',provider:'app_store',tier:'pro',cadence:'monthly',reservationId,resetEpoch:0,startedAt:now-2000});
  await service.verifyForUser(uid,signedTransaction,{reservationId:'01890f47-7344-7cc1-9f87-1234567890cc'});
  assert.equal(db.rows.has(`billingPurchaseReservations/${uid}`),true);
  assert.equal(db.rows.get(`users/${uid}/entitlements/current`).billingConflict.reason,'reservation_missing_or_mismatch');
  await service.verifyForUser(uid,signedTransaction,{reservationId});
  assert.equal(db.rows.has(`billingPurchaseReservations/${uid}`),false);
});

test('monotonic transaction merge ignores an older-period refund and permits a later resubscription',()=>{
  const newer=AppStore.publicProjection(AppStore.transactionProjection({decoded:decoded({purchaseDate:now,transactionId:'200000000000030',originalTransactionId:'100000000000030',expiresAt:now+100000,signedDate:now}),config,expectedAccountToken:accountToken,now}));
  const olderRefund=AppStore.publicProjection(AppStore.transactionProjection({decoded:decoded({purchaseDate:now-50000,transactionId:'200000000000029',originalTransactionId:'100000000000030',expiresAt:now-1000,revocationDate:now-500,signedDate:now+1000}),config,expectedAccountToken:accountToken,now}));
  assert.equal(AppStore.mergeSubscriptionProjection(newer,olderRefund).status,'active');
  const currentRefund=AppStore.publicProjection(AppStore.transactionProjection({decoded:decoded({purchaseDate:now,transactionId:'200000000000030',originalTransactionId:'100000000000030',expiresAt:now+100000,revocationDate:now+2000,signedDate:now+2000}),config,expectedAccountToken:accountToken,now}));
  assert.equal(AppStore.mergeSubscriptionProjection(newer,currentRefund).status,'revoked');
  assert.equal(currentRefund.paidAccessEndedAt,now+2000);
  const resubscribed=AppStore.publicProjection(AppStore.transactionProjection({decoded:decoded({purchaseDate:now+5000,transactionId:'200000000000031',originalTransactionId:'100000000000030',expiresAt:now+200000,signedDate:now+5000}),config,expectedAccountToken:accountToken,now}));
  assert.equal(AppStore.mergeSubscriptionProjection(currentRefund,resubscribed).status,'active');
});

test('scheduled provider refresh rechecks due active mappings and advances their due time',async()=>{
  let providerDecoded=decoded(),apiCalls=0;
  const db=new FakeDb(),service=AppStore.createService({db,...serviceOptions({verifierFactory:()=>readyVerifier({verifyAndDecodeTransaction:async()=>providerDecoded}),apiClientFactory:()=>readyApi({data:[{lastTransactions:[{status:1,signedTransactionInfo:signedTransaction}]}]})})});
  await service.configurationForUser(uid);await service.verifyForUser(uid,signedTransaction);
  const path=`appStoreTransactions/${AppStore.hashTransactionId('100000000000001')}`,stored=db.rows.get(path);stored.providerRefreshDueAt=now-1;db.rows.set(path,stored);
  providerDecoded=decoded({expiresAt:now-1,signedDate:now+1000});
  const result=await service.refreshTrackedSubscriptions();
  assert.equal(result.refreshed,1);assert.equal(db.rows.get(`users/${uid}/entitlements/current`).appStoreAccess.active,false);
});
