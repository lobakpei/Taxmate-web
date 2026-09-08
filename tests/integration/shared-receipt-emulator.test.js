'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{getStorage}=require('firebase-admin/storage');
const {assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {initializeTestEnvironment,setDoc}=require('../helpers/receipt-admitted-client');
const {doc,getDoc}=require('firebase/firestore');
const {ref,deleteObject,uploadBytes,updateMetadata}=require('firebase/storage');
const Cleanup=require('../../functions/receipt-cleanup');
const Admission=require('../../functions/receipt-admission');
const ready=!!process.env.FIRESTORE_EMULATOR_HOST&&!!process.env.FIREBASE_STORAGE_EMULATOR_HOST,run=ready?test:test.skip,projectId='demo-taxmate';
let app,db,bucket,env,count=0;
if(ready)test.before(async()=>{assert.match(projectId,/^demo-/);app=initializeApp({projectId,storageBucket:projectId+'.appspot.com'},'shared-receipt-r2');db=getFirestore(app);bucket=getStorage(app).bucket();env=await initializeTestEnvironment({projectId,firestore:{rules:fs.readFileSync(path.join(__dirname,'../../firestore.rules'),'utf8')},storage:{rules:fs.readFileSync(path.join(__dirname,'../../storage.rules'),'utf8')}});});
test.after(async()=>{if(env)await env.cleanup();if(app)await deleteApp(app);});
const paid={paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:Date.now()+86400000};
async function waitFor(fn,label){const end=Date.now()+30000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error(label);}
async function seed(ownerUid){
  const n=++count,uid=ownerUid||'receipt-owner-'+process.pid+'-'+n,peer='receipt-peer-'+process.pid+'-'+n,code='R2-'+process.pid+'-'+n,path=`receipts/${uid}/existing.jpg`,url=`http://localhost/o/${encodeURIComponent(path)}?alt=media`;
  const record={id:'existing',bizId:code,businessId:code,date:'2026-09-01',kind:'expense',amount:12,createdAt:1,updatedAt:1,deletedAt:null,deviceId:'existing-device',schemaVersion:5,receiptPath:path,receiptUrl:url};
  for(const member of [uid,peer]){await db.doc(`users/${member}/entitlements/current`).set(paid);await db.doc(`partnerships/${code}/members/${member}`).set({uid:member,role:'member'});}
  await db.doc(`partnerships/${code}`).set({createdBy:uid,name:'Existing shared ledger'});
  await bucket.file(path).save(Buffer.from('existing-receipt-bytes'),{metadata:{contentType:'image/jpeg',metadata:{sharedProtected:'false'}}});
  const recordPath=`partnerships/${code}/entries/existing`;await db.doc(recordPath).set(record);
  return{uid,peer,code,path,record,recordPath,client:env.authenticatedContext(uid).firestore(),peerClient:env.authenticatedContext(peer).firestore(),storage:env.authenticatedContext(uid).storage()};
}
async function intact(s){assert.equal((await bucket.file(s.path).download())[0].toString(),'existing-receipt-bytes');assert.equal((await db.doc(s.recordPath).get()).data().deletedAt,null);}
run('R2 downgraded uploader cannot tombstone, remove, overwrite, delete or strip protection; original record and bytes survive',async()=>{
  const s=await seed();await db.doc(`users/${s.uid}/entitlements/current`).set({paidTier:'free',subscriptionStatus:'canceled'});
  await assertFails(setDoc(doc(s.client,s.recordPath),{...s.record,updatedAt:2,deletedAt:2}));
  await assertFails(setDoc(doc(s.client,s.recordPath),{...s.record,updatedAt:2,receiptPath:null,receiptUrl:null}));
  await assertFails(deleteObject(ref(s.storage,s.path)));await assertFails(updateMetadata(ref(s.storage,s.path),{customMetadata:{sharedProtected:null}}));
  await assertFails(uploadBytes(ref(s.storage,s.path),Buffer.from('replacement'),{contentType:'image/jpeg'}));
  assert.equal((await Cleanup.cleanupReceipt({db,bucket,path:s.path})).status,'referenced');await intact(s);
});
run('R2 membership loss and retention cutoff reject stale direct mutations while preserving bytes',async()=>{
  const s=await seed();await db.doc(`partnerships/${s.code}/members/${s.uid}`).delete();await assertFails(setDoc(doc(s.client,s.recordPath),{...s.record,deletedAt:3,updatedAt:3}));await intact(s);
  await db.doc(`partnerships/${s.code}/members/${s.uid}`).set({uid:s.uid,retentionCutoffDate:'2027-04-06'});await assertFails(setDoc(doc(s.client,s.recordPath),{...s.record,receiptPath:null,receiptUrl:null,updatedAt:4}));await intact(s);
});
run('R2 authorised peer removes an uploader receipt without all-partners consent; accepted trigger deletes bytes and peer sees removal',async()=>{
  const s=await seed();await assertSucceeds(setDoc(doc(s.peerClient,s.recordPath),{...s.record,receiptPath:null,receiptUrl:null,updatedAt:5}));
  assert.equal((await getDoc(doc(s.client,s.recordPath))).data().receiptPath,null);
  await waitFor(async()=>!(await bucket.file(s.path).exists())[0],'accepted shared removal did not clean bytes');
});
run('R2 authorised shared tombstone cleans bytes only after the committed write',async()=>{
  const s=await seed();await intact(s);await assertSucceeds(setDoc(doc(s.peerClient,s.recordPath),{...s.record,deletedAt:6,updatedAt:6}));
  assert.equal((await getDoc(doc(s.client,s.recordPath))).data().deletedAt,6);
  await waitFor(async()=>!(await bucket.file(s.path).exists())[0],'accepted shared delete did not clean bytes');
});
run('R2 another active shared reference protects bytes until its own authorised removal',async()=>{
  const s=await seed(),other=`partnerships/${s.code}/entries/other`;await db.doc(other).set({...s.record,id:'other'});
  await assertSucceeds(setDoc(doc(s.peerClient,s.recordPath),{...s.record,deletedAt:7,updatedAt:7}));
  await waitFor(async()=>(await db.doc(`receiptObjects/${s.uid}/files/existing.jpg`).get()).data()?.status==='available','reference guard not observed');
  assert.equal((await bucket.file(s.path).exists())[0],true);
  await assertSucceeds(setDoc(doc(s.peerClient,other),{...s.record,id:'other',deletedAt:8,updatedAt:8}));
  await waitFor(async()=>!(await bucket.file(s.path).exists())[0],'last active reference removal did not clean bytes');
});
run('R2 cleanup lock rejects concurrent aliases and nested metadata references; deleted names cannot be recreated',async()=>{
  const s=await seed(),orphan=`receipts/${s.uid}/orphan.jpg`;await bucket.file(orphan).save(Buffer.from('orphan'),{metadata:{contentType:'image/jpeg'}});
  const result=await Cleanup.cleanupReceipt({db,bucket,path:orphan,hooks:{afterLock:async()=>{
    const add={...s.record,id:'race',receiptPath:orphan,receiptUrl:`http://localhost/o/${encodeURIComponent(orphan)}?alt=media`};
    await assert.rejects(setDoc(doc(s.client,`users/${s.uid}/entries/race`),add),/receipt_reference_unavailable/);
    await assert.rejects(setDoc(doc(s.client,`users/${s.uid}/entries/url-only`),{...add,id:'url-only',receiptPath:null}),/receipt_reference_unavailable/);
    await assert.rejects(setDoc(doc(s.client,`users/${s.uid}/entries/alias`),{...add,id:'alias',receiptPath:`receipts/${s.uid}/different.jpg`}),/receipt_reference_unavailable/);
    await assert.rejects(setDoc(doc(s.client,`users/${s.uid}/app/meta`),{nested:{receiptPath:orphan}}),/receipt_reference_unavailable/);
  }}});assert.equal(result.status,'deleted');await assertFails(uploadBytes(ref(s.storage,orphan),Buffer.from('recreated'),{contentType:'image/jpeg'}));
});
require('./receipt-isolation-scenarios')(run,()=>({db,bucket,env,seed,waitFor}));
require('./admission-lifecycle-scenarios')(run,()=>({db,bucket,env,seed,waitFor}));
run('R2 Free ordinary personal deletion remains allowed and invokes reference-safe cleanup',async()=>{
  const s=await seed(),personalPath=`users/${s.uid}/entries/personal`,photo=`receipts/${s.uid}/personal.jpg`,record={...s.record,id:'personal',receiptPath:photo,receiptUrl:null};
  await bucket.file(photo).save(Buffer.from('personal'),{metadata:{contentType:'image/jpeg'}});await db.doc(personalPath).set(record);await db.doc(`users/${s.uid}/entitlements/current`).set({paidTier:'free',subscriptionStatus:'canceled'});
  await assertSucceeds(setDoc(doc(s.client,personalPath),{...record,updatedAt:9,deletedAt:9}));await waitFor(async()=>!(await bucket.file(photo).exists())[0],'Free personal cleanup failed');await intact(s);
});
run('R2 retained LTD references and account-reset cleanup cannot remove another active shared receipt',async()=>{
  const s=await seed();assert.equal((await Cleanup.cleanupReceipt({db,bucket,path:s.path,ignorePersonalUid:s.uid})).status,'referenced');
  const photo=`receipts/${s.uid}/ltd.jpg`;await bucket.file(photo).save(Buffer.from('ltd'),{metadata:{contentType:'image/jpeg'}});await db.doc(`users/${s.uid}/ltd/v1/economicEvents/evidence`).set({deletedAt:null,payload:{evidence:{receiptPath:photo}}});
  assert.equal((await Cleanup.cleanupReceipt({db,bucket,path:photo})).status,'referenced');assert.equal((await bucket.file(photo).exists())[0],true);
});
run('R2 real callable rejects non-owners, preserves an active shared receipt and keeps Free current-year orphan cleanup after retention',async()=>{
  const signup=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})});assert.equal(signup.ok,true);const user=await signup.json(),s=await seed(user.localId);
  const call=async path=>{const response=await fetch(`http://${process.env.FUNCTIONS_EMULATOR_HOST}/demo-taxmate/europe-west2/cleanupReceipt`,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+user.idToken},body:JSON.stringify({data:{path}})});return{status:response.status,body:await response.json()};};
  await db.doc(`users/${s.uid}/entitlements/current`).set({paidTier:'free',subscriptionStatus:'canceled'});
  assert.equal((await call(`receipts/${s.peer}/anything.jpg`)).status,403);assert.equal((await call(s.path)).body.result.status,'referenced');await intact(s);
  await db.doc(`users/${s.uid}/entitlements/current`).set({paidTier:'free',subscriptionStatus:'canceled',currentPeriodEnd:Date.UTC(2025,5,1)});
  await db.doc(`users/${s.uid}/retention/current`).set({schemaVersion:2,status:'complete',epoch:1,epochString:'1',cutoffDate:'2026-04-06',deleteOnDate:'2026-04-06',retainThroughDate:'2026-04-05'});
  const photo=`receipts/${s.uid}/current-year-orphan.jpg`;await bucket.file(photo).save(Buffer.from('new-year'),{metadata:{contentType:'image/jpeg',metadata:{retentionEpoch:'1'}}});
  const cleaned=await call(photo);assert.equal(cleaned.status,200);assert.equal(cleaned.body.result.status,'deleted');assert.equal((await bucket.file(photo).exists())[0],false);
});
run('R3 failed cleanup fences only its own receipt; independent cleanup succeeds and durable recovery needs no caller',async()=>{
  const s=await seed(),photo=`receipts/${s.uid}/retry.jpg`;await bucket.file(photo).save(Buffer.from('retry'),{metadata:{contentType:'image/jpeg'}});
  await Cleanup.jobRef(db,photo).set({path:photo,status:'pending'});
  await assert.rejects(Cleanup.cleanupReceipt({db,bucket,path:photo,queued:true,hooks:{afterLock:async()=>{throw Error('injected_cleanup_failure');}}}),/injected_cleanup_failure/);
  assert.equal((await bucket.file(photo).download())[0].toString(),'retry');assert.equal((await db.doc('receiptCleanupControl/current').get()).exists,false);
  assert.equal((await Cleanup.cleanupReceipt({db,bucket,path:`receipts/${s.uid}/unrelated.jpg`})).status,'deleted');
  await Cleanup.recoverPending({db,bucket});assert.equal((await bucket.file(photo).exists())[0],false);
  await assertSucceeds(setDoc(doc(s.client,`users/${s.uid}/entries/legacy-url`),{...s.record,id:'legacy-url',receiptPath:null,receiptUrl:'https://example.test/legacy.jpg'}));
});
