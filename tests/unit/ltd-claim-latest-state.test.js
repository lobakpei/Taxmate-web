'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {make,PRO_ENTITLEMENT}=require('../test-fixture');
const {CanonicalCompanyDriver,DEFAULT_NOW}=require('../../src/integration/ltd/CanonicalCompanyDriver');
const Repository=require('../../src/integration/ltd/company-state-repository');
const Profile=require('../../src/core/company-profile');
const clone=value=>JSON.parse(JSON.stringify(value));
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const values={companyNumberStatus:'provided',companyNumber:'12345678',legalName:'Pending Claim Ltd',incorporationDate:'2026-04-06'};

async function waitingClaim(){
 let canonical=clone(make('fresh').driver.state),writes=0,release,started;
 const requestStarted=new Promise(resolve=>{started=resolve;});
 const repository=Repository.externalRepository({load:()=>canonical,replace:next=>{writes++;canonical=clone(next);}});
 const driver=new CanonicalCompanyDriver({repository,now:()=>DEFAULT_NOW,entitlementSnapshot:PRO_ENTITLEMENT,activeCompanyClaim:data=>new Promise(resolve=>{release=(overrides={})=>resolve({status:'claimed',activeCompanyId:data.companyId,setupProtocol:'ltd-setup.1',setupState:'setup_pending',...overrides});started(data);})});
 await driver.chooseBusinessCategory({category:'limited_company'});
 const pending=driver.continueStep({step:1,values}),request=await requestStarted;
 assert.equal(writes,0);
 return{driver,request,pending,release,repository,writes:()=>writes,background:next=>{canonical=clone(next);}};
}

test('Step 1 merges into the latest account state after a controlled claim response',async()=>{
 const f=await waitingClaim(),latest=f.repository.load(),id=f.request.companyId;
 latest.settings.language='zh-HK';latest.entries[0].description='Synced while the company claim was waiting';latest.businesses[0].name='Business updated by background sync';
 const historyId='company:historical-from-sync',stamp=DEFAULT_NOW-1000;
 latest.domain.companyProfiles.push({...Profile.createDraft({entityId:historyId,now:stamp,deviceId:'background-sync'}),deletedAt:stamp});
 latest.domain.entities.push({id:historyId,type:'limited_company',name:'Retained historical company',currency:'GBP',createdAt:stamp,updatedAt:stamp,deletedAt:stamp,deviceId:'background-sync'});
 f.background(latest);assert.equal(hash(f.repository.load()),hash(latest));f.release();
 assert.equal((await f.pending).status,'ok');const saved=f.repository.load();assert.equal(f.writes(),1);assert.equal(saved.domain.companyProfiles.find(row=>row.entityId===id).legalName,values.legalName);
 const unrelated=clone(saved);unrelated.domain.companyProfiles=unrelated.domain.companyProfiles.filter(row=>row.entityId!==id);unrelated.domain.entities=unrelated.domain.entities.filter(row=>row.id!==id);
 assert.equal(hash(unrelated),hash(latest),'Every non-draft field and historical record must retain the post-request repository snapshot');
});

for(const conflict of ['another_active_company','profile_tombstone','entity_tombstone'])test('Step 1 rechecks '+conflict+' after the claim response and performs no canonical write',async()=>{
 const f=await waitingClaim(),latest=f.repository.load(),id=f.request.companyId,stamp=DEFAULT_NOW+1000;
 if(conflict==='another_active_company'){
  const other='company:other-device';latest.domain.companyProfiles.push(Profile.createDraft({entityId:other,now:stamp,deviceId:'background-sync'}));latest.domain.entities.push({id:other,type:'limited_company',name:'Other company',currency:'GBP',createdAt:stamp,updatedAt:stamp,deletedAt:null,deviceId:'background-sync'});
 }else if(conflict==='profile_tombstone'){latest.domain.companyProfiles.push({...f.request.setupRecords.find(row=>row.collection==='companyProfiles').payload,deletedAt:stamp});latest.domain.entities.push(clone(f.request.setupRecords.find(row=>row.collection==='entities').payload));}
 else latest.domain.entities.push({...f.request.setupRecords.find(row=>row.collection==='entities').payload,deletedAt:stamp});
 f.background(latest);assert.equal(hash(f.repository.load()),hash(latest));f.release();assert.equal((await f.pending).status,'field_error');assert.equal(f.writes(),0);assert.equal(hash(f.repository.load()),hash(latest));
});
test('Step 1 cannot recreate a draft when the claim response reports a completed slot',async()=>{
 const f=await waitingClaim(),before=hash(f.repository.load());f.release({status:'existing',setupState:'setup_completed'});assert.equal((await f.pending).status,'field_error');assert.equal(f.writes(),0);assert.equal(hash(f.repository.load()),before);
});
