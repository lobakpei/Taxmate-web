'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const Lookup=require('../../functions/companies-house-lookup');

class TestHttpsError extends Error{
  constructor(code,message,details){super(message);this.code=code;this.details=details;}
}

const founder={uid:'founder-test-uid',token:{email:'founder@example.test',email_verified:true,firebase:{sign_in_provider:'google.com'}}};
const founderHash=crypto.createHash('sha256').update(`${founder.uid}\n${founder.token.email}`,'utf8').digest('hex');
const ordinary={uid:'ordinary-test-uid',token:{email:'ordinary@example.test',email_verified:true,firebase:{sign_in_provider:'google.com'}}};

function harness(overrides={}){
  const calls={authenticate:0,tier:[],apiKey:0,fetch:[]};
  const handler=Lookup.createHandler({
    HttpsError:TestHttpsError,
    authenticate:req=>{calls.authenticate++;if(!req.auth)throw new TestHttpsError('unauthenticated','Sign in required',{reason:'auth-required'});return req.auth;},
    requireTier:async(uid,tier)=>{calls.tier.push({uid,tier});},
    apiKey:()=>{calls.apiKey++;return'companies-house-test-key';},
    fetchImpl:async(...args)=>{calls.fetch.push(args);return{ok:true,status:200,json:async()=>({company_name:'ORDINARY COMPANY LTD',date_of_creation:'2024-01-02',company_status:'active',type:'ltd'})};},
    expectedFounderIdentitySha256:founderHash,
    ...overrides
  });
  return{handler,calls};
}

test('production Founder identity requires the exact signed UID, verified email and Google provider',()=>{
  assert.equal(Lookup.isFounderIdentity(founder,founderHash),true);
  for(const changed of [
    {...founder,uid:'wrong'},
    {...founder,token:{...founder.token,email:'other@example.test'}},
    {...founder,token:{...founder.token,email_verified:false}},
    {...founder,token:{...founder.token,firebase:{sign_in_provider:'password'}}},
    {uid:founder.uid,token:{}}
  ])assert.equal(Lookup.isFounderIdentity(changed,founderHash),false);
  assert.match(Lookup.FOUNDER_IDENTITY_SHA256,/^[a-f0-9]{64}$/);
});

test('exact Founder alias returns only the fixture and performs zero Companies House operations',async()=>{
  const {handler,calls}=harness(),result=await handler({auth:founder,data:{companyNumber:' LOBAKPE1 '}});
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
    await assert.rejects(()=>handler({auth,data:{companyNumber:'lobakpe1'}}),error=>error.code==='invalid-argument'&&error.details.reason==='company_number_format');
    assert.deepEqual(calls.tier,[]);
    assert.equal(calls.authenticate,0);
    assert.equal(calls.apiKey,0);
    assert.equal(calls.fetch.length,0);
  }
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
