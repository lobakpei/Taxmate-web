const test=require('node:test');
const assert=require('node:assert/strict');
const Repair=require('../../scripts/production-account-repair');

const document=(path,data,revision=1)=>({path,data,createTime:'2026-09-02T00:00:00.000000Z',updateTime:`2026-09-02T00:00:0${revision}.000000Z`});

test('production repair plan is preconditioned and writes only the two exact synthetic account scopes',()=>{
  const founderUid='founder-fixture-uid',resetUid='reset-fixture-uid',otherUid='other-fixture-uid';
  const founder={records:[
    document(`users/${founderUid}/app/meta`,{businesses:[]},1),
    document(`users/${founderUid}/entries/owned`,{id:'owned',amount:10,receiptPath:`receipts/${founderUid}/owned.jpg`},2),
    document(`users/${founderUid}/ltdControl/activeCompany`,{activeCompanyId:'company:real'},3),
    document('partnerships/FOUNDER1',{createdBy:founderUid},4),
    document('partnerships/FOUNDER1/entries/legacy',{id:'legacy',amount:20,receiptPath:`receipts/${otherUid}/foreign.jpg`,receiptUrl:`https://firebasestorage.googleapis.com/v0/b/example/o/${encodeURIComponent(`receipts/${otherUid}/foreign.jpg`)}?alt=media`},5)
  ],objects:[{name:`receipts/${founderUid}/owned.jpg`,generation:'1',size:4,md5Hash:'owned',crc32c:'owned'}]};
  const resetTarget={records:[
    document(`users/${resetUid}/app/meta`,{businesses:[]},1),
    document(`users/${resetUid}/entries/test`,{id:'test',amount:99},2),
    document(`billingCustomers/${resetUid}`,{stripeCustomerId:'cus_test'},3),
    document('partnerships/RESET001',{createdBy:resetUid},4),
    document('partnerships/RESET001/entries/test',{id:'partnership-test'},5),
    document('partnerships/SHARED01',{createdBy:otherUid},6),
    document(`partnerships/SHARED01/members/${resetUid}`,{uid:resetUid},7),
    document(`partnerships/SHARED01/members/${otherUid}`,{uid:otherUid},8)
  ],objects:[{name:`receipts/${resetUid}/test.jpg`,generation:'8',size:8,md5Hash:'reset',crc32c:'reset'}]};
  const plan=Repair.buildRepairPlan('private-snapshot',{founder:{uid:founderUid},resetTarget:{uid:resetUid}},founder,resetTarget,'2026-09-02T12:00:00.000Z');
  const founderPaths=plan.founderWrites.map(item=>item.path),resetPaths=plan.resetWrites.map(item=>item.path);
  assert.ok(founderPaths.includes(`accountClaims/${founderUid}`));
  assert.ok(founderPaths.some(value=>value.startsWith(`accountQuarantines/${founderUid}/migrations/`)));
  assert.ok(founderPaths.includes(`users/${founderUid}/app/meta`));
  assert.ok(founderPaths.includes(`users/${founderUid}/entries/owned`));
  assert.ok(founderPaths.includes(`users/${founderUid}/ltdControl/activeCompany`));
  assert.ok(founderPaths.includes('partnerships/FOUNDER1/entries/legacy'));
  assert.ok(resetPaths.includes(`users/${resetUid}/entries/test`));
  assert.ok(resetPaths.includes('partnerships/RESET001'));
  assert.ok(resetPaths.includes('partnerships/RESET001/entries/test'));
  assert.ok(resetPaths.includes(`partnerships/SHARED01/members/${resetUid}`));
  assert.equal(resetPaths.includes('partnerships/SHARED01'),false);
  assert.equal(resetPaths.includes(`partnerships/SHARED01/members/${otherUid}`),false);
  assert.equal(plan.resetStorage.length,1);
  for(const operation of [...plan.founderWrites,...plan.resetWrites])assert.ok(operation.write.currentDocument,'every Firestore write has an exists or updateTime precondition');
});

test('production repair plan stops rather than deleting a Tammy-owned partnership with another member',()=>{
  const founderUid='founder-fixture-uid',resetUid='reset-fixture-uid',otherUid='other-fixture-uid',founder={records:[],objects:[]},resetTarget={records:[document('partnerships/RESET002',{createdBy:resetUid}),document(`partnerships/RESET002/members/${otherUid}`,{uid:otherUid},2)],objects:[]};
  assert.throws(()=>Repair.buildRepairPlan('private-snapshot',{founder:{uid:founderUid},resetTarget:{uid:resetUid}},founder,resetTarget,'2026-09-02T12:00:00.000Z'),/another member/);
});

test('Firestore write encoding retains safe timestamp and exact preconditions',()=>{
  const write=Repair.patchWrite('accountClaims/synthetic',{schemaVersion:1,verifiedAt:{$timestamp:'2026-09-02T12:00:00.000Z'}},{exists:false});
  assert.deepEqual(write.currentDocument,{exists:false});
  assert.equal(write.update.fields.schemaVersion.integerValue,'1');
  assert.equal(write.update.fields.verifiedAt.timestampValue,'2026-09-02T12:00:00.000Z');
});

test('post-apply verification retains the full verified Google snapshot identities',()=>{
  const fs=require('node:fs'),source=fs.readFileSync('scripts/production-account-repair.js','utf8');
  assert.equal(Repair.hasVerifiedGoogleSnapshotIdentity({emailVerified:true,providerData:[{providerId:'google.com'}]}),true);
  assert.equal(Repair.hasVerifiedGoogleSnapshotIdentity({uid:'exact-but-insufficient'}),false);
  assert.match(source,/stage='verification';const verified=await verifyProductionRepair\(plan,token,resetEpoch,identities\)/);
  assert.match(source,/verifyLiveIdentity\([^\n]+,identities,authToken\)/);
  assert.doesNotMatch(source,/verifyProductionRepair\(plan,token,resetEpoch\),report/);
});
