'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');
const renderer=read('src/ui/ltd/workbench-renderer.js');
const app=read('src/app/app.js');
const css=read('src/ui/ltd/workbench.css');
const browser=read('tests/browser/ltd-actual-app.e2e.js');
const authBrowser=read('tests/browser/onboarding-connected.e2e.js');

test('LTD text, money, percentage, date and company-number fields declare the intended keyboard semantics',()=>{
  assert.match(renderer,/kind=o\.kind\|\|'text'/);
  assert.match(renderer,/inputmode:o\.inputmode\|\|\(kind==='text'\?'text':'decimal'\)/);
  assert.match(renderer,/function dateField[\s\S]*type:'text',[\s\S]*inputmode:'numeric'/);
  assert.match(renderer,/if\(isoV\)\{ e\.target\.value=isoToDisplay\(isoV\); setField\(scope,fid,isoV\)/);
  assert.match(renderer,/fid:'companyNumber'[\s\S]{0,300}type:'text',inputmode:'text'/);
  for(const evidence of ['company number accepts actual letters and digits','text field accepts spaces and punctuation','percentage field accepts minus and decimal','money field accepts minus and decimal'])assert.ok(browser.includes(evidence),evidence);
});

test('sole-owner edit visibly allocates the remaining percentage and blocks an incomplete total',()=>{
  const ownership=renderer.slice(renderer.indexOf('function screenOwnership()'),renderer.indexOf('function screenWorkingPack()'));
  assert.match(ownership,/fid:'other_name'.*t\('s3\.other_name'\)/);
  assert.match(ownership,/fid:'other_pct'.*t\('s3\.other_ownership'\)/);
  assert.match(ownership,/100-amount/);
  assert.match(ownership,/if\(draft\.total!==100\)localErrors\.ownership=t\('error\.ownership_total'/);
  assert.match(ownership,/function normalizedDraft\(\)/);
  assert.match(ownership,/onOk:function\(\)\{clearScope\(sid\);toast/);
  assert.match(browser,/ownership-100-to-51-saved\.png/);
  assert.match(browser,/backupShares:\[4900,5100\]|backupShares/);
});

test('auth keeps onboarding mounted until callback takeover and collapses repeated taps',()=>{
  const signIn=app.slice(app.indexOf('async function signIn('),app.indexOf('function restoreLocalViewAfterSignInCancel('));
  assert.match(signIn,/captureLocalPendingIntent\(\);let associationPrepared=false/);
  assert.doesNotMatch(signIn,/closeOnboardingSurface\(\{clearState:true\}\)/);
  assert.match(app,/if\(!OB\|\|OB\._signingInFlow\)return;[\s\S]{0,120}OB\._signingInFlow=true;obRender\(\)/);
  assert.match(app,/OB&&OB\._signingInFlow\?'disabled':''/);
  assert.match(authBrowser,/for\(let index=0;index<users\.length;index\+\+\)/);
  assert.match(authBrowser,/equal\(facts\.popupCalls,1/);
});

test('Tax salary actions use the established spaced mobile control group',()=>{
  assert.match(renderer,/nodes\.push\(h\('div',\{class:'tm-record-actions'\},\[\s*btn\(t\('tax\.record_salary'/);
  assert.match(css,/\.tm-record-actions\{[^}]*margin-top:12px/);
  assert.match(css,/\.tm-record-actions \.tm-btn\{min-height:44px\}/);
  assert.match(css,/@media \(max-width:420px\)[\s\S]*\.tm-record-actions\{gap:10px;margin-top:10px\}/);
  assert.match(browser,/for\(const theme of \['light','dark'\]\)for\(const width of \[360,390,412\]\)/);
});

test('Home omits duplicate home-working education while Assistant retains it',()=>{
  const homeTip=app.slice(app.indexOf('function topContextTip()'),app.indexOf('function activeLtdProfile('));
  const assistant=app.slice(app.indexOf('function tipsCard('));
  assert.doesNotMatch(homeTip,/home_working|tip\.home_t|tip\.home_b/);
  assert.match(assistant,/home_working/);
  assert.match(assistant,/tip\.home_t/);
});
