'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const Safety=require('../../functions/billing-deletion-safety');
const CustomerBinding=require('../../functions/billing-customer-binding');

const clone=value=>value==null?value:structuredClone(value);
class Snap{constructor(ref,value){this.ref=ref;this.exists=value!==undefined;this.value=clone(value);}data(){return clone(this.value);}}
class Ref{constructor(db,path){this.db=db;this.path=path;}get(){return Promise.resolve(new Snap(this,this.db.rows.get(this.path)));}}
class Db{
  constructor(rows){this.rows=new Map(Object.entries(clone(rows||{})));}
  doc(path){return new Ref(this,path);}
  async runTransaction(run){return run({get:ref=>ref.get(),set:(ref,value,options)=>this.rows.set(ref.path,options&&options.merge?{...(this.rows.get(ref.path)||{}),...clone(value)}:clone(value))});}
}
const FieldValue={serverTimestamp:()=>12345};

test('Stripe deletion preflight paginates past 100 rows and fails closed on a broken cursor',async()=>{
  const all=Array.from({length:205},(_,index)=>({id:`sub_${String(index).padStart(3,'0')}`,status:index===204?'active':'canceled'})),calls=[];
  const rows=await Safety.listAllStripe(async params=>{calls.push({...params});const start=params.starting_after?all.findIndex(row=>row.id===params.starting_after)+1:0,data=all.slice(start,start+100);return{data,has_more:start+data.length<all.length};},{customer:'cus_safe',status:'all'});
  assert.equal(rows.length,205);assert.equal(rows.at(-1).status,'active');assert.deepEqual(calls.map(call=>call.starting_after||null),[null,'sub_099','sub_199']);
  await assert.rejects(()=>Safety.listAllStripe(async()=>({data:[],has_more:true}),{}),/pagination_invalid/);
});

test('a completed higher reset epoch rotates Stripe customer while the old immutable tombstone remains',async()=>{
  const uid='same-firebase-uid',oldEpoch=0,newEpoch=8,oldCustomer='cus_old123',archiveId=Safety.tombstoneId('stripe',uid,oldEpoch,oldCustomer),db=new Db({
    [`accountResets/${uid}`]:{status:'complete',resetEpoch:newEpoch},
    [`billingCustomers/${uid}`]:{uid,stripeCustomerId:oldCustomer,resetEpoch:oldEpoch,accountDeleted:true,rebindAllowedAfterEpoch:true},
    [`billingProviderTombstones/${archiveId}`]:{uid,provider:'stripe',identity:oldCustomer,resetEpoch:oldEpoch,accountDeleted:true}
  }),creates=[];
  const customer=await CustomerBinding.customerFor({db,FieldValue,user:{uid,token:{email:'owner@example.test'}},client:{customers:{create:async(input,options)=>{creates.push({input,options});return{id:'cus_new456'};}}},assertResetReady:async()=>({resetEpoch:newEpoch}),accountResetError:()=>Object.assign(new Error('reset'),{reason:'account_reset'})});
  assert.equal(customer,'cus_new456');assert.equal(db.rows.get(`billingCustomers/${uid}`).resetEpoch,newEpoch);assert.equal(db.rows.get(`billingCustomers/${uid}`).accountDeleted,undefined);
  assert.equal(db.rows.get(`billingProviderTombstones/${archiveId}`).identity,oldCustomer);assert.equal(creates[0].options.idempotencyKey,`taxmate-customer-${uid}-${newEpoch}`);
});

test('Stripe tombstone cannot rotate in the same epoch or without its immutable archive',async()=>{
  for(const {epoch,archive} of [{epoch:0,archive:true},{epoch:3,archive:false}]){
    const uid=`blocked-${epoch}-${archive}`,old='cus_old789',rows={
      [`accountResets/${uid}`]:{status:'complete',resetEpoch:epoch},
      [`billingCustomers/${uid}`]:{uid,stripeCustomerId:old,resetEpoch:0,accountDeleted:true,rebindAllowedAfterEpoch:true}
    };if(archive)rows[`billingProviderTombstones/${Safety.tombstoneId('stripe',uid,0,old)}`]={uid,provider:'stripe',identity:old,resetEpoch:0,accountDeleted:true};
    const db=new Db(rows),run=()=>CustomerBinding.customerFor({db,FieldValue,user:{uid,token:{}},client:{customers:{create:async()=>({id:'cus_should_not_bind'})}},assertResetReady:async()=>({resetEpoch:epoch}),accountResetError:()=>Object.assign(new Error('reset'),{reason:'account_reset'})});
    await assert.rejects(run,error=>error.reason==='account_reset');
  }
});

test('account deletion can prove there is no current App Store billing history without Apple secrets',()=>{
  const uid='web-only-user',hash='a'.repeat(64),empty={uid,resetEpoch:4,transactionHistoryState:'empty',appAccountTokenHash:hash};
  assert.deepEqual(Safety.appStoreDeletionEvidence({uid,resetEpoch:4}),{safe:true,state:'absent'});
  assert.deepEqual(Safety.appStoreDeletionEvidence({uid,resetEpoch:4,account:empty,tokens:[{id:hash,value:{uid,resetEpoch:4,appAccountTokenHash:hash}}]}),{safe:true,state:'verified_empty'});
  assert.deepEqual(Safety.appStoreDeletionEvidence({uid,resetEpoch:4,account:{...empty,accountDeleted:true,resetEpoch:2},tokens:[{id:hash,value:{uid,resetEpoch:2,appAccountTokenHash:hash,accountDeleted:true}}]}),{safe:true,state:'historical_tombstone'});
});

test('unknown or nonempty current App Store evidence fails closed without Apple secrets',()=>{
  const uid='apple-evidence-user',epoch=5,hash='b'.repeat(64),empty={uid,resetEpoch:epoch,transactionHistoryState:'empty',appAccountTokenHash:hash},token={id:hash,value:{uid,resetEpoch:epoch,appAccountTokenHash:hash}},transaction={id:'transaction',value:{uid,resetEpoch:epoch}},notification={id:'notification',value:{uid,resetEpoch:epoch}};
  const cases=[
    {name:'unknown account history',input:{account:{...empty,transactionHistoryState:null},tokens:[token]},reason:'unknown'},
    {name:'verified account history',input:{account:{...empty,transactionHistoryState:'verified',lastVerifiedTransactionHash:'c'.repeat(64)},tokens:[token]},reason:'history'},
    {name:'orphan token',input:{tokens:[token]},reason:'unknown'},
    {name:'missing matching token',input:{account:empty},reason:'unknown'},
    {name:'transaction mapping',input:{account:empty,tokens:[token],transactions:[transaction]},reason:'history'},
    {name:'processed notification',input:{account:empty,tokens:[token],notifications:[notification]},reason:'history'},
    {name:'entitlement access',input:{account:empty,tokens:[token],entitlement:{appStoreAccess:{active:false,status:'expired'}}},reason:'history'},
    {name:'entitlement subscriptions',input:{account:empty,tokens:[token],entitlement:{appStoreSubscriptions:{abc:{status:'expired'}}}},reason:'history'},
    {name:'lifecycle mismatch',input:{account:empty,tokens:[{...token,value:{...token.value,resetEpoch:epoch+1}}]},reason:'unknown'}
  ];
  for(const item of cases)assert.deepEqual(Safety.appStoreDeletionEvidence({uid,resetEpoch:epoch,...item.input}),{safe:false,reason:item.reason},item.name);
});
