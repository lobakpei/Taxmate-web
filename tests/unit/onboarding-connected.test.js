'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('src/app/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const adapter=fs.readFileSync('src/integration/ltd/TaxMateLtdProductionAdapter.js','utf8');
const css=fs.readFileSync('src/ui/ltd/workbench.css','utf8');
const functions=fs.readFileSync('functions/index.js','utf8');

test('entry uses the existing TaxMate onboarding hierarchy with three connected choices and a low-weight dashboard link',()=>{
  assert.match(html,/#ob-root h1\{font-size:25px;font-weight:800;letter-spacing:-\.6px;[^}]*color:var\(--ink\)/);
  assert.match(app,/data-tm-click="obGo\('biz'\)"[\s\S]*ob\.together/);
  assert.match(app,/data-tm-click="obGo\('ltd-choice'\)"[\s\S]*ob\.ltdEntry/);
  assert.match(app,/data-tm-click="obStartPartnerSync\(\)"[\s\S]*ob\.partnerEntry/);
  assert.match(app,/class="ob-link muted" data-tm-click="obExplore\(\)"/);
  assert.doesNotMatch(app,/Prototype only|The real app would/i);
});

test('Ltd pending intent survives authentication and waits for canonical entitlement hydration',()=>{
  assert.match(app,/obSetPendingIntent\('ltd',\{ltdChoice:'existing',companyNumberStatus:'provided'/);
  assert.match(app,/obSetPendingIntent\('ltd',\{ltdChoice:'forming',companyNumberStatus/);
  assert.match(app,/if\(!user\)\{OB\._authReturnScreen=OB\.pendingIntent\.returnScreen\|\|OB\.screen;obGo\('login'\);return;\}/);
  assert.match(app,/await startUserSync\(user\)/);
  assert.match(app,/if\(currentTier\(\)!=='pro'\)\{OB\.screen='pro-gate'/);
  assert.match(app,/TaxMateLtdProductionAdapter\.openNewLimitedCompany\(\{companyNumberStatus:intent\.companyNumberStatus\}\)/);
  assert.match(adapter,/f\.onAddBusinessCategoryChosen\(\{category:'limited_company'\}\)/);
  assert.match(adapter,/f\.onDraftChanged\(\{screenId:'ltd\.onboarding\.step1',field:\{id:'companyNumberStatus'/);
  assert.match(app,/function pendingIntentForHydration\(\)[\s\S]*AUTH_PENDING_INTENT[\s\S]*OB\.pendingIntent=existing;/);
  assert.match(app,/if\(existing\.source==='partner_sync'\)OB\.connectCode=normalisePartnerCode\(existing\.formState&&existing\.formState\.partnerCode\|\|existing\.partnerCode\|\|''\)\.slice\(0,8\);OB\.loggedIn=true;OB\.screen='intent-loading'/);
  assert.match(app,/if\(pendingIntentForHydration\(\)\)\{\s*TaxMateOnboardingRoot\.open\(document\);OB\._signingInFlow=false;OB\.loggedIn=true;ACCOUNT_UI_READY=\{state:'pending-intent'/);
  assert.match(app,/obResumePendingIntentAfterHydration\(result\)/);
  assert.match(app,/if\(OB\)\{TaxMateOnboardingRoot\.open\(document\);obRender\(\);\}/);
});

test('Partner Sync stores only code intent and writes membership only after explicit confirmation',()=>{
  const confirm=app.match(/async function obConfirmPartnerConnection\(\)\{[\s\S]*?\n\}/)[0];
  const codeScreen=app.match(/function obScrPartnerCode\(\)\{[\s\S]*?\n\}/)[0];
  const confirmation=app.match(/function obScrPartnerConfirm\(\)\{[\s\S]*?\n\}/)[0];
  assert.match(app,/obSetPendingIntent\('partner_sync',\{partnerCode:code/);
  assert.doesNotMatch(codeScreen,/joinPartnershipByCode|callSecureFunction\('joinPartnership'/);
  assert.doesNotMatch(confirmation,/inviter|share|previewPartnershipInvitation/i);
  assert.match(confirm,/await joinPartnershipByCode\(code\)/);
  assert.match(app,/if\(PARTNER_JOIN_IN_FLIGHT&&PARTNER_JOIN_IN_FLIGHT\.code===code\)return PARTNER_JOIN_IN_FLIGHT\.promise/);
  assert.match(functions,/exports\.joinPartnership=onCall\(baseOpts[\s\S]*await requireTier\(user\.uid,'pro'\)[\s\S]*collection\('members'\)\.doc\(user\.uid\)\.set/);
  assert.doesNotMatch(functions,/previewPartnershipInvitation/);
});

test('a completed UID-scoped onboarding marker routes an empty returning account to Home',()=>{
  assert.match(app,/localStorage\.setItem\(accountSlotKey\('onboarding-done'\),'explore'\)/);
  assert.match(app,/function onboardingDoneFlag\(\)[\s\S]*accountSlotKey\('onboarding-done'\)/);
  const hydration=app.slice(app.indexOf('async function applyHydratedAccountResult'),app.indexOf('function consumeBillingReturn'));
  assert.match(hydration,/result\.existingCloudAccount\|\|TaxMateAccountStorage\.stateHasAccountData\(S\)\|\|onboardingDoneFlag\(\)/);
  assert.ok(hydration.indexOf('onboardingDoneFlag()')<hydration.indexOf("OB.screen='entry'"));
});

test('Partner invite sharing preserves the existing manual-code Connected Onboarding contract',()=>{
  const invite=fs.readFileSync('src/core/partner-invite.js','utf8');
  assert.match(invite,/PRODUCTION_ORIGIN = 'https:\/\/www\.taxmate\.uk\/'/);
  assert.doesNotMatch(invite,/FRAGMENT_KEY|codeFromHash|URLSearchParams|location\.hash/);
  assert.doesNotMatch(app,/PARTNER_INVITE_DRAFT_KEY|PARTNER_INVITE_BOOT_CODE|startPartnerInviteOnboarding|capturePartnerInviteLaunch|storePartnerInviteCode|clearPartnerInviteCode/);
  assert.match(app,/function obStartPartnerSync\(\)\{if\(!OB\)return;OB\._intentError='';OB\.pendingIntent=null;obGo\('partner-code'\);\}/);
  assert.match(app,/function obSetConnectCode\(value\)/);
  assert.match(app,/function obPartnerContinue\(\)[\s\S]*obSetPendingIntent\('partner_sync',\{partnerCode:code/);
  assert.match(app,/const nativePayload=\{title:payload\.title,text:payload\.text,url:payload\.url\}/);
  assert.match(app,/navigator\.share\(nativePayload\)/);
  assert.doesNotMatch(app,/#partner-invite=|partner-invite=CONNECT8/);
  assert.doesNotMatch(invite,/inviter|sharePercent|membership|uid|token/i);
  assert.doesNotMatch(functions,/previewPartnershipInvitation/);
});

test('shared Pro gate uses the canonical promotion backend and approved pricing formatter',()=>{
  const proGate=app.match(/function obScrProGate\(\)\{[\s\S]*?\n\}/)[0];
  assert.match(app,/const PRO_PRICE_CONTRACT = Object\.freeze\(\{currency:'GBP',monthly:Object\.freeze\(\{launchMinor:999,standardMinor:1199\}\),annual:Object\.freeze\(\{amountMinor:9999\}\)\}\)/);
  assert.match(app,/const accessible=t\('billing\.monthlyAria'\)/);
  assert.match(app,/<s><bdi dir="ltr">£11\.99<\/bdi><\/s> <bdi class="current" dir="ltr">£9\.99\/month<\/bdi>/);
  assert.match(app,/£99\.99\/year/);
  assert.equal((app.match(/await redeemPromotionThroughCanonicalBackend\(code\)/g)||[]).length,2);
  assert.match(app,/const result=await callSecureFunction\('redeemPromotion',\{code:normalized\}\);\s*await loadEntitlementFromCloud\(user\.uid\)/);
  assert.match(app,/if\(currentTier\(\)!=='pro'\)\{OB\._promoError=t\('ob\.promoNoPro'\)/);
  assert.match(app,/function obProUpgrade\(\)\{if\(!OB\)return;startProPurchase\('onboarding'\);\}/);
  assert.match(app,/function proBillingAvailability\(\)/);
  assert.match(app,/provider&&provider\.enabled===true&&typeof provider\.purchasePro==='function'/);
  assert.doesNotMatch(proGate,/free.month|savings|grandfather|previous.price/i);
});

test('dark and light record rows use theme-safe ink while negative values remain coral',()=>{
  assert.match(css,/\.tm-rec\{[^}]*color:var\(--ink\)/s);
  assert.match(css,/\.tm-rec \.rv\{[^}]*color:var\(--ink\)/s);
  assert.match(css,/\.tm-rec \.rv\.neg\{color:var\(--coral\)\}/);
  assert.doesNotMatch(css,/\.tm-rec(?: \.rv)?\{[^}]*color:(?:#000|black)/i);
});

test('focused CTA and Ltd Step 5 fixes keep green action text white and separate confirmation',()=>{
  assert.match(html,/\.welcome-add-business\{color:#fff\}/);
  assert.match(app,/class="btn welcome-add-business"/);
  assert.match(css,/\.tm-btn\.p\{background:var\(--brand\); color:#fff\}/);
  assert.match(css,/\[data-theme="dark"\] \.tm-btn\.p\{color:#fff\}/);
  assert.match(css,/\.tm-step5-confirm\{margin-top:18px\}/);
  assert.match(fs.readFileSync('src/ui/ltd/workbench-renderer.js','utf8'),/class:'tm-step5-confirm'/);
});

test('review identity is coherent and production schemas/providers stay outside the change contract',()=>{
  const versions=require('../../src/core/versions').VERSIONS;
  assert.deepEqual({version:versions.APP_VERSION,build:versions.BUILD_ID,cache:versions.PWA_CACHE_VERSION},{version:'2.1.18',build:'2026-09-03.ltd-focused-hotfix-candidate.1',cache:'taxmate-v2-ltd-focused-hotfix-candidate-1'});
  assert.doesNotMatch(app,/previewPartnershipInvitation|entitlement\s*=\s*['"]pro['"]/);
});
