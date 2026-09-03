'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Backup=require('../../src/core/backup-export');
const Portable=require('../../src/core/portable-backup');

const state=()=>({v:5,businesses:[{id:'b1',name:'Founder preview trade',structure:'sole'}],entries:[{id:'e1',bizId:'b1',kind:'expense',date:'2026-09-01',amount:10,cat:'other',receiptUrl:'https://example.test/linked.jpg'}],folders:[],tombstones:[],businessTombstones:[],folderTombstones:[],yearData:{},customCats:{},activeCats:{},catRenames:{},settings:{lang:'en'}});

test('authenticated Full Backup fails closed before archive creation when orphan Storage listing is unavailable',async()=>{
  const input=state(),before=JSON.stringify(input);let downloads=0,archives=0;
  const build=async()=>{
    const receipts=await Backup.collectReceipts({state:input,user:{uid:'founder-preview-user'},activeUid:'founder-preview-user',stateOwnerUid:'founder-preview-user',download:async()=>{downloads++;return{bytes:new Uint8Array([1,2,3]),mimeType:'image/jpeg'};}});
    archives++;
    return Portable.createArchive({state:input,receipts,identity:{appVersion:'2.1.11',buildId:'full-backup-readiness-integration',deviceId:'integration'},nodeBuffer:true});
  };
  const error=await build().then(()=>null,value=>value);
  assert.deepEqual(Backup.diagnostic(error),{category:'storage_list_failure',code:'BACKUP_STORAGE_LIST_FAILED',count:null,stage:'storage_list'});
  assert.equal(downloads,0);
  assert.equal(archives,0);
  assert.equal(JSON.stringify(input),before);
  assert.match(Backup.message(error),/couldn't check your receipt files/i);
});

test('authenticated Full Backup includes listed orphan files when Storage listing succeeds',async()=>{
  const input=state(),linked=new Uint8Array([1,2,3]),orphan=new Uint8Array([4,5,6]);
  const receipts=await Backup.collectReceipts({
    state:input,user:{uid:'founder-preview-user'},activeUid:'founder-preview-user',stateOwnerUid:'founder-preview-user',listStorage:async()=>[{fullPath:'receipts/founder-preview-user/orphan.jpg',getDownloadURL:async()=> 'https://example.test/orphan.jpg'}],
    download:async url=>({bytes:url.endsWith('orphan.jpg')?orphan:linked,mimeType:'image/jpeg'})
  });
  const created=await Portable.createArchive({state:input,receipts,identity:{appVersion:'2.1.11',buildId:'full-backup-readiness-integration',deviceId:'integration'},nodeBuffer:true}),inspected=await Portable.inspectArchive(created.archive);
  assert.equal(inspected.receipts.length,2);
  assert.equal(inspected.preview.receipts,1);
  assert.equal(inspected.preview.orphans,1);
});

test('authenticated zero-receipt account completes Full Backup after an empty owned Storage listing',async()=>{
  const input={...state(),entries:[]},before=JSON.stringify(input);let listed=0;
  const receipts=await Backup.collectReceipts({state:input,user:{uid:'new-user'},activeUid:'new-user',stateOwnerUid:'new-user',listStorage:async uid=>{listed++;assert.equal(uid,'new-user');return[];},download:async()=>{throw new Error('unexpected-download');}});
  const created=await Portable.createArchive({state:input,receipts,identity:{appVersion:'2.1.13',buildId:'zero-receipt',deviceId:'integration'},nodeBuffer:true}),inspected=await Portable.inspectArchive(created.archive);
  assert.equal(listed,1);assert.equal(inspected.receipts.length,0);assert.equal(inspected.preview.receipts,0);assert.equal(JSON.stringify(input),before);
});

test('owned stale Storage path falls back to the same record URL on unauthorized without mutating state',async()=>{
  const input=state();input.entries[0].receiptPath='receipts/founder-preview-user/stale.jpg';const before=JSON.stringify(input),downloads=[];let resolves=0;
  const receipts=await Backup.collectReceipts({state:input,user:{uid:'founder-preview-user'},activeUid:'founder-preview-user',stateOwnerUid:'founder-preview-user',listStorage:async()=>[],storageUrl:async()=>{resolves++;throw Object.assign(new Error('denied'),{code:'storage/unauthorized'});},download:async url=>{downloads.push(url);return{bytes:new Uint8Array([7,8]),mimeType:'image/jpeg'};}});
  assert.equal(resolves,1);assert.deepEqual(downloads,['https://example.test/linked.jpg']);assert.equal(receipts.length,1);assert.equal(JSON.stringify(input),before);
});

test('foreign receipt path fails closed with its record and path before any foreign request',async()=>{
  const input=state();input.entries[0].receiptPath='receipts/founder-preview-user/private.jpg';let storageCalls=0,downloads=0,foreign=0;
  const error=await Backup.collectReceipts({state:input,user:{uid:'tammy-user'},activeUid:'tammy-user',stateOwnerUid:'tammy-user',listStorage:async()=>[],storageUrl:async()=>{storageCalls++;},download:async()=>{downloads++;},onForeignReference:()=>{foreign++;}}).then(()=>null,value=>value);
  assert.deepEqual(Backup.diagnostic(error),{category:'foreign_receipt_reference',code:'BACKUP_FOREIGN_RECEIPT_BLOCKED',count:1,stage:'receipt_owner',recordId:'e1',path:'receipts/founder-preview-user/private.jpg'});assert.equal(storageCalls,0);assert.equal(downloads,0);assert.equal(foreign,1);
});

test('owned pure-URL receipt remains downloadable and a state-owner mismatch fails before listing',async()=>{
  const input=state();let listed=0,downloads=0;
  const receipts=await Backup.collectReceipts({state:input,user:{uid:'owner'},activeUid:'owner',stateOwnerUid:'owner',listStorage:async()=>{listed++;return[];},download:async url=>{downloads++;assert.equal(url,'https://example.test/linked.jpg');return{bytes:new Uint8Array([9]),mimeType:'image/jpeg'};}});
  assert.equal(receipts.length,1);assert.equal(listed,1);assert.equal(downloads,1);
  const mismatch=await Backup.collectReceipts({state:input,user:{uid:'owner'},activeUid:'owner',stateOwnerUid:'other',listStorage:async()=>{throw new Error('must-not-list');},download:async()=>{throw new Error('must-not-download');}}).then(()=>null,value=>value);
  assert.deepEqual(Backup.diagnostic(mismatch),{category:'foreign_receipt_reference',code:'BACKUP_FOREIGN_RECEIPT_BLOCKED',count:1,stage:'state_owner'});
});
