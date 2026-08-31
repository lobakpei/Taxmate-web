'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Assistant=require('../../src/core/assistant');

const app=fs.readFileSync('src/app/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const actions=fs.readFileSync('src/app/action-dispatch.js','utf8');
const browser=fs.readFileSync('tests/browser/onboarding-connected.e2e.js','utf8');

function base(){return{businesses:[{id:'b1',name:'Review trade',structure:'sole'}],entries:[
  {id:'required',bizId:'b1',kind:'expense',date:'2026-08-19',amount:0,cat:'other'},
  {id:'income-date',bizId:'b1',kind:'income',date:'2026-08-20',dateTBC:true,amount:120,cat:'sales'},
  {id:'expense-date',bizId:'b1',kind:'expense',date:'2026-08-21',dateTBC:true,amount:45,cat:'travel'},
  {id:'receipt',bizId:'b1',kind:'expense',date:'2026-08-22',amount:18,cat:'other'}
],domain:{companyProfiles:[{id:'company-profile:c1',entityId:'c1',legalName:'Review Ltd',lifecycleStatus:'draft',deletedAt:null}]}};}

test('Assistant derives canonical action, decision and reminder categories without duplicate date tasks',()=>{
  const tasks=Assistant.deriveTasks({state:base(),taxYear:'2026-27',assistantState:Assistant.emptyState(),receiptReminders:true});
  assert.deepEqual(tasks.map(task=>task.category),['action_required','action_required','needs_decision','needs_decision','helpful_reminder']);
  assert.equal(tasks.find(task=>task.id==='entry-required:required').dismissible,false);
  assert.equal(tasks.some(task=>task.id==='entry-date:required'),false);
  assert.deepEqual(tasks.find(task=>task.id==='receipt:2026-27:b1').entryIds,['expense-date','receipt','required']);
});

test('exact-date decisions and receipt visibility are durable semantic state scoped by year and business',()=>{
  const state=base(),assistant={schemaVersion:1,decisions:{'entry-date:income-date':'keep_estimated_date'},hiddenReminders:{'receipt:2026-27:b1':true}};
  let tasks=Assistant.deriveTasks({state,taxYear:'2026-27',assistantState:assistant,receiptReminders:true});
  assert.equal(tasks.some(task=>task.id==='entry-date:income-date'),false);
  assert.equal(Assistant.hiddenTasks(tasks).map(task=>task.id).join(','),'receipt:2026-27:b1');
  tasks=Assistant.deriveTasks({state,taxYear:'2025-26',assistantState:assistant,receiptReminders:true});
  assert.equal(tasks.length,1,'the unfinished Ltd task remains global while entry/reminder tasks stay in the selected year');
});

test('Home implements mutually exclusive personal and Ltd-only Heroes and removes quarterly copy',()=>{
  const pageHome=app.match(/function pageHome\(\)\{[\s\S]*?\/\* ═+ INCOME \/ EXPENSES lists/)[0];
  assert.match(pageHome,/hasPersonal\?personalHero:\(ltdProfile\?ltdHomeHero\(ltdProfile\):''\)/);
  assert.match(pageHome,/data-home-personal-hero/);
  assert.match(app,/data-home-ltd-only-hero/);
  assert.match(pageHome,/hasPersonal\?`<div class="homecta">/);
  assert.doesNotMatch(pageHome,/quarterRange|home\.qLabel|Q[1-4]/);
  assert.match(pageHome,/const tx = calcTax\(S\.year\);\s*const personal=tx\.personalPortfolio/);
});

test('Assistant actions use real entry, receipt and Ltd paths with guarded dismissal and confirmation',()=>{
  assert.match(app,/function assistantDismiss\(encoded\)\{const task=assistantTask\(encoded\);if\(!task\|\|task\.category!=='helpful_reminder'\|\|task\.dismissible!==true\)return/);
  assert.match(app,/openEntry\(entry\.kind,entry\.id\)/);
  assert.match(app,/RCB\.bizId=task\.businessId;RCB\.cat='all';RCB\.month='all';go\('receipts'\)/);
  assert.match(app,/TaxMateLtdUIFacade\.onRemoveCompany\(\{confirmed:true\}\)/);
  assert.match(app,/confirmAction\(t\('assistant\.removeLtdTitle'\),t\('assistant\.removeLtdBody'\)/);
  for(const name of ['assistantOpen','assistantToggleHidden','assistantOpenTask','assistantKeepEstimated','assistantDismiss','assistantRestore','assistantRemoveLtd'])assert.match(actions,new RegExp(`'${name}'`));
});

test('Assistant decisions reuse versioned yearData and the existing durable personal-state sync contract',()=>{
  assert.match(app,/S\.yearData\[S\.year\]\.assistant=state;save\(\)/);
  assert.match(app,/\['yearData','yearData:'\]/);
  assert.match(app,/yearData:S\.yearData\|\|\{\}/);
  assert.match(app,/enqueueSyncOperation\(\{kind:'personal-state'/);
  assert.match(html,/src\/core\/assistant\.js/);
  assert.match(sw,/['"]\/src\/core\/assistant\.js['"]/);
});

test('all six locales carry explicit Home and Assistant copy without an English fallback contract',()=>{
  const translations=app.slice(0,app.indexOf('let ASSISTANT_SHOW_HIDDEN'));
  for(const key of ['home.selfProfit','home.ltdHeroTitle','assistant.title','assistant.actionRequired','assistant.keepEstimated','assistant.removeLtd']){const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');assert.equal((translations.match(new RegExp(`'${escaped}':`,'g'))||[]).length,6,key);}
  assert.doesNotMatch(app,/assistant\.[A-Za-z]+[^\n]*\|\|\s*I18N\.en/);
});

test('Founder browser coverage includes resettable modes, real deep links, sync durability and 200 percent zoom',()=>{
  for(const mode of ['sole','mixed','ltdOnly','assistant'])assert.match(browser,new RegExp(`${mode}:\\{email:`));
  assert.match(browser,/Assistant Home count derives five visible canonical tasks/);
  assert.match(browser,/date deep-link opens the exact canonical entry/);
  assert.match(browser,/Assistant dismissal did not reach canonical synced yearData/);
  assert.match(browser,/unfinished Ltd removal requires explicit confirmation/);
  assert.match(browser,/200% browser-zoom equivalent CSS viewport/);
});
