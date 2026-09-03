'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Provider=require('../../src/integration/ltd/companies-house-provider');

const enabled={hostname:'127.0.0.1',firebaseProjectId:'demo-taxmate',firebaseEmulators:true,previewMode:'ltd-founder-preview'};

test('Founder shortcut alias gate requires loopback, demo Firebase emulators and explicit mode together',()=>{
  assert.equal(Provider.founderShortcutAllowed(enabled),true);
  for(const context of [
    {...enabled,hostname:'www.taxmate.uk'},
    {...enabled,firebaseProjectId:'taxmate-uk-2'},
    {...enabled,firebaseEmulators:false},
    {...enabled,previewMode:''}
  ])assert.equal(Provider.founderShortcutAllowed(context),false,JSON.stringify(context));
});

test('enabled alias returns the manual company shortcut and makes zero fallback provider calls',async()=>{
  let calls=0;const fallback={isNetworkProvider:true,async lookup(){calls++;return{status:'not_found'};}},provider=Provider.createFounderShortcutProvider(fallback,enabled);
  assert.equal(provider.acceptsAlias(' LOBAKPE1 '),true);
  const result=await provider.lookup('lobakpe1');
  assert.equal(calls,0);
  assert.equal(result.founderShortcut,true);
  assert.equal(result.previewFixture,undefined);
  assert.deepEqual(result.company,Provider.FOUNDER_SHORTCUT_COMPANY);
  assert.equal(result.company.number,null);
  assert.equal(result.company.name,'LOBAKPE FOUNDER PREVIEW LTD');
  assert.equal(result.company.incorporationDate,'2025-12-15');
  assert.equal(result.company.registryUrl,null);
});

test('disabled alias is rejected without fallback provider call',async()=>{
  let calls=0;const provider=Provider.createFounderShortcutProvider({isNetworkProvider:true,async lookup(){calls++;return{status:'found'};}},{...enabled,hostname:'www.taxmate.uk'});
  assert.equal(provider.acceptsAlias('lobakpe1'),false);
  assert.deepEqual(await provider.lookup('lobakpe1'),{status:'field_error',retryable:false,reasonCode:'company_number_format'});
  assert.equal(calls,0);
});

test('formal-domain alias is forwarded only to the callable and maps server rejection to the ordinary field error',async()=>{
  let calls=0;const callable=Provider.createCallableProvider(async input=>{calls++;assert.deepEqual(input,{companyNumber:'lobakpe1'});throw{details:{reason:'company_number_format',retryable:false}};}),provider=Provider.createFounderShortcutProvider(callable,{...enabled,hostname:'www.taxmate.uk',firebaseProjectId:'taxmate-uk-2',firebaseEmulators:false,previewMode:''});
  assert.equal(provider.acceptsAlias('lobakpe1'),true);
  assert.deepEqual(await provider.lookup('lobakpe1'),{status:'field_error',retryable:false,reasonCode:'company_number_format'});
  assert.equal(calls,1);
});

test('ordinary company numbers still delegate to the existing provider',async()=>{
  let calls=0;const provider=Provider.createFounderShortcutProvider({isNetworkProvider:true,async lookup(number){calls++;return{status:'not_found',number};}},enabled);
  assert.equal((await provider.lookup('11111111')).status,'not_found');
  assert.equal(calls,1);
});
