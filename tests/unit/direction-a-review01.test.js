'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {make}=require('../test-fixture');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/ui/ltd/workbench-renderer.js'),'utf8');
function helpers(){
  const context={};
  vm.runInNewContext(source.replace('render: render,','render: render, _bank: bankEventAmount, _role: packLineRole, _ctRole: ct600Role, _moneyClass: moneyClass, _director: DIRECTOR_CHECK_CODES,'),context);
  return context.TaxMateLtdWorkbenchRenderer;
}
test('F04 each metric carries its exact route parameter and navigating does not write books',async()=>{
  const {facade,driver}=make();const before=JSON.stringify(driver.state);
  for(const id of ['revenue','allowableRunningExpenses','accountingProfit','corporationTax','companyCash','directorLoan']){
    const result=await facade.onOpenMetric({metricId:id});assert.equal(result.status,'ok');
    assert.equal(facade.getSnapshot().navigation.routes.at(-1).params.metricId,id);
  }
  assert.equal(JSON.stringify(driver.state),before);
});
test('approved Pay yourself uses existing permission-checked tax route and retains Records',async()=>{
  const {facade,driver}=make();const before=JSON.stringify(driver.state);
  await facade.onSetWorkspaceArea({area:'tax',view:'pay'});
  assert.equal(facade.getSnapshot().navigation.routes.at(-1).params.view,'pay');
  await facade.onSetWorkspaceArea({area:'records'});
  assert.equal(facade.getSnapshot().navigation.routes.at(-1).screenId,'ltd.workspace.records');
  assert.equal(JSON.stringify(driver.state),before);
});
test('F05 candidates use signed company-bank postings, including net salary, not gross or description',()=>{
  const h=helpers(),rec={entityId:'company',startDate:'2026-01-01',endDate:'2026-12-31'};
  const ev={status:'committed',sourceTransaction:{beneficiaryEntityId:'company',date:'2026-09-01',amountMinor:120000},journals:[{postings:[{accountCode:'COMPANY_BANK',debitMinor:0,creditMinor:91000}]}]};
  assert.equal(h._bank(ev,rec),-91000);assert.equal(ev.sourceTransaction.amountMinor,120000);
  for(const invalid of [{...ev,status:'reversed'},{...ev,sourceTransaction:{...ev.sourceTransaction,beneficiaryEntityId:'other'}},{...ev,sourceTransaction:{...ev.sourceTransaction,date:'2027-01-01'}},{...ev,journals:[]}])assert.equal(h._bank(invalid,rec),null);
});
test('F02 every fixed expense pack field including zero is expense-coloured; relief is not tax paid',()=>{
  const h=helpers();
  for(const id of ['costOfRawMaterialsAndConsumables','staffCosts','depreciationAndOtherAmountsWrittenOffAssets','otherCharges','tax','creditorsDueWithinOneYear','corporationTax']){
    assert.equal(h._role({id}),'out');assert.equal(h._moneyClass(0,h._role({id})),'neg');
  }
  for(const box of [430,440,475,525])assert.equal(h._ctRole(box),'out');
  assert.equal(h._ctRole(435),'in');assert.equal(h._role({id:'profitOrLoss'}),'signed');
});
test('F01 four reason codes map to exactly the four evidencable facts, no unrelated company questions',()=>{
  const h=helpers();assert.deepEqual(Array.from(new Set(Object.values(h._director))).sort(),['comparativeFiguresChecked','directorApprovalConfirmed','microEntityEligibilityConfirmed','noUnsupportedBalancesConfirmed'].sort());
  assert.ok(source.includes("openSheet('statutory',{factKeys:item.factKeys})"));
  assert.ok(source.includes('Object.assign({},currentFacts())'));
  assert.ok(!source.includes("items.push({id:'year'"));
});
test('F06 added conditional personal copy is complete across six locales and preserves dynamic amounts',()=>{
  const {I18N,audit}=require('../../scripts/i18n-audit');
  const keys=['mtd.reviewIncome','billing.unit.month','billing.unit.year','tax.dateJan','tax.dateJul','tip.c2_current'];
  for(const loc of ['en','zh','pl','ro','es','ur'])for(const key of keys)assert.ok(I18N[loc][key],loc+':'+key);
  assert.deepEqual(audit().placeholderMismatches,[]);
  for(const loc of ['zh','pl','ro','es','ur'])assert.notEqual(I18N[loc]['tip.c2_current'],I18N.en['tip.c2_current']);
});
