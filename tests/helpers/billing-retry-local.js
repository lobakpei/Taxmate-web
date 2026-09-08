'use strict';
// Synthetic delivery harness, NOT Stripe automatic-delivery evidence. Provider
// reads are doubles, all provider writes throw. No existing account/export input.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const Billing=require('../../functions/billing-entitlements'),Review=require('../../functions/billing-review-context');
const {createService}=require('../../functions/billing-service');
const {createHandler}=require('../../functions/billing-webhook');
const Stripe=require('../../functions/node_modules/stripe');
const {loadBoundary}=require('./billing-boundary-local');
const copy=value=>value===undefined?undefined:structuredClone(value);
function memoryDb(){
  const rows=new Map();let tail=Promise.resolve();
  const snap=(p,data=rows)=>({id:p.split('/').at(-1),exists:data.has(p),data:()=>copy(data.get(p))});
  const doc=p=>({path:p,get:async()=>snap(p),set:async value=>{rows.set(p,copy(value));},update:async value=>{assert(rows.has(p));rows.set(p,{...rows.get(p),...copy(value)});},collection:name=>collection(p+'/'+name)});
  const collection=(p,filters=[],maximum=Infinity)=>({doc:id=>doc(p+'/'+id),where:(key,operator,value)=>{assert.equal(operator,'==');return collection(p,[...filters,[key,value]],maximum);},limit:n=>collection(p,filters,n),get:async()=>{
    const docs=[...rows.keys()].filter(key=>key.startsWith(p+'/')&&!key.slice(p.length+1).includes('/')&&filters.every(([field,value])=>rows.get(key)[field]===value)).slice(0,maximum).map(key=>snap(key));return{docs,size:docs.length};
  }});
  return{doc,collection,runTransaction:fn=>{
    const task=tail.then(async()=>{const staged=new Map([...rows].map(([key,value])=>[key,copy(value)]));
      const result=await fn({get:async ref=>snap(ref.path,staged),set:(ref,value)=>staged.set(ref.path,copy(value)),update:(ref,value)=>{assert(staged.has(ref.path));staged.set(ref.path,{...staged.get(ref.path),...copy(value)});},create:(ref,value)=>{assert(!staged.has(ref.path));staged.set(ref.path,copy(value));}});
      rows.clear();for(const [key,value]of staged)rows.set(key,value);return result;
    });tail=task.catch(()=>{});return task;
  }};
}
async function makeDb(){
  if(process.env.TAXMATE_CLOSEOUT_FIRESTORE!=='1')return{db:memoryDb(),close:async()=>{},backend:'serialized-memory-double'};
  assert.equal(process.env.GCLOUD_PROJECT,'demo-taxmate-release-closeout-20260908');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:38580');
  assert(!process.env.GOOGLE_APPLICATION_CREDENTIALS,'No credentials permitted');
  const {Firestore}=require('../../functions/node_modules/@google-cloud/firestore');
  const db=new Firestore({projectId:process.env.GCLOUD_PROJECT,host:'127.0.0.1:38580',ssl:false});
  return{db,close:()=>db.terminate(),backend:'fresh-isolated-firestore-emulator'};
}
async function fixture(){
  const storage=await makeDb(),db=storage.db,uid='isolated-closeout-'+crypto.randomUUID(),suffix=uid.replaceAll('-','_');
  const ids={customer:'cus_'+suffix,charge:'ch_original_'+suffix,otherCharge:'ch_independent_'+suffix,refund:'re_'+suffix,invoice:'in_original_'+suffix,otherInvoice:'in_independent_'+suffix,sub:'sub_original_'+suffix,otherSub:'sub_independent_'+suffix,case:'case_'+crypto.createHash('sha256').update(uid).digest('hex').slice(0,40)};
  let stamp=Date.parse('2026-09-08T12:00:00Z');const start=stamp/1000-86400,end=stamp/1000+29*86400;
  const descriptor=id=>({price_isolated_plus:{tier:'plus',cadence:'monthly'},price_isolated_pro:{tier:'pro',cadence:'monthly'}}[id]||{tier:'free',cadence:null});
  const subscription=(id,tier)=>({id,customer:ids.customer,status:'active',cancel_at_period_end:true,current_period_end:end,items:{data:[{id:'si_'+id,price:{id:'price_isolated_'+tier},quantity:1,current_period_end:end}]}});
  const invoice=(id,sub,tier,amount)=>({id,parent:{subscription_details:{subscription:sub}},status:'paid',currency:'gbp',amount_paid:amount,created:start,lines:{data:[{id:'il_'+id,pricing:{price_details:{price:'price_isolated_'+tier}},amount,period:{start,end}}],has_more:false}});
  const charge=(id,amount)=>({id,customer:ids.customer,payment_intent:'pi_'+id,amount,currency:'gbp',paid:true,status:'succeeded',created:start,livemode:false});
  const data={subscriptions:[subscription(ids.sub,'plus'),subscription(ids.otherSub,'pro')],invoices:[invoice(ids.invoice,ids.sub,'plus',399),invoice(ids.otherInvoice,ids.otherSub,'pro',590)],charges:[charge(ids.charge,399),charge(ids.otherCharge,590)],refunds:[{id:ids.refund,charge:ids.charge,amount:399,currency:'gbp',status:'succeeded',created:stamp/1000,metadata:{taxmateCase:ids.case}}]};
  const counts={reads:[],writes:[],refreshes:0},hooks={};
  function resource(name,handlers){return new Proxy({}, {get:(_,method)=>async(...args)=>{
    if(!Object.hasOwn(handlers,method)){counts.writes.push(name+'.'+String(method));throw new Error('Forbidden provider operation: '+name+'.'+String(method));}
    counts.reads.push(name+'.'+method);if(hooks[name+'.'+method])await hooks[name+'.'+method](...args);return copy(await handlers[method](...args));
  }});}
  const page=rows=>({data:rows,has_more:false}),owned=params=>assert.equal(params.customer,ids.customer);
  const sdk=new Stripe('sk_test_isolated_non_network_placeholder');
  const client={webhooks:sdk.webhooks,
    subscriptions:resource('subscriptions',{list:p=>{owned(p);return page(data.subscriptions);}}),
    invoices:resource('invoices',{list:p=>{owned(p);return page(data.invoices);},retrieve:id=>data.invoices.find(value=>value.id===id)}),
    charges:resource('charges',{list:p=>{owned(p);return page(data.charges);},retrieve:id=>data.charges.find(value=>value.id===id)}),
    invoicePayments:resource('invoicePayments',{list:p=>page(data.charges.filter(c=>c.payment_intent===p.payment.payment_intent).map(c=>({status:'paid',invoice:c.id===ids.charge?ids.invoice:ids.otherInvoice})))}),
    refunds:resource('refunds',{list:p=>page(data.refunds.filter(r=>r.charge===p.charge)),retrieve:id=>data.refunds.find(r=>r.id===id)}),
    paymentIntents:resource('paymentIntents',{}),customers:resource('customers',{}),checkout:{sessions:resource('checkout.sessions',{})}};
  const now=()=>stamp,{effectiveTier,retentionLifecycle}=loadBoundary();
  await db.doc('billingCustomers/'+uid).set({stripeCustomerId:ids.customer});
  await db.doc('users/'+uid+'/entitlements/current').set({paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:end*1000,serverVerifiedAt:stamp-1000});
  await db.doc('billingRefundCases/'+ids.case).set({id:ids.case,uid,paymentId:ids.charge,approvedMinor:399,currency:'gbp',state:'refund_pending',revision:2});
  const refresh=async who=>{counts.refreshes++;assert.equal(who,uid);return Billing.reconcile({db,client,uid:who,descriptor,retentionLifecycle,now});};
  const refunds=createService({db,client,now,onRefundChanged:refresh,readReviewContext:caseRecord=>Review.readContext({db,client,caseRecord,descriptor,effectiveTier,now})});
  const secret='whsec_synthetic_closeout_only';
  const handler=createHandler({db,client,secret,refresh,refunds,now});
  const event=(type,id=crypto.randomUUID())=>({id:'evt_isolated_'+id,object:'event',type,created:Math.floor(stamp/1000),livemode:false,data:{object:type==='charge.refunded'?{id:ids.charge,customer:ids.customer}:{id:ids.refund}}});
  async function deliver(event,{invalidSignature=false}={}){
    const rawBody=Buffer.from(JSON.stringify(event));
    const signature=sdk.webhooks.generateTestHeaderString({payload:rawBody,secret:invalidSignature?'whsec_wrong':secret});
    const result={status:null,body:null};const res={status:code=>{result.status=code;return res;},send:body=>{result.body=body;return res;},sendStatus:code=>{result.status=code;return res;}};
    await handler({rawBody,headers:{'stripe-signature':signature}},res);return result;
  }
  const read=async path=>(await db.doc(path).get()).data();
  return{...storage,uid,ids,now,advance:ms=>{stamp+=ms;},end:end*1000,db,data,client,counts,hooks,refresh,event,deliver,read,
    paths:{lock:'billingProjectionLocks/'+uid,entitlement:'users/'+uid+'/entitlements/current',case:'billingRefundCases/'+ids.case},
    receipt:event=>read('stripeWebhookEvents/'+event.id)};
}
// A deterministic automatic test dispatcher. Virtual time is intentionally NOT
// the Stripe retry schedule or evidence of provider delivery in this account.
async function retryAutomatically(f,event,{attempts=4,onRetry=async()=>{}}={}){
  const statuses=[];
  for(let attempt=0;attempt<attempts;attempt++){
    const response=await f.deliver(event);statuses.push(response.status);
    if(response.status>=200&&response.status<300)return statuses;
    if(response.status<500)return statuses;
    await onRetry(attempt);f.advance(1000*2**attempt);
  }
  return statuses;
}
module.exports={fixture,retryAutomatically,memoryDb};
