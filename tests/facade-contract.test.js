'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {CALLBACKS}=require('../src/integration/ltd/TaxMateLtdUIFacade');
const {make}=require('./test-fixture');

test('facade exposes the complete stable semantic callback surface',()=>{
  const {facade}=make();assert.equal(CALLBACKS.length,47);assert.ok(CALLBACKS.includes('onRecheckCompaniesHouse'));for(const callback of CALLBACKS)assert.equal(typeof facade[callback],'function',callback);const snapshot=facade.getSnapshot();assert.deepEqual(snapshot.callbacks,CALLBACKS);assert.equal(snapshot.contractVersion,'taxmate-ltd-ui-facade.3');assert.equal(snapshot.packageStatus,'INTEGRATED_CANDIDATE');assert.equal(snapshot.runtime.externalNetwork,false);assert.equal(snapshot.runtime.firebase,false);assert.equal(JSON.stringify(snapshot).includes('<div'),false);
});

test('fresh and existing modes use the same facade and canonical dataset',()=>{
  const fresh=make('fresh').facade.getSnapshot(),existing=make('existing').facade.getSnapshot();assert.equal(fresh.businessList.length,4);assert.equal(fresh.company,null);assert.equal(existing.businessList.length,5);assert.equal(existing.businessList.at(-1).name,'ToodaLoop Ltd');assert.equal(existing.workspace.projection.status,'working_pack_ready');assert.equal(existing.dataset.entryCount,79);assert.equal(existing.dataset.receiptBinariesIncluded,false);assert.equal(existing.dataset.receiptDownloadTokensRemoved,0);
});

test('information overlay and back preserve the Codex-owned dirty draft',async()=>{
  const {facade}=make('fresh');await facade.onAddBusiness();await facade.onAddBusinessCategoryChosen({category:'limited_company'});await facade.onDraftChanged({screenId:'ltd.onboarding.step1',field:{id:'legalName',type:'text',value:'ToodaLoop Ltd'}});const before=facade.getSnapshot().drafts;await facade.onOpenInfo({infoId:'registered-company-name',returnFocusId:'legalName-info'});assert.equal(facade.getSnapshot().navigation.overlays.length,1);await facade.onBack();const after=facade.getSnapshot();assert.equal(after.navigation.overlays.length,0);assert.deepEqual(after.drafts,before);assert.equal(after.drafts.drafts['ltd.onboarding.step1'].dirty,true);
});

test('busy, field error, review required and failure are explicit result states',async()=>{
  const {facade}=make('fresh');const unknown=await facade.invoke('notARealCallback',{});assert.equal(unknown.status,'failure');await facade.onAddBusinessCategoryChosen({category:'limited_company'});const invalid=await facade.onContinueStep({step:1,values:{legalName:'',incorporationDate:'bad',companyNumberStatus:'provided',companyNumber:'1'}});assert.equal(invalid.status,'field_error');assert.ok(invalid.fieldErrors.length>=2);assert.ok(invalid.fieldErrors.every(error=>error.reasonCode&&error.copyKey&&!('message'in error)&&!('code'in error)));
});

test('Fresh Step 1 to 5 creates a real company and Step 4 review does not falsely block bookkeeping',async()=>{
  const {facade}=make('fresh');await facade.onAddBusinessCategoryChosen({category:'limited_company'});
  assert.equal((await facade.onContinueStep({step:1,values:{legalName:'ToodaLoop Ltd',companyNumberStatus:'provided',companyNumber:'00000000',incorporationDate:'2025-12-15'}})).status,'ok');
  const beforePlan=JSON.stringify(facade.driver.state),planned=await facade.onPlanCompanyPeriods({tradingStatus:'trading',tradingStartDate:'2025-12-15',override:{enabled:true,startDate:'2025-12-15',endDate:'2027-01-31'}});
  assert.equal(planned.status,'ok');assert.equal(planned.data.noCompanyWrite,true);assert.equal(planned.data.periodPlan.accounts.endDate,'2027-01-31');assert.equal(JSON.stringify(facade.driver.state),beforePlan);
  assert.equal((await facade.onContinueStep({step:2,values:{tradingStatus:'trading',tradingStartDate:'2025-12-15',corporationTaxStatus:'registered'}})).status,'ok');
  assert.equal((await facade.onContinueStep({step:3,values:{founderName:'Founder',founderShares:51,otherShareholderName:'Other shareholder',otherShares:49,directorAnswer:'yes'}})).status,'ok');
  assert.equal((await facade.onContinueStep({step:4,values:{ordinaryServiceDigital:true,riskAnswers:{groupStructure:true,associatedCompanies:false,propertyOrInvestment:false,inventoryOrStock:false,fullVat:false}}})).status,'ok');
  const started=await facade.onContinueStep({step:5,values:{confirmed:true}});assert.equal(started.status,'review_required');assert.equal(started.nextRoute,'ltd.workspace.overview');assert.equal(started.data.eligibility.allowed,true);const snapshot=facade.getSnapshot();assert.equal(snapshot.businessList.length,5);assert.equal(snapshot.company.profile.lifecycleStatus,'confirmed');assert.ok(snapshot.company.profile.assessmentReasons.includes('group_structure_not_supported'));
});
