'use strict';

const assert=require('node:assert/strict');
const test=require('node:test');
const {make}=require('./test-fixture');

async function startLtdDraft(facade){
  await facade.onAddBusiness();
  const chosen=await facade.onAddBusinessCategoryChosen({category:'limited_company'});
  assert.equal(chosen.status,'ok');
  return chosen;
}

async function saveUnregisteredStep1(facade){
  await startLtdDraft(facade);
  const result=await facade.onContinueStep({step:1,values:{legalName:'ToodaLoop',companyNumberStatus:'not_available'}});
  assert.equal(result.status,'ok');
  assert.equal(result.nextRoute,'ltd.onboarding.step2');
  const acknowledged=await facade.onContinueStep({step:2,values:{registrationDeferredAcknowledged:true}});
  assert.equal(acknowledged.nextRoute,'ltd.onboarding.step3');
  return result;
}

test('B1 two-stage Add Business and Codex-owned Back preserve the approved semantic hierarchy',async()=>{
  const {facade,driver}=make('fresh'),before=JSON.stringify(driver.state);
  const opened=await facade.onAddBusiness();assert.equal(opened.nextRoute,'business.category-choice');
  const selfEmployed=await facade.onAddBusinessCategoryChosen({category:'self_employed_business'});assert.equal(selfEmployed.nextRoute,'business.self-employed-structure');assert.deepEqual(selfEmployed.data.choices,['just_me','partnership']);
  const back=await facade.onBack();assert.equal(back.nextRoute,'business.category-choice');
  await facade.onAddBusinessCategoryChosen({category:'self_employed_business'});
  const partnership=await facade.onSelfEmployedStructureChosen({structure:'partnership'});assert.equal(partnership.nextRoute,'business.existing');assert.equal(partnership.data.delegatedToExistingBusinessFlow,true);assert.equal(JSON.stringify(driver.state),before);
});

test('B2 one-Ltd limit exposes a real no-write Open existing company action',async()=>{
  const {facade,driver}=make('existing'),before=JSON.stringify(driver.state),snapshot=facade.getSnapshot();assert.deepEqual(snapshot.companyLimit,{maximum:1,activeCount:1,canCreate:false,existingAction:{callback:'onOpenExistingCompany',nextRoute:'ltd.workspace.overview'}});
  await facade.onAddBusiness();const limited=await facade.onAddBusinessCategoryChosen({category:'limited_company'});assert.equal(limited.nextRoute,'ltd.one-company-limit');assert.equal(limited.data.limitReached,true);assert.equal(limited.data.noWrite,true);assert.equal(JSON.stringify(driver.state),before);
  const opened=await facade.onOpenExistingCompany({});assert.equal(opened.nextRoute,'ltd.workspace.overview');assert.equal(opened.data.noWrite,true);assert.equal(JSON.stringify(driver.state),before);
});

test('B3 unregistered company keeps official facts absent and resumes the same ownership draft after registration',async()=>{
  const {facade}=make('fresh');await saveUnregisteredStep1(facade);let snapshot=facade.getSnapshot();assert.equal(snapshot.company.profile.companyNumberStatus,'not_available');assert.equal(snapshot.company.profile.incorporationDate,undefined);assert.equal(snapshot.company.profile.tradingStatus,undefined);assert.equal(snapshot.company.profile.accountingPeriod,undefined);assert.equal(snapshot.company.periodPlan,null);
  const ownership=await facade.onContinueStep({step:3,values:{founderName:'Founder',founderShares:100,otherShares:0,directorAnswer:'yes'}});assert.equal(ownership.status,'review_required');assert.equal(ownership.nextRoute,'ltd.onboarding.registration-pending');snapshot=facade.getSnapshot();assert.equal(snapshot.company.profile.shareholders.length,1);assert.equal(snapshot.company.profile.shareholders[0].ownershipBasisPoints,10000);
  const saved=await facade.onSaveCompanyDraft({});assert.equal(saved.data.persistedByCodexLayer,true);const resumed=await facade.onResumeCompanyDraft({});assert.equal(resumed.nextRoute,'ltd.onboarding.registration-details');
  const registered=await facade.onContinueStep({step:1,values:{legalName:'ToodaLoop Ltd',companyNumberStatus:'provided',companyNumber:'00000000',incorporationDate:'2025-12-15'}});assert.equal(registered.nextRoute,'ltd.onboarding.step2');snapshot=facade.getSnapshot();assert.equal(snapshot.company.profile.incorporationDate,'2025-12-15');assert.equal(snapshot.company.profile.shareholders.length,1);assert.equal(snapshot.company.profile.shareholders[0].ownershipBasisPoints,10000);assert.equal(snapshot.company.draftState.registrationStatus,'registered');
});

test('B4 sole founder 100 percent and director No or Not sure remain factual draft states',async()=>{
  const no=make('fresh').facade;await saveUnregisteredStep1(no);const noResult=await no.onContinueStep({step:3,values:{founderName:'Founder',founderShares:1,otherShares:0,directorAnswer:'no'}});assert.equal(noResult.status,'review_required');let snapshot=no.getSnapshot();assert.equal(snapshot.company.profile.shareholders.length,1);assert.equal(snapshot.company.profile.shareholders[0].ownershipBasisPoints,10000);assert.equal(snapshot.company.profile.accountHolder.isDirector,false);assert.equal(snapshot.company.draftState.directorAnswer,'no');
  const unsure=make('fresh').facade;await saveUnregisteredStep1(unsure);const unsureResult=await unsure.onContinueStep({step:3,values:{founderName:'Founder',founderShares:100,otherShares:0,directorAnswer:'not_sure'}});assert.equal(unsureResult.status,'review_required');snapshot=unsure.getSnapshot();assert.equal(snapshot.company.profile.shareholders.length,1);assert.equal(snapshot.company.profile.accountHolder,undefined);assert.equal(snapshot.company.draftState.directorAnswer,'not_sure');assert.ok(unsureResult.reviewReasons.includes('director_confirmation_required'));
});

test('B5 Existing periodPlan uses confirmed profile inputs and exactly reconciles canonical CT records',()=>{
  const plan=make('existing').facade.getSnapshot().company.periodPlan;
  assert.equal(plan.status,'confirmed');assert.deepEqual({startDate:plan.accounts.startDate,endDate:plan.accounts.endDate},{startDate:'2025-12-15',endDate:'2027-01-31'});
  const expected=[{startDate:'2025-12-15',endDate:'2026-12-14'},{startDate:'2026-12-15',endDate:'2027-01-31'}];assert.deepEqual(plan.corporationTaxPeriods.map(({startDate,endDate})=>({startDate,endDate})),expected);assert.deepEqual(plan.confirmedTaxPeriods.map(({startDate,endDate})=>({startDate,endDate})),expected);assert.equal(plan.reconcilesConfirmedPeriods,true);
});

test('B6 draft Edit reopens and updates the same canonical draft revision without a duplicate event',async()=>{
  const {facade}=make('existing'),created=await facade.onAddExpense({amountMinor:45000,date:'2026-08-20',description:'Self-created app development',evidenceRefs:['preview:development-evidence'],category:'software_development',taxFacts:{capitalExpense:true}});assert.equal(created.status,'review_required');const original=created.data.event;assert.equal(original.status,'draft');const count=facade.getSnapshot().workspace.events.length;
  const edit=await facade.onEditDraft({eventId:original.id});assert.equal(edit.nextRoute,'ltd.money.draft-edit');assert.equal(edit.data.recordIdentity.eventId,original.id);assert.equal(edit.data.saveCallback,'onSaveDraftEdit');
  const saved=await facade.onSaveDraftEdit({eventId:original.id,changes:{description:'Self-created app development — evidence updated',evidenceRefs:['preview:development-evidence','preview:technical-assessment']}});assert.equal(saved.status,'review_required');assert.equal(saved.data.editedDraftId,original.id);assert.equal(saved.data.identityPreserved,true);const events=facade.getSnapshot().workspace.events,updated=events.find(item=>item.id===original.id);assert.equal(events.length,count);assert.equal(updated.revision,original.revision+1);assert.equal(updated.sourceTransaction.purpose,'Self-created app development — evidence updated');
});

test('B7 company corrections validate chronology and dependent records fail closed without active-fact mutation',async()=>{
  const {facade}=make('existing'),original=facade.getSnapshot().company.profile;
  const chronology=await facade.onEditCompany({field:'incorporationDate',value:'2026-01-01',reason:'Correct setup date',evidenceRefs:['preview:certificate']});assert.equal(chronology.status,'field_error');assert.equal(chronology.fieldErrors[0].reasonCode,'incorporation_after_trading_start');assert.equal(facade.getSnapshot().company.profile.incorporationDate,original.incorporationDate);
  for(const correction of [
    {field:'incorporationDate',value:'2025-12-01'},
    {field:'tradingStartDate',value:'2025-12-20'},
    {field:'accountingPeriod',value:{startDate:'2025-12-15',endDate:'2027-02-01',referenceDate:'2027-02-01',status:'confirmed'}}
  ]){
    const result=await facade.onEditCompany({...correction,reason:'Founder-controlled correction test',evidenceRefs:['preview:correction-evidence']});assert.equal(result.status,'review_required',correction.field);assert.equal(result.data.activeValueUnchanged,true,correction.field);assert.ok(result.data.impact.affectedRecordIds.length>0,correction.field);const kinds=new Set(result.data.impact.affectedRecords.map(item=>item.kind));assert.ok(kinds.has('events'),correction.field);assert.ok(kinds.has('periods'),correction.field);assert.ok(kinds.has('losses'),correction.field);assert.deepEqual(facade.getSnapshot().company.profile[correction.field],original[correction.field],correction.field);
  }
});

test('B8 facade returns granular stable reason and approved copy keys, never raw validator messages',async()=>{
  const {facade}=make('fresh');await startLtdDraft(facade);const result=await facade.onContinueStep({step:1,values:{legalName:'A'.repeat(161),companyNumberStatus:'provided',companyNumber:'ABC',incorporationDate:'not-a-date'}});assert.equal(result.status,'field_error');assert.deepEqual(result.fieldErrors.map(item=>[item.field,item.reasonCode,item.copyKey]),[
    ['legalName','company_name_too_long','error.company_name'],['companyNumber','company_number_format','error.company_number'],['incorporationDate','incorporation_date_invalid','error.invalid_date']
  ]);assert.ok(result.fieldErrors.every(item=>!('code'in item)&&!('message'in item)&&typeof item.params==='object'));
  const ownership=make('existing').facade,ownershipError=await ownership.onChangeOwnership({effectiveDate:'bad',shareholders:[],reason:'Correction',evidenceRefs:['preview:evidence']});assert.equal(ownershipError.status,'field_error');assert.deepEqual(ownershipError.fieldErrors[0],{field:'ownership',reasonCode:'ownership_effective_date_invalid',copyKey:'error.invalid_date',params:{}});
});

test('B9 Home rows expose canonical values and actions for all four legacy businesses plus Ltd',()=>{
  const snapshot=make('existing').facade.getSnapshot(),rows=snapshot.businessList;assert.deepEqual(rows.map(row=>row.name),['das','Evri','Newset','Taxmate app','ToodaLoop Ltd']);assert.deepEqual(rows.slice(0,4).map(row=>row.summary.amountMinor),[148208,198680,199680,201220]);assert.deepEqual(rows.slice(0,4).map(row=>row.attention.count),[1,1,0,0]);
  for(const row of rows.slice(0,4)){assert.equal(row.businessType,'self_employed_business');assert.equal(row.structure,'partnership');assert.equal(row.share.percent,50);assert.equal(row.share.applied,true);assert.equal(row.actions.primary.callback,'onOpenLegacyBusiness');assert.equal(Number.isSafeInteger(row.summary.incomeMinor),true);assert.equal(Number.isSafeInteger(row.summary.claimableExpensesMinor),true);}
  const ltd=rows[4];assert.equal(ltd.businessType,'limited_company');assert.equal(ltd.summary.amountMinor,snapshot.dataset.ltd.accountingProfitMinor);assert.equal(ltd.summary.kind,'company_accounting_profit');assert.equal(ltd.actions.primary.callback,'onOpenExistingCompany');assert.equal(ltd.actions.primary.nextRoute,'ltd.workspace.overview');
  const soleFixture=make('existing');soleFixture.driver.state.businesses[0].structure='sole_trader';const sole=soleFixture.driver.businessList()[0];assert.equal(sole.structure,'sole_trader');assert.equal(sole.share.percent,100);assert.equal(sole.share.applied,false);assert.equal(sole.summary.kind,'business_profit_estimate');assert.equal(sole.summary.amountMinor,sole.summary.businessProfitMinor);
});
