'use strict';
// Staff-only, read-only facts and a conditional forecast from the same funded
// projector used after refunds. This is not an eligibility or money decision.
const crypto=require('node:crypto');
const Billing=require('./billing-entitlements');
const {projectPayment,idOf,fail}=require('./billing-service');
const Retention=require('./retention-policy');
const Promotions=require('./founder-promotions');
const {fundingFacts,entitlementFacts}=require('./billing-review-facts');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const hash=v=>crypto.createHash('sha256').update(canonical(v)).digest('hex');
function summary(snapshot,at,effectiveTier){
  const grants=Object.values(snapshot.paidSubscriptions||{}).filter(s=>s.active).map(s=>({id:s.id,tier:s.paidTier,until:s.paidUntil,invoiceId:s.paidInvoiceId})).sort((a,b)=>a.id.localeCompare(b.id));
  const promotions=Object.entries(snapshot.promotions||{single:snapshot.promotion}).filter(([,p])=>p&&Promotions.activeGrant(p,at)).map(([id,p])=>({id,tier:p.tier,until:p.permanent||p.expiresAt===null?null:Number(p.expiresAt),permanent:!!p.permanent||p.expiresAt===null}));
  const retention=Retention.decide(snapshot,at);
  return{tier:effectiveTier(snapshot,at),grants,promotions,retention:{status:retention.status,retainThroughDate:retention.retainThroughDate,deleteOnDate:retention.deleteOnDate},paidAccess:snapshot.paidAccess};
}
function buildContext({inputs,previous,caseRecord,descriptor,effectiveTier,now,previewAmountMinor}){
  const charge=inputs.charges.find(c=>c.id===caseRecord.paymentId);if(!charge)fail('payment_not_found','not-found');
  const refunds=inputs.refundsByCharge[charge.id]||[],payment=projectPayment(charge,refunds),invoiceId=inputs.chargeInvoiceIds[charge.id],invoice=inputs.invoices.find(i=>i.id===invoiceId),subId=invoice&&Billing.subscriptionId(invoice),sub=inputs.subscriptions.find(s=>s.id===subId),missing=[];
  if(!invoice)missing.push('invoice');if(!sub)missing.push('subscription');
  if(!previous)missing.push('entitlement');
  const lines=(invoice?.lines?.data||[]).map(l=>({id:l.id,priceId:Billing.priceId(l),...descriptor(Billing.priceId(l)),amountMinor:Number(l.amount),startAt:Number(l.period?.start||0)*1000,endAt:Number(l.period?.end||0)*1000}));
  if(!lines.length||lines.some(l=>!['plus','pro'].includes(l.tier)||!Number.isSafeInteger(l.amountMinor)||!l.startAt||!l.endAt))missing.push('funded_lines');
  if(payment.pendingRefundMinor>0)missing.push('pending_refund');
  if(invoice&&inputs.charges.filter(c=>inputs.chargeInvoiceIds[c.id]===invoiceId&&c.paid&&c.status==='succeeded').reduce((n,c)=>n+Number(c.amount),0)!==invoice.amount_paid)missing.push('invoice_payment_allocation');
  // A forecast may not conceal a separate legacy grace/projected grant that
  // needs reconciling with the authoritative promotion records.
  if(Number(previous?.graceUntil)>now)missing.push('legacy_grace');
  const options={descriptor,now,previous:previous||{},retentionLifecycle:Retention.lifecycle},before=Billing.fundedSnapshot(inputs,options),current=summary(before,now,effectiveTier);
  const forecast=amountMinor=>{
    if(!Number.isSafeInteger(amountMinor)||amountMinor<0||amountMinor>payment.availableMinor)return null;
    const nextInputs={...inputs,invoiceRefunds:{...inputs.invoiceRefunds,...(invoice?{[invoice.id]:(inputs.invoiceRefunds[invoice.id]||0)+amountMinor}:{})}};
    const after=summary(Billing.fundedSnapshot(nextInputs,options),now,effectiveTier);
    return{amountMinor,ifRefundSucceeds:true,after,changesAccess:canonical(current)!==canonical(after),fullPaymentRefunded:payment.refundedMinor+amountMinor>=payment.amountMinor,fullInvoiceRefunded:!!invoice&&(nextInputs.invoiceRefunds[invoice.id]||0)>=invoice.amount_paid,consumedCredit:lines.some(l=>l.amountMinor<0)};
  };
  const requested=previewAmountMinor===undefined?(caseRecord.approvedMinor??payment.availableMinor):previewAmountMinor;
  const canPreview=!caseRecord.refundId&&!['refund_submitting','refunded','refund_failed','refund_canceled','declined'].includes(caseRecord.state);
  const preview=missing.length||!canPreview?null:forecast(requested),remaining=missing.length||!canPreview?null:forecast(payment.availableMinor);
  // Version binds explicit material facts, including retained independent grants
  // and lifecycle controls. Expiring links remain available for display below.
  // The contract revision deliberately invalidates pre-fix approvals: staff must
  // refresh/preview/review normally, never migrate a stored approval hash.
  const material={contractVersion:2,caseIdentity:{uid:caseRecord.uid,paymentId:caseRecord.paymentId},
    inputs:fundingFacts(inputs,descriptor),previous:entitlementFacts(previous),projected:entitlementFacts(before),current,missing};
  return{schemaVersion:1,status:missing.length?'needs_checking':'ready',missing,version:hash(material),observedAt:now,payment,
    invoice:invoice?{id:invoice.id,status:invoice.status,amountPaidMinor:invoice.amount_paid,currency:invoice.currency,subscriptionId:subId,lines}:null,
    subscription:sub?{id:sub.id,status:sub.status,cancelAtPeriodEnd:!!sub.cancel_at_period_end,currentPeriodEnd:Billing.periodEnd(sub),tier:descriptor(idOf(sub.items?.data?.[0]?.price)).tier}:null,
    refunds:refunds.map(r=>({id:r.id,amountMinor:r.amount,currency:r.currency,status:r.status,createdAt:Number(r.created)*1000})),current,preview,remaining,otherGrants:[...current.grants.filter(g=>g.id!==subId),...current.promotions],
    recordRefs:{paymentId:charge.id,invoiceId:invoiceId||null,subscriptionId:subId||null,entitlementPath:`users/${caseRecord.uid}/entitlements/current`}};
}
async function readContext({db,client,caseRecord,descriptor,effectiveTier,now=Date.now,previewAmountMinor}){
  const [mapping,entitlement]=await Promise.all([db.doc(`billingCustomers/${caseRecord.uid}`).get(),db.doc(`users/${caseRecord.uid}/entitlements/current`).get()]);
  if(!mapping.exists)fail('payment_not_found','not-found');
  const inputs=await Billing.readFunding(client,mapping.data().stripeCustomerId);
  return buildContext({inputs,previous:entitlement.exists?entitlement.data():null,caseRecord,descriptor,effectiveTier,now:now(),previewAmountMinor});
}
module.exports={readContext,buildContext};
