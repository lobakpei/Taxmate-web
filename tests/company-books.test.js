'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const CompanyBooks=require('../src/core/company-books');
const CompanyState=require('../src/integration/ltd/company-state');
const LtdSync=require('../src/core/ltd-sync');
const {make}=require('./test-fixture');

const INCOME_TAX_FACTS={ordinaryTradingIncomeConfirmed:true,nonTradingIncome:false,chargeableGain:false};
const EXPENSE_TAX_FACTS={revenueExpenseConfirmed:true,whollyAndExclusivelyBusiness:true,specificallyDisallowed:false,capitalExpense:false};
const CT_FACTS={ukResidentConfirmed:true,ringFenceProfits:false,closeInvestmentHoldingCompany:false,associatedCompaniesConfirmedNone:true,qualifyingDistributionsMinor:0,accountsCompleteConfirmed:true,sameTradeContinues:true};

test('LTD accrual records, bank matching, assets and self-filing figures form one traceable company year',async()=>{
  const {facade,driver}=make();driver.now=()=>Date.UTC(2027,1,2,12);const profile=facade.getSnapshot().company.profile;
  const invoice=await facade.onCreateSalesInvoice({invoice:{id:'sales-invoice:test',number:'INV-001',customerName:'Example customer',issueDate:'2026-08-20',dueDate:'2026-09-20',description:'Consulting work',amountMinor:120000,evidenceRefs:['local:invoice-001']},taxFacts:INCOME_TAX_FACTS});
  assert.equal(invoice.status,'ok');assert.equal(invoice.data.record.outstandingMinor,120000);
  const invoicePayment=await facade.onRecordSalesInvoicePayment({invoiceId:'sales-invoice:test',payment:{id:'sales-invoice-payment:test',date:'2026-08-22',amountMinor:20000,evidenceRefs:['local:bank-invoice-001']}});
  assert.equal(invoicePayment.status,'ok');assert.equal(invoicePayment.data.record.outstandingMinor,100000);

  const bill=await facade.onCreateSupplierBill({bill:{id:'supplier-bill:test',number:'BILL-001',supplierName:'Example supplier',billDate:'2026-08-20',dueDate:'2026-09-20',description:'Office services',category:'office_costs',amountMinor:30000,evidenceRefs:['local:bill-001']},taxFacts:EXPENSE_TAX_FACTS});
  assert.equal(bill.status,'ok');assert.equal(bill.data.record.outstandingMinor,30000);
  const billPayment=await facade.onRecordSupplierBillPayment({billId:'supplier-bill:test',payment:{id:'supplier-bill-payment:test',date:'2026-08-23',amountMinor:10000,evidenceRefs:['local:bank-bill-001']}});
  assert.equal(billPayment.status,'ok');assert.equal(billPayment.data.record.outstandingMinor,20000);

  const asset=await facade.onRegisterCompanyAsset({asset:{id:'fixed-asset:test',description:'Work computer',supplierName:'Computer shop',purchaseDate:'2026-08-20',costMinor:60000,residualValueMinor:0,usefulLifeMonths:36,paymentStatus:'unpaid',aiaClaimed:true,aiaClaimMinor:60000,aiaQualifyingConfirmed:true,evidenceRefs:['local:asset-invoice-001']}});
  assert.equal(asset.status,'ok');assert.equal(asset.data.record.outstandingMinor,60000);
  const assetPayment=await facade.onRecordCompanyAssetPayment({assetId:'fixed-asset:test',payment:{id:'fixed-asset-payment:test',date:'2026-08-24',amountMinor:10000,evidenceRefs:['local:bank-asset-001']}});
  assert.equal(assetPayment.status,'ok');assert.equal(assetPayment.data.record.outstandingMinor,50000);
  const depreciation=await facade.onRecordCompanyDepreciation({assetId:'fixed-asset:test'});assert.equal(depreciation.status,'ok');assert.ok(depreciation.data.record.depreciationEntries[0].amountMinor>0);

  const beforeTax=facade.getSnapshot().workspace,ledger=require('../src/core/company-ledger').reconcile(beforeTax.events,profile.entityId);
  assert.equal(ledger.balances.TRADE_RECEIVABLES,100000);assert.equal(ledger.balances.TRADE_PAYABLES,70000);assert.equal(ledger.balances.FIXED_ASSET_COST,60000);
  const ct=await facade.onRunCtEstimate({reviewTopics:{records:'yes',periods:'yes',losses:'yes'},ctFacts:CT_FACTS,lossUseMinorByPeriod:[0,0],asOfDate:'2026-08-24'});assert.equal(ct.status,'ok');assert.equal(ct.data.periodRecords.reduce((sum,record)=>sum+(record.capitalAllowanceClaimMinor||0),0),60000);

  const events=facade.getSnapshot().workspace.events,movements=CompanyBooks.cashMovements(events,profile.entityId,profile.accountingPeriod.startDate,profile.accountingPeriod.endDate),closing=movements.reduce((sum,row)=>sum+row.amountMinor,0),lines=movements.map((row,index)=>({id:'statement-line:'+(index+1),date:row.date,amountMinor:row.amountMinor,description:row.description})),matches=movements.map((row,index)=>({statementLineId:'statement-line:'+(index+1),bookEventId:row.eventId}));
  const bank=await facade.onMatchBankStatement({statement:{id:'bank-reconciliation:test',startDate:profile.accountingPeriod.startDate,endDate:profile.accountingPeriod.endDate,openingBalanceMinor:0,closingBalanceMinor:closing,lines,matches,evidenceRefs:['local:year-end-statement']}});assert.equal(bank.status,'ok');assert.equal(bank.data.record.status,'reconciled');

  const prepared=await facade.onPrepareCompanyYear({});assert.equal(prepared.status,'review_required');assert.equal(prepared.data.figures.status,'ready_for_director_check');assert.equal(prepared.data.readiness.statutoryObligationsComplete,false);assert.equal(prepared.data.figures.profitAndLoss.turnoverMinor>=120000,true);assert.equal(prepared.data.figures.balanceSheet.customersOweCompanyMinor,100000);assert.equal(prepared.data.figures.balanceSheet.supplierBillsDueMinor,70000);
  const pack=await facade.onDownloadSelfFilingPack({filingFacts:{microEntityEligibilityConfirmed:true,noUnsupportedBalancesConfirmed:true,comparativeFiguresChecked:true,directorApprovalConfirmed:true}});assert.equal(pack.status,'review_required');assert.equal(pack.data.payload.readiness.figuresReady,true);assert.equal(pack.data.payload.readiness.statutoryObligationsComplete,false);assert.equal(pack.data.payload.statutoryChecklist.items.length,12);assert.equal(pack.data.payload.submissionRoute.directFiling,false);assert.equal(pack.data.payload.submissionRoute.directorMustCheckAndConfirm,true);assert.ok(pack.data.payload.corporationTaxReturns.length>=1);assert.equal(pack.data.payload.corporationTaxReturns.reduce((sum,item)=>sum+item.boxes[690],0),60000);assert.ok(pack.data.payload.corporationTaxReturns.every(item=>item.boxDetails.every(box=>box.label&&box.plainEnglish&&box.whereToEnter&&box.sourceIds.length)));assert.ok(pack.data.payload.accountsFiling.balanceSheetLines.some(line=>line.id==='profitAndLossReserve'));assert.ok(pack.data.payload.taxComputations.every(item=>item.lines.length>=7));assert.equal(pack.data.payload.taxComputation.periods.length,pack.data.payload.taxComputations.length);assert.ok(pack.data.payload.filingSteps.length>=4);assert.deepEqual(pack.data.payload.steps,pack.data.payload.filingSteps);assert.equal(pack.data.payload.mvpBoundaries.length,6);assert.ok(pack.data.payload.mvpBoundaries.every(item=>item.plainEnglish));assert.ok(pack.data.payload.evidenceIndex.includes('local:asset-invoice-001'));
  const backup=CompanyState.createExport(driver.state,{appVersion:'2.1.25',buildId:'company-books-test'}),restored=CompanyState.importBackup(backup,driver.now(),'restored-device');CompanyState.validateState(restored);for(const collection of ['salesInvoices','supplierBills','fixedAssets','bankReconciliations']){assert.equal(restored.domain[collection].length,1,collection);assert.equal(LtdSync.recordsForSync(restored)[collection].length,1,collection+' sync');}
  await facade.onCreateSalesInvoice({invoice:{id:'sales-invoice:late-change',number:'INV-002',customerName:'Late customer',issueDate:'2026-08-25',dueDate:'2026-09-25',amountMinor:1000,evidenceRefs:['local:invoice-002']},taxFacts:INCOME_TAX_FACTS});let stale=await facade.onPrepareCompanyYear({});assert.equal(stale.status,'review_required');assert.ok(stale.reviewReasons.includes('corporation_tax_calculation_out_of_date'));
  await facade.onRecordSalesInvoicePayment({invoiceId:'sales-invoice:late-change',payment:{id:'sales-invoice-payment:late-change',date:'2026-08-26',amountMinor:1000,evidenceRefs:['local:bank-invoice-002']}});stale=await facade.onPrepareCompanyYear({});assert.ok(stale.reviewReasons.includes('year_end_bank_statement_out_of_date'));
});

test('retries keep fully-settled records intact and conflicting payment identities fail closed',async()=>{
  const {facade,driver}=make();driver.now=()=>Date.UTC(2027,1,2,12);const invoiceInput={invoice:{id:'sales-invoice:retry',number:'INV-RETRY',customerName:'Retry customer',issueDate:'2026-08-20',dueDate:'2026-09-20',amountMinor:5000,evidenceRefs:['local:retry-invoice']},taxFacts:INCOME_TAX_FACTS},paymentInput={invoiceId:'sales-invoice:retry',payment:{id:'sales-invoice-payment:retry',date:'2026-08-21',amountMinor:5000,evidenceRefs:['local:retry-payment']}};
  assert.equal((await facade.onCreateSalesInvoice(invoiceInput)).status,'ok');assert.equal((await facade.onRecordSalesInvoicePayment(paymentInput)).status,'ok');const createRetry=await facade.onCreateSalesInvoice(invoiceInput),paymentRetry=await facade.onRecordSalesInvoicePayment(paymentInput);assert.equal(createRetry.status,'ok');assert.equal(createRetry.data.record.outstandingMinor,0);assert.equal(paymentRetry.status,'ok');assert.equal(paymentRetry.data.record.payments.length,1);assert.equal(driver.state.domain.economicEvents.filter(event=>event.id.includes('retry')).length,2);
  const conflict=await facade.onRecordSalesInvoicePayment({invoiceId:'sales-invoice:retry',payment:{...paymentInput.payment,amountMinor:4000}});assert.equal(conflict.status,'field_error');
});

test('bank statement matching fails closed when a line or amount does not match the books',async()=>{
  const {facade,driver}=make();driver.now=()=>Date.UTC(2027,1,2,12);const profile=facade.getSnapshot().company.profile,result=await facade.onMatchBankStatement({statement:{id:'bank-reconciliation:bad',startDate:profile.accountingPeriod.startDate,endDate:profile.accountingPeriod.endDate,openingBalanceMinor:0,closingBalanceMinor:1,lines:[{id:'statement-line:bad',date:'2026-08-20',amountMinor:1,description:'Unknown'}],matches:[],evidenceRefs:['local:statement-bad']}});assert.equal(result.status,'review_required');assert.ok(result.reviewReasons.includes('bank_statement_lines_not_matched'));assert.ok(result.reviewReasons.includes('company_bank_entries_not_matched'));
});

test('an unfinished company year cannot be presented as ready to file',()=>{
  const {driver}=make(),figures=driver.companyYearFigures();assert.equal(figures.status,'needs_attention');assert.ok(figures.reasonCodes.includes('company_year_not_finished'));
});

test('unsupported asset disposal and an AIA claim above the simple limit fail closed',async()=>{
  const {facade,driver}=make();driver.now=()=>Date.UTC(2027,1,2,12);const profile=facade.getSnapshot().company.profile;
  const first=await facade.onRegisterCompanyAsset({asset:{id:'fixed-asset:large-a',description:'Large machine A',purchaseDate:'2026-08-20',costMinor:60000000,residualValueMinor:0,usefulLifeMonths:120,paymentStatus:'unpaid',aiaClaimed:true,aiaClaimMinor:60000000,aiaQualifyingConfirmed:true,evidenceRefs:['local:large-machine-a']}}),second=await facade.onRegisterCompanyAsset({asset:{id:'fixed-asset:large-b',description:'Large machine B',purchaseDate:'2026-12-20',costMinor:60000000,residualValueMinor:0,usefulLifeMonths:120,paymentStatus:'unpaid',aiaClaimed:true,aiaClaimMinor:60000000,aiaQualifyingConfirmed:true,evidenceRefs:['local:large-machine-b']}});assert.equal(first.status,'ok');assert.equal(second.status,'ok');
  const ct=await facade.onRunCtEstimate({reviewTopics:{records:'yes',periods:'yes',losses:'yes'},ctFacts:CT_FACTS,lossUseMinorByPeriod:[0,0],asOfDate:'2027-02-02'});assert.equal(ct.status,'review_required');assert.ok(ct.reviewReasons.includes('capital_allowance_claim_exceeds_supported_aia_limit'));
  const stored=driver.state.domain.fixedAssets.find(record=>record.id==='fixed-asset:large-a');stored.status='disposed';const figures=CompanyBooks.buildCompanyYearFigures({profile,events:driver.eventsFor(profile),periodRecords:driver.recordsFor('companyTaxPeriods',profile),salesInvoices:[],supplierBills:[],fixedAssets:driver.state.domain.fixedAssets,bankReconciliations:[],asOfDate:'2027-02-02'});assert.ok(figures.reasonCodes.includes('asset_disposal_needs_checking'));
});
