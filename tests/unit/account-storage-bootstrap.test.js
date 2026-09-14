'use strict';

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Bootstrap=require('../../functions/account-storage-bootstrap');

const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const merge=(left,right)=>{const out=clone(left)||{};for(const [key,value]of Object.entries(right||{}))out[key]=value&&typeof value==='object'&&!Array.isArray(value)?merge(out[key]&&typeof out[key]==='object'?out[key]:{},value):clone(value);return out;};
class FakeDb{
  constructor(rows={}){this.rows=new Map(Object.entries(rows).map(([key,value])=>[key,clone(value)]));this.version=0;this.beforeCommit=null;}
  doc(path){return{path};}
  replace(path,value){this.rows.set(path,clone(value));this.version++;}
  async runTransaction(handler){
    for(let attempt=0;attempt<3;attempt++){
      const version=this.version,writes=[],tx={get:async ref=>{const data=this.rows.get(ref.path);return{exists:data!==undefined,data:()=>clone(data)};},set:(ref,data,options)=>writes.push({path:ref.path,data:clone(data),merge:options?.merge===true})};
      const result=await handler(tx);
      if(this.beforeCommit){const hook=this.beforeCommit;this.beforeCommit=null;await hook(this);}
      if(version!==this.version)continue;
      for(const write of writes)this.rows.set(write.path,write.merge?merge(this.rows.get(write.path),write.data):clone(write.data));this.version++;return result;
    }
    throw new Error('transaction_retry_exhausted');
  }
}

test('missing entitlement becomes a minimal Free record with ready Storage mirrors',async()=>{
  const db=new FakeDb(),result=await Bootstrap.bootstrap({db,uid:'fresh-user'}),row=db.rows.get('users/fresh-user/entitlements/current');
  assert.deepEqual(result,{status:'ready',created:true,accountResetEpoch:0,retentionEpoch:0});
  assert.deepEqual(row,{paidTier:'free',subscriptionStatus:'inactive',currentPeriodEnd:0,accountResetStatus:'complete',accountResetEpoch:0,accountResetEpochString:'0',accountRetention:{controlStatus:'complete',lastRetentionEpoch:0,lastRetentionEpochString:'0',activeRetentionEpoch:null}});
});

test('post-deletion bootstrap mirrors the completed reset epoch and does not manufacture paid access',async()=>{
  const db=new FakeDb({'accountResets/returning-user':{status:'complete',resetEpoch:4,correlationId:'finished-deletion'}}),result=await Bootstrap.bootstrap({db,uid:'returning-user'}),row=db.rows.get('users/returning-user/entitlements/current');
  assert.equal(result.created,true);assert.equal(row.accountResetEpoch,4);assert.equal(row.accountResetEpochString,'4');assert.equal(row.paidTier,'free');assert.equal(row.subscriptionStatus,'inactive');assert.equal(row.currentPeriodEnd,0);
  for(const paidField of ['paidAccess','googlePlayAccess','appStoreAccess','promotions','promotionAccess'])assert.equal(Object.hasOwn(row,paidField),false,paidField);
});

test('existing billing truth is preserved while only lifecycle mirrors are repaired',async()=>{
  const paid={paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:9999999999999,paidAccess:{proExpiresAt:9999999999999},googlePlayAccess:{status:'expired',tokenHash:'play-hash'},appStoreAccess:{status:'expired',transactionHash:'apple-hash'},promotions:{FOUNDER:{tier:'pro',permanent:true}},billingConflict:{provider:'stripe'},accountRetention:{customAudit:'keep',lastRetentionEpoch:1,controlStatus:'complete',lastRetentionEpochString:'1'}};
  const db=new FakeDb({'accountResets/paid-user':{status:'complete',resetEpoch:7},'users/paid-user/retention/current':{status:'complete_with_warnings',epoch:2},'users/paid-user/entitlements/current':paid}),before=clone(paid);
  const result=await Bootstrap.bootstrap({db,uid:'paid-user'}),row=db.rows.get('users/paid-user/entitlements/current');
  assert.equal(result.created,false);for(const field of ['paidTier','subscriptionStatus','currentPeriodEnd','paidAccess','googlePlayAccess','appStoreAccess','promotions','billingConflict'])assert.deepEqual(row[field],before[field],field);
  assert.equal(row.accountResetStatus,'complete');assert.equal(row.accountResetEpoch,7);assert.equal(row.accountRetention.controlStatus,'complete_with_warnings');assert.equal(row.accountRetention.lastRetentionEpoch,2);assert.equal(row.accountRetention.customAudit,'keep');
});

test('non-ready reset or retention states fail closed without creating an entitlement',async()=>{
  for(const status of ['billing_quarantined','deleting','failed']){
    const uid=`reset-${status}`,db=new FakeDb({[`accountResets/${uid}`]:{status,resetEpoch:3}});
    await assert.rejects(()=>Bootstrap.bootstrap({db,uid}),error=>error instanceof Bootstrap.AccountStorageBootstrapError&&error.reason==='account_reset_processing');assert.equal(db.rows.has(`users/${uid}/entitlements/current`),false);
  }
  for(const status of ['purging','failed']){
    const uid=`retention-${status}`,db=new FakeDb({[`users/${uid}/retention/current`]:{status,epoch:2}});
    await assert.rejects(()=>Bootstrap.bootstrap({db,uid}),error=>error instanceof Bootstrap.AccountStorageBootstrapError&&error.reason==='retention_processing');assert.equal(db.rows.has(`users/${uid}/entitlements/current`),false);
  }
});

test('missing controls cannot silently reopen a nonzero or blocked mirror',async()=>{
  for(const [uid,row,reason]of [['reset-gap',{accountResetStatus:'complete',accountResetEpoch:3},'account_reset_state_invalid'],['retention-gap',{accountResetStatus:'complete',accountResetEpoch:0,accountRetention:{controlStatus:'complete',lastRetentionEpoch:2}},'retention_state_invalid'],['retention-blocked',{accountResetStatus:'complete',accountResetEpoch:0,accountRetention:{controlStatus:'purging',lastRetentionEpoch:1}},'retention_processing']]){
    const db=new FakeDb({[`users/${uid}/entitlements/current`]:row});await assert.rejects(()=>Bootstrap.bootstrap({db,uid}),error=>error instanceof Bootstrap.AccountStorageBootstrapError&&error.reason===reason);assert.deepEqual(db.rows.get(`users/${uid}/entitlements/current`),row);
  }
});

test('a deletion transition that wins before commit forces a retry and stays fenced',async()=>{
  const uid='deletion-race',db=new FakeDb();db.beforeCommit=store=>store.replace(`accountResets/${uid}`,{status:'deleting',resetEpoch:0,correlationId:'race'});
  await assert.rejects(()=>Bootstrap.bootstrap({db,uid}),error=>error instanceof Bootstrap.AccountStorageBootstrapError&&error.reason==='account_reset_processing');
  assert.equal(db.rows.has(`users/${uid}/entitlements/current`),false);
});

test('callable uses base options and the shared client bootstraps only after a server-confirmed miss',()=>{
  const server=fs.readFileSync('functions/index.js','utf8'),client=fs.readFileSync('src/app/app.js','utf8'),start=client.indexOf('async function loadEntitlementFromCloud(uid)'),end=client.indexOf('\nfunction currentTier()',start),body=client.slice(start,end);
  assert.match(server,/exports\.bootstrapAccountStorageControls=onCall\(baseOpts/);assert.doesNotMatch(server,/exports\.bootstrapAccountStorageControls=onCall\((?:opts|appStoreOpts|appStorePurchaseOpts)/);
  assert.match(body,/let doc=await ref\.get\(\{source:'server'\}\);\s*if\(!doc\.exists\)\{[\s\S]*callSecureFunction\('bootstrapAccountStorageControls',\{\}\)[\s\S]*doc=await ref\.get\(\{source:'server'\}\)/);
  assert.equal((body.match(/callSecureFunction\('bootstrapAccountStorageControls'/g)||[]).length,1);
});
