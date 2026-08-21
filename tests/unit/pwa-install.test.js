const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../../src/core/pwa-install');

const now=Date.UTC(2026,7,21,12);
const active={businesses:[{id:'b1'}],entries:[]};

test('Home promotion requires meaningful bookkeeping data and a real install path',()=>{
  assert.equal(P.canPromote({state:{businesses:[],entries:[]},now,hasDeferredPrompt:true}),false);
  assert.equal(P.canPromote({state:active,now,hasDeferredPrompt:true}),true);
  assert.equal(P.canPromote({state:{businesses:[],entries:[{kind:'income'}]},now,isIOSSafari:true}),true);
  assert.equal(P.canPromote({state:active,now}),false);
});

test('Not now suppresses promotion for exactly fourteen days',()=>{
  const dismissedAt=now-1;
  assert.equal(P.canPromote({state:active,now,dismissedAt,hasDeferredPrompt:true}),false);
  assert.equal(P.canPromote({state:active,now:dismissedAt+P.DISMISSAL_WINDOW_MS-1,dismissedAt,hasDeferredPrompt:true}),false);
  assert.equal(P.canPromote({state:active,now:dismissedAt+P.DISMISSAL_WINDOW_MS,dismissedAt,hasDeferredPrompt:true}),true);
});

test('all installed signals hide promotion and proactive prompt is one-time',()=>{
  for(const signal of [{displayModeStandalone:true},{navigatorStandalone:true},{persistedInstalled:true}]){
    assert.equal(P.canPromote({state:active,now,hasDeferredPrompt:true,...signal}),false);
  }
  assert.equal(P.canPromptProactively({state:active,now,hasDeferredPrompt:true,proactiveShown:false}),true);
  assert.equal(P.canPromptProactively({state:active,now,hasDeferredPrompt:true,proactiveShown:true}),false);
});
