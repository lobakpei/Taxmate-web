'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {make}=require('../test-fixture');
const Rules=require('../../src/core/company-remuneration-rules');
const State=require('../../src/integration/ltd/company-state');
const Sync=require('../../src/core/ltd-sync');
const Access=require('../../src/core/company-access');
const Books=require('../../src/core/company-books');
const {CanonicalCompanyDriver}=require('../../src/integration/ltd/CanonicalCompanyDriver');
const fact=value=>({value,evidenceRefs:['local:director-check']});

test('RTI evidence updates once, without changing salary, ledger or personal income',async()=>{
  const {driver,facade}=make(),gross=500000;
  const salary={id:'salary-record:rti-test',payDate:'2026-08-20',grossSalaryMinor:gross,payeWithheldMinor:Rules.calculatePayeEstimate(gross).payeEstimateMinor,employeeNiMinor:Rules.calculateEmployeeNi(gross).employeeNiMinor,employerNiMinor:Rules.calculateEmployerNi(gross).employerNiMinor,evidenceRefs:['local:payroll'],directorServicesConfirmed:true,ordinaryRemunerationConfirmed:true,noBenefitsSalarySacrificeOrTerminationPayment:true,payrollResultConfirmed:true,payeRegistrationConfirmed:true,paidWithinNineMonthsConfirmed:true,payeReportingStatus:'pending_rti'};
  assert.equal((await facade.onRecordSalary({salary})).status,'ok');
  const record=driver.list('salaryRecords')[0],financial=JSON.stringify([driver.list('economicEvents'),driver.list('personalIncomeLinks'),driver.projection().metrics]);
  const input={recordId:record.id,requestId:'rti:test',sourceEventRevisionId:record.sourceEventRevisionId,expectedReportingRevision:0,status:'reported_rti',reportedOn:'2026-08-21',evidenceRefs:['local:fps-acceptance'],reason:'FPS acceptance checked'};
  assert.equal((await facade.onUpdatePayrollReporting(input)).status,'ok');
  assert.equal(JSON.stringify([driver.list('economicEvents'),driver.list('personalIncomeLinks'),driver.projection().metrics]),financial);
  assert.equal(driver.list('salaryRecords').length,1);
  const saved=JSON.stringify(driver.state);
  assert.equal((await facade.onUpdatePayrollReporting(input)).data.idempotent,true);
  assert.equal(JSON.stringify(driver.state),saved);
  assert.equal((await facade.onUpdatePayrollReporting({...input,status:'pending_rti'})).status,'review_required');
  assert.equal((await facade.onUpdatePayrollReporting({...input,requestId:'rti:stale'})).status,'review_required');
  const restored=State.importBackup(State.createExport(driver.state),driver.now(),'restore');
  State.validateState(restored);
  assert.equal(Sync.recordsForSync(restored).salaryRecords[0].payrollReporting.status,'reported_rti');
  const read=new CanonicalCompanyDriver({state:restored,now:driver.now,enforceEntitlement:false});
  assert.equal(read.statutorySnapshot().checklist.items.find(i=>i.id==='paye_rti').status,'completed');
});

test('persisted filing confirmations survive reload, backup and sync; book changes invalidate them',async()=>{
  const {driver,facade}=make(),keys=['microEntityEligibilityConfirmed','noUnsupportedBalancesConfirmed','comparativeFiguresChecked','directorApprovalConfirmed'];
  const before=driver.statutorySnapshot().checklist;
  assert.equal((await facade.onSaveStatutoryReview({expectedRevision:0,sourceFingerprint:before.sourceFingerprint,facts:Object.fromEntries(keys.map(k=>[k,fact(true)]))})).status,'ok');
  const eligibility=()=>Books.buildSelfFilingPack(driver.statutoryInput()).accountsFiling.eligibility;
  assert.ok(Object.values(eligibility()).every(Boolean));
  driver.reload();assert.ok(Object.values(eligibility()).every(Boolean));
  assert.equal(Sync.recordsForSync(State.importBackup(State.createExport(driver.state),driver.now(),'restore')).companyProfiles[0].statutoryReview.facts.directorApprovalConfirmed.value,true);
  driver.eventsFor()[0].updatedAt++;
  assert.ok(Object.values(eligibility()).every(v=>v===false));
});

test('Plus retains historical LTD but cannot generate new LTD packs',async()=>{
  const {driver,facade}=make();driver.entitlementSnapshot={subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:driver.now()+86400000,serverVerifiedAt:driver.now()};
  assert.equal(driver.access('read').allowed,true);
  assert.ok(driver.readSnapshot().company);
  for(const callback of ['onPrepareCompanyYear','onDownloadSelfFilingPack','onDownloadWorkingPack'])assert.equal((await facade[callback]({})).status,'failure');
});

test('expired LTD cannot leak through snapshot and unknown verification dates never extend retention',()=>{
  const {driver}=make();driver.entitlementSnapshot={subscriptionStatus:'canceled',paidTier:'free',lastPaidTier:'pro',currentPeriodEnd:Date.UTC(2026,1,1)};
  const snapshot=driver.readSnapshot();assert.equal(snapshot.company,null);assert.equal(snapshot.workspace.events.length,0);assert.equal(snapshot.statutory,null);
  assert.equal(snapshot.businessList.length,driver.state.businesses.length);
  const unknown={paidTier:'free',subscriptionStatus:'inactive',serverVerifiedAt:driver.now(),lastStripeEventCreated:driver.now()};
  assert.equal(Access.retention(unknown,driver.now(),true).state,'retention_unknown');
});
