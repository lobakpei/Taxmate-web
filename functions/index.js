'use strict';
const {onCall,HttpsError,onRequest}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app'); const {getFirestore,FieldValue}=require('firebase-admin/firestore'); const {getStorage}=require('firebase-admin/storage');
const {getAuth}=require('firebase-admin/auth');
const Stripe=require('stripe'); initializeApp(); const db=getFirestore();
const STRIPE_SECRET=defineSecret('STRIPE_SECRET_KEY'), STRIPE_WEBHOOK_SECRET=defineSecret('STRIPE_WEBHOOK_SECRET');
const PLUS_PRICE=defineString('STRIPE_PLUS_PRICE_ID',{default:''}), PRO_PRICE=defineString('STRIPE_PRO_PRICE_ID',{default:''});
const APP_URL=defineString('PUBLIC_APP_URL',{default:'https://taxmate.uk'});
const baseOpts={region:'europe-west2',enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true'},opts={...baseOpts,secrets:[STRIPE_SECRET]};
const stripe=()=>new Stripe(STRIPE_SECRET.value());
function auth(req){ if(!req.auth) throw new HttpsError('unauthenticated','Sign in required'); return req.auth; }
async function customerFor(user){
  const ref=db.doc(`billingCustomers/${user.uid}`), snap=await ref.get(); if(snap.exists) return snap.data().stripeCustomerId;
  const c=await stripe().customers.create({email:user.token.email,metadata:{firebaseUid:user.uid}}); await ref.set({stripeCustomerId:c.id,createdAt:FieldValue.serverTimestamp()}); return c.id;
}
exports.createCheckoutSession=onCall(opts,async req=>{
  const user=auth(req), tier=req.data&&req.data.tier; if(!['plus','pro'].includes(tier)) throw new HttpsError('invalid-argument','Invalid tier');
  const price=tier==='plus'?PLUS_PRICE.value():PRO_PRICE.value(); if(!price) throw new HttpsError('failed-precondition','Price not configured');
  const customer=await customerFor(user), subscriptions=await stripe().subscriptions.list({customer,status:'all',limit:20});
  if(subscriptions.data.some(subscription=>!['canceled','incomplete_expired'].includes(subscription.status))) throw new HttpsError('already-exists','An existing subscription must be managed in the billing portal');
  const session=await stripe().checkout.sessions.create({mode:'subscription',customer,line_items:[{price,quantity:1}],allow_promotion_codes:true,consent_collection:{terms_of_service:'required'},success_url:`${APP_URL.value()}?billing=success`,cancel_url:`${APP_URL.value()}?billing=cancelled`,subscription_data:{metadata:{firebaseUid:user.uid,tier}}});
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
  const eventRef=db.doc(`stripeWebhookEvents/${event.id}`);
  try{
    const claimed=await db.runTransaction(async tx=>{const snap=await tx.get(eventRef);if(snap.exists)return false;tx.create(eventRef,{type:event.type,state:'processing',eventCreated:Number(event.created)||0,receivedAt:FieldValue.serverTimestamp()});return true;});
    if(!claimed){res.sendStatus(200);return;}
    const object=event.data.object; let subscription=null;
    if(event.type.startsWith('checkout.session.')){if(object.subscription)subscription=await stripe().subscriptions.retrieve(typeof object.subscription==='string'?object.subscription:object.subscription.id);}
    else if(event.type.startsWith('customer.subscription.'))subscription=object;
    else if(event.type.startsWith('invoice.')){const id=typeof object.subscription==='string'?object.subscription:object.subscription&&object.subscription.id||object.parent&&object.parent.subscription_details&&object.parent.subscription_details.subscription;if(id)subscription=await stripe().subscriptions.retrieve(id);}
    if(subscription){
      const customer=await stripe().customers.retrieve(subscription.customer); const uid=subscription.metadata.firebaseUid||(customer.metadata&&customer.metadata.firebaseUid); if(uid){
        const price=subscription.items.data[0]&&subscription.items.data[0].price.id; const tier=subscription.metadata.tier||(price===PRO_PRICE.value()?'pro':price===PLUS_PRICE.value()?'plus':'free');
        const status=subscription.status, active=['active','trialing'].includes(status), end=Number(subscription.current_period_end||0)*1000, eventCreated=Number(event.created||0)*1000;
        const entitlement=db.doc(`users/${uid}/entitlements/current`);
        await db.runTransaction(async tx=>{const snap=await tx.get(entitlement),previous=snap.exists?snap.data():{};if(Number(previous.lastStripeEventCreated||0)>eventCreated)return;tx.set(entitlement,{subscriptionStatus:status,paidTier:active?tier:'free',lastPaidTier:tier,currentPeriodEnd:end,cancelAtPeriodEnd:!!subscription.cancel_at_period_end,serverVerifiedAt:Date.now(),lastStripeEventCreated:eventCreated,lastStripeEventId:event.id,updatedAt:FieldValue.serverTimestamp()},{merge:true});});
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
