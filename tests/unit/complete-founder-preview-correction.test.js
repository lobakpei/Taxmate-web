'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('src/app/app.js','utf8');
const actions=fs.readFileSync('src/app/action-dispatch.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const renderer=fs.readFileSync('src/ui/ltd/workbench-renderer.js','utf8');
const review=fs.readFileSync('tests/browser/onboarding-connected.e2e.js','utf8');

test('personal onboarding uses an explicit lexical-state action and durable draft contract',()=>{
  assert.match(app,/data-tm-input="obSetBizName\(this\.value\)"/);
  assert.match(app,/function obSetBizName\(value\)[\s\S]*OB\.bizName=String\(value\|\|''\)/);
  assert.match(app,/function obContinueBusiness\(\)[\s\S]*OB\._bizError=t\('ob\.bizRequired'\)/);
  assert.match(app,/const OB_DRAFT_KEY='taxmateuk_onboarding_draft_v1'/);
  assert.match(app,/function obRestoreDraft\(\)/);
  assert.doesNotMatch(actions,/\(EN\|OB\)/);
  assert.doesNotMatch(actions,/window\[m\[1\]\]/);
  assert.doesNotMatch(app,/data-tm-input="OB\./);
});

test('Home Hero reconciles from the same canonical ledger rows as Money and business rows',()=>{
  assert.match(app,/function homeLedgerSnapshot\(yr,bizId=null,period=null\)/);
  assert.match(app,/const ledger=homeLedgerSnapshot\(S\.year\)/);
  assert.match(app,/data-home-ledger-profit>\$\{fmt\(ledger\.profit\)\}/);
  assert.match(app,/const qP=homeLedgerSnapshot\(S\.year,null,qr\)\.profit/);
  assert.match(app,/function bizFigures\(b,yr\)\{\s*return homeLedgerSnapshot\(yr,b\.id\)/);
});

test('Settings has exactly three semantic plan render calls and one shared Pro availability source',()=>{
  const plans=app.match(/function proPlansCard\(\)\{[\s\S]*?\n\}/)[0];
  assert.equal((plans.match(/planBlock\('free'\)/g)||[]).length,1);
  assert.equal((plans.match(/planBlock\('plus'\)/g)||[]).length,1);
  assert.equal((plans.match(/planBlock\('pro'\)/g)||[]).length,1);
  assert.doesNotMatch(plans,/t\('pro\.title'\)/);
  assert.match(app,/data-plan-card="\$\{tier\}"/);
  assert.match(app,/function proBillingAvailability\(\)/);
  assert.match(app,/const availability=proBillingAvailability\(\)/);
  assert.match(app,/startProPurchase\('settings'\)/);
  assert.match(app,/startProPurchase\('onboarding'\)/);
});

test('production Pro checkout remains fail-closed while localhost review is separately injected',()=>{
  assert.match(app,/return Object\.freeze\(\{mode:'unavailable',purchaseEnabled:false\}\)/);
  assert.match(review,/window\.TaxMateLocalBillingReview=Object\.freeze\(\{enabled:true/);
  assert.match(review,/\/__review\/purchase/);
  assert.match(review,/provider:'localhost_review'/);
  assert.doesNotMatch(app,/TaxMateLocalBillingReview\s*=\s*Object/);
});

test('Companies House review-required states do not emit a conflicting unavailable toast',()=>{
  assert.match(renderer,/onReview:function\(\)\{paint\(\);\}/);
  assert.doesNotMatch(renderer,/onReview:function\(\)\{toast\(t\('s1\.lookup_unavailable'\)\)/);
});

test('onboarding accessibility uses a dark action ink, 44px targets and localized RTL pricing',()=>{
  assert.match(html,/--brand-action-ink:#10231B/);
  assert.match(html,/#ob-root \.ob-btn\{[^}]*min-height:48px[^}]*color:var\(--brand-action-ink\)/s);
  assert.match(html,/\.ob-back\{[^}]*min-width:44px;min-height:44px/s);
  assert.match(html,/\.ob-seg button\{[^}]*min-height:44px/s);
  assert.match(app,/Object\.assign\(I18N\.ur,\{[\s\S]*'billing\.cadenceAria':'بلنگ کی مدت'/);
  assert.match(app,/<bdi class="current" dir="ltr">£9\.99\/month<\/bdi>/);
  assert.match(app,/function obSetLang\(l\)\{ S\.settings\.lang=l; save\(\); applyStaticI18n\(\);/);
  assert.match(app,/function syncStatusMessage\(current=syncStatus\(\)\)/);
});

test('review reset is fail-closed and full/fresh Pro modes keep local and emulator anchors coherent',()=>{
  assert.match(review,/if\(!response\.ok\)throw new Error\('Local review reset failed: '/);
  assert.match(review,/proFresh:\{email:'founder-pro-fresh@taxmate-review\.local'/);
  assert.match(review,/if\(mode==='pro'\)await seedFullReviewDataset\(user\)/);
  assert.match(review,/await seedLtdCloud\(user,state\)/);
  assert.match(review,/ltdControl\/activeCompany/);
});
