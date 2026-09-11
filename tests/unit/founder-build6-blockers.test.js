'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const AccountStorage=require('../../src/core/account-storage.js');

const app=fs.readFileSync('src/app/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');

function memoryStorage(){
  const values=new Map();
  return {
    get length(){return values.size;},
    key(index){return [...values.keys()][index]??null;},
    getItem(key){return values.has(key)?values.get(key):null;},
    setItem(key,value){values.set(String(key),String(value));},
    removeItem(key){values.delete(String(key));}
  };
}

test('onboarding language changes persist in a lightweight account slot without a synchronous app save',()=>{
  const setter=app.slice(app.indexOf('function setLanguagePreference'),app.indexOf('function locale'));
  const onboardingSetter=app.match(/function obSetLang\(l\)\{[^\n]+/)[0];
  assert.match(setter,/accountSlotKey\('language-preference'\)/);
  assert.doesNotMatch(setter,/save\(|scheduleCloudPush|showNotice|openSheet/);
  assert.doesNotMatch(onboardingSetter,/save\(|scheduleCloudPush/);
  assert.match(onboardingSetter,/OB\._langOpen=false;obRender\(\)/);
  assert.match(app,/applyStoredLanguagePreference\(\);\s*const fns=/);
});

test('a pre-sign-in language choice follows the explicitly associated account',()=>{
  const storage=memoryStorage(),local=AccountStorage.localScope(),account=AccountStorage.firebaseScope('founder-language-test');
  AccountStorage.write(storage,local,'language-preference','zh');
  AccountStorage.prepareLocalAssociation(storage,{now:1});
  AccountStorage.classifyLocalAssociation(storage,account,'empty',{now:2});
  const result=AccountStorage.associateLocal(storage,account,{now:3});
  assert.equal(result.status,'associated');
  assert.ok(result.copiedSlots.includes('language-preference'));
  assert.equal(AccountStorage.read(storage,account,'language-preference'),'zh');
  assert.equal(AccountStorage.read(storage,local,'language-preference'),null);
});

test('Settings exposes a distinct full-tour entry and replay exit without clearing completion',()=>{
  assert.match(app,/data-getting-started="full-tour"[\s\S]*data-tm-click="obRestartFullTour\(\)"/);
  assert.match(app,/function obRestartFullTour\(\)\{startOnboarding\(\{mode:'replay'\}\);\}/);
  assert.match(app,/if\(replay\)\{OB\.screen='entry';OB\._replay=true/);
  assert.match(app,/root\.dataset\.onboardingMode=replay\?'full-tour':'first-run'/);
  assert.match(app,/r\.dataset\.onboardingMode='catch-up'/);
  assert.match(app,/function obExitReplay\(\)[\s\S]*S\.tab='home';render\(\)/);
  assert.match(app,/if\(OB&&OB\._replay\)\{obExitReplay\(\);return;\}/);
  assert.match(app,/if\(!OB\|\|!OB\._replay\)try\{ localStorage\.setItem\(accountSlotKey\('onboarding-done'\),'1'\)/);
  assert.match(app,/if\(OB&&!OB\._replay\)try\{localStorage\.setItem\(accountSlotKey\('onboarding-done'\),'partner-sync'\)/);
  assert.match(app,/S\.obReview = OB&&OB\._replay\?Array\.from\(new Set/);
  assert.match(app,/'set\.gettingStarted':'Getting started'/);
  assert.match(app,/'set\.gettingStarted':'重新開始新手導覽'/);
  assert.match(html,/\.ob-tour-exit\{/);
});

test('the first operable Web frame emits an explicit native startup signal',()=>{
  assert.match(app,/function signalFirstOperableFrame\(\)/);
  assert.match(app,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);
  assert.match(app,/dataset\.taxmateFirstFrame='ready'/);
  assert.match(app,/new CustomEvent\('taxmate:first-frame-ready'\)/);
  assert.match(app,/obPersistDraft\(\);\s*signalFirstOperableFrame\(\)/);
});
