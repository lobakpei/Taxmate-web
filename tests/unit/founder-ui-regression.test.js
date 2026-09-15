'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const app=read('src/app/app.js');
const billing=read('src/app/billing-ui.js');
const direction=read('src/ui/direction-a.css');
const workbench=read('src/ui/ltd/workbench.css');
const ltd=read('src/ui/ltd/workbench-renderer.js');
const section=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end));

test('every billing page and sheet relies on the single App-header logo',()=>{
  assert.match(html,/header-brand-lockup web-brand-home/);
  assert.doesNotMatch(section(billing,'function billingSheet(','function pageBilling('),/taxmateFlowBrand\(/);
  assert.doesNotMatch(section(billing,'function pageBilling()','function billingPlansPage()'),/taxmateFlowBrand\(/);
  assert.match(billing,/billing-sheet-content/);
  assert.match(billing,/billing-page-content/);
});

test('affected adjacent actions are explicitly spaced or intentionally joined',()=>{
  assert.match(billing,/class="btn billing-action/);
  assert.match(billing,/billing-card-actions/);
  assert.match(direction,/\.billing-card-actions\{[^}]*gap:10px/);
  assert.match(app,/class="ob-gate-actions"/);
  assert.match(html,/\.ob-gate-actions\{[^}]*gap:10px/);
  assert.match(html,/\.ob-foot \.ob-wrap\{[^}]*gap:10px/);
  assert.match(ltd,/class:'tm-rec tm-todo-more'/);
  assert.match(workbench,/\.tm-todo-more\{margin-top:10px\}/);
});

test('all in-App accordions reserve a fixed right control column',()=>{
  const rule=html.match(/#legal-content \.content-accordion summary\{[^}]+\}/)?.[0]||'';
  assert.match(rule,/display:grid/);
  assert.match(rule,/grid-template-columns:minmax\(0,1fr\) 24px/);
  assert.match(html,/#legal-content \.content-accordion summary::after\{[^}]*justify-self:end/);
});

test('HMRC position has four centred amount prefixes and four collapsed help entries',()=>{
  const sheet=section(html,'<!-- HMRC position sheet -->','<!-- custom category sheet -->');
  assert.equal((sheet.match(/class="amt amount-input"/g)||[]).length,4);
  assert.equal((sheet.match(/<details class="field-info">/g)||[]).length,4);
  assert.equal((sheet.match(/<div class="fhint" data-i18n="a\.(?:poa|prior|outside|property)Info"/g)||[]).length,4);
  assert.match(html,/\.amount-input \.cur\{[^}]*display:grid;place-items:center/);
});

test('role-labelled personal zero values retain income, expense and tax colours',()=>{
  const helper=section(app,'const moneyCls =','const esc =');
  assert.match(helper,/if\(role==='in'\) return 'pos'/);
  assert.match(helper,/if\(role==='out'\) return 'neg'/);
  assert.doesNotMatch(helper,/if\(n===0\) return ''/);
});

test('retention detail and Pro-gate secondary actions start in deliberate groups',()=>{
  const retention=section(app,'function retentionStatusCard()','function openBillingProvider(');
  assert.match(retention,/<details class="retention-card-details">/);
  assert.match(retention,/data-retention-paid/);
  assert.match(retention,/data-retention-kept/);
  assert.match(retention,/data-retention-cleanup/);
  const gate=section(app,'function obScrProGate()','function obReturnFromProGate()');
  assert.match(gate,/ob-gate-cadence/);
  assert.match(gate,/ob-gate-plans/);
  assert.match(gate,/ob-gate-status/);
  assert.match(gate,/ob-gate-actions/);
  assert.match(app,/Promotion codes still\\u00a0work\./);
});

test('welcome plan entry stays inside the continuous hero and LTD info dialogs use the shared spacing frame',()=>{
  const welcome=section(app,'function welcome()','/* TaxMate Assistant');
  assert.ok(welcome.indexOf('<div class="hero">')<welcome.indexOf('${proBanner()}'));
  assert.ok(welcome.indexOf('${proBanner()}')<welcome.indexOf('</div>\n  <div class="notice green">'));
  assert.match(direction,/\.welcome-plan-banner\{[^}]*background:var\(--navy2\)/);
  assert.match(workbench,/\.tm-info-dialog \.tm-dialog-head\{padding:20px 20px 6px\}/);
  assert.match(direction,/#taxmate-ltd-ui-root \.tm-info-dialog \.tm-sbody\{padding:6px 20px 20px\}/);
});
