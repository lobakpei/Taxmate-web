'use strict';
// Admissions/pins are the durable work inventory. No second payload copy, TTL
// dependency, client timer, or global write lock is introduced by this reaper.
const crypto=require('node:crypto'),Admission=require('./receipt-admission'),Policy=require('./retention-policy');
const GROUPS=['receiptAdmissions','receiptLtdAdmissions','admissionPins'],PAGE_SIZE=40;
const pinId=path=>crypto.createHash('sha256').update(path).digest('hex');
function identity(path,value){
  const p=path.split('/');
  if(p.length===4&&p[0]==='users'&&p[2]==='receiptLtdAdmissions'&&p[3]==='current'&&value?.uid===p[1])return{uid:p[1],kind:'ltd'};
  if(p.length!==6||p[4]!=='receiptAdmissions'||value?.uid!==p[5]||!Admission.permittedTarget(p[5],p.slice(0,4).join('/')))return null;
  return{uid:p[5],kind:p[0]==='partnerships'?'shared':'personal',partnershipId:p[0]==='partnerships'?p[1]:null};
}
function pro(ent,at){
  const access=ent.promotionAccess||{},p=ent.promotion||{};
  return ['active','trialing'].includes(ent.subscriptionStatus)&&ent.paidTier==='pro'&&(!ent.currentPeriodEnd||ent.currentPeriodEnd>at)
    ||Number(ent.paidAccess?.proExpiresAt)>at||access.proPermanent===true||Number(access.proExpiresAt)>at
    ||p.status==='active'&&p.tier==='pro'&&(p.expiresAt===null||Number(p.expiresAt)>at);
}
async function revoked(tx,db,id,value,at){
  const [r,e,a,m]=await Promise.all([tx.get(db.doc(`users/${id.uid}/retention/current`)),tx.get(db.doc(`users/${id.uid}/entitlements/current`)),tx.get(db.doc(`accountResets/${id.uid}`)),id.partnershipId?tx.get(db.doc(`partnerships/${id.partnershipId}/members/${id.uid}`)):null]);
  const control=r.data(),ent=e.data()||{},decision=Policy.decide(ent,at);
  if(a.exists&&['deleting','failed'].includes(a.data().status)||control&&!['complete','complete_with_warnings'].includes(control.status)||decision.status==='expired'&&String(control?.cutoffDate||'')<decision.cutoffDate)return true;
  const payloads=id.kind==='ltd'?Object.values(value.records||{}).flatMap(rows=>Object.values(rows)):[value.payload||{}];
  if(control&&payloads.some(row=>row.retentionEpoch!==control.epoch))return true;
  if(id.kind!=='personal'&&!pro(ent,at))return true;
  if(id.partnershipId){if(!m.exists)return true;const floor=[control?.cutoffDate,m.data().retentionCutoffDate].filter(Boolean).sort().pop();if(floor&&!(value.payload?.date>=floor))return true;}
  return false;
}
async function cleanupAdmission({db,path,now=()=>Date.now(),force=false,expectedToken=null,hooks={}}){
  const ref=db.doc(path);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref),value=snap.data(),id=identity(path,value);if(!snap.exists)return{status:'absent'};if(!id)throw Error('invalid_admission_cleanup_target');
    if(expectedToken&&value.token!==expectedToken)return{status:'superseded'};
    if(!force&&Number(value.expiresAt)>now()&&!await revoked(tx,db,id,value,now()))return{status:'active'};
    const refs=(value.receiptPaths||[]).map(p=>Admission.objectRef(db,p).collection('admissionPins').doc(pinId(path))),pins=await Promise.all(refs.map(r=>tx.get(r)));
    if(hooks.beforeDelete)await hooks.beforeDelete({path,token:value.token});
    // Deletion races atomically with permit consumption/replacement. Either a
    // valid commit wins first (its ledger protects bytes), or it is refused.
    for(const pin of pins)if(pin.data()?.token===value.token&&pin.data().admissionPath===path)tx.delete(pin.ref);
    tx.delete(ref);return{status:'removed',uid:id.uid};
  });
}
async function cleanupPin({db,path,now=()=>Date.now(),hooks={}}){
  const ref=db.doc(path);
  return db.runTransaction(async tx=>{
    const pin=await tx.get(ref),p=pin.data();if(!p)return{status:'absent'};
    if(!/^receiptObjects\/[^/]+\/files\/[^/]+\/admissionPins\/[^/]+$/.test(path)||typeof p.admissionPath!=='string')throw Error('invalid_admission_pin_target');
    const admission=await tx.get(db.doc(p.admissionPath)),a=admission.data();
    // A pin with a live matching permit is cleaned with that permit, never by
    // removing protection alone. Legacy R3 pins need no uid field for recovery.
    if(a&&a.token===p.token&&a.receiptPaths?.some(receipt=>Admission.objectRef(db,receipt).path===ref.parent.parent.path))return{status:'active'};
    if(hooks.beforeDelete)await hooks.beforeDelete({path});tx.delete(ref);return{status:'removed'};
  });
}
async function cleanupConsumed({db,path,before,now=()=>Date.now()}){
  if(!identity(path,before))return;
  for(const receipt of before.receiptPaths||[])await cleanupPin({db,path:Admission.objectRef(db,receipt).collection('admissionPins').doc(pinId(path)).path,now});
}
async function cleanupUid({db,uid,partnershipId=null,force=false,now=()=>Date.now(),beforeEach,hooks={}}){
  let removed=0;
  for(const group of ['receiptAdmissions','receiptLtdAdmissions']){
    const rows=await db.collectionGroup(group).where('uid','==',uid).get();
    for(const row of rows.docs){const id=identity(row.ref.path,row.data());if(!id||partnershipId&&id.partnershipId!==partnershipId)continue;if(beforeEach)await beforeEach();const result=await cleanupAdmission({db,path:row.ref.path,expectedToken:row.data().token,force,now,hooks});if(result.status==='removed')removed++;}
  }
  const pins=await db.collectionGroup('admissionPins').where('uid','==',uid).get();
  for(const pin of pins.docs){if(beforeEach)await beforeEach();await cleanupPin({db,path:pin.ref.path,now,hooks});}
  return{status:'complete',removed};
}
async function recover({db,now=()=>Date.now(),hooks={}}){
  const results=[];
  for(const group of GROUPS){
    const ref=db.doc('receiptAdmissionRecovery/'+group),cursor=(await ref.get()).data()?.lastPath;
    const query=db.collectionGroup(group).orderBy('__name__').limit(PAGE_SIZE);
    let page=await(cursor?query.startAfter(db.doc(cursor)):query).get();if(page.empty&&cursor)page=await query.get();
    for(let i=0;i<page.docs.length;i+=5){const slice=page.docs.slice(i,i+5);await Promise.all(slice.map(async row=>{try{const result=await(group==='admissionPins'?cleanupPin:cleanupAdmission)({db,path:row.ref.path,now,hooks});results.push({group,...result});}catch(error){results.push({group,status:'retry',reason:String(error.message).slice(0,100)});}}));await ref.set({lastPath:slice[slice.length-1].ref.path,updatedAt:now()});}
  }
  return results;
}
module.exports={identity,pro,cleanupAdmission,cleanupPin,cleanupConsumed,cleanupUid,recover,PAGE_SIZE};
