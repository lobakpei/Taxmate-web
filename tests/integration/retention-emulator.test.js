'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{getStorage}=require('firebase-admin/storage');
const {assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {initializeTestEnvironment,setDoc,rawSetDoc}=require('../helpers/receipt-admitted-client');
const {doc,getDoc,collection,query,where,getDocs}=require('firebase/firestore');
const {ref,getBytes,uploadBytes,listAll}=require('firebase/storage');
const {make}=require('../test-fixture'),Policy=require('../../src/core/retention-policy'),LtdSync=require('../../src/core/ltd-sync'),State=require('../../src/integration/ltd/company-state'),Worker=require('../../functions/retention-worker');
const ready=!!process.env.FIRESTORE_EMULATOR_HOST&&!!process.env.FIREBASE_STORAGE_EMULATOR_HOST,run=ready?test:test.skip,projectId='demo-taxmate';
const june=Date.UTC(2026,5,1),april=Date.UTC(2027,3,5,23),free={paidTier:'free',subscriptionStatus:'canceled',lastPaidTier:'pro',currentPeriodEnd:june};
let app,db,bucket,env,count=0;
if(ready)test.before(async()=>{Worker.assertDemoEnvironment(projectId);app=initializeApp({projectId,storageBucket:projectId+'.appspot.com'},'retention-suite');db=getFirestore(app);bucket=getStorage(app).bucket();env=await initializeTestEnvironment({projectId,firestore:{rules:fs.readFileSync(path.join(__dirname,'../../firestore.rules'),'utf8')},storage:{rules:fs.readFileSync(path.join(__dirname,'../../storage.rules'),'utf8')}});});
test.after(async()=>{if(env)await env.cleanup();if(app)await deleteApp(app);});
async function seed(){
 const uid='retention-'+process.pid+'-'+(++count),state=make().driver.state;
 const old=state.entries[0];old.receiptPath=`receipts/${uid}/old.jpg`;old.receiptUrl=null;
 state.entries.push({...old,id:'new-year',date:'2027-04-06',receiptPath:`receipts/${uid}/new.jpg`});state.yearData['2027-28']={mileage:17};
 state.domain.economicEvents.find(e=>e.origin==='company_v1_5').sourceTransaction.date='2027-04-06';State.validateState(state);
 await db.doc(`users/${uid}`).set({displayName:'Account identity survives'});await db.doc(`users/${uid}/entitlements/current`).set(free);
 const meta={...state};delete meta.entries;delete meta.tombstones;delete meta.domain;await db.doc(`users/${uid}/app/meta`).set(meta);
 for(const entry of state.entries)await db.doc(`users/${uid}/entries/${entry.id}`).set(entry);
 const known=new Set(state.domain.entities.filter(e=>e.type==='limited_company').map(e=>e.id));for(const [c,rows]of Object.entries(LtdSync.recordsForSync(state)))for(const r of rows)await db.doc(`users/${uid}/ltd/v1/${c}/${Policy.docId(r.id)}`).set(Policy.envelope(c,r,LtdSync.companyIdForRecord(c,r,known),0));
 await db.doc(`partnerships/${uid}`).set({createdBy:uid,name:'Protected shared books'});for(const member of [uid,'other-'+uid])await db.doc(`partnerships/${uid}/members/${member}`).set({uid:member,role:'member'});
 await db.doc(`partnerships/${uid}/entries/shared-old`).set({...old,id:'shared-old',receiptPath:`receipts/${uid}/shared.jpg`});
 for(const name of ['old','new','shared','orphan'])await bucket.file(`receipts/${uid}/${name}.jpg`).save(Buffer.from([255,216,255,217]),{metadata:{contentType:'image/jpeg'}});
 return{uid,state};
}
const invoke=(uid,extra={})=>Worker.retentionRun({db,bucket,uid,projectId,now:()=>april,...extra});
async function admissionCopies(uid,state){
 const Admission=require('../../functions/receipt-admission'),entry=state.entries[0],metaTarget=`users/${uid}/app/meta`,ltd=(await db.collection(`users/${uid}/ltd/v1/economicEvents`).get()).docs[0];
 // Same original R3 full-payload storage shapes as the independent red probe,
 // including a legacy LTD permit with no R4 top-level retentionEpoch field.
 const rows=[{path:`users/${uid}/entries/${entry.id}/receiptAdmissions/${uid}`,value:{uid,target:`users/${uid}/entries/${entry.id}`,payload:{...entry,note:'OLD CONFIDENTIAL ABANDONED DRAFT'}}},{path:metaTarget+`/receiptAdmissions/${uid}`,value:{uid,target:metaTarget,payload:{...(await db.doc(metaTarget).get()).data(),note:'OLD META DRAFT'}}},{path:`users/${uid}/receiptLtdAdmissions/current`,value:{uid,records:{economicEvents:{[ltd.id]:ltd.data()}}}},{path:`partnerships/${uid}/entries/shared-old/receiptAdmissions/${uid}`,value:{uid,target:`partnerships/${uid}/entries/shared-old`,payload:{...entry,id:'shared-old',note:'OLD SHARED DRAFT'}}}];
 for(const row of rows)await db.doc(row.path).set({...row.value,receiptPaths:[...Admission.receiptPaths(row.value)],token:'r3-legacy-'+row.path,expiresAt:Date.now()+120000});
 return rows;
}
run('R4 original abandoned-copy red scenario is green: annual retention physically clears ordinary/meta/LTD/shared copies and preserves new year and other members',async()=>{
 const {uid,state}=await seed(),rows=await admissionCopies(uid,state),client=env.authenticatedContext(uid).firestore(),other=env.authenticatedContext('other-'+uid).firestore();
 const result=await invoke(uid);assert.equal(result.status,'complete');
 assert.equal((await db.doc(`users/${uid}/entries/${state.entries[0].id}`).get()).exists,false);
 for(const row of rows){assert.equal((await db.doc(row.path).get()).exists,false,row.path);await assertFails(getDoc(doc(client,row.path)));}
 await assertFails(getDoc(doc(client,`partnerships/${uid}/entries/shared-old`)));assert.equal((await getDoc(doc(other,`partnerships/${uid}/entries/shared-old`))).exists(),true);
 assert.equal((await db.doc(`users/${uid}/entries/new-year`).get()).exists,true);assert.equal((await bucket.file(`receipts/${uid}/shared.jpg`).exists())[0],true);
 const fresh={...state.entries.find(r=>r.id==='new-year'),id:'r4-fresh',retentionEpoch:1};await setDoc(doc(client,`users/${uid}/entries/${fresh.id}`),fresh);assert.equal((await getDoc(doc(client,`users/${uid}/entries/${fresh.id}`))).exists(),true);
});
run('R4 admission cleanup failure cannot report retention complete; retry after worker loss clears the same durable copies',async()=>{
 const {uid,state}=await seed(),rows=await admissionCopies(uid,state);let fail=true;
 await assert.rejects(invoke(uid,{hooks:{admissions:{beforeDelete:async()=>{if(fail){fail=false;throw Error('injected_admission_cleanup_failure');}}}}}),/injected_admission_cleanup_failure/);
 const failed=(await db.doc(`users/${uid}/retention/current`).get()).data();assert.equal(failed.status,'failed');assert.equal(failed.failedStage,'admissions');assert.equal((await db.doc(`users/${uid}/entries/${state.entries[0].id}`).get()).exists,true);
 const result=await invoke(uid);assert.equal(result.status,'complete');assert.equal(result.epoch,failed.epoch);for(const row of rows)assert.equal((await db.doc(row.path).get()).exists,false);
});
run('R4 renewed Plus preserves the ledger while expired draft copies are independently removed; new valid data survives',async()=>{
 const {uid,state}=await seed();await db.doc(`users/${uid}/entitlements/current`).set({paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:Date.UTC(2028,0,1)});
 const Admission=require('../../functions/receipt-admission'),Life=require('../../functions/receipt-admission-lifecycle'),client=env.authenticatedContext(uid).firestore(),target=`users/${uid}/entries/${state.entries[0].id}`;
 const old=await Admission.prepareWrite({db,uid,target,payload:state.entries[0]});assert.equal((await invoke(uid)).status,'not_due');assert.equal((await getDoc(doc(client,target))).exists(),true);
 await Life.cleanupAdmission({db,path:old.path,now:()=>Date.now()+Admission.ADMISSION_MS+1});assert.equal((await db.doc(old.path).get()).exists,false);assert.equal((await getDoc(doc(client,target))).exists(),true);
 const next={...state.entries[0],id:'renewed-valid',receiptPath:null,receiptUrl:null};await setDoc(doc(client,`users/${uid}/entries/${next.id}`),next);assert.equal((await db.doc(`users/${uid}/entries/${next.id}`).get()).exists,true);
});
run('R3 one receipt deletion failure leaves a durable retry but does not strand account retention or new Free records',async()=>{
 const {uid}=await seed(),Cleanup=require('../../functions/receipt-cleanup'),photo=`receipts/${uid}/orphan.jpg`;
 const failing={getFiles:options=>bucket.getFiles(options),file:name=>{const file=bucket.file(name);return name===photo?{getMetadata:()=>file.getMetadata(),delete:async()=>{throw Error('injected_retention_storage_failure');}}:file;}};
 const result=await invoke(uid,{bucket:failing});assert.equal(result.status,'complete_with_warnings');assert.ok(result.warningCodes.includes('receipt_cleanup_pending'));assert.equal(result.counts.pendingReceipts,1);
 const client=env.authenticatedContext(uid).firestore(),record={id:'post-failure-free',date:'2027-04-06',amount:5,kind:'income',createdAt:1,updatedAt:1,deviceId:'r3',schemaVersion:5,retentionEpoch:1,receiptPath:null,receiptUrl:null};await setDoc(doc(client,`users/${uid}/entries/${record.id}`),record);
 await Cleanup.recoverPending({db,bucket});assert.equal((await bucket.file(photo).exists())[0],false);await Cleanup.reconcileRetentionCleanup({db,uid,epoch:1});const control=(await db.doc(`users/${uid}/retention/current`).get()).data();assert.equal(control.status,'complete');assert.equal(control.counts.pendingReceipts,0);assert.equal(control.receiptCleanupPending,false);
});
async function cloudState(uid){const meta=(await db.doc(`users/${uid}/app/meta`).get()).data(),entries=(await db.collection(`users/${uid}/entries`).get()).docs.map(d=>({data:d.data()})),ltd=[];for(const c of Policy.LTD_COLLECTIONS)for(const d of (await db.collection(`users/${uid}/ltd/v1/${c}`).get()).docs)ltd.push({data:d.data()});return State.migrate(Worker.stateFromCloud(meta,entries,ltd),april,'retention-check');}
run('June expiry retains through London April 5; December Plus resumption prevents deletion',async()=>{
 const {uid}=await seed();assert.equal((await invoke(uid,{now:()=>april-1})).status,'not_due');
 await db.doc(`users/${uid}/entitlements/current`).set({...free,paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:Date.UTC(2028,0,1)});
 assert.equal((await invoke(uid)).status,'not_due');assert.equal((await db.doc(`users/${uid}/entries/entry-001`).get()).exists,true);
});
run('physical deletion preserves new-year books, balances, identity and other-member shared resources; epoch rejects old clients',async()=>{
 const {uid,state}=await seed(),result=await invoke(uid);assert.equal(result.status,'complete');assert.equal(result.epoch,1);
 const restored=await cloudState(uid);assert.equal(State.validateState(restored),true);assert.deepEqual(restored.entries.map(e=>e.id),['new-year']);assert.deepEqual(restored.yearData['2027-28'],{mileage:17});
 assert.equal(restored.domain.companyLossRecords[0].remainingMinor,state.domain.companyLossRecords[0].remainingMinor);
 assert.equal((await db.doc(`users/${uid}`).get()).data().displayName,'Account identity survives');assert.equal((await db.doc(`users/${uid}/entitlements/current`).get()).data().paidTier,'free');
 for(const name of ['old','orphan'])assert.equal((await bucket.file(`receipts/${uid}/${name}.jpg`).exists())[0],false);for(const name of ['new','shared'])assert.equal((await bucket.file(`receipts/${uid}/${name}.jpg`).exists())[0],true);
 const client=env.authenticatedContext(uid).firestore(),other=env.authenticatedContext('other-'+uid).firestore();
 await assertFails(getDoc(doc(client,`partnerships/${uid}/entries/shared-old`)));await assertSucceeds(getDoc(doc(other,`partnerships/${uid}/entries/shared-old`)));
 await assertFails(rawSetDoc(doc(client,`users/${uid}/entries/replayed`),{...state.entries[0],id:'replayed'}));
 await assertFails(setDoc(doc(client,`users/${uid}/entries/replayed-no-receipt`),{...state.entries[0],id:'replayed-no-receipt',receiptPath:null,receiptUrl:null}));
 await assertSucceeds(setDoc(doc(client,`users/${uid}/entries/new-live`),{...restored.entries[0],id:'new-live',retentionEpoch:1}));
 assert.equal((await getDocs(query(collection(client,`users/${uid}/entries`),where('retentionEpoch','==',1)))).size,2);
 await db.doc(`users/${uid}/entitlements/current`).set({paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:Date.UTC(2028,0,1)},{merge:true});assert.equal((await invoke(uid)).status,'not_due');assert.equal((await db.doc(`users/${uid}/entries/${state.entries[0].id}`).get()).exists,false);
});
run('partial writes retry the immutable plan in the same epoch and preserve a concurrent paid reactivation',async()=>{
 const {uid}=await seed();let expected;
 await assert.rejects(invoke(uid,{hooks:{afterPlan:async()=>{expected=(await db.doc(`users/${uid}/retentionJobs/1`).get()).data().fingerprint;},afterBatch:async()=>{throw Error('injected_partial_failure');}}}),/injected_partial_failure/);
 assert.equal((await db.doc(`users/${uid}/retention/current`).get()).data().status,'failed');
 await db.doc(`users/${uid}/entitlements/current`).set({paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:Date.UTC(2028,0,1)},{merge:true});
 const result=await invoke(uid);assert.equal(result.epoch,1);assert.equal(result.fingerprint,expected);assert.equal(State.validateState(await cloudState(uid)),true);assert.equal((await db.doc(`users/${uid}/entitlements/current`).get()).data().paidTier,'plus');assert.equal((await db.doc(`users/${uid}/retentionJobs/1`).get()).exists,false);
});
run('live lease excludes a second worker; lost worker cannot replace newer completion with failed',async()=>{
 const {uid}=await seed();let time=april,inner;
 await assert.rejects(invoke(uid,{now:()=>time,leaseMs:1000,hooks:{afterPlan:async()=>{assert.equal((await invoke(uid,{now:()=>time})).status,'busy');time+=1001;inner=await invoke(uid,{now:()=>time});}}}),/retention_lease_lost|retention_plan_incomplete/);
 assert.equal(inner.status,'complete');assert.equal((await db.doc(`users/${uid}/retention/current`).get()).data().status,'complete');
});
run('purging locks own reads/writes while an unrelated member keeps access; forged membership floors cannot unlock history',async()=>{
 const {uid,state}=await seed(),client=env.authenticatedContext(uid).firestore(),other=env.authenticatedContext('other-'+uid).firestore();
 await invoke(uid,{hooks:{afterPlan:async()=>{
   await assertFails(getDoc(doc(client,`users/${uid}/entries/${state.entries[0].id}`)));
   await assertFails(setDoc(doc(client,`users/${uid}/entries/x`),{...state.entries[0],id:'x',retentionEpoch:1}));
   await assertSucceeds(getDoc(doc(other,`partnerships/${uid}/entries/shared-old`)));
   await assertFails(setDoc(doc(client,`partnerships/${uid}/members/${uid}`),{retentionCutoffDate:'2000-01-01'},{merge:true}));
 }}});
});
run('Storage enforces due, in-progress and completed epochs while preserving paid access and new-year receipt reads',async()=>{
 const {uid}=await seed(),storage=env.authenticatedContext(uid).storage('gs://demo-taxmate.appspot.com'),image=ref(storage,`receipts/${uid}/new.jpg`),bytes=new Uint8Array([255,216,255,217]);
 await db.doc(`users/${uid}/entitlements/current`).set({accountRetention:{purgeRequired:true,requiredCutoffDate:'2027-04-06'}},{merge:true});await assertFails(getBytes(image));
 await invoke(uid,{hooks:{afterPlan:async()=>{await assertFails(getBytes(image));await assertFails(uploadBytes(ref(storage,`receipts/${uid}/while-purging.jpg`),bytes,{contentType:'image/jpeg',customMetadata:{retentionEpoch:'1'}}));}}});
 assert.equal((await bucket.file(`receipts/${uid}/new.jpg`).getMetadata())[0].metadata.retentionEpoch,'1');await assertSucceeds(getBytes(image));await assertSucceeds(listAll(ref(storage,`receipts/${uid}`)));
 await assertFails(uploadBytes(ref(storage,`receipts/${uid}/free-upload.jpg`),bytes,{contentType:'image/jpeg',customMetadata:{retentionEpoch:'1'}}));
 await db.doc(`users/${uid}/entitlements/current`).set({paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:Date.now()+86400000},{merge:true});
 await assertFails(uploadBytes(ref(storage,`receipts/${uid}/stale-upload.jpg`),bytes,{contentType:'image/jpeg'}));
 await assertSucceeds(uploadBytes(ref(storage,`receipts/${uid}/paid-current.jpg`),bytes,{contentType:'image/jpeg',customMetadata:{retentionEpoch:'1'}}));
});
