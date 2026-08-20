'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path');const {createRequire}=require('node:module');const requireFunctions=createRequire(path.resolve(__dirname,'../../functions/package.json'));
const {initializeApp}=require('firebase/app');const {getAuth,connectAuthEmulator,signInAnonymously}=require('firebase/auth');const {getFunctions,connectFunctionsEmulator,httpsCallable}=require('firebase/functions');
const {initializeApp:initializeAdmin}=requireFunctions('firebase-admin/app');const {getFirestore}=requireFunctions('firebase-admin/firestore');const Stripe=requireFunctions('stripe');
const Ent=require('../../src/core/entitlement');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),plusSessionId=process.env.STRIPE_HOSTED_PLUS_SESSION_ID,proSessionId=process.env.STRIPE_HOSTED_PRO_SESSION_ID;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(read,predicate,label){for(let i=0;i<80;i++){const value=await read();if(predicate(value))return value;await delay(250);}throw new Error(`Timed out waiting for ${label}`);}
async function findEvent(type,predicate){for(let i=0;i<30;i++){const events=await stripe.events.list({type,limit:100});const found=events.data.find(predicate);if(found)return found;await delay(500);}throw new Error(`Stripe ${type} event not found`);}

test('hosted TEST subscriptions cover promotion, cancellation, refund and webhook lifecycle',async()=>{
  const account=await stripe.accounts.retrieve();assert.equal(account.id,process.env.TAXMATE_STRIPE_ACCOUNT_ID);
  const [plusSession,proSession]=await Promise.all([
    stripe.checkout.sessions.retrieve(plusSessionId,{expand:['subscription','subscription.latest_invoice','subscription.latest_invoice.payments']}),
    stripe.checkout.sessions.retrieve(proSessionId,{expand:['subscription','subscription.latest_invoice','subscription.latest_invoice.payments']})
  ]);
  assert.equal(plusSession.amount_total,399);assert.equal(proSession.amount_total,849);assert.equal(plusSession.total_details.amount_tax,0);assert.equal(proSession.total_details.amount_tax,0);
  const plusSub=plusSession.subscription,proSub=proSession.subscription,plusUid=plusSub.metadata.firebaseUid,proUid=proSub.metadata.firebaseUid;
  const admin=initializeAdmin({projectId:'demo-taxmate'},'stripe-hosted-lifecycle-admin'),db=getFirestore(admin);
  const state=uid=>db.doc(`users/${uid}/entitlements/current`).get().then(s=>s.data()||{});
  const signed=async event=>{const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});return fetch('http://127.0.0.1:5001/demo-taxmate/europe-west2/stripeWebhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature},body:payload});};
  const checkoutEvents=await stripe.events.list({type:'checkout.session.completed',limit:100});
  const plusCheckout=checkoutEvents.data.find(e=>e.data.object.id===plusSessionId),proCheckout=checkoutEvents.data.find(e=>e.data.object.id===proSessionId);assert.ok(plusCheckout);assert.ok(proCheckout);
  assert.equal((await signed(plusCheckout)).status,200);assert.equal((await signed(plusCheckout)).status,200);assert.equal((await signed(proCheckout)).status,200);
  await waitFor(()=>state(plusUid),x=>x.paidTier==='plus','Plus entitlement');await waitFor(()=>state(proUid),x=>x.paidTier==='pro','Pro entitlement');
  await db.doc(`users/${plusUid}/entries/keep-after-refund`).set({id:'keep-after-refund',amount:123,updatedAt:Date.now()});
  await db.doc(`users/${plusUid}/entitlements/current`).set({promotion:{status:'active',tier:'pro',expiresAt:Date.now()+90*86400000,promotionCodeId:'promo_fixture'}},{merge:true});
  await Promise.all([
    db.doc('founderPromotions/TAXMATEPLUS30').set({code:'TAXMATEPLUS30',tier:'plus',startsAt:Date.now()-1000,durationDays:30,maxRedemptions:20,active:true,redemptionCount:0,createdAt:Date.now()}),
    db.doc('founderPromotions/TAXMATEPRO90').set({code:'TAXMATEPRO90',tier:'pro',startsAt:Date.now()-1000,durationDays:90,maxRedemptions:20,active:true,redemptionCount:0,createdAt:Date.now()}),
    db.doc('founderPromotions/TAXMATEEXPIRED').set({code:'TAXMATEEXPIRED',tier:'pro',startsAt:Date.now()-2000,expiresAt:Date.now()-1,maxRedemptions:20,active:true,redemptionCount:0,createdAt:Date.now()})
  ]);

  const promoApp=initializeApp({projectId:'demo-taxmate',apiKey:'emulator-api-key'},'stripe-hosted-promo');const auth=getAuth(promoApp);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});const promoUser=(await signInAnonymously(auth)).user;const fn=getFunctions(promoApp,'europe-west2');connectFunctionsEmulator(fn,'127.0.0.1',5001);const redeem=httpsCallable(fn,'redeemPromotion');
  assert.equal((await redeem({code:'TAXMATEPLUS30'})).data.tier,'plus');await assert.rejects(()=>redeem({code:'TAXMATEPLUS30'}),/already redeemed/i);assert.equal((await redeem({code:'TAXMATEPRO90'})).data.tier,'pro');await assert.rejects(()=>redeem({code:'TAXMATEEXPIRED'}),/not currently redeemable/i);

  if(!plusSub.cancel_at_period_end)await stripe.subscriptions.update(plusSub.id,{cancel_at_period_end:true});const cancelEvent=await findEvent('customer.subscription.updated',e=>e.data.object.id===plusSub.id&&e.data.object.cancel_at_period_end===true);assert.equal((await signed(cancelEvent)).status,200);let current=await waitFor(()=>state(plusUid),x=>x.cancelAtPeriodEnd===true,'period-end cancellation');assert.equal(current.paidTier,'plus');
  const invoicePayment=plusSub.latest_invoice.payments.data.find(item=>item.payment&&item.payment.type==='payment_intent');assert.ok(invoicePayment);const paymentIntent=invoicePayment.payment.payment_intent;
  let payment=await stripe.paymentIntents.retrieve(paymentIntent,{expand:['latest_charge']});let refunded=Number(payment.latest_charge.amount_refunded||0);if(refunded===0)await stripe.refunds.create({payment_intent:paymentIntent,amount:100,metadata:{taxmate_fixture:'partial'}});const partialEvent=await findEvent('charge.refunded',e=>e.data.object.payment_intent===paymentIntent&&e.data.object.amount_refunded===100);assert.equal((await signed(partialEvent)).status,200);current=await waitFor(()=>state(plusUid),x=>x.refundReviewState==='manual-review','partial-refund review');assert.equal(current.paidTier,'plus');
  payment=await stripe.paymentIntents.retrieve(paymentIntent,{expand:['latest_charge']});refunded=Number(payment.latest_charge.amount_refunded||0);if(refunded<399)await stripe.refunds.create({payment_intent:paymentIntent,amount:399-refunded,metadata:{taxmate_fixture:'full'}});const fullEvent=await findEvent('charge.refunded',e=>e.data.object.payment_intent===paymentIntent&&e.data.object.refunded===true);assert.equal((await signed(fullEvent)).status,200);current=await waitFor(()=>state(plusUid),x=>x.refundReviewState==='full-refund-applied','full refund');assert.equal(current.paidTier,'free');assert.equal(Ent.resolve(current,Date.now(),false).tier,'pro');assert.equal((await db.doc(`users/${plusUid}/entries/keep-after-refund`).get()).exists,true);
  const replay={id:'evt_taxmate_hosted_refund_replay',object:'event',type:'customer.subscription.updated',created:fullEvent.created+10,data:{object:{...plusSub,status:'active',cancel_at_period_end:false}}};assert.equal((await signed(replay)).status,200);current=await state(plusUid);assert.equal(current.paidTier,'free');assert.equal(current.subscriptionStatus,'refunded');
  await stripe.subscriptions.cancel(plusSub.id).catch(()=>{});

  const proCancelAt=Math.floor(Date.now()/1000);await stripe.subscriptions.cancel(proSub.id);const proCancel=await findEvent('customer.subscription.deleted',e=>e.data.object.id===proSub.id&&e.created>=proCancelAt);assert.equal((await signed(proCancel)).status,200);current=await waitFor(()=>state(proUid),x=>x.subscriptionStatus==='canceled','Pro cancellation');assert.equal(current.paidTier,'free');
  await assert.rejects(()=>stripe.paymentMethods.attach('pm_card_chargeDeclined',{customer:plusSession.customer}),error=>error&&error.code==='card_declined');
  await promoUser.delete();
});
