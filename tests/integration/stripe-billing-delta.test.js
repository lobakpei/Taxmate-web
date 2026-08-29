'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {createRequire}=require('node:module');
const requireFunctions=createRequire(path.resolve(__dirname,'../../functions/package.json'));const Stripe=requireFunctions('stripe');
const {initializeApp}=requireFunctions('firebase-admin/app');const {getFirestore}=requireFunctions('firebase-admin/firestore');const Ent=require('../../src/core/entitlement');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),sessionIds=JSON.parse(process.env.STRIPE_HOSTED_SESSIONS_JSON||'{}');
const cases=[
  {key:'plusMonthly',tier:'plus',cadence:'monthly',amount:399,interval:'month',price:process.env.STRIPE_PLUS_MONTHLY_PRICE_ID},
  {key:'plusYearly',tier:'plus',cadence:'yearly',amount:2999,interval:'year',price:process.env.STRIPE_PLUS_ANNUAL_PRICE_ID},
  {key:'proMonthly',tier:'pro',cadence:'monthly',amount:999,interval:'month',price:process.env.STRIPE_PRO_MONTHLY_PRICE_ID},
  {key:'proYearly',tier:'pro',cadence:'yearly',amount:9999,interval:'year',price:process.env.STRIPE_PRO_ANNUAL_PRICE_ID}
];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(read,predicate,label){for(let i=0;i<80;i++){const value=await read();if(predicate(value))return value;await delay(250);}throw new Error(`Timed out waiting for ${label}`);}
async function signed(event){const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});return fetch('http://127.0.0.1:5001/demo-taxmate/europe-west2/stripeWebhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature},body:payload});}

test('four hosted TEST cadence checkouts project exact annual and monthly entitlement',async()=>{
  const account=await stripe.accounts.retrieve();assert.equal(account.id,process.env.TAXMATE_STRIPE_ACCOUNT_ID);
  const db=getFirestore(initializeApp({projectId:'demo-taxmate'},'stripe-billing-delta-admin')),subscriptions=[],customers=[];let eventClock=Math.floor(Date.now()/1000)+100;
  try{
    for(const spec of cases){
      const id=sessionIds[spec.key];assert.match(id||'',/^cs_test_/);
      const session=await stripe.checkout.sessions.retrieve(id,{expand:['line_items','subscription']});
      assert.equal(session.status,'complete');assert.equal(session.payment_status,'paid');assert.equal(session.currency,'gbp');assert.equal(session.amount_total,spec.amount);assert.equal(session.total_details.amount_tax,0);assert.equal(session.automatic_tax.enabled,false);
      assert.equal(session.line_items.data[0].price.id,spec.price);assert.equal(session.line_items.data[0].price.recurring.interval,spec.interval);assert.equal(session.subscription.status,'active');assert.equal(session.subscription.metadata.tier,spec.tier);assert.equal(session.subscription.metadata.billingCadence,spec.cadence);
      subscriptions.push(session.subscription);customers.push(session.customer);
      const events=await stripe.events.list({type:'checkout.session.completed',limit:100}),event=events.data.find(item=>item.data?.object?.id===id);assert.ok(event,`${spec.key} completion event missing`);assert.equal((await signed(event)).status,200);
      const uid=session.subscription.metadata.firebaseUid,read=()=>db.doc(`users/${uid}/entitlements/current`).get().then(s=>s.data()||{}),state=await waitFor(read,value=>value.paidTier===spec.tier&&value.subscriptionStatus==='active',`${spec.key} entitlement`);
      assert.equal(state.billingCadence,spec.cadence);assert.equal(Ent.resolve(state,Date.now(),false).source,'stripe');
    }
    const annual=subscriptions[cases.findIndex(item=>item.key==='proYearly')],uid=annual.metadata.firebaseUid,entitlementRef=db.doc(`users/${uid}/entitlements/current`);
    await entitlementRef.set({promotions:{FOUNDERFALLBACK:{status:'active',tier:'plus',expiresAt:Date.now()+30*86400000}}},{merge:true});
    const cancelAtPeriodEnd=await stripe.subscriptions.update(annual.id,{cancel_at_period_end:true});
    assert.equal((await signed({id:'evt_taxmate_annual_cancel_delta',object:'event',type:'customer.subscription.updated',created:eventClock++,data:{object:cancelAtPeriodEnd}})).status,200);
    let state=await waitFor(()=>entitlementRef.get().then(s=>s.data()||{}),value=>value.cancelAtPeriodEnd===true,'annual cancel-at-period-end');assert.equal(state.paidTier,'pro');assert.equal(state.billingCadence,'yearly');assert.ok(Number(state.currentPeriodEnd)>Date.now()+300*86400000);assert.equal(Ent.resolve(state,Date.now(),false).source,'stripe');
    const ended={...cancelAtPeriodEnd,status:'canceled',cancel_at_period_end:false};assert.equal((await signed({id:'evt_taxmate_annual_period_end_delta',object:'event',type:'customer.subscription.deleted',created:eventClock++,data:{object:ended}})).status,200);
    state=await waitFor(()=>entitlementRef.get().then(s=>s.data()||{}),value=>value.subscriptionStatus==='canceled','annual period end');assert.equal(state.paidTier,'free');assert.equal(Ent.resolve(state,Date.now(),false).tier,'plus');assert.equal(Ent.resolve(state,Date.now(),false).source,'promotion');
  }finally{
    for(const subscription of subscriptions)await stripe.subscriptions.cancel(subscription.id).catch(()=>{});
    for(const customer of new Set(customers))await stripe.customers.del(customer).catch(()=>{});
  }
});
