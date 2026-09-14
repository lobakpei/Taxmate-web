'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Fence=require('../../functions/account-write-fence');

const snapshot=(exists,data={})=>({exists,data:()=>data});

test('account mutation fence accepts only an absent or complete reset and returns its exact epoch',()=>{
  assert.equal(Fence.readyEpoch(snapshot(false)),0);
  assert.equal(Fence.readyEpoch(snapshot(true,{status:'complete',resetEpoch:7})),7);
  for(const status of ['deleting','failed','billing_quarantined',''])assert.throws(()=>Fence.readyEpoch(snapshot(true,{status,resetEpoch:7})),error=>error instanceof Fence.AccountWriteFenceError&&error.reason==='account_reset_processing');
  for(const resetEpoch of [-1,1.5,'bad'])assert.throws(()=>Fence.readyEpoch(snapshot(true,{status:'complete',resetEpoch})),Fence.AccountWriteFenceError);
});

test('transaction fence reads the server-owned reset and rejects a stale caller epoch',async()=>{
  const reads=[],db={doc:path=>({path})},tx={get:async ref=>{reads.push(ref.path);return snapshot(true,{status:'billing_quarantined',resetEpoch:3});}};
  await assert.rejects(()=>Fence.readInTransaction({tx,db,uid:'owner-1',expectedEpoch:3}),Fence.AccountWriteFenceError);
  assert.deepEqual(reads,['accountResets/owner-1']);
  const ready={get:async()=>snapshot(true,{status:'complete',resetEpoch:4})};
  assert.equal(await Fence.readInTransaction({tx:ready,db,uid:'owner-1',expectedEpoch:4}),4);
  await assert.rejects(()=>Fence.readInTransaction({tx:ready,db,uid:'owner-1',expectedEpoch:3}),Fence.AccountWriteFenceError);
  await assert.rejects(()=>Fence.readInTransaction({tx:ready,db,uid:'owner-1'}),Fence.AccountWriteFenceError,'an old client that omits the new epoch cannot write after deletion');
});

test('Storage projection is explicit, epoch-stringed, and keeps every non-ready reset status blocked',()=>{
  const retention={purgeRequired:false,lastRetentionEpoch:2};
  assert.deepEqual(Fence.storageProjection(snapshot(true,{status:'complete',resetEpoch:7}),retention),{
    accountResetStatus:'complete',accountResetEpoch:7,accountResetEpochString:'7',
    accountRetention:{purgeRequired:false,lastRetentionEpoch:2,controlStatus:'complete',lastRetentionEpochString:'2',activeRetentionEpoch:null}
  });
  const completed=Fence.storageProjection(snapshot(true,{status:'complete',resetEpoch:7}),retention,snapshot(true,{status:'complete_with_warnings',epoch:3}));
  assert.equal(completed.accountRetention.controlStatus,'complete_with_warnings');assert.equal(completed.accountRetention.lastRetentionEpoch,3);assert.equal(completed.accountRetention.lastRetentionEpochString,'3');
  const purging=Fence.storageProjection(snapshot(true,{status:'deleting',resetEpoch:7}),completed.accountRetention,snapshot(true,{status:'purging',epoch:4}));
  assert.equal(purging.accountResetStatus,'deleting');assert.equal(purging.accountRetention.controlStatus,'purging');assert.equal(purging.accountRetention.lastRetentionEpoch,3);assert.equal(purging.accountRetention.activeRetentionEpoch,4);
  for(const status of ['billing_quarantined','deleting','failed'])assert.equal(Fence.storageProjection(snapshot(true,{status,resetEpoch:7}),retention).accountResetStatus,status);
  assert.throws(()=>Fence.storageProjection(snapshot(true,{status:'unknown',resetEpoch:7}),retention),Fence.AccountWriteFenceError);
});

test('promotion and partnership mutations bind the caller epoch inside their write transactions',()=>{
  const source=fs.readFileSync('functions/index.js','utf8');
  for(const name of ['redeemPromotion','createPartnership','joinPartnership','leavePartnership']){
    const start=source.indexOf(`exports.${name}=onCall(`),end=source.indexOf('\nexports.',start+12),body=source.slice(start,end<0?source.length:end);
    assert.ok(start>=0,`${name} must remain exported`);
    assert.match(body,name==='redeemPromotion'?/AccountWriteFence\.expectedReadyEpoch\(resetSnap,req\.data\?\.accountResetEpoch\)/:/accountWriteEpoch\(tx,user\.uid,req\.data\?\.accountResetEpoch\)/,`${name} must check the exact client epoch in its mutation transaction`);
  }
});
