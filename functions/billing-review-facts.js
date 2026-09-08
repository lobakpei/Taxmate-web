'use strict';
// Explicit refund-review contract, not a copy of provider response objects.
// Keep in sync with readFunding, projectPayment, fundedSnapshot, effectiveTier
// and retention lifecycle. Presentation/receipt URLs and observation timestamps
// never bind an approval; identity, funding and entitlement changes always do.
const {idOf}=require('./billing-service');
// Preserve explicit null versus absence (notably promotion expiresAt:null
// means permanent, whereas a missing expiry does not grant permanent access).
const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>v?.[k]!==undefined).map(k=>[k,v[k]]));
const rows=(v,project)=>(v||[]).map(project);
const map=(v,project)=>Object.fromEntries(Object.entries(v||{}).map(([k,x])=>[k,project(x)]));
const period=v=>pick(v,['start','end']);
function price(v,descriptor){
  const id=idOf(v);
  return {id,classification:pick(descriptor(id),['tier','cadence','legacy']),
    ...pick(v,['currency','unit_amount','unit_amount_decimal','billing_scheme','tiers_mode','tax_behavior']),
    productId:idOf(v?.product),recurring:pick(v?.recurring,['interval','interval_count','usage_type','aggregate_usage']),
    transformQuantity:pick(v?.transform_quantity,['divide_by','round'])};
}
const item=(v,descriptor)=>({...pick(v,['id','quantity','current_period_start','current_period_end']),price:price(v.price,descriptor)});
const proration=v=>({creditedItems:v?.credited_items?{invoice:idOf(v.credited_items.invoice),invoiceLineItems:rows(v.credited_items.invoice_line_items,idOf)}:null});
function line(v,descriptor){
  return {...pick(v,['id','amount','currency','quantity','proration','discountable','type']),
    price:price(idOf(v.price)?v.price:v.pricing?.price_details?.price,descriptor),period:period(v.period),
    unitAmountDecimal:v.pricing?.unit_amount_decimal??null,
    subscriptionId:idOf(v.subscription),subscriptionItemId:idOf(v.subscription_item),invoiceItemId:idOf(v.invoice_item),
    prorationDetails:proration(v.proration_details),parentType:v.parent?.type??null,
    subscriptionItemDetails:{...pick(v.parent?.subscription_item_details,['proration']),
      subscription:idOf(v.parent?.subscription_item_details?.subscription),subscriptionItem:idOf(v.parent?.subscription_item_details?.subscription_item),
      invoiceItem:idOf(v.parent?.subscription_item_details?.invoice_item),prorationDetails:proration(v.parent?.subscription_item_details?.proration_details)},
    invoiceItemDetails:{...pick(v.parent?.invoice_item_details,['proration']),invoiceItem:idOf(v.parent?.invoice_item_details?.invoice_item),subscription:idOf(v.parent?.invoice_item_details?.subscription),
      prorationDetails:proration(v.parent?.invoice_item_details?.proration_details)},
    discountAmounts:rows(v.discount_amounts,x=>({amount:x.amount,discount:idOf(x.discount)})),
    taxAmounts:rows(v.tax_amounts,x=>({...pick(x,['amount','inclusive','taxable_amount','taxability_reason']),taxRate:idOf(x.tax_rate)}))};
}
function subscription(v,descriptor){
  return {...pick(v,['id','livemode','status','currency','collection_method','current_period_start','current_period_end','billing_cycle_anchor',
    'cancel_at_period_end','cancel_at','canceled_at','ended_at','trial_start','trial_end','start_date']),customerId:idOf(v.customer),
    latestInvoiceId:idOf(v.latest_invoice),scheduleId:idOf(v.schedule),
    items:rows(v.items?.data,x=>item(x,descriptor)),
    pendingUpdate:v.pending_update?{...pick(v.pending_update,['expires_at','billing_cycle_anchor','trial_end','trial_from_plan']),
      subscriptionItems:rows(v.pending_update.subscription_items,x=>item(x,descriptor))}:null,
    pauseCollection:v.pause_collection?pick(v.pause_collection,['behavior','resumes_at']):null};
}
function invoice(v,descriptor){
  return {...pick(v,['id','livemode','status','paid','currency','created','billing_reason','collection_method','period_start','period_end',
    'amount_paid','amount_due','amount_remaining','amount_overpaid','total','subtotal','total_excluding_tax','subtotal_excluding_tax',
    'starting_balance','ending_balance','pre_payment_credit_notes_amount','post_payment_credit_notes_amount']),
    customerId:idOf(v.customer),subscriptionId:idOf(v.subscription)||idOf(v.parent?.subscription_details?.subscription),
    chargeId:idOf(v.charge),paymentIntentId:idOf(v.payment_intent),
    statusTransitions:pick(v.status_transitions,['finalized_at','paid_at','marked_uncollectible_at','voided_at']),
    lines:rows(v.lines?.data,x=>line(x,descriptor)),
    discountAmounts:rows(v.total_discount_amounts,x=>({amount:x.amount,discount:idOf(x.discount)})),
    taxAmounts:rows(v.total_tax_amounts||v.total_taxes,x=>({...pick(x,['amount','inclusive','taxable_amount','taxability_reason','type']),taxRate:idOf(x.tax_rate)||idOf(x.tax_rate_details?.tax_rate)})),
    payments:rows(v.payments?.data,x=>({...pick(x,['id','status','currency','amount_paid','amount_requested','is_default','created']),
      invoiceId:idOf(x.invoice),payment:{type:x.payment?.type??null,paymentIntentId:idOf(x.payment?.payment_intent),chargeId:idOf(x.payment?.charge),paymentRecordId:idOf(x.payment?.payment_record)}}))};
}
function fundingFacts(inputs,descriptor){
  return {
    charges:rows(inputs.charges,v=>({...pick(v,['id','livemode','created','amount','amount_captured','amount_refunded','currency','paid','status','captured','refunded','disputed','failure_code']),
      customerId:idOf(v.customer),invoiceId:idOf(v.invoice),paymentIntentId:idOf(v.payment_intent),disputeId:idOf(v.dispute)})),
    refundsByCharge:map(inputs.refundsByCharge,values=>rows(values,v=>({...pick(v,['id','created','amount','currency','status','reason','failure_reason']),
      chargeId:idOf(v.charge),paymentIntentId:idOf(v.payment_intent),operation:pick(v.metadata,['taxmateCase','taxmateOperation'])}))),
    chargeInvoiceIds:map(inputs.chargeInvoiceIds,idOf),invoiceRefunds:map(inputs.invoiceRefunds,x=>x),
    invoices:rows(inputs.invoices,x=>invoice(x,descriptor)),subscriptions:rows(inputs.subscriptions,x=>subscription(x,descriptor))
  };
}
const promotion=v=>v?pick(v,['id','status','tier','startsAt','expiresAt','permanent','promoCode','revokedAt']):null;
const access=v=>pick(v,['plusExpiresAt','proExpiresAt']);
function entitlementFacts(v){
  if(!v)return null;
  return {...pick(v,['paidTier','lastPaidTier','subscriptionStatus','currentPeriodEnd','billingCadence','cancelAtPeriodEnd','activeSubscriptionId','graceUntil','refundedAt','refundReviewState']),
    paidAccess:access(v.paidAccess),
    paidSubscriptions:map(v.paidSubscriptions,x=>pick(x,['id','providerStatus','tier','cadence','currentPeriodEnd','cancelAtPeriodEnd','pendingUpdate','active','paidTier','paidUntil','paidInvoiceId'])),
    // An empty collection and the absent legacy-fallback collection are not
    // interchangeable in summary/retention, even when the current tier matches.
    promotionCollectionPresent:!!v.promotions,promotions:map(v.promotions,promotion),promotion:promotion(v.promotion),
    promotionAccess:pick(v.promotionAccess,['plusPermanent','proPermanent','plusExpiresAt','proExpiresAt']),
    accountRetention:pick(v.accountRetention,['schemaVersion','paidAccessEndedAt','retainThroughDate','scheduledDeletionDate','deleteAfterAt','purgeRequired',
      'requiredCutoffDate','dateNeedsChecking','lastRetentionEpoch','lastDeletionCutoffDate','lastDeletionCompletedAt']),
    ltdArchive:pick(v.ltdArchive,['startedAt']),
    nextRenewals:rows(v.nextRenewals,x=>pick(x,['subscriptionId','tier','cadence','at','basePriceMinor','currency','estimate']))};
}
module.exports={fundingFacts,entitlementFacts};
