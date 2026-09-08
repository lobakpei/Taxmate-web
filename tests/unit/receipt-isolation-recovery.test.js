'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Admission=require('../../functions/receipt-admission');
const read=name=>fs.readFileSync(path.join(__dirname,'../..',name),'utf8');
test('R3 recursive receipt discovery covers legacy paths/URLs, different owners and nested LTD payloads',()=>{
 const a='receipts/alice/old.jpg',b='receipts/bob/shared.jpg';
 assert.deepEqual([...Admission.receiptPaths({payload:{evidence:[a,{url:'http://localhost/o/'+encodeURIComponent(b)+'?alt=media'}]},deleted:{deletedAt:1,path:'receipts/gone/x.jpg'}})].sort(),[a,b]);
 assert.deepEqual([...Admission.receiptPaths({deletedAt:1,path:a})],[]);
 for(const name of ['old receipt.jpg','literal%20name.jpg','question?.jpg','fragment#.jpg','old receipt%20?#.jpg']){
   const p='receipts/legacy/'+name;
   assert.equal(Admission.receiptPaths({receiptPath:p}).has(p),true,'raw legacy name '+name);
   assert.equal(Admission.receiptPaths({payload:{url:'http://localhost/o/'+encodeURIComponent(p)+'?alt=media'}}).has(p),true,'URL legacy name '+name);
 }
});
test('R3 target admission cannot mint cross-user, control, entitlement or arbitrary collection permits',()=>{
 for(const target of ['users/bob/entries/e','users/alice/entitlements/current','receiptObjects/alice/files/x','users/alice/retention/current','users/alice/ltd/v1/unknown/x','users/alice/app/meta/nested/x'])assert.equal(Admission.permittedTarget('alice',target),false,target);
 for(const target of ['users/alice/entries/e','users/alice/app/meta','users/alice/ltd/v1/economicEvents/e','partnerships/shared/entries/e'])assert.equal(Admission.permittedTarget('alice',target),true,target);
});
test('R3 no global write fence remains; exact admissions are server-only, expiring and atomically consumed',()=>{
 const rules=read('firestore.rules'),cleanup=read('functions/receipt-cleanup.js'),retention=read('functions/retention-worker.js');
 for(const source of [rules,cleanup,retention])assert.doesNotMatch(source,/receiptCleanupControl|opaqueReceiptWritesReady/);
 assert.match(rules,/data\.payload == request\.resource\.data/);assert.match(rules,/data\.records\[collection\]\[recordId\] == request\.resource\.data/);assert.match(rules,/!existsAfter\(path\)/);assert.match(rules,/expiresAt > request\.time\.toMillis/);
 assert.match(read('src/app/app.js'),/tx\.delete\(row\.permitRef\)/);
 assert.match(read('scripts/run-onboarding-connected-browser.js'),/const emulatorSet='auth,firestore,storage,functions'/);
});
test('R3 durable recovery precedes bytes, persists generation intent and retains demo-only retention authority',()=>{
 const cleanup=read('functions/receipt-cleanup.js'),functions=read('functions/index.js');
 assert.ok(cleanup.indexOf('receiptCleanupWakeups/')<cleanup.indexOf('ifGenerationMatch:generation'));
 assert.ok(cleanup.indexOf('deleteGeneration:generation')<cleanup.indexOf('ifGenerationMatch:generation'));
 assert.match(functions,/document:'receiptCleanupWakeups\/\{requestId\}',retry:true/);
 assert.match(functions,/exports\.recoverReceiptCleanupJobs=onSchedule/);
 assert.match(cleanup,/limit\(20\)/);assert.match(cleanup,/i\+=5/);
 assert.match(functions,/if\(process\.env\.FUNCTIONS_EMULATOR==='true'\)\{\s*exports\.runRetentionPurgeDemo/);
 assert.match(read('functions/retention-worker.js'),/receipt_cleanup_pending/);
});
