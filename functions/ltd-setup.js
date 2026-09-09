'use strict';
const crypto=require('node:crypto'),ReceiptAdmission=require('./receipt-admission');
const PROTOCOL='ltd-setup.1',COLLECTIONS=['persons','entities','companyProfiles','companyProfileRevisions','companyOwnershipVersions','projects','paymentAccounts','economicEvents','companyTaxPeriods','companyLossRecords','salaryRecords','dividendDeclarations','personalIncomeLinks','salesInvoices','supplierBills','fixedAssets','bankReconciliations'];
const SETUP_COLLECTIONS=new Set(['persons','entities','companyProfiles','companyProfileRevisions','companyOwnershipVersions']);
const clone=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
function fingerprint(value){let hash=0x811c9dc5;const input=canonical(value);for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}return'fnv1a32-'+hash.toString(16).padStart(8,'0');}
const docId=id=>Buffer.from(id).toString('base64url'),version=snap=>snap.exists?`${snap.updateTime.seconds}:${snap.updateTime.nanoseconds}`:'missing';
function createHandlers({db,FieldValue,HttpsError,authenticate,requireTier,now=Date.now}){
 const fail=(reason,code='failed-precondition')=>{throw new HttpsError(code,reason,{reason});};
 const identity=value=>{const id=String(value||'').trim();if(!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(id))fail('company_id_invalid','invalid-argument');return id;};
 const anchorRef=uid=>db.doc(`users/${uid}/ltdControl/activeCompany`),outcomeRef=(uid,id)=>db.doc(`users/${uid}/ltdSetupOutcomes/${docId(id)}`),collectionRef=(uid,name)=>db.collection(`users/${uid}/ltd/v1/${name}`);
 async function retention(tx,uid){const [snap,reset]=await Promise.all([tx.get(db.doc(`users/${uid}/retention/current`)),tx.get(db.doc(`accountResets/${uid}`))]);if(reset.exists&&['deleting','failed'].includes(reset.data().status))fail('account_reset_processing');if(snap.exists&&!['complete','complete_with_warnings'].includes(snap.data().status))fail('retention_processing');return{epoch:snap.exists?Number(snap.data().epoch)||0:0,version:version(snap),resetVersion:version(reset)};}
 function validSeed(row,companyId){
  if(!row||!['entities','companyProfiles'].includes(row.collection)||row.companyId!==companyId||row.schemaVersion!==1||row.documentId!==docId(row.recordId||'')||row.payload?.id!==row.recordId||row.checksum!==fingerprint(row.payload)||row.deletedAt!==null||row.payload.deletedAt!=null||!Number.isSafeInteger(row.revision)||row.revision<0||!Number.isFinite(row.updatedAt)||row.updatedAt<0||typeof row.deviceId!=='string'||row.deviceId.length>128||ReceiptAdmission.receiptPaths(row).size||Object.keys(row).some(key=>!['schemaVersion','companyId','collection','documentId','recordId','revision','updatedAt','deviceId','deletedAt','payload','checksum'].includes(key)))fail('setup_seed_invalid','invalid-argument');
  if(row.collection==='entities'&&(row.recordId!==companyId||row.payload.type!=='limited_company'))fail('setup_seed_invalid','invalid-argument');
  if(row.collection==='companyProfiles'&&(row.recordId!==`company-profile:${companyId}`||row.payload.entityId!==companyId||row.payload.lifecycleStatus!=='draft'))fail('setup_seed_invalid','invalid-argument');
 }
 async function claim(req){
  const user=authenticate(req),companyId=identity(req.data?.companyId),modern=req.data?.setupProtocol===PROTOCOL;await requireTier(user.uid,'pro');
  const seed=modern?req.data.setupRecords:null;
  if(modern){if(!Array.isArray(seed)||seed.length!==2||new Set(seed.map(row=>row?.collection)).size!==2||Buffer.byteLength(JSON.stringify(seed))>200*1024)fail('setup_seed_invalid','invalid-argument');seed.forEach(row=>validSeed(row,companyId));}
  return db.runTransaction(async tx=>{
   const anchor=anchorRef(user.uid),snap=await tx.get(anchor),outcome=await tx.get(outcomeRef(user.uid,companyId));
   if(snap.exists){const a=snap.data();if(a.activeCompanyId!==companyId)fail('one_active_ltd_limit','already-exists');if(a.accountOwnerUid!==user.uid)fail('setup_owner_mismatch','permission-denied');return{status:'existing',activeCompanyId:companyId,idempotent:true,setupProtocol:a.setupProtocol||null,setupState:a.setupState||null};}
   if(outcome.exists)fail('company_identity_retired');
   const {epoch}=await retention(tx,user.uid);
   if(modern){const prior=await Promise.all(seed.map(row=>tx.get(collectionRef(user.uid,row.collection).doc(row.documentId))));if(prior.some(doc=>doc.exists))fail('company_identity_retired');}
   const data={schemaVersion:1,status:'active_slot_claimed',activeCompanyId:companyId,accountOwnerUid:user.uid,claimedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),releasePolicy:'founder_approval_required'};
   if(modern)Object.assign(data,{setupProtocol:PROTOCOL,setupState:'setup_pending'});
   tx.create(anchor,data);if(modern)for(const row of seed)tx.create(collectionRef(user.uid,row.collection).doc(row.documentId),{...clone(row),retentionEpoch:epoch});
   return{status:'claimed',activeCompanyId:companyId,idempotent:false,setupProtocol:modern?PROTOCOL:null,setupState:modern?'setup_pending':null};
  });
 }
 async function inspect(tx,uid,companyId){
  const a=await tx.get(anchorRef(uid)),anchor=a.exists?a.data():null,matches=anchor?.activeCompanyId===companyId;
  if(matches&&anchor.accountOwnerUid!==uid)fail('setup_owner_mismatch','permission-denied');
  if(matches&&anchor.setupProtocol!==PROTOCOL)return{status:'legacy',canDiscard:false,reason:'setup_legacy_slot',companyId};
  if(matches&&anchor.setupState!=='setup_pending')return{status:'completed',canDiscard:false,reason:'setup_already_completed',companyId};
  const control=await retention(tx,uid),batches=await Promise.all(COLLECTIONS.map(async name=>({name,snapshot:await tx.get(collectionRef(uid,name).where('companyId','==',companyId).limit(401))})));
  if(batches.some(batch=>batch.snapshot.size>400))fail('setup_record_limit');
  const docs=batches.flatMap(batch=>batch.snapshot.docs.map(doc=>({collection:batch.name,doc,value:doc.data()})));
  const token=crypto.createHash('sha256').update(canonical({anchor:version(a),control,records:docs.map(row=>[row.doc.ref.path,version(row.doc)]).sort((x,y)=>x[0].localeCompare(y[0]))})).digest('hex');
  // A lost claim response may leave no slot yet. Retiring this unused identity
  // in a transaction also fences a concurrently retrying claim.
  if(!matches){if(docs.length)fail('setup_anchor_changed');return{status:'unclaimed',canDiscard:true,companyId,versionToken:token,epoch:control.epoch,docs:[]};}
  const profile=docs.find(row=>row.collection==='companyProfiles'&&row.value.recordId===`company-profile:${companyId}`),entity=docs.find(row=>row.collection==='entities'&&row.value.recordId===companyId);
  if(!profile||!entity||profile.value.payload?.entityId!==companyId||entity.value.payload?.type!=='limited_company'||docs.filter(row=>['entities','companyProfiles'].includes(row.collection)).length!==2)fail('setup_records_missing');
  if(profile.value.payload.lifecycleStatus==='confirmed'||profile.value.payload.deletedAt!=null||entity.value.payload.deletedAt!=null)fail('setup_not_unfinished');
  if(docs.some(row=>!SETUP_COLLECTIONS.has(row.collection)||ReceiptAdmission.receiptPaths(row.value).size))return{status:'has_records',canDiscard:false,reason:'setup_has_bookkeeping',companyId};
  return{status:'pending',canDiscard:true,companyId,versionToken:token,epoch:control.epoch,docs,profile,entity};
 }
 async function manage(req){
  const user=authenticate(req),companyId=identity(req.data?.companyId),action=req.data?.action;await requireTier(user.uid,'pro');
  if(!['inspect','complete','discard'].includes(action))fail('setup_action_invalid','invalid-argument');
  const operationId=String(req.data?.operationId||'');if(action==='discard'&&!/^[a-z0-9._:-]{8,128}$/i.test(operationId))fail('setup_operation_invalid','invalid-argument');
  return db.runTransaction(async tx=>{
   const receipt=await tx.get(outcomeRef(user.uid,companyId));
   if(receipt.exists){const prior=receipt.data();if(prior.accountOwnerUid!==user.uid)fail('setup_owner_mismatch','permission-denied');if(action==='discard'&&prior.status==='discarded'&&prior.operationId===operationId)return{...clone(prior.result),idempotent:true};if(action==='complete'&&prior.status==='completed')return{status:'completed',companyId,idempotent:true};if(action==='inspect')return{status:prior.status,companyId,canDiscard:false,reason:prior.status==='completed'?'setup_already_completed':'company_identity_retired'};fail('setup_already_completed');}
   const state=await inspect(tx,user.uid,companyId);
   if(action==='inspect'){const {docs,profile,entity,epoch,...publicState}=state;return publicState;}
   if(state.status==='legacy'&&action==='complete')return{status:'legacy',companyId,idempotent:true};
   if(!state.canDiscard)fail(state.reason);if(req.data.expectedVersion!==state.versionToken)fail('setup_changed_review_again','aborted');
   if(action==='complete'){
    if(state.status!=='pending')fail('setup_records_missing');
    tx.update(anchorRef(user.uid),{setupState:'setup_completed',updatedAt:FieldValue.serverTimestamp()});tx.create(outcomeRef(user.uid,companyId),{status:'completed',companyId,accountOwnerUid:user.uid,completedAt:FieldValue.serverTimestamp()});return{status:'completed',companyId,idempotent:false};
   }
   const stamp=now(),records=[state.profile,state.entity].filter(Boolean).map(row=>{const payload={...clone(row.value.payload),deletedAt:stamp,updatedAt:stamp,revision:(Number(row.value.payload.revision)||0)+1,deviceId:'trusted-setup-discard'};return{...clone(row.value),payload,deletedAt:stamp,updatedAt:stamp,revision:payload.revision,deviceId:payload.deviceId,checksum:fingerprint(payload),retentionEpoch:state.epoch};});
   const result={status:'discarded',companyId,operationId,records,idempotent:false};
   for(const row of records)tx.set(collectionRef(user.uid,row.collection).doc(row.documentId),row);
   if(state.status==='pending')tx.delete(anchorRef(user.uid));tx.create(outcomeRef(user.uid,companyId),{status:'discarded',companyId,accountOwnerUid:user.uid,operationId,discardedAt:FieldValue.serverTimestamp(),result});return result;
  });
 }
 return{claim,manage};
}
module.exports={PROTOCOL,COLLECTIONS,SETUP_COLLECTIONS,fingerprint,createHandlers};
