'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Accounts=require('../../src/core/account-storage');
const Boundary=require('../../src/core/account-boundary');

function memory(initial={}){const values=new Map(Object.entries(initial));return{get length(){return values.size;},key(index){return [...values.keys()][index]??null;},getItem(key){return values.has(key)?values.get(key):null;},setItem(key,value){values.set(String(key),String(value));},removeItem(key){values.delete(String(key));}};}
const business=(id,name)=>({id,name,structure:'sole',createdAt:1,updatedAt:1,deletedAt:null,deviceId:'fixture',schemaVersion:5,recordType:'business'});
const entry=(id,bizId,receiptUrl=null)=>({id,bizId,businessId:bizId,kind:'expense',date:'2026-09-01',amount:12,receiptUrl,createdAt:1,updatedAt:1,deletedAt:null,deviceId:'fixture',schemaVersion:5,recordType:'entry'});
const state=(businesses,entries,domain={})=>({v:5,businesses,businessTombstones:[],entries,tombstones:[],folders:[],folderTombstones:[],customCats:{},activeCats:{},yearData:{},settings:{lang:'en'},domain:{persons:[],entities:[],companyProfiles:[],projects:[],paymentAccounts:[],economicEvents:[],companyTaxPeriods:[],companyLossRecords:[],salaryRecords:[],dividendDeclarations:[],personalIncomeLinks:[],migrationIssues:[],syncConflicts:[],...domain}});

test('Founder records copied into a legacy Tammy namespace are isolated before render or merge',()=>{
  const founder=Accounts.firebaseScope('founder'),tammy=Accounts.firebaseScope('tammy'),founderBiz=business('founder-biz','Synthetic Founder'),founderEntry=entry('founder-entry','founder-biz'),tammyBiz=business('tammy-biz','Synthetic Tammy'),tammyEntry=entry('tammy-entry','tammy-biz');
  const storage=memory();Accounts.write(storage,founder,'canonical',JSON.stringify(state([founderBiz],[founderEntry])));Accounts.write(storage,tammy,'canonical',JSON.stringify(state([tammyBiz,founderBiz],[tammyEntry,founderEntry])));
  const index=Boundary.foreignIndex(storage,tammy,Accounts),result=Boundary.partitionState(JSON.parse(Accounts.read(storage,tammy,'canonical')),{uid:'tammy',foreignIndex:index});
  assert.deepEqual(result.state.businesses.map(item=>item.id),['tammy-biz']);assert.deepEqual(result.state.entries.map(item=>item.id),['tammy-entry']);assert.equal(result.quarantined.length,2);assert.equal(result.changed,true);
  const saved=Boundary.quarantine(storage,tammy,result.quarantined,{accountStorage:Accounts,source:'unit',now:100});assert.equal(saved.added,2);assert.equal(JSON.parse(storage.getItem(saved.key)).records.length,2);
});

test('foreign Firebase URL-only references are removed without deleting the owned bookkeeping record',()=>{
  const foreign='https://firebasestorage.googleapis.com/v0/b/demo/o/receipts%2Ffounder%2Fprivate.jpg?alt=media&token=synthetic',input=state([business('tammy-biz','Synthetic Tammy')],[entry('tammy-entry','tammy-biz',foreign)]),result=Boundary.partitionState(input,{uid:'tammy',foreignIndex:{ids:new Set(),signatures:new Set()}});
  assert.equal(Boundary.receiptOwner(foreign),'founder');assert.equal(result.state.entries.length,1);assert.equal(result.state.entries[0].receiptUrl,null);assert.equal(result.quarantined[0].reason,'foreign_receipt_reference');
});

test('Founder Preview ghost is isolated by provenance while a real company is untouched',()=>{
  const ghostEntity={id:'entity:preview',type:'limited_company',name:'LOBAKPE FOUNDER PREVIEW LTD'},ghost={id:'profile:preview',entityId:ghostEntity.id,legalName:ghostEntity.name,registryVerification:{previewFixture:true,provider:'founder_preview_fixture',previewAlias:'lobakpe1'}},realEntity={id:'entity:real',type:'limited_company',name:'Real Ltd'},real={id:'profile:real',entityId:realEntity.id,legalName:realEntity.name,registryVerification:{previewFixture:false,provider:'companies_house_api'}},input=state([],[],{entities:[ghostEntity,realEntity],companyProfiles:[ghost,real]});
  const result=Boundary.partitionState(input,{uid:'founder',foreignIndex:{ids:new Set(),signatures:new Set()}});assert.deepEqual(result.state.domain.companyProfiles.map(item=>item.id),['profile:real']);assert.deepEqual(result.state.domain.entities.map(item=>item.id),['entity:real']);assert.equal(result.previewGhost,true);
});

test('legacy LOBAKPE ghost without provenance is isolated but a verified real company is preserved',()=>{
  const ghostEntity={id:'entity:legacy-preview',type:'limited_company',name:'LOBAKPE FOUNDER PREVIEW LTD'},ghost={id:'profile:legacy-preview',entityId:ghostEntity.id,legalName:ghostEntity.name,companyNumber:'00000000',registryVerification:{status:'needs_checking'}},realEntity={id:'entity:real-same-name',type:'limited_company',name:'LOBAKPE FOUNDER PREVIEW LTD'},real={id:'profile:real-same-name',entityId:realEntity.id,legalName:realEntity.name,companyNumber:'12345678',registryVerification:{status:'verified',companyNumber:'12345678',provider:'companies_house_api'}},input=state([],[],{entities:[ghostEntity,realEntity],companyProfiles:[ghost,real]});
  const result=Boundary.partitionState(input,{uid:'founder',foreignIndex:{ids:new Set(),signatures:new Set()}});
  assert.equal(result.previewGhost,true);assert.deepEqual(result.state.domain.companyProfiles.map(item=>item.id),['profile:real-same-name']);assert.deepEqual(result.state.domain.entities.map(item=>item.id),['entity:real-same-name']);
});

test('cloud owner markers fail closed and record markers are stripped before canonical merge',()=>{
  const mismatch=Boundary.partitionCloudMeta({accountOwnerUid:'founder',businesses:[business('b','Private')]},{uid:'tammy',foreignIndex:{ids:new Set(),signatures:new Set()}});assert.equal(mismatch.ownerMismatch,true);assert.deepEqual(mismatch.meta,{});
  const rows=Boundary.partitionRecords([{...entry('mine','b'),accountOwnerUid:'tammy'},{...entry('foreign','b'),accountOwnerUid:'founder'}],{uid:'tammy',collection:'entries',foreignIndex:{ids:new Set(),signatures:new Set()}});assert.deepEqual(rows.accepted.map(item=>item.id),['mine']);assert.equal('accountOwnerUid' in rows.accepted[0],false);assert.equal(rows.quarantined.length,1);
});

test('clean-device ownerless foreign cloud data fails closed unless a trusted server migration claim exists',()=>{
  const empty={ids:new Set(),signatures:new Set(),scopes:[]},meta={businesses:[business('legacy-foreign-business','Synthetic foreign legacy data')]},record=entry('legacy-foreign-entry','legacy-foreign-business');
  const deniedMeta=Boundary.partitionCloudMeta(meta,{uid:'tammy',foreignIndex:empty}),deniedRecords=Boundary.partitionRecords([record],{uid:'tammy',collection:'entries',foreignIndex:empty,requireOwner:true});
  assert.deepEqual(deniedMeta.meta,{});assert.equal(deniedMeta.ownerMissing,true);assert.equal(deniedMeta.quarantined[0].reason,'owner_missing');assert.deepEqual(deniedRecords.accepted,[]);assert.equal(deniedRecords.quarantined[0].reason,'owner_missing');
  const trustedClaim={schemaVersion:1,status:'verified',claimType:'server_migration',ownerUid:'tammy'},acceptedMeta=Boundary.partitionCloudMeta(meta,{uid:'tammy',foreignIndex:empty,trustedClaim}),acceptedRecords=Boundary.partitionRecords([record],{uid:'tammy',collection:'entries',foreignIndex:empty,requireOwner:true,trustedClaim});
  assert.deepEqual(acceptedMeta.meta.businesses.map(item=>item.id),['legacy-foreign-business']);assert.deepEqual(acceptedRecords.accepted.map(item=>item.id),['legacy-foreign-entry']);assert.equal(Boundary.trustedServerClaim({...trustedClaim,ownerUid:'founder'},'tammy'),false);
});

test('generic account-holder placeholder is never treated as foreign by ID or signature',()=>{
  const person={id:'person:account-holder',type:'person',name:'Account holder'},founder=Accounts.firebaseScope('founder'),tammy=Accounts.firebaseScope('tammy'),storage=memory();
  Accounts.write(storage,founder,'canonical',JSON.stringify(state([],[],{persons:[person]})));Accounts.write(storage,tammy,'canonical',JSON.stringify(state([],[],{persons:[person]})));
  const result=Boundary.partitionState(JSON.parse(Accounts.read(storage,tammy,'canonical')),{uid:'tammy',foreignIndex:Boundary.foreignIndex(storage,tammy,Accounts)});
  assert.equal(result.changed,false);assert.deepEqual(result.state.domain.persons,[person]);
});
