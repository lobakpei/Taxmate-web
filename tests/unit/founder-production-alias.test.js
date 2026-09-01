'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const Lookup=require('../../functions/companies-house-lookup');

class TestHttpsError extends Error{
  constructor(code,message,details){super(message);this.code=code;this.details=details;}
}

const founder={uid:'founder-test-uid',token:{email:'founder@example.test',email_verified:true,firebase:{sign_in_provider:'google.com'}}};
const sha=value=>crypto.createHash('sha256').update(value,'utf8').digest('hex'),founderHashes={uidSha256:sha(founder.uid),emailSha256:sha(founder.token.email)};
const ordinary={uid:'ordinary-test-uid',token:{email:'ordinary@example.test',email_verified:true,firebase:{sign_in_provider:'google.com'}}};

function harness(overrides={}){
  const calls={authenticate:0,tier:[],apiKey:0,fetch:[],logs:[]};
  const handler=Lookup.createHandler({
    HttpsError:TestHttpsError,
    authenticate:req=>{calls.authenticate++;if(!req.auth)throw new TestHttpsError('unauthenticated','Sign in required',{reason:'auth-required'});return req.auth;},
    requireTier:async(uid,tier)=>{calls.tier.push({uid,tier});},
    apiKey:()=>{calls.apiKey++;return'companies-house-test-key';},
    fetchImpl:async(...args)=>{calls.fetch.push(args);return{ok:true,status:200,json:async()=>({company_name:'ORDINARY COMPANY LTD',date_of_creation:'2024-01-02',company_status:'active',type:'ltd'})};},
    expectedFounderUidSha256:founderHashes.uidSha256,
    expectedFounderEmailSha256:founderHashes.emailSha256,
    requiredFounderClientVersion:'2.1.13',
    diagnosticLog:(message,value)=>calls.logs.push({message,value}),
    ...overrides
  });
  return{handler,calls};
}

test('production Founder identity requires the exact signed UID, verified email and Google provider',()=>{
  assert.equal(Lookup.isFounderIdentity(founder,founderHashes),true);
  for(const changed of [
    {...founder,uid:'wrong'},
    {...founder,token:{...founder.token,email:'other@example.test'}},
    {...founder,token:{...founder.token,email_verified:false}},
    {...founder,token:{...founder.token,firebase:{sign_in_provider:'password'}}},
    {uid:founder.uid,token:{}}
  ])assert.equal(Lookup.isFounderIdentity(changed,founderHashes),false);
  assert.match(Lookup.FOUNDER_UID_SHA256,/^[a-f0-9]{64}$/);assert.match(Lookup.FOUNDER_EMAIL_SHA256,/^[a-f0-9]{64}$/);
});

test('exact Founder alias returns only the fixture and performs zero Companies House operations',async()=>{
  const {handler,calls}=harness(),result=await handler({auth:founder,data:{companyNumber:' LOBAKPE1 ',clientVersion:'2.1.13'}});
  assert.deepEqual(result.company,Lookup.FOUNDER_COMPANY);
  assert.equal(result.status,'found');
  assert.equal(result.previewFixture,true);
  assert.deepEqual(calls.tier,[{uid:founder.uid,tier:'pro'}]);
  assert.equal(calls.authenticate,0);
  assert.equal(calls.apiKey,0);
  assert.equal(calls.fetch.length,0);
});

test('ordinary, unverified, non-Google and unauthenticated identities receive the ordinary invalid-number result with zero provider access',async()=>{
  for(const auth of [ordinary,null,{...founder,token:{...founder.token,email_verified:false}},{...founder,token:{...founder.token,firebase:{sign_in_provider:'password'}}}]){
    const {handler,calls}=harness();
    await assert.rejects(()=>handler({auth,data:{companyNumber:'lobakpe1',clientVersion:'2.1.13'}}),error=>error.code==='invalid-argument'&&error.details.reason==='company_number_format');
    assert.deepEqual(calls.tier,[]);
    assert.equal(calls.authenticate,0);
    assert.equal(calls.apiKey,0);
    assert.equal(calls.fetch.length,0);
  }
});

test('Founder alias diagnostics distinguish identity, provider, tier and client version without identity values',async()=>{
  const cases=[
    {auth:{...founder,uid:'wrong'},data:{companyNumber:'lobakpe1',clientVersion:'2.1.13'},code:'FOUNDER_ALIAS_UID_MISMATCH'},
    {auth:{...founder,token:{...founder.token,email_verified:false}},data:{companyNumber:'lobakpe1',clientVersion:'2.1.13'},code:'FOUNDER_ALIAS_EMAIL_VERIFICATION'},
    {auth:{...founder,token:{...founder.token,firebase:{sign_in_provider:'password'}}},data:{companyNumber:'lobakpe1',clientVersion:'2.1.13'},code:'FOUNDER_ALIAS_PROVIDER'},
    {auth:founder,data:{companyNumber:'lobakpe1',clientVersion:'2.1.12'},code:'FOUNDER_ALIAS_CLIENT_VERSION'}
  ];
  for(const item of cases){const {handler,calls}=harness();await assert.rejects(()=>handler({auth:item.auth,data:item.data}));assert.equal(calls.logs[0].value.safeCode,item.code);const encoded=JSON.stringify(calls.logs);assert.equal(encoded.includes(founder.uid),false);assert.equal(encoded.includes(founder.token.email),false);}
  const tier=harness({requireTier:async()=>{throw new TestHttpsError('permission-denied','Pro required',{reason:'tier-required'});}});await assert.rejects(()=>tier.handler({auth:founder,data:{companyNumber:'lobakpe1',clientVersion:'2.1.13'}}));assert.equal(tier.calls.logs[0].value.safeCode,'FOUNDER_ALIAS_TIER');
});

test('ordinary company-number lookup keeps the existing authenticated Pro provider path',async()=>{
  const {handler,calls}=harness(),result=await handler({auth:ordinary,data:{companyNumber:' 11111111 '}});
  assert.equal(result.company.number,'11111111');
  assert.equal(result.company.name,'ORDINARY COMPANY LTD');
  assert.equal(calls.authenticate,1);
  assert.deepEqual(calls.tier,[{uid:ordinary.uid,tier:'pro'}]);
  assert.equal(calls.apiKey,1);
  assert.equal(calls.fetch.length,1);
  assert.match(calls.fetch[0][0],/\/company\/11111111$/);
});
