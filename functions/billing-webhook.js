'use strict';
const crypto=require('node:crypto');
const {idOf}=require('./billing-service');

async function quarantineDeletionEvent({db,uid,event,customerId,mapping={},serverTimestamp=Date.now,now=Date.now}){
  const resetRef=db.doc(`accountResets/${uid}`),signalRef=db.doc(`billingDeletionSignals/${uid}`);let result={quarantined:false,retry:false};
  await db.runTransaction(async tx=>{
    const resetSnap=await tx.get(resetRef),reset=resetSnap.exists?resetSnap.data()||{}:{},status=String(reset.status||''),tombstoned=mapping.accountDeleted===true;
    if(!tombstoned&&!['deleting','failed'].includes(status))return;
    const detectedAt=now(),deletionId=String(mapping.deletionId||reset.deletionId||reset.correlationId||''),resetEpoch=Number(mapping.resetEpoch??reset.resetEpoch??0);
    tx.set(signalRef,{schemaVersion:1,uid,provider:'stripe',eventId:String(event&&event.id||''),eventType:String(event&&event.type||''),providerCreatedAt:Number(event&&event.created||0)*1000||null,customerId:String(customerId||''),deletionId,resetEpoch,accountDeleted:tombstoned,detectedAt,updatedAt:serverTimestamp()},{merge:true});
    if(['deleting','failed'].includes(status))tx.update(resetRef,{billingEventWatermark:detectedAt,billingEventProvider:'stripe',updatedAt:serverTimestamp()});
    result={quarantined:true,retry:!tombstoned};
  });
  return result;
}

// A receipt is acknowledged only after the authoritative projection is saved.
// Provider events are signals to read current state, never last-writer tier data.
function createHandler({db,client,secret,refresh,refunds,checkout,quarantineBillingEvent=async()=>({quarantined:false,retry:false}),now=Date.now}){
  return async(req,res)=>{
    let event;
    try{event=client.webhooks.constructEvent(req.rawBody,req.headers['stripe-signature'],secret);}catch(_){res.status(400).send('Invalid signature');return;}
    const ref=db.doc(`stripeWebhookEvents/${event.id}`),token=crypto.randomUUID();let claimed=false;
    try{
      const state=await db.runTransaction(async tx=>{
        const snap=await tx.get(ref),old=snap.data()||{};
        if(old.state==='processed')return'processed';
        if(old.leaseUntil>now())return'busy';
        tx.set(ref,{type:event.type,state:'processing',token,leaseUntil:now()+120000,eventCreated:event.created,receivedAt:old.receivedAt||now()});return'claimed';
      });
      if(state==='processed'){res.sendStatus(200);return;}
      if(state==='busy'){res.sendStatus(503);return;}
      claimed=true;
      const object=event.data.object;let customerId=idOf(object.customer),checkoutSession=null,refund=null;
      if(/^checkout\.session\.(completed|async_payment_succeeded|async_payment_failed|expired)$/.test(event.type)&&checkout){checkoutSession=await client.checkout.sessions.retrieve(object.id);customerId=idOf(checkoutSession.customer)||customerId;}
      if(event.type.startsWith('refund.')){
        refund=await client.refunds.retrieve(object.id);const charge=await client.charges.retrieve(idOf(refund.charge));
        customerId=idOf(charge.customer);
      }
      const relevant=/^(checkout\.session\.|customer\.subscription\.|invoice\.|charge\.refunded$|refund\.)/.test(event.type);
      if(relevant&&customerId){
        let maps=await db.collection('billingCustomers').where('stripeCustomerId','==',customerId).limit(2).get(),tombstone=false;
        if(maps.size===0){const archived=await db.collection('billingProviderTombstones').where('identity','==',customerId).limit(3).get(),matches=archived.docs.filter(row=>(row.data()||{}).provider==='stripe');maps={size:matches.length,docs:matches};tombstone=matches.length>0;}
        if(maps.size>1)throw new Error('billing_customer_mapping_conflict');
        if(maps.size===1){
          const mapping=maps.docs[0],mappingData=mapping.data()||{},uid=tombstone?String(mappingData.uid||''):mapping.id;if(!uid)throw new Error('billing_customer_mapping_invalid');
          const quarantine=await quarantineBillingEvent({uid,event,customerId,mapping:tombstone?{...mappingData,accountDeleted:true}:mappingData});
          if(quarantine&&quarantine.retry)throw new Error('billing_deletion_in_progress');
          if(!(quarantine&&quarantine.quarantined)){
            const checkoutSucceeded=/^checkout\.session\.(completed|async_payment_succeeded)$/.test(event.type),checkoutFailed=/^checkout\.session\.(async_payment_failed|expired)$/.test(event.type);
            if(checkoutSession&&checkout&&checkoutSucceeded)await checkout.paidSession(checkoutSession);
            if(refund)await refunds.refundEvent(refund);
            const reservationId=checkoutSession&&checkoutSession.metadata&&checkoutSession.metadata.taxmateReservation||'';
            await refresh(uid,checkoutSession&&checkoutSucceeded&&checkoutSession.metadata&&checkoutSession.metadata.taxmateOffer?{reservationFlowKey:`checkout:${checkoutSession.metadata.taxmateOffer}`,reservationId}:{ });
            if(checkoutSession&&checkout&&checkoutSucceeded)await checkout.reconciledSession(checkoutSession);
            if(checkoutSession&&checkout&&checkoutFailed)await checkout.definitiveFailureSession(checkoutSession,event.type,uid);
          }
        }
      }
      await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.data()?.token!==token)throw new Error('webhook_lease_changed');tx.update(ref,{state:'processed',processedAt:now(),leaseUntil:0});});
      res.sendStatus(200);
    }catch(error){
      if(claimed)await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.data()?.token===token)tx.update(ref,{state:'retry_required',leaseUntil:0,lastFailureAt:now()});}).catch(()=>{});
      console.error('billing-webhook-retry',{eventId:event.id,type:event.type,reason:error.billingReason||'provider_or_projection'});res.sendStatus(500);
    }
  };
}
module.exports={createHandler,quarantineDeletionEvent};
