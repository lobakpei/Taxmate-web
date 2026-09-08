'use strict';
// Recursive legacy payloads need an exact, server-owned receipt admission.
// Original ledger Rules still authorise the atomic write and consumption.
const crypto=require('node:crypto'),Policy=require('./retention-policy');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const ADMISSION_MS=120000,EXPIRY_MARGIN_MS=30000;
function receiptPaths(value,out=new Set()){
  if(!value||typeof value==='object'&&value.deletedAt!=null)return out;
  if(typeof value==='string'){
    // Raw Storage names are literal: decoding %20 or stripping ?/# here would
    // silently change a valid legacy object identity. Decode only URL paths,
    // AFTER removing the URL's (unencoded) query/fragment delimiters.
    if(/^receipts\/[^/]+\/[^/]+$/.test(value))out.add(value);
    const match=value.match(/\/(?:o|_taxmate_receipt)\/([^?#]+)/);
    if(match){try{const decoded=decodeURIComponent(match[1]);if(/^receipts\/[^/]+\/[^/]+$/.test(decoded))out.add(decoded);}catch(_){}}
  }else if(Array.isArray(value))for(const row of value)receiptPaths(row,out);
  else if(typeof value==='object')for(const row of Object.values(value))receiptPaths(row,out);
  return out;
}
function objectRef(db,path){const m=typeof path==='string'&&path.match(/^receipts\/([^/]+)\/([^/]+)$/);if(!m)throw Error('invalid_receipt_path');return db.doc(`receiptObjects/${m[1]}/files/${m[2]}`);}
function permittedTarget(uid,target){
  const p=String(target||'').split('/');
  return p.length===4&&p[0]==='users'&&p[1]===uid&&['entries','app'].includes(p[2])
    ||p.length===6&&p[0]==='users'&&p[1]===uid&&p[2]==='ltd'&&p[3]==='v1'&&Policy.LTD_COLLECTIONS.includes(p[4])
    ||p.length===4&&p[0]==='partnerships'&&p[2]==='entries';
}
async function assertAvailable(tx,db,values){
  const paths=[...new Set(values.flatMap(value=>[...receiptPaths(value)]))];
  if(paths.length>180)throw Error('receipt_reference_limit');
  const docs=await Promise.all(paths.map(path=>tx.get(objectRef(db,path))));
  for(const doc of docs)if(doc.exists&&doc.data().status!=='available')throw Error('receipt_reference_unavailable');
  return paths;
}
async function preparationFence(tx,db,uid,partnershipId=null){
  const [retention,reset,member]=await Promise.all([tx.get(db.doc(`users/${uid}/retention/current`)),tx.get(db.doc(`accountResets/${uid}`)),partnershipId?tx.get(db.doc(`partnerships/${partnershipId}/members/${uid}`)):null]);
  if(retention.exists&&!['complete','complete_with_warnings'].includes(retention.data().status)||reset.exists&&['deleting','failed'].includes(reset.data().status))throw Error('receipt_admission_account_unavailable');
  if(partnershipId&&!member.exists)throw Error('receipt_admission_membership_required');
}
async function prepareWrite({db,uid,target,payload,now=()=>Date.now()}){
  if(String(target||'').split('/')[2]==='ltd')return prepareBatch({db,uid,records:[{target,payload}],now});
  if(!permittedTarget(uid,target)||!payload||typeof payload!=='object'||Array.isArray(payload)||Buffer.byteLength(JSON.stringify(payload))>850*1024)throw Error('invalid_receipt_admission');
  const parts=target.split('/');
  const ref=db.doc(`${target}/receiptAdmissions/${uid}`),pinId=hash(ref.path),token=crypto.randomUUID(),expiresAt=now()+ADMISSION_MS;
  await db.runTransaction(async tx=>{
    await preparationFence(tx,db,uid,parts[0]==='partnerships'?parts[1]:null);
    const previous=await tx.get(ref),paths=await assertAvailable(tx,db,[payload]);
    for(const path of previous.data()?.receiptPaths||[])tx.delete(objectRef(db,path).collection('admissionPins').doc(pinId));
    for(const path of paths)tx.set(objectRef(db,path).collection('admissionPins').doc(pinId),{uid,admissionPath:ref.path,token,expiresAt});
    tx.set(ref,{uid,target,payload,receiptPaths:paths,token,expiresAt});
  });
  return{path:ref.path,token,expiresAt};
}
async function prepareBatch({db,uid,records,now=()=>Date.now()}){
  if(!Array.isArray(records)||!records.length||records.length>400||Buffer.byteLength(JSON.stringify(records))>850*1024)throw Error('invalid_receipt_admission_batch');
  const values={};for(const row of records){const p=String(row.target||'').split('/');if(!permittedTarget(uid,row.target)||p[2]!=='ltd'||!row.payload||typeof row.payload!=='object')throw Error('invalid_receipt_admission_batch');(values[p[4]]||=( {} ))[p[5]]=row.payload;}
  const ref=db.doc(`users/${uid}/receiptLtdAdmissions/current`),pinId=hash(ref.path),token=crypto.randomUUID(),expiresAt=now()+ADMISSION_MS;
  await db.runTransaction(async tx=>{
    await preparationFence(tx,db,uid);
    const previous=await tx.get(ref),paths=await assertAvailable(tx,db,records.map(row=>row.payload));
    for(const path of previous.data()?.receiptPaths||[])tx.delete(objectRef(db,path).collection('admissionPins').doc(pinId));
    for(const path of paths)tx.set(objectRef(db,path).collection('admissionPins').doc(pinId),{uid,admissionPath:ref.path,token,expiresAt});
    const epochs=new Set(records.map(row=>row.payload.retentionEpoch??0));
    tx.set(ref,{uid,records:values,retentionEpoch:epochs.size===1?[...epochs][0]:-1,receiptPaths:paths,token,expiresAt});
  });return{path:ref.path,token,expiresAt};
}
async function hasPendingAdmission(db,path,now=()=>Date.now()){
  const pins=await objectRef(db,path).collection('admissionPins').get();
  for(const pin of pins.docs){const p=pin.data();if(p.expiresAt+EXPIRY_MARGIN_MS<=now())continue;const admission=await db.doc(p.admissionPath).get();if(admission.exists&&admission.data().token===p.token&&admission.data().receiptPaths.includes(path))return true;}
  return false;
}
module.exports={receiptPaths,objectRef,permittedTarget,assertAvailable,prepareWrite,prepareBatch,hasPendingAdmission,ADMISSION_MS,EXPIRY_MARGIN_MS};
