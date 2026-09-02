'use strict';
const crypto=require('node:crypto');
const {onCall,HttpsError,onRequest}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app'); const {getFirestore,FieldValue}=require('firebase-admin/firestore'); const {getStorage}=require('firebase-admin/storage');
const Stripe=require('stripe'); initializeApp(); const db=getFirestore();
const FounderPromotions=require('./founder-promotions');
const CompaniesHouseLookup=require('./companies-house-lookup');
const STRIPE_SECRET=defineSecret('STRIPE_SECRET_KEY'), STRIPE_WEBHOOK_SECRET=defineSecret('STRIPE_WEBHOOK_SECRET'), COMPANIES_HOUSE_API_KEY=defineSecret('COMPANIES_HOUSE_API_KEY');
const PLUS_MONTHLY_PRICE=defineString('STRIPE_PLUS_MONTHLY_PRICE_ID',{default:''}),PLUS_ANNUAL_PRICE=defineString('STRIPE_PLUS_ANNUAL_PRICE_ID',{default:''});
const PRO_MONTHLY_PRICE=defineString('STRIPE_PRO_MONTHLY_PRICE_ID',{default:''}),PRO_ANNUAL_PRICE=defineString('STRIPE_PRO_ANNUAL_PRICE_ID',{default:''});
const LEGACY_PLUS_PRICES=defineString('STRIPE_PLUS_LEGACY_PRICE_IDS',{default:''}),LEGACY_PRO_PRICES=defineString('STRIPE_PRO_LEGACY_PRICE_IDS',{default:''});
const APP_URL=defineString('PUBLIC_APP_URL',{default:'https://www.taxmate.uk'});
const baseOpts={region:'europe-west2',enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true'},opts={...baseOpts,secrets:[STRIPE_SECRET]};
function stripe(){
  const key=STRIPE_SECRET.value();
  if(!key||key!==key.trim()||/[\r\n]/.test(key))throw new HttpsError('failed-precondition','Billing configuration unavailable',{reason:'billing-config'});
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
  return TIER_WEIGHT[promoted]>TIER_WEIGHT[paid]?promoted:paid;
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
function priceDescriptor(priceId){
  const configured=[
    [PLUS_MONTHLY_PRICE.value(),'plus','monthly'],[PLUS_ANNUAL_PRICE.value(),'plus','yearly'],
    [PRO_MONTHLY_PRICE.value(),'pro','monthly'],[PRO_ANNUAL_PRICE.value(),'pro','yearly']
  ].find(([id])=>id&&id===priceId);
  if(configured)return{tier:configured[1],cadence:configured[2]};
  const legacy=(value,tier)=>String(value||'').split(',').map(id=>id.trim()).filter(Boolean).includes(priceId)?{tier,cadence:'monthly',legacy:true}:null;
  return legacy(LEGACY_PLUS_PRICES.value(),'plus')||legacy(LEGACY_PRO_PRICES.value(),'pro')||{tier:'free',cadence:null};
}
function subscriptionPeriodEnd(subscription){
  const itemEnds=(subscription.items&&subscription.items.data||[]).map(item=>Number(item.current_period_end||0));
  return Math.max(Number(subscription.current_period_end||0),...itemEnds,0)*1000;
}
async function customerFor(user,client=stripe()){
  const ref=db.doc(`billingCustomers/${user.uid}`), snap=await ref.get(); if(snap.exists) return snap.data().stripeCustomerId;
  const c=await client.customers.create({email:user.token.email,metadata:{firebaseUid:user.uid}},{idempotencyKey:`taxmate-customer-${user.uid}`}); await ref.set({stripeCustomerId:c.id,createdAt:FieldValue.serverTimestamp()}); return c.id;
}
exports.createCheckoutSession=onCall(opts,async req=>{
  const user=auth(req),tier=req.data&&req.data.tier,cadence=req.data&&req.data.cadence||'monthly';if(!['plus','pro'].includes(tier))throw new HttpsError('invalid-argument','Invalid tier');if(!['monthly','yearly'].includes(cadence))throw new HttpsError('invalid-argument','Invalid billing cadence');
  const entitlementSnap=await db.doc(`users/${user.uid}/entitlements/current`).get();
  if(entitlementSnap.exists&&FounderPromotions.hasPermanentPro(entitlementSnap.data().promotions,Date.now()))throw new HttpsError('already-exists','You already have permanent Pro access.');
  const price=({plus:{monthly:PLUS_MONTHLY_PRICE.value(),yearly:PLUS_ANNUAL_PRICE.value()},pro:{monthly:PRO_MONTHLY_PRICE.value(),yearly:PRO_ANNUAL_PRICE.value()}})[tier][cadence];if(!price)throw billingFailure('billing-config');
  let client;try{client=stripe();}catch(_){throw billingFailure('billing-config');}
  let customer;try{customer=await customerFor(user,client);}catch(_){throw billingFailure('stripe-customer');}
  let subscriptions;try{subscriptions=await client.subscriptions.list({customer,status:'all',limit:20});}catch(_){throw billingFailure('stripe-checkout');}
  if(subscriptions.data.some(subscription=>!['canceled','incomplete_expired'].includes(subscription.status))) throw new HttpsError('already-exists','An existing subscription must be managed in the billing portal');
  const checkout={mode:'subscription',customer,line_items:[{price,quantity:1}],allow_promotion_codes:true,automatic_tax:{enabled:false},success_url:`${APP_URL.value()}?billing=success`,cancel_url:`${APP_URL.value()}?billing=cancelled`,subscription_data:{metadata:{firebaseUid:user.uid,tier,billingCadence:cadence}}};
  if(process.env.FUNCTIONS_EMULATOR!=='true')checkout.consent_collection={terms_of_service:'required'};
  let session;try{session=await client.checkout.sessions.create(checkout);}catch(_){throw billingFailure('stripe-checkout');}
  return {url:session.url};
});
exports.createBillingPortal=onCall(opts,async req=>{ const user=auth(req),customer=await customerFor(user); const s=await stripe().billingPortal.sessions.create({customer,return_url:APP_URL.value()}); return {url:s.url}; });
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
    tx.set(entitlement,{promotions,promotionAccess,promotion:effective?{status:'active',tier:effective.tier,expiresAt:effective.expiresAt,promoCode:effective.code}:null,serverVerifiedAt:now,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    result={tier:configuration.tier,expiresAt:entitlementExpiresAt,permanent:configuration.permanent===true,message:FounderPromotions.successMessage({...configuration,expiresAt:entitlementExpiresAt})};
  });
  return result;
});
exports.stripeWebhook=onRequest({region:'europe-west2',secrets:[STRIPE_SECRET,STRIPE_WEBHOOK_SECRET]},async(req,res)=>{
  let event; try{ event=stripe().webhooks.constructEvent(req.rawBody,req.headers['stripe-signature'],STRIPE_WEBHOOK_SECRET.value()); }catch(e){ res.status(400).send('Invalid signature'); return; }
  const eventRef=db.doc(`stripeWebhookEvents/${event.id}`);
  try{
    const claimed=await db.runTransaction(async tx=>{const snap=await tx.get(eventRef);if(snap.exists)return false;tx.create(eventRef,{type:event.type,state:'processing',eventCreated:Number(event.created)||0,receivedAt:FieldValue.serverTimestamp()});return true;});
    if(!claimed){res.sendStatus(200);return;}
    const object=event.data.object; let subscription=null,refund=null;
    if(event.type.startsWith('checkout.session.')){if(object.subscription)subscription=await stripe().subscriptions.retrieve(typeof object.subscription==='string'?object.subscription:object.subscription.id);}
    else if(event.type.startsWith('customer.subscription.'))subscription=object;
    else if(event.type.startsWith('invoice.')){const id=typeof object.subscription==='string'?object.subscription:object.subscription&&object.subscription.id||object.parent&&object.parent.subscription_details&&object.parent.subscription_details.subscription;if(id)subscription=await stripe().subscriptions.retrieve(id);}
    else if(event.type==='charge.refunded'){
      let invoiceId=typeof object.invoice==='string'?object.invoice:object.invoice&&object.invoice.id;
      if(!invoiceId&&object.payment_intent){const payments=await stripe().invoicePayments.list({payment:{type:'payment_intent',payment_intent:typeof object.payment_intent==='string'?object.payment_intent:object.payment_intent.id},limit:1});const invoicePayment=payments.data[0];invoiceId=invoicePayment&&(typeof invoicePayment.invoice==='string'?invoicePayment.invoice:invoicePayment.invoice&&invoicePayment.invoice.id);}
      if(invoiceId){const invoice=await stripe().invoices.retrieve(invoiceId);const id=typeof invoice.subscription==='string'?invoice.subscription:invoice.subscription&&invoice.subscription.id||invoice.parent&&invoice.parent.subscription_details&&invoice.parent.subscription_details.subscription;if(id)subscription=await stripe().subscriptions.retrieve(id);}
      refund={full:object.refunded===true||Number(object.amount_refunded)>=Number(object.amount),amount:Number(object.amount)||0,amountRefunded:Number(object.amount_refunded)||0,currency:String(object.currency||'').toLowerCase()};
    }
    if(subscription){
      const customer=await stripe().customers.retrieve(subscription.customer); const uid=subscription.metadata.firebaseUid||(customer.metadata&&customer.metadata.firebaseUid); if(uid){
        const price=subscription.items.data[0]&&subscription.items.data[0].price.id,descriptor=priceDescriptor(price),tier=descriptor.tier,billingCadence=descriptor.cadence;
        const status=subscription.status, active=['active','trialing'].includes(status), end=subscriptionPeriodEnd(subscription), eventCreated=Number(event.created||0)*1000;
        const entitlement=db.doc(`users/${uid}/entitlements/current`);
        await db.runTransaction(async tx=>{
          const snap=await tx.get(entitlement),previous=snap.exists?snap.data():{};if(Number(previous.lastStripeEventCreated||0)>eventCreated)return;
          if(refund&&refund.full){tx.set(entitlement,{subscriptionStatus:'refunded',paidTier:'free',lastPaidTier:tier,billingCadence,currentPeriodEnd:end,cancelAtPeriodEnd:!!subscription.cancel_at_period_end,refundReviewState:'full-refund-applied',refundedSubscriptionId:subscription.id,refundedPeriodEnd:end,refundedAt:Date.now(),serverVerifiedAt:Date.now(),lastStripeEventCreated:eventCreated,lastStripeEventId:event.id,updatedAt:FieldValue.serverTimestamp()},{merge:true});return;}
          if(refund){tx.set(entitlement,{refundReviewState:'manual-review',partialRefund:{amount:refund.amount,amountRefunded:refund.amountRefunded,currency:refund.currency,eventId:event.id},serverVerifiedAt:Date.now(),lastStripeEventCreated:eventCreated,lastStripeEventId:event.id,updatedAt:FieldValue.serverTimestamp()},{merge:true});return;}
          const refundedSamePeriod=previous.refundedSubscriptionId===subscription.id&&Number(previous.refundedPeriodEnd||0)>=end;
          tx.set(entitlement,{subscriptionStatus:refundedSamePeriod?'refunded':status,paidTier:active&&!refundedSamePeriod?tier:'free',lastPaidTier:tier,billingCadence,currentPeriodEnd:end,cancelAtPeriodEnd:!!subscription.cancel_at_period_end,refundReviewState:refundedSamePeriod?'full-refund-applied':null,serverVerifiedAt:Date.now(),lastStripeEventCreated:eventCreated,lastStripeEventId:event.id,updatedAt:FieldValue.serverTimestamp()},{merge:true});
        });
      }
    }
    await eventRef.set({state:'processed',processedAt:FieldValue.serverTimestamp()},{merge:true});
    res.sendStatus(200);
  }catch(error){await eventRef.delete().catch(()=>{});console.error('Stripe webhook failed',event.id,event.type,error);res.sendStatus(500);}
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
exports.claimActiveLtdCompany=onCall(baseOpts,async req=>{
  const user=auth(req),companyId=String(req.data&&req.data.companyId||'').trim();
  if(!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(companyId))throw new HttpsError('invalid-argument','Invalid company identity',{reason:'company_id_invalid'});
  await requireTier(user.uid,'pro');
  const anchor=db.doc(`users/${user.uid}/ltdControl/activeCompany`);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(anchor);
    if(snap.exists){
      const current=String((snap.data()||{}).activeCompanyId||'');
      if(current===companyId)return{status:'existing',activeCompanyId:current,idempotent:true};
      throw new HttpsError('already-exists','This TaxMate account already has its Limited Company',{reason:'one_active_ltd_limit',activeCompanyId:current});
    }
    tx.create(anchor,{schemaVersion:1,status:'active_slot_claimed',activeCompanyId:companyId,accountOwnerUid:user.uid,claimedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),releasePolicy:'founder_approval_required'});
    return{status:'claimed',activeCompanyId:companyId,idempotent:false};
  });
});
exports.lookupCompaniesHouse=onCall({...baseOpts,secrets:[COMPANIES_HOUSE_API_KEY]},CompaniesHouseLookup.createHandler({HttpsError,authenticate:auth,requireTier,apiKey:()=>COMPANIES_HOUSE_API_KEY.value()}));
exports.leavePartnership=onCall(baseOpts,async req=>{
  const user=auth(req),code=String(req.data&&req.data.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{6}([A-Z0-9]{2})?$/.test(code))throw new HttpsError('invalid-argument','Invalid partnership code');
  const partnership=db.doc(`partnerships/${code}`),member=partnership.collection('members').doc(user.uid),memberSnap=await member.get();
  if(!memberSnap.exists)throw new HttpsError('permission-denied','Not a partnership member');
  const allMembers=await partnership.collection('members').get(),others=allMembers.docs.filter(doc=>doc.id!==user.uid);
  if(others.length)await member.delete();else await db.recursiveDelete(partnership);
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
    stage='memberships';
    const memberships=await db.collectionGroup('members').where('uid','==',uid).get();
    for(const member of memberships.docs){const partnership=member.ref.parent.parent;if(!partnership)continue;const [root,allMembers]=await Promise.all([partnership.get(),partnership.collection('members').get()]),otherMembers=allMembers.docs.filter(doc=>doc.id!==uid);if(!otherMembers.length&&root.exists&&String((root.data()||{}).createdBy||'')===uid){await db.recursiveDelete(partnership);partnershipsDeleted++;}else{await member.ref.delete();partnershipRecordsRetained++;}}
    stage='storage';await getStorage().bucket().deleteFiles({prefix:`receipts/${uid}/`,force:true});
    stage='promotions';const redemptions=await db.collection('promotionRedemptions').where('uid','==',uid).get();for(let i=0;i<redemptions.docs.length;i+=400){const batch=db.batch();for(const doc of redemptions.docs.slice(i,i+400))batch.delete(doc.ref);await batch.commit();}
    stage='billing';if(customer.exists){try{await stripe().customers.del(stripeCustomerId);}catch(error){if(error&&error.code!=='resource_missing')throw error;}await customerRef.delete();}
    stage='user_data';await db.recursiveDelete(db.doc(`users/${uid}`));await db.doc(`accountClaims/${uid}`).delete().catch(()=>{});await db.recursiveDelete(db.doc(`accountQuarantines/${uid}`)).catch(()=>{});
    stage='complete';await resetRef.set({schemaVersion:1,status:'complete',resetEpoch,correlationId,updatedAt:FieldValue.serverTimestamp()});
    return{deleted:true,resetEpoch,partnershipRecordsRetained,partnershipsDeleted,authIdentityRetained:true};
  }catch(error){await resetRef.set({schemaVersion:1,status:'failed',resetEpoch,correlationId,failedStage:stage,updatedAt:FieldValue.serverTimestamp()}).catch(()=>{});console.error('account-deletion-failed',{category:'account_deletion',stage,correlationId});throw new HttpsError('internal','Account deletion could not be completed',{reason:'delete_pipeline_failed',stage,correlationId});}
});
