'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),{fork}=require('node:child_process');
const {doc,getDocFromServer:getDoc,deleteDoc,writeBatch}=require('firebase/firestore'),{assertFails}=require('@firebase/rules-unit-testing');
const Admission=require('../../functions/receipt-admission'),Life=require('../../functions/receipt-admission-lifecycle'),Cleanup=require('../../functions/receipt-cleanup'),Ltd=require('../../src/core/ltd-sync');
const {setDoc}=require('../helpers/receipt-admitted-client');
module.exports=function register(run,context){
  const pinPath=(photo,permit)=>Admission.objectRef(context().db,photo).collection('admissionPins').doc(crypto.createHash('sha256').update(permit.path).digest('hex')).path;
  async function exists(p){return(await context().db.doc(p).get()).exists;}
  async function commit(client,target,payload,permit){const batch=writeBatch(client);batch.set(doc(client,target),payload);batch.delete(doc(client,permit.path));await batch.commit();}
  async function scopes(){
    const c=context(),s=await c.seed(),company='company:r4-'+s.uid;
    await c.db.doc(`users/${s.uid}/ltdControl/activeCompany`).set({status:'active_slot_claimed',activeCompanyId:company});
    const ltd=Ltd.envelope('economicEvents',{id:'r4-event',entityId:company,createdAt:1,updatedAt:1,evidenceRefs:[s.path]},company);
    return{...c,s,rows:[{target:`users/${s.uid}/entries/r4-draft`,payload:{...s.record,id:'r4-draft'}},{target:`users/${s.uid}/app/meta`,payload:{nested:{receipt:s.path},secret:'meta draft'}},{target:`users/${s.uid}/ltd/v1/economicEvents/${ltd.documentId}`,payload:ltd},{target:s.recordPath,payload:{...s.record,amount:54}}]};
  }
  run('R4 all four admission scopes allow live authenticated permit reads and deny expired reads before actual deletion',async()=>{
    const f=await scopes();
    for(const row of f.rows){const permit=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...row});assert.equal((await getDoc(doc(f.s.client,permit.path))).exists(),true);await assertFails(getDoc(doc(f.env.authenticatedContext('r4-unrelated').firestore(),permit.path)));await f.db.doc(permit.path).update({expiresAt:Date.now()-60000});await assertFails(getDoc(doc(f.s.client,permit.path)));await Life.cleanupAdmission({db:f.db,path:permit.path});assert.equal(await exists(permit.path),false);assert.equal(await exists(pinPath(f.s.path,permit)),false);}
    assert.equal((await f.bucket.file(f.s.path).exists())[0],true,'temporary copy deletion never deletes referenced bytes');
  });
  run('R4 successful atomic commits consume data and event cleanup removes matching pins for every scope',async()=>{
    const f=await scopes();
    for(const row of f.rows){const permit=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...row});await commit(f.s.client,row.target,row.payload,permit);assert.equal(await exists(permit.path),false);await f.waitFor(async()=>!await exists(pinPath(f.s.path,permit)),'consumption did not clean pin');assert.deepEqual((await f.db.doc(row.target).get()).data(),row.payload);}
  });
  run('R4 refused payload and explicit cancellation leave no financial copy or orphan pins, without touching main data',async()=>{
    const f=await scopes(),row=f.rows[0],permit=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...row});
    await assertFails(commit(f.s.client,row.target,{...row.payload,amount:999},permit));assert.equal(await exists(row.target),false);assert.equal(await exists(permit.path),true);
    await deleteDoc(doc(f.s.client,permit.path));await f.waitFor(async()=>!await exists(pinPath(f.s.path,permit)),'cancelled pin remains');assert.equal((await f.bucket.file(f.s.path).exists())[0],true);
  });
  run('R4 former-member main and draft reads both fail; membership event removes only that members copies',async()=>{
    const f=await scopes(),row=f.rows[3],a=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...row}),b=await Admission.prepareWrite({db:f.db,uid:f.s.peer,...row});
    await f.db.doc(`partnerships/${f.s.code}/members/${f.s.uid}`).delete();await assertFails(getDoc(doc(f.s.client,row.target)));await assertFails(getDoc(doc(f.s.client,a.path)));
    await f.waitFor(async()=>!await exists(a.path),'former member copy remains');assert.equal((await getDoc(doc(f.s.peerClient,b.path))).exists(),true);assert.equal((await getDoc(doc(f.s.peerClient,row.target))).exists(),true);assert.equal((await f.bucket.file(f.s.path).exists())[0],true);
  });
  run('R4 Pro to Plus revokes pending shared/LTD permits but preserves LTD historical reads and Free ordinary edit',async()=>{
    const f=await scopes(),ltd=f.rows[2],shared=f.rows[3];await f.db.doc(ltd.target).set(ltd.payload);
    const a=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...ltd}),b=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...shared});
    await f.db.doc(`users/${f.s.uid}/entitlements/current`).set({paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:Date.now()+86400000});
    await assertFails(getDoc(doc(f.s.client,a.path)));await assertFails(getDoc(doc(f.s.client,b.path)));assert.equal((await getDoc(doc(f.s.client,ltd.target))).exists(),true);
    await f.waitFor(async()=>!await exists(a.path)&&!await exists(b.path),'revoked tier copies remain');
    await f.db.doc(`users/${f.s.uid}/entitlements/current`).set({paidTier:'free',subscriptionStatus:'canceled'});
    const row=f.rows[0],permit=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...row});await commit(f.s.client,row.target,row.payload,permit);assert.equal(await exists(row.target),true);
  });
  run('R4 membership date floor and retention epoch deny draft direct reads just like corresponding ledger data',async()=>{
    const f=await scopes(),shared=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...f.rows[3]}),personal=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...f.rows[0]});
    await f.db.doc(`partnerships/${f.s.code}/members/${f.s.uid}`).update({retentionCutoffDate:'2027-04-06'});await assertFails(getDoc(doc(f.s.client,f.s.recordPath)));await assertFails(getDoc(doc(f.s.client,shared.path)));
    await f.db.doc(`users/${f.s.uid}/retention/current`).set({schemaVersion:2,status:'complete',epoch:1,cutoffDate:'2027-04-06',deleteOnDate:'2027-04-06'});await assertFails(getDoc(doc(f.s.client,personal.path)));await Life.cleanupUid({db:f.db,uid:f.s.uid});assert.equal(await exists(personal.path),false);
  });
  run('R4 stale cleanup token cannot erase a replacement permit; parallel cleanup respects a live in-flight commit',async()=>{
    const f=await scopes(),row=f.rows[0],first=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...row}),second=await Admission.prepareWrite({db:f.db,uid:f.s.uid,...row});
    assert.equal((await Life.cleanupAdmission({db:f.db,path:first.path,expectedToken:first.token,force:true})).status,'superseded');assert.equal((await f.db.doc(second.path).get()).data().token,second.token);
    const results=await Promise.all([Life.cleanupAdmission({db:f.db,path:second.path}),Life.cleanupAdmission({db:f.db,path:second.path}),commit(f.s.client,row.target,row.payload,second)]);assert.ok(results.slice(0,2).every(v=>['active','absent'].includes(v.status)));assert.equal(await exists(row.target),true);assert.equal((await f.bucket.file(f.s.path).exists())[0],true);
  });
  run('R4 expiry sweep repairs original R3-shaped abandoned payloads and orphan pins after failure without caller retry',async()=>{
    const f=await scopes(),permitPath=`users/${f.s.uid}/app/legacy/receiptAdmissions/${f.s.uid}`,photo=f.s.path,permit={path:permitPath};
    const value={uid:f.s.uid,target:`users/${f.s.uid}/app/legacy`,payload:{secret:'R3 abandoned data',nested:{photo}},receiptPaths:[photo],token:'original-r3-token',expiresAt:Date.now()+Admission.ADMISSION_MS};
    await f.db.doc(permitPath).set(value);await f.db.doc(pinPath(photo,permit)).set({admissionPath:permitPath,token:value.token,expiresAt:value.expiresAt});
    await assert.rejects(Life.cleanupAdmission({db:f.db,path:permitPath,now:()=>Date.now()+Admission.ADMISSION_MS+1,hooks:{beforeDelete:async()=>{throw Error('injected_data_cleanup_failure');}}}),/injected_data_cleanup_failure/);
    await setDoc(doc(f.s.peerClient,`users/${f.s.peer}/entries/independent-b`),{...f.s.record,id:'independent-b',receiptPath:null,receiptUrl:null});assert.equal(await exists(`users/${f.s.peer}/entries/independent-b`),true);
    assert.equal(await exists(permitPath),true);await f.db.doc(permitPath).update({expiresAt:Date.now()-1});await assertFails(getDoc(doc(f.s.client,permitPath)));
    await Cleanup.recoverPending({db:f.db,bucket:f.bucket});await f.waitFor(async()=>{await Life.recover({db:f.db});return!await exists(permitPath)&&!await exists(pinPath(photo,permit));},'durable scan did not clear R3 data and pin');
    const orphanPath=pinPath(photo,{path:`users/${f.s.uid}/app/already-consumed/receiptAdmissions/${f.s.uid}`});await f.db.doc(orphanPath).set({admissionPath:`users/${f.s.uid}/app/already-consumed/receiptAdmissions/${f.s.uid}`,token:'r3-consumed',expiresAt:Date.now()-1});await f.waitFor(async()=>{await Life.recover({db:f.db});return!await exists(orphanPath);},'legacy consumed pin was not found by recovery');
  });
  run('R4 reset fence blocks new preparations; actual reset callable removes own shared copies but retains other members data',async()=>{
    const f=await scopes();await f.db.doc(`accountResets/${f.s.uid}`).set({status:'deleting'});
    for(const row of f.rows)await assert.rejects(Admission.prepareWrite({db:f.db,uid:f.s.uid,...row}),/receipt_admission_account_unavailable/);
    await f.db.doc(`accountResets/${f.s.uid}`).set({status:'complete'});
    const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})}),user=await response.json(),s=await f.seed(user.localId);
    const own=await Admission.prepareWrite({db:f.db,uid:s.uid,target:s.recordPath,payload:s.record}),other=await Admission.prepareWrite({db:f.db,uid:s.peer,target:s.recordPath,payload:s.record});
    await f.db.doc(`users/${s.uid}/entitlements/current`).set({paidTier:'free',subscriptionStatus:'canceled'});
    const ordinary=await Admission.prepareWrite({db:f.db,uid:s.uid,target:`users/${s.uid}/app/meta`,payload:{privateDraft:'abandoned before reset',receiptPath:s.path}});
    const result=await fetch(`http://${process.env.FUNCTIONS_EMULATOR_HOST}/demo-taxmate/europe-west2/deleteAccountData`,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+user.idToken},body:JSON.stringify({data:{}})});assert.equal(result.status,200,JSON.stringify(await result.clone().json()));
    assert.equal(await exists(own.path),false);assert.equal(await exists(ordinary.path),false);assert.equal(await exists(pinPath(s.path,ordinary)),false);assert.equal(await exists(other.path),true);assert.equal(await exists(s.recordPath),true);assert.equal((await f.bucket.file(s.path).exists())[0],true);assert.equal((await f.db.doc(`accountResets/${s.uid}`).get()).data().status,'complete');
  });
  run('R4 abrupt client process loss leaves a durable abandoned copy that recovery removes with no returning client',async()=>{
    const f=await scopes(),target=f.rows[0].target;
    const child=fork(path.join(__dirname,'../helpers/admission-crash-worker.cjs'),[f.s.uid,target,f.s.path],{env:process.env,stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});let output='';child.stderr.on('data',b=>{output+=b;});
    const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('admission child timeout '+output));},20000);child.once('exit',code=>{clearTimeout(timer);resolve(code);});});assert.equal(code,77,output);
    const permitPath=target+'/receiptAdmissions/'+f.s.uid;assert.equal(await exists(permitPath),true);
    await f.waitFor(async()=>{await Life.recover({db:f.db,now:()=>Date.now()+Admission.ADMISSION_MS+1000});return!await exists(permitPath);},'unattended scan did not recover terminated client draft');assert.equal(await exists(pinPath(f.s.path,{path:permitPath})),false);assert.equal(await exists(target),false);assert.equal((await f.bucket.file(f.s.path).exists())[0],true);
  });
  run('R4 bounded recovery advances past one failed legacy pin and removes later pages without losing retry state',async()=>{
    const f=await scopes(),pins=Array.from({length:Life.PAGE_SIZE+3},(_,i)=>Admission.objectRef(f.db,f.s.path).collection('admissionPins').doc('legacy-page-'+String(i).padStart(3,'0')));
    const batch=f.db.batch();for(const pin of pins)batch.set(pin,{admissionPath:`users/${f.s.uid}/app/missing/receiptAdmissions/${f.s.uid}`,token:'legacy-orphan',expiresAt:Date.now()-1});await batch.commit();
    await f.waitFor(async()=>{await Life.recover({db:f.db,hooks:{beforeDelete:async({path})=>{if(path===pins[0].path)throw Error('one_pin_failure');}}});return(await Promise.all(pins.slice(1).map(p=>p.get()))).every(s=>!s.exists);},'failed item blocked later recovery pages');
    assert.equal((await pins[0].get()).exists,true);await f.waitFor(async()=>{await Life.recover({db:f.db});return!(await pins[0].get()).exists;},'persistent failed item was not recovered');assert.equal((await f.bucket.file(f.s.path).exists())[0],true);
  });
};
