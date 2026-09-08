'use strict';
// Server-only billing casework. No automatic eligibility, refund window or
// monetary discretion is inferred from a reason selected by the customer.
const crypto=require('node:crypto');
const idOf=value=>typeof value==='string'?value:value&&value.id||null;
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const REASONS=new Set(['cancel_service','payment_question','service_problem','other']);
const BASES=new Set(['statutory_cancellation','statutory_remedy','contractual','goodwill','payment_correction']);
const RESERVED=new Set(['pending','requires_action','succeeded']);
function fail(reason,code='failed-precondition'){throw Object.assign(new Error(reason),{billingReason:reason,billingCode:code});}
function text(value,max=2000){return typeof value==='string'?value.trim().slice(0,max):'';}
function amount(value){return Number.isSafeInteger(value)&&value>=0?value:null;}
function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['invoice.stripe.com','pay.stripe.com','receipt.stripe.com','dashboard.stripe.com'].includes(u.hostname)?u.href:null;}catch(_){return null;}}
async function all(list,params={}){
  const rows=[];let cursor;
  do{const page=await list({...params,limit:100,...(cursor?{starting_after:cursor}:{})});rows.push(...page.data);if(!page.has_more)return rows;cursor=page.data.at(-1)?.id;if(!cursor)fail('provider_pagination');}while(rows.length<10000);
  fail('provider_pagination');
}
function projectPayment(charge,refunds=[]){
  const paid=charge.paid===true&&charge.status==='succeeded',original=amount(charge.amount)||0;
  const refunded=refunds.filter(r=>r.status==='succeeded').reduce((n,r)=>n+(amount(r.amount)||0),0);
  const reserved=refunds.filter(r=>RESERVED.has(r.status)).reduce((n,r)=>n+(amount(r.amount)||0),0);
  return{id:charge.id,createdAt:Number(charge.created||0)*1000,amountMinor:original,currency:String(charge.currency||'').toLowerCase(),paid,
    refundedMinor:refunded,pendingRefundMinor:reserved-refunded,availableMinor:paid?Math.max(0,original-reserved):0,
    receiptUrl:safeUrl(charge.receipt_url),status:!paid?'not_paid':refunded>=original&&original>0?'refunded':reserved>refunded?'refund_pending':refunded>0?'partially_refunded':'paid'};
}
function refundAccessKnown(value){
  const r=value?.retention;
  return ['free','plus','pro'].includes(value?.tier)&&!!r&&(r.status==='paid'||(['retained','expired'].includes(r.status)&&/^\d{4}-\d{2}-\d{2}$/.test(r.retainThroughDate||'')&&/^\d{4}-\d{2}-\d{2}$/.test(r.deleteOnDate||'')));
}
function publicCase(value){
  if(!value)return null;
  const keys=['id','paymentId','createdAt','updatedAt','revision','state','reason','customerNote','acknowledgement','payment','approvedMinor','currency','decision','publicReason','providerStatus','refundId','refundSubmittedAt','refundCompletedAt','renewalAction','renewalState'];
  const result=Object.fromEntries(keys.filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
  // A reviewed forecast is not a confirmed outcome. In particular, never use
  // the current account card (or an old forecast) to fill missing result dates.
  if(value.state==='refunded'){
    const confirmed=value.confirmedRefundImpact;
    result.refundImpact=confirmed?.refundId===value.refundId&&confirmed?.basis==='confirmed'?confirmed:{basis:'needs_checking'};
  }else if(['approved','refund_submitting','refund_pending'].includes(value.state)){
    const impact=value.reviewContext?.preview;
    result.refundImpact=refundAccessKnown(impact?.after)?{basis:'conditional',observedAt:value.reviewContext.observedAt,changesAccess:impact.changesAccess,afterTier:impact.after.tier,retention:impact.after.retention}:{basis:'needs_checking'};
  }
  return result;
}
function createService({db,client,now=Date.now,moneyOperationsEnabled=false,onRefundChanged=async()=>{},readReviewContext=async()=>({status:'needs_checking',missing:['review_context']})}){
  const cases=db.collection('billingRefundCases');
  async function customer(uid){const s=await db.doc(`billingCustomers/${uid}`).get();return s.exists?idOf(s.data().stripeCustomerId):null;}
  async function ownedCharge(uid,paymentId){
    if(!/^ch_[A-Za-z0-9_]+$/.test(String(paymentId||'')))fail('payment_not_found','not-found');
    const customerId=await customer(uid);if(!customerId)fail('payment_not_found','not-found');
    const charge=await client.charges.retrieve(paymentId);
    if(idOf(charge.customer)!==customerId)fail('payment_not_found','not-found');
    const refunds=await all(p=>client.refunds.list(p),{charge:charge.id});
    return{charge,refunds,payment:projectPayment(charge,refunds)};
  }
  async function history(uid,{cursor}={}){
    const customerId=await customer(uid);if(!customerId)return{payments:[],hasMore:false,cursor:null,source:'stripe',customerExists:false};
    if(cursor&&!/^ch_[A-Za-z0-9_]+$/.test(cursor))fail('history_cursor','invalid-argument');
    // The provider applies the customer filter. No customer is created by a read.
    const page=await client.charges.list({customer:customerId,limit:20,...(cursor?{starting_after:cursor}:{})});
    const payments=await Promise.all(page.data.map(async charge=>projectPayment(charge,await all(p=>client.refunds.list(p),{charge:charge.id}))));
    return{payments,hasMore:!!page.has_more,cursor:page.has_more?page.data.at(-1)?.id:null,source:'stripe',customerExists:true};
  }
  async function listCases(uid){const snap=await cases.where('uid','==',uid).get();return{cases:snap.docs.map(d=>publicCase(d.data())).sort((a,b)=>b.createdAt-a.createdAt)};}
  async function submit(uid,data){
    if(!REASONS.has(data?.reason))fail('refund_reason_required','invalid-argument');
    if(!/^[a-f0-9-]{36}$/.test(String(data.requestId||'')))fail('request_identity_required','invalid-argument');
    const {payment}=await ownedCharge(uid,data.paymentId);if(!payment.paid)fail('payment_not_paid');
    const id='case_'+digest(`${uid}:${payment.id}:${data.requestId}`).slice(0,40),ref=cases.doc(id),stamp=now(),index=db.doc(`billingRefundPaymentIndex/${digest(`${uid}:${payment.id}`)}`);
    let result;
    await db.runTransaction(async tx=>{
      const [old,last]=await Promise.all([tx.get(ref),tx.get(index)]);if(old.exists){result=publicCase(old.data());return;}
      if(last.exists){const prior=await tx.get(cases.doc(last.data().caseId));if(prior.exists&&!['refunded','declined','refund_failed','refund_canceled'].includes(prior.data().state)){result=publicCase(prior.data());return;}}
      const record={id,uid,paymentId:payment.id,createdAt:stamp,updatedAt:stamp,revision:1,state:'submitted',reason:data.reason,customerNote:text(data.note),payment,currency:payment.currency};
      record.acknowledgement={caseId:id,accountUid:uid,receivedAt:stamp,reason:data.reason,note:record.customerNote,paymentId:payment.id,notice:'Request received. This acknowledges receipt only, not eligibility, approval or refund completion.'};
      tx.create(ref,record);tx.set(index,{uid,paymentId:payment.id,caseId:id});tx.create(ref.collection('events').doc('submitted'),{at:stamp,actor:uid,action:'submitted',revision:1,reason:data.reason,note:record.customerNote,paymentId:payment.id});result=publicCase(record);
    });
    return{case:result};
  }
  async function reply(uid,data){
    const note=text(data?.note);if(!note)fail('refund_note_required','invalid-argument');
    const ref=cases.doc(text(data.caseId,100));let result;
    await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists||snap.data().uid!==uid)fail('case_not_found','not-found');const old=snap.data();if(old.state!=='needs_information')fail('case_not_waiting');const next={...old,customerNote:note,state:'submitted',revision:old.revision+1,updatedAt:now()};tx.set(ref,next);tx.create(ref.collection('events').doc(`reply_${next.revision}`),{at:next.updatedAt,actor:uid,action:'customer_reply',note,revision:next.revision});result=publicCase(next);});return{case:result};
  }
  async function staffList({cursor}={}){let query=cases.orderBy('updatedAt','desc');if(cursor){const snap=await cases.doc(text(cursor,100)).get();if(!snap.exists)fail('case_not_found','not-found');query=query.startAfter(snap);}const snap=await query.limit(101).get(),docs=snap.docs.slice(0,100);return{cases:docs.map(d=>d.data()),hasMore:snap.docs.length>100,cursor:snap.docs.length>100?docs.at(-1).id:null};}
  async function staffRead(caseId,previewAmountMinor){const ref=cases.doc(text(caseId,100)),snap=await ref.get();if(!snap.exists)fail('case_not_found','not-found');const events=await ref.collection('events').orderBy('at','asc').get();let context;try{context=await readReviewContext(snap.data(),previewAmountMinor);}catch(_){context={status:'needs_checking',missing:['provider_context'],observedAt:now()};}return{case:snap.data(),events:events.docs.map(d=>d.data()),context};}
  async function review(actor,data){
    if(!['full','partial','decline','needs_information'].includes(data?.decision))fail('review_decision_required','invalid-argument');
    const publicReason=text(data.publicReason),basis=text(data.basis,60),reference=text(data.reference,500),calculation=text(data.calculation);
    if(!publicReason)fail('review_reason_required','invalid-argument');
    if(data.decision!=='needs_information'&&(!BASES.has(basis)||!reference||!calculation))fail('review_basis_required','invalid-argument');
    const ref=cases.doc(text(data.caseId,100)),snap=await ref.get();if(!snap.exists)fail('case_not_found','not-found');
    const {payment}=await ownedCharge(snap.data().uid,snap.data().paymentId);
    const approved=data.decision==='full'?payment.availableMinor:data.decision==='partial'?amount(data.amountMinor):0;
    if(['full','partial'].includes(data.decision)&&(approved===null||approved<=0||approved>payment.availableMinor))fail('review_amount_unavailable');
    if(data.decision==='partial'&&approved>=payment.amountMinor)fail('review_partial_amount');
    const context=await readReviewContext(snap.data(),approved);
    if(data.decision!=='needs_information'){
      if(context.status!=='ready')fail('review_context_incomplete');
      if(!data.contextVersion||context.version!==data.contextVersion)fail('review_context_changed');
      if(data.impactConfirmedMinor!==approved||context.preview?.amountMinor!==approved)fail('review_impact_required');
    }
    // A refund and stopping renewal are separate recorded decisions.
    if(!['unchanged','stop_at_period_end'].includes(data.renewalAction||'unchanged'))fail('renewal_action_required','invalid-argument');
    if(data.decision==='needs_information'&&data.renewalAction==='stop_at_period_end')fail('renewal_needs_approval');
    let result;await db.runTransaction(async tx=>{
      const current=await tx.get(ref),old=current.data();
      if(old.revision!==data.revision||!['submitted','needs_information','approved'].includes(old.state))fail('case_changed');
      const stamp=now(),revision=old.revision+1,state=data.decision==='needs_information'?'needs_information':data.decision==='decline'?'declined':'approved';
      const next={...old,payment,revision,state,decision:data.decision,approvedMinor:approved,currency:payment.currency,publicReason,basis,reference,calculation,reviewedBy:actor,reviewedAt:stamp,updatedAt:stamp,renewalAction:data.renewalAction||'unchanged',renewalState:'not_requested',reviewContextVersion:context.version||null,reviewContext:context};
      tx.set(ref,next);tx.create(ref.collection('events').doc(`review_${revision}`),{at:stamp,actor,action:'review',decision:data.decision,approvedMinor:approved,currency:payment.currency,basis,reference,calculation,publicReason,revision,renewalAction:next.renewalAction,contextVersion:context.version||null,impact:context.preview||null});result=next;
    });return{case:result};
  }
  async function recordProvider(ref,refund){
    let result;await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists)fail('case_not_found','not-found');const old=snap.data();
      if(idOf(refund.charge)!==old.paymentId||refund.amount!==old.approvedMinor||refund.currency!==old.currency)fail('refund_provider_mismatch');
      const state=refund.status==='succeeded'?'refunded':refund.status==='failed'?'refund_failed':refund.status==='canceled'?'refund_canceled':'refund_pending';
      const stamp=now(),next={...old,state,refundId:refund.id,providerStatus:refund.status,refundSubmittedAt:old.refundSubmittedAt||Number(refund.created)*1000,updatedAt:stamp,...(refund.status==='succeeded'?{refundCompletedAt:old.refundCompletedAt||stamp}:{})};
      tx.set(ref,next);tx.set(ref.collection('events').doc(`provider_${refund.id}_${refund.status}`),{at:stamp,actor:'stripe',action:'refund_status',refundId:refund.id,status:refund.status,amountMinor:refund.amount,currency:refund.currency});result=next;
    });
    await onRefundChanged(result.uid,result.paymentId);
    if(result.state==='refunded'&&result.confirmedRefundImpact?.basis!=='confirmed'){
      // Read actual funding AFTER reconciliation. Keep the first verified
      // result as a dated case record; later account changes are not this refund.
      let context;try{context=await readReviewContext(result);}catch(_){context=null;}
      const verified=context?.status==='ready'&&refundAccessKnown(context.current)&&context.refunds?.some(r=>r.id===refund.id&&r.status==='succeeded');
      if(verified){
        const impact={basis:'confirmed',refundId:refund.id,observedAt:context.observedAt,afterTier:context.current.tier,retention:context.current.retention};
        await db.runTransaction(async tx=>{
          const latest=(await tx.get(ref)).data();
          if(latest.state==='refunded'&&latest.refundId===refund.id&&latest.confirmedRefundImpact?.basis!=='confirmed'){
            tx.update(ref,{confirmedRefundImpact:impact});
            tx.set(ref.collection('events').doc(`impact_${refund.id}`),{at:context.observedAt,actor:'server',action:'refund_impact_confirmed',refundId:refund.id,impact});
            result={...latest,confirmedRefundImpact:impact};
          }else result=latest;
        });
      }
    }
    return{case:result};
  }
  async function execute(actor,data){
    // Activation is a separate release step; reading/requesting/reviewing never moves money.
    if(!moneyOperationsEnabled)fail('money_operations_not_enabled');
    const ref=cases.doc(text(data?.caseId,100));let current;
    const observed=await ref.get();if(!observed.exists)fail('case_not_found','not-found');
    if(observed.data().state==='approved'){
      const context=await readReviewContext(observed.data(),observed.data().approvedMinor);
      if(context.status!=='ready')fail('review_context_incomplete');
      if(context.version!==data.contextVersion||context.version!==observed.data().reviewContextVersion)fail('review_context_changed');
    }
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists)fail('case_not_found','not-found');current=snap.data();
      if(current.refundId)return;
      if(!['approved','refund_submitting'].includes(current.state)||current.revision!==data.revision)fail('case_not_approved');
      if(current.state==='approved'){current={...current,state:'refund_submitting',operationKey:`taxmate-refund-${current.id}-${current.revision}`,operationStartedAt:now(),executedBy:actor,updatedAt:now()};tx.set(ref,current);tx.create(ref.collection('events').doc(`execute_${current.revision}`),{at:now(),actor,action:'execute_requested',amountMinor:current.approvedMinor,revision:current.revision});}
    });
    if(current.refundId)return recordProvider(ref,await client.refunds.retrieve(current.refundId));
    const {refunds,payment}=await ownedCharge(current.uid,current.paymentId);
    const existing=refunds.find(r=>r.metadata?.taxmateOperation===current.operationKey);
    if(existing)return recordProvider(ref,existing);
    // Stripe keys expire. Never blindly repeat an uncertain old money operation.
    if(now()-current.operationStartedAt>20*3600000)fail('refund_reconciliation_required');
    if(payment.availableMinor<current.approvedMinor)fail('refund_amount_changed');
    const refund=await client.refunds.create({charge:current.paymentId,amount:current.approvedMinor,metadata:{taxmateCase:current.id,taxmateOperation:current.operationKey}},{idempotencyKey:current.operationKey});
    return recordProvider(ref,refund);
  }
  async function reconcile(caseId){const ref=cases.doc(text(caseId,100)),snap=await ref.get();if(!snap.exists)fail('case_not_found','not-found');const current=snap.data();if(current.refundId)return recordProvider(ref,await client.refunds.retrieve(current.refundId));if(!current.operationKey)return{case:current};const {refunds}=await ownedCharge(current.uid,current.paymentId),found=refunds.find(r=>r.metadata?.taxmateOperation===current.operationKey);return found?recordProvider(ref,found):{case:current,reconciliation:'not_confirmed'};}
  async function refundEvent(refund){const id=refund.metadata?.taxmateCase;if(!/^case_[a-f0-9]{40}$/.test(id||''))return false;const ref=cases.doc(id),snap=await ref.get();if(!snap.exists)return false;await recordProvider(ref,refund);return true;}
  return{history,listCases,submit,reply,staffList,staffRead,review,execute,reconcile,refundEvent,ownedCharge,customer};
}
module.exports={createService,projectPayment,publicCase,all,idOf,fail,safeUrl};
