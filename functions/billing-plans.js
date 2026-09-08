'use strict';
const crypto=require('node:crypto');
const {all,idOf,fail,safeUrl}=require('./billing-service');
const {periodEnd,invoiceForCharge}=require('./billing-entitlements');
const signature=sub=>JSON.stringify([sub.id,sub.status,sub.items?.data?.map(i=>[i.id,idOf(i.price),i.quantity,i.current_period_start,i.current_period_end]),sub.current_period_start,sub.current_period_end,idOf(sub.latest_invoice),idOf(sub.schedule),!!sub.cancel_at_period_end,sub.pending_update||null]);
const publicQuote=q=>Object.fromEntries(['id','direction','fromTier','tier','cadence','currency','dueNowMinor','creditMinor','chargeMinor','effectiveAt','nextPaymentAt','nextPriceMinor','expiresAt','state','invoiceUrl'].filter(k=>q[k]!==undefined).map(k=>[k,q[k]]));
function createService({db,client,descriptor,priceFor,refresh,now=Date.now,moneyOperationsEnabled=false}){
  async function subscriptions(uid){const map=await db.doc(`billingCustomers/${uid}`).get();if(!map.exists)return[];return all(p=>client.subscriptions.list(p),{customer:map.data().stripeCustomerId,status:'all'});}
  async function selected(uid,id){const rows=(await subscriptions(uid)).filter(s=>!['canceled','incomplete_expired'].includes(s.status));const sub=id?rows.find(s=>s.id===id):rows.length===1?rows[0]:null;if(!sub)fail(rows.length>1?'multiple_subscriptions_review':'subscription_not_found');return sub;}
  async function targetPrice(tier,cadence){const id=priceFor(tier,cadence);if(!id)fail('billing_price_alignment_required');const p=await client.prices.retrieve(id),expected=tier==='plus'?(cadence==='yearly'?2999:399):(cadence==='yearly'?9999:999);if(p.currency!=='gbp'||p.unit_amount!==expected||p.recurring?.interval!==(cadence==='yearly'?'year':'month')||p.recurring?.interval_count!==1||p.active===false)fail('billing_price_alignment_required');return p;}
  async function currentInvoice(sub){return typeof sub.latest_invoice==='object'?sub.latest_invoice:sub.latest_invoice?client.invoices.retrieve(sub.latest_invoice):null;}
  async function fundedUpgrade(sub){
    const invoice=await currentInvoice(sub);
    if(!invoice||invoice.status!=='paid'||Number(invoice.amount_paid)<=0||Number(invoice.amount_remaining)>0)fail('unpaid_time_cannot_be_credited');
    const charges=await all(p=>client.charges.list(p),{customer:idOf(sub.customer)});
    for(const charge of charges){
      const refunds=await all(p=>client.refunds.list(p),{charge:charge.id});if(!refunds.some(r=>['succeeded','pending','requires_action'].includes(r.status)))continue;
      const linked=await invoiceForCharge(client,charge);if(linked?.id===invoice.id)fail('refunded_time_needs_review');
    }
    return invoice;
  }
  async function quote(uid,data){
    if(!['plus','pro'].includes(data?.tier))fail('target_plan_required','invalid-argument');
    const sub=await selected(uid,data.subscriptionId),items=sub.items?.data||[],item=items[0],from=descriptor(idOf(item?.price));
    if(items.length!==1||item.quantity!==1||!['plus','pro'].includes(from.tier)||sub.pending_update||sub.schedule||sub.cancel_at_period_end||sub.status!=='active'||sub.discounts?.length||sub.automatic_tax?.enabled||sub.default_tax_rates?.length||sub.collection_method==='send_invoice')fail('subscription_change_needs_review');
    if(data.tier===from.tier)fail('already_on_plan');
    // This approved change retains the existing billing interval. It never
    // silently converts a paid annual contract to a monthly contract.
    const price=await targetPrice(data.tier,from.cadence),direction=data.tier==='pro'?'upgrade':'downgrade',stamp=now(),prorationDate=Math.floor(stamp/1000);
    let dueNowMinor=0,creditMinor=0,chargeMinor=0;
    if(direction==='upgrade'){
      await fundedUpgrade(sub);
      const preview=await client.invoices.createPreview({customer:idOf(sub.customer),subscription:sub.id,subscription_details:{items:[{id:item.id,price:price.id}],proration_date:prorationDate,proration_behavior:'always_invoice'}});
      if(preview.currency!=='gbp'||!Number.isSafeInteger(preview.amount_due)||preview.amount_due<0)fail('quote_needs_review');
      const lines=preview.lines?.data||[];if(preview.lines?.has_more)fail('quote_needs_review');
      dueNowMinor=preview.amount_due;creditMinor=-lines.filter(l=>l.amount<0).reduce((n,l)=>n+l.amount,0);chargeMinor=lines.filter(l=>l.amount>0).reduce((n,l)=>n+l.amount,0);
    }
    const id=crypto.randomUUID(),q={id,uid,subscriptionId:sub.id,customerId:idOf(sub.customer),itemId:item.id,signature:signature(sub),targetPrice:price.id,direction,fromTier:from.tier,tier:data.tier,cadence:from.cadence,currency:'gbp',dueNowMinor,creditMinor,chargeMinor,effectiveAt:direction==='upgrade'?stamp:periodEnd(sub),nextPaymentAt:periodEnd(sub),nextPriceMinor:price.unit_amount,prorationDate,expiresAt:stamp+15*60000,createdAt:stamp,state:'quoted'};
    await db.doc(`billingPlanQuotes/${id}`).create(q);return{quote:publicQuote(q)};
  }
  async function confirm(uid,data){
    if(!moneyOperationsEnabled)fail('money_operations_not_enabled');
    if(!/^[a-f0-9-]{36}$/.test(String(data?.quoteId||'')))fail('quote_not_found','not-found');
    const ref=db.doc(`billingPlanQuotes/${data.quoteId}`);let q;
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists||snap.data().uid!==uid)fail('quote_not_found','not-found');q=snap.data();
      if(['applied','scheduled','pending_payment'].includes(q.state))return;
      if(q.state==='quoted'&&q.expiresAt<now())fail('quote_expired');
      if(!['quoted','submitting'].includes(q.state))fail('quote_changed');
      const lock=db.doc(`billingPlanLocks/${uid}`),lockSnap=await tx.get(lock);
      if(lockSnap.exists&&lockSnap.data().quoteId!==q.id&&lockSnap.data().state==='submitting')fail('plan_change_in_progress');
      q={...q,state:'submitting',operationStartedAt:q.operationStartedAt||now()};tx.set(ref,q);tx.set(lock,{quoteId:q.id,state:'submitting',startedAt:q.operationStartedAt});
    });
    if(['applied','scheduled','pending_payment'].includes(q.state))return{quote:publicQuote(q)};
    // Never replay an old uncertain monetary change after provider idempotency expiry.
    if(now()-q.operationStartedAt>20*3600000)fail('plan_reconciliation_required');
    try{
    let sub=await selected(uid,q.subscriptionId);
    // A changed provider state is not permission to silently alter the quote.
    if(signature(sub)!==q.signature&&!q.providerStartedAt)fail('quote_changed');
    if(q.direction==='upgrade'){
      if(!q.providerStartedAt){
        await fundedUpgrade(sub);
        const p=await client.invoices.createPreview({customer:q.customerId,subscription:sub.id,subscription_details:{items:[{id:q.itemId,price:q.targetPrice}],proration_date:q.prorationDate,proration_behavior:'always_invoice'}});
        if(p.amount_due!==q.dueNowMinor||p.currency!==q.currency)fail('quote_changed');
        q.providerStartedAt=now();await ref.update({providerStartedAt:q.providerStartedAt});
      }
      sub=await client.subscriptions.update(q.subscriptionId,{items:[{id:q.itemId,price:q.targetPrice}],proration_date:q.prorationDate,proration_behavior:'always_invoice',payment_behavior:'pending_if_incomplete',expand:['latest_invoice']},{idempotencyKey:`taxmate-plan-${q.id}`});
      const invoice=await currentInvoice(sub),paid=invoice?.status==='paid'&&!sub.pending_update;
      q={...q,state:paid?'applied':'pending_payment',invoiceId:invoice?.id||null,invoiceUrl:safeUrl(invoice?.hosted_invoice_url),completedAt:paid?now():null};
    }else{
      let schedule;
      if(q.scheduleId)schedule=await client.subscriptionSchedules.retrieve(q.scheduleId);
      else{if(!q.providerStartedAt){q.providerStartedAt=now();await ref.update({providerStartedAt:q.providerStartedAt});}schedule=await client.subscriptionSchedules.create({from_subscription:sub.id},{idempotencyKey:`taxmate-plan-schedule-${q.id}`});q.scheduleId=schedule.id;await ref.update({scheduleId:schedule.id});}
      const current=schedule.phases?.[0];if(!current?.start_date)fail('schedule_needs_review');
      const first={start_date:current.start_date,end_date:q.nextPaymentAt/1000,items:[{price:idOf(sub.items.data[0].price),quantity:1}]};
      if(current.discounts?.length)first.discounts=current.discounts.map(d=>({discount:idOf(d.discount)||idOf(d)}));
      schedule=await client.subscriptionSchedules.update(schedule.id,{end_behavior:'release',proration_behavior:'none',phases:[first,{start_date:q.nextPaymentAt/1000,items:[{price:q.targetPrice,quantity:1}],iterations:1,proration_behavior:'none'}]},{idempotencyKey:`taxmate-plan-phases-${q.id}`});
      q={...q,state:'scheduled',scheduleId:schedule.id,completedAt:now()};
    }
    await ref.set(q);await db.doc(`billingPlanLocks/${uid}`).set({quoteId:q.id,state:q.state});await refresh(uid);return{quote:publicQuote(q)};
    }catch(error){
      // A stale quote before the provider write is safe to replace. Once a
      // monetary operation may have started, keep its identity for reconciliation.
      if(!q.providerStartedAt){await ref.update({state:'needs_new_quote',failureReason:error.billingReason||'provider_read_unavailable'});await db.doc(`billingPlanLocks/${uid}`).set({quoteId:q.id,state:'needs_new_quote'});}
      throw error;
    }
  }
  async function status(uid){
    const rows=await subscriptions(uid),quotes=await db.collection('billingPlanQuotes').where('uid','==',uid).get();
    const changes=[];
    for(const doc of quotes.docs){let q=doc.data();const sub=rows.find(s=>s.id===q.subscriptionId);let state=q.state;
      if(q.state==='pending_payment'&&q.invoiceId){const invoice=await client.invoices.retrieve(q.invoiceId);if(invoice.status==='paid'&&!sub?.pending_update&&idOf(sub?.items?.data?.[0]?.price)===q.targetPrice)state='applied';else if(['void','uncollectible'].includes(invoice.status))state='not_applied';}
      if(q.state==='scheduled'&&sub){if(idOf(sub.items?.data?.[0]?.price)===q.targetPrice&&periodEnd(sub)>q.effectiveAt)state='applied';else if(!sub.schedule&&(sub.cancel_at_period_end||['canceled','incomplete_expired'].includes(sub.status)))state='canceled';}
      if(q.state==='quoted'&&q.expiresAt<now())state='expired';
      if(state!==q.state){q={...q,state,updatedAt:now()};await doc.ref.update({state,updatedAt:q.updatedAt});}
      changes.push(publicQuote(q));
    }
    const access=(await db.doc(`users/${uid}/entitlements/current`).get()).data()||{};
    return{subscriptions:rows.filter(s=>!['canceled','incomplete_expired'].includes(s.status)).map(s=>({id:s.id,...descriptor(idOf(s.items?.data?.[0]?.price)),status:s.status,currentPeriodEnd:periodEnd(s),paidUntil:access.paidSubscriptions?.[s.id]?.paidUntil||0,nextRenewal:access.nextRenewals?.find(r=>r.subscriptionId===s.id)||null,cancelAtPeriodEnd:!!s.cancel_at_period_end,pendingUpdate:!!s.pending_update,scheduleId:idOf(s.schedule)})),changes:changes.sort((a,b)=>b.effectiveAt-a.effectiveAt),moneyOperationsEnabled};
  }
  async function cancel(uid,data){
    if(!moneyOperationsEnabled)fail('money_operations_not_enabled');
    if(data?.subscriptionId){const ended=(await subscriptions(uid)).find(s=>s.id===data.subscriptionId&&['canceled','incomplete_expired'].includes(s.status));if(ended)return{subscriptionId:ended.id,state:'already_ended',paidUntil:periodEnd(ended)};}
    let sub=await selected(uid,data?.subscriptionId);
    const id=`cancel_${sub.id}_${periodEnd(sub)}`,ref=db.doc(`billingSubscriptionActions/${id}`);await ref.set({uid,subscriptionId:sub.id,type:'cancel_renewal',state:'submitting',updatedAt:now()},{merge:true});
    if(sub.schedule)await client.subscriptionSchedules.release(idOf(sub.schedule),{preserve_cancel_date:false},{idempotencyKey:`taxmate-${id}-release`});
    sub=await client.subscriptions.update(sub.id,{cancel_at_period_end:true},{idempotencyKey:`taxmate-${id}`});
    const result={subscriptionId:sub.id,state:sub.cancel_at_period_end?'scheduled':'not_confirmed',paidUntil:periodEnd(sub)};
    await ref.set({...result,updatedAt:now()},{merge:true});await refresh(uid);return result;
  }
  return{quote,confirm,status,cancel,subscriptions,targetPrice};
}
module.exports={createService,signature,publicQuote};
