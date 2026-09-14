'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const app=read('src/app/app.js');
const billing=read('src/app/billing-ui.js');
const ltd=read('src/ui/ltd/workbench-renderer.js');
const ltdCss=read('src/ui/ltd/workbench.css');
const actions=read('src/app/action-dispatch.js');

function section(source,start,end){
  return source.slice(source.indexOf(start),source.indexOf(end));
}

test('only genuine draggable personal sheets render grab handles',()=>{
  assert.doesNotMatch(app,/ob-sheet-grip/);
  assert.doesNotMatch(html,/\.ob-sheet-grip/);
  assert.doesNotMatch(ltd,/tm-grab/);
  assert.doesNotMatch(ltdCss,/\.tm-grab/);

  assert.match(html,/class="grab"/);
  const drag=section(app,'function initSheetDrag()','function closeSheet(');
  assert.match(drag,/querySelector\('\.grab'\)/);
  assert.match(drag,/addEventListener\('touchmove',onMove/);
  assert.match(drag,/if\(dy>100\)/);
});

test('read-only business-use value is text, not a disabled-looking button',()=>{
  assert.match(html,/<span class="chip on">100%<\/span>/);
  assert.doesNotMatch(html,/<button[^>]*pointer-events:none[^>]*>100%<\/button>/);
});

test('billing dialog keeps its brand and one header dismiss control',()=>{
  const billingSheet=section(billing,'function billingSheet(','function billingOverviewPage(');
  assert.match(billingSheet,/taxmateFlowBrand\(\)\+body/);
  assert.doesNotMatch(billingSheet,/billingButton\(t\('ob\.back'\)/);
  assert.match(html,/id="sb-billing"[\s\S]*?data-billing-title[\s\S]*?review01-close/);
});

test('LTD sheets omit repeated kick/title copy',()=>{
  const repeated=/sheet\(\{[^\r\n]*kick:([^,]+),\s*title:\1/g;
  assert.deepEqual([...ltd.matchAll(repeated)].map(match=>match[0]),[]);
  assert.match(ltd,/kick:t\('design\.step_basics'\), title:t\('money\.add_expense'\)/);
  assert.match(ltd,/kick:t\('salary\.title'\), title:t\('rti\.title'\)/);
  assert.match(ltd,/kick:ctx\.recordId\?t\('bank\.title'\):null, title:ctx\.recordId\?t\('bank\.edit'\):t\('bank\.title'\)/);
});

test('LTD sheets with a footer dismiss action do not add a duplicate close cross',()=>{
  const discard=section(ltd,'function discardSheet(','function taxYearLabel');
  const income=section(ltd,'function sheetIncome()','function sheetExpense()');
  const movement=section(ltd,'function sheetMovement(','function sheetCt()');
  const scenario=section(ltd,'function sheetScenario()','function sheetSalary()');
  const salary=section(ltd,'function sheetSalary()','function sheetDividend()');
  const dividend=section(ltd,'function sheetDividend()','function sheetDividendPayment()');
  const dividendPayment=section(ltd,'function sheetDividendPayment()','function sheetShare()');
  const share=section(ltd,'function sheetShare()','function sheetCorrect()');
  const correct=section(ltd,'function sheetCorrect()','function sheetRemove()');
  const remove=section(ltd,'function sheetRemove()','function syncSheetButton(');
  const statutory=section(ltd,'function sheetStatutory()','function newRequestId(');
  const rti=section(ltd,'function sheetRti()','function accountingPeriod()');
  const bank=section(ltd,'function sheetBank()','function bankEventAmount(');
  const bankDelete=section(ltd,'function sheetBankDelete()','function requestClose(');

  for(const source of [discard,income,movement,scenario,salary,dividend,dividendPayment,share,correct,remove,statutory,rti,bank,bankDelete]){
    assert.match(source,/showClose:false/);
  }
  assert.match(ltd,/title:t\('ct_review\.title'\), showClose:idx>0/);

  const expense=section(ltd,'function sheetExpense()','function allocSum(');
  assert.match(expense,/title:t\('money\.add_expense'\), showClose:false/);
  assert.equal((expense.match(/showClose:false/g)||[]).length,1,'later expense steps keep their only immediate close control');

  const bankMatch=section(ltd,'function sheetBankMatch()','function bankEventAmount(');
  assert.match(bankMatch,/if\(!rec\)[^\n]*showClose:false/);
  assert.doesNotMatch(bankMatch,/return sheet\(\{ title:t\('bank\.match_title'\), showClose:false/);
});

test('Web billing overlap shows every live provider management route and blocks another plan',()=>{
  const state=section(app,'function billingProviderConflictState()','let LTD_ACCESS_RUNTIME_WARNING');
  assert.match(state,/TaxMateEntitlement\.billingProviderConflict\(ENTITLEMENT\.snapshot,Date\.now\(\)\)/);
  const conflict=section(app,'function billingProviderConflictCard()','function proPlansCard()');
  assert.match(conflict,/billingProviderConflictState\(\)/);
  assert.match(conflict,/state\.providers\.map/);
  assert.match(conflict,/data-billing-provider-manage/);
  assert.match(conflict,/openBillingProvider\('\$\{item\.provider\}'\)/);
  const plan=section(app,'function planBlock(','function tierTick(');
  assert.match(plan,/billingConflict\.active&&tier!=='free'/);
  assert.match(plan,/billing\.conflictBlocked/);
  assert.match(actions,/'openBillingProvider'/);
  for(const locale of ['en','zh','pl','ro','es','ur'])for(const key of ['billing.conflictTitle','billing.conflictBody','billing.manageStripeAction','billing.managePlayAction','billing.manageAppStoreAction'])assert.match(app,new RegExp(`Object\\.assign\\(I18N\\.${locale},\\{[^\\n]*'${key.replace('.','\\.')}'`),`${locale} ${key}`);
});
