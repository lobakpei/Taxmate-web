'use strict';
const {all,idOf,fail}=require('./billing-service');
const crypto=require('node:crypto');
const WEIGHT={free:0,plus:1,pro:2};
const subscriptionId=invoice=>idOf(invoice.subscription)||idOf(invoice.parent?.subscription_details?.subscription);
const priceId=line=>idOf(line.price)||idOf(line.pricing?.price_details?.price);
const periodEnd=sub=>Math.max(Number(sub.current_period_end||0),...(sub.items?.data||[]).map(i=>Number(i.current_period_end||0)),0)*1000;
async function invoiceForCharge(client,charge){
  let id=idOf(charge.invoice);
  if(!id&&charge.payment_intent){const payments=await all(p=>client.invoicePayments.list(p),{payment:{type:'payment_intent',payment_intent:idOf(charge.payment_intent)}});id=idOf(payments.find(p=>p.status==='paid')?.invoice);}
  return id?client.invoices.retrieve(id):null;
}
async function nextRenewals(client,subscriptions,descriptor){
  const rows=[];
  for(const sub of subscriptions){if(sub.cancel_at_period_end||!['active','trialing','past_due','unpaid','incomplete'].includes(sub.status))continue;let item=sub.items?.data?.[0];if(sub.items?.data?.length!==1)continue;
    const at=periodEnd(sub);if(sub.schedule){const schedule=await client.subscriptionSchedules.retrieve(idOf(sub.schedule)),phase=schedule.phases?.find(p=>Number(p.start_date)*1000===at);if(phase){if(phase.items?.length!==1)continue;item=phase.items[0];}}
    const price=typeof item.price==='object'?item.price:await client.prices.retrieve(idOf(item.price)),d=descriptor(price.id);if(!WEIGHT[d.tier]||!Number.isSafeInteger(price.unit_amount)||item.quantity!==1)continue;
    rows.push({subscriptionId:sub.id,tier:d.tier,cadence:d.cadence,at,basePriceMinor:price.unit_amount,currency:price.currency,estimate:true});
  }
  return rows;
}
// Project funded service periods, not whichever subscription webhook happened
// to arrive last. A refund for an older invoice cannot revoke a later paid year.
function project({subscriptions,invoices,refundedInvoices,descriptor,now,previous={}}){
  const ledger={},fundedEnds=[];
  for(const sub of subscriptions){
    const item=sub.items?.data?.[0],current=descriptor(idOf(item?.price)),end=periodEnd(sub);
    const funded=[];
    const credits=invoices.filter(i=>subscriptionId(i)===sub.id&&i.status==='paid').flatMap(i=>i.lines?.data||[]).filter(l=>Number(l.amount)<0);
    for(const invoice of invoices.filter(i=>subscriptionId(i)===sub.id&&i.status==='paid'&&!refundedInvoices.has(i.id))){
      for(const line of invoice.lines?.data||[]){
        const d=descriptor(priceId(line)),start=Number(line.period?.start||0)*1000,until=Number(line.period?.end||0)*1000;
        if(WEIGHT[d.tier]>0&&Number(line.amount)>=0)fundedEnds.push(until);
        const alreadyCredited=credits.some(c=>priceId(c)===priceId(line)&&Number(c.period?.start||0)*1000<=now&&Number(c.period?.end||0)*1000>now);
        if(WEIGHT[d.tier]>0&&Number(line.amount)>=0&&start<=now&&until>now&&!alreadyCredited)funded.push({tier:d.tier,cadence:d.cadence,start,until,invoiceId:invoice.id,created:Number(invoice.created||0)});
      }
    }
    const validStatus=['active','trialing','past_due','unpaid','incomplete'].includes(sub.status);
    const currentFunded=funded.filter(g=>g.tier===current.tier&&g.cadence===current.cadence).sort((a,b)=>b.until-a.until||b.created-a.created)[0];
    const priorFunded=funded.sort((a,b)=>b.created-a.created||WEIGHT[b.tier]-WEIGHT[a.tier])[0];
    const grant=sub.status==='trialing'&&end>now&&WEIGHT[current.tier]>0?{tier:current.tier,cadence:current.cadence,until:end,invoiceId:null}:currentFunded||priorFunded;
    ledger[sub.id]={id:sub.id,providerStatus:sub.status,tier:current.tier,cadence:current.cadence,currentPeriodEnd:end,cancelAtPeriodEnd:!!sub.cancel_at_period_end,pendingUpdate:!!sub.pending_update,
      active:!!(validStatus&&grant&&grant.until>now),paidTier:validStatus&&grant?grant.tier:'free',paidUntil:validStatus&&grant?grant.until:0,paidInvoiceId:grant?.invoiceId||null};
  }
  const active=Object.values(ledger).filter(s=>s.active).sort((a,b)=>WEIGHT[b.paidTier]-WEIGHT[a.paidTier]||b.paidUntil-a.paidUntil),winner=active[0];
  const mostRecent=Object.values(ledger).sort((a,b)=>b.currentPeriodEnd-a.currentPeriodEnd)[0];
  const next={paidSubscriptions:ledger,paidTier:winner?.paidTier||'free',subscriptionStatus:winner?'active':mostRecent?.providerStatus||'none',
    currentPeriodEnd:winner?.paidUntil||mostRecent?.currentPeriodEnd||Number(previous.currentPeriodEnd||0),billingCadence:winner?.cadence||mostRecent?.cadence||previous.billingCadence||null,
    cancelAtPeriodEnd:!!winner?.cancelAtPeriodEnd,activeSubscriptionId:winner?.id||null,lastPaidTier:winner?.paidTier||previous.lastPaidTier||mostRecent?.tier||'free',serverVerifiedAt:now};
  next.paidAccess={plusExpiresAt:Math.max(0,...active.filter(s=>s.paidTier==='plus').map(s=>s.paidUntil)),proExpiresAt:Math.max(0,...active.filter(s=>s.paidTier==='pro').map(s=>s.paidUntil))};
  // Retention starts at the last actually funded end, not a new unpaid invoice's end.
  if(!winner)next.currentPeriodEnd=Math.min(Math.max(0,...fundedEnds,Number(previous.currentPeriodEnd)||0),now);
  return next;
}
async function readFunding(client,customerId){
  const [subscriptions,invoices,charges]=await Promise.all([
    all(p=>client.subscriptions.list(p),{customer:customerId,status:'all'}),
    all(p=>client.invoices.list(p),{customer:customerId,status:'paid'}),
    all(p=>client.charges.list(p),{customer:customerId})]);
  for(const invoice of invoices)if(invoice.lines?.has_more)invoice.lines={data:await all(p=>client.invoices.listLineItems(invoice.id,p)),has_more:false};
  const invoiceRefunds={},refundsByCharge={},chargeInvoiceIds={};
  for(const charge of charges){
    const refunds=await all(p=>client.refunds.list(p),{charge:charge.id});refundsByCharge[charge.id]=refunds;
    const invoice=await invoiceForCharge(client,charge);chargeInvoiceIds[charge.id]=invoice?.id||null;
    if(invoice)invoiceRefunds[invoice.id]=(invoiceRefunds[invoice.id]||0)+refunds.filter(r=>r.status==='succeeded').reduce((n,r)=>n+Number(r.amount||0),0);
  }
  return{subscriptions,invoices,charges,refundsByCharge,chargeInvoiceIds,invoiceRefunds};
}
// Shared by the actual entitlement update and CS's read-only refund preview.
// This does not restore consumed credits or introduce a new refund policy.
function fundedSnapshot(inputs,{descriptor,now:stamp,previous={},retentionLifecycle}){
  const {subscriptions,invoices,invoiceRefunds}=inputs,refundedInvoices=new Set(invoices.filter(i=>Number(i.amount_paid)>0&&(invoiceRefunds[i.id]||0)>=Number(i.amount_paid)).map(i=>i.id));
  const next=project({subscriptions,invoices,refundedInvoices,descriptor,now:stamp,previous});
  const currentlyRefunded=invoices.some(i=>refundedInvoices.has(i.id)&&(i.lines?.data||[]).some(l=>WEIGHT[descriptor(priceId(l)).tier]>0&&Number(l.amount)>=0&&Number(l.period?.start)*1000<=stamp&&Number(l.period?.end)*1000>stamp));
  if(currentlyRefunded&&!Object.values(next.paidSubscriptions).some(s=>s.active)){next.subscriptionStatus='refunded';next.refundedAt=previous.subscriptionStatus==='refunded'?previous.refundedAt||stamp:stamp;next.currentPeriodEnd=next.refundedAt;}
  next.refundReviewState=refundedInvoices.size?'full-refund-applied':Object.values(invoiceRefunds).some(n=>n>0)?'manual-review':null;
  next.accountRetention=retentionLifecycle(previous,next,stamp);
  return{...previous,...next};
}
async function reconcile({db,client,uid,descriptor,retentionLifecycle,now=Date.now}){
  const ref=db.doc(`users/${uid}/entitlements/current`),mapping=await db.doc(`billingCustomers/${uid}`).get();
  if(!mapping.exists)return null;
  const lock=db.doc(`billingProjectionLocks/${uid}`),token=crypto.randomUUID();
  await db.runTransaction(async tx=>{const snap=await tx.get(lock);if(Number(snap.data()?.until)>now())fail('billing_refresh_in_progress');tx.set(lock,{token,until:now()+120000});});
  try{
  const stamp=now(),inputs=await readFunding(client,mapping.data().stripeCustomerId),renewals=await nextRenewals(client,inputs.subscriptions,descriptor);
  let result;await db.runTransaction(async tx=>{
    const [snap,lease]=await Promise.all([tx.get(ref),tx.get(lock)]),previous=snap.exists?snap.data():{};
    if(lease.data()?.token!==token||lease.data()?.until<=now())fail('billing_refresh_retry');
    const next=fundedSnapshot(inputs,{descriptor,now:stamp,previous,retentionLifecycle});
    next.nextRenewals=renewals;
    if(snap.exists)tx.update(ref,next);else tx.set(ref,next);result={...previous,...next};
  });return result;
  }finally{await db.runTransaction(async tx=>{const snap=await tx.get(lock);if(snap.data()?.token===token)tx.update(lock,{until:0});});}
}
async function stopRenewalForCharge({client,charge,key}){
  const invoice=await invoiceForCharge(client,charge),id=invoice&&subscriptionId(invoice);if(!id)fail('payment_subscription_unavailable');
  const sub=await client.subscriptions.retrieve(id);if(idOf(sub.customer)!==idOf(charge.customer))fail('payment_subscription_unavailable');
  if(['canceled','incomplete_expired'].includes(sub.status))return{subscriptionId:id,state:'already_ended',periodEnd:periodEnd(sub)};
  if(sub.cancel_at_period_end)return{subscriptionId:id,state:'scheduled',periodEnd:periodEnd(sub)};
  const result=await client.subscriptions.update(id,{cancel_at_period_end:true},{idempotencyKey:key});
  return{subscriptionId:id,state:result.cancel_at_period_end?'scheduled':'not_confirmed',periodEnd:periodEnd(result)};
}
module.exports={project,reconcile,readFunding,fundedSnapshot,invoiceForCharge,subscriptionId,priceId,periodEnd,stopRenewalForCharge,nextRenewals};
