'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path');const {createRequire}=require('node:module');const requireFunctions=createRequire(path.resolve(__dirname,'../../functions/package.json'));
const {initializeApp}=requireFunctions('firebase-admin/app');const {getFirestore}=requireFunctions('firebase-admin/firestore');const Stripe=requireFunctions('stripe');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const sessionId=process.env.STRIPE_HOSTED_SESSION_ID;const expectedUid=process.env.STRIPE_HOSTED_UID;const expectedTier=process.env.STRIPE_HOSTED_TIER||'pro';const expectedAmount=expectedTier==='plus'?399:849;const expectedPrice=expectedTier==='plus'?process.env.STRIPE_PLUS_PRICE_ID:process.env.STRIPE_PRO_PRICE_ID;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(read,predicate,label){for(let i=0;i<60;i++){const value=await read();if(predicate(value))return value;await delay(250);}throw new Error(`Timed out waiting for ${label}`);}

test('completed hosted Stripe TEST Checkout reaches backend entitlement truth',async()=>{
  const account=await stripe.accounts.retrieve();assert.equal(account.id,process.env.TAXMATE_STRIPE_ACCOUNT_ID);assert.match(sessionId||'',/^cs_test_/);assert.match(expectedUid||'',/^staging-hosted-/);
  const session=await stripe.checkout.sessions.retrieve(sessionId,{expand:['line_items','subscription']});
  assert.ok(['plus','pro'].includes(expectedTier));assert.equal(session.status,'complete');assert.equal(session.payment_status,'paid');assert.equal(session.currency,'gbp');assert.equal(session.amount_total,expectedAmount);assert.equal(session.total_details.amount_tax,0);assert.equal(session.automatic_tax.enabled,false);assert.equal(session.line_items.data[0].price.id,expectedPrice);assert.equal(session.subscription.metadata.tier,expectedTier);
  const events=await stripe.events.list({type:'checkout.session.completed',limit:100});const event=events.data.find(item=>item.data&&item.data.object&&item.data.object.id===sessionId);assert.ok(event,'Stripe completion event not found');
  const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});const response=await fetch('http://127.0.0.1:5001/demo-taxmate/europe-west2/stripeWebhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature},body:payload});assert.equal(response.status,200);
  const db=getFirestore(initializeApp({projectId:'demo-taxmate'},'hosted-receipt-admin'));const read=()=>db.doc(`users/${expectedUid}/entitlements/current`).get().then(s=>s.data()||{});const state=await waitFor(read,value=>value.paidTier===expectedTier&&value.subscriptionStatus==='active',`hosted ${expectedTier} entitlement`);assert.equal(state.lastStripeEventId,event.id);assert.equal(state.cancelAtPeriodEnd,false);
});
