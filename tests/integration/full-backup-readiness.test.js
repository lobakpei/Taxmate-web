'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Backup=require('../../src/core/backup-export');
const Portable=require('../../src/core/portable-backup');

const state=()=>({v:5,businesses:[{id:'b1',name:'Founder preview trade',structure:'sole'}],entries:[{id:'e1',bizId:'b1',kind:'expense',date:'2026-09-01',amount:10,cat:'other',receiptUrl:'https://example.test/linked.jpg'}],folders:[],tombstones:[],businessTombstones:[],folderTombstones:[],yearData:{},customCats:{},activeCats:{},catRenames:{},settings:{lang:'en'}});

test('authenticated Full Backup fails closed before archive creation when orphan Storage listing is unavailable',async()=>{
  const input=state(),before=JSON.stringify(input);let downloads=0,archives=0;
  const build=async()=>{
    const receipts=await Backup.collectReceipts({state:input,user:{uid:'founder-preview-user'},download:async()=>{downloads++;return{bytes:new Uint8Array([1,2,3]),mimeType:'image/jpeg'};}});
    archives++;
    return Portable.createArchive({state:input,receipts,identity:{appVersion:'2.1.11',buildId:'full-backup-readiness-integration',deviceId:'integration'},nodeBuffer:true});
  };
  const error=await build().then(()=>null,value=>value);
  assert.deepEqual(Backup.diagnostic(error),{category:'storage_list_failure',code:'BACKUP_STORAGE_LIST_FAILED',count:null});
  assert.equal(downloads,0);
  assert.equal(archives,0);
  assert.equal(JSON.stringify(input),before);
  assert.match(Backup.message(error),/couldn't check your receipt files/i);
});

test('authenticated Full Backup includes listed orphan files when Storage listing succeeds',async()=>{
  const input=state(),linked=new Uint8Array([1,2,3]),orphan=new Uint8Array([4,5,6]);
  const receipts=await Backup.collectReceipts({
    state:input,user:{uid:'founder-preview-user'},listStorage:async()=>[{fullPath:'receipts/founder-preview-user/orphan.jpg',getDownloadURL:async()=> 'https://example.test/orphan.jpg'}],
    download:async url=>({bytes:url.endsWith('orphan.jpg')?orphan:linked,mimeType:'image/jpeg'})
  });
  const created=await Portable.createArchive({state:input,receipts,identity:{appVersion:'2.1.11',buildId:'full-backup-readiness-integration',deviceId:'integration'},nodeBuffer:true}),inspected=await Portable.inspectArchive(created.archive);
  assert.equal(inspected.receipts.length,2);
  assert.equal(inspected.preview.receipts,1);
  assert.equal(inspected.preview.orphans,1);
});
