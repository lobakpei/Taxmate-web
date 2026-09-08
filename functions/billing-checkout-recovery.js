'use strict';
const {all,idOf,fail}=require('./billing-service');

// Only this known pre-execution validation response proves a rejected request.
// Generic 4xx/5xx, timeouts and an empty Session list never prove non-creation.
function classifyCheckoutFailure(error){
  const requestId=/^req_[A-Za-z0-9]+$/.test(error?.requestId||'')?error.requestId:null;
  const httpStatus=Number(error?.statusCode)||null;
  const type=error?.rawType||error?.raw?.type||null;
  const termsRejected=httpStatus===400&&type==='invalid_request_error'&&requestId&&
    String(error?.message||'').startsWith('You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard.');
  return{requestId,httpStatus,type:type==='invalid_request_error'?type:'unclassified',reason:termsRejected?'terms_url_required':'outcome_unknown'};
}

function createRecovery({db,client,now=Date.now}){
  async function recordFailure({uid,operation,customerId,error}){
    const failure={uid,offerId:operation.offerId,operationKey:operation.key,customerId,...classifyCheckoutFailure(error),source:'stripe_sdk',recordedAt:now()};
    const ref=db.doc(`billingCheckoutFailures/${operation.offerId}`);
    // Keep the first observation, including an unknown outcome. A later failure
    // must not silently turn a previously uncertain request into safe-to-replace.
    await db.runTransaction(async tx=>{if(!(await tx.get(ref)).exists)tx.create(ref,failure);});
  }

  async function reconcile(uid,operation){
    const map=await db.doc(`billingCustomers/${uid}`).get(),customerId=idOf(map.data()?.stripeCustomerId);
    if(!customerId)fail('checkout_reconciliation_required');
    const sessions=await all(p=>client.checkout.sessions.list(p),{customer:customerId});
    const matching=sessions.filter(s=>s.metadata?.taxmateOffer===operation.offerId);
    if(matching.length>1||matching.some(s=>idOf(s.customer)!==customerId||s.metadata?.firebaseUid!==uid||s.mode!=='subscription'))fail('checkout_reconciliation_required');
    const lock=db.doc(`billingCheckoutLocks/${uid}`),attempt=db.doc(`billingCheckoutAttempts/${operation.offerId}`);
    const session=matching[0];
    if(session){
      if(!['open','complete','expired'].includes(session.status))fail('checkout_reconciliation_required');
      const closed=session.status==='expired',reconciledAt=now();
      await db.runTransaction(async tx=>{
        const current=(await tx.get(lock)).data(),prior=await tx.get(attempt);
        if(current?.offerId!==operation.offerId||current.key!==operation.key||current.sessionId&&current.sessionId!==session.id||current.state==='expired')fail('checkout_reconciliation_required');
        if(!prior.exists)tx.create(attempt,{...operation,uid,customerId,resolution:'session_found',sessionId:session.id,sessionStatus:session.status,reconciledAt});
        tx.update(lock,{sessionId:session.id,state:closed?'expired':'open',recoveredSession:true,reconciledAt,...(closed?{closedReason:session.status}:{})});
      });
      // A complete Session can still be awaiting asynchronous payment. Do not
      // start a replacement purchase just because no active subscription is seen.
      if(session.status==='complete')fail('existing_subscription_manage','already-exists');
      return closed?null:{operation:{...operation,sessionId:session.id,state:'open'},session};
    }
    const failureRef=db.doc(`billingCheckoutFailures/${operation.offerId}`),failure=(await failureRef.get()).data();
    const confirmed=failure?.uid===uid&&failure.offerId===operation.offerId&&failure.operationKey===operation.key&&failure.customerId===customerId&&
      failure.httpStatus===400&&failure.type==='invalid_request_error'&&failure.reason==='terms_url_required'&&/^req_[A-Za-z0-9]+$/.test(failure.requestId||'')&&['stripe_sdk','verified_request_log'].includes(failure.source);
    if(!confirmed||sessions.some(s=>s.status==='open'))fail('checkout_reconciliation_required');
    const reconciledAt=now();
    await db.runTransaction(async tx=>{
      const current=(await tx.get(lock)).data(),prior=await tx.get(attempt),latestFailure=(await tx.get(failureRef)).data();
      if(current?.offerId!==operation.offerId||current.key!==operation.key||current.sessionId||current.state==='expired'||JSON.stringify(latestFailure)!==JSON.stringify(failure))fail('checkout_reconciliation_required');
      if(!prior.exists)tx.create(attempt,{...operation,uid,customerId,providerFailure:failure,resolution:'confirmed_not_created',reconciledAt,matchedSessionCount:0});
      // Close, never delete. The original operation and consent remain archived
      // before a later explicitly accepted offer can become the current lock.
      tx.update(lock,{state:'expired',closedReason:'provider_validation_rejected',reconciledAt,failedRequestId:failure.requestId});
    });
    return null;
  }
  return{recordFailure,reconcile};
}
module.exports={createRecovery,classifyCheckoutFailure};
