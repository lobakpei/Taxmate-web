'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Stat=require('../../src/core/company-statutory'),{make}=require('../test-fixture');
const fact=value=>({value,evidenceRefs:['local:VAT-check']});
const sale=(id,date,amountMinor,type='company_income',company='c')=>({id,revision:1,status:'committed',sourceTransaction:{beneficiaryEntityId:company,companyTransactionType:type,date,amountMinor}});
function review(events,extra={}){
  const facts={vatCoverageStart:fact('2024-01-01'),vatCoverageEnd:fact('2026-08-31'),vatOutsideBooksComplete:fact(true),vatForecastConfirmed:fact(true),vatNext30DaysMinor:fact(0),...extra};
  for(const event of events){facts['vatClassification:'+event.id+':1']=fact('taxable');facts['vatTaxPoint:'+event.id+':1']=fact(event.sourceTransaction.date);}
  return facts;
}
const input=events=>({profile:{entityId:'c'},asOfDate:'2026-09-05',events});
test('automatic VAT counts invoice recognition once, excludes payment/funding and other companies',()=>{
  const events=[sale('a','2026-04-01',4000000),sale('b','2026-04-06',4000000),sale('p','2026-08-01',4000000,'sales_invoice_payment'),sale('loan','2026-08-02',99000000,'director_loan_funding'),sale('other','2026-08-02',99000000,'company_income','other')];
  const result=Stat.vatReview(input(events),review(events));
  assert.equal(result.knownTaxableTurnoverMinor,8000000);assert.equal(result.earlyWarning,true);assert.equal(result.exceeded,false);assert.equal(result.complete,true);
  assert.equal(result.rows.length,2);assert.equal(result.startDate,'2025-09-01');
});
test('unknown classification and deleted history cannot produce a complete/safe result',()=>{
  const events=[sale('a','2026-05-01',9000000)],facts=review(events);
  assert.equal(Stat.vatReview(input(events),facts).exceeded,false);
  assert.equal(Stat.vatReview({...input(events),vatHistoryIncomplete:true},facts).complete,false);
  delete facts['vatClassification:a:1'];assert.equal(Stat.vatReview(input(events),facts).complete,false);
});
test('strict crossing, future 30 days, outside-book sales, and unresolved historic crossings',()=>{
  const events=[sale('a','2026-06-01',9000001)],facts=review(events),result=Stat.vatReview(input(events),facts);
  assert.equal(result.exceeded,true);assert.equal(result.deadline,'2026-07-30');
  const low=Stat.vatReview(input([]),review([]),[{vatFirstExceededMonthEnd:fact('2026-06-30')}]);
  assert.equal(low.exceeded,true);assert.equal(low.deadline,'2026-07-30');
  const future=Stat.vatReview(input([]),review([],{vatNext30DaysMinor:fact(9000001),vatExpectedKnownOn:fact('2026-09-01')}));
  assert.equal(future.deadline,'2026-09-30');
  assert.equal(Stat.vatReview(input([]),review([],{['vatOutsideSales:2026-06']:fact(9000001)})).exceeded,true);
});
test('canonical VAT review saves an automatic crossing and preserves it across book changes',async()=>{
  const {driver,facade}=make();
  assert.equal((await facade.onAddIncome({date:'2026-06-01',amountMinor:9000001,description:'VAT sale',invoicePartyId:'customer:vat-test',companyIncomeCategory:'trading',evidenceRefs:['local:sale']})).status,'ok');
  let checklist=driver.statutorySnapshot().checklist;
  const events=driver.eventsFor().filter(e=>e.sourceTransaction.companyTransactionType==='company_income'),facts=review(events);
  assert.equal((await facade.onSaveStatutoryReview({sourceFingerprint:checklist.sourceFingerprint,expectedRevision:0,facts})).status,'ok');
  assert.ok(driver.activeProfile().statutoryReview.facts.vatFirstExceededMonthEnd);
  assert.equal(driver.statutorySnapshot().checklist.items.find(i=>i.id==='vat_rolling_threshold').status,'outstanding');
  driver.eventsFor()[0].updatedAt++;
  checklist=driver.statutorySnapshot().checklist;assert.equal(checklist.reviewStatus,'stale_or_invalid');
  assert.equal(checklist.items.find(i=>i.id==='vat_rolling_threshold').status,'outstanding');
});
