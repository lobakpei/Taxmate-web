'use strict';
// Offline unit regressions only. No Stripe client, emulator, browser or live
// state is contacted. These examples do not replace the original-case UI test.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.TAXMATE_REVIEW_TEST_SOURCE||path.resolve(__dirname,'../..');
const Review=require(path.join(root,'functions/billing-review-context'));
const {createService}=require(path.join(root,'functions/billing-service'));
const Promotions=require(path.join(root,'functions/founder-promotions'));
const at=Date.parse('2026-09-08T12:00:00Z'),day=86400000;
const clone=structuredClone;
const descriptor=id=>({price_plus:{tier:'plus',cadence:'monthly'},price_pro:{tier:'pro',cadence:'monthly'}}[id]||{tier:'free',cadence:null});
const effectiveTier=(s,now)=>{
  const promotion=Promotions.selectEffective(s.promotions,now)||(Promotions.activeGrant(s.promotion,now)?s.promotion:null);
  const paid=s.paidAccess.proExpiresAt>now?'pro':s.paidAccess.plusExpiresAt>now?'plus':'free';
  return ({free:0,plus:1,pro:2}[promotion?.tier]||0)>{free:0,plus:1,pro:2}[paid]?promotion.tier:paid;
};
function fixture(){
  const start=(at-20*day)/1000,end=(at+30*day)/1000;
  const price=tier=>({id:'price_'+tier,unit_amount:tier==='plus'?399:999,currency:'gbp',recurring:{interval:'month',interval_count:1}});
  const sub=(id,tier)=>({id,customer:'cus_unit',livemode:false,status:'active',currency:'gbp',current_period_start:start,current_period_end:end,
    cancel_at_period_end:true,cancel_at:end,schedule:null,pending_update:null,items:{data:[{id:'si_'+id,price:price(tier),quantity:1,current_period_start:start,current_period_end:end}]}});
  const invoice=(id,s,tier,amount)=>({id,customer:'cus_unit',livemode:false,subscription:s,status:'paid',currency:'gbp',created:start,amount_paid:amount,amount_due:amount,amount_remaining:0,
    hosted_invoice_url:'https://invoice.stripe.com/i/unit?signature=old',invoice_pdf:'https://invoice.stripe.com/pdf/unit?signature=old',
    lines:{data:[{id:'il_'+id,amount,currency:'gbp',quantity:1,price:price(tier),period:{start,end}}]}});
  const charge=(id,inv,amount)=>({id,invoice:inv,customer:'cus_unit',livemode:false,payment_intent:'pi_'+id,amount,amount_captured:amount,amount_refunded:0,
    currency:'gbp',paid:true,captured:true,refunded:false,status:'succeeded',created:start,receipt_url:'https://receipt.stripe.com/'+id+'?signature=old'});
  return {inputs:{subscriptions:[sub('sub_unit','pro'),sub('sub_other','plus')],
    invoices:[invoice('in_original','sub_unit','plus',399),invoice('in_later','sub_unit','pro',590),invoice('in_other','sub_other','plus',399)],
    charges:[charge('ch_original','in_original',399),charge('ch_later','in_later',590),charge('ch_other','in_other',399)],
    refundsByCharge:{ch_original:[],ch_later:[{id:'re_failed',charge:'ch_later',amount:10,currency:'gbp',status:'failed',created:start,metadata:{taxmateCase:'unit_case',taxmateOperation:'unit_operation'}}],ch_other:[]},
    chargeInvoiceIds:{ch_original:'in_original',ch_later:'in_later',ch_other:'in_other'},invoiceRefunds:{in_original:0,in_later:0,in_other:0}},
    previous:{paidTier:'pro',lastPaidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:end*1000,billingCadence:'monthly',paidAccess:{plusExpiresAt:end*1000,proExpiresAt:end*1000},
      paidSubscriptions:{sub_other:{id:'sub_other',active:true,paidTier:'plus',paidUntil:end*1000,paidInvoiceId:'in_other'}},
      promotions:{grant:{id:'grant',status:'active',tier:'plus',startsAt:at-day,expiresAt:at+day,permanent:false}},
      promotionAccess:{plusPermanent:false,proPermanent:false,plusExpiresAt:at+day,proExpiresAt:0},
      accountRetention:{paidAccessEndedAt:at-100*day,retainThroughDate:'2027-04-05',scheduledDeletionDate:'2027-04-06',deleteAfterAt:Date.parse('2027-04-05T23:00:00Z'),purgeRequired:false,requiredCutoffDate:null,lastDeletionCutoffDate:'2026-04-06'},
      serverVerifiedAt:at,updatedAt:at},caseRecord:{id:'case_unit',uid:'unit',paymentId:'ch_original',state:'submitted',revision:1},descriptor,effectiveTier,now:at};
}
function mutate(original,change){const next={...original,inputs:clone(original.inputs),previous:clone(original.previous),caseRecord:clone(original.caseRecord)};change(next);return next;}
function withoutPresentation(c){const x=clone(c);delete x.version;delete x.observedAt;delete x.payment.receiptUrl;return x;}
test('receipt-link-only rotation across ALL charges keeps approval version and fresh display link',()=>{
  const config=fixture(),original=JSON.stringify(config),before=Review.buildContext(config);
  const refreshed=mutate(config,c=>c.inputs.charges.forEach(x=>{x.receipt_url=x.receipt_url.replace('old','fresh');}));
  const after=Review.buildContext(refreshed);
  assert.equal(after.version,before.version);assert.notEqual(after.payment.receiptUrl,before.payment.receiptUrl);
  assert.deepEqual(withoutPresentation(after),withoutPresentation(before));assert.equal(JSON.stringify(config),original);
});
test('display invoice URLs, labels, metadata and verification timestamps do not bind approvals',()=>{
  const config=fixture(),next=mutate(config,c=>{
    c.inputs.invoices.forEach(x=>{x.hosted_invoice_url+='new';x.invoice_pdf+='new';x.description='display label';x.number='display number';x.metadata={note:'display note'};x.lines.data[0].description='translated label';});
    c.inputs.subscriptions[0].description='label';c.inputs.subscriptions[0].items.data[0].price.nickname='new display name';
    c.inputs.charges[0].receipt_number='display number';c.inputs.charges[0].metadata={note:'label'};
    c.previous.serverVerifiedAt+=1000;c.previous.updatedAt+=1000;c.previous.promotions.grant.label='new label';c.previous.promotions.grant.updatedAt=at+1000;
  });next.now+=1000;
  assert.equal(Review.buildContext(next).version,Review.buildContext(config).version);
});
test('review amount is separately confirmed, not an observation-version input; surviving Pro forecast is unchanged',()=>{
  const config=fixture(),full=Review.buildContext(config),partial=Review.buildContext({...config,previewAmountMinor:50});
  assert.equal(full.status,'ready');assert.equal(full.preview.amountMinor,399);assert.equal(full.preview.after.tier,'pro');
  assert.equal(partial.version,full.version);assert.equal(partial.preview.amountMinor,50);
});
const changes=[
  ['charge amount',c=>c.inputs.charges[0].amount++],['charge currency',c=>c.inputs.charges[0].currency='eur'],
  ['charge paid',c=>c.inputs.charges[0].paid=false],['charge status',c=>c.inputs.charges[0].status='failed'],
  ['charge captured amount',c=>c.inputs.charges[0].amount_captured--],['charge capture state',c=>c.inputs.charges[0].captured=false],
  ['charge refunded amount',c=>c.inputs.charges[0].amount_refunded=1],['charge refunded flag',c=>c.inputs.charges[0].refunded=true],
  ['charge dispute',c=>c.inputs.charges[0].disputed=true],['charge customer',c=>c.inputs.charges[0].customer='cus_other'],
  ['charge payment intent',c=>c.inputs.charges[0].payment_intent='pi_changed'],['charge invoice identity',c=>c.inputs.charges[0].invoice='in_changed'],
  ['charge allocation map',c=>c.inputs.chargeInvoiceIds.ch_original='in_later'],
  ['aggregate invoice refund',c=>c.inputs.invoiceRefunds.in_later=590],
  ['refund amount',c=>c.inputs.refundsByCharge.ch_later[0].amount++],['refund currency',c=>c.inputs.refundsByCharge.ch_later[0].currency='eur'],
  ...['pending','requires_action','succeeded','canceled'].map(status=>['refund status '+status,c=>c.inputs.refundsByCharge.ch_later[0].status=status]),
  ['refund charge identity',c=>c.inputs.refundsByCharge.ch_later[0].charge='ch_changed'],
  ['refund operation identity',c=>c.inputs.refundsByCharge.ch_later[0].metadata.taxmateOperation='changed'],
  ['additional refund',c=>c.inputs.refundsByCharge.ch_original.push({id:'re_new',charge:'ch_original',amount:1,currency:'gbp',status:'pending',created:at/1000})],
  ['refund removed',c=>c.inputs.refundsByCharge.ch_later=[]],
  ['invoice paid amount',c=>c.inputs.invoices[1].amount_paid++],['invoice due amount',c=>c.inputs.invoices[1].amount_due++],
  ['invoice remaining amount',c=>c.inputs.invoices[1].amount_remaining=1],['invoice status',c=>c.inputs.invoices[1].status='open'],
  ['invoice currency',c=>c.inputs.invoices[1].currency='eur'],['invoice created funding priority',c=>c.inputs.invoices[1].created++],
  ['invoice subscription allocation',c=>c.inputs.invoices[1].subscription='sub_other'],
  ['line amount',c=>c.inputs.invoices[1].lines.data[0].amount++],['line price',c=>c.inputs.invoices[1].lines.data[0].price.id='price_plus'],
  ['line quantity',c=>c.inputs.invoices[1].lines.data[0].quantity++],['line funding start',c=>c.inputs.invoices[1].lines.data[0].period.start++],
  ['line funding end',c=>c.inputs.invoices[1].lines.data[0].period.end++],
  ['consumed upgrade credit',c=>c.inputs.invoices[1].lines.data.push({id:'il_credit',price:{id:'price_plus'},amount:-10,period:clone(c.inputs.invoices[1].lines.data[0].period)})],
  ['invoice payment allocation',c=>c.inputs.invoices[1].payments={data:[{id:'ip_unit',status:'paid',amount_paid:590,amount_requested:590,currency:'gbp',payment:{type:'payment_intent',payment_intent:'pi_changed'}}]}],
  ['subscription plan',c=>c.inputs.subscriptions[0].items.data[0].price.id='price_plus'],
  ['subscription interval',c=>c.inputs.subscriptions[0].items.data[0].price.recurring.interval='year'],
  ['subscription status',c=>c.inputs.subscriptions[0].status='canceled'],['subscription period start',c=>c.inputs.subscriptions[0].current_period_start++],
  ['subscription period end',c=>c.inputs.subscriptions[0].current_period_end++],['subscription item period',c=>c.inputs.subscriptions[0].items.data[0].current_period_end++],
  ['subscription quantity',c=>c.inputs.subscriptions[0].items.data[0].quantity++],['subscription price amount',c=>c.inputs.subscriptions[0].items.data[0].price.unit_amount++],
  ['subscription cancellation',c=>c.inputs.subscriptions[0].cancel_at_period_end=false],['subscription cancel date',c=>c.inputs.subscriptions[0].cancel_at++],
  ['subscription schedule',c=>c.inputs.subscriptions[0].schedule='sub_sched_new'],
  ['subscription pending plan',c=>c.inputs.subscriptions[0].pending_update={expires_at:at/1000+100,subscription_items:[{id:'si_sub_unit',price:'price_plus',quantity:1}]}],
  ['subscription paused',c=>c.inputs.subscriptions[0].pause_collection={behavior:'void',resumes_at:at/1000+100}],
  ['surviving grant invoice end',c=>c.inputs.invoices[2].lines.data[0].period.end++],
  ['surviving subscription removed',c=>c.inputs.subscriptions.pop()],['surviving paid invoice removed',c=>c.inputs.invoices.pop()],
  ['previous surviving grant',c=>c.previous.paidSubscriptions.sub_other.paidUntil++],
  ['previous paid access',c=>c.previous.paidAccess.plusExpiresAt++],['previous paid tier',c=>c.previous.paidTier='plus'],
  ['last paid tier',c=>c.previous.lastPaidTier='plus'],['previous period',c=>c.previous.currentPeriodEnd++],
  ['legacy grace',c=>c.previous.graceUntil=at+day],['refund access end',c=>c.previous.refundedAt=at-day],
  ['promotion status',c=>c.previous.promotions.grant.status='revoked'],['promotion tier',c=>c.previous.promotions.grant.tier='pro'],
  ['promotion start',c=>c.previous.promotions.grant.startsAt++],['promotion expiry',c=>c.previous.promotions.grant.expiresAt++],
  ['promotion permanent',c=>c.previous.promotions.grant.permanent=true],['promotion removed',c=>c.previous.promotions={}],
  ['legacy promotion',c=>c.previous.promotion={status:'active',tier:'pro',startsAt:at-day,expiresAt:at+day}],
  ['projected promotion expiry',c=>c.previous.promotionAccess.plusExpiresAt++],['projected permanent promotion',c=>c.previous.promotionAccess.proPermanent=true],
  ['retention paid end',c=>c.previous.accountRetention.paidAccessEndedAt++],['retention retain through',c=>c.previous.accountRetention.retainThroughDate='2028-04-05'],
  ['retention scheduled deletion',c=>c.previous.accountRetention.scheduledDeletionDate='2028-04-06'],['retention deletion timestamp',c=>c.previous.accountRetention.deleteAfterAt++],
  ['retention purge required',c=>c.previous.accountRetention.purgeRequired=true],['retention required cutoff',c=>c.previous.accountRetention.requiredCutoffDate='2026-04-06'],
  ['retention previous cutoff',c=>c.previous.accountRetention.lastDeletionCutoffDate='2025-04-06'],['retention needs checking',c=>c.previous.accountRetention.dateNeedsChecking=true],
  ['retention epoch',c=>c.previous.accountRetention.lastRetentionEpoch=2],['legacy retention start',c=>c.previous.ltdArchive={startedAt:at-100*day}],
  ['next renewal target',c=>c.previous.nextRenewals=[{subscriptionId:'sub_unit',tier:'plus',cadence:'monthly',at:at+day,basePriceMinor:399,currency:'gbp',estimate:true}]],
  ['missing entitlement',c=>c.previous=null],['case identity',c=>c.caseRecord.uid='unit_other']
];
for(const [name,change] of changes)test('material change invalidates review: '+name,()=>{
  const config=fixture();assert.notEqual(Review.buildContext(mutate(config,change)).version,Review.buildContext(config).version);
});
test('material classification changes on an independent line bind the version even when current highest tier is unchanged',()=>{
  const config=fixture(),before=Review.buildContext(config),after=Review.buildContext({...config,descriptor:id=>id==='price_plus'?{tier:'plus',cadence:'yearly'}:descriptor(id)});
  assert.equal(before.current.tier,after.current.tier);assert.notEqual(before.version,after.version);
});
test('modern invoice subscription and price allocation facts remain covered',()=>{
  const config=fixture(),invoice=config.inputs.invoices[1],line=invoice.lines.data[0];
  invoice.parent={subscription_details:{subscription:invoice.subscription}};delete invoice.subscription;
  line.pricing={price_details:{price:line.price.id},unit_amount_decimal:'590'};delete line.price;
  line.parent={subscription_item_details:{subscription:'sub_unit',subscription_item:'si_sub_unit',proration:true,proration_details:{credited_items:{invoice:'in_original',invoice_line_items:['il_in_original']}}}};
  const version=Review.buildContext(config).version;
  for(const change of [c=>c.inputs.invoices[1].parent.subscription_details.subscription='sub_other',
    c=>c.inputs.invoices[1].lines.data[0].pricing.price_details.price='price_plus',
    c=>c.inputs.invoices[1].lines.data[0].parent.subscription_item_details.proration_details.credited_items.invoice_line_items=['il_other']]){
    assert.notEqual(Review.buildContext(mutate(config,change)).version,version);
  }
});
test('already-present pending plan, invoice allocation and consumed-credit changes invalidate unchanged current access',()=>{
  const config=fixture();
  config.inputs.subscriptions[0].pending_update={expires_at:at/1000+1000,subscription_items:[{id:'si_sub_unit',price:'price_plus',quantity:1}]};
  config.inputs.invoices[1].payments={data:[{id:'ip_unit',invoice:'in_later',status:'paid',amount_paid:590,amount_requested:590,currency:'gbp',payment:{type:'payment_intent',payment_intent:'pi_unit'}}]};
  const version=Review.buildContext(config).version;
  for(const change of [c=>c.inputs.subscriptions[0].pending_update.subscription_items[0].price='price_pro',
    c=>c.inputs.subscriptions[0].pending_update.subscription_items[0].quantity=2,
    c=>c.inputs.subscriptions[0].pending_update.expires_at++,
    c=>c.inputs.invoices[1].payments.data[0].amount_paid--,
    c=>c.inputs.invoices[1].payments.data[0].payment.payment_intent='pi_different',
    c=>c.inputs.invoices[1].payments.data[0].status='canceled']){
    const context=Review.buildContext(mutate(config,change));assert.equal(context.current.tier,'pro');assert.notEqual(context.version,version);
  }
});
test('absent legacy promotion collection is distinct from an explicit empty collection',()=>{
  const config=fixture();config.previous.promotion=config.previous.promotions.grant;delete config.previous.promotions;
  assert.notEqual(Review.buildContext(mutate(config,c=>c.previous.promotions={})).version,Review.buildContext(config).version);
});
test('future promotion missing expiry is not equivalent to explicit permanent null expiry',()=>{
  const config=fixture();config.previous.promotions.grant.startsAt=at+day;delete config.previous.promotions.grant.expiresAt;
  const before=Review.buildContext(config),after=Review.buildContext(mutate(config,c=>c.previous.promotions.grant.expiresAt=null));
  assert.equal(before.current.tier,after.current.tier);assert.notEqual(before.version,after.version);
});
test('pure calculation across a real access boundary invalidates the context, not each observation second',()=>{
  const config=fixture(),version=Review.buildContext(config).version;
  assert.notEqual(Review.buildContext({...config,now:at+2*day}).version,version); // promotion expiry
  assert.notEqual(Review.buildContext({...config,now:at+31*day}).version,version); // funded expiry
  assert.notEqual(Review.buildContext({...config,now:Date.parse('2027-04-06T12:00:00Z')}).version,version); // retention boundary
});
function localService(config){
  const records=new Map([['billingCustomers/unit',{stripeCustomerId:'cus_unit'}],['billingRefundCases/case_unit',clone(config.caseRecord)]]);
  const ref=p=>({path:p,get:async()=>({exists:records.has(p),data:()=>clone(records.get(p))}),collection:k=>({doc:id=>ref(p+'/'+k+'/'+id)})});
  const tx={get:r=>r.get(),set:(r,v)=>records.set(r.path,clone(v)),update:(r,v)=>records.set(r.path,{...records.get(r.path),...clone(v)}),create:(r,v)=>{assert(!records.has(r.path));records.set(r.path,clone(v));}};
  const db={doc:ref,collection:k=>({doc:id=>ref(k+'/'+id)}),runTransaction:fn=>fn(tx)};
  let providerCreates=0;const refunds=[];
  const client={charges:{retrieve:async()=>clone(config.inputs.charges[0])},refunds:{list:async()=>({data:clone(refunds),has_more:false}),retrieve:async()=>clone(refunds[0]),create:async(data,options)=>{
    providerCreates++;assert.equal(data.amount,399);assert.equal(options.idempotencyKey,'taxmate-refund-case_unit-2');
    const r={id:'re_unit',...data,status:'pending',currency:'gbp',created:at/1000};refunds.push(r);return clone(r);
  }}};
  const service=createService({db,client,now:()=>at,moneyOperationsEnabled:true,readReviewContext:async(caseRecord,previewAmountMinor)=>Review.buildContext({...config,caseRecord,previewAmountMinor})});
  return {service,records,providerCreates:()=>providerCreates};
}
const reviewData=version=>({caseId:'case_unit',revision:1,decision:'full',publicReason:'Offline unit example',basis:'goodwill',reference:'unit',calculation:'399 available',contextVersion:version,impactConfirmedMinor:399,renewalAction:'unchanged'});
test('unchanged actual service permits receipt refresh after normal review; retry retains the idempotency key',async()=>{
  const config=fixture(),s=localService(config),version=Review.buildContext(config).version;
  const approved=await s.service.review('unit_staff',reviewData(version));assert.equal(approved.case.revision,2);
  config.inputs.charges.forEach(c=>{c.receipt_url+='rotated';});
  const request={caseId:'case_unit',revision:2,contextVersion:version};
  assert.equal((await s.service.execute('unit_staff',request)).case.state,'refund_pending');
  await s.service.execute('unit_staff',request);assert.equal(s.providerCreates(),1);
});
test('unchanged actual service rejects material drift before transaction/provider mutation',async()=>{
  for(const [name,change] of changes){
    const config=fixture(),s=localService(config),version=Review.buildContext(config).version;
    await s.service.review('unit_staff',reviewData(version));const state=JSON.stringify([...s.records]);
    // The service supplies the real stored case, so test case-identity binding
    // above at buildContext level, not by editing a stored case in this test.
    if(name==='case identity')continue;
    change(config);
    await assert.rejects(s.service.execute('unit_staff',{caseId:'case_unit',revision:2,contextVersion:version}),e=>['review_context_changed','review_context_incomplete'].includes(e.billingReason),name);
    assert.equal(s.providerCreates(),0,name);assert.equal(JSON.stringify([...s.records]),state,name);
  }
});
test('amount/context confirmation and pre-fix approval invalidation remain enforced',async()=>{
  const config=fixture(),s=localService(config),version=Review.buildContext(config).version;
  await assert.rejects(s.service.review('unit_staff',{...reviewData(version),impactConfirmedMinor:398}),e=>e.billingReason==='review_impact_required');
  await assert.rejects(s.service.review('unit_staff',reviewData('pre-fix-raw-input-version')),e=>e.billingReason==='review_context_changed');
  await s.service.review('unit_staff',reviewData(version));
  await assert.rejects(s.service.execute('unit_staff',{caseId:'case_unit',revision:2,contextVersion:'pre-fix-raw-input-version'}),e=>e.billingReason==='review_context_changed');
  assert.equal(s.providerCreates(),0);
});
