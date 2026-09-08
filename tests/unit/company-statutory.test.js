'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Statutory=require('../../src/core/company-statutory');
const Books=require('../../src/core/company-books');
const State=require('../../src/integration/ltd/company-state');
const Sync=require('../../src/core/ltd-sync');
const Deadlines=require('../../src/core/company-deadlines');
const {CanonicalCompanyDriver}=require('../../src/integration/ltd/CanonicalCompanyDriver');
const {make}=require('../test-fixture');
const fact=value=>({value,evidenceRefs:['local:checked-source']});
function setup(){const context={profile:{id:'profile:test',entityId:'company:test',legalName:'Test Ltd',companyNumber:'12345678',tradingStartDate:'2025-01-01'},figures:{startDate:'2025-01-01',endDate:'2025-12-31',balanceSheet:{directorLoanDueMinor:0}},asOfDate:'2026-09-05',sourceFingerprint:'source-v1',periodRecords:[],deadlines:{deadlines:[]},salaryRecords:[],dividendDeclarations:[],events:[],accountsFiling:{balanceSheetLines:[{id:'zero',figureMinor:0}]}};return context;}
function review(context,values){context.profile.statutoryReview={schemaVersion:1,id:'review:test',entityId:context.profile.entityId,startDate:context.figures.startDate,endDate:context.figures.endDate,reviewedOn:'2026-09-05',revision:1,sourceFingerprint:context.sourceFingerprint,updatedAt:1,deviceId:'test',facts:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,fact(v)]))};return context;}
const get=(input,id)=>Statutory.build(input).items.find(i=>i.id===id);
test('twelve source-backed items; missing facts never imply completion',()=>{
  const checklist=Statutory.build(setup());assert.equal(checklist.items.length,12);assert.equal(checklist.allObligationsComplete,false);assert.equal(checklist.reviewStatus,'not_recorded');
  for(const item of checklist.items){assert.ok(Statutory.STATES.includes(item.status));assert.ok(item.plainEnglish);assert.ok(item.triggerReasons.length);assert.ok(item.sourceRecords.length);assert.ok(item.sourceIds.length);assert.match(item.officialLinks[0].url,/^https:\/\/www.gov.uk\//);assert.ok(item.deadline.display);}
  assert.equal(get(setup(),'paye_rti').status,'needs_checking');assert.equal(get(setup(),'dividend_documents').status,'needs_checking');
});
test('pending RTI survives number readiness, explicit no-payroll cannot override recorded salary',()=>{
  const c=review(setup(),{noPayroll:true});c.salaryRecords=[{id:'salary:a',entityId:c.profile.entityId,payDate:'2025-10-01',status:'confirmed',revision:1,payeRegistrationConfirmed:true,payeReportingStatus:'pending_rti',evidenceRefs:['payroll:a']}];
  assert.equal(get(c,'paye_rti').status,'outstanding');assert.equal(get(c,'paye_rti').deadline.date,'2025-10-01');assert.ok(get(c,'paye_rti').sourceIds.includes('salary:a:1'));
  c.salaryRecords[0].payeReportingStatus='reported_rti';assert.equal(get(c,'paye_rti').status,'completed');
  c.salaryRecords=[];c.events=[{id:'salary:event',status:'committed',sourceTransaction:{companyTransactionType:'director_salary',date:'2025-10-01'}}];assert.equal(get(c,'paye_rti').status,'needs_checking');
});
test('dividends require every document; generated templates are drafts, never completion',()=>{
  const c=review(setup(),{noDividends:true});c.dividendDeclarations=[{id:'dividend:a',entityId:c.profile.entityId,status:'declared',declarationDate:'2025-10-01',paymentDate:'2025-10-02',revision:1,totalDividendMinor:10000,boardApprovalEvidenceRef:'board:a',minutesArtifactRef:'minutes:a',distributableProfitEvidenceRefs:['profit:a'],allocations:[{shareholderId:'a',amountMinor:5000},{shareholderId:'b',amountMinor:5000}],voucherArtifactRefs:['voucher:a']}];
  assert.equal(get(c,'dividend_documents').status,'outstanding');assert.equal(get(c,'dividend_documents').templates[0].status,'draft_for_review');
  c.dividendDeclarations[0].voucherArtifactRefs.push('voucher:b');assert.equal(get(c,'dividend_documents').status,'completed');
  c.dividendDeclarations[0].voucherArtifactRefs=['voucher:a','voucher:a'];assert.equal(get(c,'dividend_documents').status,'outstanding');
});
test('CS01 and separate identity deadlines are never inferred from accounting year',()=>{
  const c=review(setup(),{cs01ReviewDate:'2026-08-31',cs01Filed:false,directorsVerified:true,pscsVerified:false,directorIdentityDueDate:'2026-09-14',pscIdentityDueDate:'2026-10-14'});
  assert.equal(get(c,'cs01').deadline.date,'2026-09-14');assert.equal(get(c,'director_psc_identity').status,'needs_checking');assert.equal(get(c,'director_psc_identity').roleDeadlines[1].deadline.date,'2026-10-14');
  assert.equal(get(setup(),'cs01').deadline.date,null);
});
test('commercial CH route switches with filing date, not the accounts end; expired guidance fails closed',()=>{
  const c=setup();c.asOfDate='2028-03-31';assert.equal(get(c,'companies_house_accounts').route.selected,'eligible_web_or_commercial');c.asOfDate='2028-04-01';assert.equal(get(c,'companies_house_accounts').route.selected,'commercial_ixbrl');assert.equal(get(c,'companies_house_accounts').status,'needs_checking');assert.equal(get(c,'companies_house_accounts').deadline.date,null);
});
test('VAT rolling review uses a complete 12-month window, strict greater-than threshold and next 30 days',()=>{
  const c=review(setup(),{vatWindowStart:'2025-09-01',vatWindowEnd:'2026-08-31',vatTaxableTurnoverMinor:9000000,vatNext30DaysMinor:0});assert.equal(get(c,'vat_rolling_threshold').status,'completed');
  c.profile.statutoryReview.facts.vatTaxableTurnoverMinor=fact(9000001);c.profile.statutoryReview.facts.vatFirstExceededMonthEnd=fact('2026-08-31');assert.equal(get(c,'vat_rolling_threshold').status,'outstanding');assert.equal(get(c,'vat_rolling_threshold').deadline.date,'2026-09-30');
  c.profile.statutoryReview.facts.vatTaxableTurnoverMinor=fact(1);c.profile.statutoryReview.facts.vatNext30DaysMinor=fact(9000001);c.profile.statutoryReview.facts.vatExpectedKnownOn=fact('2026-09-01');assert.equal(get(c,'vat_rolling_threshold').status,'outstanding');assert.equal(get(c,'vat_rolling_threshold').deadline.date,'2026-09-30');
  c.profile.statutoryReview.facts.vatNext30DaysMinor=fact(0);c.profile.statutoryReview.facts.vatWindowStart=fact('2026-01-01');assert.equal(get(c,'vat_rolling_threshold').status,'outstanding');
  c.profile.statutoryReview.facts.vatRegistered=fact(true);assert.equal(get(c,'vat_rolling_threshold').status,'unsupported');
});
test('director loan warning cannot be overridden; six-year retention is not platform storage',()=>{
  const c=review(setup(),{noOverdrawnDirectorLoan:true});c.figures.balanceSheet.directorLoanDueMinor=-1;assert.equal(get(c,'director_loan_s455').status,'unsupported');assert.equal(get(c,'record_retention').deadline.date,'2031-12-31');assert.match(get(c,'record_retention').plainEnglish,/not a six-year TaxMate storage promise/);
});
test('each CT600 period carries its own return and payment deadlines',()=>{
  const c=setup();c.periodRecords=[{id:'p1',entityId:c.profile.entityId,accountsStartDate:c.figures.startDate,accountsEndDate:c.figures.endDate},{id:'p2',entityId:c.profile.entityId,accountsStartDate:c.figures.startDate,accountsEndDate:c.figures.endDate}];c.deadlines.deadlines=[{kind:'company_tax_return',periodId:'p1',dueDate:'2026-11-30'},{kind:'company_tax_return',periodId:'p2',dueDate:'2026-12-31'}];
  const periods=get(c,'ct600_deadline').periods;assert.equal(periods.length,2);assert.equal(periods[0].deadline.date,'2026-11-30');assert.equal(periods[1].deadline.date,'2026-12-31');assert.equal(periods[0].payment.deadline.display,'Please check');
});
test('null, missing and NaN are not zero; explicit zero remains zero',()=>{
  for(const value of [null,undefined,NaN,Infinity,'0'])assert.equal(Statutory.displayFigure(value).status,'needs_checking');assert.equal(Statutory.displayFigure(0).text,'0.00');
  const c=setup();c.accountsFiling.balanceSheetLines.push({id:'missing',figureMinor:null});assert.equal(get(c,'figures_need_checking').status,'needs_checking');
});
test('actual CT600 box construction does not turn unknown allowances or relief into zero',()=>{
  const {driver}=make(),context=driver.statutoryInput();context.periodRecords[0]={...context.periodRecords[0],status:'needs_attention',capitalAllowanceClaimMinor:null,marginalReliefMinor:null};
  const pack=Books.buildSelfFilingPack(context),boxes=pack.corporationTaxReturns[0];assert.equal(boxes.boxes[690],null);assert.equal(boxes.boxes[430],null);assert.equal(boxes.boxDetails.find(b=>b.boxNumber===690).display.status,'needs_checking');assert.equal(pack.status,'needs_attention');
});
test('cross-company, stale, future, malformed and unsupported review input fail closed',()=>{
  for(const change of [c=>c.profile.statutoryReview.entityId='other',c=>c.sourceFingerprint='changed',c=>c.profile.statutoryReview.reviewedOn='2027-01-01',c=>c.profile.statutoryReview.facts.noPayroll.evidenceRefs=[],c=>c.profile.statutoryReview.facts.personalCode=fact('secret')]){
    const c=review(setup(),{noPayroll:true});change(c);assert.equal(get(c,'paye_rti').status,'needs_checking');assert.equal(Statutory.build(c).reviewStatus,'stale_or_invalid');
  }
  assert.throws(()=>Statutory.validateFacts({vatWindowEnd:fact('2026-02-30')}));
});
test('evidenced completion and not-applicable states are reachable without pretending official submission',()=>{
  const c=setup();c.periodRecords=[{id:'p1',entityId:c.profile.entityId,accountsStartDate:c.figures.startDate,accountsEndDate:c.figures.endDate}];
  review(c,{utrReceived:true,corporationTaxRegistered:true,accountsFiled:true,hmrcSoftwareReady:true,cs01ReviewDate:'2026-08-31',cs01Filed:true,directorsVerified:true,pscsVerified:true,noPayroll:true,noDividends:true,vatWindowStart:'2025-09-01',vatWindowEnd:'2026-08-31',vatTaxableTurnoverMinor:0,vatNext30DaysMinor:0,noOverdrawnDirectorLoan:true,recordsBackedUp:true,retentionExceptionsChecked:true,'ct600Filed:p1':true,'corporationTaxPaid:p1':true});
  let checklist=Statutory.build(c);assert.equal(checklist.allObligationsComplete,true);assert.equal(checklist.officialSubmissionVerified,false);assert.equal(get(c,'paye_rti').status,'not_applicable');assert.equal(get(c,'dividend_documents').status,'not_applicable');assert.equal(get(c,'director_loan_s455').status,'not_applicable');
  for(const [key,id] of [['utrReceived','utr'],['corporationTaxRegistered','utr'],['accountsFiled','companies_house_accounts'],['hmrcSoftwareReady','hmrc_ixbrl'],['cs01Filed','cs01'],['recordsBackedUp','record_retention'],['retentionExceptionsChecked','record_retention'],['ct600Filed:p1','ct600_deadline'],['corporationTaxPaid:p1','ct600_deadline']]){c.profile.statutoryReview.facts[key]=fact(false);assert.equal(get(c,id).status,'outstanding',key);assert.equal(Statutory.build(c).allObligationsComplete,false);c.profile.statutoryReview.facts[key]=fact(true);}
  c.profile.statutoryReview.facts.pscsVerified=fact(false);assert.equal(get(c,'director_psc_identity').status,'needs_checking');
});
test('one facade persists review to repository, portable backup and cloud projection; stale write and source mutation invalidate',async()=>{
  const {facade,driver}=make(),before=driver.statutorySnapshot().checklist;
  const result=await facade.onSaveStatutoryReview({expectedRevision:0,sourceFingerprint:before.sourceFingerprint,facts:{noPayroll:fact(true),noDividends:fact(true)}});assert.equal(result.status,'ok');assert.equal(result.data.statutory.checklist.reviewStatus,'current');
  driver.reload();assert.equal(driver.statutorySnapshot().checklist.reviewStatus,'current');
  const exported=State.createExport(driver.state,{appVersion:'2.1.23',buildId:'statutory-test'}),restored=State.importBackup(exported,driver.now(),'restore');State.validateState(restored);assert.equal(restored.domain.companyProfiles[0].statutoryReview.revision,1);
  const records=Sync.recordsForSync(restored);assert.equal(records.companyProfiles[0].statutoryReview.facts.noPayroll.value,true);
  const restoredDriver=new CanonicalCompanyDriver({state:restored,now:driver.now,enforceEntitlement:false});assert.equal(restoredDriver.statutorySnapshot().checklist.reviewStatus,'current');
  const snapshot=JSON.stringify(driver.state);assert.equal((await facade.onSaveStatutoryReview({expectedRevision:0,sourceFingerprint:before.sourceFingerprint,facts:{}})).status,'review_required');assert.equal(JSON.stringify(driver.state),snapshot);
  const event=driver.eventsFor()[0];event.updatedAt+=1;assert.equal(driver.statutorySnapshot().checklist.reviewStatus,'stale_or_invalid');
});
test('free membership cannot save statutory confirmations, and read preparation never saves',async()=>{
  const {facade,driver}=make();const before=JSON.stringify(driver.state);await facade.onPrepareCompanyYear({filingFacts:{},facts:{noPayroll:fact(true)}});assert.equal(JSON.stringify(driver.state),before);
  driver.entitlementSnapshot={paidTier:'free',subscriptionStatus:'inactive'};const result=await facade.onSaveStatutoryReview({});assert.notEqual(result.status,'ok');assert.equal(JSON.stringify(driver.state),before);
});
test('pack and preparation snapshot both expose actual outstanding obligations',async()=>{
  const {facade}=make();const pack=(await facade.onDownloadSelfFilingPack({})).data.payload,prepare=await facade.onPrepareCompanyYear({});assert.equal(pack.schemaVersion,3);assert.equal(pack.readiness.statutoryObligationsComplete,false);assert.equal(prepare.status,'review_required');assert.deepEqual(prepare.data.statutoryChecklist,pack.statutoryChecklist);assert.equal(prepare.snapshot.statutory.readiness.statutoryObligationsComplete,false);
  for(const p of pack.corporationTaxReturns)for(const line of p.boxDetails)assert.ok(line.display.text);
});
test('long first accounts share a CT600 filing date while Corporation Tax payment dates remain separate',()=>{
  const {driver}=make(),context=driver.statutoryInput(),rows=context.deadlines.deadlines;
  assert.deepEqual(rows.filter(r=>r.kind==='company_tax_return').map(r=>r.dueDate),['2028-01-31','2028-01-31']);
  assert.deepEqual(rows.filter(r=>r.kind==='corporation_tax_payment').map(r=>r.dueDate),['2027-09-15','2027-11-01']);
  const first=context.periodRecords[0];assert.equal(Deadlines.corporationTaxDeadlines(first,'2026-09-05','2027-12-01')[1].dueDate,'2028-03-01');
  assert.equal(Deadlines.corporationTaxDeadlines(first,'2026-09-05','bad-date')[1].status,'review_required');
  const invalid={...first,accountsStartDate:'2024-01-01'};assert.throws(()=>Deadlines.corporationTaxDeadlines(invalid,'2026-09-05'),/Invalid company tax period/);
});
test('a real overdrawn loan draft stays unsupported even with a no-overdrawn confirmation',async()=>{
  const {facade,driver}=make();await facade.onRecordDirectorLoanRepayment({amountMinor:100000000,date:'2026-08-24',description:'Too much repaid',evidenceRefs:['local:loan-test']});
  let ctx=driver.statutorySnapshot().checklist;
  await facade.onSaveStatutoryReview({expectedRevision:0,sourceFingerprint:ctx.sourceFingerprint,facts:{noOverdrawnDirectorLoan:fact(true)}});
  ctx=driver.statutorySnapshot().checklist;assert.equal(ctx.items.find(i=>i.id==='director_loan_s455').status,'unsupported');
});
