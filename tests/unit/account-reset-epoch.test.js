'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

const app=fs.readFileSync('src/app/app.js','utf8'),fire=fs.readFileSync('firestore.rules','utf8'),storage=fs.readFileSync('storage.rules','utf8'),server=fs.readFileSync('functions/index.js','utf8');

test('the app accepts the quarantine recovery state and binds the current epoch to every writable surface',()=>{
  assert.match(app,/\['complete','billing_quarantined','deleting','failed'\]/);
  assert.match(app,/function currentAccountResetEpoch\(\)/);
  for(const callable of ['redeemPromotion','createPartnership','joinPartnership','leavePartnership','prepareReceiptWrite'])assert.match(app,new RegExp("callSecureFunction\\('"+callable+"',[^\\n]*accountResetEpoch"),callable);
  assert.match(app,/callSecureFunction\(name,\{\.\.\.\(data\|\|\{\}\),accountResetEpoch:currentAccountResetEpoch\(\)\}\)/);
  assert.equal((app.match(/customMetadata:\{retentionEpoch:String\(currentRetentionEpoch\(\)\),accountResetEpoch:String\(currentAccountResetEpoch\(\)\)\}/g)||[]).length,3);
  assert.match(app,/accountResetEpoch:currentAccountResetEpoch\(\)/);
  assert.match(app,/Number\(operation\.accountResetEpoch\|\|0\)!==currentAccountResetEpoch\(\)/);
});

test('server deletion mirrors non-ready state atomically and receipt preparation receives the asserted epoch',()=>{
  assert.match(server,/status:'deleting'[\s\S]*tx\.set\(entitlementRef,\{accountResetStatus:'deleting',accountResetEpoch:resetEpoch,accountResetEpochString:String\(resetEpoch\)\}/);
  assert.match(server,/accountResetStatus:'billing_quarantined'/);
  assert.match(server,/cleanResetAdmissions[\s\S]*\['billing_quarantined','deleting','identity_deleting','failed'\]/);
  assert.match(server,/ReceiptAdmission\.prepareBatch\([^\n]*accountResetEpoch:req\.data\?\.accountResetEpoch/);
});

test('rule sources deny non-ready or stale lifecycle data while keeping reset recovery readable',()=>{
  assert.match(fire,/reset\.status == 'complete'/);
  assert.match(fire,/match \/accountResets\/\{uid\} \{ allow read: if owner\(uid\); allow write: if false; \}/);
  assert.match(storage,/ent\.accountResetStatus == 'complete'/);
  assert.match(storage,/metadata\.accountResetEpoch == accountResetEpochString\(uid\)/);
});
