'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Backup=require('../../src/core/backup-export');
const Portable=require('../../src/core/portable-backup');
const CompanyAccess=require('../../src/core/company-access');

const bytes=value=>new Uint8Array([value,2,3,4]);
const baseState=entries=>({v:5,businesses:[{id:'b1',name:'Trade',structure:'sole'}],entries:entries||[],folders:[],tombstones:[],businessTombstones:[],folderTombstones:[],yearData:{},customCats:{},activeCats:{},catRenames:{},settings:{lang:'en'}});
const entry=(id,receiptPath,receiptUrl)=>({id,bizId:'b1',kind:'expense',date:'2026-08-31',amount:10,cat:'other',receiptPath:receiptPath||null,receiptUrl:receiptUrl||null});
const download=async url=>({bytes:bytes(url.length%251),mimeType:'image/jpeg'});
const owned={activeUid:'u',stateOwnerUid:'u'};

test('no-receipt and multiple linked-receipt collection is read-only',async()=>{
  assert.deepEqual(await Backup.collectReceipts({state:baseState(),download}),[]);
  const state=baseState([entry('e1',null,'https://example.test/one.jpg'),entry('e2',null,'https://example.test/two.jpg')]),before=JSON.stringify(state);
  const rows=await Backup.collectReceipts({state,download});
  assert.equal(rows.length,2);assert.deepEqual(rows.map(row=>row.entryId),['e1','e2']);assert.equal(JSON.stringify(state),before);
});

test('stale Storage path safely falls back to the same record URL and remains fail-closed in the archive',async()=>{
  const state=baseState([entry('e1','receipts/u/stale.jpg','https://example.test/retained-download-token')]),before=JSON.stringify(state);
  const rows=await Backup.collectReceipts({state,user:{uid:'u'},...owned,storageUrl:async()=>{throw Object.assign(new Error('missing'),{code:'storage/object-not-found'});},listStorage:async()=>[],download});
  assert.equal(rows.length,1);assert.equal(rows[0].originalPath,'receipts/u/stale.jpg');assert.equal(rows[0].associations[0].originalPath,'receipts/u/stale.jpg');assert.equal(JSON.stringify(state),before);
  const created=await Portable.createArchive({state,receipts:rows,identity:{appVersion:'2.1.11',buildId:'six-issue-test',deviceId:'test'},nodeBuffer:true,exportedAt:'2026-08-31T00:00:00.000Z'}),inspected=await Portable.inspectArchive(created.archive);
  assert.equal(inspected.receipts.length,1);assert.equal(inspected.receipts[0].originalPath,'receipts/u/stale.jpg');assert.equal(inspected.metadata.receiptCount,1);
});

test('orphan listing is preserved and a list failure is never treated as an empty folder',async()=>{
  const rows=await Backup.collectReceipts({state:baseState(),user:{uid:'u'},...owned,storageUrl:async path=>'https://example.test/'+path,download,listStorage:async()=>[{fullPath:'receipts/u/orphan.jpg',getDownloadURL:async()=> 'https://example.test/orphan.jpg'}]});
  assert.equal(rows.length,1);assert.equal(rows[0].entryId,null);assert.equal(rows[0].originalPath,'receipts/u/orphan.jpg');assert.equal(rows[0].associations,undefined);
  await assert.rejects(()=>Backup.collectReceipts({state:baseState(),user:{uid:'u'},...owned,download,listStorage:async()=>{throw new Error('list blocked');}}),error=>Backup.diagnostic(error).category===Backup.CATEGORIES.STORAGE_LIST);
});

test('signed-in receipt collection without Storage listing capability stops before any download',async()=>{
  const state=baseState([entry('e1',null,'https://example.test/linked.jpg')]),before=JSON.stringify(state);let downloads=0;
  const error=await Backup.collectReceipts({state,user:{uid:'u'},...owned,download:async()=>{downloads++;return{bytes:bytes(1),mimeType:'image/jpeg'};}}).then(()=>null,value=>value);
  assert.equal(Backup.diagnostic(error).category,Backup.CATEGORIES.STORAGE_LIST);assert.equal(downloads,0);assert.equal(JSON.stringify(state),before);
});

test('foreign Firebase URL-only reference is skipped before resolving or downloading while owned orphan listing remains available',async()=>{
  const foreign='https://firebasestorage.googleapis.com/v0/b/demo/o/receipts%2Ffounder%2Fprivate.jpg?alt=media&token=synthetic',state=baseState([entry('e1',null,foreign)]);let lists=0,resolves=0,downloads=0,foreignCalls=0;
  const receipts=await Backup.collectReceipts({state,user:{uid:'tammy'},activeUid:'tammy',stateOwnerUid:'tammy',listStorage:async()=>{lists++;return[];},storageUrl:async()=>{resolves++;return foreign;},download:async()=>{downloads++;return{bytes:bytes(1),mimeType:'image/jpeg'};},onForeignReference:()=>{foreignCalls++;}});
  assert.equal(receipts.length,0);assert.equal(receipts.skippedForeignCount,1);assert.equal(lists,1);assert.equal(resolves,0);assert.equal(downloads,0);assert.equal(foreignCalls,1);
});

test('exact record-id receipt already migrated into the active UID is included without rewriting state',async()=>{
  const foreign='receipts/legacy-owner/e1.jpg',ownedPath='receipts/u/e1.jpg',state=baseState([entry('e1',foreign,null)]),before=JSON.stringify(state),resolved=[];
  const receipts=await Backup.collectReceipts({state,user:{uid:'u'},...owned,listStorage:async()=>[{fullPath:ownedPath}],storageUrl:async path=>{resolved.push(path);return'https://example.test/owned-e1.jpg';},download});
  assert.equal(receipts.length,1);assert.equal(receipts[0].entryId,'e1');assert.equal(receipts[0].originalPath,foreign);assert.equal(receipts[0].associations[0].originalPath,foreign);assert.deepEqual(resolved,[ownedPath]);assert.equal(receipts.skippedForeignCount,0);assert.equal(receipts.skippedUnavailableCount,0);assert.equal(JSON.stringify(state),before);
  const created=await Portable.createArchive({state,receipts,identity:{appVersion:'2.1.16',buildId:'focused-hotfix-test',deviceId:'test'},nodeBuffer:true,exportedAt:'2026-09-03T00:00:00.000Z'}),inspected=await Portable.inspectArchive(created.archive);
  assert.equal(inspected.receipts.length,1);assert.equal(inspected.receipts[0].originalPath,foreign);assert.equal(inspected.metadata.receiptCount,1);
});

test('record-id mismatch cannot use an unrelated active-UID object as a foreign-reference fallback',async()=>{
  const foreign='receipts/legacy-owner/e1.jpg',state=baseState([entry('different-record',foreign,null)]);let resolves=0,downloads=0;
  const receipts=await Backup.collectReceipts({state,user:{uid:'u'},...owned,listStorage:async()=>[{fullPath:'receipts/u/e1.jpg'}],storageUrl:async()=>{resolves++;return'https://example.test/unrelated.jpg';},download:async()=>{downloads++;return download('x');}});
  assert.equal(receipts.length,1);assert.equal(receipts[0].entryId,null);assert.equal(receipts[0].originalPath,'receipts/u/e1.jpg');assert.equal(receipts.skippedForeignCount,1);assert.equal(resolves,1);assert.equal(downloads,1);
});

test('missing references and ordinary download failures are safely omitted without changing state',async()=>{
  const missingState=baseState([entry('e1','receipts/u/missing.jpg',null)]),failedState=baseState([entry('e1',null,'https://example.test/fail.jpg')]),beforeMissing=JSON.stringify(missingState),beforeFailed=JSON.stringify(failedState);
  const missing=await Backup.collectReceipts({state:missingState,user:{uid:'u'},...owned,storageUrl:async()=>{throw Object.assign(new Error('private path'),{code:'storage/object-not-found'});},listStorage:async()=>[],download});
  const failedDownload=await Backup.collectReceipts({state:failedState,download:async()=>{throw new Error('private URL failed');}});
  assert.equal(missing.length,0);assert.equal(missing.skippedUnavailableCount,1);assert.equal(failedDownload.length,0);assert.equal(failedDownload.skippedUnavailableCount,1);
  assert.equal(JSON.stringify(missingState),beforeMissing);assert.equal(JSON.stringify(failedState),beforeFailed);
});

test('offline/auth failures remain distinct from an HTTP receipt failure',async()=>{
  const offline=await Backup.collectReceipts({state:baseState([entry('e1',null,'https://example.test/offline.jpg')]),download:async()=>{throw Object.assign(new Error('Failed to fetch'),{code:'auth/network-request-failed'});}}).then(()=>null,error=>error);
  const unauthenticated=await Backup.collectReceipts({state:baseState([entry('e1','receipts/u/private.jpg',null)]),user:{uid:'u'},...owned,storageUrl:async()=>{throw Object.assign(new Error('sign in'),{code:'storage/unauthenticated'});},listStorage:async()=>[],download}).then(()=>null,error=>error);
  const orphanOffline=await Backup.collectReceipts({state:baseState(),user:{uid:'u'},...owned,listStorage:async()=>[{fullPath:'receipts/u/orphan.jpg',getDownloadURL:async()=>{throw Object.assign(new Error('offline'),{code:'storage/network-request-failed'});}}],download}).then(()=>null,error=>error);
  assert.equal(Backup.diagnostic(offline).category,Backup.CATEGORIES.AUTH_CONNECTIVITY);assert.equal(Backup.diagnostic(unauthenticated).category,Backup.CATEGORIES.AUTH_CONNECTIVITY);assert.equal(Backup.diagnostic(orphanOffline).category,Backup.CATEGORIES.AUTH_CONNECTIVITY);
});

test('minimum required failure taxonomy remains distinct with a generic unknown fallback',()=>{
  const cases=[
    [Object.assign(new Error('offline'),{code:'auth/network-request-failed'}),Backup.CATEGORIES.AUTH_CONNECTIVITY],
    [new Error('Receipt payload exceeds the portable-backup limit'),Backup.CATEGORIES.SIZE_LIMIT],
    [new Error('ZIP support is unavailable'),Backup.CATEGORIES.ZIP_RUNTIME],
    [new Error('Receipt manifest contains an invalid path'),Backup.CATEGORIES.ARCHIVE_VALIDATION],
    [Backup.failure(Backup.CATEGORIES.BROWSER_DOWNLOAD),Backup.CATEGORIES.BROWSER_DOWNLOAD],
    [new Error('unexpected private detail'),Backup.CATEGORIES.UNKNOWN]
  ];
  const messages=new Set();for(const [error,category] of cases){assert.equal(Backup.diagnostic(error).category,category);messages.add(Backup.message(error));}
  assert.equal(messages.size,cases.length);
});

test('Full Backup retained-data export remains available to Free, Plus, Pro and expired users',()=>{
  const now=2_000_000_000_000,snapshots=[
    {paidTier:'free',subscriptionStatus:'inactive'},
    {paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:now+86400000,serverVerifiedAt:now},
    {paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:now+86400000,serverVerifiedAt:now},
    {paidTier:'free',lastPaidTier:'pro',subscriptionStatus:'expired',currentPeriodEnd:now-1,serverVerifiedAt:now}
  ];
  for(const snapshot of snapshots)assert.equal(CompanyAccess.decide({action:'full_backup',snapshot,now,hasExistingLtdData:true}).allowed,true);
});
