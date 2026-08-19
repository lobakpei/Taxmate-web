'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path');const {createRequire}=require('node:module');const requireFunctions=createRequire(path.resolve(__dirname,'../../functions/package.json'));
const {initializeApp}=require('firebase/app');const {getAuth,connectAuthEmulator,signInAnonymously}=require('firebase/auth');const {getFunctions,connectFunctionsEmulator,httpsCallable}=require('firebase/functions');
const {initializeApp:initializeAdmin}=requireFunctions('firebase-admin/app');const {getFirestore}=requireFunctions('firebase-admin/firestore');const Stripe=requireFunctions('stripe');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),plus='price_1U673BDl7HCNqvcVgMV17BxO',pro='price_1U673zDl7HCNqvcVI2CIiX6w';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(read,predicate,label){for(let i=0;i<60;i++){const value=await read();if(predicate(value))return value;await delay(250);}throw new Error(`Timed out waiting for ${label}`);}
test('TaxMate Stripe sandbox checkout, promotions, lifecycle and webhook truth',async()=>{
  assert.equal(process.env.TAXMATE_STRIPE_SANDBOX,'acct_1U671tDl7HCNqvcV');
  const app=initializeApp({projectId:'demo-taxmate',apiKey:'emulator-api-key'},'stripe-sandbox');const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});const user=(await signInAnonymously(auth)).user;
  const fn=getFunctions(app,'europe-west2');connectFunctionsEmulator(fn,'127.0.0.1',5001);const checkout=httpsCallable(fn,'createCheckoutSession'),redeem=httpsCallable(fn,'redeemPromotion');
  const admin=initializeAdmin({projectId:'demo-taxmate'},'stripe-sandbox-admin');const db=getFirestore(admin);const entitlement=()=>db.doc(`users/${user.uid}/entitlements/current`).get().then(s=>s.data()||{});
  let customerId,subscription;
  try{
    const plusResult=await checkout({tier:'plus'}),plusId=plusResult.data.url.match(/cs_test_[A-Za-z0-9]+/)[0],plusSession=await stripe.checkout.sessions.retrieve(plusId,{expand:['line_items']});
    customerId=plusSession.customer;assert.equal(plusSession.mode,'subscription');assert.equal(plusSession.line_items.data[0].price.id,plus);assert.equal(plusSession.currency,'gbp');assert.equal(plusSession.consent_collection.terms_of_service,'required');assert.match(plusSession.success_url,/billing=success/);assert.match(plusSession.cancel_url,/billing=cancelled/);await stripe.checkout.sessions.expire(plusId);
    const proResult=await checkout({tier:'pro'}),proId=proResult.data.url.match(/cs_test_[A-Za-z0-9]+/)[0],proSession=await stripe.checkout.sessions.retrieve(proId,{expand:['line_items']});assert.equal(proSession.customer,customerId);assert.equal(proSession.line_items.data[0].price.id,pro);await stripe.checkout.sessions.expire(proId);
    assert.equal((await redeem({code:'TAXMATEPLUS30'})).data.tier,'plus');await assert.rejects(()=>redeem({code:'TAXMATEPLUS30'}),/already redeemed/i);assert.equal((await redeem({code:'TAXMATEPRO90'})).data.tier,'pro');await assert.rejects(()=>redeem({code:'TAXMATEEXPIRED'}),/not found/i);await assert.rejects(()=>redeem({code:'NOT-A-REAL-CODE'}),/not found/i);
    const payment=await stripe.paymentMethods.attach('pm_card_visa',{customer:customerId});await stripe.customers.update(customerId,{invoice_settings:{default_payment_method:payment.id}});
    subscription=await stripe.subscriptions.create({customer:customerId,items:[{price:pro}],default_payment_method:payment.id,payment_behavior:'error_if_incomplete',metadata:{firebaseUid:user.uid,tier:'pro'}});assert.equal(subscription.status,'active');
    let state=await waitFor(entitlement,x=>x.paidTier==='pro'&&x.subscriptionStatus==='active','active Pro entitlement');assert.equal(state.cancelAtPeriodEnd,false);
    await assert.rejects(()=>checkout({tier:'plus'}),/existing subscription/i);
    subscription=await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:true});state=await waitFor(entitlement,x=>x.cancelAtPeriodEnd===true,'period-end cancellation');assert.equal(state.paidTier,'pro');
    subscription=await stripe.subscriptions.cancel(subscription.id);state=await waitFor(entitlement,x=>x.subscriptionStatus==='canceled','canceled entitlement');assert.equal(state.paidTier,'free');
    await assert.rejects(()=>stripe.paymentMethods.attach('pm_card_chargeDeclined',{customer:customerId}),error=>error&&error.code==='card_declined');state=await entitlement();assert.equal(state.paidTier,'free');
    const now=Math.floor(Date.now()/1000),base={id:'sub_signed_test',object:'subscription',customer:customerId,status:'active',current_period_end:now+3600,cancel_at_period_end:false,metadata:{firebaseUid:user.uid,tier:'pro'},items:{data:[{price:{id:pro}}]}};
    async function signed(event){const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});return fetch('http://127.0.0.1:5001/demo-taxmate/europe-west2/stripeWebhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature},body:payload});}
    const newer={id:'evt_taxmate_newer',object:'event',type:'customer.subscription.updated',created:now+10,data:{object:base}};assert.equal((await signed(newer)).status,200);assert.equal((await signed(newer)).status,200);const old={id:'evt_taxmate_older',object:'event',type:'customer.subscription.deleted',created:now,data:{object:{...base,status:'canceled'}}};assert.equal((await signed(old)).status,200);state=await entitlement();assert.equal(state.subscriptionStatus,'active');assert.equal((await db.doc('stripeWebhookEvents/evt_taxmate_newer').get()).data().state,'processed');
  }finally{if(subscription&&!['canceled','incomplete_expired'].includes(subscription.status))await stripe.subscriptions.cancel(subscription.id).catch(()=>{});if(customerId)await stripe.customers.del(customerId).catch(()=>{});await user.delete().catch(()=>{});}
});
