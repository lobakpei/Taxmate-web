'use strict';
const {onCall,HttpsError,onRequest}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app'); const {getFirestore,FieldValue}=require('firebase-admin/firestore'); const {getStorage}=require('firebase-admin/storage');
const {getAuth}=require('firebase-admin/auth');
const Stripe=require('stripe'); initializeApp(); const db=getFirestore();
const STRIPE_SECRET=defineSecret('STRIPE_SECRET_KEY'), STRIPE_WEBHOOK_SECRET=defineSecret('STRIPE_WEBHOOK_SECRET');
const PLUS_PRICE=defineString('STRIPE_PLUS_PRICE_ID'), PRO_PRICE=defineString('STRIPE_PRO_PRICE_ID');
const APP_URL=defineString('PUBLIC_APP_URL',{default:'https://taxmate.uk'});
const opts={region:'europe-west2',secrets:[STRIPE_SECRET]};
const stripe=()=>new Stripe(STRIPE_SECRET.value());
function auth(req){ if(!req.auth) throw new HttpsError('unauthenticated','Sign in required'); return req.auth; }
async function customerFor(user){
  const ref=db.doc(`billingCustomers/${user.uid}`), snap=await ref.get(); if(snap.exists) return snap.data().stripeCustomerId;
  const c=await stripe().customers.create({email:user.token.email,metadata:{firebaseUid:user.uid}}); await ref.set({stripeCustomerId:c.id,createdAt:FieldValue.serverTimestamp()}); return c.id;
}
exports.createCheckoutSession=onCall(opts,async req=>{
  const user=auth(req), tier=req.data&&req.data.tier; if(!['plus','pro'].includes(tier)) throw new HttpsError('invalid-argument','Invalid tier');
  const price=tier==='plus'?PLUS_PRICE.value():PRO_PRICE.value(); if(!price) throw new HttpsError('failed-precondition','Price not configured');
  const customer=await customerFor(user); const session=await stripe().checkout.sessions.create({mode:'subscription',customer,line_items:[{price,quantity:1}],allow_promotion_codes:true,consent_collection:{terms_of_service:'required'},success_url:`${APP_URL.value()}?billing=success`,cancel_url:`${APP_URL.value()}?billing=cancelled`,subscription_data:{metadata:{firebaseUid:user.uid,tier}}});
  return {url:session.url};
});
exports.createBillingPortal=onCall(opts,async req=>{ const user=auth(req),customer=await customerFor(user); const s=await stripe().billingPortal.sessions.create({customer,return_url:APP_URL.value()}); return {url:s.url}; });
exports.redeemPromotion=onCall(opts,async req=>{
  const user=auth(req), code=String(req.data&&req.data.code||'').trim().toUpperCase(); if(!/^[A-Z0-9][A-Z0-9_-]{4,31}$/.test(code)) throw new HttpsError('invalid-argument','Invalid promotion code');
  const found=await stripe().promotionCodes.list({code,active:true,limit:1}); const promotion=found.data[0]; if(!promotion) throw new HttpsError('not-found','Promotion code not found');
  const tier=promotion.metadata.taxmate_tier, days=Number(promotion.metadata.taxmate_free_days); if(!['plus','pro'].includes(tier)||!Number.isInteger(days)||days<1||days>365) throw new HttpsError('failed-precondition','Code is not configured for TaxMate access');
  const redemption=db.doc(`promotionRedemptions/${promotion.id}_${user.uid}`), entitlement=db.doc(`users/${user.uid}/entitlements/current`);
  await db.runTransaction(async tx=>{ if((await tx.get(redemption)).exists) throw new HttpsError('already-exists','Code already redeemed'); const expiresAt=Date.now()+days*86400000; tx.create(redemption,{uid:user.uid,promotionCodeId:promotion.id,redeemedAt:FieldValue.serverTimestamp(),expiresAt}); tx.set(entitlement,{promotion:{status:'active',tier,expiresAt,promotionCodeId:promotion.id},serverVerifiedAt:Date.now(),updatedAt:FieldValue.serverTimestamp()},{merge:true}); });
  return {tier};
});
exports.stripeWebhook=onRequest({region:'europe-west2',secrets:[STRIPE_SECRET,STRIPE_WEBHOOK_SECRET]},async(req,res)=>{
  let event; try{ event=stripe().webhooks.constructEvent(req.rawBody,req.headers['stripe-signature'],STRIPE_WEBHOOK_SECRET.value()); }catch(e){ res.status(400).send('Invalid signature'); return; }
  const object=event.data.object; let subscription=object;
  if(event.type.startsWith('checkout.session.')){ if(!object.subscription){res.sendStatus(200);return;} subscription=await stripe().subscriptions.retrieve(object.subscription); }
  if(event.type.startsWith('customer.subscription.')||event.type.startsWith('checkout.session.')){
    const customer=await stripe().customers.retrieve(subscription.customer); const uid=subscription.metadata.firebaseUid||(customer.metadata&&customer.metadata.firebaseUid); if(uid){
      const price=subscription.items.data[0]&&subscription.items.data[0].price.id; const tier=subscription.metadata.tier||(price===PRO_PRICE.value()?'pro':price===PLUS_PRICE.value()?'plus':'free');
      const status=subscription.status, active=['active','trialing'].includes(status); const end=subscription.current_period_end*1000;
      await db.doc(`users/${uid}/entitlements/current`).set({subscriptionStatus:status,paidTier:active?tier:'free',lastPaidTier:tier,currentPeriodEnd:end,cancelAtPeriodEnd:!!subscription.cancel_at_period_end,serverVerifiedAt:Date.now(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }
  }
  res.sendStatus(200);
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
