'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const Backfill=require('../../scripts/backfill-account-reset-storage-controls');

const ent=(uid,data={},updateTime='2026-09-14T12:00:00Z')=>({path:`users/${uid}/entitlements/current`,updateTime,data});
const reset=(uid,status='complete',resetEpoch=0)=>({path:`accountResets/${uid}`,data:{status,resetEpoch}});
const retention=(uid,status='complete',epoch=0)=>({path:`users/${uid}/retention/current`,data:{status,epoch}});
const receipt=(uid,name='receipt.jpg',metadata={},metageneration='4')=>({name:`receipts/${uid}/${name}`,metadata,metageneration});

test('dry-run plan backfills exact reset and retention mirrors without exposing identities in its public report',()=>{
  const plan=Backfill.buildPlan({
    entitlements:[ent('private-user',{paidTier:'plus',accountRetention:{retainThroughDate:'2028-04-05'}})],
    resets:[reset('private-user','complete',7)],
    retentions:[retention('private-user','complete_with_warnings',3)],
    objects:[receipt('private-user','private-name.jpg',{existing:'preserved'})]
  });
  assert.equal(plan.counts.entitlementUpdates,1);assert.equal(plan.counts.receiptMetadataUpdates,1);assert.equal(plan.counts.blockers,0);
  assert.deepEqual(plan.firestore[0].fields.accountRetention,{retainThroughDate:'2028-04-05',controlStatus:'complete_with_warnings',lastRetentionEpoch:3,lastRetentionEpochString:'3',activeRetentionEpoch:null});
  assert.deepEqual(plan.storage[0].metadata,{existing:'preserved',accountResetEpoch:'7',retentionEpoch:'3'});
  assert.match(plan.planDigest,/^[a-f0-9]{64}$/);
  const output=JSON.stringify(Backfill.publicReport('DRY_RUN_READY',plan));
  assert.doesNotMatch(output,/private-user|private-name|retainThroughDate|existing/);
});

test('backfill is idempotent when authoritative control metadata is already present',()=>{
  const current={accountResetStatus:'complete',accountResetEpoch:2,accountResetEpochString:'2',accountRetention:{controlStatus:'complete',lastRetentionEpoch:5,lastRetentionEpochString:'5',activeRetentionEpoch:null}};
  const plan=Backfill.buildPlan({entitlements:[ent('u',current)],resets:[reset('u','complete',2)],retentions:[retention('u','complete',5)],objects:[receipt('u','r.jpg',{accountResetEpoch:'2',retentionEpoch:'5'})]});
  assert.equal(plan.counts.entitlementUpdates,0);assert.equal(plan.counts.receiptMetadataUpdates,0);assert.equal(plan.counts.readyEntitlements,1);assert.equal(plan.counts.readyReceipts,1);assert.equal(plan.counts.blockers,0);
});

test('unsafe controls, missing owners, paths and preconditions block apply planning',()=>{
  const plan=Backfill.buildPlan({
    entitlements:[ent('deleting',{},null),ent('purging')],
    resets:[reset('deleting','deleting',1),reset('purging','complete',1)],
    retentions:[retention('purging','purging',2)],
    objects:[receipt('missing'),{name:'receipts/nested/path/file.jpg',metadata:{},metageneration:'1'}]
  });
  assert.equal(plan.counts.entitlementUpdates,0);assert.equal(plan.counts.receiptMetadataUpdates,0);
  assert.equal(plan.counts.blockerReasons.account_reset_not_ready,1);
  assert.equal(plan.counts.blockerReasons.retention_not_ready,1);
  assert.equal(plan.counts.blockerReasons.receipt_owner_auth_missing,1);
  assert.equal(plan.counts.blockerReasons.unsupported_receipt_path,1);
});

test('verified Auth receipt owner gets a minimal Free entitlement with a create-only precondition',()=>{
  const plan=Backfill.buildPlan({objects:[receipt('legacy-auth','first.jpg'),receipt('legacy-auth','second.jpg')],authUids:['legacy-auth']});
  assert.equal(plan.counts.blockers,0);assert.equal(plan.counts.entitlementUpdates,1);assert.equal(plan.counts.receiptMetadataUpdates,2);
  assert.deepEqual(plan.firestore[0],{
    path:'users/legacy-auth/entitlements/current',create:true,
    fields:{paidTier:'free',subscriptionStatus:'inactive',currentPeriodEnd:0,accountResetStatus:'complete',accountResetEpoch:0,accountResetEpochString:'0',accountRetention:{controlStatus:'complete',lastRetentionEpoch:0,lastRetentionEpochString:'0',activeRetentionEpoch:null}}
  });
  assert.match(plan.planDigest,/^[a-f0-9]{64}$/);
});

test('verified Auth owner stays blocked while reset or retention controls are not ready',()=>{
  const resetBlocked=Backfill.buildPlan({objects:[receipt('reset-auth')],authUids:['reset-auth'],resets:[reset('reset-auth','deleting',2)]});
  const retentionBlocked=Backfill.buildPlan({objects:[receipt('retention-auth')],authUids:['retention-auth'],retentions:[retention('retention-auth','purging',3)]});
  assert.equal(resetBlocked.counts.blockerReasons.receipt_owner_reset_not_ready,1);
  assert.equal(retentionBlocked.counts.blockerReasons.receipt_owner_retention_not_ready,1);
  assert.equal(resetBlocked.counts.entitlementUpdates,0);assert.equal(retentionBlocked.counts.entitlementUpdates,0);
});

test('missing reset and retention controls conservatively map an established legacy account to epoch zero',()=>{
  const plan=Backfill.buildPlan({entitlements:[ent('legacy',{accountRetention:{paidAccessEndedAt:1}})],objects:[receipt('legacy')]});
  assert.equal(plan.counts.blockers,0);assert.equal(plan.firestore[0].fields.accountResetEpoch,0);assert.equal(plan.firestore[0].fields.accountRetention.lastRetentionEpoch,0);assert.equal(plan.storage[0].metadata.accountResetEpoch,'0');assert.equal(plan.storage[0].metadata.retentionEpoch,'0');
});
