'use strict';
const crypto=require('node:crypto');
const {idOf}=require('./billing-service');

// A receipt is acknowledged only after the authoritative projection is saved.
// Provider events are signals to read current state, never last-writer tier data.
function createHandler({db,client,secret,refresh,refunds,checkout,now=Date.now}){
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
      const object=event.data.object;let customerId=idOf(object.customer);
      if(/^checkout\.session\.(completed|async_payment_succeeded|async_payment_failed)$/.test(event.type)&&checkout)await checkout.paidSession(await client.checkout.sessions.retrieve(object.id));
      if(event.type.startsWith('refund.')){
        const refund=await client.refunds.retrieve(object.id),charge=await client.charges.retrieve(idOf(refund.charge));
        customerId=idOf(charge.customer);await refunds.refundEvent(refund);
      }
      const relevant=/^(checkout\.session\.|customer\.subscription\.|invoice\.|charge\.refunded$|refund\.)/.test(event.type);
      if(relevant&&customerId){
        const maps=await db.collection('billingCustomers').where('stripeCustomerId','==',customerId).limit(2).get();
        if(maps.size>1)throw new Error('billing_customer_mapping_conflict');
        if(maps.size===1)await refresh(maps.docs[0].id);
      }
      await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.data()?.token!==token)throw new Error('webhook_lease_changed');tx.update(ref,{state:'processed',processedAt:now(),leaseUntil:0});});
      res.sendStatus(200);
    }catch(error){
      if(claimed)await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.data()?.token===token)tx.update(ref,{state:'retry_required',leaseUntil:0,lastFailureAt:now()});}).catch(()=>{});
      console.error('billing-webhook-retry',{eventId:event.id,type:event.type,reason:error.billingReason||'provider_or_projection'});res.sendStatus(500);
    }
  };
}
module.exports={createHandler};
