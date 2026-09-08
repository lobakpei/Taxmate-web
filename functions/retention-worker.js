'use strict';
// No production registration: this worker only accepts an explicit demo emulator.
const crypto=require('node:crypto'),Policy=require('./retention-policy');
const CONTROL_VERSION=Policy.VERSION,MAX_BATCH=150,DEFAULT_LEASE_MS=300000;
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
function assertDemoEnvironment(projectId){if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST||!/^demo-[a-z0-9-]+$/i.test(String(projectId||'')))throw new Error('retention_worker_emulator_only');}
function pathReferences(value,uid,out=new Set()){
 if(typeof value==='string'){
  if(value.startsWith(`receipts/${uid}/`))out.add(value);
  try{const decoded=decodeURIComponent(value),match=decoded.match(/(?:\/o\/)(receipts\/[^?]+)/);if(match&&match[1].startsWith(`receipts/${uid}/`))out.add(match[1]);}catch(_){}
 }else if(Array.isArray(value))value.forEach(item=>pathReferences(item,uid,out));else if(value&&typeof value==='object')Object.values(value).forEach(item=>pathReferences(item,uid,out));return out;
}
function restoreDomain(envelopes){
 const domain=Object.fromEntries(Policy.LTD_COLLECTIONS.map(key=>[key,[]])),profiles=new Map();
 for(const e of envelopes){if(!e||!domain[e.collection]||!e.payload||['companyProfileRevisions','companyOwnershipVersions'].includes(e.collection))continue;const r=clone(e.payload);domain[e.collection].push(r);if(e.collection==='companyProfiles'){r.profileRevisionHistory=[];r.ownershipHistory=[];profiles.set(r.id,r);}}
 for(const e of envelopes){if(!e||!e.payload)continue;const r=clone(e.payload),p=profiles.get(r.profileId);if(!p)continue;delete r.profileId;if(e.collection==='companyProfileRevisions')p.profileRevisionHistory.push(r);if(e.collection==='companyOwnershipVersions')p.ownershipHistory.push(r);}
 return domain;
}
function stateFromCloud(meta,entries,ltd){const state=clone(meta||{});state.entries=entries.map(r=>clone(r.data)).filter(r=>r.deletedAt==null);state.tombstones=entries.map(r=>clone(r.data)).filter(r=>r.deletedAt!=null);state.domain=restoreDomain(ltd.map(r=>r.data));return state;}
function ownedLease(c,lease){return c&&c.status==='purging'&&c.epoch===lease.epoch&&c.leaseId===lease.leaseId;}
async function fenced(db,lease,now,fn){
 await db.runTransaction(async tx=>{const snap=await tx.get(lease.ref),c=snap.data();if(!ownedLease(c,lease)||c.leaseUntil<=now())throw new Error('retention_lease_lost');await fn(tx,c);tx.update(lease.ref,{leaseUntil:now()+lease.leaseMs,updatedAt:now()});});
}
async function acquire(db,uid,now,leaseMs){
 const ref=db.doc(`users/${uid}/retention/current`),entRef=db.doc(`users/${uid}/entitlements/current`),leaseId=crypto.randomUUID();
 return db.runTransaction(async tx=>{
  const [controlDoc,entDoc]=await Promise.all([tx.get(ref),tx.get(entRef)]),current=controlDoc.data(),ent=entDoc.data()||{},pending=current&&['purging','failed'].includes(current.status);
  const decision=pending?{status:'expired',cutoffDate:current.cutoffDate,deleteOnDate:current.deleteOnDate,retainThroughDate:current.retainThroughDate}:Policy.decide(ent,now());
  if(current&&current.status==='purging'&&current.leaseUntil>now())return{status:'busy',epoch:current.epoch};
  if(!pending&&decision.status!=='expired')return{status:'not_due',decision};
  if(!pending&&current&&current.cutoffDate>=decision.cutoffDate)return{status:current.status,epoch:current.epoch};
  const epoch=pending?current.epoch:Math.max(Number(current&&current.epoch)||0,Number(ent.accountRetention&&ent.accountRetention.lastRetentionEpoch)||0)+1;
  const value={schemaVersion:CONTROL_VERSION,status:'purging',epoch,epochString:String(epoch),cutoffDate:decision.cutoffDate,deleteOnDate:decision.cutoffDate,retainThroughDate:decision.retainThroughDate||null,leaseId,leaseUntil:now()+leaseMs,startedAt:pending?current.startedAt:now(),attempts:(Number(current&&current.attempts)||0)+1,updatedAt:now()};
  tx.set(ref,value);return{status:'acquired',ref,epoch,leaseId,leaseMs,decision,entitlement:ent,startedAt:value.startedAt};
 });
}
async function readCloud(db,uid){
 const root=db.doc(`users/${uid}`),metaRef=root.collection('app').doc('meta');
 const [meta,entries,groups]=await Promise.all([metaRef.get(),root.collection('entries').get(),Promise.all(Policy.LTD_COLLECTIONS.map(async c=>({c,rows:await root.collection('ltd').doc('v1').collection(c).get()})))]);
 return{metaRef,meta:meta.data()||{},entries:entries.docs.map(d=>({path:d.ref.path,id:d.id,data:d.data()})),ltd:groups.flatMap(g=>g.rows.docs.map(d=>({path:d.ref.path,id:d.id,collection:g.c,data:d.data()})))};
}
async function prepareJob(db,uid,lease,now){
 const jobRef=db.doc(`users/${uid}/retentionJobs/${lease.epoch}`),existing=await jobRef.get();if(existing.exists&&existing.data().ready)return{ref:jobRef,...existing.data()};
 const cloud=await readCloud(db,uid),before=stateFromCloud(cloud.meta,cloud.entries,cloud.ltd),after=Policy.apply(before,{policy:lease.decision,epoch:lease.epoch,warnings:[]},lease.startedAt),ops=[];
 const Domain=require('../src/core/domain-schema');Domain.validateDomainState({...after.domain,schemaVersion:Domain.DOMAIN_SCHEMA_VERSION,migrationStatus:'review_required',migrationIssues:[],syncConflicts:[]});
 const entries=new Map([...(after.entries||[]),...(after.tombstones||[])].map(r=>[r.id,r]));
 for(const row of cloud.entries){const retained=entries.get(row.data.id||row.id);ops.push(retained?{path:row.path,data:{...retained,accountOwnerUid:uid,retentionEpoch:lease.epoch}}:{path:row.path,remove:true});}
 const records=Policy.recordsForCloud(after),known=new Set((after.domain.entities||[]).filter(r=>r.type==='limited_company').map(r=>r.id)),retainedPaths=new Set();
 for(const [collection,rows]of Object.entries(records))for(const r of rows){const companyId=collection==='entities'?r.id:r.entityId||r.sourceTransaction&&r.sourceTransaction.beneficiaryEntityId||r.ownerType==='entity'&&r.ownerId||known.size===1&&[...known][0];const e=Policy.envelope(collection,r,companyId,lease.epoch),path=`users/${uid}/ltd/v1/${collection}/${e.documentId}`;retainedPaths.add(path);ops.push({path,data:e});}
 for(const r of cloud.ltd)if(!retainedPaths.has(r.path))ops.push({path:r.path,remove:true});
 const meta={...cloud.meta,...Object.fromEntries(['businesses','businessTombstones','folders','folderTombstones','customCats','activeCats','yearData','settings','metaVersions'].map(k=>[k,after[k]||(['businesses','businessTombstones','folders','folderTombstones'].includes(k)?[]:{})])),retention:after.retention,retentionEpoch:lease.epoch,accountOwnerUid:uid,updatedAt:lease.startedAt,deviceId:'server-retention'};
 ops.push({path:cloud.metaRef.path,data:meta});
 const references=pathReferences(after,uid);
 // Former uploaders may have left: inspect shared references beyond memberships.
 const shared=await db.collectionGroup('entries').get();for(const d of shared.docs)if(/^partnerships\/[^/]+\/entries\/[^/]+$/.test(d.ref.path))pathReferences(d.data(),uid,references);
 for(let i=0;i<ops.length;i+=MAX_BATCH)await fenced(db,lease,now,async tx=>{for(let j=i;j<Math.min(i+MAX_BATCH,ops.length);j++){if(Buffer.byteLength(JSON.stringify(ops[j]))>900*1024)throw new Error('retention_document_too_large');tx.set(jobRef.collection('operations').doc(String(j).padStart(8,'0')),ops[j]);}});
 // A failed preparation may have left a longer, unfinished plan. It must not
 // become executable alongside the new ready manifest after a retry.
 const surplus=(await jobRef.collection('operations').where('__name__','>=',String(ops.length).padStart(8,'0')).get()).docs;
 for(let i=0;i<surplus.length;i+=MAX_BATCH)await fenced(db,lease,now,async tx=>{for(const d of surplus.slice(i,i+MAX_BATCH))tx.delete(d.ref);});
 const manifest={ready:true,operationCount:ops.length,receiptReferences:[...references].sort(),fingerprint:Policy.fingerprint(after),warningCodes:after.retention.warningCodes||[],deletedEntries:cloud.entries.filter(r=>!entries.has(r.data.id||r.id)).length};if(Buffer.byteLength(JSON.stringify(manifest))>900*1024)throw new Error('retention_manifest_too_large');
 await fenced(db,lease,now,async tx=>tx.set(jobRef,manifest));return{ref:jobRef,...manifest};
}
async function retentionRun({db,bucket,uid,now=()=>Date.now(),leaseMs=DEFAULT_LEASE_MS,projectId,hooks={}}){
 assertDemoEnvironment(projectId);if(typeof uid!=='string'||!uid||uid.includes('/'))throw new Error('retention_uid_required');
 const lease=await acquire(db,uid,now,leaseMs);if(lease.status!=='acquired')return lease;
 let stage='prepare';
 try{
  stage='admissions';await require('./receipt-admission-lifecycle').cleanupUid({db,uid,force:true,now,beforeEach:()=>fenced(db,lease,now,async()=>{}),hooks:hooks.admissions||{}});
  stage='prepare';
  const job=await prepareJob(db,uid,lease,now);if(hooks.afterPlan)await hooks.afterPlan();stage='firestore';
  const operations=(await job.ref.collection('operations').orderBy('__name__').get()).docs.map(d=>d.data());if(operations.length!==job.operationCount)throw new Error('retention_plan_incomplete');
  for(let i=0;i<operations.length;i+=MAX_BATCH){await fenced(db,lease,now,async tx=>{const batch=operations.slice(i,i+MAX_BATCH);await require('./receipt-admission').assertAvailable(tx,db,batch.filter(op=>!op.remove).map(op=>op.data));for(const op of batch){const ref=db.doc(op.path);if(op.remove)tx.delete(ref);else tx.set(ref,op.data);}});if(hooks.afterBatch)await hooks.afterBatch(i);}
  stage='storage';const keep=new Set(job.receiptReferences),[files]=await bucket.getFiles({prefix:`receipts/${uid}/`});let deletedReceipts=0,keptReceipts=0;const pendingReceipts=[];
  for(const file of files){await fenced(db,lease,now,async()=>{});try{const [metadata]=await file.getMetadata(),current=Date.parse(metadata.timeCreated)>=Date.parse(lease.decision.cutoffDate+'T00:00:00+01:00');if(keep.has(file.name)||current){await file.setMetadata({metadata:{...metadata.metadata,retentionEpoch:String(lease.epoch)}});keptReceipts++;}else{try{const result=await require('./receipt-cleanup').cleanupReceiptWithRetry({db,bucket,path:file.name,beforeAttempt:()=>fenced(db,lease,now,async()=>{})});if(result.status==='deleted')deletedReceipts++;else{await file.setMetadata({metadata:{...metadata.metadata,retentionEpoch:String(lease.epoch)}});keptReceipts++;}}catch(error){await require('./receipt-cleanup').enqueueCleanup({db,path:file.name,retentionUid:uid,retentionEpoch:lease.epoch});pendingReceipts.push(file.name);}}}catch(error){if(Number(error.code)!==404)throw error;}if(hooks.afterReceipt)await hooks.afterReceipt(file.name);}
  stage='complete';const entRef=db.doc(`users/${uid}/entitlements/current`),warningCodes=[...job.warningCodes,...(pendingReceipts.length?['receipt_cleanup_pending']:[])],counts={deletedEntries:job.deletedEntries,deletedReceipts,keptReceipts,pendingReceipts:pendingReceipts.length},status=warningCodes.length?'complete_with_warnings':'complete';
  await db.runTransaction(async tx=>{const [c,e]=await Promise.all([tx.get(lease.ref),tx.get(entRef)]);if(!ownedLease(c.data(),lease)||c.data().leaseUntil<=now())throw new Error('retention_lease_lost');const latest=e.data()||{};tx.update(lease.ref,{status,completedAt:now(),updatedAt:now(),leaseId:null,leaseUntil:null,warningCodes,counts,pendingReceiptPaths:pendingReceipts,receiptCleanupPending:pendingReceipts.length>0,resultFingerprint:job.fingerprint});tx.set(entRef,{accountRetention:{...latest.accountRetention,lastRetentionEpoch:lease.epoch,lastDeletionCutoffDate:lease.decision.cutoffDate,lastDeletionCompletedAt:now(),purgeRequired:false,requiredCutoffDate:null}},{merge:true});});
  await require('./receipt-cleanup').reconcileRetentionCleanup({db,uid,epoch:lease.epoch});
  // Only retained bytes enter the retry plan; discard them after completion.
  let cleanupPending=false;try{await db.recursiveDelete(job.ref);}catch(_){cleanupPending=true;}return{status,epoch:lease.epoch,cutoffDate:lease.decision.cutoffDate,warningCodes,counts,fingerprint:job.fingerprint,cleanupPending};
 }catch(error){await db.runTransaction(async tx=>{const c=await tx.get(lease.ref);if(ownedLease(c.data(),lease))tx.update(lease.ref,{status:'failed',failedAt:now(),failedStage:stage,leaseId:null,leaseUntil:null,reasonCode:String(error.message||'retention_failed').replace(/[^a-z0-9_-]/gi,'_').slice(0,80)});}).catch(()=>{});throw error;}
}
module.exports={CONTROL_VERSION,assertDemoEnvironment,stateFromCloud,restoreDomain,pathReferences,retentionRun};
