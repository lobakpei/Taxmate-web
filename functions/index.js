'use strict';
const {onCall,HttpsError,onRequest}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app'); const {getFirestore,FieldValue}=require('firebase-admin/firestore'); const {getStorage}=require('firebase-admin/storage');
const {getAuth}=require('firebase-admin/auth');
const Stripe=require('stripe'); initializeApp(); const db=getFirestore();
const FounderPromotions=require('./founder-promotions');
const STRIPE_SECRET=defineSecret('STRIPE_SECRET_KEY'), STRIPE_WEBHOOK_SECRET=defineSecret('STRIPE_WEBHOOK_SECRET');
const PLUS_MONTHLY_PRICE=defineString('STRIPE_PLUS_MONTHLY_PRICE_ID',{default:''}),PLUS_ANNUAL_PRICE=defineString('STRIPE_PLUS_ANNUAL_PRICE_ID',{default:''});
const PRO_MONTHLY_PRICE=defineString('STRIPE_PRO_MONTHLY_PRICE_ID',{default:''}),PRO_ANNUAL_PRICE=defineString('STRIPE_PRO_ANNUAL_PRICE_ID',{default:''});
const LEGACY_PLUS_PRICES=defineString('STRIPE_PLUS_LEGACY_PRICE_IDS',{default:''}),LEGACY_PRO_PRICES=defineString('STRIPE_PRO_LEGACY_PRICE_IDS',{default:''});
const APP_URL=defineString('PUBLIC_APP_URL',{default:'https://taxmate.uk'});
const baseOpts={region:'europe-west2',enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true'},opts={...baseOpts,secrets:[STRIPE_SECRET]};
const stripe=()=>new Stripe(STRIPE_SECRET.value());
function auth(req){ if(!req.auth) throw new HttpsError('unauthenticated','Sign in required'); return req.auth; }
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
async function customerFor(user){
  const ref=db.doc(`billingCustomers/${user.uid}`), snap=await ref.get(); if(snap.exists) return snap.data().stripeCustomerId;
  const c=await stripe().customers.create({email:user.token.email,metadata:{firebaseUid:user.uid}}); await ref.set({stripeCustomerId:c.id,createdAt:FieldValue.serverTimestamp()}); return c.id;
}
exports.createCheckoutSession=onCall(opts,async req=>{
  const user=auth(req),tier=req.data&&req.data.tier,cadence=req.data&&req.data.cadence||'monthly';if(!['plus','pro'].includes(tier))throw new HttpsError('invalid-argument','Invalid tier');if(!['monthly','yearly'].includes(cadence))throw new HttpsError('invalid-argument','Invalid billing cadence');
  const price=({plus:{monthly:PLUS_MONTHLY_PRICE.value(),yearly:PLUS_ANNUAL_PRICE.value()},pro:{monthly:PRO_MONTHLY_PRICE.value(),yearly:PRO_ANNUAL_PRICE.value()}})[tier][cadence];if(!price)throw new HttpsError('failed-precondition','Price not configured');
  const customer=await customerFor(user), subscriptions=await stripe().subscriptions.list({customer,status:'all',limit:20});
  if(subscriptions.data.some(subscription=>!['canceled','incomplete_expired'].includes(subscription.status))) throw new HttpsError('already-exists','An existing subscription must be managed in the billing portal');
  const checkout={mode:'subscription',customer,line_items:[{price,quantity:1}],allow_promotion_codes:true,automatic_tax:{enabled:false},success_url:`${APP_URL.value()}?billing=success`,cancel_url:`${APP_URL.value()}?billing=cancelled`,subscription_data:{metadata:{firebaseUid:user.uid,tier,billingCadence:cadence}}};
  if(process.env.FUNCTIONS_EMULATOR!=='true')checkout.consent_collection={terms_of_service:'required'};
  const session=await stripe().checkout.sessions.create(checkout);
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
    if(redemptionSnap.exists)throw new HttpsError('already-exists','Code already redeemed');
    const now=Date.now(),configuration=FounderPromotions.validateConfiguration(promotionSnap.data(),now);
    if(!configuration.ok)throw new HttpsError('failed-precondition','Promotion code is not currently redeemable');
    const entitlementExpiresAt=FounderPromotions.entitlementExpiry(configuration,now),previous=entitlementSnap.exists?entitlementSnap.data():{};
    const promotions={...(previous.promotions||{}),[code]:{status:'active',tier:configuration.tier,expiresAt:entitlementExpiresAt}};
    const effective=FounderPromotions.selectEffective(promotions,now);
    tx.update(promotion,{redemptionCount:configuration.redemptionCount+1,updatedAt:FieldValue.serverTimestamp()});
    tx.create(redemption,{uid:user.uid,promoCode:code,grantedTier:configuration.tier,redeemedAt:FieldValue.serverTimestamp(),entitlementExpiresAt});
    tx.set(entitlement,{promotions,promotion:effective?{status:'active',tier:effective.tier,expiresAt:effective.expiresAt,promoCode:effective.code}:null,serverVerifiedAt:now,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    result={tier:configuration.tier,expiresAt:entitlementExpiresAt};
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
exports.joinPartnership=onCall(baseOpts,async req=>{
  const user=auth(req),code=String(req.data&&req.data.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{6}([A-Z0-9]{2})?$/.test(code))throw new HttpsError('invalid-argument','Invalid partnership code');
  const partnership=db.doc(`partnerships/${code}`),snap=await partnership.get();
  if(!snap.exists)throw new HttpsError('not-found','Partnership not found');
  await partnership.collection('members').doc(user.uid).set({uid:user.uid,role:'member',joinedAt:FieldValue.serverTimestamp()},{merge:true});
  const data=snap.data()||{};return{bizId:data.bizId,name:data.name||'Partnership'};
});
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
  const memberships=await db.collectionGroup('members').where('uid','==',uid).get();
  let partnershipRecordsRetained=0,partnershipsDeleted=0;
  for(const member of memberships.docs){
    const partnership=member.ref.parent.parent;
    if(!partnership)continue;
    const allMembers=await partnership.collection('members').get();
    const otherMembers=allMembers.docs.filter(doc=>doc.id!==uid);
    if(otherMembers.length){await member.ref.delete();partnershipRecordsRetained++;}
    else{await db.recursiveDelete(partnership);partnershipsDeleted++;}
  }
  await getStorage().bucket().deleteFiles({prefix:`receipts/${uid}/`,force:true});
  const redemptions=await db.collection('promotionRedemptions').where('uid','==',uid).get();
  for(let i=0;i<redemptions.docs.length;i+=400){const batch=db.batch();for(const doc of redemptions.docs.slice(i,i+400))batch.delete(doc.ref);await batch.commit();}
  const customerRef=db.doc(`billingCustomers/${uid}`),customer=await customerRef.get();
  if(customer.exists){try{await stripe().customers.del(customer.data().stripeCustomerId);}catch(e){if(e&&e.code!=='resource_missing')throw e;}await customerRef.delete();}
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await getAuth().deleteUser(uid);
  return {deleted:true,partnershipRecordsRetained,partnershipsDeleted};
});
