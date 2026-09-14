'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Profile=require('../../src/core/company-profile');
const Structural=require('../../src/integration/ltd/company-structural-state');
const {CanonicalCompanyDriver,DEFAULT_NOW}=require('../../src/integration/ltd/CanonicalCompanyDriver');
const {TaxMateLtdUIFacade}=require('../../src/integration/ltd/TaxMateLtdUIFacade');
const {make,PRO_ENTITLEMENT}=require('../test-fixture');

const renderer=fs.readFileSync('src/ui/ltd/workbench-renderer.js','utf8');
const facade=fs.readFileSync('src/integration/ltd/TaxMateLtdUIFacade.js','utf8');
const css=fs.readFileSync('src/ui/direction-a.css','utf8');
const copy=JSON.parse(fs.readFileSync('src/integration/ltd/approved-copy.json','utf8'));

test('approved LTD setup keeps canonical actions behind the simplified Step 4 and Step 5 UI',()=>{
  const stepShell=renderer.slice(renderer.indexOf('function stepShell'),renderer.indexOf('function step1'));
  const step1=renderer.slice(renderer.indexOf('function step1()'),renderer.indexOf('function lookupState'));
  const discard=renderer.slice(renderer.indexOf('function discardSheet'),renderer.indexOf('function taxYearLabel'));
  const step4=renderer.slice(renderer.indexOf('function step4()'),renderer.indexOf('function setupAnswer'));
  const step5=renderer.slice(renderer.indexOf('function step5()'),renderer.indexOf('function reviewReasonLine'));
  assert.match(stepShell,/captureSetupInputs\(\);run\('onDismissRequested',\{reason:'cancel'\},\{\}\)/);
  assert.match(stepShell,/tm-setup-brand-header[\s\S]*webLogo\('setup'\)[\s\S]*setupYear/);
  assert.doesNotMatch(stepShell,/setupExit[\s\S]*?onSaveCompanyDraft/);
  assert.doesNotMatch(step1,/onSaveCompanyDraft|s3\.save_draft/);
  assert.match(discard,/setup\.keep_exit[\s\S]*onSaveCompanyDraft/);
  assert.match(discard,/setup\.remove_draft[\s\S]*onDiscardCompanySetup/);
  assert.match(discard,/setup\.continue_setup[\s\S]*onDiscardCancelled/);
  assert.match(step4,/if\(idx>0\)\{ UI\.checkIdx=idx-1; paint\(\); \} else \{ UI\.checkIdx=null; run\('onBack'/);
  assert.match(step4,/disabled:!\['true','false','not_sure'\]\.includes\(cur\)/);
  assert.equal((step4.match(/t\('common\.back'\)/g)||[]).length,0);
  assert.match(step5,/setupReviewTable\(t\('records\.company_details'\),companyRows,'company'\)/);
  assert.match(step5,/setupReviewTable\(t\('s5\.other_company_details'\),otherRows,'circumstances'\)/);
  assert.match(step5,/blockingReasons=\(elig\.reasons\|\|\[\]\)\.filter\(function\(reason\)\{return reason!==\'question_confirmation_required\';\}\)/);
  assert.match(step5,/canStart=elig\.allowed\|\|blockingReasons\.length===0/);
  assert.match(step5,/disabled:!canStart/);
  assert.match(step5,/blocked\?t\('s5\.blocked_title'\):t\('s5\.ready_title'\)/);
  assert.doesNotMatch(step5,/disabled:!elig\.allowed/);
  assert.match(step5,/submitStep\(5,sid,\{confirmed:true\}\)/);
  assert.doesNotMatch(step5,/s5\.review_answers|s5\.learn_more|tm-step5-confirm/);
  assert.doesNotMatch(step5,/DEMO0001|simulated identity|D\.state|localStorage/);
});

test('Step 5 derives Q6 and ownership from canonical saved values without false defaults',()=>{
  assert.match(renderer,/prof\.activityType==='service_digital'\?true:prof\.activityType==='not_service_digital'\?false:prof\.activityType==='not_sure'\?'not_sure':null/);
  assert.match(renderer,/holderPercent==null\?t\('common\.review'\):holderPercent\+'%'/);
  assert.match(renderer,/Number\.isFinite\(holder\.ownershipBasisPoints\)/);
  const setupOwnership=renderer.slice(renderer.indexOf('function setupOwnershipPercent'),renderer.indexOf('function setupReviewTable'));
  assert.doesNotMatch(setupOwnership,/\.shares|reduce\(|\/total/);
  assert.match(renderer,/shareholders\.filter\(function\(sh\)\{return sh!==holder;\}\)\.forEach/);
  assert.match(renderer,/percent==null\?t\('common\.review'\):percent\+'%'/);
});

test('information dialog and overview styling stay narrowly scoped to the LTD root',()=>{
  assert.match(css,/#taxmate-ltd-ui-root \.tm-info-dialog-scrim\{[^}]*align-items:center[^}]*rgba\(15,22,32,\.32\)[^}]*backdrop-filter:none/);
  assert.match(css,/#taxmate-ltd-ui-root \.tm-info-dialog\{[^}]*max-height:min\(82dvh,620px\)[^}]*border-radius:20px[^}]*overflow:hidden/);
  assert.match(css,/#taxmate-ltd-ui-root \.tm-summary-sheet \.tm-overview-hero\{[^}]*background:transparent[^}]*border:0/);
  assert.match(css,/#taxmate-ltd-ui-root \.tm-summary-sheet>\.tm-top\{[^}]*min-height:calc\(64px \+ env\(safe-area-inset-top\)\)[^}]*padding-top:calc\(12px \+ env\(safe-area-inset-top\)\)/);
  assert.doesNotMatch(css,/html\[data-direction-a="true"\] \.tm-scrim\{align-items:center/);
  assert.match(renderer,/UI\.infoReturnFocusId=ov\.returnFocusId\|\|id/);
  assert.match(renderer,/infoOverlay\?'info:'\+infoOverlay\.id/);
  assert.match(renderer,/querySelectorAll\('\[data-info\]'\)[\s\S]*infoFocus\.focus\(\{preventScroll:true\}\)/);
  assert.match(renderer,/showHandle:false,showClose:false,closeOnScrim:false/);
  assert.doesNotMatch(renderer,/dialogClass:'tm-info-dialog'[^\n]*kick:t\('info\.what'\)/);
  assert.match(css,/@media \(min-width:1024px\)[\s\S]*\.tm-workspace-shell>\.main>\.tm-col>\.tm-tabs\{display:none\}/);
  assert.match(css,/@media \(min-width:1024px\)\{[\s\S]*#taxmate-ltd-ui-root \.tm-app\{padding:0\}/);
  assert.match(css,/@media \(min-width:1024px\)[\s\S]*\.tm-summary-sheet>\.tm-top,[\s\S]*\.tm-company-return\{display:none\}/);
});

test('new approved copy is complete for every supported locale',()=>{
  const locales=['en','zh-HK','pl','ro','es','ur'];
  const keys=['common.start','info.back_to_question','setup.save_leave','setup.continue_setup','setup.changed','setup.uncertain','s1.identity_question','s1.identity_needs_checking','s1.identity_info','s1.registration_unknown_notice','s2.trading_unknown_notice','s3.ownership_unknown_notice','pending.registration_review_title','pending.registration_review_body','trading_review.title','trading_review.body','ownership_review.title','ownership_review.body','s5.company_activity','s5.role_ownership','s5.ct_added','s5.other_company_details','s5.blocked_title','s5.blocked_body','reason.activity_profile','reason.identity_confirmation','reason.trading_status'];
  for(const locale of locales){
    for(const key of keys) assert.equal(typeof copy.canonical[locale][key],'string',`${locale} ${key}`);
    assert.ok(copy.canonical[locale]['setup.changed'].includes(copy.canonical[locale]['setup.save_leave']),`${locale} changed-state recovery names the visible exit control`);
    assert.ok(copy.canonical[locale]['setup.uncertain'].includes(copy.canonical[locale]['setup.save_leave']),`${locale} uncertain-state recovery names the visible exit control`);
  }
  assert.equal(copy.canonical.en['setup.save_leave'],'Leave setup');
  assert.equal(copy.canonical['zh-HK']['setup.save_leave'],'離開設定');
});

test('unsupported Step 4 activity answers stay blocked with truthful, actionable Step 5 copy',()=>{
  const step5=renderer.slice(renderer.indexOf('function step5()'),renderer.indexOf('function reviewReasonLine'));
  const reasons=renderer.slice(renderer.indexOf('function reviewReasonLine'),renderer.indexOf('function screenRegistrationPending'));
  assert.match(step5,/notice\(draft\?'ok':'warn', null, draft\?t\('s5\.draft_body'\):t\('s5\.blocked_body'\)\)/);
  assert.doesNotMatch(step5,/notice\(draft\?'ok':'warn', draft\?t\('s5\.draft_title'\):t\('s5\.blocked_title'\)/);
  assert.match(reasons,/ordinary_service_or_digital_company_required':'reason\.activity_profile'/);
  assert.match(step5,/run\('onFixCompanyFact',\{reasonCode:rc\}/);
  assert.notEqual(copy.canonical.en['s5.blocked_title'],copy.canonical.en['s5.ready_title']);
  assert.doesNotMatch(copy.canonical.en['s5.blocked_body'],/can start|ready to start/i);
  assert.match(step5,/taxGate\.status==='review_required'/);
  assert.match(step5,/taxGate\.reasons&&taxGate\.reasons\.length\?taxGate\.reasons/);
});

test('draft resume accepts only actionable setup screens, never terminal review screens',()=>{
  assert.match(facade,/savedRank<=canonicalRank/);
  assert.match(facade,/route==='ltd\.onboarding\.registration-details'\?1:null/);
  assert.doesNotMatch(facade,/result\.nextRoute=saved\.resumeScreen;return result/);
});

test('registration review and Step 1 each expose one setup exit path',()=>{
  const pending=renderer.slice(renderer.indexOf('function screenRegistrationPending'),renderer.indexOf('function screenDirectorReview'));
  const step1=renderer.slice(renderer.indexOf('function step1()'),renderer.indexOf('function lookupState'));
  assert.doesNotMatch(pending,/onSaveCompanyDraft|s3\.save_draft/);assert.equal((step1.match(/onSaveCompanyDraft/g)||[]).length,0);
  assert.match(pending,/notice\('warn',null,t\(unknown\?'pending\.registration_review_body':'pending\.body'\)\)/);
  assert.match(renderer,/persistDraft\(sid,'identityDetailsConfirmed','select-one',''\)/);
  assert.match(facade,/identityDetailsConfirmed'[\s\S]*input\.field\.value!==['"]yes['"]/);
});

test('guard and terminal review screens rely on the shared header controls without duplicate titles or save exits',()=>{
  const step2=renderer.slice(renderer.indexOf('function step2()'),renderer.indexOf('function step3()'));
  const director=renderer.slice(renderer.indexOf('function screenDirectorReview'),renderer.indexOf('function screenTradingReview'));
  const trading=renderer.slice(renderer.indexOf('function screenTradingReview'),renderer.indexOf('function screenOwnershipReview'));
  const ownership=renderer.slice(renderer.indexOf('function screenOwnershipReview'),renderer.indexOf('function reasonText'));
  assert.doesNotMatch(step2,/onSaveCompanyDraft|s3\.save_draft/);
  for(const screen of [director,trading,ownership]){
    assert.doesNotMatch(screen,/common\.back_to_setup|run\('onBack'|s3\.save_draft|onSaveCompanyDraft/);
    assert.match(screen,/notice\('warn',\s*null,/);
  }
});

const clone=value=>JSON.parse(JSON.stringify(value));
function fresh(storage=Structural.memoryStorage(),options={}){
  const driver=new CanonicalCompanyDriver({mode:'fresh',state:clone(make('fresh').driver.state),now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT,...options});
  return{driver,storage,facade:new TaxMateLtdUIFacade({driver,storage,draftKey:'approved-setup-truth'})};
}
async function begin(f){await f.facade.onAddBusinessCategoryChosen({category:'limited_company'});}
const identity={step:1,values:{registrationAnswer:'yes',companyNumberStatus:'provided',identityDetailsConfirmed:true,companyNumber:'00000000',legalName:'Approved Flow Ltd',incorporationDate:'2025-12-15'}};

test('Step 1 requires explicit identity confirmation and preserves No and Not sure as different canonical answers',async()=>{
  const missing=fresh();await begin(missing);const blocked=await missing.facade.onContinueStep({...identity,values:{...identity.values,identityDetailsConfirmed:false}});
  assert.equal(blocked.status,'field_error');assert.ok(blocked.fieldErrors.some(error=>error.field==='identityDetailsConfirmed'));
  for(const answer of ['no','not_sure']){
    const f=fresh();await begin(f);const result=await f.facade.onContinueStep({step:1,values:{registrationAnswer:answer,legalName:'Future Company'}});
    assert.equal(result.status,'review_required');assert.equal(result.nextRoute,'ltd.onboarding.registration-pending');
    assert.equal(f.driver.activeProfile().setupAnswers.registrationAnswer,answer);assert.equal(f.driver.activeProfile().lifecycleStatus,'draft');
  }
});

test('identity edits clear canonical confirmation durably and a stale saved Step 4 cannot skip the required Step 1',async()=>{
  const f=fresh();await begin(f);assert.equal((await f.facade.onContinueStep(identity)).status,'ok');
  assert.equal(f.driver.activeProfile().setupAnswers.identityDetailsConfirmed,true);
  await f.facade.onDraftChanged({screenId:'ltd.onboarding.step1',field:{id:'identityDetailsConfirmed',type:'select-one',value:''}});
  assert.equal(f.driver.activeProfile().setupAnswers.identityDetailsConfirmed,false);
  f.facade.drafts.saveSetup({schemaVersion:1,companyId:f.driver.activeProfile().entityId,resumeScreen:'ltd.onboarding.step4',pending:null});
  const reloadedDriver=new CanonicalCompanyDriver({mode:'fresh',state:f.driver.repository.load(),now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT});
  const reloaded=new TaxMateLtdUIFacade({driver:reloadedDriver,storage:f.storage,draftKey:'approved-setup-truth'});
  const resumed=await reloaded.onResumeCompanyDraft();assert.equal(resumed.nextRoute,'ltd.onboarding.registration-details');
  assert.equal(reloaded.getSnapshot().company.setupAnswers.identityDetailsConfirmed,false);
  await reloaded.onDraftChanged({screenId:'ltd.onboarding.step1',field:{id:'identityDetailsConfirmed',type:'select-one',value:'not_sure'}});
  assert.equal(reloadedDriver.activeProfile().setupAnswers.identityDetailsConfirmed,false);
});

test('a Companies House lookup for another company clears identity confirmation at the canonical and facade boundaries',async()=>{
  const companiesHouseProvider={isNetworkProvider:false,async lookup(companyNumber){return{status:'found',verificationStatus:'verified',retryable:false,reasonCodes:[],company:{number:companyNumber,name:'Approved Flow Ltd',incorporationDate:'2025-12-15',status:'active',type:'ltd',registryUrl:null}};}};
  const direct=fresh(undefined,{companiesHouseProvider});await begin(direct);await direct.facade.onContinueStep(identity);
  await direct.facade.onContinueStep({step:2,values:{tradingAnswer:'no',tradingStatus:'not_started',corporationTaxStatus:'not_registered'}});
  await direct.facade.onContinueStep({step:3,values:{founderName:'Founder',directorAnswer:'yes',soleShareholderAnswer:'yes',founderShares:100,otherShares:0}});
  await direct.facade.onContinueStep({step:4,values:{ordinaryServiceDigital:true,riskAnswers:{groupStructure:false,associatedCompanies:false,propertyOrInvestment:false,inventoryOrStock:false,fullVat:false}}});
  await direct.driver.lookupCompany({companyNumber:'00000000'});
  assert.equal(direct.driver.activeProfile().setupAnswers.identityDetailsConfirmed,true,'same-company recheck may retain the exact confirmation');
  await direct.driver.lookupCompany({companyNumber:'00000001'});
  assert.equal(direct.driver.activeProfile().setupAnswers.identityDetailsConfirmed,false,'different-company direct lookup fails closed');
  assert.equal(direct.driver.activeProfile().setupAnswers.tradingAnswer,undefined);assert.equal(direct.driver.activeProfile().setupAnswers.directorAnswer,undefined);assert.equal(direct.driver.activeProfile().setupAnswers.soleShareholderAnswer,undefined);
  assert.equal(direct.driver.activeProfile().tradingStatus,undefined);assert.deepEqual(direct.driver.activeProfile().shareholders,[]);assert.deepEqual(direct.driver.activeProfile().riskAnswers,{});
  const reloaded=new CanonicalCompanyDriver({mode:'fresh',state:direct.driver.repository.load(),now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT,companiesHouseProvider});
  assert.equal(reloaded.activeProfile().setupAnswers.identityDetailsConfirmed,false,'different-company invalidation survives repository reload');

  const throughFacade=fresh(undefined,{companiesHouseProvider});await begin(throughFacade);await throughFacade.facade.onContinueStep(identity);
  await throughFacade.facade.onDraftChanged({screenId:'ltd.onboarding.step1',field:{id:'identityDetailsConfirmed',type:'select-one',value:'yes'}});
  await throughFacade.facade.onLookupCompaniesHouse({companyNumber:'00000001'});
  assert.equal(throughFacade.driver.activeProfile().setupAnswers.identityDetailsConfirmed,false);
  assert.equal(throughFacade.facade.drafts.get('ltd.onboarding.step1').fields.find(field=>field.id==='identityDetailsConfirmed').value,'','facade draft cannot revive stale confirmation');
});

test('a different-number lookup cannot reopen or mutate a confirmed company',async()=>{
  const companiesHouseProvider={isNetworkProvider:false,async lookup(companyNumber){return{status:'found',verificationStatus:'verified',retryable:false,reasonCodes:[],company:{number:companyNumber,name:'Approved Flow Ltd',incorporationDate:'2025-12-15',status:'active',type:'ltd',registryUrl:null}};}};
  const active=fresh(undefined,{companiesHouseProvider});await begin(active);await active.facade.onContinueStep(identity);
  await active.facade.onContinueStep({step:2,values:{tradingAnswer:'no',tradingStatus:'not_started',corporationTaxStatus:'not_registered'}});
  await active.facade.onContinueStep({step:3,values:{founderName:'Founder',directorAnswer:'yes',soleShareholderAnswer:'yes',founderShares:100,otherShares:0}});
  await active.facade.onContinueStep({step:4,values:{ordinaryServiceDigital:true,riskAnswers:{groupStructure:false,associatedCompanies:false,propertyOrInvestment:false,inventoryOrStock:false,fullVat:false}}});
  await active.facade.onContinueStep({step:5,values:{confirmed:true}});assert.equal(active.driver.activeProfile().lifecycleStatus,'confirmed');
  const same=await active.driver.lookupCompany({companyNumber:'00000000'});assert.equal(same.status,'ok');assert.equal(active.driver.activeProfile().setupAnswers.identityDetailsConfirmed,true);
  const before=clone(active.driver.state),blocked=await active.driver.lookupCompany({companyNumber:'00000001'});
  assert.equal(blocked.status,'review_required');assert.deepEqual(blocked.reviewReasons,['identity_change_requires_company_edit']);assert.equal(blocked.nextRoute,'ltd.records.company-edit');assert.equal(blocked.data.noWrite,true);
  assert.deepEqual(active.driver.state,before,'alternate lookup leaves confirmed profile and live books unchanged');
  const reloaded=new CanonicalCompanyDriver({mode:'existing',state:active.driver.repository.load(),now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT,companiesHouseProvider});
  assert.equal(reloaded.activeProfile().lifecycleStatus,'confirmed');assert.equal(reloaded.activeProfile().setupAnswers.identityDetailsConfirmed,true);assert.deepEqual(reloaded.state,before);
});

test('Step 5 ordinary-service review action returns to the exact Step 4 question',async()=>{
  const f=fresh();await begin(f);f.facade.route('ltd.onboarding.step5');
  const result=await f.facade.onFixCompanyFact({reasonCode:'ordinary_service_or_digital_company_required'});
  assert.equal(result.status,'ok');assert.equal(result.nextRoute,'ltd.onboarding.step4');
  assert.equal(f.facade.getSnapshot().navigation.routes.at(-1).screenId,'ltd.onboarding.step4');
});

test('Step 2 and Step 3 unknown answers survive reload without inventing dates or ownership',async()=>{
  const trading=fresh();await begin(trading);await trading.facade.onContinueStep(identity);
  const held=await trading.facade.onContinueStep({step:2,values:{tradingAnswer:'not_sure'}});
  assert.equal(held.nextRoute,'ltd.onboarding.trading-review');assert.equal(trading.driver.activeProfile().setupAnswers.tradingAnswer,'not_sure');
  assert.equal(trading.driver.activeProfile().tradingStatus,undefined);assert.equal(trading.driver.activeProfile().accountingPeriod,undefined);

  const ownership=fresh();await begin(ownership);await ownership.facade.onContinueStep(identity);
  await ownership.facade.onContinueStep({step:2,values:{tradingAnswer:'no',tradingStatus:'not_started',corporationTaxStatus:'not_registered'}});
  const result=await ownership.facade.onContinueStep({step:3,values:{founderName:'Founder',directorAnswer:'yes',soleShareholderAnswer:'not_sure'}});
  assert.equal(result.nextRoute,'ltd.onboarding.ownership-review');let profile=ownership.driver.activeProfile();
  assert.equal(profile.setupAnswers.directorAnswer,'yes');assert.equal(profile.setupAnswers.soleShareholderAnswer,'not_sure');assert.deepEqual(profile.shareholders,[]);
  const reload=new CanonicalCompanyDriver({mode:'fresh',state:ownership.driver.repository.load(),now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT});profile=reload.activeProfile();
  assert.equal(Profile.setupAnswersFor(profile).directorAnswer,'yes');assert.equal(Profile.setupAnswersFor(profile).soleShareholderAnswer,'not_sure');assert.equal(reload.resumeRoute(profile),'ltd.onboarding.step3');
});

test('Step 3 rejects ownership that does not total 100 and Step 1 identity changes clear all downstream answers',async()=>{
  const f=fresh();await begin(f);await f.facade.onContinueStep(identity);await f.facade.onContinueStep({step:2,values:{tradingAnswer:'no',tradingStatus:'not_started',corporationTaxStatus:'not_registered'}});
  const bad=await f.facade.onContinueStep({step:3,values:{founderName:'Founder',directorAnswer:'yes',soleShareholderAnswer:'no',founderShares:60,otherShareholderName:'Other',otherShares:20}});
  assert.equal(bad.status,'field_error');assert.ok(bad.fieldErrors.some(error=>error.reasonCode==='share_ownership_total_required'));
  await f.facade.onContinueStep({step:3,values:{founderName:'Founder',directorAnswer:'yes',soleShareholderAnswer:'no',founderShares:51,otherShareholderName:'Other',otherShares:49}});
  await f.facade.onContinueStep({step:4,values:{ordinaryServiceDigital:true,riskAnswers:{groupStructure:false,associatedCompanies:false,propertyOrInvestment:false,inventoryOrStock:false,fullVat:false}}});
  const changed=await f.facade.onContinueStep({step:1,values:{...identity.values,companyNumber:'00000001',legalName:'Different Company Ltd'}});assert.equal(changed.status,'ok');
  const profile=f.driver.activeProfile();assert.equal(profile.setupAnswers.tradingAnswer,undefined);assert.equal(profile.setupAnswers.directorAnswer,undefined);assert.equal(profile.setupAnswers.soleShareholderAnswer,undefined);
  assert.equal(profile.tradingStatus,undefined);assert.deepEqual(profile.shareholders,[]);assert.deepEqual(profile.riskAnswers,{});assert.equal(f.driver.resumeRoute(profile),'ltd.onboarding.step2');
});

test('legacy confirmed setup answers are derived for reads without mutating current-schema profiles',()=>{
  const profile=clone(make('existing').driver.activeProfile());delete profile.setupAnswers;const before=clone(profile),normalized=Profile.normalize(profile);
  assert.deepEqual(Profile.normalize(normalized),normalized);const beforeRead=clone(normalized),setup=Profile.setupAnswersFor(normalized);
  assert.equal(setup.registrationAnswer,'yes');assert.equal(setup.identityDetailsConfirmed,true);assert.deepEqual(normalized,beforeRead);assert.deepEqual(profile,before);
});
