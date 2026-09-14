'use strict';

const crypto=require('node:crypto');
const {FieldPath}=require('firebase-admin/firestore');
const AccountWriteFence=require('./account-write-fence');

const BUNDLE_ID='uk.taxmate.app';
const PRODUCT_ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSACTION_ID=/^[A-Za-z0-9._-]{1,128}$/;
const JWS=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const TIER_WEIGHT=Object.freeze({free:0,plus:1,pro:2});
const ENVIRONMENTS=new Set(['Production','Sandbox']);
const AUTO_RENEWABLE='Auto-Renewable Subscription';
const MAX_STORED_SUBSCRIPTIONS=24;
const MAPPING_PAGE_SIZE=100;
const KEY_ID=/^[A-Z0-9]{10}$/;
const PROVIDER_REFRESH_INTERVAL_MS=6*60*60*1000;
const PROVIDER_REFRESH_RETRY_MS=15*60*1000;

class AppStoreBillingError extends Error{
  constructor(reason,message=reason){super(message);this.name='AppStoreBillingError';this.reason=reason;}
}

function fail(reason,message){throw new AppStoreBillingError(reason,message);}
function text(value){return typeof value==='string'?value:'';}
function validProductId(value){return PRODUCT_ID.test(text(value));}
function normalizeUuid(value){const result=text(value).trim().toLowerCase();if(!UUID.test(result))fail('ownership','Invalid App Store account token');return result;}
function signedJws(value){const result=text(value);if(result.length<64||result.length>200000||!JWS.test(result))fail('invalid-transaction','Invalid App Store signed transaction');return result;}
function hash(value){return crypto.createHash('sha256').update(String(value),'utf8').digest('hex');}
function hashAccountToken(value){return hash(normalizeUuid(value));}
function hashTransactionId(value){const result=text(value);if(!TRANSACTION_ID.test(result))fail('transaction','Invalid App Store transaction identity');return hash(`taxmate-app-store-transaction-v1:${result}`);}
function hashVerifiedTransactionId(value){const result=text(value);if(!TRANSACTION_ID.test(result))fail('transaction','Invalid App Store transaction identity');return hash(`taxmate-app-store-verification-v1:${result}`);}
function transactionTombstoneId(uid,resetEpoch,transactionHash){return hash(`taxmate-app-store-transaction-tombstone-v1:${text(uid)}:${Number(resetEpoch)}:${text(transactionHash)}`);}
function signingKey(value){const result=text(value).trim();if(result.length<160||result.length>10000||!/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/.test(result))fail('configuration','App Store API signing key is unavailable');return result;}

function rootCertificates(input){
  let values=input;
  if(typeof values==='string'){
    if(!values.trim())fail('configuration','Apple root certificates are unavailable');
    try{values=JSON.parse(values);}catch(error){fail('configuration','Apple root certificates are invalid');}
  }
  if(!Array.isArray(values)||values.length<1||values.length>8)fail('configuration','Apple root certificates are unavailable');
  return Object.freeze(values.map(value=>{
    if(Buffer.isBuffer(value)){if(value.length<256)fail('configuration','Apple root certificate is invalid');return Buffer.from(value);}
    const encoded=text(value).trim();
    if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))fail('configuration','Apple root certificate is invalid');
    const certificate=Buffer.from(encoded,'base64');
    if(certificate.length<256||certificate.toString('base64').replace(/=+$/,'')!==encoded.replace(/=+$/,''))fail('configuration','Apple root certificate is invalid');
    return certificate;
  }));
}

function configuration(input={}){
  const bundleId=text(input.APP_STORE_BUNDLE_ID),environment=text(input.APP_STORE_ENVIRONMENT),rawAppleId=text(input.APP_STORE_APPLE_ID).trim(),appAppleId=rawAppleId?Number(rawAppleId):null;
  if(bundleId!==BUNDLE_ID)fail('configuration','App Store bundle configuration is unavailable');
  if(!ENVIRONMENTS.has(environment))fail('configuration','App Store environment is unavailable');
  if(environment==='Production'&&(!Number.isSafeInteger(appAppleId)||appAppleId<=0))fail('configuration','App Store app identity is unavailable');
  if(rawAppleId&&(!Number.isSafeInteger(appAppleId)||appAppleId<=0))fail('configuration','App Store app identity is invalid');
  if(text(input.APP_STORE_PROVIDER_READY)!=='true')fail('configuration','App Store provider readiness has not been confirmed');
  const issuerId=text(input.APP_STORE_ISSUER_ID).trim().toLowerCase(),keyId=text(input.APP_STORE_KEY_ID).trim().toUpperCase(),privateKey=signingKey(input.APP_STORE_PRIVATE_KEY);
  if(!UUID.test(issuerId)||!KEY_ID.test(keyId))fail('configuration','App Store Server API credentials are unavailable');
  const products=[
    {tier:'plus',cadence:'monthly',productId:text(input.APP_STORE_PLUS_MONTHLY_PRODUCT_ID)},
    {tier:'plus',cadence:'yearly',productId:text(input.APP_STORE_PLUS_YEARLY_PRODUCT_ID)},
    {tier:'pro',cadence:'monthly',productId:text(input.APP_STORE_PRO_MONTHLY_PRODUCT_ID)},
    {tier:'pro',cadence:'yearly',productId:text(input.APP_STORE_PRO_YEARLY_PRODUCT_ID)}
  ];
  if(products.some(row=>!validProductId(row.productId))||new Set(products.map(row=>row.productId)).size!==4)fail('configuration','App Store product configuration is unavailable');
  // A backend instance admits one App Store environment only. Sandbox/TestFlight
  // transactions must use a separate non-production Firebase project so they can
  // never project paid access into production.
  const environments=Object.freeze([environment]);
  return Object.freeze({bundleId,environment,environments,appAppleId,issuerId,keyId,privateKey,rootCertificates:rootCertificates(input.APP_STORE_ROOT_CA_BASE64),products:Object.freeze(products.map(Object.freeze))});
}

function clientConfiguration(value){return{schemaVersion:1,configured:true,bundleId:value.bundleId,environment:value.environment,products:value.products.map(({tier,cadence,productId})=>({tier,cadence,productId}))};}
function configured(input){return typeof input==='function'?configuration(input()):input&&input.products&&input.rootCertificates?input:configuration(input);}
function defaultVerifier(config,environment=config.environment){
  let library;
  try{library=require('@apple/app-store-server-library');}catch(error){fail('configuration','Apple verification library is unavailable');}
  try{return new library.SignedDataVerifier(config.rootCertificates,true,environment,config.bundleId,environment==='Production'?config.appAppleId:undefined);}catch(error){fail('configuration','Apple transaction verifier is unavailable');}
}
function defaultApiClient(config,environment=config.environment){
  let library;
  try{library=require('@apple/app-store-server-library');}catch(error){fail('configuration','Apple server library is unavailable');}
  try{return new library.AppStoreServerAPIClient(config.privateKey,config.keyId,config.issuerId,config.bundleId,environment);}catch(error){fail('configuration','App Store Server API client is unavailable');}
}
function timestamp(FieldValue,stamp){return FieldValue&&typeof FieldValue.serverTimestamp==='function'?FieldValue.serverTimestamp():stamp;}
function resetFence(snapshot,expectedEpoch=null,options={}){
  const data=snapshot&&snapshot.exists?snapshot.data()||{}:{},status=text(data.status),epoch=data.resetEpoch==null?0:Number(data.resetEpoch);
  if(!Number.isSafeInteger(epoch)||epoch<0||status&&!['complete','deleting','failed'].includes(status))fail('account-reset','Account reset state is invalid');
  if(status==='deleting'&&options.allowDeleting!==true||status==='failed'&&options.allowFailed!==true)fail('account-reset','Account reset is in progress');
  if(expectedEpoch!=null&&Number(expectedEpoch)!==epoch)fail('account-reset','App Store mapping belongs to an earlier account reset');
  return epoch;
}

function statusName(value,transaction,renewal,stamp){
  if(transaction.revocationDate!=null)return'revoked';
  if(value===1)return'active';
  if(value===2)return'expired';
  if(value===3)return'billing_retry';
  if(value===4)return'billing_grace_period';
  if(value===5)return'revoked';
  if(renewal&&renewal.isInBillingRetryPeriod===true)return'billing_retry';
  return Number(transaction.expiresDate)>stamp?'active':'expired';
}
function transactionProjection({decoded,renewal=null,notificationStatus=null,config,expectedAccountToken,providerEventAt=null,now=Date.now()}){
  const stamp=Number(now);if(!Number.isFinite(stamp)||stamp<=0)fail('verification-time','Invalid verification time');
  if(!decoded||typeof decoded!=='object')fail('provider-response','Invalid App Store transaction');
  if(decoded.bundleId!==config.bundleId)fail('bundle','App Store bundle does not match TaxMate');
  if(decoded.environment!==config.environment)fail('environment','App Store environment does not match TaxMate');
  if(decoded.type!==AUTO_RENEWABLE)fail('product','App Store transaction is not an auto-renewable subscription');
  const descriptor=config.products.find(row=>row.productId===decoded.productId);if(!descriptor)fail('product','App Store transaction is not a configured TaxMate plan');
  const accountToken=normalizeUuid(decoded.appAccountToken);if(accountToken!==normalizeUuid(expectedAccountToken))fail('ownership','App Store transaction does not belong to this account');
  const transactionId=text(decoded.transactionId),originalTransactionId=text(decoded.originalTransactionId);
  if(!TRANSACTION_ID.test(transactionId)||!TRANSACTION_ID.test(originalTransactionId))fail('transaction','Invalid App Store transaction identity');
  if(renewal&&renewal.originalTransactionId&&renewal.originalTransactionId!==originalTransactionId)fail('transaction','App Store renewal identity does not match');
  if(renewal&&renewal.environment&&renewal.environment!==config.environment)fail('environment','App Store renewal environment does not match');
  if(renewal&&renewal.appAccountToken&&normalizeUuid(renewal.appAccountToken)!==accountToken)fail('ownership','App Store renewal does not belong to this account');
  const expiresAt=Number(decoded.expiresDate);if(!Number.isFinite(expiresAt)||expiresAt<=0)fail('transaction','App Store subscription expiry is unavailable');
  const signedAt=Number(providerEventAt||renewal&&renewal.signedDate||decoded.signedDate);if(!Number.isFinite(signedAt)||signedAt<=0)fail('transaction','App Store provider event time is unavailable');
  const graceExpiresAt=Number(renewal&&renewal.gracePeriodExpiresDate)||null,status=statusName(Number(notificationStatus)||null,decoded,renewal,stamp),accessExpiresAt=status==='billing_grace_period'?Math.max(expiresAt,graceExpiresAt||0):expiresAt;
  const revocationDate=Number(decoded.revocationDate)||null,accessActive=['active','billing_grace_period'].includes(status)&&accessExpiresAt>stamp&&revocationDate==null;
  return Object.freeze({
    schemaVersion:1,source:'app_store',transactionHash:hashTransactionId(originalTransactionId),transactionId,originalTransactionId,
    tier:accessActive?descriptor.tier:'free',purchasedTier:descriptor.tier,cadence:descriptor.cadence,status,accessActive,
    expiresAt:accessExpiresAt,transactionExpiresAt:expiresAt,graceExpiresAt,autoRenewEnabled:renewal?Number(renewal.autoRenewStatus)===1:null,
    productId:descriptor.productId,environment:config.environment,appAccountTokenHash:hashAccountToken(accountToken),
    purchaseDate:Number(decoded.purchaseDate)||null,providerEventAt:signedAt,revocationDate,
    paidAccessEndedAt:revocationDate||(!accessActive&&accessExpiresAt<=stamp?accessExpiresAt:null),verifiedAt:stamp
  });
}

function publicProjection(value={}){return{
  schemaVersion:1,source:'app_store',transactionHash:text(value.transactionHash),
  tier:value.tier==='pro'?'pro':value.tier==='plus'?'plus':'free',purchasedTier:value.purchasedTier==='pro'?'pro':value.purchasedTier==='plus'?'plus':'free',cadence:value.cadence==='yearly'?'yearly':'monthly',
  status:text(value.status),accessActive:value.accessActive===true,expiresAt:Number(value.expiresAt)||0,transactionExpiresAt:Number(value.transactionExpiresAt)||0,graceExpiresAt:Number(value.graceExpiresAt)||null,
  autoRenewEnabled:value.autoRenewEnabled===true?true:value.autoRenewEnabled===false?false:null,productId:text(value.productId),environment:text(value.environment),appAccountTokenHash:text(value.appAccountTokenHash),purchaseDate:Number(value.purchaseDate)||null,providerEventAt:Number(value.providerEventAt)||0,revocationDate:Number(value.revocationDate)||null,paidAccessEndedAt:Number(value.paidAccessEndedAt)||null,verifiedAt:Number(value.verifiedAt)||0
};}
function projectionPriority(value){return value&&value.status==='revoked'?5:value&&value.status==='billing_grace_period'?4:value&&value.status==='billing_retry'?3:value&&value.status==='active'?2:1;}
function mergeSubscriptionProjection(previous,incoming){
  if(!previous)return publicProjection(incoming);
  const prior=publicProjection(previous),next=publicProjection(incoming);
  const priorPurchase=Number(prior.purchaseDate)||0,nextPurchase=Number(next.purchaseDate)||0;
  if(priorPurchase&&nextPurchase&&nextPurchase<priorPurchase)return prior;
  if(priorPurchase&&nextPurchase&&nextPurchase>priorPurchase)return next;
  if(next.status==='revoked'||next.revocationDate){return next.providerEventAt>=prior.providerEventAt?next:prior;}
  if(prior.status==='revoked'||prior.revocationDate)return prior;
  if(next.providerEventAt<prior.providerEventAt)return prior;
  if(next.providerEventAt>prior.providerEventAt)return next;
  const priorEnd=Math.max(Number(prior.expiresAt)||0,Number(prior.graceExpiresAt)||0),nextEnd=Math.max(Number(next.expiresAt)||0,Number(next.graceExpiresAt)||0);
  if(nextEnd<priorEnd)return prior;
  if(nextEnd>priorEnd)return next;
  return projectionPriority(next)>=projectionPriority(prior)?next:prior;
}
function activeProjection(value,now){return value&&value.accessActive===true&&TIER_WEIGHT[value.tier]>0&&Number(value.expiresAt)>Number(now);}
function trimSubscriptions(input,now){
  const rows=Object.entries(input&&typeof input==='object'?input:{}).filter(([key,value])=>/^[a-f0-9]{64}$/.test(key)&&value&&typeof value==='object').map(([key,value])=>[key,publicProjection({...value,transactionHash:key})]);
  rows.sort((a,b)=>Number(activeProjection(b[1],now))-Number(activeProjection(a[1],now))||Number(b[1].verifiedAt)-Number(a[1].verifiedAt));
  return Object.fromEntries(rows.slice(0,MAX_STORED_SUBSCRIPTIONS));
}
function accessProjection(subscriptions,now=Date.now()){
  const live=Object.values(subscriptions&&typeof subscriptions==='object'?subscriptions:{}).filter(value=>activeProjection(value,now)).sort((a,b)=>TIER_WEIGHT[b.tier]-TIER_WEIGHT[a.tier]||Number(b.expiresAt)-Number(a.expiresAt));
  if(live.length){const winner=publicProjection(live[0]);return{schemaVersion:1,source:'app_store',active:true,tier:winner.tier,purchasedTier:winner.purchasedTier,expiresAt:winner.expiresAt,paidAccessEndedAt:null,cadence:winner.cadence,status:winner.status,productId:winner.productId,transactionHash:winner.transactionHash,autoRenewEnabled:winner.autoRenewEnabled,verifiedAt:winner.verifiedAt};}
  const all=Object.values(subscriptions&&typeof subscriptions==='object'?subscriptions:{}).filter(Boolean).map(publicProjection),latest=all.sort((a,b)=>Number(b.providerEventAt)-Number(a.providerEventAt)||Number(b.verifiedAt)-Number(a.verifiedAt))[0],ended=all.map(value=>Number(value.paidAccessEndedAt)).filter(value=>Number.isFinite(value)&&value>0&&value<=Number(now));
  return{schemaVersion:1,source:'app_store',active:false,tier:'free',purchasedTier:latest&&latest.purchasedTier||'free',expiresAt:Number(latest&&latest.expiresAt)||null,paidAccessEndedAt:ended.length?Math.max(...ended):null,cadence:latest&&latest.cadence||null,status:latest&&latest.status||'missing',productId:latest&&latest.productId||null,transactionHash:latest&&latest.transactionHash||null,autoRenewEnabled:false,verifiedAt:Number(latest&&latest.verifiedAt)||Number(now)};
}

function reservationMatches(reservation,projection,resetEpoch,reservationId=''){
  if(!reservation||reservation.status!=='provider_pending'||reservation.provider!=='app_store'||Number(reservation.resetEpoch||0)!==resetEpoch)return false;
  if(reservation.tier!==projection.purchasedTier||reservation.cadence!==projection.cadence)return false;
  if(reservationId)return reservation.reservationId===reservationId;
  return Number(projection.purchaseDate)>0&&Number(projection.purchaseDate)>=Number(reservation.startedAt||0);
}
function providerRefreshDueAt(projection,stamp){return ['active','billing_retry','billing_grace_period'].includes(text(projection&&projection.status))?stamp+PROVIDER_REFRESH_INTERVAL_MS:null;}

function createService({db,configuration:inputConfiguration,verifierFactory=defaultVerifier,apiClientFactory=defaultApiClient,retentionLifecycle=(previous,next)=>next.accountRetention||previous.accountRetention||{},purchaseGuard=()=>null,FieldValue,now=()=>Date.now(),randomUUID=crypto.randomUUID}){
  if(!db||typeof db.doc!=='function'||typeof db.runTransaction!=='function')throw new TypeError('Firestore required');
  const verifiers=new Map(),apiClients=new Map();
  function environmentConfig(config,environment){if(!config.environments.includes(environment))fail('environment','App Store environment is not enabled');return{...config,environment};}
  function verifierFor(config,environment=config.environment){
    if(verifiers.has(environment))return verifiers.get(environment);
    const value=verifierFactory(environmentConfig(config,environment),environment);if(!value||typeof value.verifyAndDecodeTransaction!=='function'||typeof value.verifyAndDecodeNotification!=='function')fail('configuration','Apple transaction verifier is unavailable');verifiers.set(environment,value);return value;
  }
  function apiClientFor(config,environment=config.environment){
    if(apiClients.has(environment))return apiClients.get(environment);
    const value=apiClientFactory(environmentConfig(config,environment),environment);if(!value||typeof value.getAllSubscriptionStatuses!=='function')fail('configuration','App Store Server API client is unavailable');apiClients.set(environment,value);return value;
  }
  function ensureProviderReady(config){for(const environment of config.environments){verifierFor(config,environment);apiClientFor(config,environment);}return config;}
  async function verifyAcross(config,method,jws,preferredEnvironment=null){
    const environments=preferredEnvironment?[preferredEnvironment]:config.environments;let lastError;
    for(const environment of environments){try{return{decoded:await verifierFor(config,environment)[method](jws),config:environmentConfig(config,environment)};}catch(error){lastError=error;}}
    fail('signature',lastError&&lastError.message||'App Store signed data could not be verified');
  }

  async function configurationForUser(uid){
    if(!text(uid))fail('invalid-account','Invalid account identity');
    const config=ensureProviderReady(configured(inputConfiguration)),accountRef=db.doc(`appStoreAccounts/${uid}`),resetRef=db.doc(`accountResets/${uid}`);let accountToken;
    await db.runTransaction(async tx=>{
      const [accountSnap,resetSnap]=await Promise.all([tx.get(accountRef),tx.get(resetRef)]),resetEpoch=resetFence(resetSnap),previous=accountSnap.exists?accountSnap.data()||{}:{},rotating=accountSnap.exists&&previous.accountDeleted===true&&previous.rebindAllowedAfterEpoch===true&&Number(previous.resetEpoch||0)<resetEpoch;
      if(accountSnap.exists){
        if(rotating){accountToken=normalizeUuid(randomUUID());if(accountToken===normalizeUuid(previous.appAccountToken))fail('configuration','App Store account token rotation failed');}
        else{if(previous.accountDeleted===true||previous.uid!==uid||Number(previous.resetEpoch||0)!==resetEpoch)fail('account-reset','App Store account belongs to an earlier account reset');accountToken=normalizeUuid(previous.appAccountToken);}
      }else accountToken=normalizeUuid(randomUUID());
      const tokenHash=hashAccountToken(accountToken),tokenRef=db.doc(`appStoreAccountTokens/${tokenHash}`),tokenSnap=await tx.get(tokenRef),mapping=tokenSnap.exists?tokenSnap.data()||{}:{};
      if(tokenSnap.exists&&(mapping.accountDeleted===true||mapping.uid!==uid||Number(mapping.resetEpoch||0)!==resetEpoch))fail(mapping.accountDeleted===true?'account-reset':'ownership','App Store account token is already linked to another account');
      const historyState=rotating||!accountSnap.exists?'empty':['empty','verified'].includes(text(previous.transactionHistoryState))?text(previous.transactionHistoryState):null;
      const fresh={schemaVersion:1,uid,appAccountToken:accountToken,appAccountTokenHash:tokenHash,resetEpoch,...(historyState?{transactionHistoryState:historyState}:{}),createdAt:rotating?timestamp(FieldValue,Number(now())):previous.createdAt||timestamp(FieldValue,Number(now())),updatedAt:timestamp(FieldValue,Number(now()))};
      tx.set(accountRef,fresh,rotating?undefined:{merge:true});
      tx.set(tokenRef,{schemaVersion:1,uid,appAccountTokenHash:tokenHash,resetEpoch,createdAt:mapping.createdAt||timestamp(FieldValue,Number(now())),updatedAt:timestamp(FieldValue,Number(now()))},tokenSnap.exists?{merge:true}:undefined);
    });
    // StoreKit offer-code transactions do not carry an appAccountToken supplied
    // by TaxMate. Keep redemption disabled until Apple provides a server-verifiable
    // ownership claim that can satisfy this binding contract.
    return{...clientConfiguration(config),appAccountToken:accountToken,offerCodeRedemptionEnabled:false};
  }

  async function accountFor(uid,expectedEpoch=null,options={}){
    const [accountSnap,resetSnap]=await Promise.all([db.doc(`appStoreAccounts/${uid}`).get(),db.doc(`accountResets/${uid}`).get()]),resetEpoch=resetFence(resetSnap,expectedEpoch,options);
    if(!accountSnap.exists)fail('ownership','App Store account binding is unavailable');
    const account=accountSnap.data()||{};if(account.accountDeleted===true||account.uid!==uid||Number(account.resetEpoch||0)!==resetEpoch)fail('account-reset','App Store account binding belongs to an earlier reset');
    return{account,resetEpoch};
  }

  async function recordDeletionSignal({uid,mapping,notificationUUID,transactionHash}){
    const stamp=Number(now()),resetRef=db.doc(`accountResets/${uid}`),signalRef=db.doc(`billingDeletionSignals/${uid}`);
    await db.runTransaction(async tx=>{
      const resetSnap=await tx.get(resetRef),reset=resetSnap.exists?resetSnap.data()||{}:{},deletionId=text(mapping&&mapping.deletionId)||text(reset.deletionId)||text(reset.correlationId)||null;
      tx.set(signalRef,{schemaVersion:1,uid,provider:'app_store',resetEpoch:Number(mapping&&mapping.resetEpoch||0),accountDeleted:mapping&&mapping.accountDeleted===true,notificationUUID,transactionHash,deletionId,detectedAt:stamp,updatedAt:timestamp(FieldValue,stamp)},{merge:true});
      if(['deleting','failed'].includes(text(reset.status)))tx.set(resetRef,{billingEventWatermark:stamp,billingEventProvider:'app_store',updatedAt:timestamp(FieldValue,stamp)},{merge:true});
    });
  }

  async function commitProjection({uid,projection,resetEpoch,notification=null,reservationId='',allowProviderConflict=false,allowFailedReset=false,allowDeletingReset=false}){
    const entitlementRef=db.doc(`users/${uid}/entitlements/current`),retentionRef=db.doc(`users/${uid}/retention/current`),accountRef=db.doc(`appStoreAccounts/${uid}`),resetRef=db.doc(`accountResets/${uid}`),tokenRef=db.doc(`appStoreAccountTokens/${projection.appAccountTokenHash}`),transactionRef=db.doc(`appStoreTransactions/${projection.transactionHash}`),reservationRef=db.doc(`billingPurchaseReservations/${uid}`),notificationRef=notification?db.doc(`appStoreNotifications/${notification.notificationUUID}`):null;let aggregate,duplicate=false;
    await db.runTransaction(async tx=>{
      const refs=[entitlementRef,accountRef,resetRef,retentionRef,tokenRef,transactionRef,reservationRef];if(notificationRef)refs.push(notificationRef);
      const snaps=await Promise.all(refs.map(ref=>tx.get(ref))),entitlementSnap=snaps[0],accountSnap=snaps[1],resetSnap=snaps[2],retentionSnap=snaps[3],tokenSnap=snaps[4],transactionSnap=snaps[5],reservationSnap=snaps[6],notificationSnap=notificationRef?snaps[7]:null;
      resetFence(resetSnap,resetEpoch,{allowFailed:allowFailedReset,allowDeleting:allowDeletingReset});
      if(notificationSnap&&notificationSnap.exists&&notificationSnap.data().status==='complete'){duplicate=true;aggregate=entitlementSnap.exists?entitlementSnap.data().appStoreAccess||null:null;return;}
      const account=accountSnap.exists?accountSnap.data()||{}:{};if(account.uid!==uid||Number(account.resetEpoch||0)!==resetEpoch||account.appAccountTokenHash!==projection.appAccountTokenHash)fail('ownership','App Store account binding changed');
      const token=tokenSnap.exists?tokenSnap.data()||{}:{};if(token.uid!==uid||Number(token.resetEpoch||0)!==resetEpoch)fail('ownership','App Store account token ownership changed');
      const mapped=transactionSnap.exists?transactionSnap.data()||{}:{},previous=entitlementSnap.exists?entitlementSnap.data()||{}:{},conflict=projection.accessActive&&!allowProviderConflict?purchaseGuard(previous,'app_store',Number(now())):null,reservation=reservationSnap.exists?reservationSnap.data()||{}:null,reservationMatched=reservationMatches(reservation,projection,resetEpoch,reservationId),mappedEpoch=Number(mapped.resetEpoch||0),startedAt=Number(reservation&&reservation.startedAt||0),currentMapping=!transactionSnap.exists||mapped.accountDeleted!==true&&mapped.uid===uid&&mappedEpoch===resetEpoch&&mapped.appAccountTokenHash===projection.appAccountTokenHash,rebindMapping=transactionSnap.exists&&!currentMapping&&mapped.uid===uid&&mapped.accountDeleted===true&&mapped.rebindAllowedAfterEpoch===true&&Number.isSafeInteger(mappedEpoch)&&mappedEpoch>=0&&mappedEpoch<resetEpoch&&mapped.originalTransactionId===projection.originalTransactionId&&mapped.appAccountTokenHash!==projection.appAccountTokenHash&&projection.accessActive===true&&text(reservation&&reservation.reservationId)!==''&&reservationMatched&&Number.isFinite(startedAt)&&startedAt>0&&Number(projection.purchaseDate)>=startedAt;
      if(transactionSnap.exists&&!currentMapping&&!rebindMapping)fail('ownership','App Store subscription is already linked to another account lifecycle');
      let transactionArchiveRef=null;
      if(rebindMapping){
        transactionArchiveRef=db.doc(`appStoreTransactionTombstones/${transactionTombstoneId(uid,mappedEpoch,projection.transactionHash)}`);
        const archiveSnap=await tx.get(transactionArchiveRef),archive=archiveSnap.exists?archiveSnap.data()||{}:{};
        if(archiveSnap.exists&&(archive.uid!==uid||archive.provider!=='app_store'||archive.transactionHash!==projection.transactionHash||Number(archive.resetEpoch)!==mappedEpoch))fail('ownership','App Store transaction tombstone is inconsistent');
        if(!archiveSnap.exists)tx.set(transactionArchiveRef,{schemaVersion:1,uid,provider:'app_store',transactionHash:projection.transactionHash,resetEpoch:mappedEpoch,accountDeleted:true,deletionId:text(mapped.deletionId)||null,mapping:mapped,archivedAt:timestamp(FieldValue,Number(now()))});
      }
      const reservationConflict=projection.accessActive&&!transactionSnap.exists&&!reservationMatched;
      if(conflict)fail('provider-overlap',String(conflict));
      const incoming=publicProjection(projection),prior=previous.appStoreSubscriptions&&previous.appStoreSubscriptions[projection.transactionHash],selected=mergeSubscriptionProjection(prior,incoming),selectedIncoming=!prior||selected.providerEventAt===incoming.providerEventAt&&selected.status===incoming.status&&selected.expiresAt===incoming.expiresAt;
      const subscriptions=trimSubscriptions({...previous.appStoreSubscriptions,[projection.transactionHash]:selected},Number(now())),next={appStoreSubscriptions:subscriptions,appStoreAccess:accessProjection(subscriptions,Number(now()))};aggregate=next.appStoreAccess;
      const providerConflict=allowProviderConflict&&purchaseGuard(previous,'app_store',Number(now())),storageProjection=AccountWriteFence.storageProjection(resetSnap,retentionLifecycle(previous,next,Number(now())),retentionSnap);
      tx.set(entitlementRef,{...next,...storageProjection,billingConflict:providerConflict||reservationConflict?{provider:'app_store',reason:providerConflict?'provider_overlap':'reservation_missing_or_mismatch',detectedAt:Number(now())}:previous.billingConflict||null,serverVerifiedAt:Number(now()),updatedAt:timestamp(FieldValue,Number(now()))},{merge:true});
      tx.set(accountRef,{transactionHistoryState:'verified',lastVerifiedTransactionHash:projection.transactionHash,updatedAt:timestamp(FieldValue,Number(now()))},{merge:true});
      const transactionRecord={schemaVersion:1,uid,resetEpoch,appAccountTokenHash:projection.appAccountTokenHash,transactionId:selectedIncoming||!mapped.transactionId||rebindMapping?projection.transactionId:mapped.transactionId,originalTransactionId:selectedIncoming||!mapped.originalTransactionId||rebindMapping?projection.originalTransactionId:mapped.originalTransactionId,projection:selected,providerRefreshDueAt:providerRefreshDueAt(selected,Number(now())),createdAt:rebindMapping?timestamp(FieldValue,Number(now())):mapped.createdAt||timestamp(FieldValue,Number(now())),updatedAt:timestamp(FieldValue,Number(now()))};
      if(rebindMapping)tx.set(transactionRef,transactionRecord);else tx.set(transactionRef,transactionRecord,{merge:true});
      if(reservationMatched)tx.delete(reservationRef);
      if(notificationRef)tx.set(notificationRef,{schemaVersion:1,status:'complete',uid,notificationUUID:notification.notificationUUID,notificationType:notification.notificationType||null,subtype:notification.subtype||null,transactionHash:projection.transactionHash,processedAt:timestamp(FieldValue,Number(now()))},{merge:true});
    });
    return{aggregate,duplicate};
  }

  async function verifyForUser(uid,rawJws,options={}){
    const config=ensureProviderReady(configured(inputConfiguration)),jws=signedJws(rawJws),binding=await accountFor(uid,options.expectedResetEpoch),verified=await verifyAcross(config,'verifyAndDecodeTransaction',jws);
    const projection=transactionProjection({decoded:verified.decoded,config:verified.config,expectedAccountToken:binding.account.appAccountToken,now:Number(now())}),result=await commitProjection({uid,projection,resetEpoch:binding.resetEpoch,reservationId:text(options.reservationId),allowProviderConflict:true});
    return{verified:true,transactionHash:projection.transactionHash,verificationHash:hashVerifiedTransactionId(projection.transactionId),tier:result.aggregate.tier,active:result.aggregate.active,expiresAt:result.aggregate.expiresAt,cadence:result.aggregate.cadence,status:result.aggregate.status};
  }

  async function handleNotification(rawPayload){
    const config=ensureProviderReady(configured(inputConfiguration)),signedPayload=signedJws(rawPayload&&rawPayload.signedPayload||rawPayload),verifiedNotification=await verifyAcross(config,'verifyAndDecodeNotification',signedPayload),notification=verifiedNotification.decoded;
    const data=notification&&notification.data;
    if(!data||data.bundleId!==config.bundleId||data.environment!==verifiedNotification.config.environment||data.environment==='Production'&&Number(data.appAppleId)!==config.appAppleId||data.environment==='Sandbox'&&data.appAppleId!=null&&config.appAppleId&&Number(data.appAppleId)!==config.appAppleId)fail('app-identity','App Store notification app identity does not match TaxMate');
    const notificationUUID=text(notification.notificationUUID);if(!UUID.test(notificationUUID))fail('notification','Invalid App Store notification identity');
    if(!data.signedTransactionInfo){
      await db.doc(`appStoreNotifications/${notificationUUID}`).set({schemaVersion:1,status:'complete',notificationUUID,notificationType:text(notification.notificationType)||null,subtype:text(notification.subtype)||null,processedAt:timestamp(FieldValue,Number(now()))},{merge:true});
      return{verified:true,ignored:true};
    }
    let decoded,renewal=null;
    try{const verifier=verifierFor(config,data.environment);decoded=await verifier.verifyAndDecodeTransaction(data.signedTransactionInfo);if(data.signedRenewalInfo)renewal=await verifier.verifyAndDecodeRenewalInfo(data.signedRenewalInfo);}catch(error){fail('signature','App Store notification transaction could not be verified');}
    const accountToken=normalizeUuid(decoded.appAccountToken),tokenHash=hashAccountToken(accountToken),tokenSnap=await db.doc(`appStoreAccountTokens/${tokenHash}`).get();
    if(!tokenSnap.exists||!text(tokenSnap.data()&&tokenSnap.data().uid))fail('unlinked','App Store transaction is not linked to a TaxMate account');
    const mapping=tokenSnap.data()||{},uid=mapping.uid,transactionHash=hashTransactionId(text(decoded.originalTransactionId));
    if(mapping.accountDeleted===true){await recordDeletionSignal({uid,mapping,notificationUUID,transactionHash});return{verified:false,status:'account_deleted'};}
    let binding;
    try{binding=await accountFor(uid,Number(mapping.resetEpoch||0));}
    catch(error){if(error&&error.reason==='account-reset')await recordDeletionSignal({uid,mapping,notificationUUID,transactionHash});throw error;}
    const runtimeConfig=environmentConfig(config,data.environment),projection=transactionProjection({decoded,renewal,notificationStatus:data.status,config:runtimeConfig,expectedAccountToken:binding.account.appAccountToken,providerEventAt:Number(notification.signedDate)||Number(renewal&&renewal.signedDate)||Number(decoded.signedDate),now:Number(now())});
    const result=await commitProjection({uid,projection,resetEpoch:binding.resetEpoch,notification:{notificationUUID,notificationType:text(notification.notificationType),subtype:text(notification.subtype)},allowProviderConflict:true});
    return{verified:true,duplicate:result.duplicate,tier:result.aggregate&&result.aggregate.tier||'free',active:result.aggregate&&result.aggregate.active===true};
  }

  async function refreshForUser(uid,options={}){
    const config=ensureProviderReady(configured(inputConfiguration)),allowFailedReset=options.allowFailedReset===true,allowDeletingReset=options.allowDeletingReset===true,binding=await accountFor(uid,options.expectedResetEpoch,{allowFailed:allowFailedReset,allowDeleting:allowDeletingReset}),mappings=[];
    let cursor=null;
    do{
      let query=db.collection('appStoreTransactions').where('appAccountTokenHash','==',binding.account.appAccountTokenHash).orderBy(FieldPath.documentId()).limit(MAPPING_PAGE_SIZE);
      if(cursor)query=query.startAfter(cursor);
      const page=await query.get();
      for(const row of page.docs){const mapping=row.data()||{};if(mapping.accountDeleted!==true&&Number(mapping.resetEpoch||0)===binding.resetEpoch)mappings.push(mapping);}
      cursor=page.docs.length===MAPPING_PAGE_SIZE?page.docs[page.docs.length-1]:null;
    }while(cursor);
    if(!mappings.length)return{checked:true,subscriptions:0,access:null};
    const unique=new Map();
    for(const mapping of mappings){
      const originalTransactionId=text(mapping.originalTransactionId),environment=text(mapping.projection&&mapping.projection.environment)||config.environment;
      if(!TRANSACTION_ID.test(originalTransactionId)||!config.environments.includes(environment))fail('provider-response','Stored App Store transaction mapping is invalid');
      unique.set(`${environment}:${originalTransactionId}`,{originalTransactionId,environment});
    }
    let projected=0,access=null;
    for(const item of unique.values()){
      let response;
      try{response=await apiClientFor(config,item.environment).getAllSubscriptionStatuses(item.originalTransactionId);}catch(error){fail('provider-api','App Store subscription status is unavailable');}
      const groups=Array.isArray(response&&response.data)?response.data:[],last=groups.flatMap(group=>Array.isArray(group&&group.lastTransactions)?group.lastTransactions:[]);
      if(!last.length)fail('provider-response','App Store returned no subscription status');
      for(const status of last){
        if(!status||!status.signedTransactionInfo)continue;
        let decoded,renewal=null;
        try{const verifier=verifierFor(config,item.environment);decoded=await verifier.verifyAndDecodeTransaction(status.signedTransactionInfo);if(status.signedRenewalInfo)renewal=await verifier.verifyAndDecodeRenewalInfo(status.signedRenewalInfo);}catch(error){fail('signature','App Store status signature could not be verified');}
        const projection=transactionProjection({decoded,renewal,notificationStatus:status.status,config:environmentConfig(config,item.environment),expectedAccountToken:binding.account.appAccountToken,providerEventAt:Number(renewal&&renewal.signedDate)||Number(decoded.signedDate),now:Number(now())});
        const result=await commitProjection({uid,projection,resetEpoch:binding.resetEpoch,allowProviderConflict:true,allowFailedReset,allowDeletingReset});access=result.aggregate;projected++;
      }
    }
    if(!projected)fail('provider-response','App Store returned no verifiable subscription status');
    return{checked:true,subscriptions:projected,access};
  }

  async function refreshTrackedSubscriptions(limit=100){
    const cap=Math.max(1,Math.min(100,Number(limit)||100)),stamp=Number(now()),snapshot=await db.collection('appStoreTransactions').where('providerRefreshDueAt','<=',stamp).orderBy('providerRefreshDueAt','asc').limit(cap).get(),users=new Map();
    for(const row of snapshot.docs){const data=row.data()||{};if(text(data.uid)&&!users.has(data.uid))users.set(data.uid,Number(data.resetEpoch||0));}
    let refreshed=0,failures=0,accountResetSkipped=0;
    for(const [uid,expectedResetEpoch] of users){
      try{await refreshForUser(uid,{expectedResetEpoch});refreshed++;}
      catch(error){
        if(error&&error.reason==='account-reset')accountResetSkipped++;else failures++;
        for(const row of snapshot.docs)if((row.data()||{}).uid===uid)await row.ref.set({providerRefreshDueAt:stamp+PROVIDER_REFRESH_RETRY_MS,updatedAt:timestamp(FieldValue,stamp)},{merge:true}).catch(()=>{});
      }
    }
    return{checked:snapshot.docs.length,users:users.size,refreshed,failures,accountResetSkipped};
  }

  return{configurationForUser,verifyForUser,handleNotification,refreshForUser,refreshTrackedSubscriptions};
}

module.exports={BUNDLE_ID,AUTO_RENEWABLE,AppStoreBillingError,configuration,clientConfiguration,normalizeUuid,signedJws,hashAccountToken,hashTransactionId,hashVerifiedTransactionId,transactionTombstoneId,transactionProjection,publicProjection,mergeSubscriptionProjection,accessProjection,defaultVerifier,defaultApiClient,createService};
