'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Policy=require('../../src/core/retention-policy'),State=require('../../src/integration/ltd/company-state'),{make}=require('../test-fixture');
const june=Date.UTC(2026,5,1),free={subscriptionStatus:'canceled',paidTier:'free',lastPaidTier:'pro',currentPeriodEnd:june};
test('one policy is identical on client and server, and follows London tax-year midnight',()=>{
  assert.equal(fs.readFileSync(path.join(__dirname,'../../src/core/retention-policy.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../../functions/retention-policy.js'),'utf8'));
  assert.equal(Policy.decide(free,Date.UTC(2027,3,5,22,59,59)).status,'retained');
  assert.equal(Policy.decide(free,Date.UTC(2027,3,5,23)).status,'expired');
  assert.equal(Policy.decide(free,Date.UTC(2026,11,1)).deleteOnDate,'2027-04-06');
  assert.equal(Policy.decide({...free,paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:Date.UTC(2028,1,1)},Date.UTC(2027,5,1)).status,'paid');
  assert.equal(Policy.decide({paidTier:'free',serverVerifiedAt:june,lastStripeEventCreated:june},june).status,'needs_checking');
});
test('whole-account plan preserves new-year entries and does not mutate other members or authentication',()=>{
  const {driver}=make(),state=driver.state;
  state.entries.push({...state.entries[0],id:'new-year-free',date:'2027-04-06'});
  state.yearData['2027-28']={mileage:4};
  const plan=Policy.plan(state,free,Date.UTC(2027,5,1)),next=State.migrate(Policy.apply(state,plan,Date.UTC(2027,5,1)),Date.UTC(2027,5,1),'retention-test');
  State.validateState(next);
  assert.deepEqual(next.entries.map(e=>e.id),['new-year-free']);
  assert.deepEqual(next.yearData['2027-28'],{mileage:4});
  assert.equal(next.domain.companyProfiles.length,1); // A live carry-forward loss still belongs to this company.
  assert.equal(next.domain.companyProfiles[0].retentionHistoryGap.historyDeletedBefore,'2027-04-06');
  assert.equal(next.domain.companyLossRecords[0].remainingMinor,state.domain.companyLossRecords[0].remainingMinor);
  assert.equal(state.domain.companyProfiles.length,1);
  assert.equal(plan.blockers.length,0);
  assert.ok(next.retention.historyIncomplete);
});
test('cross-year LTD carries balances and deletes detailed expired events without erasing new-year records',()=>{
  const {driver}=make(),state=driver.state;
  state.domain.economicEvents.find(e=>e.origin==='company_v1_5').sourceTransaction.date='2027-04-06';
  const plan=Policy.plan(state,free,Date.UTC(2027,5,1));
  const next=State.migrate(Policy.apply(state,plan,Date.UTC(2027,5,1)),Date.UTC(2027,5,1),'test');
  assert.equal(State.validateState(next),true);assert.deepEqual(plan.blockers,[]);
  const source=state.domain.economicEvents.find(e=>e.origin==='company_v1_5');
  assert.deepEqual(next.domain.economicEvents.find(e=>e.id===source.id),source);
  assert.equal(next.domain.economicEvents.filter(e=>e.origin==='company_v1_5'&&e.sourceTransaction.date<'2027-04-06').length,0);
  assert.ok(next.domain.economicEvents.some(e=>e.sourceTransaction.companyTransactionType==='opening_balance'));
});
test('reactivation before the boundary preserves history, after boundary owes original cutoff even if worker delayed',()=>{
  const active={paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:Date.UTC(2029,0,1)};
  const december=Date.UTC(2026,11,1),late=Date.UTC(2028,5,1);
  const within=Policy.lifecycle(free,active,december);assert.equal(within.purgeRequired,undefined);
  const overdue=Policy.lifecycle(free,active,late);assert.equal(overdue.requiredCutoffDate,'2027-04-06');
  assert.equal(Policy.decide({...active,accountRetention:overdue},late).cutoffDate,'2027-04-06');
  assert.equal(Policy.decide(free,late).cutoffDate,'2027-04-06');
});
test('retention controls apply once, leaving an explicit restored current-epoch snapshot intact',()=>{
  const state=make().driver.state,c={schemaVersion:2,status:'complete',epoch:1,cutoffDate:'2027-04-06',deleteOnDate:'2027-04-06'};
  const next=Policy.applyControl(state,c,Date.UTC(2027,5,1));next.entries.push(state.entries[0]);
  assert.deepEqual(Policy.applyControl(next,c,Date.UTC(2027,5,2)),next);
});
test('envelope fingerprints use the real sync checksum including surrogate-pair text',()=>{
  const Sync=require('../../src/core/revision-sync');
  const record={id:'emoji',name:'Hello 👋',revision:1};
  assert.equal(Policy.fingerprint(record),Sync.fingerprint(record));
});
test('server projected promotions and payment grace prevent deletion and use the latest actual end',()=>{
  const now=Date.UTC(2027,5,1),until=Date.UTC(2028,5,1),Entitlement=require('../../src/core/entitlement');
  for(const snapshot of [{...free,promotionAccess:{plusExpiresAt:until}},{...free,promotionAccess:{proPermanent:true}},{...free,lastPaidTier:'plus',graceUntil:until}]){assert.equal(Policy.decide(snapshot,now).status,'paid');assert.notEqual(Entitlement.resolve(snapshot,now,false).tier,'free');assert.equal(Policy.lifecycle(snapshot,{paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:until},now).purgeRequired,undefined);}
  assert.equal(Policy.accessEnd({...free,promotionAccess:{plusExpiresAt:Date.UTC(2026,11,1)}},now),Date.UTC(2026,11,1));
});
test('authoritative roll-forward preserves a newer locally saved company profile instead of erasing it',async()=>{
 const Sync=require('../../src/core/ltd-sync'),fixture=make(),base=JSON.parse(JSON.stringify(fixture.driver.state)),now=Date.UTC(2027,5,1);fixture.driver.now=()=>fixture.driver.state.domain.updatedAt+1000;assert.equal((await fixture.facade.onEditCompany({field:'legalName',value:'Updated before deletion Ltd',reason:'Confirmed new company name',evidenceRefs:['local:company-name']})).status,'ok');const local=fixture.driver.state;
 const remote=Policy.apply(base,Policy.plan(base,free,now),now),owned=Policy.apply(local,Policy.plan(local,free,now),now+1),ids=new Set(remote.domain.entities.filter(e=>e.type==='limited_company').map(e=>e.id)),envelopes=[];
 for(const [c,rows]of Object.entries(Sync.recordsForSync(remote)))for(const r of rows)envelopes.push(Sync.envelope(c,r,Sync.companyIdForRecord(c,r,ids)));
 const restored=Sync.applyRetentionDownloads(owned,envelopes);assert.equal(restored.domain.companyProfiles[0].legalName,'Updated before deletion Ltd');assert.equal(State.validateState(restored),true);
});
test('existing salary, unpaid dividend, scheduled ownership and live asset survive roll-forward with exact balances',async()=>{
  const {driver,facade}=make(),Ledger=require('../../src/core/company-ledger'),Rules=require('../../src/core/company-remuneration-rules');driver.now=()=>Date.UTC(2026,7,24);driver.enforceEntitlement=false;
  const profile=driver.activeProfile(),gross=500000,employee=Rules.calculateEmployeeNi(gross),employer=Rules.calculateEmployerNi(gross),paye=Rules.calculatePayeEstimate(gross);
  const salary=await facade.onRecordSalary({salary:{id:'salary-record:cross-year',personId:'person:account-holder',personalTaxJurisdiction:'EWNI',payDate:'2026-04-06',grossSalaryMinor:gross,payeWithheldMinor:paye.payeEstimateMinor,employeeNiMinor:employee.employeeNiMinor,employerNiMinor:employer.employerNiMinor,companyPaymentAccountId:`account-company-bank:${profile.entityId}`,personalPaymentAccountId:`account-personal:${profile.entityId}`,evidenceRefs:['local:payroll'],directorServicesConfirmed:true,ordinaryRemunerationConfirmed:true,noBenefitsSalarySacrificeOrTerminationPayment:true,payrollResultConfirmed:true,payeRegistrationConfirmed:true,paidWithinNineMonthsConfirmed:true,payeReportingStatus:'reported_rti'}});assert.equal(salary.status,'ok',JSON.stringify(salary.fieldErrors));
  const declaration=await facade.onDeclareDividend({dividend:{id:'dividend-record:unpaid-cross-year',declarationDate:'2026-04-05',paymentDate:'2026-04-07',totalDividendMinor:100000,confirmedDistributableProfitMinor:100000,independentAccountsConfirmation:true,corporationTaxEstimateOnly:false,distributableProfitEvidenceRefs:['local:interim'],boardApprovalEvidenceRef:'local:board',minutesArtifactRef:'local:minutes'}});assert.equal(declaration.status,'ok',JSON.stringify(declaration.fieldErrors));
  const holder=profile.shareholders.find(s=>s.isAccountHolder),other=profile.shareholders.find(s=>!s.isAccountHolder);
  assert.equal((await facade.onChangeOwnership({effectiveDate:'2026-09-01',shareholders:[{...holder,shares:60},{...other,shares:40}],reason:'Scheduled ownership',evidenceRefs:['local:ownership']})).status,'ok');
  const asset=await facade.onRegisterCompanyAsset({asset:{id:'fixed-asset:cross-year',description:'Work computer',supplierName:'Computer shop',purchaseDate:'2026-08-20',costMinor:60000,residualValueMinor:0,usefulLifeMonths:36,paymentStatus:'unpaid',aiaClaimed:true,aiaClaimMinor:60000,aiaQualifyingConfirmed:true,evidenceRefs:['local:asset']}});assert.equal(asset.status,'ok');
  const before=JSON.parse(JSON.stringify(driver.state)),initial=Ledger.reconcile(driver.eventsFor(),profile.entityId),next=State.migrate(Policy.apply(before,Policy.plan(before,{...free,currentPeriodEnd:Date.UTC(2025,5,1)},driver.now()),driver.now()),driver.now(),'retention-test');assert.equal(State.validateState(next),true);
  assert.deepEqual(next.domain.salaryRecords,before.domain.salaryRecords);assert.deepEqual(next.domain.personalIncomeLinks,before.domain.personalIncomeLinks);assert.deepEqual(next.domain.dividendDeclarations,before.domain.dividendDeclarations);assert.deepEqual(next.domain.fixedAssets,before.domain.fixedAssets);
  assert.equal(next.domain.companyProfiles[0].ownershipHistory.at(-1).effectiveFrom,'2026-09-01');assert.equal(next.domain.companyProfiles[0].ownershipHistory[0].effectiveFrom,'2026-04-05');
  const after=Ledger.reconcile(next.domain.economicEvents.filter(e=>e.origin==='company_v1_5'),profile.entityId);assert.equal(after.cashMinor,initial.cashMinor);assert.equal(after.balanceStatus,'reconciled');assert.equal(after.balances.FIXED_ASSET_COST,initial.balances.FIXED_ASSET_COST);assert.equal(after.balances.TRADE_PAYABLES,initial.balances.TRADE_PAYABLES);
  const read=new (require('../../src/integration/ltd/CanonicalCompanyDriver').CanonicalCompanyDriver)({state:next,now:driver.now,enforceEntitlement:false}),paid=await new (require('../../src/integration/ltd/TaxMateLtdUIFacade').TaxMateLtdUIFacade)({driver:read}).onRecordDividendPayment({declarationId:'dividend-record:unpaid-cross-year',voucherArtifactRefs:['local:holder-voucher','local:other-voucher']});assert.equal(paid.status,'ok',JSON.stringify(paid.fieldErrors));assert.equal(paid.data.personalIncomeLink.grossAmountMinor,51000,'Original declaration uses its original 51% ownership, not the scheduled 60%');
});
