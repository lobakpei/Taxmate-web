'use strict';

const assert=require('node:assert/strict');
const test=require('node:test');
const {createCompaniesHouseProvider}=require('../src/integration/ltd/companies-house-provider');
const {CanonicalCompanyDriver,DEFAULT_NOW}=require('../src/integration/ltd/CanonicalCompanyDriver');
const {TaxMateLtdUIFacade}=require('../src/integration/ltd/TaxMateLtdUIFacade');
const TransactionAdapter=require('../src/integration/ltd/company-transaction-adapter');
const {make}=require('./test-fixture');

test('Companies House provider uses the official company profile shape and exposes the public record',async()=>{
  const calls=[];
  const provider=createCompaniesHouseProvider({apiKey:'local-test-key',fetchImpl:async(url,options)=>{calls.push({url,options});return{ok:true,status:200,async json(){return{company_name:'TOODALOOP LTD',date_of_creation:'2025-12-15',company_status:'active',type:'ltd',etag:'fixture-etag'};}};}});
  const result=await provider.lookup('00000000');
  assert.equal(provider.isNetworkProvider,true);assert.equal(result.status,'found');assert.deepEqual(result.company,{number:'00000000',name:'TOODALOOP LTD',incorporationDate:'2025-12-15',status:'active',type:'ltd',registryUrl:'https://find-and-update.company-information.service.gov.uk/company/00000000'});
  assert.match(calls[0].url,/api\.company-information\.service\.gov\.uk\/company\/00000000$/);assert.match(calls[0].options.headers.authorization,/^Basic /);assert.doesNotMatch(JSON.stringify(result),/local-test-key/);
});

test('registered lookup is real facade state and never mutates company facts before Continue',async()=>{
  const base=make('fresh'),before=JSON.stringify(base.driver.state),provider={isNetworkProvider:true,async lookup(){return{status:'found',company:{number:'00000000',name:'TOODALOOP LTD',incorporationDate:'2025-12-15',registryUrl:'https://find-and-update.company-information.service.gov.uk/company/00000000'}};}};
  base.driver.companiesHouseProvider=provider;await base.facade.onAddBusinessCategoryChosen({category:'limited_company'});const created=JSON.stringify(base.driver.state),result=await base.facade.onLookupCompaniesHouse({companyNumber:'00000000'});
  assert.equal(result.status,'ok');assert.equal(result.data.company.name,'TOODALOOP LTD');assert.equal(base.facade.getSnapshot().runtime.externalNetwork,true);assert.equal(JSON.stringify(base.driver.state),created);assert.notEqual(created,before);
});

test('shared expense allocation is exact, preserves every leg, and posts only the Ltd share when personally paid',async()=>{
  const {facade}=make(),snapshot=facade.getSnapshot(),companyId=snapshot.company.profile.entityId,legacyId=snapshot.businessList[1].id;
  const input={paidPersonally:true,amountMinor:10001,date:'2026-08-20',description:'Shared connectivity',evidenceRefs:['local:receipt:shared'],companyExpenseCategory:'day_to_day',taxFacts:{capitalUseOverOneYear:'no',specialCost:'no',invoiceToCompany:'yes'},sharedAllocations:[{id:companyId,amountMinor:6001},{id:legacyId,amountMinor:3000},{id:TransactionAdapter.PRIVATE_USE_ID,amountMinor:1000}]};
  const result=await facade.onAddSharedExpense(input);assert.equal(result.status,'ok');const event=result.data.event,shared=event.sourceTransaction.sharedExpense;assert.equal(shared.grossAmountMinor,10001);assert.equal(shared.companyAmountMinor,6001);assert.equal(shared.nonCompanyAmountMinor,4000);assert.equal(shared.allocations.reduce((sum,item)=>sum+item.amountMinor,0),10001);assert.equal(event.sourceTransaction.amountMinor,6001);assert.equal(event.journals[0].postings.reduce((sum,row)=>sum+row.debitMinor,0),6001);assert.equal(event.journals[0].postings.reduce((sum,row)=>sum+row.creditMinor,0),6001);
  const opened=await facade.onOpenRecord({eventId:event.id});assert.equal(opened.data.recordView.grossAmountMinor,10001);assert.equal(opened.data.recordView.companyAmountMinor,6001);assert.equal(opened.data.recordView.companyCashEffectMinor,0);assert.equal(opened.data.recordView.directorLoanEffectMinor,6001);
});

test('company-paid cross-business expense fails closed as a durable draft with full allocation facts',async()=>{
  const {facade}=make(),snapshot=facade.getSnapshot(),companyId=snapshot.company.profile.entityId,legacyId=snapshot.businessList[0].id,result=await facade.onAddSharedExpense({paidPersonally:false,amountMinor:10000,date:'2026-08-20',description:'Company-paid shared service',evidenceRefs:['local:receipt:company-shared'],companyExpenseCategory:'day_to_day',taxFacts:{capitalUseOverOneYear:'no',specialCost:'no',invoiceToCompany:'yes'},sharedAllocations:[{id:companyId,amountMinor:7000},{id:legacyId,amountMinor:3000}]});
  assert.equal(result.status,'review_required');assert.ok(result.reviewReasons.includes('company_paid_shared_expense_review_required'));assert.equal(result.data.event.status,'draft');assert.equal(result.data.event.sourceTransaction.sharedExpense.grossAmountMinor,10000);assert.equal(result.data.event.sourceTransaction.sharedExpense.allocations.length,2);assert.equal(result.data.event.journals.length,0);
});

test('non-trading income and missing salary facts are preserved or rejected without invented confirmations',async()=>{
  const {facade}=make(),income=await facade.onAddIncome({amountMinor:5000,date:'2026-08-20',description:'Bank interest',invoicePartyId:'bank:interest',companyIncomeCategory:'non_trading',evidenceRefs:['local:statement']});
  assert.equal(income.status,'review_required');assert.equal(income.data.event.status,'draft');assert.equal(income.data.event.sourceTransaction.companyTaxTreatment.confirmations.nonTradingIncome,true);
  const salary=await facade.onRecordSalary({salary:{payDate:'2026-08-20',grossSalaryMinor:100000,payeWithheldMinor:0,employeeNiMinor:0,employerNiMinor:0,evidenceRefs:['local:payroll'],payeReportingStatus:'reported_rti'}});assert.equal(salary.status,'field_error');assert.equal(facade.getSnapshot().workspace.salaryRecords.length,0);
});

test('CT Not sure is truthful review-only and scenario refuses an unevidenced baseline',async()=>{
  const {facade}=make(),before=JSON.stringify(facade.getSnapshot().workspace),ct=await facade.onRunCtEstimate({reviewTopics:{records:'yes',periods:'not_sure',losses:'yes'},ctFacts:{},lossUseMinorByPeriod:[],asOfDate:'2026-08-24'});assert.equal(ct.status,'review_required');assert.equal(ct.data.noCalculation,true);assert.equal(JSON.stringify(facade.getSnapshot().workspace),before);
  const scenario=await facade.onRunScenario({asOfDate:'2026-08-24',scenarios:[{kind:'salary',amountMinor:100000}]});assert.equal(scenario.status,'field_error');assert.equal(JSON.stringify(facade.getSnapshot().workspace),before);
});

test('Fix routes target the relevant onboarding step without changing facts',async()=>{
  const {facade,driver}=make(),before=JSON.stringify(driver.state);for(const [reason,route] of [['company_registration_required','ltd.onboarding.step1'],['accounting_period_required','ltd.onboarding.step2'],['account_holder_director_confirmation_required','ltd.onboarding.step3'],['group_structure_not_supported','ltd.onboarding.step4']]){const result=await facade.onFixCompanyFact({reasonCode:reason});assert.equal(result.nextRoute,route);assert.equal(result.data.noWrite,true);}assert.equal(JSON.stringify(driver.state),before);
});

test('repository boundary persists canonical state after every accepted write',async()=>{
  const fixture=make(),seed=fixture.driver.state;let current=JSON.parse(JSON.stringify(seed)),replaces=0;const repository={load(){return JSON.parse(JSON.stringify(current));},replace(next){replaces+=1;current=JSON.parse(JSON.stringify(next));return this.load();}};const driver=new CanonicalCompanyDriver({mode:'existing',repository,meta:{},copy:{},now:()=>DEFAULT_NOW,deviceId:'repository-contract',personalTaxJurisdiction:'EWNI'}),facade=new TaxMateLtdUIFacade({driver});
  const result=await facade.onAddIncome({amountMinor:100,date:'2026-08-20',description:'Persistent income',invoicePartyId:'customer:persistent',companyIncomeCategory:'trading',evidenceRefs:['local:persistent']});assert.equal(result.status,'ok');assert.ok(replaces>=2);assert.ok(current.domain.economicEvents.some(event=>event.sourceTransaction&&event.sourceTransaction.purpose==='Persistent income'));
});
