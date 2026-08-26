const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Sync=require('../../src/core/sync.js');

const entry=(id,updatedAt,deviceId='phone',extra={})=>({id,bizId:'biz-p',businessId:'biz-p',recordType:'entry',kind:'expense',date:'2026-08-24',amount:42,updatedAt,createdAt:updatedAt,deletedAt:null,deviceId,...extra});
const business=(id,name,updatedAt,deviceId='phone',extra={})=>({id,name,structure:'partnership',share:50,recordType:'business',updatedAt,createdAt:updatedAt,deletedAt:null,deviceId,...extra});

test('write failure survives terminate and reopen, then clears only after server acknowledgement',()=>{
  let box=Sync.emptyOutbox();
  box=Sync.enqueue(box,{kind:'partnership-entry',code:'PARTNER1',record:entry('e-1',100)},100);
  box=Sync.markAttempt(box,box.items[0].key,110);
  box=Sync.markFailure(box,box.items[0].key,{code:'unavailable'},120);
  const reopened=Sync.normalizeOutbox(JSON.parse(JSON.stringify(box)));
  assert.equal(reopened.items.length,1);
  assert.equal(reopened.items[0].status,'failed');
  assert.equal(Sync.due(reopened,121).length,0);
  assert.equal(Sync.due(reopened,5000).length,1);
  const acknowledged=Sync.acknowledge(reopened,reopened.items[0].key,5100);
  assert.equal(acknowledged.items.length,0);
  assert.equal(acknowledged.lastSuccessAt,5100);
});

test('offline, inbound restore, outbound retry, permission and ACK states are truthful',()=>{
  let box=Sync.enqueue(Sync.emptyOutbox(),{kind:'partnership-entry',code:'PARTNER1',record:entry('e-2',200)},200);
  assert.equal(Sync.status({outbox:box,online:false,authReady:true}).state,'offline');
  assert.equal(Sync.status({outbox:box,online:true,authReady:false}).state,'waiting');
  box=Sync.markAttempt(box,box.items[0].key,210);
  box=Sync.markFailure(box,box.items[0].key,{code:'unavailable'},220);
  const retry=Sync.status({outbox:box,online:true,authReady:true,hydrationState:'converged',partnershipHydrationState:'converged',reconciliationState:'retrying',ackState:'waiting',writeError:'network',writeErrorKind:'partnership-entry'});
  assert.equal(retry.state,'waiting');
  assert.match(retry.message,/Sync retrying/);
  assert.doesNotMatch(retry.message,/Cloud restore failed/);
  const denied=Sync.status({outbox:box,online:true,authReady:true,hydrationState:'converged',partnershipHydrationState:'converged',reconciliationState:'retrying',ackState:'waiting',writeError:'permission-denied',writeErrorKind:'partnership-entry'});
  assert.equal(denied.state,'failed');
  assert.equal(denied.message,'Partnership sync access failed — local data is safe');
  box=Sync.acknowledge(box,box.items[0].key,300);
  assert.equal(Sync.status({outbox:box,online:true,authReady:true,hydrationState:'loading',partnershipHydrationState:'loading'}).message,'Restoring cloud data…');
  const restoreFailure=Sync.status({outbox:box,online:true,authReady:true,hydrationState:'failed',partnershipHydrationState:'failed',hydrationError:'network'});
  assert.equal(restoreFailure.state,'failed');
  assert.equal(restoreFailure.message,'Cloud restore failed — will retry');
  assert.equal(Sync.status({outbox:box,online:true,authReady:true,hydrationState:'converged',partnershipHydrationState:'converged',reconciliationState:'converged',ackState:'acked'}).state,'synced');
});

test('returning account detection uses durable cloud facts rather than sign-in alone',()=>{
  assert.equal(Sync.cloudAccountState({metaExists:false,meta:{},personalRecords:[],partnershipRecords:0}).established,false);
  assert.equal(Sync.cloudAccountState({metaExists:true,meta:{businesses:[]},personalRecords:[],partnershipRecords:0}).established,false);
  assert.equal(Sync.cloudAccountState({metaExists:true,meta:{businesses:[business('existing','Existing',100)]},personalRecords:[],partnershipRecords:0}).established,true);
  assert.equal(Sync.cloudAccountState({metaExists:true,meta:{businesses:[],businessTombstones:[Sync.tombstone(business('old','Old',100),'phone',200)]},personalRecords:[],partnershipRecords:0}).established,true);
  assert.equal(Sync.cloudAccountState({metaExists:false,meta:{},personalRecords:[entry('personal',100)],partnershipRecords:0}).established,true);
  assert.equal(Sync.cloudAccountState({metaExists:false,meta:{},personalRecords:[],partnershipRecords:90}).established,true);
});

test('fresh-client flow separates inbound restore from durable outbound ACK convergence',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../../src/app/app.js'),'utf8');
  assert.doesNotMatch(app,/if\(OB\s*&&\s*!OB\._signingInFlow\)\{\s*try\{\s*obClose/);
  assert.match(app,/const result=await startUserSync\(u\);\s*applyHydratedAccountResult\(result\)/);
  assert.match(app,/if\(result\.existingCloudAccount\)\{applyHydratedAccountResult\(result\);return;\}/);
  assert.match(app,/const metaDoc=await[\s\S]*const entSnap=await[\s\S]*Promise\.all\(partnershipSubscriptions\)[\s\S]*CLOUD\.hydrationState='converged';CLOUD\.partnershipHydrationState='converged'/);
  assert.match(app,/clearUserSyncListeners\(\);CLOUD\.hydrationState='failed'[\s\S]*setTimeout\(\(\)=>\{const current=cloudUser\(\)/);
  assert.ok(app.indexOf('const metaDoc=await')<app.indexOf('await pushUserState(uid,true)'));
  assert.ok(app.indexOf('Promise.all(partnershipSubscriptions)')<app.indexOf('await pushUserState(uid,true)'));
  assert.ok(app.indexOf("CLOUD.hydrationState='converged';CLOUD.partnershipHydrationState='converged'")<app.indexOf('await pushUserState(uid,true)'));
  assert.match(app,/TaxMateSync\.reconcileRecords\(current,remote\)/);
  assert.match(app,/reconciliation\.uploads\.forEach\(record=>enqueueSyncOperation/);
  assert.match(app,/async function flushSyncForConvergence\(uid\)/);
  assert.match(app,/if\(force\) return flushSyncForConvergence\(uid\)/);
  assert.doesNotMatch(app,/throw new Error\('sync-convergence-pending'\)/);
  assert.match(app,/return outboundConvergenceState\(uid\)/);
  assert.match(app,/CLOUD\.writeError=TaxMateSync\.classifyError\(error\)[\s\S]*scheduleOutboxFlush\(5000,'account-convergence-retry'\)/);
});

test('initial partnership reconciliation queues local-only records and is idempotent after ACK',()=>{
  const local=entry('local-only',500,'phone',{desc:'Local history'});
  const first=Sync.reconcileRecords([local],[]);
  assert.deepEqual(first.uploads.map(record=>record.id),['local-only']);
  assert.deepEqual(first.merged.map(record=>record.id),['local-only']);
  let box=Sync.emptyOutbox();
  box=Sync.enqueue(box,{kind:'partnership-entry',ownerUid:'owner-a',code:'PARTNER1',record:first.uploads[0]},600);
  box=Sync.enqueue(box,{kind:'partnership-entry',ownerUid:'owner-a',code:'PARTNER1',record:first.uploads[0]},700);
  assert.equal(box.items.length,1);
  box=Sync.acknowledge(box,box.items[0].key,800,box.items[0]);
  assert.equal(box.items.length,0);
  const reopened=Sync.reconcileRecords([local],[local]);
  assert.equal(reopened.uploads.length,0);
  assert.equal(reopened.merged.length,1);
});

test('reconciliation does not overwrite newer remote records or metadata-only legacy matches',()=>{
  const local=entry('shared',500,'phone',{amount:42,desc:'Same ledger fact',taxYear:'2026-27',source:'local'});
  const newerRemote=entry('shared',700,'laptop',{amount:84,desc:'Newer remote edit'});
  const conflict=Sync.reconcileRecords([local],[newerRemote]);
  assert.equal(conflict.uploads.length,0);
  assert.equal(conflict.merged[0].amount,84);
  const legacyRemote={id:'shared',bizId:'biz-p',kind:'expense',date:'2026-08-24',amount:42,desc:'Same ledger fact'};
  const legacy=Sync.reconcileRecords([local],[legacyRemote]);
  assert.equal(Sync.sameRecordPayload(local,legacyRemote),true);
  assert.equal(legacy.uploads.length,0);
});

test('tombstones are authoritative throughout merge, reconciliation and durable outbox replacement',()=>{
  const live=entry('deleted',900,'newer-live');
  const deleted=Sync.tombstone(entry('deleted',500,'old-live'),'delete-device',600);
  const remoteDelete=Sync.reconcileRecords([live],[deleted]);
  assert.equal(remoteDelete.uploads.length,0);
  assert.equal(Sync.visible(remoteDelete.merged).length,0);
  const localDelete=Sync.reconcileRecords([deleted],[live]);
  assert.equal(localDelete.uploads.length,1);
  assert.equal(localDelete.uploads[0].deletedAt,600);
  let box=Sync.enqueue(Sync.emptyOutbox(),{kind:'partnership-entry',code:'PARTNER1',record:deleted},600);
  box=Sync.enqueue(box,{kind:'partnership-entry',code:'PARTNER1',record:live},900);
  assert.equal(box.items.length,1);
  assert.equal(box.items[0].record.deletedAt,600);
});

test('a later partnership entry supersedes stale pending data and a tombstone cannot be resurrected',()=>{
  let box=Sync.enqueue(Sync.emptyOutbox(),{kind:'partnership-entry',code:'PARTNER1',record:entry('e-3',300)},300);
  box=Sync.enqueue(box,{kind:'partnership-entry',code:'PARTNER1',record:entry('e-3',250,'laptop')},310);
  assert.equal(box.items[0].record.updatedAt,300);
  const deleted=Sync.tombstone(entry('e-3',300), 'phone', 400);
  box=Sync.enqueue(box,{kind:'partnership-entry',code:'PARTNER1',record:deleted},400);
  assert.equal(box.items.length,1);
  assert.equal(box.items[0].record.deletedAt,400);
  assert.equal(Sync.visible(Sync.mergeRecords([deleted],[entry('e-3',350,'laptop')])).length,0);
});

test('a server acknowledgement for an older in-flight write cannot clear a newer queued edit',()=>{
  let box=Sync.enqueue(Sync.emptyOutbox(),{kind:'partnership-entry',code:'PARTNER1',record:entry('e-race',100)},100);
  const inFlight=box.items[0];
  box=Sync.enqueue(box,{kind:'partnership-entry',code:'PARTNER1',record:entry('e-race',200)},200);
  box=Sync.acknowledge(box,inFlight.key,300,inFlight);
  assert.equal(box.items.length,1);
  assert.equal(box.items[0].record.updatedAt,200);
});

test('two-device stale business snapshots merge per ID and keep the newer edit',()=>{
  const local={
    businesses:[business('b-1','Newest phone name',500),business('b-2','Phone only',450)],businessTombstones:[],folders:[],folderTombstones:[],
    customCats:{},activeCats:{},yearData:{},settings:{lang:'en',theme:'auto'},metaVersions:{},updatedAt:500,deviceId:'phone'
  };
  const remote={...local,businesses:[business('b-1','Old laptop name',400,'laptop'),business('b-3','Laptop only',470,'laptop')],updatedAt:470,deviceId:'laptop'};
  const merged=Sync.mergeMeta(local,remote);
  assert.deepEqual(merged.businesses.map(x=>x.id),['b-1','b-2','b-3']);
  assert.equal(merged.businesses.find(x=>x.id==='b-1').name,'Newest phone name');
});

test('business tombstone wins over an older live business and remains recoverable evidence',()=>{
  const deleted=Sync.tombstone(business('b-4','Closed',600), 'phone', 700);
  const local={businesses:[],businessTombstones:[deleted],folders:[],folderTombstones:[],customCats:{},activeCats:{},yearData:{},settings:{},metaVersions:{},updatedAt:700,deviceId:'phone'};
  const remote={...local,businesses:[business('b-4','Stale live copy',650,'laptop')],businessTombstones:[],updatedAt:650,deviceId:'laptop'};
  const merged=Sync.mergeMeta(local,remote);
  assert.equal(merged.businesses.some(x=>x.id==='b-4'),false);
  assert.equal(merged.businessTombstones.find(x=>x.id==='b-4').deletedAt,700);
});

test('versioned nested metadata does not allow an older whole snapshot to overwrite newer values',()=>{
  const local={businesses:[],businessTombstones:[],folders:[],folderTombstones:[],customCats:{b1:{income:['new'],expense:[]}},activeCats:{},yearData:{'2026-27':{mileage:80}},settings:{lang:'en',theme:'dark'},metaVersions:{'customCats:b1':{updatedAt:900,deviceId:'phone'},'yearData:2026-27':{updatedAt:900,deviceId:'phone'},'settings:account':{updatedAt:900,deviceId:'phone'}},updatedAt:900,deviceId:'phone'};
  const remote={...local,customCats:{b1:{income:['old'],expense:[]}},yearData:{'2026-27':{mileage:10}},settings:{lang:'en',theme:'light'},metaVersions:{'customCats:b1':{updatedAt:800,deviceId:'laptop'},'yearData:2026-27':{updatedAt:800,deviceId:'laptop'},'settings:account':{updatedAt:800,deviceId:'laptop'}},updatedAt:800,deviceId:'laptop'};
  const merged=Sync.mergeMeta(local,remote);
  assert.deepEqual(merged.customCats.b1.income,['new']);
  assert.equal(merged.yearData['2026-27'].mileage,80);
  assert.equal(merged.settings.theme,'dark');
});

test('Android PWA lifecycle and auth-ready hooks retry the durable outbox without silent partnership catches',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../../src/app/app.js'),'utf8');
  for(const hook of ["addEventListener('online'","addEventListener('pageshow'","addEventListener('focus'","addEventListener('visibilitychange'","'auth-ready'","'app-open'"]){
    assert.ok(app.includes(hook),`missing retry hook ${hook}`);
  }
  assert.ok(app.includes("const SYNC_OUTBOX_KEY='taxmateuk_sync_outbox_v1'"));
  assert.ok(app.includes("SYNC_OUTBOX=TaxMateSync.acknowledge"));
  assert.ok(app.includes('data-cloud-sync-status'));
  assert.doesNotMatch(app,/function pushEntryRemote\(rec\)\{[\s\S]{0,180}hasFeature\('partnerSync'\)/);
  assert.doesNotMatch(app,/function pushBizRemote\(b\)\{[\s\S]{0,160}hasFeature\('partnerSync'\)/);
  assert.doesNotMatch(app,/cloudUser\(\)[\s\S]{0,100}ac\.cloudOn/);
  assert.doesNotMatch(app,/collection\('entries'\)[\s\S]{0,180}\.set\([^;]+\)\.catch\(\(\)=>\{\}\)/);
});
