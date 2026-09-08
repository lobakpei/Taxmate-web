'use strict';
// Ordinary persisted-state reconciliation and successful local lifecycle only.
// No failed API call is injected or repeated. Real provider evidence is separate.
const test=require('node:test'),assert=require('node:assert/strict');
const Checkout=require('../../functions/billing-checkout'),Recovery=require('../../functions/billing-checkout-recovery');
const contract=require('../../functions/contracts/terms-20260907.json');
const uid='tmtest-20260907-plus-month',customerId='cus_VDYNc1uHo0bcWj',offerId='66fac414-52f3-4c40-970e-d7f4c7a29bcf',stamp=Date.parse('2026-09-07T20:10:00Z');
const operation={uid,offerId,key:'taxmate-checkout-'+offerId,state:'submitting',startedAt:1788805677645,termsAccepted:true,earlySupplyRequested:true,termsVersion:contract.version,earlySupplyText:Checkout.EARLY_SUPPLY};
const failure={uid,offerId,operationKey:operation.key,customerId,requestId:'req_nhoTJhFgTrFM5F',httpStatus:400,type:'invalid_request_error',reason:'terms_url_required',source:'verified_request_log',recordedAt:stamp};
function fixture({confirmed=true,sessions=[]}={}){
  const originalOffer={id:offerId,uid,tier:'plus',cadence:'monthly',priceId:'price_plus',currency:'gbp',priceMinor:399,createdAt:1788805606685,expiresAt:1788806506685,contract,termsVersion:contract.version,earlySupplyText:Checkout.EARLY_SUPPLY,state:'offered'};
  const confirmation={uid,offerId,state:'payment_not_confirmed',providedAt:1788805677790,termsHtml:contract.termsHtml,termsVersion:contract.version,earlySupplyRequested:true,earlySupplyText:Checkout.EARLY_SUPPLY,priceMinor:399};
  const values=new Map([['billingCustomers/'+uid,{stripeCustomerId:customerId}],['billingCheckoutLocks/'+uid,structuredClone(operation)],['billingCheckoutOffers/'+offerId,originalOffer],['billingPurchaseConfirmations/'+offerId,confirmation]]);
  if(confirmed)values.set('billingCheckoutFailures/'+offerId,structuredClone(failure));
  const snap=p=>({exists:values.has(p),data:()=>structuredClone(values.get(p))});
  const ref=p=>({path:p,get:async()=>snap(p),create:async v=>{assert(!values.has(p));values.set(p,structuredClone(v));},update:async v=>{assert(values.has(p));values.set(p,{...values.get(p),...structuredClone(v)});}});
  const tx={get:r=>r.get(),create:(r,v)=>{assert(!values.has(r.path));values.set(r.path,structuredClone(v));},update:(r,v)=>{assert(values.has(r.path));values.set(r.path,{...values.get(r.path),...structuredClone(v)});},set:(r,v)=>values.set(r.path,structuredClone(v))};
  const db={doc:ref,runTransaction:async fn=>fn(tx)},calls={list:0,create:0,customerFor:0};
  const client={subscriptions:{list:async()=>({data:[],has_more:false})},checkout:{sessions:{
    list:async p=>{calls.list++;assert.equal(p.customer,customerId);return{data:sessions,has_more:false};},
    retrieve:async id=>{const s=sessions.find(x=>x.id===id);assert(s);return s;},
    create:async(params,options)=>{calls.create++;assert.equal(params.customer,customerId);assert.equal(params.consent_collection.terms_of_service,'required');assert.equal(options.idempotencyKey,'taxmate-checkout-'+params.metadata.taxmateOffer);const s={id:'cs_test_local_success',customer:customerId,mode:'subscription',status:'open',url:'https://checkout.stripe.com/c/pay/cs_test_local_success',metadata:params.metadata};sessions.push(s);return s;}
  }}};
  const service=Checkout.createService({db,client,targetPrice:async()=>({id:'price_plus',currency:'gbp',unit_amount:399}),customerFor:async user=>{calls.customerFor++;assert.equal(user.uid,uid);return customerId;},appUrl:'http://127.0.0.1:41905',moneyOperationsEnabled:true,consumerDisclosuresReady:true,now:()=>stamp});
  return{service,values,calls,db,client,originalOffer:structuredClone(originalOffer),confirmation:structuredClone(confirmation)};
}
const user={uid,token:{email:'plus-month@taxmate-test.invalid'}};
test('confirmed historical rejection reconciles before issuing a fresh offer for the same customer',async()=>{
  const f=fixture(),r=await f.service.offer(user,{tier:'plus',cadence:'monthly'});
  assert.equal(f.calls.list,1);assert.equal(f.calls.create,0);assert.equal(f.calls.customerFor,0);assert.notEqual(r.offer.id,offerId);assert.ok(r.offer.expiresAt>stamp);assert.equal(r.offer.priceMinor,399);
  assert.equal(f.values.get('billingCustomers/'+uid).stripeCustomerId,customerId);assert.equal(f.values.get('billingCheckoutLocks/'+uid).closedReason,'provider_validation_rejected');
  assert.deepEqual(f.values.get('billingCheckoutOffers/'+offerId),f.originalOffer);assert.deepEqual(f.values.get('billingPurchaseConfirmations/'+offerId),f.confirmation);
  const archived=f.values.get('billingCheckoutAttempts/'+offerId);for(const [k,v]of Object.entries(operation))assert.deepEqual(archived[k],v);assert.equal(archived.resolution,'confirmed_not_created');assert.deepEqual(archived.providerFailure,failure);
});
test('fresh explicit consent proceeds normally without replacing the customer or historical contract',async()=>{
  const f=fixture(),r=await f.service.offer(user,{tier:'plus',cadence:'monthly'}),data={offerId:r.offer.id,termsAccepted:true,earlySupplyRequested:true};
  const opened=await f.service.checkout(user,data);assert.equal(f.calls.create,1);assert.equal(f.calls.customerFor,1);assert.equal(opened.confirmation.priceMinor,399);
  assert.equal(f.values.get('billingCheckoutLocks/'+uid).offerId,r.offer.id);assert.equal(f.values.get('billingCheckoutAttempts/'+offerId).key,operation.key);assert.deepEqual(f.values.get('billingPurchaseConfirmations/'+offerId),f.confirmation);
  const again=await f.service.checkout(user,data);assert.equal(again.url,opened.url);assert.equal(f.calls.create,1);
});
test('an already-created open Session is recovered by metadata, not created again',async()=>{
  const session={id:'cs_test_existing',customer:customerId,mode:'subscription',status:'open',url:'https://checkout.stripe.com/c/pay/cs_test_existing',metadata:{firebaseUid:uid,taxmateOffer:offerId}};
  const f=fixture({confirmed:false,sessions:[session]}),r=await f.service.offer(user,{tier:'plus',cadence:'monthly'});assert.equal(r.offer.id,offerId);
  const next=await f.service.checkout(user,{offerId,termsAccepted:true,earlySupplyRequested:true});assert.equal(next.url,session.url);assert.equal(f.calls.create,0);assert.equal(f.values.get('billingCheckoutAttempts/'+offerId).resolution,'session_found');
});
test('a known expired provider Session permits a fresh offer without discarding the attempt',async()=>{
  const f=fixture({confirmed:false,sessions:[{id:'cs_test_expired',customer:customerId,mode:'subscription',status:'expired',metadata:{firebaseUid:uid,taxmateOffer:offerId}}]});
  const r=await f.service.offer(user,{tier:'plus',cadence:'monthly'});assert.notEqual(r.offer.id,offerId);assert.equal(f.calls.create,0);assert.equal(f.values.get('billingCheckoutAttempts/'+offerId).sessionStatus,'expired');
});
test('an unresolved stored outcome is not cleared merely because the list is empty',async()=>{
  const f=fixture({confirmed:false});await assert.rejects(f.service.offer(user,{tier:'plus',cadence:'monthly'}),e=>e.billingReason==='checkout_reconciliation_required');assert.deepEqual(f.values.get('billingCheckoutLocks/'+uid),operation);assert.equal(f.calls.create,0);
});
test('a recovered completed Session awaiting asynchronous payment remains blocked on ordinary repeat',async()=>{
  const f=fixture({confirmed:false,sessions:[{id:'cs_test_waiting',customer:customerId,mode:'subscription',status:'complete',payment_status:'unpaid',metadata:{firebaseUid:uid,taxmateOffer:offerId}}]});
  await assert.rejects(f.service.offer(user,{tier:'plus',cadence:'monthly'}),e=>e.billingReason==='existing_subscription_manage');await assert.rejects(f.service.offer(user,{tier:'plus',cadence:'monthly'}),e=>e.billingReason==='checkout_reconciliation_required');assert.equal(f.calls.create,0);assert.equal(f.values.get('billingCheckoutLocks/'+uid).state,'open');
});
test('the observed Stripe validation response is classified without persisting raw text or headers',()=>{
  const result=Recovery.classifyCheckoutFailure({requestId:failure.requestId,statusCode:400,rawType:'invalid_request_error',message:'You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard. Update your public business details.'});
  assert.deepEqual(result,{requestId:failure.requestId,httpStatus:400,type:'invalid_request_error',reason:'terms_url_required'});
});
test('recording the observed rejection retains the first provider evidence',async()=>{
  const f=fixture({confirmed:false}),r=Recovery.createRecovery({db:f.db,client:f.client,now:()=>stamp}),error={requestId:failure.requestId,statusCode:400,rawType:'invalid_request_error',message:'You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard.'};
  await r.recordFailure({uid,operation,customerId,error});const first=structuredClone(f.values.get('billingCheckoutFailures/'+offerId));await r.recordFailure({uid,operation,customerId,error});assert.deepEqual(f.values.get('billingCheckoutFailures/'+offerId),first);assert.equal(first.source,'stripe_sdk');assert.equal(first.reason,'terms_url_required');
});
test('the TEST terms artifact embeds the exact candidate contract and leaves formal gates pending',()=>{
  const html=require('../../scripts/build-test-terms-preview').render(),body=html.split('<article id="candidate-contract">')[1].split('</article>')[0];assert.equal(body,contract.termsHtml);assert.match(html,/TEST ONLY/);assert.match(html,/noindex,nofollow,noarchive/);assert.match(html,/No purchase or payment can be submitted/);assert.equal(contract.establishmentAddressVerified,false);assert.doesNotMatch(html,/<script|<form|<iframe/);
});
test('prepared preview configuration contains only isolated static hosting with no App backend or deployment hook',()=>{
  const config=require('../../scripts/build-test-terms-preview').previewConfiguration();assert.deepEqual(Object.keys(config),['hosting']);assert.equal(config.hosting.site,'taxmate-staging');assert.equal(config.hosting.public,'public');assert.equal(config.hosting.predeploy,undefined);assert.equal(config.hosting.rewrites,undefined);assert.ok(config.hosting.headers[0].headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex')));
});
