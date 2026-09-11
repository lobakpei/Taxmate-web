'use strict';
const crypto=require('node:crypto'),contract=require('./contracts/terms-20260907.json');
const {all,idOf,fail}=require('./billing-service');
const {createRecovery}=require('./billing-checkout-recovery');
const publicOffer=q=>Object.fromEntries(['id','tier','cadence','currency','priceMinor','createdAt','expiresAt','contract','earlySupplyText','termsVersion'].map(k=>[k,q[k]]));
const EARLY_SUPPLY='I expressly request the paid service to start now, during any applicable cancellation period. This does not waive mandatory rights. Lawful proportionate charges for services supplied before cancellation apply only where the statutory request and information conditions are met.';
function createService({db,client,targetPrice,customerFor,appUrl,moneyOperationsEnabled=false,consumerDisclosuresReady=false,now=Date.now}){
  const recovery=createRecovery({db,client,now});
  async function existing(uid){const map=await db.doc(`billingCustomers/${uid}`).get();if(!map.exists)return[];return all(p=>client.subscriptions.list(p),{customer:map.data().stripeCustomerId,status:'all'});}
  async function openOperation(uid){const ref=db.doc(`billingCheckoutLocks/${uid}`),snap=await ref.get(),operation=snap.data();if(!operation||operation.state==='expired')return null;
    if(operation.sessionId){const session=await client.checkout.sessions.retrieve(operation.sessionId);if(operation.recoveredSession&&session.status==='complete'&&!['paid','no_payment_required'].includes(session.payment_status))fail('checkout_reconciliation_required');if(['expired','complete'].includes(session.status)){await ref.update({state:'expired',closedReason:session.status});return null;}return{operation,session};}
    return recovery.reconcile(uid,operation);
  }
  async function offer(user,data){
    if(!['plus','pro'].includes(data?.tier)||!['monthly','yearly'].includes(data?.cadence))fail('checkout_plan_required','invalid-argument');
    if((await existing(user.uid)).some(s=>!['canceled','incomplete_expired'].includes(s.status)))fail('existing_subscription_manage','already-exists');
    const current=await openOperation(user.uid);if(current){const saved=(await db.doc(`billingCheckoutOffers/${current.operation.offerId}`).get()).data();if(!saved)fail('checkout_reconciliation_required');if(saved.tier!==data.tier||saved.cadence!==data.cadence)fail('checkout_already_open');return{offer:publicOffer(saved),moneyOperationsEnabled,consumerDisclosuresReady};}
    const price=await targetPrice(data.tier,data.cadence),id=crypto.randomUUID(),stamp=now();
    const q={id,uid:user.uid,tier:data.tier,cadence:data.cadence,priceId:price.id,currency:price.currency,priceMinor:price.unit_amount,createdAt:stamp,expiresAt:stamp+15*60000,contract,termsVersion:contract.version,earlySupplyText:EARLY_SUPPLY,state:'offered'};
    await db.doc(`billingCheckoutOffers/${id}`).create(q);return{offer:publicOffer(q),moneyOperationsEnabled,consumerDisclosuresReady};
  }
  async function checkout(user,data){
    if(!moneyOperationsEnabled)fail('money_operations_not_enabled');
    if(!consumerDisclosuresReady)fail('consumer_disclosures_not_verified');
    if(data?.termsAccepted!==true||data.earlySupplyRequested!==true)fail('checkout_express_request_required','invalid-argument');
    if(!/^[a-f0-9-]{36}$/.test(String(data.offerId||'')))fail('checkout_offer_required','invalid-argument');
    const offerRef=db.doc(`billingCheckoutOffers/${data.offerId}`),snap=await offerRef.get();if(!snap.exists||snap.data().uid!==user.uid)fail('checkout_offer_required','not-found');
    const offer=snap.data(),current=await openOperation(user.uid);
    if(current?.operation.offerId===offer.id&&current.session?.status==='open')return{url:current.session.url,confirmation:{id:offer.id,...(await db.doc(`billingPurchaseConfirmations/${offer.id}`).get()).data()}};
    if(offer.expiresAt<now()||offer.termsVersion!==contract.version)fail('checkout_offer_expired');
    if((await db.doc(`billingCheckoutAttempts/${offer.id}`).get()).exists)fail('checkout_offer_expired');
    await targetPrice(offer.tier,offer.cadence);
    if((await existing(user.uid)).some(s=>!['canceled','incomplete_expired'].includes(s.status)))fail('existing_subscription_manage','already-exists');
    const lock=db.doc(`billingCheckoutLocks/${user.uid}`);let operation;
    await db.runTransaction(async tx=>{const old=await tx.get(lock);operation=old.data();
      if(operation&&operation.state!=='expired'&&operation.offerId!==offer.id)fail('checkout_already_open');
      if(!operation||operation.state==='expired'){operation={uid:user.uid,offerId:offer.id,key:'taxmate-checkout-'+offer.id,state:'submitting',startedAt:now(),termsAccepted:true,earlySupplyRequested:true,termsVersion:offer.termsVersion,earlySupplyText:offer.earlySupplyText};tx.set(lock,operation);}
    });
    if(operation.sessionId){const session=await client.checkout.sessions.retrieve(operation.sessionId);if(session.status==='open')return{url:session.url,confirmation:{id:offer.id,...(await db.doc(`billingPurchaseConfirmations/${offer.id}`).get()).data()}};if(session.status==='expired'){await lock.update({state:'expired'});fail('checkout_offer_expired');}fail('existing_subscription_manage','already-exists');}
    if(now()-operation.startedAt>20*3600000)fail('checkout_reconciliation_required');
    const customer=await customerFor(user,client),confirmation=db.doc(`billingPurchaseConfirmations/${offer.id}`);
    const confirmed={uid:user.uid,offerId:offer.id,addressee:user.token.email||user.uid,providedAt:now(),state:'payment_not_confirmed',termsVersion:offer.termsVersion,termsHtml:offer.contract.termsHtml,earlySupplyRequested:true,earlySupplyText:offer.earlySupplyText,tier:offer.tier,cadence:offer.cadence,currency:offer.currency,priceMinor:offer.priceMinor};
    // Preserve personally addressed terms before service starts. A provider event
    // later confirms the payment; this record alone never grants paid access.
    await db.runTransaction(async tx=>{if(!(await tx.get(confirmation)).exists)tx.create(confirmation,confirmed);});
    let session;
    try{session=await client.checkout.sessions.create({mode:'subscription',branding_settings:{display_name:'TaxMate',logo:{type:'url',url:new URL('/taxmate-checkout-logo.png',appUrl).href}},adaptive_pricing:{enabled:false},customer,line_items:[{price:offer.priceId,quantity:1}],allow_promotion_codes:true,automatic_tax:{enabled:false},billing_address_collection:'required',consent_collection:{terms_of_service:'required'},success_url:appUrl+'?billing=success',cancel_url:appUrl+'?billing=cancelled',metadata:{firebaseUid:user.uid,taxmateOffer:offer.id,termsVersion:offer.termsVersion},subscription_data:{metadata:{firebaseUid:user.uid,tier:offer.tier,billingCadence:offer.cadence,taxmateOffer:offer.id}}},{idempotencyKey:operation.key});}
    catch(error){await recovery.recordFailure({uid:user.uid,operation,customerId:customer,error});throw error;}
    await lock.update({sessionId:session.id,state:'open'});await offerRef.update({state:'checkout_open',sessionId:session.id,acceptedAt:operation.startedAt});return{url:session.url,confirmation:{id:offer.id,...(await confirmation.get()).data()}};
  }
  async function records(uid){const snap=await db.collection('billingPurchaseConfirmations').where('uid','==',uid).get();return{records:await Promise.all(snap.docs.map(async d=>({id:d.id,...d.data(),outcome:(await db.doc(`billingPurchaseOutcomes/${d.id}`).get()).data()||null})))};}
  async function paidSession(session){const id=session.metadata?.taxmateOffer;if(!id)return;const ref=db.doc(`billingPurchaseConfirmations/${id}`),snap=await ref.get();if(!snap.exists||snap.data().uid!==session.metadata?.firebaseUid)return;
    // Contract content never changes; provider outcome is a separate document.
    await db.doc(`billingPurchaseOutcomes/${id}`).set({uid:snap.data().uid,offerId:id,sessionId:session.id,paymentStatus:session.payment_status||null,subscriptionId:idOf(session.subscription),confirmedAt:now()});
  }
  return{offer,checkout,records,paidSession};
}
module.exports={createService,publicOffer,EARLY_SUPPLY,supplierDisclosureVerified:contract.establishmentAddressVerified===true};
