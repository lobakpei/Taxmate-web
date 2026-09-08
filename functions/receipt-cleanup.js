'use strict';
// Per-object fencing only. A durable job precedes every physical side effect.
// A generation-specific deletion intent is NEVER expired/unlocked: a new
// worker resumes the same immutable object after an unknown Storage ACK.
const crypto=require('node:crypto'),Policy=require('./retention-policy'),Admission=require('./receipt-admission');
const LEASE_MS=60000,IO_TIMEOUT_MS=15000;
function receiptIdentity(path){const m=typeof path==='string'&&path.match(/^receipts\/([^/]+)\/([^/]+)$/);return m?{uid:m[1],fileName:m[2]}:null;}
function liveReferences(value,path){return Admission.receiptPaths(value).has(path);}
async function referenced(db,path,{ignorePersonalUid=null}={}){
  if(!receiptIdentity(path))return true;
  for(const collection of ['entries','app',...Policy.LTD_COLLECTIONS]){
    const rows=await db.collectionGroup(collection).get();
    for(const doc of rows.docs){if(ignorePersonalUid&&doc.ref.path.startsWith('users/'+ignorePersonalUid+'/'))continue;if(liveReferences(doc.data(),path))return true;}
  }
  return false;
}
const jobRef=(db,path)=>db.doc('receiptCleanupJobs/'+crypto.createHash('sha256').update(path).digest('hex'));
async function enqueueCleanup({db,path,ignorePersonalUid=null,retentionUid=null,retentionEpoch=null,now=()=>Date.now()}){
  if(!receiptIdentity(path))throw Error('invalid_receipt_path');
  const ref=jobRef(db,path);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref),v=snap.data();if(v&&v.status==='pending'){if(retentionUid)tx.set(ref,{retentionUid,retentionEpoch},{merge:true});return;}
    const requestId=crypto.randomUUID();
    tx.set(ref,{path,ignorePersonalUid,retentionUid,retentionEpoch,status:'pending',requestId,requestedAt:now(),attempts:0});
    tx.create(db.doc('receiptCleanupWakeups/'+requestId),{jobId:ref.id,requestId,createdAt:now()});
  });
  return ref;
}
async function timed(promise,ms=IO_TIMEOUT_MS){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('receipt_storage_timeout')),ms);})]);}finally{clearTimeout(timer);}}
async function cleanupReceipt({db,bucket,path,ignorePersonalUid=null,now=()=>Date.now(),hooks={},queued=false,ioTimeoutMs=IO_TIMEOUT_MS}){
  if(!receiptIdentity(path))return{status:'invalid_path'};
  const job=jobRef(db,path),ref=Admission.objectRef(db,path),token=crypto.randomUUID();
  const acquired=await db.runTransaction(async tx=>{
    const d=await tx.get(ref),j=await tx.get(job),v=d.data()||{};
    if(!queued&&j.data()?.status!=='pending'){
      const requestId=crypto.randomUUID();tx.set(job,{path,ignorePersonalUid,status:'pending',requestId,requestedAt:now(),attempts:0});
      tx.create(db.doc('receiptCleanupWakeups/'+requestId),{jobId:job.id,requestId,createdAt:now()});
    }
    if(v.status==='deleted')return{status:'deleted'};
    if(v.status==='deleting'&&v.leaseUntil>now())return{status:'busy'};
    tx.set(ref,{...v,path,status:'deleting',token,leaseUntil:now()+LEASE_MS,updatedAt:now()});
    return{status:'acquired',generation:v.deleteGeneration||null};
  });
  async function jobDone(status){await job.set({status:'complete',result:status,completedAt:now()},{merge:true});}
  if(acquired.status!=='acquired'){if(acquired.status==='deleted')await jobDone('deleted');return{status:acquired.status};}
  async function finish(status,result){await db.runTransaction(async tx=>{const d=await tx.get(ref);if(d.data()?.token!==token)throw Error('receipt_cleanup_lease_lost');tx.set(ref,{...d.data(),path,status,token:null,leaseUntil:null,updatedAt:now()});tx.set(job,{status:'complete',result,completedAt:now()},{merge:true});});}
  try{
    if(hooks.afterLock)await hooks.afterLock();
    let generation=acquired.generation;
    if(!generation){
      if(await referenced(db,path,{ignorePersonalUid})){await finish('available','referenced');return{status:'referenced'};}
      // An already committed other-account reference is sufficient to KEEP
      // bytes, even when that member also has an in-flight draft. Only actual
      // destruction must wait for outstanding admissions.
      if(await Admission.hasPendingAdmission(db,path,now))throw Error('receipt_admission_pending');
      let metadata;try{[metadata]=await timed(bucket.file(path).getMetadata(),ioTimeoutMs);}catch(error){if(Number(error.code)!==404)throw error;}
      generation=metadata?String(metadata.generation):'absent';
      await db.runTransaction(async tx=>{const d=await tx.get(ref);if(d.data()?.token!==token||d.data().leaseUntil<=now())throw Error('receipt_cleanup_lease_lost');tx.update(ref,{deleteGeneration:generation});});
    }
    if(hooks.beforeDelete)await hooks.beforeDelete();
    if(generation!=='absent')await timed(bucket.file(path).delete({ifGenerationMatch:generation}),ioTimeoutMs).catch(error=>{if(Number(error.code)!==404)throw error;});
    if(hooks.afterDelete)await hooks.afterDelete();
    await finish('deleted','deleted');return{status:'deleted'};
  }catch(error){
    await db.runTransaction(async tx=>{const d=await tx.get(ref),j=await tx.get(job);if(d.data()?.token===token){tx.update(ref,{status:'retry',leaseUntil:null,updatedAt:now()});tx.set(job,{status:'pending',attempts:(j.data()?.attempts||0)+1,lastError:String(error.message).slice(0,100),lastAttemptAt:now()},{merge:true});}}).catch(()=>{});
    throw error;
  }
}
async function cleanupReceiptWithRetry(options){
  for(let attempt=0;attempt<20;attempt++){if(options.beforeAttempt)await options.beforeAttempt();const result=await cleanupReceipt(options);if(result.status!=='busy')return result;await new Promise(resolve=>setTimeout(resolve,Math.min(1000,50*2**attempt)));}
  throw Error('receipt_cleanup_busy');
}
async function processJob({db,bucket,jobId,now=()=>Date.now(),...options}){
  const snapshot=await db.doc('receiptCleanupJobs/'+jobId).get(),job=snapshot.data();if(!job||job.status!=='pending')return{status:'complete'};
  const result=await cleanupReceipt({db,bucket,path:job.path,ignorePersonalUid:job.ignorePersonalUid||null,now,queued:true,...options});
  if(result.status==='busy')throw Error('receipt_cleanup_busy');return result;
}
// A missed event or dead caller is recoverable from server-owned persistent jobs.
// One failing file never prevents an independent file from progressing.
async function recoverPending({db,bucket,now=()=>Date.now(),...options}){
  // Actual abandoned payloads are removed before resuming orphan image jobs.
  // This also repairs old R3 admissions/pins that have no R4 metadata.
  await require('./receipt-admission-lifecycle').recover({db,now});
  const cursorRef=db.doc('receiptCleanupRecovery/cursor'),cursor=(await cursorRef.get()).data()?.lastId;
  const query=db.collection('receiptCleanupJobs').where('status','==','pending').orderBy('__name__').limit(20);
  let jobs=await (cursor?query.startAfter(cursor):query).get();if(jobs.empty&&cursor)jobs=await query.get();
  const results=[];
  for(let i=0;i<jobs.docs.length;i+=5){const page=jobs.docs.slice(i,i+5);await Promise.all(page.map(async job=>{try{results.push({jobId:job.id,...await processJob({db,bucket,jobId:job.id,now,...options})});}catch(error){results.push({jobId:job.id,status:'retry',reason:error.message});}}));await cursorRef.set({lastId:page[page.length-1].id,updatedAt:now()});}
  const controls=await db.collectionGroup('retention').where('receiptCleanupPending','==',true).limit(20).get();
  for(const control of controls.docs){const uid=control.ref.parent.parent?.id;if(uid)await reconcileRetentionCleanup({db,uid,epoch:control.data().epoch});}
  return results;
}
async function reconcileRetentionCleanup({db,uid,epoch}){
  const ref=db.doc('users/'+uid+'/retention/current');
  return db.runTransaction(async tx=>{
    const snapshot=await tx.get(ref),c=snapshot.data();if(!c||c.epoch!==epoch||!['complete','complete_with_warnings'].includes(c.status)||!c.pendingReceiptPaths?.length)return;
    const jobs=await Promise.all(c.pendingReceiptPaths.map(path=>tx.get(jobRef(db,path)))),remaining=[],counts={...c.counts};
    jobs.forEach((job,index)=>{const v=job.data();if(v?.status==='complete'){if(v.result==='deleted')counts.deletedReceipts=(counts.deletedReceipts||0)+1;else counts.keptReceipts=(counts.keptReceipts||0)+1;}else remaining.push(c.pendingReceiptPaths[index]);});
    if(remaining.length===c.pendingReceiptPaths.length)return;
    counts.pendingReceipts=remaining.length;const warningCodes=(c.warningCodes||[]).filter(code=>code!=='receipt_cleanup_pending'||remaining.length>0);
    tx.update(ref,{pendingReceiptPaths:remaining,receiptCleanupPending:remaining.length>0,counts,warningCodes,status:warningCodes.length?'complete_with_warnings':'complete'});
  });
}
async function acceptedEntryChange({db,bucket,before,after}){
  // Explicit Admin retention/reset owns physical removals, not delayed events.
  if(!before||!after||before.deletedAt!=null)return{status:'no_change'};
  const removed=[...Admission.receiptPaths(before)].filter(path=>!liveReferences(after,path));
  if(!removed.length)return{status:'no_change'};
  const results=[];for(const path of removed)results.push(await cleanupReceiptWithRetry({db,bucket,path}));return results.length===1?results[0]:{status:'complete',results};
}
module.exports={receiptIdentity,liveReferences,referenced,enqueueCleanup,cleanupReceipt,cleanupReceiptWithRetry,acceptedEntryChange,processJob,recoverPending,reconcileRetentionCleanup,jobRef,LEASE_MS};
