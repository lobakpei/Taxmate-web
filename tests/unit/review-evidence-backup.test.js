'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Evidence=require('../../src/core/company-evidence'),Portable=require('../../src/core/portable-backup'),{make}=require('../test-fixture');
test('statutory review receipts are mandatory ZIP inputs, deduplicated and relinked on restore',async()=>{
  const {driver,facade}=make(),source='receipts/user/review.jpg',checklist=driver.statutorySnapshot().checklist;
  assert.equal((await facade.onSaveStatutoryReview({sourceFingerprint:checklist.sourceFingerprint,expectedRevision:0,facts:{recordsBackedUp:{value:true,evidenceRefs:[source]},retentionExceptionsChecked:{value:true,evidenceRefs:[source]}}})).status,'ok');
  const refs=Evidence.requiredReceiptAssociations(driver.state).filter(a=>a.originalPath===source);
  assert.equal(refs.length,1);assert.equal(refs[0].recordType,'statutory_review');
  const changed=Evidence.replaceReceiptReference(driver.state,refs[0],'receipts/user/restored.jpg');
  assert.equal(changed.domain.companyProfiles[0].statutoryReview.facts.recordsBackedUp.evidenceRefs[0],'receipts/user/restored.jpg');
  await assert.rejects(Portable.createArchive({state:driver.state,receipts:[],nodeBuffer:true}),/Referenced receipt/);
});
test('RTI current and historical evidence are preserved as different revisions',()=>{
  const report=(revision,evidenceRefs)=>({revision,evidenceRefs}),state={domain:{salaryRecords:[{id:'s',evidenceRefs:[],payrollReporting:report(2,['receipts/u/new.jpg']),payrollReportingHistory:[report(1,['receipts/u/old.jpg'])]}]}};
  const refs=Evidence.requiredReceiptAssociations(state);assert.equal(refs.length,2);
  assert.deepEqual(refs.map(r=>r.recordId).sort(),['s:rti:1','s:rti:2']);
  const next=Evidence.replaceReceiptReference(state,refs.find(r=>r.recordId==='s:rti:1'),'receipts/u/restored-old.jpg');
  assert.equal(next.domain.salaryRecords[0].payrollReportingHistory[0].evidenceRefs[0],'receipts/u/restored-old.jpg');
  assert.equal(next.domain.salaryRecords[0].payrollReporting.evidenceRefs[0],'receipts/u/new.jpg');
});
