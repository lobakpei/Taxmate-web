'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const State=require('../../src/integration/ltd/company-state'),Sync=require('../../src/core/ltd-sync'),History=require('../../src/core/company-profile-history'),Domain=require('../../src/core/domain-schema');
const {make}=require('../test-fixture');
function legacyDeletedState(){
 const state=make('existing').driver.state,profile=state.domain.companyProfiles[0];
 delete profile.ownershipHistory;delete profile.profileRevisionHistory;
 const changed=History.recordOwnershipChange({profile,effectiveDate:'2026-09-16',shareholders:profile.shareholders,reason:'Historical change',evidenceRefs:['test-evidence'],now:1788462146467,deviceId:'old-device'}).profile;
 changed.ownershipHistory[0].effectiveTo='2026-09-03';changed.deletedAt=1788472099371;changed.updatedAt=changed.deletedAt;
 state.domain.companyProfiles[0]=changed;state.domain.entities.find(row=>row.id===changed.entityId).deletedAt=changed.deletedAt;
 return state;
}
test('deleted company with a legacy timeline gap hydrates unchanged without blocking other records',()=>{
 const state=legacyDeletedState(),raw=JSON.stringify(state),company=state.domain.companyProfiles[0].entityId;
 const envelopes=Object.entries(Sync.recordsForSync(state)).flatMap(([collection,records])=>records.map(record=>Sync.envelope(collection,record,company)));
 const base=State.migrate({v:5,businesses:state.businesses,entries:state.entries,settings:state.settings,yearData:state.yearData},1788900000000,'new-device');
 const restored=State.migrate(Sync.applyDownloads(base,envelopes),1788900000000,'new-device');State.validateState(restored);
 assert.equal(JSON.stringify(state),raw);assert.deepEqual(restored.entries,state.entries);
 assert.deepEqual(Sync.recordsForSync(restored),Sync.recordsForSync(state));
 assert.equal(restored.domain.companyProfiles.filter(row=>row.deletedAt==null).length,0);
 const result=Sync.reconcile(restored,envelopes,'test-account');assert.equal(result.conflicts.length,0);assert.equal(result.uploads.length,0);assert.equal(result.downloads.length,0);
});
test('active company timeline gaps and malformed deleted history remain rejected',()=>{
 const profile=legacyDeletedState().domain.companyProfiles[0];delete profile.deletedAt;
 assert.throws(()=>Domain.validateCompanyProfile(profile),/history must be continuous/);
 profile.deletedAt=1788472099371;profile.ownershipHistory[0].effectiveFrom='invalid-date';
 assert.throws(()=>Domain.validateCompanyProfile(profile),/ownership version/);
});
test('only owned ownership updates older than matching company deletions leave the sending queue',()=>{
 const company='company:queue-test',uid='owner',deleted=[Sync.envelope('entities',{id:company,type:'limited_company',deletedAt:30},company),Sync.envelope('companyProfiles',{id:'profile:test',entityId:company,deletedAt:30},company)];
 const operation=(overrides={})=>({kind:'ltd-record',uid,ownerUid:uid,companyId:company,collection:'companyOwnershipVersions',record:Sync.envelope('companyOwnershipVersions',{id:'ownership:2',entityId:company,createdAt:10,updatedAt:20},company),...overrides});
 const old=operation(),later=operation({record:Sync.envelope('companyOwnershipVersions',{id:'ownership:3',entityId:company,createdAt:10,updatedAt:31},company)}),foreign=operation({ownerUid:'other'}),personal={kind:'personal-state',uid};
 const all=[old,later,foreign,personal],bytes=JSON.stringify(all),result=Sync.partitionDeletedOwnershipOperations(all,deleted,uid);
 assert.deepEqual(result.retired,[old]);assert.deepEqual(result.kept,[later,foreign,personal]);assert.equal(JSON.stringify(all),bytes);
 assert.equal(Sync.partitionDeletedOwnershipOperations(all,deleted.slice(0,1),uid).retired.length,0);
 const mismatch=[deleted[0],Sync.envelope('companyProfiles',{id:'profile:test',entityId:company,deletedAt:29},company)];assert.equal(Sync.partitionDeletedOwnershipOperations(all,mismatch,uid).retired.length,0);
 assert.equal(Sync.partitionDeletedOwnershipOperations(all,deleted.map(row=>({...row,accountOwnerUid:'other'})),uid).retired.length,0);
});
