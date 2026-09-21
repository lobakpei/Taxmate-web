'use strict';
const crypto=require('node:crypto');
const {onCall,HttpsError,onRequest}=require('firebase-functions/v2/https');
const {onDocumentWritten,onDocumentCreated}=require('firebase-functions/v2/firestore');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {onMessagePublished}=require('firebase-functions/v2/pubsub');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app'); const {getFirestore,FieldValue}=require('firebase-admin/firestore'); const {getStorage}=require('firebase-admin/storage'); const {getAuth}=require('firebase-admin/auth');
const Stripe=require('stripe'); initializeApp(); const db=getFirestore();
const FounderPromotions=require('./founder-promotions');
const CompaniesHouseLookup=require('./companies-house-lookup');
const LtdSetup=require('./ltd-setup');
const RetentionPolicy=require('./retention-policy');
const RetentionWorker=require('./retention-worker');
const ReceiptCleanup=require('./receipt-cleanup');
const ReceiptAdmission=require('./receipt-admission');
const AdmissionLifecycle=require('./receipt-admission-lifecycle');
const BillingService=require('./billing-service');
const BillingEntitlements=require('./billing-entitlements');
const BillingPlans=require('./billing-plans');
const BillingWebhook=require('./billing-webhook');
const BillingCheckout=require('./billing-checkout');
const BillingReviewContext=require('./billing-review-context');
const BillingPrices=require('./billing-price-config');
const BillingDeletionSafety=require('./billing-deletion-safety');
const BillingCustomerBinding=require('./billing-customer-binding');
const BillingPurchasePreflight=require('./billing-purchase-preflight');
const AccountWriteFence=require('./account-write-fence');
const AccountStorageBootstrap=require('./account-storage-bootstrap');
const GooglePlayBilling=require('./google-play-billing');
const AppStoreBilling=require('./app-store-billing');
// Firebase CLI discovers exports before it loads project .env values into the
// discovery process. Keep Play endpoints discoverable; the runtime provider
// configuration still fails closed until GOOGLE_PLAY_PROVIDER_READY is true.
const exposeGooglePlayFunctions=true;
const exposeAppStoreFunctions=process.env.APP_STORE_PROVIDER_READY==='true';
const STRIPE_SECRET=defineSecret('STRIPE_SECRET_KEY'), STRIPE_WEBHOOK_SECRET=defineSecret('STRIPE_WEBHOOK_SECRET'), COMPANIES_HOUSE_API_KEY=defineSecret('COMPANIES_HOUSE_API_KEY');
const APP_STORE_ROOT_CA=exposeAppStoreFunctions?defineSecret('APP_STORE_ROOT_CA_BASE64'):null,APP_STORE_PRIVATE_KEY=exposeAppStoreFunctions?defineSecret('APP_STORE_PRIVATE_KEY'):null;
const PLUS_MONTHLY_PRICE=defineString('STRIPE_PLUS_MONTHLY_PRICE_ID',{default:''}),PLUS_ANNUAL_PRICE=defineString('STRIPE_PLUS_ANNUAL_PRICE_ID',{default:''});
const PRO_MONTHLY_PRICE=defineString('STRIPE_PRO_MONTHLY_PRICE_ID',{default:''}),PRO_ANNUAL_PRICE=defineString('STRIPE_PRO_ANNUAL_PRICE_ID',{default:''});
const LEGACY_PLUS_PRICES=defineString('STRIPE_PLUS_LEGACY_PRICE_IDS',{default:''}),LEGACY_PRO_PRICES=defineString('STRIPE_PRO_LEGACY_PRICE_IDS',{default:''});
const LEGACY_PRO_ANNUAL_PRICES=defineString('STRIPE_PRO_LEGACY_ANNUAL_PRICE_IDS',{default:''});
const APP_URL=defineString('PUBLIC_APP_URL',{default:'https://www.taxmate.uk'});
const BILLING_MONEY_OPERATIONS=defineString('BILLING_MONEY_OPERATIONS_ENABLED',{default:'false'});
const BILLING_CONSUMER_DISCLOSURES=defineString('BILLING_CONSUMER_DISCLOSURES_READY',{default:'false'});
const disabledProviderParameter=Object.freeze({value:()=>''});
const GOOGLE_PLAY_PLUS_SUBSCRIPTION=exposeGooglePlayFunctions?defineString('GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID',{default:''}):disabledProviderParameter;
const GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN=exposeGooglePlayFunctions?defineString('GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN_ID',{default:''}):disabledProviderParameter;
const GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN=exposeGooglePlayFunctions?defineString('GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN_ID',{default:''}):disabledProviderParameter;
const GOOGLE_PLAY_PRO_SUBSCRIPTION=exposeGooglePlayFunctions?defineString('GOOGLE_PLAY_PRO_SUBSCRIPTION_ID',{default:''}):disabledProviderParameter;
const GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN=exposeGooglePlayFunctions?defineString('GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN_ID',{default:''}):disabledProviderParameter;
const GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN=exposeGooglePlayFunctions?defineString('GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN_ID',{default:''}):disabledProviderParameter;
const GOOGLE_PLAY_PROVIDER_READY=defineString('GOOGLE_PLAY_PROVIDER_READY',{default:'false'});
const APP_STORE_BUNDLE_ID=exposeAppStoreFunctions?defineString('APP_STORE_BUNDLE_ID',{default:''}):disabledProviderParameter;
const APP_STORE_APPLE_ID=exposeAppStoreFunctions?defineString('APP_STORE_APPLE_ID',{default:''}):disabledProviderParameter;
const APP_STORE_ENVIRONMENT=exposeAppStoreFunctions?defineString('APP_STORE_ENVIRONMENT',{default:''}):disabledProviderParameter;
const APP_STORE_ISSUER_ID=exposeAppStoreFunctions?defineString('APP_STORE_ISSUER_ID',{default:''}):disabledProviderParameter;
const APP_STORE_KEY_ID=exposeAppStoreFunctions?defineString('APP_STORE_KEY_ID',{default:''}):disabledProviderParameter;
const APP_STORE_PLUS_MONTHLY_PRODUCT=exposeAppStoreFunctions?defineString('APP_STORE_PLUS_MONTHLY_PRODUCT_ID',{default:''}):disabledProviderParameter;
const APP_STORE_PLUS_YEARLY_PRODUCT=exposeAppStoreFunctions?defineString('APP_STORE_PLUS_YEARLY_PRODUCT_ID',{default:''}):disabledProviderParameter;
const APP_STORE_PRO_MONTHLY_PRODUCT=exposeAppStoreFunctions?defineString('APP_STORE_PRO_MONTHLY_PRODUCT_ID',{default:''}):disabledProviderParameter;
const APP_STORE_PRO_YEARLY_PRODUCT=exposeAppStoreFunctions?defineString('APP_STORE_PRO_YEARLY_PRODUCT_ID',{default:''}):disabledProviderParameter;
const APP_STORE_PROVIDER_READY=defineString('APP_STORE_PROVIDER_READY',{default:'false'});
const baseOpts={region:'europe-west2',enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true'},opts={...baseOpts,secrets:[STRIPE_SECRET]};
const appStoreOpts=exposeAppStoreFunctions?{...baseOpts,secrets:[APP_STORE_ROOT_CA,APP_STORE_PRIVATE_KEY]}:null;
const appStorePurchaseOpts=exposeAppStoreFunctions?{...baseOpts,secrets:[STRIPE_SECRET,APP_STORE_ROOT_CA,APP_STORE_PRIVATE_KEY]}:null;
const accountDeletionOpts={...baseOpts,secrets:[STRIPE_SECRET]};
// These triggers receive only committed Firestore changes. Failed or offline
// client writes cannot destroy bytes, including another member's upload.
for(const [name,document]of [['cleanupPersonalEntryReceipt','users/{uid}/entries/{entryId}'],['cleanupSharedEntryReceipt','partnerships/{code}/entries/{entryId}'],['cleanupMetaReceipt','users/{uid}/app/{document}'],['cleanupLtdReceipt','users/{uid}/ltd/v1/{collection}/{recordId}']]){
  exports[name]=onDocumentWritten({region:'europe-west2',document,retry:true},async event=>{
    const before=event.data?.before.data(),after=event.data?.after.data();
    if(!before||!after||before.deletedAt!=null||![...ReceiptAdmission.receiptPaths(before)].some(path=>!ReceiptCleanup.liveReferences(after,path)))return;
    if(event.params.uid){const retention=(await db.doc(`users/${event.params.uid}/retention/current`).get()).data();if(retention&&['purging','failed'].includes(retention.status))return;}
    return ReceiptCleanup.acceptedEntryChange({db,bucket:getStorage().bucket(),before,after});
  });
}
exports.prepareReceiptWrite=onCall(baseOpts,async req=>{
  const user=auth(req);
  try{return req.data?.records?await ReceiptAdmission.prepareBatch({db,uid:user.uid,records:req.data.records,accountResetEpoch:req.data?.accountResetEpoch}):await ReceiptAdmission.prepareWrite({db,uid:user.uid,target:req.data?.target,payload:req.data?.payload,accountResetEpoch:req.data?.accountResetEpoch});}
  catch(error){throw new HttpsError(error.message==='receipt_reference_unavailable'?'failed-precondition':'permission-denied','Receipt reference admission failed',{reason:error.message});}
});
for(const [name,document]of [['cleanPersonalAdmission','users/{uid}/entries/{entryId}/receiptAdmissions/{writer}'],['cleanMetaAdmission','users/{uid}/app/{document}/receiptAdmissions/{writer}'],['cleanSharedAdmission','partnerships/{code}/entries/{entryId}/receiptAdmissions/{writer}'],['cleanLtdAdmission','users/{uid}/receiptLtdAdmissions/{document}']]){
  exports[name]=onDocumentWritten({region:'europe-west2',document,retry:true},async event=>{
    const after=event.data?.after,before=event.data?.before;
    if(after?.exists)return AdmissionLifecycle.cleanupAdmission({db,path:after.ref.path,expectedToken:after.data().token});
    if(before?.exists)return AdmissionLifecycle.cleanupConsumed({db,path:before.ref.path,before:before.data()});
  });
}
exports.cleanRevokedSharedAdmissions=onDocumentWritten({region:'europe-west2',document:'partnerships/{code}/members/{uid}',retry:true},async event=>AdmissionLifecycle.cleanupUid({db,uid:event.params.uid,partnershipId:event.params.code}));
exports.cleanRevokedPaidAdmissions=onDocumentWritten({region:'europe-west2',document:'users/{uid}/entitlements/current',retry:true},async event=>AdmissionLifecycle.cleanupUid({db,uid:event.params.uid}));
exports.cleanResetAdmissions=onDocumentWritten({region:'europe-west2',document:'accountResets/{uid}',retry:true},async event=>{
  if(['billing_quarantined','deleting','identity_deleting','failed'].includes(event.data?.after.data()?.status))return AdmissionLifecycle.cleanupUid({db,uid:event.params.uid});
});
exports.runReceiptCleanupJob=onDocumentCreated({region:'europe-west2',document:'receiptCleanupWakeups/{requestId}',retry:true},async event=>{
  return ReceiptCleanup.processJob({db,bucket:getStorage().bucket(),jobId:event.data.data().jobId});
});
exports.reconcileReceiptRetentionCompletion=onDocumentWritten({region:'europe-west2',document:'receiptCleanupJobs/{jobId}',retry:true},async event=>{
  const job=event.data?.after.data();if(job?.status==='complete'&&job.retentionUid)return ReceiptCleanup.reconcileRetentionCleanup({db,uid:job.retentionUid,epoch:job.retentionEpoch});
});
// Source-only recovery registration: not deployed/activated by this handoff.
// It resumes authorised receipt jobs, never starts an account retention purge.
exports.recoverReceiptCleanupJobs=onSchedule({region:'europe-west2',schedule:'every 5 minutes',timeoutSeconds:540},async()=>ReceiptCleanup.recoverPending({db,bucket:getStorage().bucket()}));
exports.cleanupReceipt=onCall(baseOpts,async req=>{
  const user=auth(req),path=req.data&&req.data.path,id=ReceiptCleanup.receiptIdentity(path);
  if(!id||id.uid!==user.uid)throw new HttpsError('permission-denied','Receipt owner required');
  const control=(await db.doc(`users/${user.uid}/retention/current`).get()).data();
  const entitlement=(await db.doc(`users/${user.uid}/entitlements/current`).get()).data()||{};
  const decision=RetentionPolicy.decide(entitlement);
  if(!RetentionPolicy.controlWritable(control)||decision.status==='expired'&&String(control?.cutoffDate||'')<decision.cutoffDate)throw new HttpsError('permission-denied','Account retention check required');
  return ReceiptCleanup.cleanupReceipt({db,bucket:getStorage().bucket(),path});
});
function stripe(){
  const key=STRIPE_SECRET.value();
  if(!key||key!==key.trim()||/[\r\n]/.test(key))throw new HttpsError('failed-precondition','Billing configuration unavailable',{reason:'billing-config'});
  const local=process.env.TAXMATE_STRIPE_EMULATOR_ORIGIN;
  if(local){
    if(process.env.FUNCTIONS_EMULATOR!=='true'||!String(process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT).startsWith('demo-'))throw new HttpsError('failed-precondition','Local payment adapter requires demo emulator');
    const url=new URL(local);if(url.hostname!=='127.0.0.1'||url.protocol!=='http:'||!url.port)throw new HttpsError('failed-precondition','Invalid local payment adapter');
    return new Stripe(key,{host:'127.0.0.1',port:Number(url.port),protocol:'http',maxNetworkRetries:0});
  }
  return new Stripe(key);
}
exports.bootstrapAccountStorageControls=onCall(baseOpts,async req=>{
  const user=auth(req);
  try{return await AccountStorageBootstrap.bootstrap({db,uid:user.uid});}
  catch(error){
    if(error instanceof AccountStorageBootstrap.AccountStorageBootstrapError)throw new HttpsError('failed-precondition','Account reset or retention must finish before receipt storage can be prepared',{reason:error.reason});
    throw error;
  }
});
function billingFailure(category){
  console.error('billing-failure',{category});
  return new HttpsError('internal','Payments are temporarily unavailable',{reason:category});
}
function auth(req){ if(!req.auth) throw new HttpsError('unauthenticated','Sign in required',{reason:'auth-required'}); return req.auth; }
async function accountWriteEpoch(tx,uid,expectedEpoch){
  try{return await AccountWriteFence.readInTransaction({tx,db,uid,expectedEpoch});}
  catch(error){if(error instanceof AccountWriteFence.AccountWriteFenceError)throw new HttpsError('failed-precondition','Account deletion or reset must finish before this change can be saved',{reason:error.reason});throw error;}
}
const TIER_WEIGHT=Object.freeze({free:0,plus:1,pro:2}),ACTIVE_SUBSCRIPTIONS=new Set(['active','trialing']);
function effectiveTier(entitlement,now=Date.now()){
  const data=entitlement&&typeof entitlement==='object'?entitlement:{};
  const paid=ACTIVE_SUBSCRIPTIONS.has(data.subscriptionStatus)&&TIER_WEIGHT[data.paidTier]>0&&(!data.currentPeriodEnd||Number(now)<Number(data.currentPeriodEnd))?data.paidTier:'free';
  const promotion=FounderPromotions.selectEffective(data.promotions,now)||(data.promotion&&FounderPromotions.activeGrant(data.promotion,now)?data.promotion:null);
  const promoted=promotion&&TIER_WEIGHT[promotion.tier]>0?promotion.tier:'free';
  const projected=data.paidAccess,funded=projected?(Number(projected.proExpiresAt)>now?'pro':Number(projected.plusExpiresAt)>now?'plus':'free'):paid;
  const play=data.googlePlayAccess&&data.googlePlayAccess.active===true&&Number(data.googlePlayAccess.expiresAt)>Number(now)&&TIER_WEIGHT[data.googlePlayAccess.tier]>0?data.googlePlayAccess.tier:'free';
  const apple=data.appStoreAccess&&data.appStoreAccess.active===true&&Number(data.appStoreAccess.expiresAt)>Number(now)&&TIER_WEIGHT[data.appStoreAccess.tier]>0?data.appStoreAccess.tier:'free';
  const purchased=[funded,play,apple].sort((a,b)=>TIER_WEIGHT[b]-TIER_WEIGHT[a])[0];
  return TIER_WEIGHT[promoted]>TIER_WEIGHT[purchased]?promoted:purchased;
}
function retentionLifecycle(previous,next,now=Date.now()){
  return RetentionPolicy.lifecycle(previous,next,now);
}
async function requireTier(uid,required){
  const snap=await db.doc(`users/${uid}/entitlements/current`).get(),tier=effectiveTier(snap.exists?snap.data():null,Date.now());
  if(TIER_WEIGHT[tier]<TIER_WEIGHT[required])throw new HttpsError('permission-denied',`${required==='pro'?'Pro':'Plus'} access required`,{reason:'tier-required',required});
  return tier;
}
function promotionError(reason){
  if(reason==='not-started')return new HttpsError('failed-precondition','Promotion is not available yet',{reason});
  if(reason==='expired')return new HttpsError('failed-precondition','Promotion has ended',{reason});
  if(reason==='redemption-limit-reached')return new HttpsError('resource-exhausted','Promotion redemption limit reached',{reason});
  return new HttpsError('not-found','Promotion code not found',{reason:'invalid'});
}
function billingPriceConfiguration(){return{
  STRIPE_PLUS_MONTHLY_PRICE_ID:PLUS_MONTHLY_PRICE.value(),STRIPE_PLUS_ANNUAL_PRICE_ID:PLUS_ANNUAL_PRICE.value(),
  STRIPE_PRO_MONTHLY_PRICE_ID:PRO_MONTHLY_PRICE.value(),STRIPE_PRO_ANNUAL_PRICE_ID:PRO_ANNUAL_PRICE.value(),
  STRIPE_PLUS_LEGACY_PRICE_IDS:LEGACY_PLUS_PRICES.value(),STRIPE_PRO_LEGACY_PRICE_IDS:LEGACY_PRO_PRICES.value(),
  STRIPE_PRO_LEGACY_ANNUAL_PRICE_IDS:LEGACY_PRO_ANNUAL_PRICES.value()
};}
function googlePlayConfiguration(){return{
  GOOGLE_PLAY_PROVIDER_READY:GOOGLE_PLAY_PROVIDER_READY.value(),
  GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID:GOOGLE_PLAY_PLUS_SUBSCRIPTION.value(),
  GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN_ID:GOOGLE_PLAY_PLUS_MONTHLY_BASE_PLAN.value(),
  GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN_ID:GOOGLE_PLAY_PLUS_YEARLY_BASE_PLAN.value(),
  GOOGLE_PLAY_PRO_SUBSCRIPTION_ID:GOOGLE_PLAY_PRO_SUBSCRIPTION.value(),
  GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN_ID:GOOGLE_PLAY_PRO_MONTHLY_BASE_PLAN.value(),
  GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN_ID:GOOGLE_PLAY_PRO_YEARLY_BASE_PLAN.value()
};}
function googlePlayService(){return GooglePlayBilling.createService({db,configuration:googlePlayConfiguration,retentionLifecycle,FieldValue,purchaseGuard:(data,provider,stamp)=>providerPaidState(data,provider,stamp)});}
function googlePlayClientConfiguration(){
  try{const value=GooglePlayBilling.configuration(googlePlayConfiguration());return{schemaVersion:1,configured:true,packageName:value.packageName,products:value.products};}
  catch(error){if(error instanceof GooglePlayBilling.GooglePlayBillingError&&error.reason==='configuration')return{schemaVersion:1,configured:false,packageName:GooglePlayBilling.PACKAGE_NAME,products:[]};throw error;}
}
function googlePlayPurchaseEligibility(entitlement,now=Date.now()){
  const data=entitlement&&typeof entitlement==='object'?entitlement:{},stamp=Number(now),permanentPro=FounderPromotions.hasPermanentPro(data.promotions,stamp)||data.promotionAccess?.proPermanent===true||(data.promotion?.tier==='pro'&&data.promotion?.permanent===true&&FounderPromotions.activeGrant(data.promotion,stamp));
  if(permanentPro)return{eligible:false,reason:'permanent_pro'};
  const stripeTier=ACTIVE_SUBSCRIPTIONS.has(String(data.subscriptionStatus||''))&&TIER_WEIGHT[String(data.paidTier||'free')]>0&&(!data.currentPeriodEnd||Number(data.currentPeriodEnd)>stamp)||Number(data.paidAccess?.plusExpiresAt)>stamp||Number(data.paidAccess?.proExpiresAt)>stamp;
  if(stripeTier)return{eligible:false,reason:'stripe_active'};
  const play=data.googlePlayAccess||{},playState=String(play.status||'');
  if(play.active===true&&Number(play.expiresAt)>stamp&&TIER_WEIGHT[play.tier]>0||['pending','on_hold','paused','in_grace_period'].includes(playState))return{eligible:false,reason:'google_play_active'};
  const apple=data.appStoreAccess||{},appleState=String(apple.status||'');
  if(apple.active===true&&Number(apple.expiresAt)>stamp&&TIER_WEIGHT[apple.tier]>0||['active','billing_retry','billing_grace_period'].includes(appleState))return{eligible:false,reason:'app_store_active'};
  return{eligible:true,reason:null};
}
async function deleteGooglePlayQuery(query){
  let deleted=0;
  for(let pass=0;pass<20;pass++){
    const snapshot=await query.limit(400).get();if(snapshot.empty)return deleted;
    const batch=db.batch();for(const row of snapshot.docs)batch.delete(row.ref);await batch.commit();deleted+=snapshot.docs.length;
    if(snapshot.docs.length<400)return deleted;
  }
  throw new Error('google_play_cleanup_did_not_converge');
}
async function deleteGooglePlayAccountData(uid,{deletionId,resetEpoch}={}){
  const epoch=Number(resetEpoch||0),accountHash=GooglePlayBilling.hashAccount(uid,epoch),accountRef=db.doc(`googlePlayAccounts/${accountHash}`),[account,tokenRows,orphanRows]=await Promise.all([accountRef.get(),db.collection('googlePlayPurchaseTokens').where('uid','==',uid).get(),db.collection('googlePlayOrphans').where('accountHash','==',accountHash).get()]),currentTokens=tokenRows.docs.filter(row=>{const data=row.data()||{};return Number(data.resetEpoch||0)===epoch&&data.accountDeleted!==true;}),currentOrphans=orphanRows.docs.filter(row=>(row.data()||{}).accountDeleted!==true),stamp=Date.now(),tombstone={accountDeleted:true,accountDeletedAt:stamp,deletionId:String(deletionId||''),resetEpoch:epoch,rebindAllowedAfterEpoch:true,providerRefreshDueAt:null,updatedAt:FieldValue.serverTimestamp()};
  for(const rows of [currentTokens,currentOrphans])for(let i=0;i<rows.length;i+=400){const batch=db.batch();for(const row of rows.slice(i,i+400))batch.set(row.ref,tombstone,{merge:true});await batch.commit();}
  if(account.exists)await accountRef.set(tombstone,{merge:true});return{tokensTombstoned:currentTokens.length,orphansTombstoned:currentOrphans.length};
}
function googlePlayFailure(error){
  const reason=error instanceof GooglePlayBilling.GooglePlayBillingError?error.reason:'unknown';
  console.error('google-play-billing-failure',{category:reason});
  if(reason==='invalid-token'||reason==='invalid-account')return new HttpsError('invalid-argument','Invalid Google Play purchase',{reason});
  if(reason==='configuration')return new HttpsError('failed-precondition','Google Play billing is still being set up',{reason});
  if(reason==='ownership')return new HttpsError('permission-denied','This Google Play purchase could not be verified for your account',{reason});
  if(reason==='account-reset')return new HttpsError('failed-precondition','Account deletion or reset must finish before Google Play billing can continue',{reason});
  if(reason==='product')return new HttpsError('failed-precondition','This is not a configured TaxMate plan',{reason});
  return new HttpsError('unavailable','Google Play purchase verification needs retrying',{reason:reason==='acknowledgement'?'acknowledgement':'provider'});
}
function appStoreConfiguration(){return{
  APP_STORE_PROVIDER_READY:APP_STORE_PROVIDER_READY.value(),
  APP_STORE_BUNDLE_ID:APP_STORE_BUNDLE_ID.value(),APP_STORE_APPLE_ID:APP_STORE_APPLE_ID.value(),APP_STORE_ENVIRONMENT:APP_STORE_ENVIRONMENT.value(),APP_STORE_ROOT_CA_BASE64:APP_STORE_ROOT_CA.value(),
  APP_STORE_ISSUER_ID:APP_STORE_ISSUER_ID.value(),APP_STORE_KEY_ID:APP_STORE_KEY_ID.value(),APP_STORE_PRIVATE_KEY:APP_STORE_PRIVATE_KEY.value(),
  APP_STORE_PLUS_MONTHLY_PRODUCT_ID:APP_STORE_PLUS_MONTHLY_PRODUCT.value(),APP_STORE_PLUS_YEARLY_PRODUCT_ID:APP_STORE_PLUS_YEARLY_PRODUCT.value(),
  APP_STORE_PRO_MONTHLY_PRODUCT_ID:APP_STORE_PRO_MONTHLY_PRODUCT.value(),APP_STORE_PRO_YEARLY_PRODUCT_ID:APP_STORE_PRO_YEARLY_PRODUCT.value()
};}
function providerPaidState(data,provider,now=Date.now()){
  const stamp=Number(now);
  if(provider!=='stripe'&&(ACTIVE_SUBSCRIPTIONS.has(String(data.subscriptionStatus||''))&&TIER_WEIGHT[String(data.paidTier||'free')]>0&&(!data.currentPeriodEnd||Number(data.currentPeriodEnd)>stamp)||Number(data.paidAccess?.plusExpiresAt)>stamp||Number(data.paidAccess?.proExpiresAt)>stamp))return'stripe_active';
  const play=data.googlePlayAccess||{},playState=String(play.status||'');
  if(provider!=='google_play'&&(play.active===true&&Number(play.expiresAt)>stamp&&TIER_WEIGHT[play.tier]>0||['pending','on_hold','paused','in_grace_period'].includes(playState)))return'google_play_active';
  const apple=data.appStoreAccess||{},appleState=String(apple.status||'');
  if(provider!=='app_store'&&(apple.active===true&&Number(apple.expiresAt)>stamp&&TIER_WEIGHT[apple.tier]>0||['active','billing_retry','billing_grace_period'].includes(appleState)))return'app_store_active';
  return null;
}
function sameProviderPaidState(data,provider,now=Date.now()){
  const stamp=Number(now);
  if(provider==='stripe'&&(ACTIVE_SUBSCRIPTIONS.has(String(data.subscriptionStatus||''))&&TIER_WEIGHT[String(data.paidTier||'free')]>0&&(!data.currentPeriodEnd||Number(data.currentPeriodEnd)>stamp)||Number(data.paidAccess?.plusExpiresAt)>stamp||Number(data.paidAccess?.proExpiresAt)>stamp))return'stripe_active';
  const play=data.googlePlayAccess||{},playState=String(play.status||'');
  if(provider==='google_play'&&(play.active===true&&Number(play.expiresAt)>stamp&&TIER_WEIGHT[play.tier]>0||['pending','on_hold','paused','in_grace_period'].includes(playState)))return'google_play_active';
  const apple=data.appStoreAccess||{},appleState=String(apple.status||'');
  if(provider==='app_store'&&(apple.active===true&&Number(apple.expiresAt)>stamp&&TIER_WEIGHT[apple.tier]>0||['active','billing_retry','billing_grace_period'].includes(appleState)))return'app_store_active';
  return null;
}
function appStorePurchaseEligibility(entitlement,now=Date.now()){
  const data=entitlement&&typeof entitlement==='object'?entitlement:{},stamp=Number(now),permanentPro=FounderPromotions.hasPermanentPro(data.promotions,stamp)||data.promotionAccess?.proPermanent===true||(data.promotion?.tier==='pro'&&data.promotion?.permanent===true&&FounderPromotions.activeGrant(data.promotion,stamp));
  if(permanentPro)return{eligible:false,reason:'permanent_pro'};
  const overlap=providerPaidState(data,'app_store',stamp);if(overlap)return{eligible:false,reason:overlap};
  const apple=data.appStoreAccess||{},state=String(apple.status||'');
  if(apple.active===true&&Number(apple.expiresAt)>stamp&&TIER_WEIGHT[apple.tier]>0||['active','billing_retry','billing_grace_period'].includes(state))return{eligible:false,reason:'app_store_active'};
  return{eligible:true,reason:null};
}
function appStoreService(){return AppStoreBilling.createService({db,configuration:appStoreConfiguration,retentionLifecycle,FieldValue,purchaseGuard:(data,provider,stamp)=>providerPaidState(data,provider,stamp)});}
function appStoreFailure(error){
  const reason=error instanceof AppStoreBilling.AppStoreBillingError?error.reason:'unknown';
  console.error('app-store-billing-failure',{category:reason});
  if(['invalid-transaction','transaction'].includes(reason))return new HttpsError('invalid-argument','Invalid App Store transaction',{reason});
  if(reason==='configuration')return new HttpsError('failed-precondition','App Store billing is still being set up',{reason});
  if(['ownership','unlinked'].includes(reason))return new HttpsError('permission-denied','This App Store purchase could not be verified for your account',{reason});
  if(reason==='account-reset')return new HttpsError('failed-precondition','Account deletion or reset must finish before App Store billing can continue',{reason});
  if(reason==='product'||reason==='provider-overlap')return new HttpsError('failed-precondition',reason==='product'?'This is not a configured TaxMate plan':'Manage the existing paid subscription before purchasing another plan',{reason});
  return new HttpsError('unavailable','App Store purchase verification needs retrying',{reason:'provider'});
}
async function deleteAppStoreQuery(query){
  let deleted=0;
  for(let pass=0;pass<20;pass++){
    const snapshot=await query.limit(400).get();if(snapshot.empty)return deleted;
    const batch=db.batch();for(const row of snapshot.docs)batch.delete(row.ref);await batch.commit();deleted+=snapshot.docs.length;
    if(snapshot.docs.length<400)return deleted;
  }
  throw new Error('app_store_cleanup_did_not_converge');
}
async function deleteAppStoreAccountData(uid,{deletionId,resetEpoch}={}){
  const epoch=Number(resetEpoch||0),accountRef=db.doc(`appStoreAccounts/${uid}`),[account,tokenRows,transactionRows,notificationRows]=await Promise.all([accountRef.get(),db.collection('appStoreAccountTokens').where('uid','==',uid).get(),db.collection('appStoreTransactions').where('uid','==',uid).get(),db.collection('appStoreNotifications').where('uid','==',uid).get()]),current=rows=>rows.docs.filter(row=>{const data=row.data()||{};return Number(data.resetEpoch||0)===epoch&&data.accountDeleted!==true;}),tokens=current(tokenRows),transactions=current(transactionRows),notifications=current(notificationRows),stamp=Date.now(),tombstone={accountDeleted:true,accountDeletedAt:stamp,deletionId:String(deletionId||''),resetEpoch:epoch,rebindAllowedAfterEpoch:true,providerRefreshDueAt:null,updatedAt:FieldValue.serverTimestamp()};
  for(const rows of [tokens,transactions,notifications])for(let i=0;i<rows.length;i+=400){const batch=db.batch();for(const row of rows.slice(i,i+400))batch.set(row.ref,tombstone,{merge:true});await batch.commit();}
  if(account.exists){const value=account.data()||{},accountEpoch=Number(value.resetEpoch??0);if(accountEpoch===epoch)await accountRef.set(tombstone,{merge:true});else if(value.accountDeleted!==true||!Number.isSafeInteger(accountEpoch)||accountEpoch<0||accountEpoch>epoch)throw new Error('app_store_account_lifecycle_invalid');}return{tokensTombstoned:tokens.length,transactionsTombstoned:transactions.length,notificationsTombstoned:notifications.length};
}

function bindingTombstoneRef(provider,uid,resetEpoch,identity){return db.doc(`billingProviderTombstones/${BillingDeletionSafety.tombstoneId(provider,uid,resetEpoch,identity)}`);}
async function enterDeletionBillingQuarantine({uid,resetRef,reservationRef,correlationId,resetEpoch,startedAt}){
  const signalRef=db.doc(`billingDeletionSignals/${uid}`),entitlementRef=db.doc(`users/${uid}/entitlements/current`),stripeRef=db.doc(`billingCustomers/${uid}`),playHash=GooglePlayBilling.hashAccount(uid,resetEpoch),playRef=db.doc(`googlePlayAccounts/${playHash}`),appleRef=db.doc(`appStoreAccounts/${uid}`),[stripeSnap,playSnap,appleSnap]=await Promise.all([stripeRef.get(),playRef.get(),appleRef.get()]),candidates=[];
  if(stripeSnap.exists&&String(stripeSnap.data()&&stripeSnap.data().stripeCustomerId||''))candidates.push({provider:'stripe',identity:String(stripeSnap.data().stripeCustomerId),ref:stripeRef});
  if(playSnap.exists)candidates.push({provider:'google_play',identity:playHash,ref:playRef});
  const appleData=appleSnap.exists?appleSnap.data()||{}:{},appleHash=String(appleData.appAccountTokenHash||'');if(appleSnap.exists&&appleData.accountDeleted!==true&&appleData.uid===uid&&Number(appleData.resetEpoch??0)===resetEpoch&&/^[a-f0-9]{64}$/.test(appleHash)){candidates.push({provider:'app_store',identity:appleHash,ref:appleRef});candidates.push({provider:'app_store',identity:`token:${appleHash}`,ref:db.doc(`appStoreAccountTokens/${appleHash}`)});}
  for(const candidate of candidates)candidate.archive=bindingTombstoneRef(candidate.provider,uid,resetEpoch,candidate.identity);
  await db.runTransaction(async tx=>{
    const refs=[resetRef,reservationRef,signalRef,entitlementRef,...candidates.map(item=>item.ref),...candidates.map(item=>item.archive)],snaps=await Promise.all(refs.map(ref=>tx.get(ref))),fence=snaps[0].exists?snaps[0].data()||{}:{},reservation=snaps[1].exists?snaps[1].data()||{}:{},signal=snaps[2].exists?snaps[2].data()||{}:{};
    if(fence.status!=='deleting'||fence.correlationId!==correlationId||Number(fence.resetEpoch||0)!==resetEpoch)throw new Error('account_deletion_fence_changed');
    if(reservation.status==='provider_pending')throw new HttpsError('failed-precondition','A provider purchase must be reconciled before deleting TaxMate data',{reason:'billing_purchase_pending'});
    const eventDetected=Number(fence.billingEventWatermark||0)>=startedAt||signal.deletionId===correlationId||Number(signal.detectedAt||0)>=startedAt;if(eventDetected)throw new HttpsError('failed-precondition','A new provider billing event must be reconciled before deleting TaxMate data',{reason:'billing_provider_event_pending'});
    const currentOffset=4,archiveOffset=currentOffset+candidates.length,stamp=Date.now(),common={accountDeleted:true,accountDeletedAt:stamp,deletionId:correlationId,resetEpoch,rebindAllowedAfterEpoch:true,billingQuarantined:true,providerRefreshDueAt:null,updatedAt:FieldValue.serverTimestamp()};
    for(let index=0;index<candidates.length;index++){
      const candidate=candidates[index],current=snaps[currentOffset+index],archive=snaps[archiveOffset+index],value=current.exists?current.data()||{}:{};
      if(!current.exists)throw new Error('billing_binding_changed_during_deletion');
      if(archive.exists){const saved=archive.data()||{};if(saved.uid!==uid||saved.provider!==candidate.provider||saved.identity!==candidate.identity||Number(saved.resetEpoch)!==resetEpoch)throw new Error('billing_tombstone_conflict');}
      else tx.set(candidate.archive,{schemaVersion:1,uid,provider:candidate.provider,identity:candidate.identity,resetEpoch,binding:value,accountDeleted:true,deletionId:correlationId,createdAt:FieldValue.serverTimestamp()});
      tx.set(candidate.ref,common,{merge:true});
    }
    tx.set(resetRef,{...fence,schemaVersion:1,status:'billing_quarantined',resetEpoch,correlationId,deletionId:correlationId,billingQuarantinedAt:stamp,updatedAt:FieldValue.serverTimestamp()});
    tx.set(entitlementRef,{accountResetStatus:'billing_quarantined',accountResetEpoch:resetEpoch,accountResetEpochString:String(resetEpoch)},{merge:true});
  });
}
async function beginIdentityDeletionAfterBillingQuarantine({resetRef,reservationRef,correlationId,resetEpoch}){
  let nextEpoch=null;
  await db.runTransaction(async tx=>{
    const [resetSnap,reservationSnap]=await Promise.all([tx.get(resetRef),tx.get(reservationRef)]),fence=resetSnap.exists?resetSnap.data()||{}:{},reservation=reservationSnap.exists?reservationSnap.data()||{}:{};
    if(fence.status!=='billing_quarantined'||fence.correlationId!==correlationId||Number(fence.resetEpoch||0)!==resetEpoch)throw new Error('account_deletion_quarantine_changed');
    if(reservation.status==='provider_pending')throw new Error('billing_reservation_created_after_quarantine');
    nextEpoch=Math.max(Date.now(),resetEpoch+1);tx.set(resetRef,{schemaVersion:1,status:'identity_deleting',resetEpoch:nextEpoch,correlationId,deletionId:correlationId,completedFromResetEpoch:resetEpoch,updatedAt:FieldValue.serverTimestamp()});
  });
  return nextEpoch;
}
async function finalizeDeletedAuthIdentity(uid,correlationId){
  const resetRef=db.doc(`accountResets/${uid}`),snapshot=await resetRef.get(),before=snapshot.exists?snapshot.data()||{}:{};
  if(before.status==='deleted'&&before.correlationId===correlationId)return Number(before.resetEpoch);
  if(before.status!=='identity_deleting'||before.correlationId!==correlationId)throw new Error('account_deletion_identity_fence_changed');
  try{await getAuth().deleteUser(uid);}catch(error){if(error&&error.code!=='auth/user-not-found')throw error;}
  let completedEpoch=null;
  await db.runTransaction(async tx=>{
    const current=await tx.get(resetRef),value=current.exists?current.data()||{}:{};
    if(value.status==='deleted'&&value.correlationId===correlationId){completedEpoch=Number(value.resetEpoch);return;}
    if(value.status!=='identity_deleting'||value.correlationId!==correlationId)throw new Error('account_deletion_identity_fence_changed');
    completedEpoch=Number(value.resetEpoch);tx.set(resetRef,{...value,status:'deleted',authIdentityDeleted:true,authDeletedAt:Date.now(),updatedAt:FieldValue.serverTimestamp()});
  });
  return completedEpoch;
}
exports.finishAccountIdentityDeletion=onDocumentWritten({region:'europe-west2',document:'accountResets/{uid}',retry:true},async event=>{
  const after=event.data?.after.data();if(after?.status!=='identity_deleting')return;
  await finalizeDeletedAuthIdentity(event.params.uid,String(after.correlationId||''));
});
async function quarantineStripeBillingEvent({uid,event,customerId,mapping}){
  return BillingWebhook.quarantineDeletionEvent({db,uid,event,customerId,mapping,serverTimestamp:()=>FieldValue.serverTimestamp()});
}
function priceDescriptor(priceId){return BillingPrices.describe(billingPriceConfiguration(),priceId);}
function subscriptionPeriodEnd(subscription){
  const itemEnds=(subscription.items&&subscription.items.data||[]).map(item=>Number(item.current_period_end||0));
  return Math.max(Number(subscription.current_period_end||0),...itemEnds,0)*1000;
}
async function customerFor(user,client=stripe()){
  return BillingCustomerBinding.customerFor({db,FieldValue,user,client,assertResetReady:assertPurchaseResetReady,accountResetError:()=>new HttpsError('failed-precondition','Stripe billing identity belongs to an earlier account lifecycle',{reason:'account_reset'})});
}
function refreshBilling(uid,client=stripe(),options={}){return BillingEntitlements.reconcile({db,client,uid,descriptor:priceDescriptor,retentionLifecycle,reservationFlowKey:String(options.reservationFlowKey||''),reservationId:String(options.reservationId||'')});}
function billingServices(client=stripe()){return BillingService.createService({db,client,moneyOperationsEnabled:BILLING_MONEY_OPERATIONS.value()==='true',onRefundChanged:uid=>refreshBilling(uid,client),readReviewContext:(caseRecord,previewAmountMinor)=>BillingReviewContext.readContext({db,client,caseRecord,previewAmountMinor,descriptor:priceDescriptor,effectiveTier})});}
function billingPlans(client=stripe()){return BillingPlans.createService({db,client,descriptor:priceDescriptor,priceFor:(tier,cadence)=>BillingPrices.current(billingPriceConfiguration(),tier,cadence),moneyOperationsEnabled:BILLING_MONEY_OPERATIONS.value()==='true',refresh:(uid,context)=>refreshBilling(uid,client,context)});}
function billingPurchaseControls(){const demo=process.env.FUNCTIONS_EMULATOR==='true'&&String(process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'').startsWith('demo-');return BillingPurchasePreflight.purchaseControls({moneyOperationsEnabled:BILLING_MONEY_OPERATIONS.value()==='true',consumerDisclosuresEnabled:BILLING_CONSUMER_DISCLOSURES.value()==='true',supplierDisclosureVerified:BillingCheckout.supplierDisclosureVerified,demo});}
function assertBillingPurchaseReady(){const controls=billingPurchaseControls();if(controls.purchaseEnabled)return controls;throw new HttpsError('failed-precondition',controls.reason==='money_operations_not_enabled'?'Billing purchases are not enabled':'Required consumer and supplier information has not been verified',{reason:controls.reason});}
function nativePurchaseEligibility(eligibility){const controls=billingPurchaseControls();return{moneyOperationsEnabled:controls.moneyOperationsEnabled,consumerDisclosuresReady:controls.consumerDisclosuresReady,...(controls.purchaseEnabled?eligibility:{eligible:false,reason:controls.reason})};}
function billingCheckout(client=stripe()){const controls=billingPurchaseControls();return BillingCheckout.createService({db,client,targetPrice:billingPlans(client).targetPrice,customerFor,appUrl:APP_URL.value(),moneyOperationsEnabled:controls.moneyOperationsEnabled,consumerDisclosuresReady:controls.consumerDisclosuresReady,closeReservation:(uid,offerId,reservationId)=>clearBillingReservation(uid,'stripe',{flowKey:`checkout:${offerId}`,reservationId}),reconcileReservation:async(uid,offerId,reservationId)=>{const snap=await db.doc(`users/${uid}/entitlements/current`).get(),data=snap.exists?snap.data()||{}:{};if(sameProviderPaidState(data,'stripe',Date.now()))return clearBillingReservation(uid,'stripe',{flowKey:`checkout:${offerId}`,reservationId});return false;}});}
const BILLING_PURCHASE_PROVIDERS=new Set(['stripe','google_play','app_store']);
async function assertPurchaseResetReady(uid){
  const snapshot=await db.doc(`accountResets/${uid}`).get(),data=snapshot.exists?snapshot.data()||{}:{},status=String(data.status||''),epoch=data.resetEpoch==null?0:Number(data.resetEpoch);
  if(!Number.isSafeInteger(epoch)||epoch<0||status&&!['complete','deleting','failed'].includes(status)||['deleting','failed'].includes(status))throw new HttpsError('failed-precondition','Account deletion or reset must finish before billing can continue',{reason:'account_reset'});
  return{resetEpoch:epoch};
}
function billingReservationPlan(input={}){
  const tier=String(input.tier||''),cadence=String(input.cadence||'');
  if(!['plus','pro'].includes(tier)||!['monthly','yearly'].includes(cadence))throw new HttpsError('invalid-argument','Invalid billing plan',{reason:'plan'});
  return{tier,cadence};
}
async function purchaseReservationState(uid){
  const snapshot=await db.doc(`billingPurchaseReservations/${uid}`).get(),reservation=snapshot.exists?snapshot.data()||{}:{};
  return reservation.status==='provider_pending'?reservation:null;
}
function currentBillingBinding(snapshot,uid,resetEpoch,provider){
  if(!snapshot.exists)return false;
  const value=snapshot.data()||{},epoch=Number(value.resetEpoch??0);
  if(value.accountDeleted===true&&Number.isSafeInteger(epoch)&&epoch<resetEpoch)return false;
  if(value.accountDeleted===true||!Number.isSafeInteger(epoch)||epoch!==resetEpoch||value.uid&&value.uid!==uid)throw new HttpsError('failed-precondition','A payment-provider account belongs to another account lifecycle',{reason:`${provider}_reconciliation_required`});
  return true;
}
function appStoreBindingIsVerifiedEmpty(snapshot){
  if(!snapshot.exists)return false;
  const value=snapshot.data()||{};
  return value.accountDeleted!==true&&value.transactionHistoryState==='empty'&&!value.lastVerifiedTransactionHash;
}
function appStoreBindingHasVerifiedHistory(snapshot){
  if(!snapshot.exists)return false;
  const value=snapshot.data()||{};
  return value.accountDeleted!==true&&value.transactionHistoryState==='verified'&&/^[a-f0-9]{64}$/.test(String(value.lastVerifiedTransactionHash||''));
}
async function billingPreflightSnapshots(uid,resetEpoch){
  const playHash=GooglePlayBilling.hashAccount(uid,resetEpoch),refs={
    reset:db.doc(`accountResets/${uid}`),entitlement:db.doc(`users/${uid}/entitlements/current`),stripe:db.doc(`billingCustomers/${uid}`),googlePlay:db.doc(`googlePlayAccounts/${playHash}`),appStore:db.doc(`appStoreAccounts/${uid}`)
  },values=await Promise.all(Object.values(refs).map(ref=>ref.get())),snapshots=Object.fromEntries(Object.keys(refs).map((key,index)=>[key,values[index]]));
  return{playHash,refs,snapshots,digest:BillingPurchasePreflight.capture(snapshots)};
}
async function reconcileBillingBeforeReservation(uid,provider){
  const {resetEpoch}=await assertPurchaseResetReady(uid),initial=await billingPreflightSnapshots(uid,resetEpoch),bindings={
    stripe:currentBillingBinding(initial.snapshots.stripe,uid,resetEpoch,'stripe'),
    googlePlay:currentBillingBinding(initial.snapshots.googlePlay,uid,resetEpoch,'google_play'),
    appStore:currentBillingBinding(initial.snapshots.appStore,uid,resetEpoch,'app_store')
  };
  // Web and Play functions do not bind Apple secrets. Only a new/verified-empty
  // Apple binding is safe there; every other Apple state needs the Apple path.
  const appStoreNeedsReconciliation=bindings.appStore&&!appStoreBindingIsVerifiedEmpty(initial.snapshots.appStore);
  if(appStoreNeedsReconciliation&&provider!=='app_store')throw new HttpsError('failed-precondition','App Store billing must be reconciled before starting this purchase',{reason:'app_store_reconciliation_required'});
  if(appStoreNeedsReconciliation&&!appStoreBindingHasVerifiedHistory(initial.snapshots.appStore))throw new HttpsError('failed-precondition','App Store billing must be reconciled before starting this purchase',{reason:'app_store_reconciliation_required'});
  if(bindings.stripe)await refreshBilling(uid,stripe());
  if(bindings.googlePlay){try{await googlePlayService().refreshForUser(uid,{expectedResetEpoch:resetEpoch});}catch(error){throw googlePlayFailure(error);}}
  if(appStoreNeedsReconciliation){
    let refreshed;
    try{refreshed=await appStoreService().refreshForUser(uid,{expectedResetEpoch:resetEpoch});}catch(error){throw appStoreFailure(error);}
    if(!refreshed||refreshed.checked!==true||Number(refreshed.subscriptions)<1)throw new HttpsError('failed-precondition','App Store billing must be reconciled before starting this purchase',{reason:'app_store_reconciliation_required'});
  }
  const final=await billingPreflightSnapshots(uid,resetEpoch);
  currentBillingBinding(final.snapshots.stripe,uid,resetEpoch,'stripe');currentBillingBinding(final.snapshots.googlePlay,uid,resetEpoch,'google_play');currentBillingBinding(final.snapshots.appStore,uid,resetEpoch,'app_store');
  return{resetEpoch,...final};
}
async function reserveBillingPurchase(uid,provider,input={}){
  if(!BILLING_PURCHASE_PROVIDERS.has(provider))throw new HttpsError('invalid-argument','Invalid billing provider',{reason:'provider'});
  // Store transaction verification remains available after a provider charge,
  // but every new native purchase must pass the same legal gates as Web checkout.
  if(provider!=='stripe')assertBillingPurchaseReady();
  const {tier,cadence}=billingReservationPlan(input),requestedId=String(input.reservationId||''),flowKey=String(input.flowKey||'');
  const preflight=await reconcileBillingBeforeReservation(uid,provider),resetRef=preflight.refs.reset,entitlementRef=preflight.refs.entitlement,reservationRef=db.doc(`billingPurchaseReservations/${uid}`);let result;
  await db.runTransaction(async tx=>{
    const [resetSnap,entitlementSnap,reservationSnap,stripeSnap,playSnap,appleSnap]=await Promise.all([tx.get(resetRef),tx.get(entitlementRef),tx.get(reservationRef),tx.get(preflight.refs.stripe),tx.get(preflight.refs.googlePlay),tx.get(preflight.refs.appStore)]),reset=resetSnap.exists?resetSnap.data()||{}:{},status=String(reset.status||''),resetEpoch=reset.resetEpoch==null?0:Number(reset.resetEpoch);
    if(!Number.isSafeInteger(resetEpoch)||resetEpoch<0||status&&!['complete','deleting','failed'].includes(status)||['deleting','failed'].includes(status))throw new HttpsError('failed-precondition','Account deletion or reset must finish before billing can continue',{reason:'account_reset'});
    if(resetEpoch!==preflight.resetEpoch||BillingPurchasePreflight.capture({reset:resetSnap,entitlement:entitlementSnap,stripe:stripeSnap,googlePlay:playSnap,appStore:appleSnap})!==preflight.digest)throw new HttpsError('aborted','Payment-provider status changed while the purchase was being prepared',{reason:'billing_preflight_changed'});
    const entitlement=entitlementSnap.exists?entitlementSnap.data()||{}:{};
    if(FounderPromotions.hasPermanentPro(entitlement.promotions,Date.now()))throw new HttpsError('already-exists','You already have permanent Pro access.',{reason:'permanent_pro'});
    const overlap=providerPaidState(entitlement,provider,Date.now()),sameProvider=provider==='stripe'&&flowKey.startsWith('plan:')?null:sameProviderPaidState(entitlement,provider,Date.now());if(overlap||sameProvider)throw new HttpsError('already-exists','Manage the existing paid subscription before purchasing another plan',{reason:overlap||sameProvider});
    const current=reservationSnap.exists?reservationSnap.data()||{}:{};
    if(current.status==='provider_pending'){
      const exactResume=current.provider===provider&&current.tier===tier&&current.cadence===cadence&&(
        requestedId&&requestedId===current.reservationId||flowKey&&flowKey===current.flowKey
      );
      if(!exactResume)throw new HttpsError('already-exists','A payment provider is already handling a purchase for this account',{reason:`${current.provider}_pending`});
      result=current;return;
    }
    result={schemaVersion:1,uid,provider,tier,cadence,status:'provider_pending',resetEpoch,reservationId:crypto.randomUUID(),flowKey:flowKey||null,startedAt:Date.now(),updatedAt:Date.now()};
    tx.set(reservationRef,result);
  });
  return result;
}
async function clearBillingReservation(uid,provider,match={}){
  const ref=db.doc(`billingPurchaseReservations/${uid}`);let cleared=false;
  await db.runTransaction(async tx=>{const snap=await tx.get(ref),data=snap.exists?snap.data()||{}:{};if(data.status!=='provider_pending'||data.provider!==provider)return;if(match.reservationId&&data.reservationId!==match.reservationId)return;if(match.flowKey&&data.flowKey!==match.flowKey)return;tx.delete(ref);cleared=true;});
  return cleared;
}
async function checkPurchaseAccess(user){await assertPurchaseResetReady(user.uid);const snap=await db.doc(`users/${user.uid}/entitlements/current`).get(),data=snap.exists?snap.data()||{}:{};if(FounderPromotions.hasPermanentPro(data.promotions,Date.now()))throw new HttpsError('already-exists','You already have permanent Pro access.');const overlap=providerPaidState(data,'stripe',Date.now());if(overlap)throw new HttpsError('already-exists',overlap==='google_play_active'?'Manage your active Google Play subscription before purchasing another plan.':'Manage your active App Store subscription before purchasing another plan.',{reason:overlap});}
async function billingCall(req,run,role){
  const user=auth(req);
  if(role&&user.token[role]!==true)throw new HttpsError('permission-denied','Billing staff access required',{reason:'billing_staff_required'});
  try{return await run(user);}catch(error){if(error instanceof HttpsError)throw error;if(error.billingReason)throw new HttpsError(error.billingCode||'failed-precondition','Billing action needs attention',{reason:error.billingReason});throw billingFailure('billing-unavailable');}
}
exports.getBillingHistory=onCall(opts,req=>billingCall(req,user=>billingServices().history(user.uid,req.data)));
exports.getRefundCases=onCall(opts,req=>billingCall(req,user=>billingServices().listCases(user.uid)));
exports.submitRefundRequest=onCall(opts,req=>billingCall(req,user=>billingServices().submit(user.uid,req.data)));
exports.replyRefundRequest=onCall(opts,req=>billingCall(req,user=>billingServices().reply(user.uid,req.data)));
exports.getBillingSupportCases=onCall(opts,req=>billingCall(req,()=>billingServices().staffList(req.data),'billingSupport'));
exports.getBillingSupportCase=onCall(opts,req=>billingCall(req,()=>billingServices().staffRead(req.data?.caseId,req.data?.previewAmountMinor),'billingSupport'));
exports.reviewRefundRequest=onCall(opts,req=>billingCall(req,user=>billingServices().review(user.uid,req.data),req.data?.decision==='needs_information'?'billingSupport':'billingApprover'));
exports.executeReviewedRefund=onCall(opts,req=>billingCall(req,user=>billingServices().execute(user.uid,req.data),'billingRefundOperator'));
exports.reconcileRefundRequest=onCall(opts,req=>billingCall(req,()=>billingServices().reconcile(req.data?.caseId),'billingSupport'));
exports.previewPlanChange=onCall(opts,req=>billingCall(req,async user=>{await assertPurchaseResetReady(user.uid);return billingPlans().quote(user.uid,req.data);}));
exports.confirmPlanChange=onCall(opts,req=>billingCall(req,async user=>{
  const quoteId=String(req.data&&req.data.quoteId||''),quoteSnap=await db.doc(`billingPlanQuotes/${quoteId}`).get(),quote=quoteSnap.exists?quoteSnap.data()||{}:{};
  if(quote.uid!==user.uid)throw new HttpsError('not-found','Billing quote was not found',{reason:'quote_not_found'});
  const flowKey=`plan:${quoteId}`,reservation=await reserveBillingPurchase(user.uid,'stripe',{tier:quote.tier,cadence:quote.cadence,flowKey});
  try{const result=await billingPlans().confirm(user.uid,req.data,{reservationId:reservation.reservationId});const pending=await purchaseReservationState(user.uid);if(pending&&pending.provider==='stripe'&&pending.flowKey===flowKey)await refreshBilling(user.uid,stripe(),{reservationFlowKey:flowKey,reservationId:reservation.reservationId});return result;}
  catch(error){const current=(await db.doc(`billingPlanQuotes/${quoteId}`).get()).data()||{};if(!current.providerStartedAt)await clearBillingReservation(user.uid,'stripe',{flowKey});throw error;}
}));
exports.getSubscriptionStatus=onCall(opts,req=>billingCall(req,async user=>{const client=stripe();await refreshBilling(user.uid,client);return billingPlans(client).status(user.uid);}));
exports.cancelSubscriptionRenewal=onCall(opts,req=>billingCall(req,user=>billingPlans().cancel(user.uid,req.data)));
exports.applyRefundRenewalDecision=onCall(opts,req=>billingCall(req,async user=>{
  const client=stripe(),service=billingServices(client),record=(await service.staffRead(req.data?.caseId)).case;
  if(record.revision!==req.data?.revision||record.renewalAction!=='stop_at_period_end'||!record.reviewedBy||record.decision==='needs_information')BillingService.fail('renewal_not_approved');
  const {charge}=await service.ownedCharge(record.uid,record.paymentId),invoice=await BillingEntitlements.invoiceForCharge(client,charge),subscriptionId=invoice&&BillingEntitlements.subscriptionId(invoice);
  if(!subscriptionId)BillingService.fail('payment_subscription_unavailable');
  const result=await billingPlans(client).cancel(record.uid,{subscriptionId}),ref=db.doc(`billingRefundCases/${record.id}`);
  await ref.update({renewalState:result.state,renewalSubscriptionId:subscriptionId,updatedAt:Date.now()});
  await ref.collection('events').doc(`renewal_${record.revision}`).set({at:Date.now(),actor:user.uid,action:'stop_renewal',...result});
  return{case:(await service.staffRead(record.id)).case};
},'billingRefundOperator'));
exports.getCheckoutOffer=onCall(opts,req=>billingCall(req,async user=>{await checkPurchaseAccess(user);return billingCheckout().offer(user,req.data);}));
exports.createCheckoutSession=onCall(opts,req=>billingCall(req,async user=>{
  await checkPurchaseAccess(user);
  const offerId=String(req.data&&req.data.offerId||''),offerSnap=await db.doc(`billingCheckoutOffers/${offerId}`).get(),offer=offerSnap.exists?offerSnap.data()||{}:{};
  if(offer.uid!==user.uid)throw new HttpsError('not-found','Checkout offer was not found',{reason:'checkout_offer_required'});
  const flowKey=`checkout:${offerId}`,reservation=await reserveBillingPurchase(user.uid,'stripe',{tier:offer.tier,cadence:offer.cadence,flowKey});
  try{return await billingCheckout().checkout(user,{...req.data,reservationId:reservation.reservationId});}
  catch(error){const lock=(await db.doc(`billingCheckoutLocks/${user.uid}`).get()).data()||{};if(lock.offerId!==offerId||!lock.providerStartedAt)await clearBillingReservation(user.uid,'stripe',{flowKey});throw error;}
}));
exports.getPurchaseConfirmations=onCall(opts,req=>billingCall(req,user=>billingCheckout().records(user.uid)));
exports.createBillingPortal=onCall(opts,req=>billingCall(req,async user=>{
  const client=stripe(),customer=await billingServices(client).customer(user.uid);if(!customer)BillingService.fail('billing_customer_not_found');
  const session=await client.billingPortal.sessions.create({customer,return_url:APP_URL.value(),flow_data:{type:'payment_method_update',after_completion:{type:'redirect',redirect:{return_url:APP_URL.value()+'?billing=updated'}}}});
  return{url:session.url};
}));
if(exposeGooglePlayFunctions)exports.getGooglePlayBillingConfiguration=onCall(baseOpts,async req=>{
  const user=auth(req);await assertPurchaseResetReady(user.uid);
  const configuration=googlePlayClientConfiguration(),snapshot=await db.doc(`users/${user.uid}/entitlements/current`).get(),eligibility=nativePurchaseEligibility(googlePlayPurchaseEligibility(snapshot.exists?snapshot.data():null,Date.now()));
  if(!configuration.configured)return{...configuration,...eligibility,eligible:false,reason:'configuration'};
  const reservation=await purchaseReservationState(user.uid),reservationConflict=reservation&&reservation.provider!=='google_play'?reservation.provider:null;
  try{return{...configuration,...eligibility,...await googlePlayService().registerAccount(user.uid),...(reservationConflict?{eligible:false,reason:`${reservationConflict}_pending`}:{}),pendingReservation:reservation&&reservation.provider==='google_play'?{reservationId:reservation.reservationId,tier:reservation.tier,cadence:reservation.cadence}:null};}catch(error){throw googlePlayFailure(error);}
});
if(exposeGooglePlayFunctions)exports.verifyGooglePlayPurchase=onCall(baseOpts,async req=>{
  const user=auth(req);
  try{return await googlePlayService().verifyForUser(user.uid,req.data&&req.data.purchaseToken,{reservationId:String(req.data&&req.data.reservationId||'')});}catch(error){throw googlePlayFailure(error);}
});
if(exposeGooglePlayFunctions)exports.reserveNativeBillingPurchase=onCall(opts,async req=>{
  const user=auth(req),provider=String(req.data&&req.data.provider||'');
  if(provider!=='google_play')throw new HttpsError('invalid-argument','Invalid native billing provider',{reason:'provider'});
  return reserveBillingPurchase(user.uid,provider,req.data||{});
});
if(exposeAppStoreFunctions)exports.reserveAppStoreBillingPurchase=onCall(appStorePurchaseOpts,async req=>{
  const user=auth(req),provider=String(req.data&&req.data.provider||'');
  if(provider!=='app_store')throw new HttpsError('invalid-argument','Invalid native billing provider',{reason:'provider'});
  return reserveBillingPurchase(user.uid,provider,req.data||{});
});
if(exposeGooglePlayFunctions||exposeAppStoreFunctions)exports.releaseNativeBillingPurchase=onCall(baseOpts,async req=>{
  const user=auth(req),provider=String(req.data&&req.data.provider||''),reservationId=String(req.data&&req.data.reservationId||''),outcome=String(req.data&&req.data.outcome||'');
  if(!['google_play','app_store'].includes(provider)||!/^[0-9a-f-]{36}$/i.test(reservationId)||outcome!=='provider_cancelled')throw new HttpsError('invalid-argument','Invalid native billing reservation release',{reason:'reservation'});
  const ref=db.doc(`billingPurchaseReservations/${user.uid}`),auditRef=db.doc(`billingReservationReleases/${reservationId}`);let released=false;
  await db.runTransaction(async tx=>{const snap=await tx.get(ref),data=snap.exists?snap.data()||{}:{};if(data.uid!==user.uid||data.provider!==provider||data.reservationId!==reservationId||data.status!=='provider_pending')return;tx.delete(ref);tx.set(auditRef,{schemaVersion:1,uid:user.uid,provider,reservationId,outcome,releasedAt:FieldValue.serverTimestamp()});released=true;});
  return{released};
});
if(exposeAppStoreFunctions)exports.getAppStoreBillingConfiguration=onCall(appStoreOpts,async req=>{
  const user=auth(req),snapshot=await db.doc(`users/${user.uid}/entitlements/current`).get(),eligibility=nativePurchaseEligibility(appStorePurchaseEligibility(snapshot.exists?snapshot.data():null,Date.now())),reservation=await purchaseReservationState(user.uid),reservationConflict=reservation&&reservation.provider!=='app_store'?reservation.provider:null;
  try{return{...(await appStoreService().configurationForUser(user.uid)),...eligibility,...(reservationConflict?{eligible:false,reason:`${reservationConflict}_pending`}:{}),pendingReservation:reservation&&reservation.provider==='app_store'?{reservationId:reservation.reservationId,tier:reservation.tier,cadence:reservation.cadence}:null};}
  catch(error){
    if(error instanceof AppStoreBilling.AppStoreBillingError&&error.reason==='configuration')return{schemaVersion:1,configured:false,bundleId:AppStoreBilling.BUNDLE_ID,environment:null,products:[],eligible:false,reason:'configuration'};
    throw appStoreFailure(error);
  }
});
if(exposeAppStoreFunctions)exports.verifyAppStoreTransaction=onCall(appStoreOpts,async req=>{
  const user=auth(req);
  try{return await appStoreService().verifyForUser(user.uid,req.data&&req.data.signedTransaction,{reservationId:String(req.data&&req.data.reservationId||'')});}catch(error){throw appStoreFailure(error);}
});
if(exposeAppStoreFunctions)exports.refreshAppStoreBilling=onCall(appStoreOpts,async req=>{
  const user=auth(req);
  try{return await appStoreService().refreshForUser(user.uid);}catch(error){throw appStoreFailure(error);}
});
if(exposeGooglePlayFunctions)exports.googlePlayBillingNotification=onMessagePublished({region:'europe-west2',topic:'taxmate-google-play-billing',retry:true},async event=>{
  try{return await googlePlayService().handleNotification(event);}catch(error){
    const reason=error instanceof GooglePlayBilling.GooglePlayBillingError?error.reason:'unknown';
    console.error('google-play-notification-failure',{category:reason});
    if(['notification','package','ownership','invalid-token','invalid-account'].includes(reason))return;
    throw error;
  }
});
if(exposeGooglePlayFunctions)exports.maintainGooglePlayBilling=onSchedule({region:'europe-west2',schedule:'every 15 minutes',timeoutSeconds:540},async()=>{
  const service=googlePlayService(),refresh=await service.refreshTrackedPurchases(),acknowledgements=await service.retryAcknowledgements(),orphans=await service.purgeOrphans(),tokens=await service.purgeTerminalTokens();
  return{refresh,acknowledgements,orphans,tokens};
});
if(exposeAppStoreFunctions)exports.maintainAppStoreBilling=onSchedule({region:'europe-west2',schedule:'every 6 hours',timeoutSeconds:540,secrets:[APP_STORE_ROOT_CA,APP_STORE_PRIVATE_KEY]},async()=>{
  return appStoreService().refreshTrackedSubscriptions();
});
if(exposeAppStoreFunctions)exports.appStoreServerNotificationV2=onRequest({region:'europe-west2',secrets:[APP_STORE_ROOT_CA,APP_STORE_PRIVATE_KEY]},async(req,res)=>{
  if(req.method!=='POST'){res.set('Allow','POST');return res.status(405).send('Method Not Allowed');}
  const signedPayload=req.body&&req.body.signedPayload;
  try{await appStoreService().handleNotification({signedPayload});return res.status(204).send();}
  catch(error){
    const reason=error instanceof AppStoreBilling.AppStoreBillingError?error.reason:'unknown';
    console.error('app-store-notification-failure',{category:reason});
    if(['configuration','unlinked','account-reset','provider-response','unknown'].includes(reason))return res.status(503).json({accepted:false,reason:'retry'});
    return res.status(400).json({accepted:false,reason:'invalid'});
  }
});
exports.redeemPromotion=onCall(baseOpts,async req=>{
  const user=auth(req),code=FounderPromotions.normalizeCode(req.data&&req.data.code);if(!code)throw new HttpsError('invalid-argument','Invalid promotion code');
  const promotion=db.doc(`founderPromotions/${code}`),redemption=db.doc(`promotionRedemptions/${FounderPromotions.redemptionId(code,user.uid)}`),entitlement=db.doc(`users/${user.uid}/entitlements/current`),resetRef=db.doc(`accountResets/${user.uid}`),retentionRef=db.doc(`users/${user.uid}/retention/current`);
  let result;
  await db.runTransaction(async tx=>{
    const [promotionSnap,redemptionSnap,entitlementSnap,resetSnap,retentionSnap]=await Promise.all([tx.get(promotion),tx.get(redemption),tx.get(entitlement),tx.get(resetRef),tx.get(retentionRef)]);let accountResetEpoch;
    try{accountResetEpoch=AccountWriteFence.expectedReadyEpoch(resetSnap,req.data?.accountResetEpoch);}catch(error){if(error instanceof AccountWriteFence.AccountWriteFenceError)throw new HttpsError('failed-precondition','Account deletion or reset must finish before this change can be saved',{reason:error.reason});throw error;}
    if(!promotionSnap.exists)throw new HttpsError('not-found','Promotion code not found');
    if(redemptionSnap.exists)throw new HttpsError('already-exists','Code already redeemed',{reason:'duplicate'});
    const now=Date.now(),configuration=FounderPromotions.validateConfiguration(promotionSnap.data(),now);
    if(!configuration.ok)throw promotionError(configuration.reason);
    const entitlementExpiresAt=FounderPromotions.entitlementExpiry(configuration,now),previous=entitlementSnap.exists?entitlementSnap.data():{};
    const grant={status:'active',tier:configuration.tier,startsAt:configuration.startsAt,expiresAt:entitlementExpiresAt,permanent:configuration.permanent===true,source:'founder_promo'};
    const promotions={...(previous.promotions||{}),[code]:grant};
    const effective=FounderPromotions.selectEffective(promotions,now),promotionAccess=FounderPromotions.accessProjection(promotions,now);
    tx.update(promotion,{redemptionCount:configuration.redemptionCount+1,updatedAt:FieldValue.serverTimestamp()});
    tx.create(redemption,{uid:user.uid,code,promoCode:code,grantedTier:configuration.tier,redeemedAt:FieldValue.serverTimestamp(),startsAt:configuration.startsAt,entitlementExpiresAt,source:'founder_promo',status:'active',accountResetEpoch});
    const next={promotions,promotionAccess,promotion:effective?{status:'active',tier:effective.tier,expiresAt:effective.expiresAt,promoCode:effective.code}:null};
    const storageProjection=AccountWriteFence.storageProjection(resetSnap,retentionLifecycle(previous,next,now),retentionSnap);
    tx.set(entitlement,{...next,...storageProjection,serverVerifiedAt:now,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    result={tier:configuration.tier,expiresAt:entitlementExpiresAt,permanent:configuration.permanent===true,message:FounderPromotions.successMessage({...configuration,expiresAt:entitlementExpiresAt})};
  });
  return result;
});
exports.stripeWebhook=onRequest({region:'europe-west2',secrets:[STRIPE_SECRET,STRIPE_WEBHOOK_SECRET]},async(req,res)=>{
  const client=stripe();
  return BillingWebhook.createHandler({db,client,secret:STRIPE_WEBHOOK_SECRET.value(),refresh:(uid,context)=>refreshBilling(uid,client,context),refunds:billingServices(client),checkout:billingCheckout(client),quarantineBillingEvent:quarantineStripeBillingEvent})(req,res);
});
exports.createPartnership=onCall(baseOpts,async req=>{
  const user=auth(req),code=String(req.data&&req.data.code||'').trim().toUpperCase(),bizId=String(req.data&&req.data.bizId||'').trim(),name=String(req.data&&req.data.name||'').trim();
  if(!/^[A-Z0-9]{8}$/.test(code)||!bizId||bizId.length>128||!name||name.length>120)throw new HttpsError('invalid-argument','Invalid partnership details');
  await requireTier(user.uid,'pro');
  const partnership=db.doc(`partnerships/${code}`),member=partnership.collection('members').doc(user.uid);
  await db.runTransaction(async tx=>{const [existing,accountResetEpoch]=await Promise.all([tx.get(partnership),accountWriteEpoch(tx,user.uid,req.data?.accountResetEpoch)]);if(existing.exists)throw new HttpsError('already-exists','Partnership code already exists');tx.create(partnership,{bizId,name,structure:'partnership',createdBy:user.uid,createdAt:FieldValue.serverTimestamp(),v:1});tx.create(member,{uid:user.uid,role:'owner',joinedAt:FieldValue.serverTimestamp(),accountResetEpoch});});
  return{bizId,name,code};
});
exports.joinPartnership=onCall(baseOpts,async req=>{
  const user=auth(req),code=String(req.data&&req.data.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{6}([A-Z0-9]{2})?$/.test(code))throw new HttpsError('invalid-argument','Invalid partnership code');
  await requireTier(user.uid,'pro');
  const partnership=db.doc(`partnerships/${code}`),member=partnership.collection('members').doc(user.uid);let data;
  await db.runTransaction(async tx=>{const [snap,accountResetEpoch]=await Promise.all([tx.get(partnership),accountWriteEpoch(tx,user.uid,req.data?.accountResetEpoch)]);if(!snap.exists)throw new HttpsError('not-found','Partnership not found');data=snap.data()||{};tx.set(member,{uid:user.uid,role:'member',joinedAt:FieldValue.serverTimestamp(),accountResetEpoch},{merge:true});});
  return{bizId:data.bizId,name:data.name||'Partnership'};
});
const ltdSetup=LtdSetup.createHandlers({db,FieldValue,HttpsError,authenticate:auth,requireTier});
exports.claimActiveLtdCompany=onCall(baseOpts,ltdSetup.claim);
exports.manageLtdSetup=onCall(baseOpts,ltdSetup.manage);
exports.lookupCompaniesHouse=onCall({...baseOpts,secrets:[COMPANIES_HOUSE_API_KEY]},CompaniesHouseLookup.createHandler({HttpsError,authenticate:auth,requireTier,apiKey:()=>COMPANIES_HOUSE_API_KEY.value()}));
exports.leavePartnership=onCall(baseOpts,async req=>{
  const user=auth(req),code=String(req.data&&req.data.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{6}([A-Z0-9]{2})?$/.test(code))throw new HttpsError('invalid-argument','Invalid partnership code');
  const partnership=db.doc(`partnerships/${code}`),member=partnership.collection('members').doc(user.uid);let deletePartnership=false;
  await db.runTransaction(async tx=>{const [memberSnap,allMembers]=await Promise.all([tx.get(member),tx.get(partnership.collection('members')),accountWriteEpoch(tx,user.uid,req.data?.accountResetEpoch)]);if(!memberSnap.exists)throw new HttpsError('permission-denied','Not a partnership member');deletePartnership=allMembers.docs.every(doc=>doc.id===user.uid);tx.delete(member);});
  if(deletePartnership)await db.recursiveDelete(partnership);
  await AdmissionLifecycle.cleanupUid({db,uid:user.uid,partnershipId:code});
  return{left:true,partnershipDeleted:deletePartnership};
});
exports.deleteAccountData=onCall(accountDeletionOpts,async req=>{
  const user=auth(req),uid=user.uid,resetRef=db.doc(`accountResets/${uid}`),entitlementRef=db.doc(`users/${uid}/entitlements/current`),reservationRef=db.doc(`billingPurchaseReservations/${uid}`);let correlationId=crypto.randomUUID(),deletionStartedAt=Date.now(),resetEpoch=0,resumeQuarantined=false,resumeIdentityDeletion=false,alreadyDeleted=false;
  await db.runTransaction(async tx=>{
    const [resetSnap,reservationSnap]=await Promise.all([tx.get(resetRef),tx.get(reservationRef)]),prior=resetSnap.exists?resetSnap.data()||{}:{},status=String(prior.status||''),epoch=prior.resetEpoch==null?0:Number(prior.resetEpoch);
    if(!Number.isSafeInteger(epoch)||epoch<0||status&&!['complete','deleting','failed','billing_quarantined','identity_deleting','deleted'].includes(status))throw new HttpsError('failed-precondition','Account reset state is invalid',{reason:'account_reset'});
    if(status==='deleting')throw new HttpsError('failed-precondition','Account deletion is already in progress',{reason:'account_reset'});
    resetEpoch=epoch;
    if(status==='deleted'||status==='identity_deleting'){
      correlationId=String(prior.deletionId||prior.correlationId||'');if(!correlationId)throw new HttpsError('failed-precondition','Account deletion recovery identity is missing',{reason:'account_reset'});
      alreadyDeleted=status==='deleted';resumeIdentityDeletion=status==='identity_deleting';return;
    }
    if(reservationSnap.exists&&reservationSnap.data().status==='provider_pending')throw new HttpsError('failed-precondition','A provider purchase must be reconciled before deleting TaxMate data',{reason:'billing_purchase_pending'});
    if(status==='billing_quarantined'||status==='failed'&&prior.billingQuarantined===true){resumeQuarantined=true;correlationId=String(prior.deletionId||prior.correlationId||'');deletionStartedAt=Number(prior.deletionStartedAt)||deletionStartedAt;if(!correlationId)throw new HttpsError('failed-precondition','Account deletion recovery identity is missing',{reason:'account_reset'});tx.set(resetRef,{...prior,schemaVersion:1,status:'billing_quarantined',resetEpoch,correlationId,deletionId:correlationId,deletionStartedAt,updatedAt:FieldValue.serverTimestamp()});tx.set(entitlementRef,{accountResetStatus:'billing_quarantined',accountResetEpoch:resetEpoch,accountResetEpochString:String(resetEpoch)},{merge:true});return;}
    tx.set(resetRef,{schemaVersion:1,status:'deleting',resetEpoch,correlationId,deletionId:correlationId,deletionStartedAt,billingEventWatermark:null,billingEventProvider:null,updatedAt:FieldValue.serverTimestamp()});
    tx.set(entitlementRef,{accountResetStatus:'deleting',accountResetEpoch:resetEpoch,accountResetEpochString:String(resetEpoch)},{merge:true});
  });
  let stripeCustomerId=null,customer,customerRef,stage='billing_preflight',partnershipRecordsRetained=0,partnershipsDeleted=0,destructiveStarted=false;
  try{
    if(alreadyDeleted)return{deleted:true,resetEpoch,authIdentityDeleted:true,partnershipRecordsRetained:0,partnershipsDeleted:0};
    if(resumeIdentityDeletion){stage='identity_deleting';const completedEpoch=await finalizeDeletedAuthIdentity(uid,correlationId);return{deleted:true,resetEpoch:completedEpoch,authIdentityDeleted:true,partnershipRecordsRetained:0,partnershipsDeleted:0};}
    if(!resumeQuarantined){
    customerRef=db.doc(`billingCustomers/${uid}`);
    const [customerSnap,playMappings,appStoreAccount,appStoreTokens,appStoreMappings,appStoreNotifications]=await Promise.all([customerRef.get(),db.collection('googlePlayPurchaseTokens').where('uid','==',uid).get(),db.doc(`appStoreAccounts/${uid}`).get(),db.collection('appStoreAccountTokens').where('uid','==',uid).get(),db.collection('appStoreTransactions').where('uid','==',uid).get(),db.collection('appStoreNotifications').where('uid','==',uid).get()]);customer=customerSnap;
    const playCurrentMappings=playMappings.docs.filter(row=>{const data=row.data()||{};return data.accountDeleted!==true&&Number(data.resetEpoch||0)===resetEpoch;});
    if(playCurrentMappings.length){try{await googlePlayService().refreshForUser(uid,{expectedResetEpoch:resetEpoch,allowDeletingReset:true});}catch(error){throw new HttpsError('failed-precondition','Google Play subscription status must be checked before deleting TaxMate data',{reason:'google_play_status_required'});}}
    const entitlement=await db.doc(`users/${uid}/entitlements/current`).get(),entitlementData=entitlement.exists?entitlement.data()||{}:{},playStates=Object.values(entitlementData.googlePlaySubscriptions||{}).map(item=>item&&item.status),appStoreStates=Object.values(entitlementData.appStoreSubscriptions||{}).map(item=>item&&item.status);
    if(ACTIVE_SUBSCRIPTIONS.has(String(entitlementData.subscriptionStatus||''))&&TIER_WEIGHT[String(entitlementData.paidTier||'free')]>0)throw new HttpsError('failed-precondition','Active billing must be resolved before deleting TaxMate data',{reason:'active_billing'});
    if(entitlementData.googlePlayAccess?.active===true&&Number(entitlementData.googlePlayAccess.expiresAt)>Date.now()||playStates.some(status=>['pending','on_hold','paused','in_grace_period'].includes(status))||playCurrentMappings.length&&!playStates.length)throw new HttpsError('failed-precondition','Active Google Play billing must be resolved before deleting TaxMate data',{reason:'active_google_play_billing'});
    if(entitlementData.appStoreAccess?.active===true&&Number(entitlementData.appStoreAccess.expiresAt)>Date.now()||appStoreStates.some(status=>['active','billing_retry','billing_grace_period'].includes(status)))throw new HttpsError('failed-precondition','App Store subscription status must be resolved before deleting TaxMate data',{reason:'active_app_store_billing'});
    const appStoreEvidence=BillingDeletionSafety.appStoreDeletionEvidence({uid,resetEpoch,account:appStoreAccount.exists?appStoreAccount.data()||{}:null,tokens:appStoreTokens.docs.map(row=>({id:row.id,value:row.data()||{}})),transactions:appStoreMappings.docs.map(row=>({id:row.id,value:row.data()||{}})),notifications:appStoreNotifications.docs.map(row=>({id:row.id,value:row.data()||{}})),entitlement:entitlementData});
    if(!appStoreEvidence.safe)throw new HttpsError('failed-precondition','App Store subscription status must be checked before deleting TaxMate data',{reason:'app_store_status_required'});
    if(customer.exists){
      stripeCustomerId=String(customer.data().stripeCustomerId||'');if(!/^cus_[A-Za-z0-9]+$/.test(stripeCustomerId))throw new Error('billing_reference_invalid');
      const client=stripe(),[subscriptions,invoices]=await Promise.all([BillingDeletionSafety.listAllStripe(params=>client.subscriptions.list(params),{customer:stripeCustomerId,status:'all'}),BillingDeletionSafety.listAllStripe(params=>client.invoices.list(params),{customer:stripeCustomerId})]);
      const liveSubscription=subscriptions.some(item=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(String(item&&item.status||''))),openInvoice=invoices.some(item=>['open','draft'].includes(String(item&&item.status||''))&&Number(item&&item.amount_remaining||item&&item.amount_due||0)>0);
      if(liveSubscription||openInvoice)throw new HttpsError('failed-precondition','Active Stripe billing must be resolved before deleting TaxMate data',{reason:'active_billing'});
    }
    stage='billing_identity_quarantine';await enterDeletionBillingQuarantine({uid,resetRef,reservationRef,correlationId,resetEpoch,startedAt:deletionStartedAt});destructiveStarted=true;
    }else{stage='billing_quarantine_resume';destructiveStarted=true;}
    await deleteGooglePlayAccountData(uid,{deletionId:correlationId,resetEpoch});
    await deleteAppStoreAccountData(uid,{deletionId:correlationId,resetEpoch});
    stage='admissions';await AdmissionLifecycle.cleanupUid({db,uid,force:true});
    stage='memberships';
    const memberships=await db.collectionGroup('members').where('uid','==',uid).get();
    for(const member of memberships.docs){const partnership=member.ref.parent.parent;if(!partnership)continue;const [root,allMembers]=await Promise.all([partnership.get(),partnership.collection('members').get()]),otherMembers=allMembers.docs.filter(doc=>doc.id!==uid);if(!otherMembers.length&&root.exists&&String((root.data()||{}).createdBy||'')===uid){await db.recursiveDelete(partnership);partnershipsDeleted++;}else{await member.ref.delete();partnershipRecordsRetained++;}}
    stage='storage';const bucket=getStorage().bucket(),[receiptFiles]=await bucket.getFiles({prefix:`receipts/${uid}/`});
    for(const file of receiptFiles)await ReceiptCleanup.cleanupReceiptWithRetry({db,bucket,path:file.name,ignorePersonalUid:uid});
    stage='promotions';const redemptions=await db.collection('promotionRedemptions').where('uid','==',uid).get();for(let i=0;i<redemptions.docs.length;i+=400){const batch=db.batch();for(const doc of redemptions.docs.slice(i,i+400))batch.delete(doc.ref);await batch.commit();}
    stage='user_data';await db.recursiveDelete(db.doc(`users/${uid}`));await db.doc(`accountClaims/${uid}`).delete().catch(()=>{});await db.recursiveDelete(db.doc(`accountQuarantines/${uid}`)).catch(()=>{});
    stage='identity_handoff';await beginIdentityDeletionAfterBillingQuarantine({resetRef,reservationRef,correlationId,resetEpoch});
    stage='identity_deleting';
    const completedEpoch=await finalizeDeletedAuthIdentity(uid,correlationId);
    return{deleted:true,resetEpoch:completedEpoch,partnershipRecordsRetained,partnershipsDeleted,authIdentityDeleted:true};
  }catch(error){
    if(stage==='identity_deleting'){
      console.error('account-deletion-identity-pending',{category:'account_deletion',correlationId});
      throw new HttpsError('unavailable','Account identity deletion is still pending and will be retried',{reason:'auth_deletion_pending',correlationId});
    }
    const reason=error instanceof HttpsError&&error.details&&error.details.reason,recoverable=!destructiveStarted&&['active_billing','active_google_play_billing','active_app_store_billing','google_play_status_required','app_store_status_required','billing_purchase_pending','billing_provider_event_pending'].includes(reason);
    await db.runTransaction(async tx=>{const entitlement=await tx.get(entitlementRef);tx.set(resetRef,recoverable?{schemaVersion:1,status:'complete',resetEpoch,correlationId,lastDeletionBlockedReason:reason,updatedAt:FieldValue.serverTimestamp()}:{schemaVersion:1,status:'failed',resetEpoch,correlationId,deletionId:correlationId,deletionStartedAt,billingQuarantined:destructiveStarted===true,failedStage:stage,updatedAt:FieldValue.serverTimestamp()});if(entitlement.exists)tx.set(entitlementRef,{accountResetStatus:recoverable?'complete':'failed',accountResetEpoch:resetEpoch,accountResetEpochString:String(resetEpoch)},{merge:true});}).catch(()=>{});
    console.error('account-deletion-failed',{category:'account_deletion',stage,correlationId,recoverable});if(error instanceof HttpsError)throw error;throw new HttpsError('internal','Account deletion could not be completed',{reason:'delete_pipeline_failed',stage,correlationId});
  }
});

if(process.env.FUNCTIONS_EMULATOR==='true'){
  exports.runRetentionPurgeDemo=onCall(baseOpts,async req=>{
    const user=auth(req),projectId=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
    try{return await RetentionWorker.retentionRun({db,bucket:getStorage().bucket(),uid:user.uid,projectId});}
    catch(error){console.error('retention-demo-failed',{category:'retention',safeCode:String(error&&error.message||'failed').replace(/[^a-z0-9_-]/gi,'_').slice(0,80)});throw new HttpsError('internal','Retention processing stopped safely',{reason:'retention_failed'});}
  });
}
