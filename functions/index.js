'use strict';
const crypto=require('node:crypto');
const {onCall,HttpsError,onRequest}=require('firebase-functions/v2/https');
const {onDocumentWritten,onDocumentCreated}=require('firebase-functions/v2/firestore');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app'); const {getFirestore,FieldValue}=require('firebase-admin/firestore'); const {getStorage}=require('firebase-admin/storage');
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
const STRIPE_SECRET=defineSecret('STRIPE_SECRET_KEY'), STRIPE_WEBHOOK_SECRET=defineSecret('STRIPE_WEBHOOK_SECRET'), COMPANIES_HOUSE_API_KEY=defineSecret('COMPANIES_HOUSE_API_KEY');
const PLUS_MONTHLY_PRICE=defineString('STRIPE_PLUS_MONTHLY_PRICE_ID',{default:''}),PLUS_ANNUAL_PRICE=defineString('STRIPE_PLUS_ANNUAL_PRICE_ID',{default:''});
const PRO_MONTHLY_PRICE=defineString('STRIPE_PRO_MONTHLY_PRICE_ID',{default:''}),PRO_ANNUAL_PRICE=defineString('STRIPE_PRO_ANNUAL_PRICE_ID',{default:''});
const LEGACY_PLUS_PRICES=defineString('STRIPE_PLUS_LEGACY_PRICE_IDS',{default:''}),LEGACY_PRO_PRICES=defineString('STRIPE_PRO_LEGACY_PRICE_IDS',{default:''});
const LEGACY_PRO_ANNUAL_PRICES=defineString('STRIPE_PRO_LEGACY_ANNUAL_PRICE_IDS',{default:''});
const APP_URL=defineString('PUBLIC_APP_URL',{default:'https://www.taxmate.uk'});
const BILLING_MONEY_OPERATIONS=defineString('BILLING_MONEY_OPERATIONS_ENABLED',{default:'false'});
const BILLING_CONSUMER_DISCLOSURES=defineString('BILLING_CONSUMER_DISCLOSURES_READY',{default:'false'});
const baseOpts={region:'europe-west2',enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true'},opts={...baseOpts,secrets:[STRIPE_SECRET]};
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
  try{return req.data?.records?await ReceiptAdmission.prepareBatch({db,uid:user.uid,records:req.data.records}):await ReceiptAdmission.prepareWrite({db,uid:user.uid,target:req.data?.target,payload:req.data?.payload});}
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
  if(['deleting','failed'].includes(event.data?.after.data()?.status))return AdmissionLifecycle.cleanupUid({db,uid:event.params.uid});
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
function billingFailure(category){
  console.error('billing-failure',{category});
  return new HttpsError('internal','Payments are temporarily unavailable',{reason:category});
}
function auth(req){ if(!req.auth) throw new HttpsError('unauthenticated','Sign in required',{reason:'auth-required'}); return req.auth; }
const TIER_WEIGHT=Object.freeze({free:0,plus:1,pro:2}),ACTIVE_SUBSCRIPTIONS=new Set(['active','trialing']);
function effectiveTier(entitlement,now=Date.now()){
  const data=entitlement&&typeof entitlement==='object'?entitlement:{};
  const paid=ACTIVE_SUBSCRIPTIONS.has(data.subscriptionStatus)&&TIER_WEIGHT[data.paidTier]>0&&(!data.currentPeriodEnd||Number(now)<Number(data.currentPeriodEnd))?data.paidTier:'free';
  const promotion=FounderPromotions.selectEffective(data.promotions,now)||(data.promotion&&FounderPromotions.activeGrant(data.promotion,now)?data.promotion:null);
  const promoted=promotion&&TIER_WEIGHT[promotion.tier]>0?promotion.tier:'free';
  const projected=data.paidAccess,funded=projected?(Number(projected.proExpiresAt)>now?'pro':Number(projected.plusExpiresAt)>now?'plus':'free'):paid;
  return TIER_WEIGHT[promoted]>TIER_WEIGHT[funded]?promoted:funded;
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
function priceDescriptor(priceId){return BillingPrices.describe(billingPriceConfiguration(),priceId);}
function subscriptionPeriodEnd(subscription){
  const itemEnds=(subscription.items&&subscription.items.data||[]).map(item=>Number(item.current_period_end||0));
  return Math.max(Number(subscription.current_period_end||0),...itemEnds,0)*1000;
}
async function customerFor(user,client=stripe()){
  const ref=db.doc(`billingCustomers/${user.uid}`), snap=await ref.get(); if(snap.exists) return snap.data().stripeCustomerId;
  const c=await client.customers.create({email:user.token.email,metadata:{firebaseUid:user.uid}},{idempotencyKey:`taxmate-customer-${user.uid}`}); await ref.set({stripeCustomerId:c.id,createdAt:FieldValue.serverTimestamp()}); return c.id;
}
function refreshBilling(uid,client=stripe()){return BillingEntitlements.reconcile({db,client,uid,descriptor:priceDescriptor,retentionLifecycle});}
function billingServices(client=stripe()){return BillingService.createService({db,client,moneyOperationsEnabled:BILLING_MONEY_OPERATIONS.value()==='true',onRefundChanged:uid=>refreshBilling(uid,client),readReviewContext:(caseRecord,previewAmountMinor)=>BillingReviewContext.readContext({db,client,caseRecord,previewAmountMinor,descriptor:priceDescriptor,effectiveTier})});}
function billingPlans(client=stripe()){return BillingPlans.createService({db,client,descriptor:priceDescriptor,priceFor:(tier,cadence)=>BillingPrices.current(billingPriceConfiguration(),tier,cadence),moneyOperationsEnabled:BILLING_MONEY_OPERATIONS.value()==='true',refresh:uid=>refreshBilling(uid,client)});}
function billingCheckout(client=stripe()){const demo=process.env.FUNCTIONS_EMULATOR==='true'&&String(process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'').startsWith('demo-');return BillingCheckout.createService({db,client,targetPrice:billingPlans(client).targetPrice,customerFor,appUrl:APP_URL.value(),moneyOperationsEnabled:BILLING_MONEY_OPERATIONS.value()==='true',consumerDisclosuresReady:BILLING_CONSUMER_DISCLOSURES.value()==='true'&&(BillingCheckout.supplierDisclosureVerified||demo)});}
async function checkPurchaseAccess(user){const snap=await db.doc(`users/${user.uid}/entitlements/current`).get();if(snap.exists&&FounderPromotions.hasPermanentPro(snap.data().promotions,Date.now()))throw new HttpsError('already-exists','You already have permanent Pro access.');}
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
exports.previewPlanChange=onCall(opts,req=>billingCall(req,user=>billingPlans().quote(user.uid,req.data)));
exports.confirmPlanChange=onCall(opts,req=>billingCall(req,user=>billingPlans().confirm(user.uid,req.data)));
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
exports.createCheckoutSession=onCall(opts,req=>billingCall(req,async user=>{await checkPurchaseAccess(user);return billingCheckout().checkout(user,req.data);}));
exports.getPurchaseConfirmations=onCall(opts,req=>billingCall(req,user=>billingCheckout().records(user.uid)));
exports.createBillingPortal=onCall(opts,req=>billingCall(req,async user=>{
  const client=stripe(),customer=await billingServices(client).customer(user.uid);if(!customer)BillingService.fail('billing_customer_not_found');
  const session=await client.billingPortal.sessions.create({customer,return_url:APP_URL.value(),flow_data:{type:'payment_method_update',after_completion:{type:'redirect',redirect:{return_url:APP_URL.value()+'?billing=updated'}}}});
  return{url:session.url};
}));
exports.redeemPromotion=onCall(baseOpts,async req=>{
  const user=auth(req),code=FounderPromotions.normalizeCode(req.data&&req.data.code);if(!code)throw new HttpsError('invalid-argument','Invalid promotion code');
  const promotion=db.doc(`founderPromotions/${code}`),redemption=db.doc(`promotionRedemptions/${FounderPromotions.redemptionId(code,user.uid)}`),entitlement=db.doc(`users/${user.uid}/entitlements/current`);
  let result;
  await db.runTransaction(async tx=>{
    const [promotionSnap,redemptionSnap,entitlementSnap]=await Promise.all([tx.get(promotion),tx.get(redemption),tx.get(entitlement)]);
    if(!promotionSnap.exists)throw new HttpsError('not-found','Promotion code not found');
    if(redemptionSnap.exists)throw new HttpsError('already-exists','Code already redeemed',{reason:'duplicate'});
    const now=Date.now(),configuration=FounderPromotions.validateConfiguration(promotionSnap.data(),now);
    if(!configuration.ok)throw promotionError(configuration.reason);
    const entitlementExpiresAt=FounderPromotions.entitlementExpiry(configuration,now),previous=entitlementSnap.exists?entitlementSnap.data():{};
    const grant={status:'active',tier:configuration.tier,startsAt:configuration.startsAt,expiresAt:entitlementExpiresAt,permanent:configuration.permanent===true,source:'founder_promo'};
    const promotions={...(previous.promotions||{}),[code]:grant};
    const effective=FounderPromotions.selectEffective(promotions,now),promotionAccess=FounderPromotions.accessProjection(promotions,now);
    tx.update(promotion,{redemptionCount:configuration.redemptionCount+1,updatedAt:FieldValue.serverTimestamp()});
    tx.create(redemption,{uid:user.uid,code,promoCode:code,grantedTier:configuration.tier,redeemedAt:FieldValue.serverTimestamp(),startsAt:configuration.startsAt,entitlementExpiresAt,source:'founder_promo',status:'active'});
    const next={promotions,promotionAccess,promotion:effective?{status:'active',tier:effective.tier,expiresAt:effective.expiresAt,promoCode:effective.code}:null};
    tx.set(entitlement,{...next,accountRetention:retentionLifecycle(previous,next,now),serverVerifiedAt:now,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    result={tier:configuration.tier,expiresAt:entitlementExpiresAt,permanent:configuration.permanent===true,message:FounderPromotions.successMessage({...configuration,expiresAt:entitlementExpiresAt})};
  });
  return result;
});
exports.stripeWebhook=onRequest({region:'europe-west2',secrets:[STRIPE_SECRET,STRIPE_WEBHOOK_SECRET]},async(req,res)=>{
  const client=stripe();
  return BillingWebhook.createHandler({db,client,secret:STRIPE_WEBHOOK_SECRET.value(),refresh:uid=>refreshBilling(uid,client),refunds:billingServices(client),checkout:billingCheckout(client)})(req,res);
});
exports.createPartnership=onCall(baseOpts,async req=>{
  const user=auth(req),code=String(req.data&&req.data.code||'').trim().toUpperCase(),bizId=String(req.data&&req.data.bizId||'').trim(),name=String(req.data&&req.data.name||'').trim();
  if(!/^[A-Z0-9]{8}$/.test(code)||!bizId||bizId.length>128||!name||name.length>120)throw new HttpsError('invalid-argument','Invalid partnership details');
  await requireTier(user.uid,'pro');
  const partnership=db.doc(`partnerships/${code}`),member=partnership.collection('members').doc(user.uid);
  await db.runTransaction(async tx=>{const existing=await tx.get(partnership);if(existing.exists)throw new HttpsError('already-exists','Partnership code already exists');tx.create(partnership,{bizId,name,structure:'partnership',createdBy:user.uid,createdAt:FieldValue.serverTimestamp(),v:1});tx.create(member,{uid:user.uid,role:'owner',joinedAt:FieldValue.serverTimestamp()});});
  return{bizId,name,code};
});
exports.joinPartnership=onCall(baseOpts,async req=>{
  const user=auth(req),code=String(req.data&&req.data.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{6}([A-Z0-9]{2})?$/.test(code))throw new HttpsError('invalid-argument','Invalid partnership code');
  await requireTier(user.uid,'pro');
  const partnership=db.doc(`partnerships/${code}`),snap=await partnership.get();
  if(!snap.exists)throw new HttpsError('not-found','Partnership not found');
  await partnership.collection('members').doc(user.uid).set({uid:user.uid,role:'member',joinedAt:FieldValue.serverTimestamp()},{merge:true});
  const data=snap.data()||{};return{bizId:data.bizId,name:data.name||'Partnership'};
});
const ltdSetup=LtdSetup.createHandlers({db,FieldValue,HttpsError,authenticate:auth,requireTier});
exports.claimActiveLtdCompany=onCall(baseOpts,ltdSetup.claim);
exports.manageLtdSetup=onCall(baseOpts,ltdSetup.manage);
exports.lookupCompaniesHouse=onCall({...baseOpts,secrets:[COMPANIES_HOUSE_API_KEY]},CompaniesHouseLookup.createHandler({HttpsError,authenticate:auth,requireTier,apiKey:()=>COMPANIES_HOUSE_API_KEY.value()}));
exports.leavePartnership=onCall(baseOpts,async req=>{
  const user=auth(req),code=String(req.data&&req.data.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{6}([A-Z0-9]{2})?$/.test(code))throw new HttpsError('invalid-argument','Invalid partnership code');
  const partnership=db.doc(`partnerships/${code}`),member=partnership.collection('members').doc(user.uid),memberSnap=await member.get();
  if(!memberSnap.exists)throw new HttpsError('permission-denied','Not a partnership member');
  const allMembers=await partnership.collection('members').get(),others=allMembers.docs.filter(doc=>doc.id!==user.uid);
  if(others.length)await member.delete();else await db.recursiveDelete(partnership);
  await AdmissionLifecycle.cleanupUid({db,uid:user.uid,partnershipId:code});
  return{left:true,partnershipDeleted:others.length===0};
});
exports.deleteAccountData=onCall(opts,async req=>{
  const user=auth(req),uid=user.uid;
  const customerRef=db.doc(`billingCustomers/${uid}`),customer=await customerRef.get(),entitlement=await db.doc(`users/${uid}/entitlements/current`).get(),entitlementData=entitlement.exists?entitlement.data()||{}:{};
  if(ACTIVE_SUBSCRIPTIONS.has(String(entitlementData.subscriptionStatus||''))&&TIER_WEIGHT[String(entitlementData.paidTier||'free')]>0)throw new HttpsError('failed-precondition','Active billing must be resolved before deleting TaxMate data',{reason:'active_billing'});
  let stripeCustomerId=null;
  const resetRef=db.doc(`accountResets/${uid}`),priorReset=await resetRef.get(),resetEpoch=Math.max(Date.now(),Number(priorReset.exists&&priorReset.data().resetEpoch||0)+1),correlationId=crypto.randomUUID();
  await resetRef.set({schemaVersion:1,status:'deleting',resetEpoch,correlationId,updatedAt:FieldValue.serverTimestamp()});
  let stage='billing_preflight',partnershipRecordsRetained=0,partnershipsDeleted=0;
  try{
    if(customer.exists){
      stripeCustomerId=String(customer.data().stripeCustomerId||'');if(!/^cus_[A-Za-z0-9]+$/.test(stripeCustomerId))throw new Error('billing_reference_invalid');
      const client=stripe(),[subscriptions,invoices]=await Promise.all([client.subscriptions.list({customer:stripeCustomerId,status:'all',limit:100}),client.invoices.list({customer:stripeCustomerId,limit:100})]);
      if(subscriptions.data.length||invoices.data.some(item=>item.paid&&Number(item.amount_paid)>0))throw new Error('billing_history_present');
    }
    stage='admissions';await AdmissionLifecycle.cleanupUid({db,uid,force:true});
    stage='memberships';
    const memberships=await db.collectionGroup('members').where('uid','==',uid).get();
    for(const member of memberships.docs){const partnership=member.ref.parent.parent;if(!partnership)continue;const [root,allMembers]=await Promise.all([partnership.get(),partnership.collection('members').get()]),otherMembers=allMembers.docs.filter(doc=>doc.id!==uid);if(!otherMembers.length&&root.exists&&String((root.data()||{}).createdBy||'')===uid){await db.recursiveDelete(partnership);partnershipsDeleted++;}else{await member.ref.delete();partnershipRecordsRetained++;}}
    stage='storage';const bucket=getStorage().bucket(),[receiptFiles]=await bucket.getFiles({prefix:`receipts/${uid}/`});
    for(const file of receiptFiles)await ReceiptCleanup.cleanupReceiptWithRetry({db,bucket,path:file.name,ignorePersonalUid:uid});
    stage='promotions';const redemptions=await db.collection('promotionRedemptions').where('uid','==',uid).get();for(let i=0;i<redemptions.docs.length;i+=400){const batch=db.batch();for(const doc of redemptions.docs.slice(i,i+400))batch.delete(doc.ref);await batch.commit();}
    stage='billing';if(customer.exists){try{await stripe().customers.del(stripeCustomerId);}catch(error){if(error&&error.code!=='resource_missing')throw error;}await customerRef.delete();}
    stage='user_data';await db.recursiveDelete(db.doc(`users/${uid}`));await db.doc(`accountClaims/${uid}`).delete().catch(()=>{});await db.recursiveDelete(db.doc(`accountQuarantines/${uid}`)).catch(()=>{});
    stage='complete';await resetRef.set({schemaVersion:1,status:'complete',resetEpoch,correlationId,updatedAt:FieldValue.serverTimestamp()});
    return{deleted:true,resetEpoch,partnershipRecordsRetained,partnershipsDeleted,authIdentityRetained:true};
  }catch(error){await resetRef.set({schemaVersion:1,status:'failed',resetEpoch,correlationId,failedStage:stage,updatedAt:FieldValue.serverTimestamp()}).catch(()=>{});console.error('account-deletion-failed',{category:'account_deletion',stage,correlationId});throw new HttpsError('internal','Account deletion could not be completed',{reason:'delete_pipeline_failed',stage,correlationId});}
});

if(process.env.FUNCTIONS_EMULATOR==='true'){
  exports.runRetentionPurgeDemo=onCall(baseOpts,async req=>{
    const user=auth(req),projectId=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
    try{return await RetentionWorker.retentionRun({db,bucket:getStorage().bucket(),uid:user.uid,projectId});}
    catch(error){console.error('retention-demo-failed',{category:'retention',safeCode:String(error&&error.message||'failed').replace(/[^a-z0-9_-]/gi,'_').slice(0,80)});throw new HttpsError('internal','Retention processing stopped safely',{reason:'retention_failed'});}
  });
}
