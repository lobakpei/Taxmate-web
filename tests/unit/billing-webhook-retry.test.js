'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,retryAutomatically}=require('../helpers/billing-retry-local');
const Billing=require('../../functions/billing-entitlements');
const {projectPayment}=require('../../functions/billing-service');

async function setup(t){
  const f=await fixture();t.after(()=>f.close());
  t.mock.method(console,'error',()=>{});return f;
}
async function assertCompleted(f,events){
  for(const event of events){const receipt=await f.receipt(event);assert.equal(receipt.state,'processed');assert.equal(receipt.leaseUntil,0);assert(receipt.processedAt);}
  const record=await f.read(f.paths.case),entitlement=await f.read(f.paths.entitlement);
  assert.equal(record.state,'refunded');assert.equal(record.refundId,f.ids.refund);
  assert.equal(record.confirmedRefundImpact.basis,'confirmed');assert.equal(record.confirmedRefundImpact.afterTier,'pro');
  assert.equal(entitlement.paidTier,'pro');assert.equal(entitlement.paidAccess.proExpiresAt,f.end);
  assert.equal(entitlement.paidAccess.plusExpiresAt,0);assert.equal(entitlement.refundReviewState,'full-refund-applied');
  const history=await f.db.collection(f.paths.case+'/events').get();
  assert.deepEqual(history.docs.map(d=>d.id).sort(),['impact_'+f.ids.refund,'provider_'+f.ids.refund+'_succeeded'].sort());
  assert.deepEqual(f.counts.writes,[]);
  assert.equal(projectPayment(f.data.charges[0],f.data.refunds).refundedMinor,399);
  assert.equal(projectPayment(f.data.charges[1],[]).status,'paid');assert.equal(f.data.refunds.length,1);
}

test('three refund signals fail on a held projection lease, then automatic isolated retries complete without money writes',async t=>{
  const f=await setup(t),events=['refund.created','charge.refunded','refund.updated'].map(type=>f.event(type));
  await f.db.doc(f.paths.lock).set({token:'other-owner',until:f.now()+120000});
  for(const event of events){assert.equal((await f.deliver(event)).status,500);const receipt=await f.receipt(event);assert.equal(receipt.state,'retry_required');assert.equal(receipt.leaseUntil,0);assert(receipt.lastFailureAt);}
  assert.equal((await f.read(f.paths.lock)).token,'other-owner');assert.equal((await f.read(f.paths.lock)).until,f.now()+120000);
  const errors=console.error.mock.calls.map(call=>call.arguments[1].reason);assert.deepEqual(errors,Array(3).fill('billing_refresh_in_progress'));
  for(const [index,event]of events.entries()){
    const statuses=await retryAutomatically(f,event,{onRetry:async()=>{await f.db.doc(f.paths.lock).update({until:0});}});
    assert.deepEqual(statuses,index===0?[500,200]:[200]);
  }
  await assertCompleted(f,events);
  const before={case:await f.read(f.paths.case),entitlement:await f.read(f.paths.entitlement),reads:f.counts.reads.length,refreshes:f.counts.refreshes};
  for(const event of [...events].reverse())assert.equal((await f.deliver(event)).status,200);
  assert.deepEqual(await f.read(f.paths.case),before.case);assert.deepEqual(await f.read(f.paths.entitlement),before.entitlement);
  assert.equal(f.counts.reads.length,before.reads);assert.equal(f.counts.refreshes,before.refreshes);
});

test('three concurrently arriving signals converge after isolated scheduled retries',async t=>{
  const f=await setup(t),events=['refund.updated','charge.refunded','refund.created'].map(type=>f.event(type));
  const first=await Promise.all(events.map(event=>f.deliver(event)));
  assert(first.every(result=>[200,500].includes(result.status)));
  for(const event of events)assert.equal((await retryAutomatically(f,event)).at(-1),200);
  await assertCompleted(f,events);
});

test('same-event concurrent delivery is busy until the first finishes; processed duplicate performs no work',async t=>{
  const f=await setup(t),event=f.event('charge.refunded');let entered,release;
  const reached=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  f.hooks['subscriptions.list']=async()=>{entered();await gate;};
  const first=f.deliver(event);await reached;
  try{assert.equal((await f.deliver(event)).status,503);assert.equal((await f.receipt(event)).state,'processing');}finally{release();}
  assert.equal((await first).status,200);const reads=f.counts.reads.length;
  assert.equal((await f.deliver(event)).status,200);assert.equal(f.counts.reads.length,reads);assert.deepEqual(f.counts.writes,[]);
});

test('failed provider read releases both leases and a later automatic attempt reads fresh funding',async t=>{
  const f=await setup(t),event=f.event('charge.refunded');let first=true;
  f.hooks['subscriptions.list']=async()=>{if(first){first=false;throw new Error('synthetic temporary read outage');}};
  const statuses=await retryAutomatically(f,event,{onRetry:async()=>{
    assert.equal((await f.receipt(event)).state,'retry_required');assert.equal((await f.receipt(event)).leaseUntil,0);
    assert.equal((await f.read(f.paths.lock)).until,0);
  }});
  assert.deepEqual(statuses,[500,200]);assert.equal((await f.read(f.paths.entitlement)).paidTier,'pro');assert.deepEqual(f.counts.writes,[]);
});

test('persistent projection conflict is never acknowledged as processed or claimed as recovered',async t=>{
  const f=await setup(t),event=f.event('charge.refunded');await f.db.doc(f.paths.lock).set({token:'persistent-owner',until:f.now()+120000});
  assert.deepEqual(await retryAutomatically(f,event,{attempts:3}),[500,500,500]);
  assert.equal((await f.receipt(event)).state,'retry_required');assert.equal((await f.read(f.paths.lock)).token,'persistent-owner');
  assert.equal(f.counts.reads.length,0);assert.deepEqual(f.counts.writes,[]);
});

test('expired event and projection leases are recoverable without clearing another active owner',async t=>{
  const f=await setup(t),event=f.event('charge.refunded');
  await f.db.doc('stripeWebhookEvents/'+event.id).set({state:'processing',token:'old-event-worker',leaseUntil:f.now()-1,receivedAt:f.now()-600000});
  await f.db.doc(f.paths.lock).set({token:'old-projector',until:f.now()-1});
  assert.equal((await f.deliver(event)).status,200);const receipt=await f.receipt(event);
  assert.equal(receipt.state,'processed');assert.equal(receipt.receivedAt,f.now()-600000);assert.notEqual(receipt.token,'old-event-worker');
  assert.equal((await f.read(f.paths.lock)).until,0);assert.deepEqual(f.counts.writes,[]);
});

test('projection lease expiry refuses a stale commit and releases only its own lease',async t=>{
  const f=await setup(t),event=f.event('charge.refunded'),before=await f.read(f.paths.entitlement);let first=true;
  f.hooks['subscriptions.list']=async()=>{if(first){first=false;f.advance(120001);}};
  assert.equal((await f.deliver(event)).status,500);assert.deepEqual(await f.read(f.paths.entitlement),before);
  assert.equal(console.error.mock.calls[0].arguments[1].reason,'billing_refresh_retry');
  assert.equal((await f.read(f.paths.lock)).until,0);assert.deepEqual(await retryAutomatically(f,event),[200]);
});

test('projection token fencing preserves a newer owner and retries only after its release',async t=>{
  const f=await setup(t),event=f.event('charge.refunded'),before=await f.read(f.paths.entitlement);let first=true;
  f.hooks['subscriptions.list']=async()=>{if(first){first=false;await f.db.doc(f.paths.lock).set({token:'new-projector',until:f.now()+120000});}};
  assert.equal((await f.deliver(event)).status,500);assert.deepEqual(await f.read(f.paths.entitlement),before);
  assert.equal((await f.read(f.paths.lock)).token,'new-projector');assert.equal((await f.read(f.paths.lock)).until,f.now()+120000);
  assert.deepEqual(await retryAutomatically(f,event,{onRetry:async()=>f.db.doc(f.paths.lock).update({until:0})}),[500,200]);
});

test('event token fencing never marks a newer delivery owner failed or processed',async t=>{
  const f=await setup(t),event=f.event('charge.refunded');let first=true;
  f.hooks['subscriptions.list']=async()=>{if(first){first=false;await f.db.doc('stripeWebhookEvents/'+event.id).set({state:'processing',token:'new-event-owner',leaseUntil:f.now()+120000,receivedAt:f.now()});}};
  assert.equal((await f.deliver(event)).status,500);assert.equal((await f.receipt(event)).token,'new-event-owner');assert.equal((await f.receipt(event)).state,'processing');
  assert.equal((await f.deliver(event)).status,503);f.advance(120001);assert.equal((await f.deliver(event)).status,200);
  assert.deepEqual(f.counts.writes,[]);
});

test('invalid signatures cannot create receipts, project access or contact provider doubles',async t=>{
  const f=await setup(t),event=f.event('refund.created');assert.equal((await f.deliver(event,{invalidSignature:true})).status,400);
  assert.equal(await f.receipt(event),undefined);assert.equal(f.counts.reads.length,0);assert.equal(f.counts.refreshes,0);assert.deepEqual(f.counts.writes,[]);
});

test('conflicting customer mappings fail closed rather than acknowledge the wrong account',async t=>{
  const f=await setup(t),event=f.event('charge.refunded');await f.db.doc('billingCustomers/duplicate-'+f.uid).set({stripeCustomerId:f.ids.customer});
  assert.equal((await f.deliver(event)).status,500);assert.equal((await f.receipt(event)).state,'retry_required');
  assert.equal(f.counts.refreshes,0);assert.deepEqual(f.counts.writes,[]);
});

test('actual funding reader resolves modern invoice payments and partial/full refund policy without fake unlocks',async t=>{
  const f=await setup(t);f.data.subscriptions.splice(1);f.data.invoices.splice(1);f.data.charges.splice(1);
  f.data.refunds[0].amount=100;
  await f.refresh(f.uid);let current=await f.read(f.paths.entitlement);
  assert.equal(current.paidTier,'plus');assert.equal(current.refundReviewState,'manual-review');assert(f.counts.reads.includes('invoicePayments.list'));
  f.data.refunds[0].amount=399;await f.refresh(f.uid);current=await f.read(f.paths.entitlement);
  assert.equal(current.paidTier,'free');assert.equal(current.subscriptionStatus,'refunded');assert.equal(current.refundReviewState,'full-refund-applied');
  assert.equal(current.paidAccess.plusExpiresAt,0);assert.equal(current.paidAccess.proExpiresAt,0);assert.deepEqual(f.counts.writes,[]);
  const inputs=await Billing.readFunding(f.client,f.ids.customer);assert.equal(inputs.chargeInvoiceIds[f.ids.charge],f.ids.invoice);
});
