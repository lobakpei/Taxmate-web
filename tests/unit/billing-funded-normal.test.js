'use strict';
// Ordinary entitlement lifecycle examples only. No race, malformed input,
// permission-bypass, fault-injection or destructive-cleanup cases.
const test=require('node:test'),assert=require('node:assert/strict');
const Billing=require('../../functions/billing-entitlements');
const Entitlement=require('../../src/core/entitlement');
const Retention=require('../../src/core/retention-policy');
const now=Date.parse('2026-09-07T12:00:00Z'),day=86400000;
const {publicCase,createService}=require('../../functions/billing-service');
test('customer refund records separate conditional review, confirmed result and unavailable facts',()=>{
  const forecast={tier:'free',retention:{status:'retained',retainThroughDate:'2027-04-05',deleteOnDate:'2027-04-06'}},reviewContext={observedAt:now,preview:{changesAccess:true,after:forecast}};
  for(const state of ['approved','refund_submitting','refund_pending']){
    const x=publicCase({state,reviewContext}).refundImpact;assert.equal(x.basis,'conditional');assert.deepEqual(x.retention,forecast.retention);assert.equal(x.afterTier,'free');
  }
  assert.deepEqual(publicCase({state:'approved'}).refundImpact,{basis:'needs_checking'});
  assert.deepEqual(publicCase({state:'refunded',refundId:'re_normal',reviewContext}).refundImpact,{basis:'needs_checking'});
  const confirmedRefundImpact={basis:'confirmed',refundId:'re_normal',observedAt:now,afterTier:'plus',retention:{status:'paid',retainThroughDate:'2028-04-05',deleteOnDate:'2028-04-06'}};
  assert.deepEqual(publicCase({state:'refunded',refundId:'re_normal',reviewContext,confirmedRefundImpact}).refundImpact,confirmedRefundImpact);
  for(const state of ['submitted','declined','refund_failed','refund_canceled'])assert.equal(publicCase({state,reviewContext}).refundImpact,undefined);
});
test('normal annual full-refund forecast uses this tax year, not the funded annual expiry year',()=>{
  const Review=require('../../functions/billing-review-context'),end=now+365*day,annual=invoice('annual','annual','plus',end,2999,now);annual.currency='gbp';
  const inputs={subscriptions:[sub('annual','plus',end)],invoices:[annual],charges:[{id:'ch_annual',paid:true,status:'succeeded',amount:2999,currency:'gbp',created:now/1000}],refundsByCharge:{ch_annual:[]},chargeInvoiceIds:{ch_annual:'annual'},invoiceRefunds:{}};
  const x=Review.buildContext({inputs,previous:{serverVerifiedAt:now},caseRecord:{paymentId:'ch_annual',uid:'normal'},descriptor:id=>({...descriptor(id),cadence:'yearly'}),effectiveTier:s=>s.paidTier,now});
  assert.equal(x.current.retention.status,'paid');assert.equal(Entitlement.taxYearRetentionBoundary(x.current.grants[0].until).deleteOnDate,'2028-04-06');assert.equal(x.preview.after.retention.deleteOnDate,'2027-04-06');assert.equal(x.preview.after.tier,'free');
});
test('provider success stores the first post-reconciliation result, including an independently funded plan',async()=>{
  const caseId='case_'+'a'.repeat(40),refund={id:'re_normal',charge:'ch_annual',amount:2999,currency:'gbp',status:'succeeded',created:now/1000,metadata:{taxmateCase:caseId}};
  const records=new Map([['billingRefundCases/'+caseId,{id:caseId,uid:'normal',paymentId:'ch_annual',approvedMinor:2999,currency:'gbp',state:'refund_pending',refundId:refund.id,reviewContext:{preview:{after:{tier:'free'}}}}]]);
  const ref=p=>({path:p,get:async()=>({exists:records.has(p),data:()=>records.get(p)}),collection:k=>({doc:id=>ref(p+'/'+k+'/'+id)})});
  const tx={get:r=>r.get(),set:(r,v)=>records.set(r.path,v),update:(r,v)=>records.set(r.path,{...records.get(r.path),...v})},db={collection:k=>({doc:id=>ref(k+'/'+id)}),runTransaction:fn=>fn(tx)};
  let reconciled=false,reads=0;
  const service=createService({db,client:{},now:()=>now,onRefundChanged:async()=>{reconciled=true;},readReviewContext:async()=>{assert(reconciled);reads++;return{status:'ready',observedAt:now,refunds:[{id:refund.id,status:'succeeded'}],current:{tier:'plus',retention:{status:'paid',retainThroughDate:'2028-04-05',deleteOnDate:'2028-04-06'}}};}});
  await service.refundEvent(refund);const first=records.get('billingRefundCases/'+caseId).confirmedRefundImpact;assert.equal(first.afterTier,'plus');assert.equal(first.basis,'confirmed');
  await service.refundEvent(refund);assert.equal(reads,1);assert.deepEqual(records.get('billingRefundCases/'+caseId).confirmedRefundImpact,first);
});
test('accepted contract matches the current public terms; supplier verification remains explicit',()=>{const c=require('../../functions/contracts/terms-20260907.json'),p=require('../../src/core/product-content');assert.equal(c.termsHtml,p.termsHtml);assert.equal(c.version,p.POLICY_VERSION);assert.equal(c.establishmentAddressVerified,false);for(const language of Object.values(require('../../src/app/billing-copy')))assert.equal(Object.keys(language).length,165);});
test('a returning customer can request a new offer after the previous subscription and checkout have completed',async()=>{const data=new Map([['billingCustomers/u',{stripeCustomerId:'cus_old'}],['billingCheckoutLocks/u',{offerId:'old',sessionId:'cs_old',state:'open'}]]),db={doc:p=>({get:async()=>({exists:data.has(p),data:()=>data.get(p)}),update:async v=>data.set(p,{...data.get(p),...v}),create:async v=>data.set(p,v)})},client={subscriptions:{list:async()=>({data:[{id:'sub_old',status:'canceled'}],has_more:false})},checkout:{sessions:{retrieve:async()=>({id:'cs_old',status:'complete'})}}};const service=require('../../functions/billing-checkout').createService({db,client,targetPrice:async()=>({id:'price_plus',currency:'gbp',unit_amount:399}),now:()=>Date.parse('2026-09-07T12:00:00Z')});const r=await service.offer({uid:'u'},{tier:'plus',cadence:'monthly'});assert.notEqual(r.offer.id,'old');assert.equal(data.get('billingCheckoutLocks/u').closedReason,'complete');assert.equal(r.offer.priceMinor,399);});
const descriptor=id=>({price_plus:{tier:'plus',cadence:'monthly'},price_pro:{tier:'pro',cadence:'monthly'}}[id]||{tier:'free',cadence:null});
const sub=(id,tier,end=now+10*day,status='active')=>({id,status,current_period_end:end/1000,items:{data:[{id:'si_'+id,price:{id:'price_'+tier},quantity:1,current_period_end:end/1000}]}});
const invoice=(id,subscription,tier,end=now+10*day,amount=399,start=now-20*day)=>({id,subscription,status:'paid',amount_paid:amount,created:start/1000,lines:{data:[{id:'il_'+id,price:{id:'price_'+tier},amount,period:{start:start/1000,end:end/1000}}]}});
function project(subscriptions,invoices,refunds=[],at=now,previous={}){return Billing.project({subscriptions,invoices,refundedInvoices:new Set(refunds),descriptor,now:at,previous});}
test('scheduled downgrade at the paid boundary grants Plus only when the renewal is funded',()=>{const paidEnd=now+day,old=invoice('old-pro','same','pro',paidEnd,999),future=invoice('next-plus','same','plus',paidEnd+30*day,399,paidEnd),renewed=sub('same','plus',paidEnd+30*day),at=paidEnd+1000;
  assert.equal(project([sub('same','pro',paidEnd)],[old],[],now).paidTier,'pro');
  assert.equal(project([renewed],[old,future],[],at).paidTier,'plus');
  const unpaid={...future,status:'open',amount_paid:0},failed={...renewed,status:'past_due'};const snapshot=project([failed],[old,unpaid],[],at,{currentPeriodEnd:paidEnd,lastPaidTier:'pro'});assert.equal(snapshot.paidTier,'free');assert.equal(snapshot.currentPeriodEnd,paidEnd);assert.equal(snapshot.paidAccess.plusExpiresAt,0);
});
test('scheduled renewal projection uses the target price and annual reminder does not invent the previous price',async()=>{const s={...sub('same','pro'),schedule:'schedule'},client={subscriptionSchedules:{retrieve:async()=>({phases:[{start_date:(now+10*day)/1000,items:[{price:'price_plus',quantity:1}]}]})},prices:{retrieve:async()=>({id:'price_plus',currency:'gbp',unit_amount:2999})}};const renewal=(await Billing.nextRenewals(client,[s],id=>({...descriptor(id),cadence:'yearly'})))[0];assert.equal(renewal.tier,'plus');assert.equal(renewal.basePriceMinor,2999);const n=Entitlement.notification({paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:now+10*day,billingCadence:'yearly',activeSubscriptionId:'same',nextRenewals:[renewal]},now);assert.match(n.message,/Plus renewal/);assert.doesNotMatch(n.message,/99\.99/);});
test('funded Pro ends; separately paid Plus remains until its own paid end',()=>{
  const s=project([sub('pro','pro',now+day),sub('plus','plus')],[invoice('pro','pro','pro',now+day,999),invoice('plus','plus','plus')]);
  assert.equal(Entitlement.resolve(s,now,false).tier,'pro');
  assert.equal(Entitlement.resolve(s,now+2*day,false).tier,'plus');
  assert.equal(Retention.decide(s,now+2*day).status,'paid');
  assert.equal(Entitlement.paidAccessEnd(s,now).at,now+10*day);
});
test('full refund of the current Pro payment preserves independent Plus and promotions',()=>{
  const s=project([sub('pro','pro'),sub('plus','plus')],[invoice('pro','pro','pro',now+10*day,999),invoice('plus','plus','plus')],['pro']);
  assert.equal(Entitlement.resolve(s,now,false).tier,'plus');
  assert.equal(Entitlement.resolve({...s,promotions:{founder:{status:'active',tier:'pro',permanent:true,expiresAt:null}}},now,false).tier,'pro');
});
test('refunding an old invoice does not revoke the subsequent funded month',()=>{
  const s=project([sub('pro','pro')],[invoice('old','pro','pro',now-day,999,now-31*day),invoice('new','pro','pro')],['old']);
  assert.equal(s.paidTier,'pro');assert.equal(s.paidSubscriptions.pro.paidInvoiceId,'new');
});
test('failed renewal grants no unpaid period and retains the funded expiry',()=>{
  const paidEnd=now-day,previous={paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:paidEnd};
  const s=project([sub('pro','pro',now+29*day,'past_due')],[invoice('last','pro','pro',paidEnd,999,now-31*day)],[],now,previous);
  assert.equal(s.paidTier,'free');assert.equal(s.currentPeriodEnd,paidEnd);assert.equal(s.graceUntil,undefined);
  assert.equal(Retention.decide(s,now).deleteOnDate,'2027-04-06');
});
test('upgrade payment still pending keeps funded Plus, not unpaid Pro',()=>{
  const s=project([sub('same','pro')],[invoice('old','same','plus')]);assert.equal(s.paidTier,'plus');
});
test('paid upgrade consumes its old-time credit; refund cannot resurrect that credit',()=>{
  const upgrade=invoice('upgrade','same','pro',now+10*day,300,now-day);
  upgrade.lines.data.push({id:'il_credit',price:{id:'price_plus'},amount:-100,period:{start:(now-day)/1000,end:(now+10*day)/1000}});
  const invoices=[invoice('old','same','plus'),upgrade];
  assert.equal(project([sub('same','pro')],invoices).paidTier,'pro');
  assert.equal(project([sub('same','pro')],invoices,['upgrade']).paidTier,'free');
});
test('cancel at paid period end retains current rights; no extra grace is added',()=>{
  const subscription={...sub('pro','pro'),cancel_at_period_end:true};
  const s=project([subscription],[invoice('paid','pro','pro')]);assert.equal(s.cancelAtPeriodEnd,true);
  assert.equal(Entitlement.resolve(s,now+9*day,false).tier,'pro');assert.equal(Entitlement.resolve(s,now+11*day,false).tier,'free');
});
test('modern Stripe invoice/price field mapping is understood',()=>{
  const i=invoice('modern','same','pro');delete i.subscription;i.parent={subscription_details:{subscription:'same'}};
  const l=i.lines.data[0];delete l.price;l.pricing={price_details:{price:'price_pro'}};
  assert.equal(project([sub('same','pro')],[i]).paidTier,'pro');
});
test('paid projection and retention copies remain aligned',()=>{
  const fs=require('node:fs'),path=require('node:path');
  assert.equal(fs.readFileSync(path.join(__dirname,'../../functions/retention-policy.js'),'utf8').replaceAll('\r\n','\n'),fs.readFileSync(path.join(__dirname,'../../src/core/retention-policy.js'),'utf8').replaceAll('\r\n','\n'));
});
test('all six billing dictionaries cover identical keys, variables and structured reminders',()=>{
  const copy=require('../../src/app/billing-copy'),keys=Object.keys(copy.en).sort();
  for(const [lang,values] of Object.entries(copy)){assert.deepEqual(Object.keys(values).sort(),keys,lang);for(const key of keys)assert.deepEqual((values[key].match(/\{[A-Za-z]+\}/g)||[]).sort(),(copy.en[key].match(/\{[A-Za-z]+\}/g)||[]).sort(),lang+':'+key);}
  const cases=[
    {subscriptionStatus:'active',paidTier:'pro',currentPeriodEnd:now+day,cancelAtPeriodEnd:true},
    {subscriptionStatus:'active',paidTier:'plus',billingCadence:'yearly',currentPeriodEnd:now+day},
    {paidTier:'pro',subscriptionStatus:'past_due',paidAccess:{proExpiresAt:now+day},currentPeriodEnd:now+day},
    {paidTier:'free',lastPaidTier:'pro',currentPeriodEnd:now-day},
    {paidTier:'free',lastPaidTier:'pro',currentPeriodEnd:now-365*day},
    ...[1,7,29].map(days=>({promotions:{normal:{status:'active',tier:'pro',startsAt:now-day,expiresAt:now+days*day}}})),
    {promotions:{normal:{status:'active',tier:'pro',startsAt:now-3*day,expiresAt:now-day}}}
  ];
  for(const value of cases){const n=Entitlement.notification(value,now);assert(n.messageKey);assert(['plans','viewPlans'].includes(n.action));for(const lang of Object.keys(copy))assert(copy[lang][n.messageKey]);}
});
test('CS forecasts the exact funded outcome, remaining refund and consumed upgrade credit without changing data',()=>{
  const Review=require('../../functions/billing-review-context'),upgrade=invoice('upgrade','same','pro',now+10*day,300,now-day);
  upgrade.currency='gbp';upgrade.lines.data.push({id:'credit',price:{id:'price_plus'},amount:-100,period:{start:(now-day)/1000,end:(now+10*day)/1000}});
  const inputs={subscriptions:[sub('same','pro')],invoices:[invoice('old','same','plus'),upgrade],charges:[{id:'ch_upgrade',paid:true,status:'succeeded',amount:300,currency:'gbp',created:now/1000}],refundsByCharge:{ch_upgrade:[{id:'re_previous',amount:100,status:'succeeded',currency:'gbp',created:now/1000}]},chargeInvoiceIds:{ch_upgrade:'upgrade'},invoiceRefunds:{upgrade:100}};
  const previous={serverVerifiedAt:now},caseRecord={paymentId:'ch_upgrade',uid:'normal'},config={inputs,previous,caseRecord,descriptor,effectiveTier:s=>s.paidTier,now},original=JSON.stringify(inputs);
  const full=Review.buildContext(config);assert.equal(full.status,'ready');assert.equal(full.payment.availableMinor,200);assert.equal(full.preview.amountMinor,200);assert.equal(full.current.tier,'pro');assert.equal(full.preview.after.tier,'free');assert.equal(full.preview.consumedCredit,true);assert.equal(full.preview.after.retention.deleteOnDate,'2027-04-06');
  const partial=Review.buildContext({...config,previewAmountMinor:50});assert.equal(partial.preview.after.tier,'pro');assert.equal(partial.preview.changesAccess,false);assert.equal(partial.version,full.version);assert.equal(JSON.stringify(inputs),original);
  assert.equal(Review.buildContext({...config,previous:{...previous,serverVerifiedAt:now+5000}}).version,full.version);
  assert.equal(Review.buildContext({...config,caseRecord:{...caseRecord,state:'refunded',refundId:'re_previous',approvedMinor:100}}).preview,null);
  inputs.subscriptions.push(sub('independent','plus'));inputs.invoices.push(invoice('independent','independent','plus'));const additional=Review.buildContext(config);assert.equal(additional.preview.after.tier,'plus');assert.equal(additional.preview.after.grants[0].id,'independent');assert.notEqual(additional.version,full.version);
  const unknown=Review.buildContext({...config,inputs:{...inputs,chargeInvoiceIds:{}}});assert.equal(unknown.status,'needs_checking');assert.equal(unknown.preview,null);assert(unknown.missing.includes('invoice'));
});
