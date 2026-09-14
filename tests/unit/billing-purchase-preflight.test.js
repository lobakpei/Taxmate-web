'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const vm=require('node:vm');
const Preflight=require('../../functions/billing-purchase-preflight');

const snap=value=>({exists:value!==undefined,data:()=>value});

test('purchase preflight digest binds reset, provider identities, and current provider projection',()=>{
  const input={reset:snap({status:'complete',resetEpoch:4}),entitlement:snap({googlePlayAccess:{status:'expired',expiresAt:10}}),stripe:snap(undefined),googlePlay:snap({uid:'u',accountHash:'hash',resetEpoch:4}),appStore:snap(undefined)};
  const before=Preflight.capture(input),renewed=Preflight.capture({...input,entitlement:snap({googlePlayAccess:{status:'active',expiresAt:999}})}),rotated=Preflight.capture({...input,googlePlay:snap({uid:'u',accountHash:'new-hash',resetEpoch:4})}),nextEpoch=Preflight.capture({...input,reset:snap({status:'complete',resetEpoch:5})});
  assert.match(before,/^[a-f0-9]{64}$/);assert.notEqual(before,renewed);assert.notEqual(before,rotated);assert.notEqual(before,nextEpoch);
});

test('timestamp-like values are canonical so identical provider facts compare across reads',()=>{
  const timestamp=value=>({toMillis:()=>value}),a=snap({serverVerifiedAt:timestamp(123),paidAccess:{plusExpiresAt:456}}),b=snap({paidAccess:{plusExpiresAt:456},serverVerifiedAt:timestamp(123)});
  assert.equal(Preflight.capture({entitlement:a}),Preflight.capture({entitlement:b}));
});

test('native purchase controls fail closed until money operations and verified disclosures are both ready',()=>{
  assert.deepEqual(Preflight.purchaseControls(),{
    moneyOperationsEnabled:false,consumerDisclosuresReady:false,purchaseEnabled:false,reason:'money_operations_not_enabled'
  });
  assert.deepEqual(Preflight.purchaseControls({moneyOperationsEnabled:true,consumerDisclosuresEnabled:true}),{
    moneyOperationsEnabled:true,consumerDisclosuresReady:false,purchaseEnabled:false,reason:'consumer_disclosures_not_verified'
  });
  assert.deepEqual(Preflight.purchaseControls({moneyOperationsEnabled:true,consumerDisclosuresEnabled:true,supplierDisclosureVerified:true}),{
    moneyOperationsEnabled:true,consumerDisclosuresReady:true,purchaseEnabled:true,reason:null
  });
  assert.deepEqual(Preflight.purchaseControls({moneyOperationsEnabled:true,consumerDisclosuresEnabled:true,demo:true}),{
    moneyOperationsEnabled:true,consumerDisclosuresReady:true,purchaseEnabled:true,reason:null
  });
  assert.equal(Preflight.purchaseControls({moneyOperationsEnabled:true,demo:true}).purchaseEnabled,false,'demo mode cannot bypass the disclosure deployment switch');
});

function reservationHarness({entitlementValue,reservationValue,transactionOverrides={},purchaseGateReason=null}){
  const source=fs.readFileSync('functions/index.js','utf8'),start=source.indexOf('async function reserveBillingPurchase'),end=source.indexOf('async function clearBillingReservation');
  assert.ok(start>=0&&end>start,'reservation function source must remain independently testable');
  class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
  const refs=Object.fromEntries(['reset','entitlement','stripe','googlePlay','appStore','reservation'].map(key=>[key,{key}])),snapshots={
    reset:snap({status:'complete',resetEpoch:7}),entitlement:snap(entitlementValue||{}),stripe:snap(undefined),googlePlay:snap({uid:'u',resetEpoch:7}),appStore:snap(undefined),reservation:snap(reservationValue)
  };
  Object.assign(snapshots,transactionOverrides);
  let reconciliations=0;
  const context=vm.createContext({
    BILLING_PURCHASE_PROVIDERS:new Set(['stripe','google_play','app_store']),
    HttpsError,crypto,Date,BillingPurchasePreflight:Preflight,
    FounderPromotions:{hasPermanentPro:value=>value&&value.permanent===true},
    billingReservationPlan:input=>({tier:input.tier,cadence:input.cadence}),
    assertBillingPurchaseReady:()=>{if(purchaseGateReason)throw new HttpsError('failed-precondition','Billing purchase blocked',{reason:purchaseGateReason});},
    providerPaidState:data=>data.otherActive?'app_store_active':null,
    sameProviderPaidState:data=>data.selfActive?'google_play_active':null,
    reconcileBillingBeforeReservation:async()=>{reconciliations++;return{resetEpoch:7,refs,digest:Preflight.capture(snapshots)};},
    db:{
      doc:path=>path.startsWith('billingPurchaseReservations/')?refs.reservation:{key:path},
      runTransaction:async callback=>callback({get:async ref=>snapshots[ref.key],set:()=>{}})
    }
  });
  vm.runInContext(`${source.slice(start,end)}\nthis.reserveBillingPurchase=reserveBillingPurchase;`,context);
  return{reserve:context.reserveBillingPurchase,reconciliations,HttpsError,getReconciliations:()=>reconciliations};
}

test('a native reservation stops before provider reconciliation when either legal purchase gate is closed',async()=>{
  for(const reason of ['money_operations_not_enabled','consumer_disclosures_not_verified']){
    const harness=reservationHarness({purchaseGateReason:reason});
    await assert.rejects(()=>harness.reserve('u','google_play',{tier:'plus',cadence:'monthly'}),error=>error.code==='failed-precondition'&&error.details.reason===reason);
    assert.equal(harness.getReconciliations(),0,reason);
  }
});

function reconciliationHarness({provider='app_store',bindings={stripe:true,googlePlay:true,appStore:true},appStoreHistoryState='verified',appStoreRefreshResult={checked:true,subscriptions:1,access:{active:false,status:'expired'}},appStoreRefreshError=null}={}){
  const source=fs.readFileSync('functions/index.js','utf8'),start=source.indexOf('async function reconcileBillingBeforeReservation'),end=source.indexOf('async function reserveBillingPurchase');
  assert.ok(start>=0&&end>start,'provider reconciliation function source must remain independently testable');
  const calls=[],refs=Object.fromEntries(['reset','entitlement','stripe','googlePlay','appStore'].map(key=>[key,{key}]));let reads=0;
  const snapshots=()=>({reset:snap({status:'complete',resetEpoch:9}),entitlement:snap({serverVerifiedAt:reads}),stripe:snap(bindings.stripe?{uid:'u',resetEpoch:9}:undefined),googlePlay:snap(bindings.googlePlay?{uid:'u',resetEpoch:9}:undefined),appStore:snap(bindings.appStore?{uid:'u',resetEpoch:9,...(appStoreHistoryState?{transactionHistoryState:appStoreHistoryState}:{}),...(appStoreHistoryState==='verified'?{lastVerifiedTransactionHash:'a'.repeat(64)}:{})}:undefined)});
  const context=vm.createContext({
    HttpsError:class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}},
    assertPurchaseResetReady:async()=>({resetEpoch:9}),
    billingPreflightSnapshots:async()=>{reads++;const value=snapshots();return{refs,snapshots:value,digest:Preflight.capture(value)};},
    currentBillingBinding:(snapshot,_uid,_epoch,name)=>{calls.push(`bind:${name}`);return snapshot.exists;},
    appStoreBindingIsVerifiedEmpty:snapshot=>snapshot.exists&&snapshot.data().transactionHistoryState==='empty'&&!snapshot.data().lastVerifiedTransactionHash,
    appStoreBindingHasVerifiedHistory:snapshot=>snapshot.exists&&snapshot.data().transactionHistoryState==='verified'&&/^[a-f0-9]{64}$/.test(snapshot.data().lastVerifiedTransactionHash||''),
    refreshBilling:async()=>calls.push('refresh:stripe'),stripe:()=>({}),
    googlePlayService:()=>({refreshForUser:async()=>calls.push('refresh:google_play')}),googlePlayFailure:error=>error,
    appStoreService:()=>({refreshForUser:async()=>{calls.push('refresh:app_store');if(appStoreRefreshError)throw appStoreRefreshError;return appStoreRefreshResult;}}),appStoreFailure:error=>error
  });
  vm.runInContext(`${source.slice(start,end)}\nthis.reconcileBillingBeforeReservation=reconcileBillingBeforeReservation;`,context);
  return{run:()=>context.reconcileBillingBeforeReservation('u',provider),calls,getReads:()=>reads};
}

test('the Apple-secret-bound preflight refreshes every current provider binding before taking its final snapshot',async()=>{
  const harness=reconciliationHarness();await harness.run();
  assert.deepEqual(harness.calls.filter(value=>value.startsWith('refresh:')),['refresh:stripe','refresh:google_play','refresh:app_store']);
  assert.equal(harness.getReads(),2);
});

test('Stripe and Play fail closed on App Store history without calling the Apple verifier',async()=>{
  for(const provider of ['stripe','google_play']){
    const harness=reconciliationHarness({provider,appStoreHistoryState:'verified'});
    await assert.rejects(()=>harness.run(),error=>error.code==='failed-precondition'&&error.details.reason==='app_store_reconciliation_required');
    assert.deepEqual(harness.calls.filter(value=>value.startsWith('refresh:')),[]);
    assert.equal(harness.getReads(),1);
  }
});

test('an unavailable Apple verifier fails closed only on the Apple-secret-bound path',async()=>{
  const unavailable=Object.assign(new Error('Apple verifier unavailable'),{code:'failed-precondition'}),harness=reconciliationHarness({provider:'app_store',appStoreRefreshError:unavailable});
  await assert.rejects(()=>harness.run(),error=>error===unavailable);
  assert.deepEqual(harness.calls.filter(value=>value.startsWith('refresh:')),['refresh:stripe','refresh:google_play','refresh:app_store']);
  assert.equal(harness.getReads(),1);
});

test('an absent or iOS-created verified-empty App Store binding does not block Stripe or Play',async()=>{
  for(const provider of ['stripe','google_play']){
    for(const appStore of [false,true]){
      const harness=reconciliationHarness({provider,bindings:{stripe:true,googlePlay:true,appStore},appStoreHistoryState:'empty'});await harness.run();
      assert.deepEqual(harness.calls.filter(value=>value.startsWith('refresh:')),['refresh:stripe','refresh:google_play']);
      assert.equal(harness.getReads(),2);
    }
  }
});

test('verified App Store history is refreshed on the Apple path before a new App Store reservation',async()=>{
  const harness=reconciliationHarness({provider:'app_store',appStoreHistoryState:'verified'});await harness.run();
  assert.deepEqual(harness.calls.filter(value=>value.startsWith('refresh:')),['refresh:stripe','refresh:google_play','refresh:app_store']);
  assert.equal(harness.getReads(),2);
});

test('unknown or unverifiable App Store history still blocks another provider',async()=>{
  const unknown=reconciliationHarness({provider:'stripe',appStoreHistoryState:null});
  await assert.rejects(()=>unknown.run(),error=>error.code==='failed-precondition'&&error.details.reason==='app_store_reconciliation_required');
  assert.deepEqual(unknown.calls.filter(value=>value.startsWith('refresh:')),[]);
  const unknownApplePath=reconciliationHarness({provider:'app_store',appStoreHistoryState:null});
  await assert.rejects(()=>unknownApplePath.run(),error=>error.code==='failed-precondition'&&error.details.reason==='app_store_reconciliation_required');
  assert.deepEqual(unknownApplePath.calls.filter(value=>value.startsWith('refresh:')),[]);
  const missingStatus=reconciliationHarness({provider:'app_store',appStoreHistoryState:'verified',appStoreRefreshResult:{checked:true,subscriptions:0,access:null}});
  await assert.rejects(()=>missingStatus.run(),error=>error.code==='failed-precondition'&&error.details.reason==='app_store_reconciliation_required');
});

test('an exact crashed reservation is reconciled before resume and a delayed other-provider renewal blocks relaunch',async()=>{
  const reservation={provider:'google_play',tier:'pro',cadence:'monthly',status:'provider_pending',reservationId:'same',flowKey:null};
  const harness=reservationHarness({entitlementValue:{otherActive:true},reservationValue:reservation});
  await assert.rejects(()=>harness.reserve('u','google_play',{tier:'pro',cadence:'monthly',reservationId:'same'}),error=>error.code==='already-exists'&&error.details.reason==='app_store_active');
  assert.equal(harness.getReconciliations(),1);
});

test('an exact crashed reservation cannot relaunch after its original provider charge is projected',async()=>{
  const reservation={provider:'google_play',tier:'pro',cadence:'monthly',status:'provider_pending',reservationId:'same',flowKey:null};
  const harness=reservationHarness({entitlementValue:{selfActive:true},reservationValue:reservation});
  await assert.rejects(()=>harness.reserve('u','google_play',{tier:'pro',cadence:'monthly',reservationId:'same'}),error=>error.code==='already-exists'&&error.details.reason==='google_play_active');
  assert.equal(harness.getReconciliations(),1);
});

test('an unchanged exact reservation resumes only after the fresh snapshot is transactionally re-read',async()=>{
  const reservation={provider:'google_play',tier:'pro',cadence:'monthly',status:'provider_pending',reservationId:'same',flowKey:null};
  const harness=reservationHarness({entitlementValue:{},reservationValue:reservation});
  const result=await harness.reserve('u','google_play',{tier:'pro',cadence:'monthly',reservationId:'same'});
  assert.equal(result.reservationId,'same');assert.equal(harness.getReconciliations(),1);
});
