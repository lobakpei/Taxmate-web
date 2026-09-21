'use strict';

const crypto=require('node:crypto');
const {GoogleAuth}=require('google-auth-library');
const AccountWriteFence=require('./account-write-fence');

const PACKAGE_NAME='uk.taxmate.app';
const ANDROID_PUBLISHER_SCOPE='https://www.googleapis.com/auth/androidpublisher';
const PRODUCT_ID=/^[a-z0-9][a-z0-9._-]{0,127}$/;
const ACCOUNT_HASH=/^[a-f0-9]{64}$/;
const TIER_WEIGHT=Object.freeze({free:0,plus:1,pro:2});
const ACCESS_STATES=new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED'
]);
const ACKNOWLEDGED='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
const MAX_STORED_SUBSCRIPTIONS=24;
const ORPHAN_RETENTION_MS=30*24*60*60*1000;
const ACK_LEASE_MS=5*60*1000;
const ACK_RETRY_BASE_MS=5*60*1000;
const ACK_RETRY_MAX_MS=24*60*60*1000;
const TOKEN_TERMINAL_RETENTION_MS=90*24*60*60*1000;
const PROVIDER_REFRESH_INTERVAL_MS=15*60*1000;
const PROVIDER_REFRESH_RETRY_MS=5*60*1000;
const PROVIDER_REFRESH_STATES=new Set(['active','canceled','in_grace_period','pending','on_hold','paused']);

class GooglePlayBillingError extends Error{
  constructor(reason,message=reason){super(message);this.name='GooglePlayBillingError';this.reason=reason;}
}

function fail(reason,message){throw new GooglePlayBillingError(reason,message);}
function text(value){return typeof value==='string'?value:'';}
function validId(value){return PRODUCT_ID.test(text(value));}
function configuration(input={}){
  if(text(input.GOOGLE_PLAY_PROVIDER_READY)!=='true')fail('configuration','Google Play provider readiness has not been confirmed');
  const values={
    plusSubscriptionId:text(input.GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID),
    plusMonthlyBasePlanId:text(input.GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN_ID),
    plusYearlyBasePlanId:text(input.GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN_ID),
    proSubscriptionId:text(input.GOOGLE_PLAY_PRO_SUBSCRIPTION_ID),
    proMonthlyBasePlanId:text(input.GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN_ID),
    proYearlyBasePlanId:text(input.GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN_ID)
  };
  if(Object.values(values).some(value=>!validId(value)))fail('configuration','Google Play billing configuration is unavailable');
  if(values.plusSubscriptionId===values.proSubscriptionId||values.plusMonthlyBasePlanId===values.plusYearlyBasePlanId||values.proMonthlyBasePlanId===values.proYearlyBasePlanId)fail('configuration','Google Play billing configuration is ambiguous');
  const products=[
    {tier:'plus',cadence:'monthly',productId:values.plusSubscriptionId,basePlanId:values.plusMonthlyBasePlanId},
    {tier:'plus',cadence:'yearly',productId:values.plusSubscriptionId,basePlanId:values.plusYearlyBasePlanId},
    {tier:'pro',cadence:'monthly',productId:values.proSubscriptionId,basePlanId:values.proMonthlyBasePlanId},
    {tier:'pro',cadence:'yearly',productId:values.proSubscriptionId,basePlanId:values.proYearlyBasePlanId}
  ];
  const keys=new Set(products.map(row=>`${row.productId}\n${row.basePlanId}`));
  if(keys.size!==products.length)fail('configuration','Google Play billing configuration is ambiguous');
  return Object.freeze({packageName:PACKAGE_NAME,products:Object.freeze(products.map(Object.freeze))});
}

function purchaseToken(value){
  if(typeof value!=='string'||value.length<16||value.length>4096||value!==value.trim()||/[\s\u0000-\u001f\u007f]/.test(value))fail('invalid-token','Invalid Google Play purchase token');
  return value;
}
function hashToken(value){return crypto.createHash('sha256').update(purchaseToken(value),'utf8').digest('hex');}
function hashAccount(uid,resetEpoch=0){
  if(typeof uid!=='string'||!uid||uid.length>128||/[\u0000-\u001f\u007f]/.test(uid))fail('invalid-account','Invalid account identity');
  const epoch=Number(resetEpoch);if(!Number.isSafeInteger(epoch)||epoch<0)fail('account-reset','Invalid account reset epoch');
  return crypto.createHash('sha256').update(epoch===0?`taxmate-play-v1:${uid}`:`taxmate-play-v1:${uid}:reset:${epoch}`,'utf8').digest('hex');
}
function millis(value){const parsed=Date.parse(text(value));return Number.isFinite(parsed)?parsed:null;}
function normalizedState(value){return text(value).replace(/^SUBSCRIPTION_STATE_/,'').toLowerCase()||'unspecified';}
function matchedLineItems(subscription,config){
  const matches=[];
  for(const item of Array.isArray(subscription&&subscription.lineItems)?subscription.lineItems:[]){
    const productId=text(item&&item.productId),basePlanId=text(item&&item.offerDetails&&item.offerDetails.basePlanId);
    const descriptor=config.products.find(row=>row.productId===productId&&row.basePlanId===basePlanId);
    if(!descriptor)continue;
    const expiresAt=millis(item.expiryTime);
    if(!expiresAt)continue;
    matches.push({...descriptor,expiresAt,autoRenewEnabled:item.autoRenewingPlan&&item.autoRenewingPlan.autoRenewEnabled===true});
  }
  return matches;
}
function verifyProviderPurchase({uid,token,subscription,config,now=Date.now(),expectedAccountHash=hashAccount(uid)}){
  const checkedToken=purchaseToken(token),checkedConfig=config&&config.products?config:configuration(config),stamp=Number(now);
  if(!Number.isFinite(stamp)||stamp<=0)fail('verification-time','Invalid verification time');
  if(!subscription||typeof subscription!=='object')fail('provider-response','Invalid Google Play response');
  if(!ACCOUNT_HASH.test(text(expectedAccountHash)))fail('ownership','Google Play account binding is invalid');
  const directHash=text(subscription.externalAccountIdentifiers&&subscription.externalAccountIdentifiers.obfuscatedExternalAccountId).toLowerCase(),expiredHash=text(subscription.outOfAppPurchaseContext&&subscription.outOfAppPurchaseContext.expiredExternalAccountIdentifiers&&subscription.outOfAppPurchaseContext.expiredExternalAccountIdentifiers.obfuscatedExternalAccountId).toLowerCase();
  if(directHash&&expiredHash&&directHash!==expiredHash)fail('ownership','Google Play account bindings do not match');
  const providerAccountHash=directHash||expiredHash;
  if(!ACCOUNT_HASH.test(providerAccountHash)||providerAccountHash!==expectedAccountHash)fail('ownership','Google Play purchase does not belong to this account');
  const matches=matchedLineItems(subscription,checkedConfig);
  if(!matches.length)fail('product','Google Play purchase is not a configured TaxMate plan');
  const providerState=text(subscription.subscriptionState),stateAllowsAccess=ACCESS_STATES.has(providerState);
  const active=matches.filter(item=>stateAllowsAccess&&item.expiresAt>stamp).sort((a,b)=>TIER_WEIGHT[b.tier]-TIER_WEIGHT[a.tier]||b.expiresAt-a.expiresAt);
  const selected=(active.length?active:matches.slice().sort((a,b)=>b.expiresAt-a.expiresAt||TIER_WEIGHT[b.tier]-TIER_WEIGHT[a.tier]))[0];
  const accessActive=active.length>0&&selected===active[0];
  return Object.freeze({
    schemaVersion:1,
    source:'google_play',
    tokenHash:hashToken(checkedToken),
    tier:accessActive?selected.tier:'free',
    purchasedTier:selected.tier,
    cadence:selected.cadence,
    status:normalizedState(providerState),
    providerState,
    accessActive,
    expiresAt:selected.expiresAt,
    autoRenewEnabled:selected.autoRenewEnabled,
    productId:selected.productId,
    basePlanId:selected.basePlanId,
    acknowledged:text(subscription.acknowledgementState)===ACKNOWLEDGED,
    purchaseStartedAt:millis(subscription.startTime),
    verifiedAt:stamp,
    testPurchase:subscription.testPurchase!=null
  });
}

function publicProjection(value={}){
  return{
    schemaVersion:1,source:'google_play',tokenHash:text(value.tokenHash),tier:value.tier==='pro'?'pro':value.tier==='plus'?'plus':'free',purchasedTier:value.purchasedTier==='pro'?'pro':value.purchasedTier==='plus'?'plus':'free',cadence:value.cadence==='yearly'?'yearly':'monthly',status:text(value.status),providerState:text(value.providerState),accessActive:value.accessActive===true,expiresAt:Number(value.expiresAt)||0,autoRenewEnabled:value.autoRenewEnabled===true,productId:text(value.productId),basePlanId:text(value.basePlanId),acknowledged:value.acknowledged===true,purchaseStartedAt:Number(value.purchaseStartedAt)||null,verifiedAt:Number(value.verifiedAt)||0,testPurchase:value.testPurchase===true
  };
}
function activeProjection(value,now){return value&&value.accessActive===true&&TIER_WEIGHT[value.tier]>0&&Number(value.expiresAt)>Number(now);}
function trimSubscriptions(input,now){
  const rows=Object.entries(input&&typeof input==='object'?input:{}).filter(([key,value])=>ACCOUNT_HASH.test(key)&&value&&typeof value==='object').map(([key,value])=>[key,publicProjection({...value,tokenHash:key})]);
  rows.sort((a,b)=>Number(activeProjection(b[1],now))-Number(activeProjection(a[1],now))||Number(b[1].verifiedAt)-Number(a[1].verifiedAt));
  return Object.fromEntries(rows.slice(0,MAX_STORED_SUBSCRIPTIONS));
}
function accessProjection(subscriptions,now=Date.now()){
  const rows=Object.values(subscriptions&&typeof subscriptions==='object'?subscriptions:{}).filter(value=>activeProjection(value,now)).sort((a,b)=>TIER_WEIGHT[b.tier]-TIER_WEIGHT[a.tier]||Number(b.expiresAt)-Number(a.expiresAt));
  if(rows.length){const winner=publicProjection(rows[0]);return{schemaVersion:1,source:'google_play',active:true,tier:winner.tier,purchasedTier:winner.purchasedTier,expiresAt:winner.expiresAt,cadence:winner.cadence,status:winner.status,productId:winner.productId,basePlanId:winner.basePlanId,tokenHash:winner.tokenHash,autoRenewEnabled:winner.autoRenewEnabled,acknowledged:winner.acknowledged,verifiedAt:winner.verifiedAt};}
  const latest=Object.values(subscriptions&&typeof subscriptions==='object'?subscriptions:{}).filter(Boolean).sort((a,b)=>Number(b.verifiedAt)-Number(a.verifiedAt))[0];
  return{schemaVersion:1,source:'google_play',active:false,tier:'free',purchasedTier:latest&&latest.purchasedTier||'free',expiresAt:Number(latest&&latest.expiresAt)||null,cadence:latest&&latest.cadence||null,status:latest&&latest.status||'missing',productId:latest&&latest.productId||null,basePlanId:latest&&latest.basePlanId||null,tokenHash:latest&&latest.tokenHash||null,autoRenewEnabled:false,acknowledged:latest&&latest.acknowledged===true,verifiedAt:Number(latest&&latest.verifiedAt)||Number(now)};
}

function defaultProvider(){
  const auth=new GoogleAuth({scopes:[ANDROID_PUBLISHER_SCOPE]});
  let clientPromise;
  const client=()=>clientPromise||(clientPromise=auth.getClient());
  return{
    async getSubscription({packageName,token}){
      const credential=await client(),url=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken(token))}`;
      const response=await credential.request({url,method:'GET'});return response&&response.data;
    },
    async acknowledge({packageName,productId,token}){
      if(!validId(productId))fail('product','Invalid Google Play product');
      const credential=await client(),url=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken(token))}:acknowledge`;
      await credential.request({url,method:'POST',data:{}});
    }
  };
}
function timestamp(FieldValue,stamp){return FieldValue&&typeof FieldValue.serverTimestamp==='function'?FieldValue.serverTimestamp():stamp;}
function configured(input){return typeof input==='function'?configuration(input()):input&&input.products?input:configuration(input);}
function resetFence(snapshot,expectedEpoch=null,options={}){
  const data=snapshot&&snapshot.exists?snapshot.data()||{}:{},status=text(data.status),epoch=data.resetEpoch==null?0:Number(data.resetEpoch);
  if(!Number.isSafeInteger(epoch)||epoch<0||status&&!['complete','deleting','failed'].includes(status))fail('account-reset','Account reset state is invalid');
  if(status==='deleting'&&options.allowDeleting!==true||status==='failed'&&options.allowFailed!==true)fail('account-reset','Account reset is in progress');
  if(expectedEpoch!=null&&Number(expectedEpoch)!==epoch)fail('account-reset','Google Play mapping belongs to an earlier account reset');
  return epoch;
}
function terminalDeleteAfter(projection,stamp){
  if(projection&&projection.accessActive===true)return null;
  const status=text(projection&&projection.status);
  if(['pending','on_hold','paused','in_grace_period'].includes(status))return null;
  return Math.max(Number(projection&&projection.expiresAt)||0,Number(stamp)||0)+TOKEN_TERMINAL_RETENTION_MS;
}
function acknowledgementState(previous,projection,stamp){
  if(projection.acknowledged===true)return{status:'complete',attempts:Number(previous&&previous.attempts)||0,leaseUntil:null,retryAfterAt:null,dueAt:null,updatedAt:stamp};
  if(projection.accessActive!==true)return{status:'not_required',attempts:Number(previous&&previous.attempts)||0,leaseUntil:null,retryAfterAt:null,dueAt:null,updatedAt:stamp};
  const prior=previous&&typeof previous==='object'?previous:{},leaseUntil=Number(prior.leaseUntil)||0;
  if(prior.status==='processing'&&leaseUntil>stamp)return{...prior,dueAt:leaseUntil,claim:false};
  const dueAt=stamp+ACK_LEASE_MS;
  return{status:'processing',attempts:(Number(prior.attempts)||0)+1,leaseUntil:dueAt,retryAfterAt:null,dueAt,updatedAt:stamp,claim:true};
}
function acknowledgementRetryDelay(attempts){
  const count=Number(attempts),exponent=Number.isSafeInteger(count)&&count>0?Math.min(16,count-1):0;
  return Math.min(ACK_RETRY_MAX_MS,ACK_RETRY_BASE_MS*Math.pow(2,exponent));
}
function providerRefreshDueAt(projection,stamp){return PROVIDER_REFRESH_STATES.has(text(projection&&projection.status))?stamp+PROVIDER_REFRESH_INTERVAL_MS:null;}
function reservationMatches(reservation,projection,resetEpoch,reservationId=''){
  if(!reservation||reservation.status!=='provider_pending'||reservation.provider!=='google_play'||Number(reservation.resetEpoch||0)!==resetEpoch)return false;
  if(reservation.tier!==projection.purchasedTier||reservation.cadence!==projection.cadence)return false;
  if(reservationId)return reservation.reservationId===reservationId;
  return Number(projection.purchaseStartedAt)>0&&Number(projection.purchaseStartedAt)>=Number(reservation.startedAt||0);
}

function createService({db,configuration:inputConfiguration,provider=defaultProvider(),retentionLifecycle=(previous,next)=>next.accountRetention||previous.accountRetention||{},purchaseGuard=()=>null,FieldValue,now=()=>Date.now()}){
  if(!db||typeof db.doc!=='function'||typeof db.runTransaction!=='function')throw new TypeError('Firestore required');
  async function registerAccount(uid){
    const config=configured(inputConfiguration),resetRef=db.doc(`accountResets/${uid}`),initialReset=await resetRef.get();let resetEpoch=resetFence(initialReset),accountHash=hashAccount(uid,resetEpoch),accountRef=db.doc(`googlePlayAccounts/${accountHash}`);
    await db.runTransaction(async tx=>{
      const [accountSnap,resetSnap]=await Promise.all([tx.get(accountRef),tx.get(resetRef)]);resetFence(resetSnap,resetEpoch);
      const account=accountSnap.exists?accountSnap.data()||{}:{};
      if(accountSnap.exists&&(account.accountDeleted===true||account.uid!==uid||Number(account.resetEpoch||0)!==resetEpoch))fail(account.accountDeleted===true||Number(account.resetEpoch||0)!==resetEpoch?'account-reset':'ownership','Google Play account binding is unavailable');
      tx.set(accountRef,{schemaVersion:1,uid,accountHash,resetEpoch,createdAt:account.createdAt||timestamp(FieldValue,Number(now())),updatedAt:timestamp(FieldValue,Number(now()))},{merge:true});
    });
    return{schemaVersion:1,packageName:config.packageName,accountHash,resetEpoch};
  }
  async function verifyForUser(uid,rawToken,options={}){
    const config=configured(inputConfiguration),token=purchaseToken(rawToken),stamp=Number(now()),tokenHash=hashToken(token);
    const fenceOptions={allowFailed:options.allowFailedReset===true,allowDeleting:options.allowDeletingReset===true},resetRef=db.doc(`accountResets/${uid}`),resetBefore=await resetRef.get(),resetEpoch=resetFence(resetBefore,options.expectedResetEpoch,fenceOptions);
    const accountHash=hashAccount(uid,resetEpoch);
    let response;
    try{response=await provider.getSubscription({packageName:config.packageName,token});}catch(error){fail('provider','Google Play verification is unavailable');}
    const projection=verifyProviderPurchase({uid,token,subscription:response,config,now:stamp,expectedAccountHash:accountHash}),entitlementRef=db.doc(`users/${uid}/entitlements/current`),retentionRef=db.doc(`users/${uid}/retention/current`),tokenRef=db.doc(`googlePlayPurchaseTokens/${tokenHash}`),accountRef=db.doc(`googlePlayAccounts/${accountHash}`),orphanRef=db.doc(`googlePlayOrphans/${tokenHash}`),purchaseReservationRef=db.doc(`billingPurchaseReservations/${uid}`);
    let aggregate,shouldAcknowledge=false;
    await db.runTransaction(async tx=>{
      const [entitlementSnap,retentionSnap,tokenSnap,accountSnap,resetSnap,reservationSnap]=await Promise.all([tx.get(entitlementRef),tx.get(retentionRef),tx.get(tokenRef),tx.get(accountRef),tx.get(resetRef),tx.get(purchaseReservationRef)]);
      resetFence(resetSnap,resetEpoch,fenceOptions);
      const tokenData=tokenSnap.exists?tokenSnap.data()||{}:{},accountData=accountSnap.exists?accountSnap.data()||{}:{};
      if(tokenData.accountDeleted===true||accountData.accountDeleted===true)fail('account-reset','Google Play billing identity belongs to a deleted account');
      if(tokenSnap.exists&&tokenData.uid!==uid)fail('ownership','Google Play purchase is already linked to another account');
      if(accountSnap.exists&&accountData.uid!==uid)fail('ownership','Google Play account is already linked to another TaxMate account');
      if(tokenSnap.exists&&Number(tokenData.resetEpoch||0)!==resetEpoch)fail('account-reset','Google Play purchase belongs to an earlier account reset');
      if(accountSnap.exists&&Number(accountData.resetEpoch||0)!==resetEpoch)fail('account-reset','Google Play account belongs to an earlier account reset');
      const previous=entitlementSnap.exists?entitlementSnap.data()||{}:{},subscriptions=trimSubscriptions({...previous.googlePlaySubscriptions,[tokenHash]:publicProjection(projection)},stamp);
      aggregate=accessProjection(subscriptions,stamp);
      const next={googlePlaySubscriptions:subscriptions,googlePlayAccess:aggregate};
      const acknowledgement=acknowledgementState(tokenData.acknowledgement,projection,stamp);shouldAcknowledge=acknowledgement.claim===true;delete acknowledgement.claim;
       const overlap=purchaseGuard(previous,'google_play',stamp),reservation=reservationSnap.exists?reservationSnap.data()||{}:null,reservationMatched=reservationMatches(reservation,projection,resetEpoch,text(options.reservationId)),reservationConflict=projection.accessActive&&!tokenSnap.exists&&!reservationMatched,storageProjection=AccountWriteFence.storageProjection(resetSnap,retentionLifecycle(previous,next,stamp),retentionSnap);
       tx.set(entitlementRef,{...next,...storageProjection,billingConflict:overlap||reservationConflict?{provider:'google_play',reason:overlap?'provider_overlap':'reservation_missing_or_mismatch',detectedAt:stamp}:previous.billingConflict||null,serverVerifiedAt:stamp,updatedAt:timestamp(FieldValue,stamp)},{merge:true});
      tx.set(tokenRef,{schemaVersion:1,uid,accountHash,resetEpoch,packageName:config.packageName,purchaseToken:token,projection:publicProjection(projection),acknowledgement,providerRefreshDueAt:providerRefreshDueAt(projection,stamp),deleteAfterAt:terminalDeleteAfter(projection,stamp),createdAt:tokenData.createdAt||timestamp(FieldValue,stamp),updatedAt:timestamp(FieldValue,stamp)},{merge:true});
      tx.set(accountRef,{schemaVersion:1,uid,accountHash,resetEpoch,updatedAt:timestamp(FieldValue,stamp)},{merge:true});
      tx.delete(orphanRef);
       if(reservationMatched)tx.delete(purchaseReservationRef);
    });
    if(shouldAcknowledge){
      try{await provider.acknowledge({packageName:config.packageName,productId:projection.productId,token});}catch(error){
        await db.runTransaction(async tx=>{
          const [tokenSnap,resetSnap]=await Promise.all([tx.get(tokenRef),tx.get(resetRef)]);resetFence(resetSnap,resetEpoch,fenceOptions);
          if(!tokenSnap.exists||tokenSnap.data().uid!==uid||Number(tokenSnap.data().resetEpoch||0)!==resetEpoch)return;
          const mapping=tokenSnap.data()||{},attempts=Number(mapping.acknowledgement&&mapping.acknowledgement.attempts)||1,delay=acknowledgementRetryDelay(attempts);
          tx.set(tokenRef,{acknowledgement:{status:'pending',attempts,leaseUntil:null,retryAfterAt:stamp+delay,dueAt:stamp+delay,updatedAt:timestamp(FieldValue,stamp)},updatedAt:timestamp(FieldValue,stamp)},{merge:true});
        });
        fail('acknowledgement','Google Play purchase confirmation needs retrying');
      }
      await db.runTransaction(async tx=>{
        const [entitlementSnap,retentionSnap,tokenSnap,resetSnap]=await Promise.all([tx.get(entitlementRef),tx.get(retentionRef),tx.get(tokenRef),tx.get(resetRef)]);
        resetFence(resetSnap,resetEpoch,fenceOptions);
        if(!tokenSnap.exists||tokenSnap.data().uid!==uid||Number(tokenSnap.data().resetEpoch||0)!==resetEpoch)return;
        const previous=entitlementSnap.exists?entitlementSnap.data()||{}:{},current=previous.googlePlaySubscriptions&&previous.googlePlaySubscriptions[tokenHash];
        if(!current)return;
        const subscriptions=trimSubscriptions({...previous.googlePlaySubscriptions,[tokenHash]:publicProjection({...current,acknowledged:true,verifiedAt:stamp})},stamp),nextAggregate=accessProjection(subscriptions,stamp),next={googlePlaySubscriptions:subscriptions,googlePlayAccess:nextAggregate};
        const storageProjection=AccountWriteFence.storageProjection(resetSnap,retentionLifecycle(previous,next,stamp),retentionSnap);
        tx.set(entitlementRef,{...next,...storageProjection,serverVerifiedAt:stamp,updatedAt:timestamp(FieldValue,stamp)},{merge:true});
        tx.set(tokenRef,{projection:publicProjection({...tokenSnap.data().projection,acknowledged:true,verifiedAt:stamp}),acknowledgement:{status:'complete',attempts:Number(tokenSnap.data().acknowledgement&&tokenSnap.data().acknowledgement.attempts)||1,leaseUntil:null,retryAfterAt:null,dueAt:null,updatedAt:timestamp(FieldValue,stamp)},updatedAt:timestamp(FieldValue,stamp)},{merge:true});
        aggregate=nextAggregate;
      });
    }
    return{verified:true,tier:aggregate.tier,active:aggregate.active,expiresAt:aggregate.expiresAt,cadence:aggregate.cadence,status:aggregate.status,acknowledged:aggregate.acknowledged};
  }

  async function handleNotification(payload){
    const notice=parseNotification(payload),config=configured(inputConfiguration);
    if(notice.packageName!==config.packageName)fail('package','Google Play notification package mismatch');
    if(notice.testNotification)return{verified:false,status:'test_notification'};
    const tokenHash=hashToken(notice.purchaseToken),tokenRef=db.doc(`googlePlayPurchaseTokens/${tokenHash}`),mapped=await tokenRef.get();
    if(mapped.exists){
      const mapping=mapped.data()||{},uid=text(mapping.uid);if(!uid)fail('ownership','Google Play token mapping is invalid');
      if(mapping.accountDeleted===true){await recordDeletionSignal(uid,notice,tokenHash,Number(mapping.resetEpoch||0),true);return{verified:false,status:'account_deleted'};}
      try{return await verifyForUser(uid,notice.purchaseToken,{expectedResetEpoch:Number(mapping.resetEpoch||0)});}catch(error){if(error&&error.reason==='account-reset')await recordDeletionSignal(uid,notice,tokenHash,Number(mapping.resetEpoch||0),false);throw error;}
    }
    let response;
    try{response=await provider.getSubscription({packageName:config.packageName,token:notice.purchaseToken});}catch(error){fail('provider','Google Play verification is unavailable');}
    const directHash=text(response&&response.externalAccountIdentifiers&&response.externalAccountIdentifiers.obfuscatedExternalAccountId).toLowerCase(),expiredHash=text(response&&response.outOfAppPurchaseContext&&response.outOfAppPurchaseContext.expiredExternalAccountIdentifiers&&response.outOfAppPurchaseContext.expiredExternalAccountIdentifiers.obfuscatedExternalAccountId).toLowerCase();
    if(directHash&&expiredHash&&directHash!==expiredHash)fail('ownership','Google Play account bindings do not match');
    const accountHash=directHash||expiredHash;
    if(!ACCOUNT_HASH.test(accountHash))return saveOrphan({db,FieldValue,now:stampNow(now),notice,tokenHash,response});
    const account=await db.doc(`googlePlayAccounts/${accountHash}`).get();
    if(!account.exists||!text(account.data()&&account.data().uid))return saveOrphan({db,FieldValue,now:stampNow(now),notice,tokenHash,response,accountHash});
    const accountData=account.data()||{};
    if(accountData.accountDeleted===true){await recordDeletionSignal(accountData.uid,notice,tokenHash,Number(accountData.resetEpoch||0),true);return{verified:false,status:'account_deleted'};}
    try{return await verifyForUser(accountData.uid,notice.purchaseToken,{expectedResetEpoch:Number(accountData.resetEpoch||0)});}catch(error){if(error&&error.reason==='account-reset')await recordDeletionSignal(accountData.uid,notice,tokenHash,Number(accountData.resetEpoch||0),false);throw error;}
  }
  async function recordDeletionSignal(uid,notice,tokenHash,resetEpoch,accountDeleted){
    const stamp=Number(now()),resetRef=db.doc(`accountResets/${uid}`),signalRef=db.doc(`billingDeletionSignals/${uid}`);
    await db.runTransaction(async tx=>{
      const resetSnap=await tx.get(resetRef),reset=resetSnap.exists?resetSnap.data()||{}:{},mapping=await tx.get(db.doc(`googlePlayPurchaseTokens/${tokenHash}`)),mapped=mapping.exists?mapping.data()||{}:{};
      tx.set(signalRef,{schemaVersion:1,uid,provider:'google_play',resetEpoch,accountDeleted,tokenHash,purchaseToken:notice.purchaseToken,eventTimeMillis:notice.eventTimeMillis||null,deletionId:text(mapped.deletionId)||text(reset.deletionId)||text(reset.correlationId)||null,detectedAt:stamp,updatedAt:timestamp(FieldValue,stamp)},{merge:true});
      if(['deleting','failed'].includes(text(reset.status)))tx.set(resetRef,{billingEventWatermark:stamp,billingEventProvider:'google_play',updatedAt:timestamp(FieldValue,stamp)},{merge:true});
    });
  }
  async function refreshForUser(uid,options={}){
    const fenceOptions={allowFailed:options.allowFailedReset===true,allowDeleting:options.allowDeletingReset===true},resetSnap=await db.doc(`accountResets/${uid}`).get(),resetEpoch=resetFence(resetSnap,options.expectedResetEpoch,fenceOptions),accountHash=hashAccount(uid,resetEpoch);
    const rows=await db.collection('googlePlayPurchaseTokens').where('accountHash','==',accountHash).get(),results=[];
    for(const row of rows.docs){
      const data=row.data()||{},token=data.purchaseToken;
      if(data.accountDeleted===true||Number(data.resetEpoch||0)!==resetEpoch)continue;
      if(typeof token!=='string')fail('ownership','Google Play token mapping is invalid');
      results.push(await verifyForUser(uid,token,{expectedResetEpoch:resetEpoch,allowFailedReset:options.allowFailedReset===true,allowDeletingReset:options.allowDeletingReset===true}));
    }
    const snapshot=await db.doc(`users/${uid}/entitlements/current`).get();
    return{count:results.length,results,access:snapshot.exists?snapshot.data().googlePlayAccess||null:null};
  }
  async function purgeOrphans(limit=400){
    const cap=Math.max(1,Math.min(400,Number(limit)||400)),snapshot=await db.collection('googlePlayOrphans').where('deleteAfterAt','<=',Number(now())).limit(cap).get();
    if(snapshot.empty)return{deleted:0};
    const batch=db.batch();for(const row of snapshot.docs)batch.delete(row.ref);await batch.commit();return{deleted:snapshot.docs.length};
  }
  async function retryAcknowledgements(limit=100){
    const cap=Math.max(1,Math.min(100,Number(limit)||100)),stamp=Number(now()),snapshot=await db.collection('googlePlayPurchaseTokens').where('acknowledgement.dueAt','<=',stamp).orderBy('acknowledgement.dueAt','asc').limit(cap).get();
    let retried=0,failures=0,accountResetSkipped=0;
    for(const row of snapshot.docs){
      const data=row.data()||{},ack=data.acknowledgement||{};
      if(!['pending','processing'].includes(ack.status))continue;
      try{await verifyForUser(data.uid,data.purchaseToken,{expectedResetEpoch:Number(data.resetEpoch||0)});retried++;}
      catch(error){if(error&&error.reason==='account-reset')accountResetSkipped++;else failures++;}
    }
    return{checked:snapshot.docs.length,retried,failures,accountResetSkipped};
  }
  async function refreshTrackedPurchases(limit=100){
    const cap=Math.max(1,Math.min(100,Number(limit)||100)),stamp=Number(now()),snapshot=await db.collection('googlePlayPurchaseTokens').where('providerRefreshDueAt','<=',stamp).orderBy('providerRefreshDueAt','asc').limit(cap).get();
    let refreshed=0,failures=0,accountResetSkipped=0;
    for(const row of snapshot.docs){
      const data=row.data()||{};
      try{await verifyForUser(data.uid,data.purchaseToken,{expectedResetEpoch:Number(data.resetEpoch||0)});refreshed++;}
      catch(error){
        if(error&&error.reason==='account-reset')accountResetSkipped++;else failures++;
        await row.ref.set({providerRefreshDueAt:stamp+PROVIDER_REFRESH_RETRY_MS,updatedAt:timestamp(FieldValue,stamp)},{merge:true}).catch(()=>{});
      }
    }
    return{checked:snapshot.docs.length,refreshed,failures,accountResetSkipped};
  }
  async function purgeTerminalTokens(limit=200){
    const cap=Math.max(1,Math.min(200,Number(limit)||200)),snapshot=await db.collection('googlePlayPurchaseTokens').where('deleteAfterAt','<=',Number(now())).limit(cap).get();
    if(snapshot.empty)return{deleted:0,accountsDeleted:0};
    const batch=db.batch();for(const row of snapshot.docs)batch.delete(row.ref);
    await batch.commit();
    return{deleted:snapshot.docs.length,accountsDeleted:0};
  }
  return{registerAccount,verifyForUser,handleNotification,refreshForUser,refreshTrackedPurchases,purgeOrphans,retryAcknowledgements,purgeTerminalTokens};
}

function stampNow(now){const value=Number(now());return Number.isFinite(value)&&value>0?value:Date.now();}
async function saveOrphan({db,FieldValue,now,notice,tokenHash,response,accountHash=null}){
  await db.doc(`googlePlayOrphans/${tokenHash}`).set({schemaVersion:1,tokenHash,packageName:notice.packageName,subscriptionId:notice.subscriptionId||null,notificationType:notice.notificationType,eventTimeMillis:notice.eventTimeMillis||null,providerState:normalizedState(response&&response.subscriptionState),accountHash:ACCOUNT_HASH.test(accountHash||'')?accountHash:null,detectedAt:timestamp(FieldValue,now),deleteAfterAt:now+ORPHAN_RETENTION_MS},{merge:true});
  return{verified:false,status:'unlinked'};
}
function parseNotification(input){
  const message=input&&input.data&&input.data.message?input.data.message:input&&input.message?input.message:input||{};
  let payload=message&&message.json;
  if(!payload&&typeof message.data==='string'){
    try{payload=JSON.parse(Buffer.from(message.data,'base64').toString('utf8'));}catch(error){fail('notification','Invalid Google Play notification');}
  }
  if(!payload||typeof payload!=='object')fail('notification','Invalid Google Play notification');
  const packageName=text(payload.packageName);
  if(payload.testNotification&&typeof payload.testNotification==='object'&&!payload.subscriptionNotification&&!payload.voidedPurchaseNotification&&!payload.oneTimeProductNotification){
    if(!packageName||!text(payload.testNotification.version))fail('notification','Invalid Google Play test notification');
    return{packageName,testNotification:true};
  }
  const subscription=payload.subscriptionNotification;
  if(!subscription||typeof subscription!=='object')fail('notification','Unsupported Google Play notification');
  const token=purchaseToken(subscription.purchaseToken),notificationType=Number(subscription.notificationType);
  if(!packageName||!Number.isInteger(notificationType)||notificationType<1)fail('notification','Invalid Google Play notification');
  return{packageName,purchaseToken:token,subscriptionId:text(subscription.subscriptionId)||null,notificationType,eventTimeMillis:/^\d{1,18}$/.test(text(payload.eventTimeMillis))?text(payload.eventTimeMillis):null};
}

module.exports={PACKAGE_NAME,ACCESS_STATES,ORPHAN_RETENTION_MS,TOKEN_TERMINAL_RETENTION_MS,GooglePlayBillingError,configuration,purchaseToken,hashToken,hashAccount,matchedLineItems,verifyProviderPurchase,publicProjection,accessProjection,parseNotification,defaultProvider,createService};
