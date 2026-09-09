'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {make,PRO_ENTITLEMENT}=require('../test-fixture');
const Profile=require('../../src/core/company-profile'),Sync=require('../../src/core/ltd-sync');
const {CanonicalCompanyDriver,DEFAULT_NOW}=require('../../src/integration/ltd/CanonicalCompanyDriver');
const clone=value=>JSON.parse(JSON.stringify(value));
function removedState(){const state=make('fresh').driver.state,id='company:removed',stamp=DEFAULT_NOW-1000;state.domain.companyProfiles.push({...Profile.createDraft({entityId:id,now:stamp,deviceId:'test'}),deletedAt:stamp});state.domain.entities.push({id,name:'Removed test company',type:'limited_company',currency:'GBP',createdAt:stamp,updatedAt:stamp,deletedAt:stamp,deviceId:'test'});return state;}
test('a retained slot for a removed company cannot create a draft or overwrite deletion markers',async()=>{
 const state=removedState(),before=JSON.stringify(state),driver=new CanonicalCompanyDriver({state,trustedActiveCompanyId:'company:removed',now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT});
 const result=await driver.chooseBusinessCategory({category:'limited_company'});
 assert.equal(result.nextRoute,'ltd.one-company-limit');assert.deepEqual(result.reviewReasons,['company_slot_retained_after_removal']);assert.equal(result.data.noWrite,true);assert.equal(JSON.stringify(driver.state),before);assert.equal(driver.pendingCompanyCreation,null);assert.equal(driver.readSnapshot().companyLimit.canResumeTrustedClaim,false);
 for(const result of [driver.planCompanyPeriods({tradingStatus:'trading',tradingStartDate:'2026-04-06'}),await driver.continueStep({step:2,values:{tradingStatus:'trading',tradingStartDate:'2026-04-06',corporationTaxStatus:'not_registered'}})])assert.deepEqual(result.fieldErrors.map(e=>[e.reasonCode,e.copyKey]),[['company_slot_retained_after_removal','error.company_slot_retained']]);
});
test('a Pro claim with no removed identity can resume, and a separately reopened slot uses a new identity',async()=>{
 const state=removedState(),old=clone(state.domain.companyProfiles[0]);
 const pending=new CanonicalCompanyDriver({state,trustedActiveCompanyId:'company:pending',now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT});assert.equal(pending.readSnapshot().companyLimit.canResumeTrustedClaim,true);assert.equal((await pending.chooseBusinessCategory({category:'limited_company'})).status,'ok');assert.equal(pending.activeProfile().entityId,'company:pending');
 const reopened=new CanonicalCompanyDriver({state,now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT});assert.equal((await reopened.chooseBusinessCategory({category:'limited_company'})).status,'ok');assert.notEqual(reopened.activeProfile().entityId,old.entityId);assert.deepEqual(reopened.state.domain.companyProfiles.find(p=>p.id===old.id),old);
});
test('removed-slot handling does not bypass Pro access',async()=>{
 const state=removedState(),before=JSON.stringify(state),driver=new CanonicalCompanyDriver({state,trustedActiveCompanyId:'company:removed',now:()=>DEFAULT_NOW,entitlementSnapshot:{paidTier:'free',subscriptionStatus:'inactive',serverVerifiedAt:DEFAULT_NOW}});
 await assert.rejects(driver.chooseBusinessCategory({category:'limited_company'}));assert.equal(JSON.stringify(driver.state),before);
});
function syncFixture(){const stamp=DEFAULT_NOW,person={id:'person:account-holder',accountUid:null,origin:'legacy_v5'},old={id:'company:old',type:'limited_company',deletedAt:stamp},current={id:'company:new',type:'limited_company',deletedAt:null};const state={domain:{entities:[old,current],persons:[person],companyProfiles:[],paymentAccounts:[{id:'account-personal:company:old',ownerType:'person',ownerId:person.id,deletedAt:stamp},{id:'account-personal:company:new',ownerType:'person',ownerId:person.id,deletedAt:null}]}};const remote=[Sync.envelope('persons',person,old.id),Sync.envelope('entities',old,old.id),Sync.envelope('paymentAccounts',state.domain.paymentAccounts[0],old.id)];return{state,remote};}
test('new company sync keeps historical personal accounts at their original company and does not rebind an identical account holder',()=>{
 const {state,remote}=syncFixture(),before=JSON.stringify({state,remote}),result=Sync.reconcile(state,remote,'owner');
 assert.deepEqual(result.conflicts,[]);assert.deepEqual(result.downloads,[]);assert.ok(result.uploads.length>0);assert.ok(result.uploads.every(row=>row.companyId==='company:new'));assert.equal(result.uploads.some(row=>row.collection==='persons'),false);assert.equal(JSON.stringify({state,remote}),before);
});
test('changed account-holder payloads still cannot cross company anchors',()=>{
 const {state,remote}=syncFixture();state.domain.persons[0].name='Changed local holder';const result=Sync.reconcile(state,remote,'owner');assert.equal(result.conflicts[0].reasonCode,'company_anchor_mismatch');assert.equal(result.uploads.some(row=>row.collection==='persons'),false);
});
test('unbound personal accounts and multiple active company candidates remain ambiguous',()=>{
 const ids=new Set(['company:old','company:new']);assert.throws(()=>Sync.companyIdForRecord('paymentAccounts',{id:'unbound',ownerType:'person'},ids,new Set(['company:new'])),/ambiguous/);assert.throws(()=>Sync.companyIdForRecord('persons',{id:'person:account-holder'},ids,ids),/ambiguous/);
});
