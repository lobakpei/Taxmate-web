'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{fork}=require('node:child_process');
const {doc,writeBatch}=require('firebase/firestore'),{ref,uploadBytes}=require('firebase/storage');
const {assertFails}=require('@firebase/rules-unit-testing');
const {setDoc,rawSetDoc}=require('../helpers/receipt-admitted-client');
const Cleanup=require('../../functions/receipt-cleanup'),Admission=require('../../functions/receipt-admission'),Ltd=require('../../src/core/ltd-sync');
module.exports=function register(run,context){
  let serial=0;
  async function fixture(fileName='r3-orphan.jpg'){
    const c=context(),a=await c.seed(),b=await c.seed(),company='company:r3-'+(++serial);
    await c.db.doc(`users/${b.uid}/ltdControl/activeCompany`).set({status:'active_slot_claimed',activeCompanyId:company});
    const photo=`receipts/${a.uid}/${fileName}`;await c.bucket.file(photo).save(Buffer.from('R3 immutable original'),{metadata:{contentType:'image/jpeg'}});
    await Cleanup.jobRef(c.db,photo).set({path:photo,status:'pending'});
    async function independent(label){
      const id='b-'+label+'-'+(++serial),record={...b.record,id,receiptPath:null,receiptUrl:null};
      await setDoc(doc(b.client,`users/${b.uid}/entries/${id}`),record);
      const freeUid='free-'+b.uid,freeClient=c.env.authenticatedContext(freeUid).firestore();
      await setDoc(doc(freeClient,`users/${freeUid}/entries/${id}`),record);
      await setDoc(doc(b.peerClient,`partnerships/${b.code}/entries/${id}`),record);
      await setDoc(doc(b.client,`users/${b.uid}/app/meta`),{nested:{receiptUrl:b.record.receiptUrl},label});
      const envelope=Ltd.envelope('economicEvents',{id,entityId:company,updatedAt:1,createdAt:1,evidenceRefs:[b.path]},company);
      await setDoc(doc(b.client,`users/${b.uid}/ltd/v1/economicEvents/${envelope.documentId}`),envelope);
      const own=`receipts/${b.uid}/${id}.jpg`;await uploadBytes(ref(b.storage,own),Buffer.from('B independent photo'),{contentType:'image/jpeg'});
      assert.equal((await Cleanup.cleanupReceipt({db:c.db,bucket:c.bucket,path:own})).status,'deleted');
      assert.equal((await c.db.doc(`users/${b.uid}/entries/${id}`).get()).data().amount,record.amount);
      assert.equal((await c.bucket.file(b.path).exists())[0],true,'B active receipt survives A cleanup');
    }
    return{...c,a,b,photo,independent};
  }
  run('R3 A normal cleanup and injected failure never block unrelated B ordinary/shared/LTD/meta/receipt writes',async()=>{
    const f=await fixture();await f.independent('before');
    await assert.rejects(Cleanup.cleanupReceipt({db:f.db,bucket:f.bucket,path:f.photo,queued:true,hooks:{afterLock:async()=>{await f.independent('during');throw Error('injected_A_failure');}}}),/injected_A_failure/);
    assert.equal((await f.bucket.file(f.photo).exists())[0],true);await f.independent('after-failure');
    // Even a stale historical R2 global document cannot affect any new writer.
    await f.db.doc('receiptCleanupControl/current').set({locked:true,path:f.photo});await f.independent('legacy-global-ignored');await f.db.doc('receiptCleanupControl/current').delete();
    await Cleanup.recoverPending({db:f.db,bucket:f.bucket});assert.equal((await f.bucket.file(f.photo).exists())[0],false);
  });
  run('R3 parallel cleanup takes different file leases; duplicate same-file dispatch remains fenced',async()=>{
    const f=await fixture(),other=`receipts/${f.a.uid}/parallel.jpg`;await f.bucket.file(other).save(Buffer.from('parallel'));await Cleanup.jobRef(f.db,other).set({path:other,status:'pending'});
    let open;const barrier=new Promise(resolve=>{open=resolve;}),reached=[];
    const hold=async file=>{reached.push(file);if(reached.length===2)open();await barrier;};
    const runs=[f.photo,other].map(file=>Cleanup.cleanupReceipt({db:f.db,bucket:f.bucket,path:file,queued:true,hooks:{afterLock:async()=>{await hold(file);if(file===f.photo){assert.equal((await Cleanup.cleanupReceipt({db:f.db,bucket:f.bucket,path:file,queued:true})).status,'busy');await f.independent('parallel');}}}}));
    assert.deepEqual((await Promise.all(runs)).map(r=>r.status),['deleted','deleted']);
  });
  for(const ack of ['before','after'])run(`R3 timeout ${ack} Storage ACK preserves the deletion generation and recovers without A`,async()=>{
    const f=await fixture(),real=f.bucket.file(f.photo);let late;
    const bucket={file:()=>({getMetadata:()=>real.getMetadata(),delete:options=>new Promise((resolve,reject)=>{const complete=()=>real.delete(options).then(resolve,reject);if(ack==='after')real.delete(options).then(()=>{},reject);else late=complete;})})};
    await assert.rejects(Cleanup.cleanupReceipt({db:f.db,bucket,path:f.photo,queued:true,ioTimeoutMs:100}),/receipt_storage_timeout/);
    const intent=(await Admission.objectRef(f.db,f.photo).get()).data().deleteGeneration;assert.ok(intent&&intent!=='absent');await f.independent('timeout-'+ack);
    await assert.rejects(Admission.prepareWrite({db:f.db,uid:f.a.uid,target:`users/${f.a.uid}/app/meta`,payload:{alias:f.photo}}),/receipt_reference_unavailable/);
    await Cleanup.recoverPending({db:f.db,bucket:f.bucket});assert.equal((await real.exists())[0],false);
    if(late){late();await new Promise(resolve=>setTimeout(resolve,100));}
    assert.equal((await Admission.objectRef(f.db,f.photo).get()).data().deleteGeneration,intent);
  });
  for(const phase of ['afterLock','beforeDelete','afterDelete'])run(`R3 actual worker process termination at ${phase} leaves a recoverable job and never blocks B`,async()=>{
    const f=await fixture(),child=fork(path.join(__dirname,'../helpers/receipt-crash-worker.cjs'),[f.photo,phase],{env:process.env,stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});let errorLog='';child.stderr.on('data',b=>{errorLog+=b;});
    try{
      await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('worker checkpoint timeout '+errorLog)),20000);child.once('message',message=>{clearTimeout(timeout);assert.equal(message.phase,phase);resolve();});child.once('exit',code=>{clearTimeout(timeout);if(code)reject(Error('worker exited '+code+' '+errorLog));});});
      await f.independent('worker-paused-'+phase);
      const exitCode=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('crash worker did not terminate')),10000);child.once('exit',code=>{clearTimeout(timeout);resolve(code);});child.send({command:'crash'});});assert.equal(exitCode,77);
      await f.independent('worker-dead-'+phase);assert.equal((await f.bucket.file(f.photo).exists())[0],phase!=='afterDelete');
      // Controlled-clock expiry, not a real 60-second wait. No lock is unlocked:
      // the replacement worker resumes the same persisted deletion generation.
      await Cleanup.recoverPending({db:f.db,bucket:f.bucket,now:()=>Date.now()+Cleanup.LEASE_MS+1000});
      assert.equal((await f.bucket.file(f.photo).exists())[0],false);
      assert.equal((await Cleanup.jobRef(f.db,f.photo).get()).data().status,'complete');
    }finally{if(child.exitCode===null)child.kill();}
  });
  run('R3 in-flight exact admission protects a URL-only reference; raw/tampered/replayed writes cannot bypass it',async()=>{
    const f=await fixture(),target=`users/${f.a.uid}/app/meta`,payload={nested:{url:'http://localhost/o/'+encodeURIComponent(f.photo)+'?alt=media'}};
    const permit=await Admission.prepareWrite({db:f.db,uid:f.a.uid,target,payload});
    await assert.rejects(Cleanup.cleanupReceipt({db:f.db,bucket:f.bucket,path:f.photo,queued:true}),/receipt_admission_pending/);await f.independent('pending-permit');
    await assertFails(rawSetDoc(doc(f.a.client,target),payload));
    const bad=writeBatch(f.a.client);bad.set(doc(f.a.client,target),{...payload,tampered:true});bad.delete(doc(f.a.client,permit.path));await assertFails(bad.commit());
    const good=writeBatch(f.a.client);good.set(doc(f.a.client,target),payload);good.delete(doc(f.a.client,permit.path));await good.commit();
    await Cleanup.recoverPending({db:f.db,bucket:f.bucket});assert.equal((await f.bucket.file(f.photo).exists())[0],true,'accepted alias protects bytes');
    await assertFails(rawSetDoc(doc(f.a.client,target),payload));
    await setDoc(doc(f.a.client,target),{});await f.waitFor(async()=>!(await f.bucket.file(f.photo).exists())[0],'last metadata reference cleanup');
  });
  run('R3 durable outbox automatically processes a queued cleanup with no client or explicit same-file retry',async()=>{
    const f=await fixture();await Cleanup.jobRef(f.db,f.photo).delete();await Cleanup.enqueueCleanup({db:f.db,path:f.photo});
    // Storage deletion precedes its durable completion ACK. Await the complete
    // protocol, not the normal few milliseconds between those two services.
    await f.waitFor(async()=>(await Cleanup.jobRef(f.db,f.photo).get()).data()?.status==='complete','durable wakeup trigger did not finish orphan cleanup');
    assert.equal((await f.bucket.file(f.photo).exists())[0],false);
    assert.equal((await Cleanup.jobRef(f.db,f.photo).get()).data().status,'complete');
  });
  run('R3 expired abandoned admissions cannot replay and no longer hold the receipt cleanup job',async()=>{
    const f=await fixture(),target=`users/${f.a.uid}/app/abandoned`,payload={nested:{path:f.photo}};
    const permit=await Admission.prepareWrite({db:f.db,uid:f.a.uid,target,payload,now:()=>Date.now()-Admission.ADMISSION_MS-Admission.EXPIRY_MARGIN_MS-1000});
    const batch=writeBatch(f.a.client);batch.set(doc(f.a.client,target),payload);batch.delete(doc(f.a.client,permit.path));await assertFails(batch.commit());
    await Cleanup.recoverPending({db:f.db,bucket:f.bucket});assert.equal((await f.bucket.file(f.photo).exists())[0],false);
  });
  run('R3 a different account LTD nested URL reference protects A bytes until that account removes it',async()=>{
    const f=await fixture('legacy image%20?#.jpg'),company=(await f.db.doc(`users/${f.b.uid}/ltdControl/activeCompany`).get()).data().activeCompanyId;
    const envelope=Ltd.envelope('economicEvents',{id:'cross-account-evidence',entityId:company,createdAt:1,updatedAt:1,nested:{url:'http://localhost/o/'+encodeURIComponent(f.photo)+'?alt=media'}},company),target=`users/${f.b.uid}/ltd/v1/economicEvents/${envelope.documentId}`;
    await setDoc(doc(f.b.client,target),envelope);await Cleanup.recoverPending({db:f.db,bucket:f.bucket});assert.equal((await f.bucket.file(f.photo).exists())[0],true);
    await setDoc(doc(f.b.client,target),Ltd.envelope('economicEvents',{...envelope.payload,nested:{},updatedAt:2},company));
    await f.waitFor(async()=>!(await f.bucket.file(f.photo).exists())[0],'last cross-account LTD reference removal did not clean bytes');
  });
  run('R3 twenty historical LTD rows retain one atomic commit without exceeding Rules access-call limits',async()=>{
    const f=await fixture(),company=(await f.db.doc(`users/${f.b.uid}/ltdControl/activeCompany`).get()).data().activeCompanyId;
    const rows=Array.from({length:20},(_,i)=>{const payload=Ltd.envelope('companyOwnershipVersions',{id:'history-'+i,entityId:company,createdAt:1,updatedAt:1},company);return{target:`users/${f.b.uid}/ltd/v1/companyOwnershipVersions/${payload.documentId}`,payload};});
    const permit=await Admission.prepareBatch({db:f.db,uid:f.b.uid,records:rows}),batch=writeBatch(f.b.client);for(const row of rows)batch.set(doc(f.b.client,row.target),row.payload);batch.delete(doc(f.b.client,permit.path));await batch.commit();
    for(const row of rows)assert.equal((await f.db.doc(row.target).get()).exists,true);
  });
  run('R3 HTTP callable caller disconnect needs no manual retry and leaves a durable cleanup result',async()=>{
    const f=await fixture(),signup=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})}),user=await signup.json(),photo=`receipts/${user.localId}/disconnected.jpg`;
    await f.bucket.file(photo).save(Buffer.from('callable-owned'));const controller=new AbortController();
    const call=fetch(`http://${process.env.FUNCTIONS_EMULATOR_HOST}/demo-taxmate/europe-west2/cleanupReceipt`,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+user.idToken},body:JSON.stringify({data:{path:photo}}),signal:controller.signal}).then(r=>r.json()).catch(error=>({disconnected:error.name}));
    await f.waitFor(async()=>(await Cleanup.jobRef(f.db,photo).get()).exists,'callable did not persist its job');controller.abort();await call;
    await f.waitFor(async()=>(await Cleanup.jobRef(f.db,photo).get()).data()?.status==='complete','disconnected callable job did not finish');assert.equal((await f.bucket.file(photo).exists())[0],false);
  });
};
